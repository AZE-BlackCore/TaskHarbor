---
name: fix-packaged-black-screen
overview: 修复打包后启动黑屏的问题：主要是 loadFile 路径错误导致无法加载 renderer/index.html，以及 preload 被双重打包的冗余问题。
todos:
  - id: fix-getResourcePath
    content: 修改 getResourcePath 函数，打包模式下通过 __dirname 推导路径
    status: completed
  - id: rebuild-main
    content: 重新编译主进程
    status: completed
    dependencies:
      - fix-getResourcePath
  - id: rebuild-package
    content: 重新打包应用
    status: completed
    dependencies:
      - rebuild-main
  - id: test-app
    content: 启动打包后的应用验证修复
    status: completed
    dependencies:
      - rebuild-package
---

修复打包后应用黑屏问题。打包后的 `TodoList Desktop.exe` 启动后界面全黑，无法正常加载 UI。问题定位为 `main/src/index.ts` 中 `getResourcePath` 函数在打包模式下路径构建错误，导致 `loadFile` 无法正确加载 `renderer/dist/index.html`。

## 问题根因

`getResourcePath` 函数使用 `path.join(process.resourcesPath, 'app.asar', relativePath)` 构建 asar 内文件路径：

```js
// 当前写法（有问题）
path.join(process.resourcesPath, 'app.asar', 'renderer/dist/index.html')
// 结果：C:\...\resources\app.asar\renderer\dist\index.html
```

`loadFile` API 对此格式处理不当，无法正确解析 asar 虚拟路径。

## 解决方案

修改 `getResourcePath` 在打包模式下通过 `__dirname` 回溯路径：

- 打包后 `__dirname` = `{resourcesPath}/app.asar/main/dist`
- `../../` 回退到 asar 根目录
- 拼接相对路径即可访问 asar 内资源

```js
// 修复写法
path.join(__dirname, '../../', 'renderer/dist/index.html')
// 结果：{resourcesPath}/app.asar/renderer/dist/index.html ✓
```

## 修改文件

- `main/src/index.ts`：修复 `getResourcePath` 函数（第 36-43 行）

## 执行步骤

1. 修改 `getResourcePath` 函数
2. 重新编译主进程 (`npm run build:main`)
3. 重新打包到 dist-build 目录