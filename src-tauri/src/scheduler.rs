use std::{
    path::Path,
    str::FromStr,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};

use chrono::{DateTime, TimeZone, Utc};
use cron::Schedule;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

const DB_FILE_NAME: &str = "pet.db";

// 轮询间隔：任务调度不需要毫秒级精度，降低 CPU 唤醒
const SCHEDULER_TICK_MS: u64 = 1_000;

#[derive(Clone)]
pub struct SchedulerRunner {
    app: AppHandle,
    is_started: std::sync::Arc<AtomicBool>,
    stop: std::sync::Arc<AtomicBool>,
    join: std::sync::Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
}

impl SchedulerRunner {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            is_started: std::sync::Arc::new(AtomicBool::new(false)),
            stop: std::sync::Arc::new(AtomicBool::new(false)),
            join: std::sync::Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self) {
        if self.is_started.swap(true, Ordering::SeqCst) {
            return;
        }

        let app = self.app.clone();
        let stop = self.stop.clone();
        let join = self.join.clone();

        let handle = tauri::async_runtime::spawn_blocking(move || loop {
            if stop.load(Ordering::Relaxed) {
                break;
            }

            if let Err(err) = tick(&app) {
                eprintln!("[Scheduler] tick error: {err}");
            }

            std::thread::sleep(Duration::from_millis(SCHEDULER_TICK_MS));
        });

        *join.lock().expect("scheduler join lock poisoned") = Some(handle);
    }

    pub fn stop(&self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = self
            .join
            .lock()
            .expect("scheduler join lock poisoned")
            .take()
        {
            handle.abort();
        }
    }
}

impl Drop for SchedulerRunner {
    fn drop(&mut self) {
        self.stop();
    }
}

fn tick(app: &AppHandle) -> Result<(), String> {
    let now_ms = now_ms();
    let conn = open_db(app)?;
    ensure_tables(&conn)?;

    let due_tasks = list_due_tasks(&conn, now_ms)?;
    for task in due_tasks {
        if let Err(err) = execute_task(app, &conn, &task) {
            eprintln!("[Scheduler] execute_task error: {err}");
        }
    }

    Ok(())
}

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app_data_dir: {e}"))?;
    ensure_dir(&base_dir)?;

    let db_path = base_dir.join(DB_FILE_NAME);
    Connection::open(db_path).map_err(|e| format!("failed to open sqlite db: {e}"))
}

fn ensure_dir(path: &Path) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| format!("failed to create dir {path:?}: {e}"))
}

fn ensure_tables(conn: &Connection) -> Result<(), String> {
    // 注意：前端也会初始化 schema；这里做兜底，保证 scheduler 可独立工作
    conn.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_config TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run INTEGER,
    next_run INTEGER,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    result TEXT,
    error TEXT,
    duration INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run, enabled);
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON task_executions(status);
"#,
    )
    .map_err(|e| format!("failed to ensure tables: {e}"))?;
    Ok(())
}

#[derive(Debug, Clone)]
struct DbTaskRow {
    id: String,
    name: String,
    description: Option<String>,
    trigger_type: String,
    trigger_config: String,
    action_type: String,
    action_config: String,
    enabled: bool,
    last_run: Option<i64>,
    next_run: Option<i64>,
    metadata: Option<String>,
    created_at: i64,
    updated_at: Option<i64>,
}

