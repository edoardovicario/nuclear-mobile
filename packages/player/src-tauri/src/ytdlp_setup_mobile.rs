use std::path::PathBuf;
use tauri::AppHandle;
const UNAVAILABLE: &str = "The original desktop yt-dlp executable cannot run on this mobile target. This provider requires a compatible authorized implementation.";
pub async fn ensure_binary(_: &AppHandle) -> Result<PathBuf, String> { Err(UNAVAILABLE.into()) }
#[tauri::command]
#[specta::specta]
pub async fn ytdlp_ensure_installed(app_handle: AppHandle) -> Result<bool, String> { let _ = app_handle; Err(UNAVAILABLE.into()) }
