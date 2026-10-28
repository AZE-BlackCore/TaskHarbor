# 小湾清单 (Cove)

**作者：AZE-BlackCore**

**公众号：黑核阿泽**

---

> 🏷️ **品牌说明（双轨制）**：本项目**对外宣传名**为「**小湾清单（Cove）**」；代码、API、MCP 等**内部技术标识**仍沿用 `TaskHarbor`（npm 包名 `taskharbor`、环境变量 `TASKHARBOR_*`、MCP server id `taskharbor` 及工具 `taskharbor_*`）。下文对外叙述统一使用「小湾清单 / Cove」，出现 `TaskHarbor`、`taskharbor_*` 等均为内部技术标识，无需改动。

<div align="center">

**桌面端任务管理软件 - 让任务安全停靠、高效启航**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.7.1-teal.svg)]()
[![Electron](https://img.shields.io/badge/Electron-28.3.3-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

[功能特性](#-功能特性) • [Agent 接入](#-agent-接入与-mcp-本地-api) • [版本历史](#-版本历史) • [技术栈](#-技术栈) • [快速开始](#-快速开始) • [项目结构](#-项目结构) • [开发状态](#-开发状态)

</div>

---

## 📋 简介

**小湾清单（Cove）** 是一款面向个人与小团队的**桌面端任务与日程管理应用**。它以「本地优先、数据自主」为设计原则，把任务、日程、标签、复盘与智能提醒整合进一个清爽的桌面客户端，并在此基础上提供了 **Agent 接入能力**——让 WorkBuddy / Claude / 各类 AI Agent 与自动化脚本能够通过本地 HTTP API 与 MCP 协议，直接读写你的任务与日程。

**名字寓意**：「小湾」是一处安静、私密的水湾——把散落各处的任务停靠进来，在属于自己的水面里有序安放，再从容启航。新 Logo「小船停湾」正是这个意象：小湾水面 + 停泊的小船 + 一面金色对勾帆。

> 📦 仓库地址：<https://gitcode.com/AZE-BlackCore/Cove>

### 它解决什么问题

| 传统待办工具的痛点 | 小湾清单 的做法 |
|---|---|
| 任务散落在多个 App、清单、便签里 | 任务 / 日程 / 标签 / 复盘统一在一个应用内闭环 |
| 数据在云端，隐私与可用性存疑 | 数据完全落盘本地 SQLite（`todolist.db`），离线可用 |
| 只想记录，缺少「复盘」 | 内建六维数据统计、智能任务分析与自动化报告 |
| AI 想帮你排期却无法落地 | 本地 HTTP API + MCP，Agent 可直接创建/查询/删除任务与日程 |
| 提醒靠自觉 | 逾期/今日/明日/即将到期分级提醒 + 系统桌面通知 |

### 核心优势

- 🚀 **高性能** - 数据库延迟保存（防抖 200ms）+ 查询缓存，响应时间 <100ms
- 🎨 **现代化 UI** - 青色主色调，浅色/深色主题，流畅过渡动画
- 📅 **日程管理** - 日期滚动导航，月历/日视图切换，快速添加、重复事件、任务关联
- 📊 **数据复盘** - 六维概览，状态/优先级/负责人多维度统计，智能分析与报告导出
- 🏷️ **标签系统** - 自定义颜色，真实统计数据，分类筛选
- 👤 **用户信息** - 本地头像、昵称、签名设置，个性化体验
- 🔔 **智能提醒** - 可拖拽的提醒面板，分级提醒，桌面通知
- 🤖 **Agent 接入** - 内建本地 HTTP API + MCP Server，AI Agent 可直连读写（v1.4.0+）
- 💾 **本地优先** - 数据完全本地存储，保护隐私；原子写 + 自动备份防损坏

---

## ✨ 功能特性

### 🎯 核心功能

#### Day Todo 每日待办
- ✅ **日期滚动导航** - 以今天为中心的 7 天日期栏，周级别快速切换
- ✅ **快速添加** - 输入框回车即可创建当天日程
- ✅ **日程指示** - 日期卡片显示日程数量指示点，今日标记
- ✅ **空状态引导** - SVG 插画引导用户添加计划

#### 最近待办
- ✅ **时间范围筛选** - 今天/本周/本月快速切换
- ✅ **状态筛选** - 按任务状态过滤（待处理/进行中/审核中/已完成/已阻塞）
- ✅ **关键词搜索** - 模糊匹配任务描述、备注、问题
- ✅ **日期分组** - 按创建日期分组展示，每组显示任务数
- ✅ **快捷操作** - 点击状态图标切换完成/待处理

#### 待办箱
- ✅ **未处理任务汇总** - 仅展示 status=todo 的任务
- ✅ **优先级筛选** - 按高/中/低优先级过滤
- ✅ **快速创建** - 输入描述、选优先级、回车创建
- ✅ **一键开始** - 任务转为进行中状态
- ✅ **优先级标识** - 彩色竖条区分优先级

#### 分类与标签
- ✅ **分类文本框即标签** - 在任务编辑框「分类」中填写名称（如「工作」），保存时自动创建或复用同名标签，并立即出现在侧边栏分类目录
- ✅ **标签多选** - 任务编辑框下方「标签」区可勾选多个已有标签
- ✅ **分类统计** - 分类卡片显示任务总数、完成数、平均进度；点击分类可筛选出该分类下所有任务
- ✅ **存量自动补建** - v1.7.1 起，历史任务中填写的分类会在应用启动时自动补建为标签并完成关联（幂等，可重复执行）

#### 计划看板（1.7.0 新增）
- ✅ **五列状态看板** - 待处理 / 进行中 / 等待确认 / 已完成 / 已暂停，直接映射任务状态
- ✅ **拖拽改状态** - 卡片跨列拖拽即可流转状态，落库即时生效
- ✅ **卡片信息密度** - 标题、描述摘要、优先级徽标、标签、负责人、截止日期（逾期标红）
- ✅ **卡片快捷操作** - 悬浮编辑 / 删除，编辑复用任务编辑对话框
- ✅ **搜索过滤** - 按标题、描述、标签实时过滤；每列显示任务计数
- ✅ **数据双向联动** - 复用现有 `tasks` 表，与其他视图完全同步，无需迁移

#### 日程管理
- ✅ **月历视图** - 标准 7x6 网格，日程预览（每格最多 2 条）
- ✅ **日视图** - 列表式展示，含时间、优先级、地点
- ✅ **日程详情** - 标题、描述、地点、颜色自定义
- ✅ **时间设置** - 开始/结束时间、全天事件支持
- ✅ **优先级管理** - 低/中/高三级优先级，颜色标识
- ✅ **重复事件** - 支持每日/每周/每月/每年重复
- ✅ **任务关联** - 日程可关联到具体任务
- ✅ **搜索过滤** - 按关键词、优先级筛选日程

#### 数据复盘
- ✅ **六维概览** - 总任务/已完成/进行中/待处理/审核中/已阻塞
- ✅ **完成进度** - 完成率环形展示，平均进度
- ✅ **状态分布** - 水平条形图，含百分比和计数
- ✅ **优先级分布** - 柱状图（高/中/低）
- ✅ **责任人分布** - Top 5 横向条形图
- ✅ **标签概览** - 彩色 pill 展示所有标签
- ✅ **日程统计** - 今日 / 本周 / 总日程 / 已过期四类计数，**点击卡片可展开对应明细清单**（时间、地点、优先级、关联任务、过期标记）

#### 标签系统
- ✅ **标签管理** - 创建、编辑、删除标签
- ✅ **自定义颜色** - 8 个预设色板 + 自定义颜色拾取器
- ✅ **真实统计** - 调用后端 IPC 获取任务数/完成数/平均进度
- ✅ **分类入口** - 侧边栏分类区域展示标签，点击进入管理
- ✅ **任务关联** - 为任务添加标签，按标签筛选

#### 用户信息设置
- ✅ **头像上传** - 支持图片选择，base64 本地存储（2MB 限制）
- ✅ **昵称设置** - 侧边栏实时显示
- ✅ **个性签名** - 侧边栏昵称下方展示
- ✅ **邮箱设置** - 本地保存
- ✅ **一键重置** - 恢复默认用户信息

### 🔔 智能提醒系统

#### 任务提醒面板
- ✅ **可拖拽位置** - 提醒面板可自由拖动到任意位置
- ✅ **位置记忆** - 自动保存面板位置，重启后保持
- ✅ **可收起** - 支持收起为小图标，节省屏幕空间
- ✅ **静音模式** - 一键开启/关闭提醒通知
- ✅ **分级提醒**：
  - 🔴 **逾期任务** - 红色高亮，紧迫提示
  - 🟠 **今日到期** - 橙色提醒，当天关注
  - 🟡 **明日到期** - 黄色预告，提前准备
  - 🔵 **即将到期** - 蓝色提示，3 天内到期任务

#### 桌面通知
- ✅ **系统通知** - 发送桌面通知提醒
- ✅ **智能触发** - 根据任务到期时间自动提醒
- ✅ **可配置** - 静音模式下不发送通知

### 🎨 用户体验优化

#### 交互优化
- ✅ **乐观更新** - 操作立即响应，后台同步数据
- ✅ **骨架屏加载** - 优雅的加载动画，避免白屏
- ✅ **Toast 通知** - 实时友好的操作反馈
- ✅ **表单验证** - 实时验证，防止无效提交

#### 视觉优化
- ✅ **深色模式** - 一键切换浅色/深色主题
- ✅ **青色主色调** - 统一的视觉语言，现代感设计
- ✅ **流畅动画** - 过渡动画、微交互
- ✅ **侧边栏折叠** - 支持整体折叠，节省空间
- ✅ **分区折叠** - 分类、标签区域独立折叠

### ⚙️ 自定义设置

#### 界面设置
- ✅ **菜单栏显示** - 控制顶部菜单栏可见性
- ✅ **窗口置顶** - 小湾清单显示在所有窗口最上层
- ✅ **关闭行为** - 最小化到托盘或直接退出

#### 数据管理
- ✅ **数据导出** - Excel/CSV/Markdown 格式
- ✅ **数据备份** - 创建数据备份
- ✅ **数据清理** - 清除所有数据（需谨慎）

---

## 🤖 Agent 接入与 MCP（本地 API）

> 自 **v1.4.0** 起提供，v1.5.x 持续完善。让 AI Agent、脚本、自动化流程直接读写小湾清单的任务与日程。

### 设计目标

让「AI 帮你排期 / 记待办」真正落地：Agent 不再只能"建议"，而是可以把任务与日程**真实写入**你的本地数据库，你在应用界面即时可见。

### 架构

```
AI Agent / WorkBuddy / curl / 脚本
        │
        ├── MCP（stdio JSON-RPC 2.0）── tools/mcp-server/server.mjs
        │                                   │
        └── HTTP ──────────────────────────┴──▶ 127.0.0.1:18765（主进程内嵌 API）
                                                       │
                                                      ▼
                                            TaskHarbor SQLite（本地落盘）
```

- 应用启动时在**主进程内嵌**一个 HTTP Server，默认监听 `127.0.0.1:18765`（仅本机回环，不暴露局域网）。
- MCP Server 是**零依赖 Node 脚本**，内部转调上述本地 API，供支持 MCP 的 AI 客户端（WorkBuddy / Claude 等）调用。
- 两条通道复用同一套 `scheduleService` / `taskService`，写入即落盘，界面即时刷新。

### 本地 HTTP API

| 方法 | 端点 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查，返回版本、运行时长、MCP server 安装路径 |
| POST | `/api/schedules` | 创建日程（`title` / `startTime` / `endTime` 必填） |
| GET | `/api/schedules` | 列出日程，支持 `date` / `start`+`end` / `priority` / `search` |
| GET·PUT·DELETE | `/api/schedules/:id` | 日程详情 / **部分更新** / 删除 |
| POST | `/api/tasks` | 创建任务（`description` 必填） |
| GET | `/api/tasks` | 列出任务，支持 `status` / `assignee` / `search` |
| GET·PUT·DELETE | `/api/tasks/:id` | 任务详情 / **部分更新**（返回更新后对象）/ 删除 |

> `PUT` 为**部分更新**：只需传要改的字段，未传字段保持原值；`id` 不存在返回 404，无任何可改字段返回 400。

**示例**：

```bash
# 健康检查
curl http://127.0.0.1:18765/api/health

# 创建一条日程
curl -X POST http://127.0.0.1:18765/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"title":"团队周会","startTime":"2026-10-28T01:00:00.000Z","endTime":"2026-10-28T02:00:00.000Z","location":"线上"}'

# 创建一个任务
curl -X POST http://127.0.0.1:18765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"description":"完成 Agent 接入面板","status":"in-progress","assignee":"WorkBuddy"}'

# 修改任务（只改状态与进度，其余字段不动）
curl -X PUT http://127.0.0.1:18765/api/tasks/<任务ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"done","progress":100}'

# 修改日程（改时间与地点）
curl -X PUT http://127.0.0.1:18765/api/schedules/<日程ID> \
  -H "Content-Type: application/json" \
  -d '{"startTime":"2026-10-28T02:00:00.000Z","location":"会议室 A"}'
```

**可选安全项**（环境变量）：

| 变量 | 作用 |
|---|---|
| `TASKHARBOR_API_PORT` | 自定义监听端口（默认 18765） |
| `TASKHARBOR_API_TOKEN` | 设置后所有请求需带 `Authorization: Bearer <token>` |

### MCP 工具（8 个）

| 工具 | 功能 |
|---|---|
| `taskharbor_add_schedule` | 添加一条日程 |
| `taskharbor_list_schedules` | 按日期 / 范围 / 关键词列出日程 |
| `taskharbor_update_schedule` | 按 ID **修改**日程（部分更新：只改传入字段） |
| `taskharbor_delete_schedule` | 删除一条日程 |
| `taskharbor_add_task` | 添加一条任务 |
| `taskharbor_list_tasks` | 按状态 / 负责人 / 关键词列出任务 |
| `taskharbor_update_task` | 按 ID **修改**任务（状态 / 进度 / 负责人 / 日期等） |
| `taskharbor_delete_task` | 删除一条任务 |

**典型「先查后改」流程**（Agent 常用）：

1. `taskharbor_list_tasks`（`search` 关键词）→ 拿到目标任务的 `id`
2. `taskharbor_update_task`（`id` + 要改的字段）→ 只改传入字段，返回更新后的完整对象

> 任务状态枚举：`todo` / `in-progress` / `review` / `done` / `blocked`（注意是连字符 `in-progress`）。

### 在应用内完成配置（推荐）

安装版启动后，左侧栏进入 **「Agent 接入」** 页面即可看到：

1. **连接状态** — 实时检测本地 API 是否在线（在线/未连接、版本、运行时长），端口可改，每 15s 轮询。
2. **本地 API 信息** — API 地址（可一键复制）与全部端点说明。
3. **MCP 配置** — 一键复制 MCP 配置 JSON，其中 `server.mjs` 路径**已自动指向你当前安装目录**（`<安装目录>/resources/mcp-server/server.mjs`），无需手工替换；同时列出 6 个可用工具。
4. **快速指令** — curl 创建日程 / 任务的示例，可直接复制运行。

把 MCP 配置粘贴到客户端（如 `~/.workbuddy/mcp.json`）后，在连接器管理点 **Trust** 启用即可：

```json
{
  "mcpServers": {
    "taskharbor": {
      "command": "node",
      "args": ["<自动指向安装目录>/resources/mcp-server/server.mjs"],
      "env": { "TASKHARBOR_API_PORT": "18765" }
    }
  }
}
```

> **说明**：`server.mjs` 为纯 Node 脚本（随安装包内置），运行它的客户端机器需安装 Node.js。

### 安全边界

- API **仅监听 `127.0.0.1`**，不接受外部网络访问。
- 可选 Bearer Token 鉴权。
- 写入操作与界面操作走同一套 Service，字段校验、数据库约束一致。

## 📦 版本历史

> 📌 **完整、详细的版本变更记录统一维护在 [CHANGELOG.md](CHANGELOG.md)**（按语义化版本 SemVer + Conventional Commits 维护：`feat` 升 minor，`fix` 升 patch，`docs/test` 不升版）。以下仅保留各版本一句话总览，便于快速了解演进脉络。

| 版本 | 日期 | 一句话说明 |
|---|---|---|
| **1.7.1** | 2026-10-29 | 修复「填了分类却在分类目录看不到」（分类文本框自动转为标签并补建存量）；修复新建任务标签不保存 |
| **1.7.0** | 2026-10-28 | 新增「计划看板」页面：按状态分列展示任务，卡片可拖拽改状态，与任务数据双向联动 |
| **1.6.2** | 2026-10-28 | 修复安装版托盘图标丢失导致的初始化异常；新增主进程文件日志（`%APPDATA%\taskharbor\logs\main.log`） |
| **1.6.1** | 2026-10-28 | 对外品牌更名「小湾清单（Cove）」+ 新 Logo（小船停湾）；内部技术标识沿用 `TaskHarbor` |
| 1.6.0 | 2026-10-27 | 最近待办显示日程信息；Agent 新增 update 任务/日程工具；日程统计可展开明细；打包产物收敛到 `builds/` |
| 1.5.3 | 2026-10-27 | 修复 Agent 接入面板受 CSP 拦截而一直显示「未连接」 |
| 1.5.2 | 2026-10-27 | MCP 配置路径改由主进程直接读取安装目录，消除占位符残留 |
| 1.5.1 | 2026-10-27 | 安装包内置 MCP Server（`resources/mcp-server/server.mjs`） |
| 1.5.0 | 2026-10-27 | 新增「Agent 接入」页面：连接状态检测、MCP 配置可复制、工具列表 |
| 1.4.0 | 2026-10-27 | 新增任务写入通道（HTTP API + MCP 任务工具） |
| 1.3.0 | 2026-10-27 | 本地 HTTP API 与 MCP 通道；数据库原子写 + 延迟保存防抖 |
| 1.2.1 | 2026-08-02 | 任务编辑完善、任务字段通用化、数据复盘增强 |
| 1.2.0 | 2026-08-02 | 界面重构：Day Todo / 最近待办 / 待办箱 / 日程概览 / 数据复盘 |
| ≤1.1.2 | — | 早期版本：Markdown 导出、提醒系统、日程管理等（详见 CHANGELOG） |

**演进脉络**：v1.0.0 提供任务管理与多视图；v1.2.0 完成界面重构；v1.4.0+ 打通 AI Agent 读写通道；v1.6.x 完成品牌更名与视觉焕新。

---

## 🛠️ 技术栈

### 核心技术
| 技术 | 版本 | 用途 |
|------|------|------|
| **Electron** | 28.3.3 | 桌面应用框架 |
| **React** | 18.3 | 前端 UI 框架 |
| **TypeScript** | 5 | 类型安全的 JavaScript |
| **Vite** | 5 | 快速构建工具 |
| **Tailwind CSS** | 3.4 | 原子化 CSS 框架 |
| **Zustand** | 5 | 轻量级状态管理 |
| **sql.js** | 1.10.3 | SQLite 数据库（WASM） |
| **React Router** | 7 | 路由管理 |
| **Day.js** | - | 日期处理 |
| **Node.js HTTP** | 内置 | 本地 Agent 接入 API |
| **MCP** | JSON-RPC 2.0 | AI Agent 工具协议 |

### 架构设计
```
┌──────────────────────────────┐
│      渲染进程 (UI)            │
│      React 18 + TS + Tailwind │
└──────────────┬───────────────┘
               │ IPC（contextBridge）
┌──────────────┴───────────────┐
│      Preload 脚本（安全桥接）  │
└──────────────┬───────────────┘
               │ IPC
┌──────────────┴───────────────┐        ┌──────────────────────────┐
│          主进程               │◀──────▶│  外部 Agent / MCP / curl  │
│  Node.js + sql.js + Services  │  HTTP  │  （仅 127.0.0.1 回环）     │
│  ├ 任务 / 日程 / 标签 Service  │ 18765  └──────────────────────────┘
│  ├ 内嵌 HTTP API Server       │
│  └ 提醒调度 / 系统通知         │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       │  SQLite (本地)  │
       │  todolist.db   │
       └────────────────┘
```

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
cd Cove   # 或你的本地目录名（如 TaskHarbor-Desktop）

# 安装所有依赖
npm install

# 安装 renderer 依赖
cd renderer && npm install
```

### 开发模式

```bash
# 根目录运行
npm run dev
```

这将同时启动：
- Vite 开发服务器（http://localhost:5173）
- Electron 桌面应用

### 其他命令

```bash
# 只启动 Vite
cd renderer && npm run dev

# 编译主进程
cd main && npx tsc

# 编译 preload
cd preload && npx tsc

# 完整构建（main + preload + renderer）
npm run build:all

# 打包应用（推荐：便携版）
npm run build:win:portable

# 打包应用（完整版）
npm run build:win

# 构建产物统一输出到 builds/ 目录（不含在 git 版本控制中）
```

### 💿 安装与默认路径

双击安装包按向导安装即可（安装向导支持自定义安装目录）。

| 项目 | 路径 |
|---|---|
| **默认安装目录** | `%LOCALAPPDATA%\Programs\taskharbor`（如 `C:\Users\<用户名>\AppData\Local\Programs\taskharbor`） |
| **用户数据目录** | `%APPDATA%\taskharbor\`（数据库 `todolist.db`、日志 `logs\main.log`） |
| **MCP Server** | `<安装目录>\resources\mcp-server\server.mjs` |

> ℹ️ **为什么安装目录叫 `taskharbor`？** electron-builder 仅当产品名为纯 ASCII 时才用它作为目录名，中文「小湾清单」会回退使用 npm 包名 `taskharbor`。这与「对外品牌 / 内部技术标识」双轨制一致，也规避了中文路径在杀软、备份工具上的兼容风险——**升级安装不会覆盖用户数据**。

**常见问题速查**

| 现象 | 处理 |
|---|---|
| 装完双击无反应 | ① 关闭杀软实时防护后重装，或把安装包复制到别的目录再试（未签名 exe 首次易被拦截）；② 安装 VC++ 2015-2022 x64 运行库；③ 结束残留进程后重装 |
| 需要排查启动故障 | 查看 `%APPDATA%\taskharbor\logs\main.log`（v1.6.2 起） |
| 白屏 / 渲染异常 | 用 `--disable-gpu` 启动试一下 |
| 想恢复默认安装目录 | 卸载后删除注册表 `HKCU\Software\54c8eda9-4e0d-58e1-9270-0962a40743b0`（NSIS 会记忆上次安装位置） |

### 📦 打包说明

打包 Windows 应用请参考 [PACKAGING.md](PACKAGING.md)

**快速打包**:
```bash
npm run build:win:portable
```

---

## 📁 项目结构

```
TaskHarbor/
├── main/                    # Electron 主进程
│   ├── src/
│   │   ├── index.ts         # 主进程入口
│   │   ├── services/        # 数据库、缓存等服务
│   │   │   ├── database.ts
│   │   │   ├── database-migration.ts
│   │   │   ├── taskService.ts       # 任务服务（含统计聚合）
│   │   │   ├── scheduleService.ts   # 日程服务
│   │   │   ├── notification.ts      # 通知服务
│   │   │   └── cacheService.ts
│   │   ├── ipc-handlers/    # IPC 处理器
│   │   │   ├── task-handlers.ts     # 任务 IPC（含 getStats）
│   │   │   ├── schedule-handlers.ts # 日程处理器
│   │   │   ├── tag-handlers.ts      # 标签处理器
│   │   │   ├── notification-handlers.ts
│   │   │   └── window-handlers.ts
│   │   ├── server/          # 本地 Agent 接入 API
│   │   │   └── apiServer.ts # 内嵌 HTTP Server（127.0.0.1:18765）
│   │   └── utils/           # 工具函数
│   └── tsconfig.json
│
├── preload/                 # Preload 脚本
│   ├── src/
│   │   └── index.ts         # IPC 桥接
│   └── tsconfig.json
│
├── renderer/                # React 渲染进程
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── ui/          # UI 基础组件
│   │   │   ├── tag/         # 标签组件
│   │   │   │   ├── TagCard.tsx
│   │   │   │   └── TagEditDialog.tsx
│   │   │   ├── settings/    # 设置组件
│   │   │   │   ├── SettingsPanel.tsx  # 含用户信息设置
│   │   │   │   ├── ViewOrderSettings.tsx
│   │   │   │   └── ReminderSettings.tsx
│   │   │   ├── notification/ # 通知组件
│   │   │   │   └── TaskReminder.tsx
│   │   │   └── Layout.tsx   # 主布局组件（含侧边栏）
│   │   ├── views/           # 视图组件
│   │   │   ├── DayTodoView.tsx     # 每日待办
│   │   │   ├── RecentView.tsx      # 最近待办
│   │   │   ├── ScheduleView.tsx    # 日程概览
│   │   │   ├── InboxView.tsx       # 待办箱
│   │   │   ├── StatsView.tsx       # 数据复盘
│   │   │   ├── AgentHub.tsx        # Agent 接入面板（MCP / API 配置）
│   │   │   ├── tag/
│   │   │   │   └── TagList.tsx     # 标签管理
│   │   │   └── FloatingWindow.tsx  # 悬浮窗口
│   │   ├── stores/          # Zustand stores
│   │   │   ├── taskStore.ts
│   │   │   ├── scheduleStore.ts
│   │   │   ├── tagStore.ts
│   │   │   ├── userProfileStore.ts # 用户信息（新增）
│   │   │   ├── viewStore.ts
│   │   │   ├── viewConfigStore.ts
│   │   │   └── errorStore.ts
│   │   ├── types/           # TypeScript 类型定义
│   │   │   └── index.ts
│   │   └── utils/           # 工具函数
│   │       ├── export.ts
│   │       ├── cache.ts
│   │       └── cn.ts
│   ├── App.tsx              # 应用入口
│   ├── main.tsx
│   └── package.json
│
├── tools/                   # Agent 接入配套工具
│   ├── mcp-server/
│   │   └── server.mjs       # 零依赖 MCP Server（打包进安装包 resources/）
│   ├── smoke-test-api.mjs   # API 冒烟测试（日程 + 任务全链路）
│   ├── verify-agent-write.mjs    # MCP→API→DB 全链路验证
│   └── verify-taskharbor-api.mjs # 无 GUI 契约验证
│
├── build/                   # 构建资源
│   └── icon.ico
│
├── scripts/                 # 构建脚本
│   └── build-windows.ps1
│
└── package.json
```

---

## 📊 数据库设计

### 核心表结构

#### tasks 表
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  moduleId TEXT,
  module TEXT,
  functionModule TEXT,
  description TEXT NOT NULL,
  progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assignee TEXT,
  startDate TEXT,
  estimatedEndDate TEXT,
  actualEndDate TEXT,
  issues TEXT,
  notes TEXT,
  createdAt TEXT,
  updatedAt TEXT
)
```

#### schedules 表
```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  allDay INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  reminder INTEGER,
  repeatType TEXT CHECK(repeatType IN ('daily', 'weekly', 'monthly', 'yearly')),
  repeatInterval INTEGER DEFAULT 1,
  repeatEndDate TEXT,
  relatedTaskId TEXT,
  createdAt TEXT,
  updatedAt TEXT
)
```

#### tags 表
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  createdAt TEXT,
  updatedAt TEXT
)
```

### 其他表
- **subtasks** - 子任务
- **timelogs** - 时间日志
- **task_dependencies** - 任务依赖
- **task_tag_relations** - 任务标签关联

### 数据验证
- ✅ 外键约束触发器
- ✅ 进度范围检查 (0-100)
- ✅ 自动更新时间戳

---

## 📈 性能优化成果

### 数据库优化
- ⚡ **延迟保存** - 防抖 1 秒，减少 I/O 80%
- ⡓ **事务支持** - ACID 合规，数据一致性 100%
- ⚡ **查询缓存** - 重复查询性能提升 98%

### 状态管理优化
- ⚡ **乐观更新** - 响应时间 <100ms
- ⚡ **Immer 集成** - 状态更新性能提升 80%
- ⚡ **全局错误处理** - Toast 通知，用户体验提升

### 服务层重构
- 🏗️ **Service 层** - 代码可维护性提升 80%
- 🏗️ **类型安全** - TypeScript 覆盖率 100%
- 🏗️ **IPC 简化** - 代码量减少 60-67%

---

## 📝 开发状态

### 已完成 ✅
- [x] 项目初始化和基础架构
- [x] 数据库设计和实现
- [x] 主进程和 IPC 通信
- [x] Day Todo 每日待办视图
- [x] 最近待办视图
- [x] 待办箱视图
- [x] 日程管理（月历/日视图）
- [x] 数据复盘（多维度统计）
- [x] 标签系统（含真实统计）
- [x] 用户信息设置（头像/昵称/签名/邮箱）
- [x] 侧边栏重构（折叠/分类/标签集成）
- [x] 悬浮窗口
- [x] 深色模式
- [x] 智能任务提醒（可拖拽、可收起）
- [x] 桌面通知系统
- [x] 数据导出（Excel/CSV/Markdown）
- [x] 智能任务分析
- [x] 自动化报告生成
- [x] 任务编辑功能完善（创建后可编辑）
- [x] 任务字段通用化改造
- [x] 本地 HTTP API（日程 / 任务 CRUD）
- [x] MCP Server（6 个任务 / 日程工具）
- [x] Agent 接入面板（应用内配置 MCP / 查看连接状态）
- [x] 计划看板视图（五列状态看板 + 拖拽改状态）

### 进行中 🚧
- [ ] 云端同步（规划中）

### 计划中 📋
- [ ] 云端同步
- [ ] 多设备协作
- [ ] 插件系统

---

## 🔧 贡献指南

### 开发流程
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写单元测试
- 更新相关文档

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢以下开源项目：
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Day.js](https://day.js.org/)

---

<div align="center">

**Made with ❤️ by AZE-BlackCore**

**公众号：黑核阿泽**

[⭐ Star on GitCode](https://gitcode.com/AZE-BlackCore/Cove) • [📖 查看文档](docs/) • [🐛 报告问题](https://gitcode.com/AZE-BlackCore/Cove/issues)

</div>
