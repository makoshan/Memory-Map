use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

#[derive(Serialize)]
struct DatabaseStatus {
    path: String,
    ready: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GameSessionRequest {
    world_slug: String,
    world_title: String,
    #[serde(default)]
    embed_in_window: bool,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameSessionResult {
    session_id: String,
    status: String,
    world_slug: String,
    completed_tasks: Vec<String>,
    visited_rooms: Vec<String>,
    session_path: String,
}

struct GameSessionPaths {
    world_slug: String,
    world_state_path: PathBuf,
    session_output_path: PathBuf,
    parent_window_id: Option<String>,
    parent_window_size: Option<(u32, u32)>,
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

#[tauri::command]
fn start_game_session(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    request: GameSessionRequest,
) -> Result<GameSessionResult, String> {
    let parent_window_id = if request.embed_in_window {
        Some(resolve_parent_window_id(&window)?)
    } else {
        None
    };
    let parent_window_size = if request.embed_in_window {
        Some(resolve_parent_window_size(&window)?)
    } else {
        None
    };
    let paths = prepare_game_session_paths(&app, &request, parent_window_id, parent_window_size)?;
    let mut command = godot_command(&app)?;
    run_godot_session_command(&mut command, &paths)
}

fn prepare_game_session_paths(
    app: &tauri::AppHandle,
    request: &GameSessionRequest,
    parent_window_id: Option<String>,
    parent_window_size: Option<(u32, u32)>,
) -> Result<GameSessionPaths, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    let session_dir = data_dir
        .join("godot-sessions")
        .join(sanitize_path_segment(&request.world_slug));
    fs::create_dir_all(&session_dir)
        .map_err(|error| format!("Unable to create Godot session directory: {error}"))?;

    let world_state_path = session_dir.join("world_state.json");
    let session_output_path = session_dir.join("game_session.json");
    if session_output_path.exists() {
        fs::remove_file(&session_output_path)
            .map_err(|error| format!("Unable to clear previous Godot session output: {error}"))?;
    }

    let source_world_state = resolve_world_state_source(app)?;
    fs::copy(&source_world_state, &world_state_path).map_err(|error| {
        format!(
            "Unable to prepare Godot world state from {}: {error}",
            source_world_state.to_string_lossy()
        )
    })?;

    let request_path = session_dir.join("session_request.json");
    let request_payload = serde_json::json!({
        "worldSlug": request.world_slug,
        "worldTitle": request.world_title,
    });
    fs::write(
        request_path,
        serde_json::to_string_pretty(&request_payload)
            .map_err(|error| format!("Unable to serialize Godot session request: {error}"))?,
    )
    .map_err(|error| format!("Unable to write Godot session request: {error}"))?;

    Ok(GameSessionPaths {
        world_slug: request.world_slug.clone(),
        world_state_path,
        session_output_path,
        parent_window_id,
        parent_window_size,
    })
}

fn resolve_world_state_source(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("MEMORY_MAP_WORLD_STATE_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("godot").join("data").join("world_state.json");
        if bundled.exists() {
            return Ok(bundled);
        }
    }

    let dev_world_state = dev_repo_root()?
        .join("godot")
        .join("data")
        .join("world_state.json");
    if dev_world_state.exists() {
        return Ok(dev_world_state);
    }

    Err("Unable to find Godot world_state.json for the game session".to_string())
}

fn godot_command(app: &tauri::AppHandle) -> Result<Command, String> {
    if let Ok(binary_path) = std::env::var("MEMORY_MAP_GODOT_BIN") {
        return Ok(Command::new(binary_path));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidates = [
            resource_dir
                .join("MemoryMapLayer3.app")
                .join("Contents")
                .join("MacOS")
                .join("MemoryMapLayer3"),
            resource_dir.join("MemoryMapLayer3"),
            resource_dir.join("memory-map-layer3"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return Ok(Command::new(candidate));
            }
        }
    }

    let dev_editor = std::env::var("MEMORY_MAP_GODOT_EDITOR_BIN")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/Applications/Godot.app/Contents/MacOS/Godot"));
    if dev_editor.exists() {
        let mut command = Command::new(dev_editor);
        command.arg("--path").arg(resolve_godot_project_path(app)?);
        return Ok(command);
    }

    Err("Unable to find Godot. Set MEMORY_MAP_GODOT_BIN or MEMORY_MAP_GODOT_EDITOR_BIN.".to_string())
}

fn run_godot_session_command(
    command: &mut Command,
    paths: &GameSessionPaths,
) -> Result<GameSessionResult, String> {
    command
        .args(godot_session_args(paths))
        .env("MEMORY_MAP_WORLD_STATE", &paths.world_state_path)
        .env("MEMORY_MAP_SESSION_OUTPUT", &paths.session_output_path)
        .env("MEMORY_MAP_WORLD_SLUG", &paths.world_slug);

    let output = command
        .output()
        .map_err(|error| format!("Unable to start Godot game session: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Godot game session failed: {stderr}"));
    }

    read_game_session_result(&paths.session_output_path)
}

fn godot_session_args(paths: &GameSessionPaths) -> Vec<String> {
    let mut args = Vec::new();
    if let Some(parent_window_id) = &paths.parent_window_id {
        if let Some((width, height)) = paths.parent_window_size {
            args.push("--resolution".to_string());
            args.push(format!("{width}x{height}"));
            args.push("--position".to_string());
            args.push("0,0".to_string());
            args.push("--single-window".to_string());
            args.push("--windowed".to_string());
        }
        args.push("--wid".to_string());
        args.push(parent_window_id.clone());
    }
    args.extend(godot_session_user_args(paths));
    args
}

fn resolve_parent_window_size(window: &tauri::WebviewWindow) -> Result<(u32, u32), String> {
    let size = window
        .inner_size()
        .map_err(|error| format!("Unable to read Tauri window size: {error}"))?;
    Ok((size.width, size.height))
}

fn godot_session_user_args(paths: &GameSessionPaths) -> Vec<String> {
    vec![
        "--".to_string(),
        "--world-state".to_string(),
        paths.world_state_path.to_string_lossy().to_string(),
        "--session-output".to_string(),
        paths.session_output_path.to_string_lossy().to_string(),
        "--world-slug".to_string(),
        paths.world_slug.clone(),
    ]
}

#[cfg(target_os = "macos")]
fn resolve_parent_window_id(window: &tauri::WebviewWindow) -> Result<String, String> {
    let ns_window = window
        .ns_window()
        .map_err(|error| format!("Unable to read macOS Tauri window handle: {error}"))?;
    Ok((ns_window as usize).to_string())
}

#[cfg(target_os = "windows")]
fn resolve_parent_window_id(window: &tauri::WebviewWindow) -> Result<String, String> {
    let hwnd = window
        .hwnd()
        .map_err(|error| format!("Unable to read Windows Tauri window handle: {error}"))?;
    Ok((hwnd.0 as isize).to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn resolve_parent_window_id(_window: &tauri::WebviewWindow) -> Result<String, String> {
    Err("Embedded Godot window mode is only wired for macOS and Windows in this MVP".to_string())
}

fn read_game_session_result(path: &Path) -> Result<GameSessionResult, String> {
    let payload = fs::read_to_string(path).map_err(|error| {
        format!(
            "Unable to read Godot session output at {}: {error}",
            path.to_string_lossy()
        )
    })?;
    serde_json::from_str(&payload).map_err(|error| {
        format!(
            "Unable to parse Godot session output at {}: {error}",
            path.to_string_lossy()
        )
    })
}

fn dev_godot_project_path() -> Result<PathBuf, String> {
    let project_path = dev_repo_root()?.join("godot");
    if !project_path.exists() {
        return Err(format!(
            "Godot project is missing at {}",
            project_path.to_string_lossy()
        ));
    }
    Ok(project_path)
}

fn resolve_godot_project_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_project = resource_dir.join("godot");
        if bundled_project.join("project.godot").exists() {
            return Ok(bundled_project);
        }
    }
    dev_godot_project_path()
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
    let package_path = dev_repo_root()?.join("native").join("MemoryMapSidecar");
    if !package_path.exists() {
        return Err(format!(
            "Swift sidecar package is missing at {}",
            package_path.to_string_lossy()
        ));
    }
    Ok(package_path)
}

fn dev_repo_root() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .parent()
        .ok_or_else(|| "Unable to resolve repository root for Swift sidecar".to_string())?;
    Ok(repo_root.to_path_buf())
}

