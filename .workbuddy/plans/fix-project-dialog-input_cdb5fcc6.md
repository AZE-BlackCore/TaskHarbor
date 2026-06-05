---
name: fix-project-dialog-input
overview: 修复新建第二个项目时输入框无法输入的 bug，原因是 Dialog 遮罩层抢夺焦点 + autoFocus 在重复挂载时失效 + onClose 双重调用
todos:
  - id: fix-dialog-backdrop
    content: 修复 dialog.tsx 遮罩层事件处理，添加 onMouseDown/onClick
    status: completed
  - id: fix-focus-management
    content: 修复 ProjectEditDialog.tsx 焦点管理，改用 useRef + useEffect
    status: completed
    dependencies:
      - fix-dialog-backdrop
  - id: fix-handle-save-async
    content: 修复 ProjectEditDialog.tsx handleSave 异步化，避免竞态
    status: completed
    dependencies:
      - fix-focus-management
  - id: build-and-test
    content: 编译打包并测试修复效果
    status: completed
    dependencies:
      - fix-handle-save-async
---

## 问题描述

v1.0.5 便携版中，新建一个项目成功后，再次新建第二个项目时输入框无法输入。

## 复现路径

1. 点击「新建项目」-> 输入名称 -> 点击「创建项目」-> 成功
2. 再次点击「新建项目」-> 对话框打开，但输入框无法获得焦点/无法输入

## 根因分析

通过代码审查发现三个关联问题：

**问题 1：Dialog 遮罩层缺少事件处理**

`dialog.tsx` 第 17-19 行遮罩层 `<div className="fixed inset-0 ...">` 无任何事件处理器。在 Electron 环境下，第一次 Dialog 关闭后 DOM 保留遮罩实例（因为 `if (!open) return null`），第二次打开瞬间遮罩可能拦截鼠标事件，导致 Input 无法获得焦点。

**问题 2：autoFocus 在第二次打开不可靠**

`ProjectEditDialog.tsx` 第 73-79 行 Input 使用 `autoFocus` 属性。当 Dialog 组件从 `null` 重新渲染挂载时，`autoFocus` 有时不会被浏览器触发，导致 Input 无法自动获得焦点。

**问题 3：handleSave 双重关闭**

`ProjectEditDialog.tsx` 第 51-58 行：

```
onSave(formData);  // async，但未 await
onClose();         // 同步立即关闭
```

外部 `ProjectView.handleSave` 也会执行 `setShowEditDialog(false)`，形成双重关闭时序问题，可能引发 React 焦点管理混乱。

## 修复目标

修复三个问题后，新建第二个项目时输入框能正常获得焦点并输入内容。

## 技术方案

### 修复 1：dialog.tsx 遮罩层事件处理

在遮罩层 div 上添加 `onMouseDown={e => e.preventDefault()}`，阻止遮罩在 Input 获得焦点前拦截鼠标按下事件。同时添加 `onClick={onClose}` 使点击遮罩可关闭 Dialog（标准 UX）。

### 修复 2：ProjectEditDialog.tsx 焦点管理

移除 Input 的 `autoFocus` 属性，改用 `useRef` + `useEffect` 手动聚焦。在 `open` 变为 true 时，通过 `setTimeout` 延迟 50ms 确保 Dialog DOM 完全渲染后再聚焦。

### 修复 3：ProjectEditDialog.tsx handleSave 时序

将 `handleSave` 改为 async 函数，await `onSave` 完成后再调用 `onClose()`，避免状态竞态。

## 涉及文件

| 文件 | 修改内容 |
| --- | --- |
| `renderer/src/components/ui/dialog.tsx` | 遮罩层添加 onMouseDown/onClick 事件 |
| `renderer/src/components/project/ProjectEditDialog.tsx` | useRef 焦点管理 + handleSave 异步化 |