# Todo List Desktop - 构建和打包指南

## 开发模式

```bash
cd e:\AZE-BlackCore\TodoListDesktop

# 安装所有依赖
npm install
cd renderer && npm install
cd ..

# 启动开发服务器（同时启动 Vite 和 Electron）
npm run dev
```

## 打包构建

### Windows

```bash
# 打包 Windows 可执行文件（NSIS 安装版 + 便携版）
npm run electron:build
```

输出位置：`release/TodoList Desktop-1.0.0-Win-x64.exe`

### macOS

```bash
# 打包 macOS DMG
npm run electron:build
```

输出位置：`release/TodoList Desktop-1.0.0-Mac-x64.dmg`

### Linux

```bash
# 打包 Linux AppImage 和 DEB
npm run electron:build
```

输出位置：
- `release/TodoList Desktop-1.0.0-Linux-x64.AppImage`
- `release/TodoList Desktop-1.0.0-Linux-x64.deb`

## 打包选项

```bash
# 仅打包不创建安装程序（快速测试）
npm run electron:pack

# 仅 Windows
npm run electron:build -- --win

# 仅 macOS
npm run electron:build -- --mac

# 仅 Linux
npm run electron:build -- --linux
```

## 构建产物说明

### Windows NSIS 安装版
- 完整的安装程序
- 支持自定义安装路径
- 创建桌面和开始菜单快捷方式
- 支持卸载

### Windows 便携版
- 单文件可执行文件
- 无需安装，直接运行
- 适合 U 盘携带

### macOS DMG
- 标准 macOS 安装包
- 拖拽安装到 Applications

### Linux AppImage
- 通用 Linux 包格式
- 无需安装，直接运行
- 需要设置执行权限：`chmod +x *.AppImage`

### Linux DEB
- Debian/Ubuntu 安装包
- 使用 `dpkg -i` 安装

## 系统要求

### Windows
- Windows 10/11 (64-bit)
- 200MB 可用空间

### macOS
- macOS 10.13+ (64-bit)
- 200MB 可用空间

### Linux
- Ubuntu 18.04+ / Debian 9+ / Fedora 28+
- 200MB 可用空间

## 常见问题

### 1. 打包失败
确保所有依赖已安装：
```bash
npm install
cd renderer && npm install
```

### 2. 打包后应用无法启动
检查是否有原生模块依赖，本应用使用纯 JS 实现，无此问题。

### 3. 安装包过大
- 检查是否包含了不必要的文件
- 使用 `npm run electron:pack` 查看打包内容

## 代码签名（可选）

### Windows
```bash
# 设置代码签名证书
set WIN_CSC_LINK=path/to/certificate.p12
set WIN_CSC_KEY_PASSWORD=your_password
npm run electron:build
```

### macOS
```bash
# 使用开发者证书
export CSC_NAME="Developer ID Application: Your Name"
npm run electron:build
```

## 自动更新（未来功能）

配置 electron-updater 实现自动更新：

```javascript
// main/src/index.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

## 版本发布

1. 更新 `package.json` 中的版本号
2. 运行打包命令
3. 测试所有安装包
4. 发布到 GitHub Releases