fn sanitize_path_segment(value: &str) -> String {
    let sanitized: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '-'
            }
        })
        .collect();
    if sanitized.is_empty() {
        "world".to_string()
    } else {
        sanitized
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            init_database,
            import_media_files,
            start_game_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running Memory Map");
}

fn main() {
    run();
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(name: &str) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("memory-map-{name}-{}-{now}", std::process::id()));
        fs::create_dir_all(&dir).expect("temp dir should be created");
        dir
    }

    fn session_paths(root: &Path) -> GameSessionPaths {
        GameSessionPaths {
            world_slug: "hangzhou".to_string(),
            world_state_path: root.join("world_state.json"),
            session_output_path: root.join("game_session.json"),
            parent_window_id: None,
            parent_window_size: None,
        }
    }

    #[test]
    fn builds_godot_user_args_with_dynamic_world_state_and_session_output() {
        let root = unique_temp_dir("godot-args");
        let paths = session_paths(&root);

        let args = godot_session_user_args(&paths);

        assert_eq!(
            args,
            vec![
                "--".to_string(),
                "--world-state".to_string(),
                paths.world_state_path.to_string_lossy().to_string(),
                "--session-output".to_string(),
                paths.session_output_path.to_string_lossy().to_string(),
                "--world-slug".to_string(),
                "hangzhou".to_string()
            ]
        );
    }

    #[test]
    fn builds_godot_args_with_parent_window_id_before_user_args() {
        let root = unique_temp_dir("godot-embedded-args");
        let mut paths = session_paths(&root);
        paths.parent_window_id = Some("12345".to_string());
        paths.parent_window_size = Some((1440, 960));

        let args = godot_session_args(&paths);

        assert_eq!(
            &args[0..9],
            [
                "--resolution",
                "1440x960",
                "--position",
                "0,0",
                "--single-window",
                "--windowed",
                "--wid",
                "12345",
                "--"
            ]
        );
        assert!(args.contains(&"--session-output".to_string()));
    }

    #[test]
    fn reads_godot_session_result_from_json() {
        let root = unique_temp_dir("godot-session-read");
        let paths = session_paths(&root);
        fs::write(
            &paths.session_output_path,
            r#"{
  "sessionId": "session-hangzhou-test",
  "status": "completed",
  "worldSlug": "hangzhou",
  "completedTasks": ["整理今日记忆"],
  "visitedRooms": ["办公室"],
  "sessionPath": "/tmp/game_session.json"
}"#,
        )
        .expect("session output should be writable");

        let result = read_game_session_result(&paths.session_output_path).expect("session result should parse");

        assert_eq!(result.session_id, "session-hangzhou-test");
        assert_eq!(result.status, "completed");
        assert_eq!(result.world_slug, "hangzhou");
        assert_eq!(result.completed_tasks, vec!["整理今日记忆"]);
        assert_eq!(result.visited_rooms, vec!["办公室"]);
    }

    #[cfg(unix)]
    #[test]
    fn runs_godot_command_and_returns_written_session_result() {
        use std::os::unix::fs::PermissionsExt;

        let root = unique_temp_dir("godot-command");
        let paths = session_paths(&root);
        fs::write(&paths.world_state_path, "{}").expect("world state should be writable");
        let script_path = root.join("fake-godot.sh");
        fs::write(
            &script_path,
            r#"#!/bin/sh
cat > "$MEMORY_MAP_SESSION_OUTPUT" <<'JSON'
{
  "sessionId": "session-hangzhou-fake",
  "status": "completed",
  "worldSlug": "hangzhou",
  "completedTasks": ["整理今日记忆"],
  "visitedRooms": ["办公室"],
  "sessionPath": "/tmp/game_session.json"
}
JSON
"#,
        )
        .expect("fake godot script should be writable");
        let mut permissions = fs::metadata(&script_path).expect("script metadata should exist").permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&script_path, permissions).expect("script should be executable");

        let mut command = Command::new(script_path);
        let result = run_godot_session_command(&mut command, &paths).expect("fake Godot should complete");

        assert_eq!(result.session_id, "session-hangzhou-fake");
        assert_eq!(result.completed_tasks, vec!["整理今日记忆"]);
        assert_eq!(result.visited_rooms, vec!["办公室"]);
        assert!(paths.session_output_path.exists());
    }
}
