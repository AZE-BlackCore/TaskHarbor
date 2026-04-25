# TaskHarbor × CoPaw Agent 混合集成方案

> 版本：v2.0 | 日期：2026-04-22 | 项目：TaskHarbor

---

## 1. 方案概述

### 1.1 集成模式：混合模式

```
┌─────────────────────────────────────────────────────────────────┐
│                      TaskHarbor + AI Agent                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │   内置轻量 Agent 引擎    │    │    CoPaw 增强连接（可选）     │ │
│  │   ─────────────────     │    │    ──────────────────────   │ │
│  │   • DeepSeek API         │    │   • CoPaw HTTP API          │ │
│  │   • 通义千问 API         │    │   • MCP 工具协议             │ │
│  │   • 本地 Ollama         │    │   • 完整 Agent 能力           │ │
│  │   • 基础任务操作工具     │    │   • 高级分析/报告             │ │
│  └──────────┬──────────────┘    └─────────────┬───────────────┘ │
│             │  LLM Provider 抽象层               │               │
│             └──────────────┬───────────────────┘               │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    主进程 Agent 核心                      │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │   │ 任务工具  │ │ 分析工具  │ │ 报告工具  │ │ 上下文   │  │   │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │   ┌──────────┐ ┌──────────────────────────────────┐   │   │
│  │   │ 对话记忆  │ │        工具注册表                  │   │   │
│  │   └──────────┘ └──────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲ IPC                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    渲染进程 UI 层                         │   │
│  │   ┌──────────────┐         ┌──────────────────────┐    │   │
│  │   │ AI 对话侧边栏 │         │ 浮动 AI 助手窗口       │    │   │
│  │   │ (右侧可折叠)  │         │ (可拖拽桌面卡片)       │    │   │
│  │   └──────────────┘         └──────────────────────┘    │   │
│  │   ┌──────────────────────────────────────────────┐     │   │
│  │   │ agentStore (Zustand) — 对话状态/配置/上下文   │     │   │
│  │   └──────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **离线优先** | 内置 Agent 引擎独立运行，不依赖 CoPaw 也能完整使用 |
| **渐进增强** | CoPaw 连接后自动解锁高级能力（复杂分析、MCP 工具等） |
| **安全隔离** | LLM API 调用全在主进程，渲染进程仅通过 IPC 交互 |
| **上下文感知** | Agent 自动感知当前页面/项目/任务上下文 |
| **用户确认** | 所有写操作（创建/修改/删除）需用户确认后执行 |

---

## 2. 新增文件结构

### 2.1 主进程新增模块

```
main/src/
├── agent/
│   ├── index.ts                    # Agent 模块入口，导出 setupAgentHandlers()
│   ├── LLMProvider.ts              # LLM 提供者抽象接口与实现
│   ├── AgentEngine.ts              # Agent 引擎核心（对话/工具调用/流式输出）
│   ├── ToolRegistry.ts             # 工具注册表
│   ├── ConversationMemory.ts       # 对话记忆管理
│   ├── ContextCollector.ts         # 上下文收集器（页面/项目/任务感知）
│   ├── tools/
│   │   ├── TaskTools.ts            # 任务 CRUD 工具（直接调用 taskService）
│   │   ├── ProjectTools.ts         # 项目管理工具（直接调用 projectService）
│   │   ├── ScheduleTools.ts        # 日程管理工具（直接调用 scheduleService）
│   │   ├── AnalysisTools.ts        # 数据分析工具（统计/趋势/风险预警）
│   │   └── ReportTools.ts          # 报告生成工具（日报/周报/月报）
│   ├── prompts/
│   │   ├── systemPrompt.ts         # 系统提示词模板
│   │   ├── taskPrompt.ts           # 任务操作相关提示词
│   │   ├── analysisPrompt.ts       # 分析洞察相关提示词
│   │   └── reportPrompt.ts         # 报告生成相关提示词
│   └── copaw/
│       ├── CoPawClient.ts          # CoPaw HTTP 客户端
│       └── CoPawConfig.ts          # CoPaw 连接配置管理
├── ipc-handlers/
│   └── agent-handlers.ts           # Agent IPC 处理器（新增）
└── services/
    └── agentConfigService.ts       # Agent 配置持久化（electron-store）
