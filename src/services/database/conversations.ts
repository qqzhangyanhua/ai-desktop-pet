import { v4 as uuidv4 } from 'uuid';
import { query, execute } from './index';
import type { Conversation, Message } from '../../types';

interface ConversationRow {
  id: string;
  title: string | null;
  system_prompt: string | null;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  suggestions: string | null;
  created_at: number;
}

export async function createConversation(
  title?: string,
  systemPrompt?: string
): Promise<Conversation> {
  const id = uuidv4();
  const now = Date.now();

  await execute(
    `INSERT INTO conversations (id, title, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [id, title ?? null, systemPrompt ?? null, now, now]
  );

  return {
    id,
    title: title ?? '',
    systemPrompt: systemPrompt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getConversations(): Promise<Conversation[]> {
  const rows = await query<ConversationRow>(
    `SELECT * FROM conversations ORDER BY updated_at DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const rows = await query<ConversationRow>(
    `SELECT * FROM conversations WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title ?? '',
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'title' | 'systemPrompt'>>
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    params.push(updates.title);
  }

  if (updates.systemPrompt !== undefined) {
    sets.push('system_prompt = ?');
    params.push(updates.systemPrompt);
  }

  sets.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  await execute(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteConversation(id: string): Promise<void> {
  await execute(`DELETE FROM conversations WHERE id = ?`, [id]);
}

export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'conversationId' | 'createdAt'>
): Promise<Message> {
  const id = uuidv4();
  const now = Date.now();

  await execute(
    `INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, suggestions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      conversationId,
      message.role,
      message.content,
      message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      message.toolCallId ?? null,
      message.suggestions ? JSON.stringify(message.suggestions) : null,
      now,
    ]
  );

  // Update conversation updated_at
  await execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [
    now,
    conversationId,
  ]);

  return {
    id,
    conversationId,
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls,
    toolCallId: message.toolCallId,
    suggestions: message.suggestions,
    createdAt: now,
  };
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows = await query<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId]
  );

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Message['role'],
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    toolCallId: row.tool_call_id ?? undefined,
    suggestions: row.suggestions ? JSON.parse(row.suggestions) : undefined,
    createdAt: row.created_at,
  }));
}

export async function deleteMessage(id: string): Promise<void> {
  await execute(`DELETE FROM messages WHERE id = ?`, [id]);
}
