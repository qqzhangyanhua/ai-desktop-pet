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
    nickname TEXT NOT NULL DEFAULT '我的宠物',
    mood REAL DEFAULT 80.0,
    energy REAL DEFAULT 100.0,
    intimacy REAL DEFAULT 0.0,
    last_interaction INTEGER NOT NULL,
    last_feed INTEGER,
    last_play INTEGER,
    total_interactions INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
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

-- Auto work history table (for Phase 3 auto work system)
CREATE TABLE IF NOT EXISTS auto_work_history (
    id TEXT PRIMARY KEY,
    work_type TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_hours REAL NOT NULL,
    reward_coins INTEGER NOT NULL,
    reward_experience INTEGER NOT NULL,
    mood_consumed REAL NOT NULL,
    energy_consumed REAL NOT NULL,
    intimacy_level REAL NOT NULL,
    created_at INTEGER NOT NULL
);

-- User profiles table (for Phase 1.1 memory system)
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY,
    nickname TEXT NOT NULL DEFAULT '主人',
    wake_up_hour INTEGER DEFAULT 7,
    sleep_hour INTEGER DEFAULT 23,
    preferred_topics TEXT,
    work_schedule TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Long term memory table (for Phase 1.1 memory system)
CREATE TABLE IF NOT EXISTS long_term_memory (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5,
    last_accessed INTEGER,
    access_count INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

-- Care history table (for Phase 1.1 memory system)
CREATE TABLE IF NOT EXISTS care_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_auto_work_created ON auto_work_history(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_work_type ON auto_work_history(work_type);
CREATE INDEX IF NOT EXISTS idx_memory_category ON long_term_memory(category);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON long_term_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_care_timestamp ON care_history(timestamp);
`;

/**
 * 迁移pet_status表：首次启动时插入默认记录，已有数据添加金币/经验/昵称字段
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
        `INSERT INTO pet_status (id, nickname, last_interaction, coins, experience, created_at, updated_at)
         VALUES (1, '我的宠物', ?, 0, 0, ?, ?)`,
        [now, now, now]
      );
      console.log('[Database] Pet status default record inserted');
    } else {
      // 已有数据，检查并添加新字段（如果不存在）
      try {
        // 尝试查询 coins 字段，如果不存在会抛出错误
        await db.select('SELECT coins FROM pet_status LIMIT 1');
      } catch {
        // 字段不存在，添加新字段
        await db.execute('ALTER TABLE pet_status ADD COLUMN coins INTEGER DEFAULT 0');
        await db.execute('ALTER TABLE pet_status ADD COLUMN experience INTEGER DEFAULT 0');
        console.log('[Database] Added coins and experience columns to pet_status');
      }

      // 检查并添加 nickname 字段
      try {
        await db.select('SELECT nickname FROM pet_status LIMIT 1');
      } catch {
        await db.execute("ALTER TABLE pet_status ADD COLUMN nickname TEXT NOT NULL DEFAULT '我的宠物'");
        console.log('[Database] Added nickname column to pet_status');
      }
    }
  } catch (error) {
    console.error('[Database] Failed to migrate pet_status:', error);
    throw error;
  }
}

/**
 * 迁移user_profiles表：首次启动时插入默认记录
 * @param db Database instance
 */
async function migrateUserProfile(db: Database): Promise<void> {
  try {
    const existing = await db.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM user_profiles'
    );

    if (existing[0]?.count === 0) {
      const now = Date.now();
      await db.execute(
        `INSERT INTO user_profiles (id, nickname, wake_up_hour, sleep_hour, preferred_topics, work_schedule, created_at, updated_at)
         VALUES (1, '主人', 7, 23, NULL, NULL, ?, ?)`,
        [now, now]
      );
      console.log('[Database] User profile default record inserted');
    }
  } catch (error) {
    console.error('[Database] Failed to migrate user_profile:', error);
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

  // Migrate user_profiles: insert default record if not exist
  await migrateUserProfile(db);

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
