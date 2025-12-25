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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run, enabled);
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON task_executions(status);
`;

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