```

### 2.2 渲染进程新增模块

```
renderer/src/
├── stores/
│   └── agentStore.ts               # Agent 状态管理（新增）
├── components/
│   └── agent/
│       ├── AISidebar.tsx           # 右侧 AI 对话侧边栏（新增）
│       ├── ChatMessage.tsx         # 聊天消息气泡组件（新增）
│       ├── ChatInput.tsx           # 聊天输入框（支持快捷操作）（新增）
│       ├── ContextBadge.tsx        # 上下文感知标签（新增）
│       ├── QuickActions.tsx        # 快捷操作面板（新增）
│       ├── ToolResult.tsx          # 工具执行结果展示（新增）
│       ├── StreamingText.tsx       # 流式文本渲染（新增）
│       └── AIFloatingWindow.tsx    # 浮动 AI 助手窗口（新增）
├── hooks/
│   └── useAgent.ts                 # Agent 交互 Hook（新增）
└── types/
    └── agent.ts                    # Agent 相关类型定义（新增）
```

---

## 3. 核心模块设计

### 3.1 LLM Provider 抽象层

```typescript
// main/src/agent/LLMProvider.ts

interface LLMConfig {
  provider: 'deepseek' | 'qwen' | 'ollama' | 'copaw';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length';
}

interface LLMProvider {
  chat(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMResponse>;
  isAvailable(): Promise<boolean>;
  getModelName(): string;
}

// 各 Provider 实现
class DeepSeekProvider implements LLMProvider { ... }    // HTTPS (Node.js 原生)
class QwenProvider implements LLMProvider { ... }        // HTTPS (Node.js 原生)
class OllamaProvider implements LLMProvider { ... }      // localhost HTTP
class CoPawProvider implements LLMProvider { ... }        // CoPaw HTTP API 代理
```

**关键设计**：不引入 langchain 等重量级框架，直接用 Node.js 原生 `https`/`http` 模块调用 LLM API（避免 CommonJS 兼容问题）。

### 3.2 Agent 引擎核心

```typescript
// main/src/agent/AgentEngine.ts

interface AgentRequest {
  message: string;
  context?: {
    currentView?: string;       // 当前视图
    currentProjectId?: string;   // 当前项目
    selectedTaskId?: string;     // 选中任务
    selectedTasks?: string[];    // 批量选中任务
  };
  conversationId?: string;       // 对话 ID
}

interface AgentResponseChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  conversationId?: string;
}

class AgentEngine {
  private provider: LLMProvider;
  private toolRegistry: ToolRegistry;
  private memory: ConversationMemory;
  private contextCollector: ContextCollector;

  // 流式处理用户消息
  async *chat(request: AgentRequest): AsyncGenerator<AgentResponseChunk> {
    // 1. 收集上下文
    const context = await this.contextCollector.collect(request.context);
    
    // 2. 构建消息（系统提示词 + 历史 + 当前消息 + 上下文）
    const messages = this.buildMessages(request, context);
    
    // 3. 循环：调用 LLM → 处理工具调用 → 再次调用（直到 stop）
    let response = yield* this.provider.chat(messages, this.toolRegistry.getDefinitions());
    while (response.finishReason === 'tool_calls') {
      for (const toolCall of response.toolCalls) {
        yield { type: 'tool_call', content: '', toolName: toolCall.name, toolArgs: toolCall.args };
        const result = await this.toolRegistry.execute(toolCall.name, toolCall.args);
        yield { type: 'tool_result', content: '', toolName: toolCall.name, toolResult: result };
      }
      response = yield* this.provider.chat([...messages, assistantMsg, ...toolResults], ...);
    }
    
    yield { type: 'done', content: '' };
  }
}
```

### 3.3 工具注册表

```typescript
// main/src/agent/ToolRegistry.ts

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

interface AgentTool {
  definition: ToolDefinition;
  execute: (params: any) => Promise<any>;
  requireConfirmation?: boolean;  // 是否需要用户确认
}

