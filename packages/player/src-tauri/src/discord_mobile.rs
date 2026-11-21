use serde::Deserialize;
use tauri::command;
#[derive(Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TrackPresence {
    title: String,
    artist: String,
    album: Option<String>,
    artwork_url: Option<String>,
    #[specta(type = Option<specta_typescript::Number<i64>>)]
    start_timestamp: Option<i64>,
    #[specta(type = Option<specta_typescript::Number<i64>>)]
    end_timestamp: Option<i64>,
}


pub fn init_discord(_: tauri::AppHandle) {}
const UNSUPPORTED: &str = "Discord desktop IPC is unavailable on mobile";
#[command]
#[specta::specta]
pub fn discord_connect() -> Result<(), String> { Err(UNSUPPORTED.into()) }
#[command]
#[specta::specta]
pub fn discord_disconnect() -> Result<(), String> { Ok(()) }
#[command]
#[specta::specta]
pub fn discord_set_activity(track: TrackPresence) -> Result<bool, String> { let _ = track; Err(UNSUPPORTED.into()) }
#[command]
#[specta::specta]
pub fn discord_clear_activity() -> Result<bool, String> { Err(UNSUPPORTED.into()) }
