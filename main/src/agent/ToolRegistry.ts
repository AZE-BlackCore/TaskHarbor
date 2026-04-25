/**
 * 工具注册表
 * 管理 Agent 可调用的所有工具，包括定义、注册、执行和确认机制
 */

import type { AgentTool, ToolDefinition } from './types';

/**
 * 工具注册表 - 单例模式
 */
class ToolRegistryInstance {
  private tools: Map<string, AgentTool> = new Map();

  /**
   * 注册一个工具
   */
  register(tool: AgentTool): void {
    const name = tool.definition.function.name;
    this.tools.set(name, tool);
    console.log(`[ToolRegistry] Registered tool: ${name}`);
  }

  /**
   * 批量注册工具
   */
  registerAll(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 获取工具
   */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具定义（用于发送给 LLM）
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * 获取所有工具名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 执行工具
   */
  async execute(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const result = await tool.execute(params);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  }

  /**
   * 检查工具是否需要用户确认
   */
  requiresConfirmation(name: string): boolean {
    const tool = this.tools.get(name);
    return tool?.requireConfirmation ?? false;
  }

  /**
   * 格式化确认描述
   */
  formatConfirmationDescription(name: string, params: Record<string, any>): string {
    const tool = this.tools.get(name);
    if (tool?.formatConfirmation) {
      return tool.formatConfirmation(params);
    }
    // 默认描述
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    return `即将执行 ${name}: ${paramStr}`;
  }

  /**
   * 获取已注册的工具数量
   */
  get size(): number {
    return this.tools.size;
  }
}

// 单例
export const toolRegistry = new ToolRegistryInstance();