// 注册内置工具
const BUILT_IN_TOOLS: AgentTool[] = [
  // 任务操作（直接调用 service 层，不走 IPC）
  { name: 'list_tasks', description: '获取任务列表', ... },
  { name: 'create_task', description: '创建新任务', requireConfirmation: true, ... },
  { name: 'update_task', description: '更新任务', requireConfirmation: true, ... },
  { name: 'delete_task', description: '删除任务', requireConfirmation: true, ... },
  
  // 项目操作
  { name: 'list_projects', description: '获取项目列表', ... },
  { name: 'create_project', description: '创建项目', requireConfirmation: true, ... },
  { name: 'get_project_stats', description: '获取项目统计', ... },
  
  // 日程操作
  { name: 'list_schedules', description: '获取日程列表', ... },
  { name: 'create_schedule', description: '创建日程', requireConfirmation: true, ... },
  
  // 分析工具
  { name: 'analyze_project_progress', description: '分析项目进度', ... },
  { name: 'analyze_overdue_risks', description: '分析逾期风险', ... },
  { name: 'analyze_workload', description: '分析工作量分布', ... },
  
  // 报告工具
  { name: 'generate_daily_report', description: '生成日报', ... },
  { name: 'generate_weekly_report', description: '生成周报', ... },
  { name: 'generate_monthly_report', description: '生成月报', ... },
];
```

### 3.4 CoPaw 客户端

```typescript
// main/src/agent/copaw/CoPawClient.ts

interface CoPawConfig {
  baseUrl: string;       // 默认 http://localhost:8000
  token?: string;        // 认证 token（如需要）
  timeout: number;        // 请求超时
}

class CoPawClient {
  // 检测 CoPaw 是否可用
  async isAvailable(): Promise<boolean>;
  
  // 通过 CoPaw 发送对话
  async *chat(
    messages: LLMMessage[], 
    tools?: ToolDefinition[]
  ): AsyncGenerator<LLMResponse>;
  
  // 获取 CoPaw 版本/能力信息
  async getInfo(): Promise<{ version: string; capabilities: string[] }>;
}
```

### 3.5 上下文收集器

```typescript
// main/src/agent/ContextCollector.ts

interface PageContext {
  currentView: string;            // 'list' | 'gantt' | 'kanban' | 'calendar' | 'schedule'
  currentProjectId: string | null;
  currentProjectName: string | null;
  selectedTaskId: string | null;
  selectedTaskDescription: string | null;
  selectedTaskIds: string[];       // 批量选中
  taskSummary: string;             // 当前项目/筛选下的任务摘要
  recentChanges: string;           // 最近的操作变更
}

class ContextCollector {
  async collect(context?: Partial<PageContext>): Promise<PageContext>;
}
```

---

## 4. IPC 通道设计

### 4.1 新增 Agent IPC 通道

```typescript
// preload/src/index.ts 新增

// ========== AI Agent ==========
chat: (request: AgentRequest) => ...,
chatStream: (request: AgentRequest) => ...,  // ipcRenderer.on 事件监听
confirmToolCall: (toolCallId: string, approved: boolean) => ...,
cancelChat: () => ...,
clearHistory: (conversationId?: string) => ...,
getHistory: () => ...,
getAgentConfig: () => ...,
updateAgentConfig: (config: Partial<AgentConfig>) => ...,
testConnection: (provider: string) => ...,
exportConversation: (conversationId: string) => ...,
```

### 4.2 Agent IPC 处理器

```typescript
// main/src/ipc-handlers/agent-handlers.ts

export function setupAgentHandlers() {
  // 流式对话（主事件）
  ipcMain.handle('agent:chat', async (event, request: AgentRequest) => {
    const engine = getAgentEngine();
    for await (const chunk of engine.chat(request)) {
      event.sender.send('agent:stream', chunk);
    }
  });
  
  // 工具调用确认
  ipcMain.handle('agent:confirmToolCall', async (_, toolCallId, approved) => { ... });
  
  // 取消对话
  ipcMain.handle('agent:cancel', async () => { ... });
  
  // 获取配置
  ipcMain.handle('agent:getConfig', async () => { ... });
  
  // 更新配置
  ipcMain.handle('agent:updateConfig', async (_, config) => { ... });
  
  // 测试连接
  ipcMain.handle('agent:testConnection', async (_, provider) => { ... });
  
  // 历史管理
  ipcMain.handle('agent:getHistory', async () => { ... });
  ipcMain.handle('agent:clearHistory', async (_, conversationId) => { ... });
  ipcMain.handle('agent:exportConversation', async (_, conversationId) => { ... });
}
```

### 4.3 ElectronAPI 类型扩展

```typescript
// renderer/src/vite-env.d.ts 新增

