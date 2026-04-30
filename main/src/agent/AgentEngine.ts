/**
 * Agent 引擎核心
 * 实现对话循环、工具调用处理、流式输出和用户确认机制
 */

import type {
  AgentRequest,
  AgentStreamChunk,
  LLMMessage,
  ToolCall,
  PageContext,
} from './types';
import type { LLMProvider } from './types';
import { createLLMProvider, setAbortController } from './LLMProvider';
import { toolRegistry } from './ToolRegistry';
import { conversationMemory } from './ConversationMemory';
import { contextCollector } from './ContextCollector';
import { buildSystemPrompt } from './prompts/systemPrompt';
import { getAgentConfig } from '../services/agentConfigService';
import { taskTools } from './tools/TaskTools';
import { projectTools } from './tools/ProjectTools';
import { scheduleTools } from './tools/ScheduleTools';
import { analysisTools } from './tools/AnalysisTools';
import { reportTools } from './tools/ReportTools';

// ========== 工具确认 Promise 管理 ==========
// 挂起等待用户确认的工具调用
const pendingConfirmations = new Map<string, {
  resolve: (approved: boolean) => void;
  reject: (err: Error) => void;
}>();

/**
 * 等待用户确认特定工具调用
 */
export function resolveToolConfirmation(toolCallId: string, approved: boolean): void {
  const pending = pendingConfirmations.get(toolCallId);
  if (pending) {
    pendingConfirmations.delete(toolCallId);
    pending.resolve(approved);
  }
}

// ========== 取消控制 ==========
let abortController: AbortController | null = null;

export function cancelCurrentChat(): void {
  if (abortController) {
    abortController.abort();
    setAbortController(null);
    abortController = null;
  }
}

/**
 * 初始化工具注册表（只执行一次）
 */
let toolsInitialized = false;

function initializeTools(): void {
  if (toolsInitialized) return;

  toolRegistry.registerAll([
    ...taskTools,
    ...projectTools,
    ...scheduleTools,
    ...analysisTools,
    ...reportTools,
  ]);

  toolsInitialized = true;
  console.log(`[AgentEngine] Registered ${toolRegistry.size} tools`);
}

/**
 * 创建 LLM Provider（根据当前配置）
 */
function createCurrentProvider(): LLMProvider {
  const config = getAgentConfig();
  return createLLMProvider(config);
}

/**
 * Agent 对话主函数 - 流式版本
 * 通过 AsyncGenerator yield AgentStreamChunk 到渲染进程
 */
