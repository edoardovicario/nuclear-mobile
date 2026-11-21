use reqwest::{Client, Url};
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Album {
    id: String,
    title: String,
    artist: String,
    license: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Song {
    id: String,
    title: String,
    artist: String,
    url: String,
    album_id: String,
    album_title: String,
    license: String,
}

fn client() -> Result<Client, String> {
    Client::builder().timeout(Duration::from_secs(25))
        .user_agent("NuclearMobile/0.1 (open-source music player)")
        .build().map_err(|e| e.to_string())
}

fn field(v: &Value, key: &str) -> String {
    let x = &v[key];
    x.as_str().or_else(|| x.as_array()?.first()?.as_str())
        .unwrap_or_default().trim().to_owned()
}
fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 200 && id != "." && id != ".." &&
        id.bytes().all(|c| c.is_ascii_alphanumeric() || b"._-".contains(&c))
}
fn license_ok(s: &str) -> bool {
    let Ok(u) = Url::parse(s) else { return false };
    matches!(u.scheme(), "http" | "https") &&
        matches!(u.host_str(), Some("creativecommons.org" | "www.creativecommons.org")) &&
        (u.path().starts_with("/licenses/") || u.path().starts_with("/publicdomain/"))
}
fn label(v: &Value, key: &str, fallback: &str) -> String {
    let s = field(v, key);
    if s.is_empty() { fallback.to_owned() } else { s }
}
fn query_for(term: &str) -> String {
    // Escape Lucene syntax; the requested words are treated as a phrase.
    let safe = term.replace('\\', " ").replace('"', " ");
    format!("mediatype:audio AND collection:opensource_audio AND licenseurl:* AND (title:\"{safe}\" OR creator:\"{safe}\")")
}

#[tauri::command]
async fn archive_search(query: String) -> Result<Vec<Album>, String> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > 150 {
        return Err("Enter a search between 1 and 150 characters.".into());
    }
    let q = query_for(query);
    let data: Value = client()?.get("https://archive.org/advancedsearch.php")
        .query(&[("q", q.as_str()), ("fl[]", "identifier"), ("fl[]", "title"),
            ("fl[]", "creator"), ("fl[]", "licenseurl"), ("rows", "50"),
            ("page", "1"), ("output", "json")])
        .send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let docs = data["response"]["docs"].as_array().ok_or("Archive returned an unexpected response")?;
    Ok(docs.iter().filter_map(|v| {
        let id = field(v, "identifier");
        let license = field(v, "licenseurl");
        if !valid_id(&id) || !license_ok(&license) { return None; }
        Some(Album { title: label(v, "title", &id), artist: label(v, "creator", "Unknown artist"), id, license })
    }).collect())
}

#[tauri::command]
async fn archive_tracks(id: String) -> Result<Vec<Song>, String> {
    if !valid_id(&id) { return Err("Invalid Archive identifier".into()); }
    let data: Value = client()?.get(format!("https://archive.org/metadata/{id}"))
        .send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let meta = &data["metadata"];
    let license = field(meta, "licenseurl");
    if !license_ok(&license) { return Err("No supported public license is declared for this item".into()); }
    let album = label(meta, "title", &id);
    let artist = label(meta, "creator", "Unknown artist");
    let files = data["files"].as_array().ok_or("Archive item has no files")?;
    let mut tracks = Vec::new();
    for f in files {
        let name = field(f, "name");
        let lower = name.to_ascii_lowercase();
        // Only common mobile audio formats; prefer MP3 to avoid unsupported codecs.
        if !lower.ends_with(".mp3") || name.is_empty() ||
            name.split('/').any(|p| p.is_empty() || p == "." || p == "..") ||
            f["private"] == true || field(f, "private").eq_ignore_ascii_case("true") { continue; }
        let mut url = Url::parse("https://archive.org/download/").map_err(|e| e.to_string())?;
        {
            let mut path = url.path_segments_mut().map_err(|_| "Invalid base URL")?;
            path.pop_if_empty().push(&id);
            for segment in name.split('/') { path.push(segment); }
        }
        let fallback = name.rsplit('/').next().unwrap_or(&name).trim_end_matches(".mp3");
        tracks.push(Song {
            id: format!("{id}/{name}"), title: label(f, "title", fallback),
            artist: label(f, "creator", &artist), url: url.to_string(), album_id: id.clone(),
            album_title: album.clone(), license: license.clone(),
        });
        if tracks.len() >= 250 { break; }
    }
    Ok(tracks)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![archive_search, archive_tracks])
        .run(tauri::generate_context!())
        .expect("error while running Nuclear Mobile");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn validates_ids() {
        assert!(valid_id("album-123.abc"));
        assert!(!valid_id("../secret"));
        assert!(!valid_id(".."));
        assert!(!valid_id("a/b"));
    }
    #[test] fn checks_license_domain() {
        assert!(license_ok("https://creativecommons.org/licenses/by/4.0/"));
        assert!(license_ok("http://creativecommons.org/publicdomain/zero/1.0/"));
        assert!(!license_ok("https://creativecommons.org.example.org/licenses/by/4.0/"));
        assert!(!license_ok("https://creativecommons.org/about/"));
    }
    #[test] fn escapes_query() {
        assert!(!query_for("a\" OR *:*").contains("a\" OR"));
    }
}