interface AgentConfig {
  provider: 'deepseek' | 'qwen' | 'ollama' | 'copaw';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  copawUrl: string;
  copawEnabled: boolean;
  streamEnabled: boolean;
}

interface AgentRequest {
  message: string;
  context?: {
    currentView?: string;
    currentProjectId?: string;
    selectedTaskId?: string;
    selectedTasks?: string[];
  };
  conversationId?: string;
}

interface AgentStreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'confirmation_required';
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  toolCallId?: string;
  conversationId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: { name: string; args: any; result?: any; confirmed?: boolean }[];
  context?: PageContext;
}
```

---

## 5. 前端 UI 设计

### 5.1 右侧 AI 对话侧边栏 (`AISidebar.tsx`)

```
┌────────────────────────────┐
│ 🤖 AI 助手          [收起] │  ← 标题栏
├────────────────────────────┤
│ 📋 上下文: 项目A > 任务列表 │  ← 上下文感知标签
├────────────────────────────┤
│                            │
│  👤 帮我创建一个下周要完成的 │
│     React 重构任务          │
│                            │
│  🤖 我来帮你在"项目A"中创建 │
│     一个新任务：              │
│     ┌─────────────────┐    │
│     │ 📝 创建任务        │    │  ← 工具调用卡片
│     │ 描述: React 重构   │    │
│     │ 截止: 2026-04-30 │    │
│     │ [✅ 确认] [❌ 取消] │    │  ← 用户确认
│     └─────────────────┘    │
│                            │
│  ✅ 任务创建成功！已添加到    │
│     项目 A 中。              │
│                            │
├────────────────────────────┤
│ [快捷] 创建任务 查询进度 生成报告│  ← 快捷操作
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ 输入消息...    [发送] │   │  ← 输入框
│ └──────────────────────┘   │
└────────────────────────────┘
```

**特性**：
- 宽度 380px，可通过拖拽边缘调整
- 支持 `Ctrl+/` 快捷键切换显示/隐藏
- 深色/浅色主题自适应
- 消息支持 Markdown 渲染
- 工具调用显示为可交互卡片
- 流式文本逐字显示
- 快捷操作按钮

### 5.2 浮动 AI 助手窗口 (`AIFloatingWindow.tsx`)

```
┌──────────────────────────┐
│ 🔧 拖拽移动    [最小化][关闭] │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 🤖 AI 快捷助手       │ │
│ │                      │ │
│ │ 快捷操作：            │ │
│ │ [创建任务] [今日待办] │ │
│ │ [项目进度] [生成日报] │ │
│ │                      │ │
│ │ 对话：                │ │
│ │ ┌──────────────────┐ │ │
│ │ │ 输入...  [发送]  │ │ │
│ │ └──────────────────┘ │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**特性**：
- 类似 TaskReminder 的可拖拽浮动窗口
- 可通过托盘菜单唤起
- 紧凑型 UI，专注于快捷操作
- 位置和大小持久化到 localStorage

### 5.3 Agent Store 设计

```typescript
// renderer/src/stores/agentStore.ts

interface AgentState {
  // 配置
  config: AgentConfig;
  
  // 对话状态
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  
  // 上下文
  pageContext: PageContext;
  
  // 待确认的工具调用
  pendingToolCalls: Map<string, ToolCallInfo>;
  
  // 侧边栏状态
  sidebarOpen: boolean;
  sidebarWidth: number;
  
  // Actions
  sendMessage: (message: string) => Promise<void>;
  confirmToolCall: (toolCallId: string, approved: boolean) => Promise<void>;
  cancelStream: () => void;
  updateConfig: (config: Partial<AgentConfig>) => Promise<void>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  setPageContext: (context: Partial<PageContext>) => void;
  toggleSidebar: () => void;
  clearHistory: () => void;
  loadConversations: () => Promise<void>;
}
```

### 5.4 Layout 集成点

```typescript
// renderer/src/components/Layout.tsx 修改

// 在 <main> 标签内末尾，<Outlet /> 之后添加：
<AISidebar />

// 在 App.tsx 中添加全局浮动窗口（类似 TaskReminder）：
<AIFloatingWindow />

// 在 SettingsPanel 中添加 AI 设置面板：
// - LLM Provider 选择
// - API Key 输入
// - CoPaw 连接配置
// - 温度/最大 Token 调节
```

