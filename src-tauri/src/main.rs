use rusqlite::Connection;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

#[derive(Serialize)]
struct DatabaseStatus {
    path: String,
    ready: bool,
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;

    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;

    let db_path = data_dir.join("memory-map.sqlite");
    Connection::open(db_path).map_err(|error| format!("Unable to open SQLite database: {error}"))
}

#[tauri::command]
fn init_database(app: tauri::AppHandle) -> Result<DatabaseStatus, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;

    let db_path = data_dir.join("memory-map.sqlite");
    let connection = open_database(&app)?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS places (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              lat REAL NOT NULL,
              lng REAL NOT NULL,
              poi_type TEXT NOT NULL,
              admin_city TEXT,
              admin_district TEXT,
              humidity REAL,
              temp REAL,
              aqi REAL,
              noise_estimate REAL
            );

            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              place_id TEXT NOT NULL,
              start_time TEXT NOT NULL,
              end_time TEXT,
              photos TEXT,
              audio TEXT,
              notes TEXT,
              hrv REAL,
              rhr REAL,
              steps INTEGER,
              sleep_score REAL,
              load REAL,
              humidity REAL,
              temp REAL,
              aqi REAL,
              tags TEXT NOT NULL,
              intensity REAL,
              valence REAL,
              amount REAL
            );

            CREATE TABLE IF NOT EXISTS place_profiles (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              place_id TEXT NOT NULL,
              role TEXT NOT NULL,
              visit_count INTEGER NOT NULL,
              dwell_time INTEGER NOT NULL,
              media_count INTEGER NOT NULL,
              hrv_avg REAL,
              rhr_avg REAL,
              humidity_avg REAL,
              temp_avg REAL,
              score REAL NOT NULL,
              memory_weight REAL NOT NULL,
              finance_weight REAL NOT NULL,
              recovery REAL NOT NULL,
              damp_penalty REAL NOT NULL,
              heat_load REAL NOT NULL,
              overload_risk REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS world_nodes (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              place_id TEXT NOT NULL,
              node_type TEXT NOT NULL,
              layer1_source TEXT NOT NULL,
              size REAL NOT NULL,
              brightness REAL NOT NULL,
              vegetation_density REAL NOT NULL,
              water_level REAL NOT NULL,
              fog_density REAL NOT NULL,
              building_style TEXT NOT NULL,
              unlocked_rooms TEXT NOT NULL,
              unlock_level INTEGER NOT NULL,
              unlock_reason TEXT NOT NULL,
              last_generated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS game_unlocks (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              place_id TEXT NOT NULL,
              unlock_type TEXT NOT NULL,
              unlock_key TEXT NOT NULL,
              source_metric TEXT NOT NULL,
              threshold_value REAL NOT NULL,
              unlocked_at TEXT NOT NULL,
              visible_in_layer3 INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_context_snapshots (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              time_range TEXT NOT NULL,
              event_summary TEXT NOT NULL,
              place_profile_diff TEXT NOT NULL,
              active_risks TEXT NOT NULL,
              today_tasks TEXT NOT NULL,
              layer3_changes TEXT NOT NULL,
              sent_to_hermes INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ai_suggestions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              source_agent TEXT NOT NULL,
              conclusion TEXT NOT NULL,
              suggestion TEXT NOT NULL,
              risk TEXT NOT NULL,
              related_place_id TEXT,
              related_event_ids TEXT,
              accepted INTEGER NOT NULL DEFAULT 0
            );
            ",
        )
        .map_err(|error| format!("Unable to initialize schema: {error}"))?;

    Ok(DatabaseStatus {
        path: db_path.to_string_lossy().to_string(),
        ready: true,
    })
}

#[tauri::command]
fn import_media_files(app: tauri::AppHandle, paths: Vec<String>) -> Result<serde_json::Value, String> {
    if paths.is_empty() {
        return Ok(serde_json::json!({ "items": [] }));
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;

    let database_path = data_dir.join("memory-map.sqlite");
    let media_root = data_dir.join("media");
    let mut command = sidecar_command(&app)?;
    command
        .arg("import-media")
        .arg("--database")
        .arg(database_path)
        .arg("--media-root")
        .arg(media_root);

    for path in paths {
        command.arg("--file").arg(path);
    }

    let output = command
        .output()
        .map_err(|error| format!("Unable to start Swift media sidecar: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Swift media sidecar failed: {stderr}"));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Unable to parse Swift media sidecar output: {error}"))
}

fn sidecar_command(app: &tauri::AppHandle) -> Result<Command, String> {
    if let Ok(binary_path) = std::env::var("MEMORY_MAP_SIDECAR_BIN") {
        return Ok(Command::new(binary_path));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("MemoryMapSidecar");
        if bundled.exists() {
            return Ok(Command::new(bundled));
        }
    }

    let package_path = dev_sidecar_package_path()?;
    let mut command = Command::new("swift");
    command
        .arg("run")
        .arg("--quiet")
        .arg("--package-path")
        .arg(package_path)
        .arg("MemoryMapSidecar");
    Ok(command)
}

fn dev_sidecar_package_path() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .parent()
        .ok_or_else(|| "Unable to resolve repository root for Swift sidecar".to_string())?;
    let package_path = repo_root.join("native").join("MemoryMapSidecar");
    if !package_path.exists() {
        return Err(format!(
            "Swift sidecar package is missing at {}",
            package_path.to_string_lossy()
        ));
    }
    Ok(package_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init_database, import_media_files])
        .run(tauri::generate_context!())
        .expect("error while running Memory Map");
}

fn main() {
    run();
}