export async function* chat(request: AgentRequest): AsyncGenerator<AgentStreamChunk> {
  initializeTools();

  abortController = new AbortController();
  setAbortController(abortController);
  const provider = createCurrentProvider();
  const config = getAgentConfig();

  let conversationId = request.conversationId;

  try {
    // ---- 1. 准备对话 ----
    if (!conversationId) {
      const conv = await conversationMemory.createConversation({
        provider: config.provider,
        model: config.model,
      });
      conversationId = conv.id;
    }

    // ---- 2. 收集上下文 ----
    const pageContext = await contextCollector.collect(request.context);
    const contextInfo = contextCollector.formatForPrompt(pageContext);

    // ---- 3. 构建消息列表 ----
    const systemMessage: LLMMessage = {
      role: 'system',
      content: buildSystemPrompt(contextInfo),
    };

    // 获取对话历史
    const historyMessages = await conversationMemory.getConversationMessages(conversationId);

    // 记录用户消息
    await conversationMemory.addMessage({
      conversationId,
      role: 'user',
      content: request.message,
      context: pageContext,
    });

    // 自动更新对话标题（第一条用户消息）
    if (historyMessages.length === 0) {
      const title = request.message.length > 30
        ? request.message.slice(0, 30) + '...'
        : request.message;
      await conversationMemory.updateConversationTitle(conversationId, title);
    }

    // 当前用户消息
    const userMessage: LLMMessage = {
      role: 'user',
      content: request.message,
    };

    let messages: LLMMessage[] = [systemMessage, ...historyMessages, userMessage];

    // ---- 4. 工具调用循环 ----
    const MAX_TOOL_ITERATIONS = 10;
    let iteration = 0;
    let assistantContentAccumulator = '';

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      if (abortController?.signal.aborted) {
        yield { type: 'error', content: '用户取消了对话' };
        return;
      }

      // 调用 LLM（真正的流式：每个 text delta 立即 yield，工具调用在流结束时一次性 yield）
      let fullContent = '';
      let collectedToolCalls: ToolCall[] | undefined;
      let finishReason: string = 'stop';

      for await (const chunk of provider.chat(messages, toolRegistry.getDefinitions(), abortController?.signal)) {
        if (abortController?.signal.aborted) break;

        // 文本 delta — 立即 yield 给渲染进程（打字机效果）
        if (chunk.content) {
          fullContent += chunk.content;
          assistantContentAccumulator += chunk.content;
          yield { type: 'text', content: chunk.content, conversationId };
        }

        // 工具调用 — 在流结束时一次性返回
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
          collectedToolCalls = chunk.toolCalls;
        }

        // finishReason — 从 SSE 数据中正确提取
        if (chunk.finishReason) {
          finishReason = chunk.finishReason;
        }
      }

      // 检查是否被用户取消
      if (abortController?.signal.aborted) {
        yield { type: 'error', content: '用户取消了对话' };
        return;
      }

      if (!fullContent && !collectedToolCalls) {
        yield { type: 'error', content: 'LLM 没有返回响应' };
        return;
      }

      const content = fullContent;
      const toolCalls = collectedToolCalls;

      // ---- 5. 处理工具调用 ----
      if (finishReason === 'tool_calls' && toolCalls && toolCalls.length > 0) {
        // 记录 assistant 消息（含工具调用）
        await conversationMemory.addMessage({
          conversationId,
          role: 'assistant',
          content: content || '',
          toolCalls,
        });

        // 构建下一轮的 messages（添加 assistant 消息）
        const assistantMsg: LLMMessage = {
          role: 'assistant',
          content: content || '',
          toolCalls,
        };
        messages = [...messages, assistantMsg];

        // 处理每个工具调用
        for (const toolCall of toolCalls) {
          const { id: toolCallId, name: toolName, args: toolArgs } = toolCall;

          // yield 工具调用通知
          yield { type: 'tool_call', toolName, toolArgs, toolCallId };

          let toolResult: any;

          // 检查是否需要用户确认
          if (toolRegistry.requiresConfirmation(toolName)) {
            const description = toolRegistry.formatConfirmationDescription(toolName, toolArgs);

            // yield 确认请求
            yield {
              type: 'confirmation_required',
              toolName,
              toolArgs,
              toolCallId,
              description,
            };

            // 等待用户确认（Promise 挂起）
            const approved = await new Promise<boolean>((resolve, reject) => {
              pendingConfirmations.set(toolCallId, { resolve, reject });

              // 30 秒超时
              setTimeout(() => {
                if (pendingConfirmations.has(toolCallId)) {
                  pendingConfirmations.delete(toolCallId);
                  resolve(false); // 超时自动取消
                }
              }, 30000);
            });

            if (!approved) {
              toolResult = { success: false, error: '用户取消了此操作' };
            } else {
              toolResult = await toolRegistry.execute(toolName, toolArgs);
            }
          } else {
            // 无需确认，直接执行
            toolResult = await toolRegistry.execute(toolName, toolArgs);
          }

          // yield 工具执行结果
          yield { type: 'tool_result', toolName, toolResult, toolCallId };

          // 记录 tool 消息
          await conversationMemory.addMessage({
            conversationId,
            role: 'tool',
            content: JSON.stringify(toolResult),
            toolCallId,
          });

          // 添加工具结果到消息列表
          const toolResultMsg: LLMMessage = {
            role: 'tool',
            content: JSON.stringify(toolResult),
            toolCallId,
          };
          messages = [...messages, toolResultMsg];
        }

        // 继续循环，让 LLM 基于工具结果生成最终回复
        continue;
      }

      // ---- 6. 完成对话 ----
      if (finishReason === 'stop' || finishReason === 'length') {
        // 记录 assistant 最终消息
        if (content) {
          await conversationMemory.addMessage({
            conversationId,
            role: 'assistant',
            content,
          });
        }
        break;
      }

      // 未知 finish reason，退出循环
      break;
    }

    yield { type: 'done', conversationId };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[AgentEngine] Chat error:', error);

    // 提供友好的错误提示
    let userMessage = '抱歉，发生了一个错误。';
    if (message.includes('apiKey') || message.includes('401') || message.includes('Unauthorized')) {
      userMessage = '❌ API Key 无效或未设置，请在设置中配置正确的 API Key。';
    } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      userMessage = '❌ 请求超时，请检查网络连接或稍后重试。';
    } else if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      userMessage = '❌ 无法连接到 AI 服务，请检查网络或服务地址配置。';
    } else if (message.includes('429') || message.includes('rate limit')) {
      userMessage = '❌ 请求过于频繁，请稍后重试。';
    } else {
      userMessage = `❌ 错误：${message}`;
    }

    yield { type: 'error', content: userMessage };
  } finally {
    abortController = null;
    setAbortController(null);
  }
}