fn row_to_api_task(row: DbTaskRow) -> ApiTask {
    ApiTask {
        id: row.id,
        name: row.name,
        description: row.description,
        trigger: ApiTrigger {
            r#type: row.trigger_type,
            config: row.trigger_config,
        },
        action: ApiAction {
            r#type: row.action_type,
            config: row.action_config,
        },
        enabled: row.enabled,
        last_run: row.last_run,
        next_run: row.next_run,
        metadata: row.metadata.and_then(|m| serde_json::from_str(&m).ok()),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

fn list_due_tasks(conn: &Connection, now_ms: i64) -> Result<Vec<DbTaskRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
SELECT
  id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  enabled, last_run, next_run, metadata,
  created_at, updated_at
FROM tasks
WHERE enabled = 1 AND next_run IS NOT NULL AND next_run <= ?
ORDER BY next_run ASC
LIMIT 20
"#,
        )
        .map_err(|e| format!("failed to prepare due task query: {e}"))?;

    let rows = stmt
        .query_map(params![now_ms], |r| {
            Ok(DbTaskRow {
                id: r.get(0)?,
                name: r.get(1)?,
                description: r.get(2)?,
                trigger_type: r.get(3)?,
                trigger_config: r.get(4)?,
                action_type: r.get(5)?,
                action_config: r.get(6)?,
                enabled: r.get::<_, i64>(7)? == 1,
                last_run: r.get(8)?,
                next_run: r.get(9)?,
                metadata: r.get(10)?,
                created_at: r.get(11)?,
                updated_at: r.get(12)?,
            })
        })
        .map_err(|e| format!("failed to query due tasks: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("failed to map due task: {e}"))?);
    }
    Ok(out)
}

fn compute_next_run(trigger_type: &str, trigger_config: &str, from_ms: i64) -> Option<i64> {
    match trigger_type {
        "interval" => {
            let cfg = serde_json::from_str::<IntervalTriggerConfig>(trigger_config).ok()?;
            if cfg.seconds <= 0 {
                return None;
            }
            Some(from_ms + (cfg.seconds as i64) * 1000)
        }
        "cron" => {
            let cfg = serde_json::from_str::<CronTriggerConfig>(trigger_config).ok()?;
            cron_next_ms(&cfg.expression, from_ms)
        }
        "manual" | "event" => None,
        _ => None,
    }
}

fn cron_next_ms(expr_5: &str, from_ms: i64) -> Option<i64> {
    // TS 侧定义是 5 段 cron（分 时 日 月 周），这里补一个秒字段
    let expr_6 = format!("0 {expr_5}");
    let schedule = Schedule::from_str(&expr_6).ok()?;
    let from_dt: DateTime<Utc> = Utc.timestamp_millis_opt(from_ms).single()?;
    schedule
        .after(&from_dt)
        .next()
        .map(|dt| dt.timestamp_millis())
}

fn execute_task(app: &AppHandle, conn: &Connection, task: &DbTaskRow) -> Result<(), String> {
    let start_ms = now_ms();

    let exec_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"
INSERT INTO task_executions (id, task_id, status, started_at)
VALUES (?, ?, 'running', ?)
"#,
        params![exec_id, task.id, start_ms],
    )
    .map_err(|e| format!("failed to insert execution: {e}"))?;

    let _ = app.emit("task_started", task.id.clone());

    let mut status = "success".to_string();
    let mut result_json: Option<String> = None;
    let mut error: Option<String> = None;

    match task.action_type.as_str() {
        "notification" => {
            match serde_json::from_str::<NotificationActionConfig>(&task.action_config) {
                Ok(cfg) => {
                    let payload = serde_json::json!({
                        "title": cfg.title,
                        "body": cfg.body,
                        "actionButton": cfg.action_button,
                        "actionCallback": cfg.action_callback,
                    });
                    let _ = app.emit("task_notification", payload.clone());
                    result_json = Some(payload.to_string());
                }
                Err(e) => {
                    status = "failed".to_string();
                    error = Some(format!("invalid notification action config: {e}"));
                }
            }
        }
        "agent_task" => match serde_json::from_str::<AgentTaskActionConfig>(&task.action_config) {
            Ok(cfg) => {
                let payload = serde_json::json!({
                    "prompt": cfg.prompt,
                    "toolsAllowed": cfg.tools_allowed,
                    "maxSteps": cfg.max_steps,
                });
                let _ = app.emit("task_agent_execute", payload.clone());
                result_json = Some(payload.to_string());
            }
            Err(e) => {
                status = "failed".to_string();
                error = Some(format!("invalid agent_task action config: {e}"));
            }
        },
        "workflow" => match serde_json::from_str::<WorkflowActionConfig>(&task.action_config) {
            Ok(cfg) => {
                let payload = serde_json::json!({
                    "workflowId": cfg.workflow_id,
                    "input": cfg.input,
                });
                let _ = app.emit("task_workflow_execute", payload.clone());
                result_json = Some(payload.to_string());
            }
            Err(e) => {
                status = "failed".to_string();
                error = Some(format!("invalid workflow action config: {e}"));
            }
        },
        "script" => {
            status = "failed".to_string();
            error = Some("script action is not supported yet".to_string());
        }
        other => {
            status = "failed".to_string();
            error = Some(format!("unknown action type: {other}"));
        }
    }

    let end_ms = now_ms();
    let duration = end_ms.saturating_sub(start_ms);

    conn.execute(
        r#"
UPDATE task_executions
SET status = ?, completed_at = ?, result = ?, error = ?, duration = ?
WHERE id = ?
"#,
        params![status, end_ms, result_json, error, duration, exec_id],
    )
    .map_err(|e| format!("failed to update execution: {e}"))?;

    // 更新任务的 last_run/next_run
    let next_run = compute_next_run(&task.trigger_type, &task.trigger_config, end_ms);
    conn.execute(
        r#"
UPDATE tasks
SET last_run = ?, next_run = ?, updated_at = ?
WHERE id = ?
"#,
        params![end_ms, next_run, end_ms, task.id],
    )
    .map_err(|e| format!("failed to update task run info: {e}"))?;

    match status.as_str() {
        "success" => {
            let _ = app.emit("task_completed", task.id.clone());
        }
        _ => {
            let _ = app.emit(
                "task_failed",
                serde_json::json!({
                    "id": task.id,
                    "error": error.unwrap_or_else(|| "unknown error".to_string())
                }),
            );
        }
    }

    Ok(())
}

