# GitHub Actions CI/CD 使用指南

## 概览

本项目配置了三个 GitHub Actions 工作流，覆盖从开发到发布的全链路自动化：

```
.github/workflows/
├── ci.yml        # 持续集成（每次 push/PR 自动触发）
├── pr-check.yml  # PR 门控（合并前质量把关）
└── release.yml   # 发布管道（打 tag 后自动构建发布）
```

---

## 工作流详解

### 1. `ci.yml` — 持续集成

**触发条件：**
- push 到 `main`、`develop`、`feature/**`、`fix/**` 分支
- 向 `main`、`develop` 提交 Pull Request

**流程图：**
```
push/PR
   │
   ├─ [并行] security-audit ──── 依赖漏洞扫描（不阻断）
   │
   └─ lint-and-typecheck
           │  TypeScript 全量检查 + ESLint
           │
         build
           │  主进程 + preload + 渲染进程并行编译
           │  上传编译产物（保留 7 天）
           │
          test
              核心功能测试 + 单元测试（可选）
```

**Jobs：**
| Job | Runner | 说明 |
|-----|--------|------|
| `lint-and-typecheck` | ubuntu | TypeScript 三端类型检查 + ESLint |
| `build` | ubuntu | 编译验证，上传 artifact |
| `test` | ubuntu | 运行 `tests/run-tests.js` |
| `security-audit` | ubuntu | `npm audit --audit-level=high` |

---

### 2. `pr-check.yml` — PR 门控

**触发条件：** PR opened/synchronized/reopened/ready_for_review（草稿 PR 跳过）

**特色功能：** 检查完成后自动在 PR 下发评论汇总结果，重复触发时更新已有评论。

**必须全部通过才能合并：**
- ✅ TypeScript 类型检查（三端）
- ✅ ESLint 代码质量
- ✅ 编译检查

---

### 3. `release.yml` — 自动发布

**触发方式 1：推送 tag**
```bash
# 1. 更新 package.json 版本号
# 2. 提交代码
git add package.json
git commit -m "chore: bump version to 1.1.0"

# 3. 打 tag 并推送
git tag v1.1.0
git push origin main --tags
```

**触发方式 2：手动触发（GitHub Actions 页面）**
- 进入 Actions → Release → Run workflow
- 填入版本号（如 `1.1.0`），选择是否预发布

**流程图：**
```
tag push (v*.*.*)
      │
   prepare ──── 解析版本号、判断是否预发布
      │
   verify ────  TypeScript 检查 + 功能测试
      │
build-windows ── Windows 便携版 .exe（runner: windows-latest）
      │
create-release ── 生成 Changelog + 发布到 GitHub Releases
```

**产物说明：**
- `TodoListDesktop-{version}.exe` — Windows 便携版，无需安装，直接运行

---

## 版本命名规范

| Tag 格式 | 类型 | 示例 |
|---------|------|------|
| `v1.0.0` | 正式发布 | v1.0.0 |
| `v1.1.0-beta.1` | 预发布（Beta）| v1.1.0-beta.1 |
| `v2.0.0-rc.1` | 预发布（RC）| v2.0.0-rc.1 |
| `v1.0.0-alpha.1` | 预发布（Alpha）| v1.0.0-alpha.1 |

> 包含 `alpha`、`beta`、`rc` 的 tag 会被自动标记为 **Pre-release**。

---

## 本地验证命令

在推送前，可本地运行与 CI 等价的检查：

```bash
# 类型检查（三端）
npm run typecheck:all

# 功能测试
npm test

# Lint
npm run lint

# 一键全量检查（CI 等价）
npm run ci

# 完整编译
npm run build:all
```

---

## 所需 Secrets 配置

发布工作流使用 `GITHUB_TOKEN`（自动注入，无需手动配置）。

如需代码签名，添加以下 Secrets（可选）：

| Secret 名称 | 说明 |
|------------|------|
| `WIN_CSC_LINK` | Windows 签名证书（.p12 的 Base64） |
| `WIN_CSC_KEY_PASSWORD` | 证书密码 |

---

## 分支保护规则（推荐配置）

在 GitHub → Settings → Branches → Add rule for `main`：

- [x] Require status checks to pass before merging
  - `TypeScript 类型检查`
  - `ESLint 代码质量`
  - `编译检查`
- [x] Require pull request reviews before merging（建议 1 人审核）
- [x] Do not allow bypassing the above settings

---

## 常见问题

### Q: `npm audit` 失败了？
A: `security-audit` Job 使用 `continue-on-error: true`，**不会阻断 CI**，只会告警。  
可查看 Job 日志了解具体漏洞，根据严重程度决定是否处理。

### Q: 打包时 Windows Defender 报错？
A: 工作流已配置输出到 `dist-build/` 目录（原 `release/` 目录在本地容易被锁定，但 CI 环境没问题）。

### Q: 如何跳过 CI？
A: 在 commit message 中加入 `[skip ci]` 或 `[ci skip]`：
```bash
git commit -m "docs: update readme [skip ci]"
```

### Q: 能添加 macOS / Linux 构建吗？
A: 在 `release.yml` 中仿照 `build-windows` Job，添加：
- `build-macos`（runner: `macos-latest`）
- `build-linux`（runner: `ubuntu-latest`）
然后在 `create-release` 中下载对应 artifact 即可。