---

## 6. 智能场景详细设计

### 6.1 自然语言任务操作

| 用户输入 | Agent 行为 | 涉及工具 |
|---------|-----------|---------|
| "帮我创建一个下周完成的 React 重构任务" | 解析意图 → 创建任务（需确认） | create_task |
| "把所有延期任务标记为 blocked" | 查询延期任务 → 逐个更新（需确认） | list_tasks, update_task |
| "删除项目 A 中所有已完成的任务" | 查询项目 A 完成任务 → 批量删除（需确认） | list_tasks, delete_task |
| "这个任务拆成 3 个子任务" | 读取当前选中任务 → LLM 生成子任务 → 创建（需确认） | get_task, create_subtask |
| "查一下这周有哪些任务到期" | 查询任务并筛选日期范围 | list_tasks |

### 6.2 智能分析洞察

| 用户输入 | Agent 行为 | 输出格式 |
|---------|-----------|---------|
| "分析项目 A 的进度" | 统计各状态任务数量、平均进度 | Markdown 报告 + 关键指标 |
| "有哪些逾期风险" | 查询 estimatedEndDate < now 且 status != done | 风险列表 + 建议措施 |
| "我的工作量分布合理吗" | 按负责人统计任务数和预估工时 | 分析报告 + 优化建议 |
| "对比本月和上月的工作效率" | 按月统计完成量和平均周期 | 趋势对比 + 建议 |

### 6.3 自动化报告生成

| 报告类型 | 内容 | 数据来源 |
|---------|------|---------|
| 日报 | 今日完成任务、进行中任务、逾期任务、明日计划 | tasks (createdAt/updatedAt) |
| 周报 | 本周完成统计、进度趋势、风险总结、下周计划 | tasks + schedules |
| 月报 | 月度完成率、效率指标、项目健康度、改进建议 | 全量统计 |

### 6.4 上下文感知助手

```typescript
// 上下文自动注入示例
// 用户在「项目A → 任务列表」视图中选中一个任务后打开 AI 侧边栏

// Agent 自动收到：
// "用户正在查看项目「项目A」的任务列表，当前选中任务：「实现用户登录功能」(ID: task_xxx, 状态: in-progress, 进度: 40%)"

// 用户只需输入：
// "帮我拆分子任务"
// Agent 知道是针对当前选中的 task_xxx 操作
```

---

## 7. 安全与性能设计

### 7.1 API Key 安全

- 使用 electron-store 加密存储 API Key
- 不在代码中硬编码任何密钥
- Key 仅在主进程使用，渲染进程只能看到 `***` 掩码

### 7.2 操作确认机制

```
用户输入 "删除所有已完成的任务"
    → Agent 调用 list_tasks(status=done)
    → Agent 发现 15 个匹配任务
    → Agent 返回确认请求：
      "即将删除 15 个已完成的任务：
       1. 任务A
       2. 任务B
       ...
       确认删除？"
    → 用户点击 [✅ 确认]
    → Agent 执行批量删除
```

### 7.3 CSP 策略更新

```typescript
// main/src/index.ts setupCSP() 修改
// 在 connect-src 中添加 LLM API 域名
"connect-src 'self' https://api.deepseek.com https://dashscope.aliyuncs.com http://localhost:* ws://localhost:*;"
```

### 7.4 流式响应与取消

- 使用 AsyncGenerator 实现流式输出
- 支持用户随时取消生成（AbortController）
- 对话超时保护（默认 60 秒）

### 7.5 对话历史管理

- 对话历史存储在 sqlite.js 数据库中（新建 agent_conversations 表）
- 支持多轮对话、对话标题自动生成
- 支持导出对话为 Markdown

---

## 8. 实施计划

### Phase 1：基础架构（第 1-2 周）

| 任务 | 预估 | 说明 |
|------|------|------|
| LLM Provider 抽象层 | 2 天 | DeepSeek/通义千问/Ollama 实现 |
| Agent 引擎核心 | 2 天 | 对话循环、工具调用、流式输出 |
| 工具注册表 + 基础工具 | 2 天 | 任务/项目/日程 CRUD 工具 |
| IPC 通道 + Preload 扩展 | 1 天 | agent-handlers + 类型定义 |
| agentStore (Zustand) | 1 天 | 状态管理 |
| CSP 策略更新 | 0.5 天 | 允许 LLM API 域名 |
| 配置持久化 | 0.5 天 | electron-store |

