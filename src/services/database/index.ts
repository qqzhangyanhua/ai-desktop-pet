import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

const SCHEMA = `
-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    system_prompt TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    tool_call_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- MCP servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    transport TEXT NOT NULL,
    command TEXT,
    args TEXT,
    url TEXT,
    env TEXT,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

-- Agent roles table
CREATE TABLE IF NOT EXISTS agent_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    tools TEXT,
    created_at INTEGER NOT NULL
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    graph_definition TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Agent tool audit logs (for safety/observability)
CREATE TABLE IF NOT EXISTS agent_tool_audit_logs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tool_call_id TEXT NOT NULL UNIQUE,
    tool_name TEXT NOT NULL,
    source TEXT NOT NULL,
    args_json TEXT,
    result_json TEXT,
    status TEXT NOT NULL,
    error TEXT,
    requires_confirmation INTEGER DEFAULT 0,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    duration_ms INTEGER
);

-- Skins table
CREATE TABLE IF NOT EXISTS skins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    preview_image TEXT,
    is_builtin INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Tasks table (for scheduler)
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

-- Task executions table
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

-- Pet status table (for pet care system)
CREATE TABLE IF NOT EXISTS pet_status (
    id INTEGER PRIMARY KEY,
    mood REAL DEFAULT 80.0,
    energy REAL DEFAULT 100.0,
    intimacy REAL DEFAULT 0.0,
    last_interaction INTEGER NOT NULL,
    last_feed INTEGER,
    last_play INTEGER,
    total_interactions INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Daily statistics table (for Phase 2 stats system)
CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    pet_count INTEGER DEFAULT 0,
    feed_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    chat_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    mood_avg REAL,
    energy_avg REAL,
    created_at INTEGER NOT NULL
);

-- Achievements table (for Phase 2 achievement system)
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    unlock_condition TEXT NOT NULL,
    is_unlocked INTEGER DEFAULT 0,
    unlocked_at INTEGER,
    created_at INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tool_logs_created ON agent_tool_audit_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_tool_logs_tool ON agent_tool_audit_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run, enabled);
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_pet_status_updated ON pet_status(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
`;

/**
 * 迁移pet_status表：首次启动时插入默认记录
 * @param db Database instance
 */
async function migratePetStatus(db: Database): Promise<void> {
  try {
    // 检查是否已有记录
    const existing = await db.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM pet_status'
    );

    if (existing[0]?.count === 0) {
      // 首次启动，插入默认状态
      const now = Date.now();
      await db.execute(
        `INSERT INTO pet_status (id, last_interaction, created_at, updated_at)
         VALUES (1, ?, ?, ?)`,
        [now, now, now]
      );
      console.log('[Database] Pet status default record inserted');
    }
  } catch (error) {
    console.error('[Database] Failed to migrate pet_status:', error);
    throw error;
  }
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:pet.db');

  // Execute schema
  const statements = SCHEMA.split(';').filter((s) => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await db.execute(statement);
    }
  }

  // Insert default skins if not exist
  const defaultSkins = [
    { id: 'default', name: 'Default', path: 'models/default', isBuiltin: 1 },
    { id: 'cat', name: 'Cat', path: 'models/cat', isBuiltin: 1 },
  ];

  for (const skin of defaultSkins) {
    await db.execute(
      `INSERT OR IGNORE INTO skins (id, name, path, is_builtin, created_at) VALUES (?, ?, ?, ?, ?)`,
      [skin.id, skin.name, skin.path, skin.isBuiltin, Date.now()]
    );
  }

  // Migrate pet_status: insert default record if not exist
  await migratePetStatus(db);

  console.log('Database initialized');
  return db;
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDatabase();
  return database.select<T[]>(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(sql, params);
  return result.rowsAffected;
}