// ====== Tauri commands ======

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiTrigger {
    #[serde(rename = "type")]
    pub r#type: String,
    pub config: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiAction {
    #[serde(rename = "type")]
    pub r#type: String,
    pub config: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiTask {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub trigger: ApiTrigger,
    pub action: ApiAction,
    pub enabled: bool,
    pub last_run: Option<i64>,
    pub next_run: Option<i64>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: i64,
    pub updated_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiTaskExecution {
    pub id: String,
    pub task_id: String,
    pub status: String,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub result: Option<String>,
    pub error: Option<String>,
    pub duration: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IntervalTriggerConfig {
    #[serde(rename = "type")]
    _type: String,
    seconds: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CronTriggerConfig {
    #[serde(rename = "type")]
    _type: String,
    expression: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NotificationActionConfig {
    #[serde(rename = "type")]
    _type: String,
    title: String,
    body: String,
    #[serde(default)]
    action_button: Option<String>,
    #[serde(default)]
    action_callback: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentTaskActionConfig {
    #[serde(rename = "type")]
    _type: String,
    prompt: String,
    #[serde(default)]
    tools_allowed: Option<Vec<String>>,
    #[serde(default)]
    max_steps: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkflowActionConfig {
    #[serde(rename = "type")]
    _type: String,
    workflow_id: String,
    #[serde(default)]
    input: Option<serde_json::Value>,
}

#[tauri::command]
pub fn scheduler_create_task(
    app: AppHandle,
    name: String,
    description: Option<String>,
    trigger_type: String,
    trigger_config: String,
    action_type: String,
    action_config: String,
    enabled: bool,
    metadata: Option<String>,
) -> Result<String, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let now = now_ms();
    let id = Uuid::new_v4().to_string();
    let next_run = if enabled {
        compute_next_run(&trigger_type, &trigger_config, now)
    } else {
        None
    };

    conn.execute(
        r#"
INSERT INTO tasks (
  id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  enabled, last_run, next_run, metadata,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL)
"#,
        params![
            id,
            name,
            description,
            trigger_type,
            trigger_config,
            action_type,
            action_config,
            if enabled { 1 } else { 0 },
            next_run,
            metadata,
            now
        ],
    )
    .map_err(|e| format!("failed to insert task: {e}"))?;

    Ok(id)
}

#[tauri::command]
pub fn scheduler_get_task(app: AppHandle, id: String) -> Result<ApiTask, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let mut stmt = conn
        .prepare(
            r#"
SELECT
  id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  enabled, last_run, next_run, metadata,
  created_at, updated_at
FROM tasks
WHERE id = ?
"#,
        )
        .map_err(|e| format!("failed to prepare get task: {e}"))?;

    let row = stmt
        .query_row(params![id], |r| {
            Ok(DbTaskRow {
                id: r.get(0)?,
                name: r.get(1)?,
                description: r.get(2)?,
                trigger_type: r.get(3)?,
                trigger_config: r.get(4)?,
                action_type: r.get(5)?,
                action_config: r.get(6)?,
                enabled: r.get::<_, i64>(7)? == 1,
                last_run: r.get(8)?,
                next_run: r.get(9)?,
                metadata: r.get(10)?,
                created_at: r.get(11)?,
                updated_at: r.get(12)?,
            })
        })
        .map_err(|e| format!("task not found: {e}"))?;

    Ok(row_to_api_task(row))
}

#[tauri::command]
pub fn scheduler_get_all_tasks(app: AppHandle) -> Result<Vec<ApiTask>, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let mut stmt = conn
        .prepare(
            r#"
SELECT
  id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  enabled, last_run, next_run, metadata,
  created_at, updated_at
FROM tasks
ORDER BY created_at DESC
"#,
        )
        .map_err(|e| format!("failed to prepare list tasks: {e}"))?;

    let rows = stmt
        .query_map([], |r| {
            Ok(DbTaskRow {
                id: r.get(0)?,
                name: r.get(1)?,
                description: r.get(2)?,
                trigger_type: r.get(3)?,
                trigger_config: r.get(4)?,
                action_type: r.get(5)?,
                action_config: r.get(6)?,
                enabled: r.get::<_, i64>(7)? == 1,
                last_run: r.get(8)?,
                next_run: r.get(9)?,
                metadata: r.get(10)?,
                created_at: r.get(11)?,
                updated_at: r.get(12)?,
            })
        })
        .map_err(|e| format!("failed to query tasks: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row_to_api_task(
            row.map_err(|e| format!("task map error: {e}"))?,
        ));
    }
    Ok(out)
}

#[tauri::command]
pub fn scheduler_update_task(
    app: AppHandle,
    id: String,
    name: Option<String>,
    description: Option<String>,
    trigger_type: Option<String>,
    trigger_config: Option<String>,
    action_type: Option<String>,
    action_config: Option<String>,
    enabled: Option<bool>,
    metadata: Option<String>,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    // 读取现有任务用于计算 next_run
    let existing = get_db_task(&conn, &id)?.ok_or_else(|| "task not found".to_string())?;

    let final_trigger_type = trigger_type
        .clone()
        .unwrap_or(existing.trigger_type.clone());
    let final_trigger_config = trigger_config
        .clone()
        .unwrap_or(existing.trigger_config.clone());
    let final_enabled = enabled.unwrap_or(existing.enabled);

    let now = now_ms();
    let next_run = if final_enabled {
        compute_next_run(&final_trigger_type, &final_trigger_config, now)
    } else {
        None
    };

    conn.execute(
        r#"
UPDATE tasks
SET
  name = COALESCE(?, name),
  description = COALESCE(?, description),
  trigger_type = COALESCE(?, trigger_type),
  trigger_config = COALESCE(?, trigger_config),
  action_type = COALESCE(?, action_type),
  action_config = COALESCE(?, action_config),
  enabled = COALESCE(?, enabled),
  metadata = COALESCE(?, metadata),
  next_run = ?,
  updated_at = ?
WHERE id = ?
"#,
        params![
            name,
            description,
            trigger_type,
            trigger_config,
            action_type,
            action_config,
            enabled.map(|b| if b { 1 } else { 0 }),
            metadata,
            next_run,
            now,
            id
        ],
    )
    .map_err(|e| format!("failed to update task: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn scheduler_delete_task(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;
    conn.execute("DELETE FROM tasks WHERE id = ?", params![id])
        .map_err(|e| format!("failed to delete task: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn scheduler_enable_task(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let existing = get_db_task(&conn, &id)?.ok_or_else(|| "task not found".to_string())?;
    let now = now_ms();
    let next_run = if enabled {
        compute_next_run(&existing.trigger_type, &existing.trigger_config, now)
    } else {
        None
    };

    conn.execute(
        r#"UPDATE tasks SET enabled = ?, next_run = ?, updated_at = ? WHERE id = ?"#,
        params![if enabled { 1 } else { 0 }, next_run, now, id],
    )
    .map_err(|e| format!("failed to enable task: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn scheduler_execute_now(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;
    let task = get_db_task(&conn, &id)?.ok_or_else(|| "task not found".to_string())?;
    execute_task(&app, &conn, &task)?;
    Ok(())
}

#[tauri::command]
pub fn scheduler_get_executions(
    app: AppHandle,
    task_id: String,
    limit: Option<i64>,
) -> Result<Vec<ApiTaskExecution>, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let limit = limit.unwrap_or(50).clamp(1, 200);

    let mut stmt = conn
        .prepare(
            r#"
SELECT id, task_id, status, started_at, completed_at, result, error, duration
FROM task_executions
WHERE task_id = ?
ORDER BY started_at DESC
LIMIT ?
"#,
        )
        .map_err(|e| format!("failed to prepare list executions: {e}"))?;

    let rows = stmt
        .query_map(params![task_id, limit], |r| {
            Ok(ApiTaskExecution {
                id: r.get(0)?,
                task_id: r.get(1)?,
                status: r.get(2)?,
                started_at: r.get(3)?,
                completed_at: r.get(4)?,
                result: r.get(5)?,
                error: r.get(6)?,
                duration: r.get(7)?,
            })
        })
        .map_err(|e| format!("failed to query executions: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("execution map error: {e}"))?);
    }
    Ok(out)
}

fn get_db_task(conn: &Connection, id: &str) -> Result<Option<DbTaskRow>, String> {
    conn.query_row(
        r#"
SELECT
  id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  enabled, last_run, next_run, metadata,
  created_at, updated_at
FROM tasks
WHERE id = ?
"#,
        params![id],
        |r| {
            Ok(DbTaskRow {
                id: r.get(0)?,
                name: r.get(1)?,
                description: r.get(2)?,
                trigger_type: r.get(3)?,
                trigger_config: r.get(4)?,
                action_type: r.get(5)?,
                action_config: r.get(6)?,
                enabled: r.get::<_, i64>(7)? == 1,
                last_run: r.get(8)?,
                next_run: r.get(9)?,
                metadata: r.get(10)?,
                created_at: r.get(11)?,
                updated_at: r.get(12)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("failed to get task: {e}"))
}