### Phase 2：UI 实现（第 3-4 周）

| 任务 | 预估 | 说明 |
|------|------|------|
| AI 对话侧边栏 | 2 天 | AISidebar + ChatMessage + ChatInput |
| 流式文本渲染 | 1 天 | StreamingText 组件 |
| 工具调用卡片 | 1 天 | ToolResult + 确认交互 |
| 快捷操作面板 | 1 天 | QuickActions 组件 |
| Layout 集成 | 0.5 天 | 侧边栏嵌入 + 快捷键 |
| 浮动 AI 窗口 | 1 天 | AIFloatingWindow |
| 设置面板 AI 配置 | 1 天 | LLM/CoPaw 配置 UI |

### Phase 3：智能功能（第 5-6 周）

| 任务 | 预估 | 说明 |
|------|------|------|
| 上下文收集器 | 1 天 | 页面/项目/任务上下文感知 |
| 分析工具实现 | 2 天 | 进度分析/风险预警/工作量 |
| 报告生成工具 | 2 天 | 日报/周报/月报模板 |
| 对话记忆管理 | 1 天 | 多轮对话 + 历史持久化 |
| 对话导出 | 0.5 天 | Markdown 导出 |

### Phase 4：CoPaw 集成（第 7 周）

| 任务 | 预估 | 说明 |
|------|------|------|
| CoPaw 客户端 | 1 天 | HTTP API 对接 |
| Provider 切换逻辑 | 1 天 | CoPaw 优先 → 降级到内置 |
| CoPaw 能力发现 | 1 天 | 自动获取 CoPaw MCP 工具 |
| 连接检测 UI | 0.5 天 | 状态指示 + 配置界面 |

### Phase 5：优化与测试（第 8 周）

| 任务 | 预估 | 说明 |
|------|------|------|
| 性能优化 | 2 天 | 缓存、懒加载、响应优化 |
| 错误处理 | 1 天 | 网络错误、降级策略 |
| 深色模式适配 | 0.5 天 | 全面适配 |
| 单元测试 | 2 天 | Agent 引擎、工具、Store |
| 端到端测试 | 1 天 | 关键用户流程 |

---

## 9. 数据库 Schema 扩展

```sql
-- 对话表
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  provider TEXT,
  model TEXT
);

-- 消息表
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls TEXT,              -- JSON: [{name, args, result, confirmed}]
  context TEXT,                -- JSON: PageContext 快照
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

-- Agent 配置表（使用 electron-store 替代，此处仅作备份）
```

---

## 10. 依赖管理

### 主进程新增依赖

```json
{
  "dependencies": {
    "electron-store": "^8.2.0"   // 配置持久化（已存在）
  }
}
```

> 注意：不引入 langchain、ollama、openai 等 npm 包。直接使用 Node.js 原生 `https`/`http` 模块调用 API，避免 CommonJS 兼容问题和包体积膨胀。

### 渲染进程新增依赖

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",     // Markdown 渲染
    "remark-gfm": "^4.0.0"          // GFM 扩展（表格等）
  }
}
```

---

## 11. 与现有 Agent 集成规划的关系

现有 `docs/Agent能力集成规划.md` 是 v1.0 版本的规划，本方案（v2.0）做了以下调整：

| 方面 | v1.0 规划 | v2.0 方案（本方案） |
|------|-----------|-------------------|
| **架构** | 纯内置 Agent | 混合模式（内置 + CoPaw） |
| **LLM 接入** | langchain + ollama SDK | Node.js 原生 HTTP（零额外依赖） |
| **工具系统** | 抽象工具定义 | 工具直接调用 service 层（无 IPC 开销） |
| **UI** | AI 对话侧边栏 | 侧边栏 + 浮动窗口 |
| **上下文** | 无 | 完整上下文感知系统 |
| **CoPaw** | 无 | 可选增强连接 |
| **状态管理** | agentStore（基础） | agentStore（完整） |

v1.0 规划中关于数据库表、IPC 通道、安全考虑等内容在本方案中得到了保留和细化。

---

*文档版本：v2.0*
*创建时间：2026-04-22*
*项目：TaskHarbor*
