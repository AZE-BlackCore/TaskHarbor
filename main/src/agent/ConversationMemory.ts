/**
 * 对话记忆管理
 * 负责持久化对话历史到 SQLite 数据库，支持多轮对话上下文
 */

import { getDatabase, saveDatabase } from '../services/database';
import type { Conversation, ChatMessageRecord, LLMMessage, ToolCall } from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 对话记忆管理器
 */
class ConversationMemoryManager {
  /**
   * 创建新对话
   */
  async createConversation(params: {
    provider: string;
    model: string;
    title?: string;
  }): Promise<Conversation> {
    const db = await getDatabase();
    const id = generateId('conv');
    const now = new Date().toISOString();
    const title = params.title || '新对话';

    db.run(
      `INSERT INTO agent_conversations (id, title, created_at, updated_at, provider, model)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, now, now, params.provider, params.model]
    );
    saveDatabase();

    return {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      provider: params.provider,
      model: params.model,
      messageCount: 0,
    };
  }

  /**
   * 获取对话列表（分页）
   */
  async listConversations(limit = 20): Promise<Conversation[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM agent_conversations c
      LEFT JOIN agent_messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT ?
    `);
    stmt.bind([limit]);

    const conversations: Conversation[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      conversations.push({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        provider: row.provider,
        model: row.model,
        messageCount: row.message_count || 0,
      });
    }
    return conversations;
  }

  /**
   * 获取对话的消息历史（用于发送给 LLM 的格式）
   */
  async getConversationMessages(conversationId: string, limit = 50): Promise<LLMMessage[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM agent_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `);
    stmt.bind([conversationId, limit]);

    const messages: LLMMessage[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const msg: LLMMessage = {
        role: row.role,
        content: row.content,
      };
      if (row.tool_calls) {
        try {
          msg.toolCalls = JSON.parse(row.tool_calls);
        } catch { /* 忽略解析失败 */ }
      }
      if (row.tool_call_id) {
        msg.toolCallId = row.tool_call_id;
      }
      messages.push(msg);
    }
    return messages;
  }

  /**
   * 获取完整的消息记录（含上下文，用于前端展示）
   */
  async getFullMessageRecords(conversationId: string): Promise<ChatMessageRecord[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM agent_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    stmt.bind([conversationId]);

    const records: ChatMessageRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      records.push({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
        context: row.context ? JSON.parse(row.context) : undefined,
        createdAt: row.created_at,
      });
    }
    return records;
  }

  /**
   * 添加一条消息
   */
  async addMessage(params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
    context?: any;
  }): Promise<string> {
    const db = await getDatabase();
    const id = generateId('msg');
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO agent_messages
       (id, conversation_id, role, content, tool_calls, tool_call_id, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.conversationId,
        params.role,
        params.content,
        params.toolCalls ? JSON.stringify(params.toolCalls) : null,
        params.toolCallId || null,
        params.context ? JSON.stringify(params.context) : null,
        now,
      ]
    );

    // 更新对话的 updated_at
    db.run(
      `UPDATE agent_conversations SET updated_at = ? WHERE id = ?`,
      [now, params.conversationId]
    );

    saveDatabase();
    return id;
  }

  /**
   * 更新对话标题（通常基于第一条用户消息自动生成）
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const db = await getDatabase();
    db.run(
      `UPDATE agent_conversations SET title = ? WHERE id = ?`,
      [title, conversationId]
    );
    saveDatabase();
  }

  /**
   * 删除对话（及其所有消息）
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const db = await getDatabase();
    db.run(`DELETE FROM agent_conversations WHERE id = ?`, [conversationId]);
    saveDatabase();
  }

  /**
   * 清空所有对话历史
   */
  async clearAllConversations(): Promise<void> {
    const db = await getDatabase();
    db.run(`DELETE FROM agent_messages`);
    db.run(`DELETE FROM agent_conversations`);
    saveDatabase();
  }

  /**
   * 导出对话为 Markdown 格式
   */
  async exportConversation(conversationId: string): Promise<string> {
    const db = await getDatabase();

    // 获取对话基本信息
    const convStmt = db.prepare(`SELECT * FROM agent_conversations WHERE id = ?`);
    convStmt.bind([conversationId]);
    if (!convStmt.step()) throw new Error(`对话不存在: ${conversationId}`);
    const conv = convStmt.getAsObject() as any;

    const messages = await this.getFullMessageRecords(conversationId);

    const lines = [
      `# ${conv.title}`,
      '',
      `> 时间：${conv.created_at}  |  模型：${conv.provider}/${conv.model}`,
      '',
      '---',
      '',
    ];

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      if (msg.role === 'user') {
        lines.push(`**👤 用户**  \`${msg.createdAt}\``);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
      } else if (msg.role === 'assistant') {
        lines.push(`**🤖 AI 助手**  \`${msg.createdAt}\``);
        lines.push('');
        lines.push(msg.content);
        if (msg.toolCalls?.length) {
          lines.push('');
          lines.push('*工具调用：*');
          for (const tc of msg.toolCalls) {
            lines.push(`- ${tc.name}: \`${JSON.stringify(tc.args)}\``);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

export const conversationMemory = new ConversationMemoryManager();
