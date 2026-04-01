import { app, BrowserWindow, ipcMain, session, globalShortcut } from 'electron';
import * as path from 'path';
import { setupDatabase } from './services/database';
import { setupTaskHandlers } from './ipc-handlers/task-handlers';
import { setupProjectHandlers } from './ipc-handlers/project-handlers';
import { setupWindowHandlers } from './ipc-handlers/window-handlers';
import { setupNotificationHandlers } from './ipc-handlers/notification-handlers';
import { setupScheduleHandlers } from './ipc-handlers/schedule-handlers';

console.log('=== Main Process Started ===');
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);
console.log('Chrome version:', process.versions.chrome);

let mainWindow: BrowserWindow | null = null;

// 设置 Content Security Policy（根据环境动态生成）
function setupCSP() {
  const isDev = !app.isPackaged;

  // 开发环境：允许 Vite 开发服务器 (localhost:5173) 和 HMR websocket
  // 生产环境：只允许本地资源 (file://), 移除所有 localhost 引用
  const csp = isDev
    ? [
        "default-src 'self'; ",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; ",
        "style-src 'self' 'unsafe-inline' http://localhost:5173; ",
        "font-src 'self' data:; ",
        "img-src 'self' data: blob: http://localhost:5173; ",
        "connect-src 'self' http://localhost:5173 ws://localhost:5173;",
      ].join('')
    : [
        "default-src 'self'; ",
        "script-src 'self' 'unsafe-inline'; ",
        "style-src 'self' 'unsafe-inline'; ",
        "font-src 'self' data:; ",
        "img-src 'self' data: blob:; ",
        "connect-src 'self';",
      ].join('');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

// 获取资源路径（兼容开发环境和打包后）
function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    // 打包后：__dirname = {resourcesPath}/app.asar/main/dist
    // 通过 __dirname 回溯到 asar 根目录，loadFile 可正确解析 asar 虚拟路径
    return path.join(__dirname, '../../', relativePath);
  }
  // 开发环境
  return path.join(__dirname, '..', '..', relativePath);
}

// 获取 preload 脚本路径（preload 不能在 asar 内，需从 extraResources 读取）
function getPreloadPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'preload', 'dist', 'index.js');
  }
  return path.join(__dirname, '../../preload/dist/index.js');
}

function createWindow() {
  const preloadPath = getPreloadPath();
  console.log('Preload path:', preloadPath);
  
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: true,
    backgroundColor: '#1E293B',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(getResourcePath('renderer/dist/index.html'));
  }

  // 打包后也可通过 Ctrl+Shift+I 打开 DevTools（方便排查生产问题）
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      if (mainWindow) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      }
    }
  });

  // 监听渲染进程崩溃，打印日志方便排查
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Render process gone:', details.reason, details.exitCode);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 创建悬浮窗口
export function createFloatingWindow(options?: {
  opacity?: number;
  clickThrough?: boolean;
  x?: number;
  y?: number;
}) {
  const floatingWin = new BrowserWindow({
    width: 400,
    height: 600,
    x: options?.x || 100,
    y: options?.y || 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    opacity: options?.opacity || 0.9,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  });

  // 设置点击穿透
  if (options?.clickThrough) {
    floatingWin.setIgnoreMouseEvents(true, { forward: true });
  }

  if (process.env.NODE_ENV === 'development') {
    floatingWin.loadURL('http://localhost:5173/floating');
  } else {
    floatingWin.loadFile(getResourcePath('renderer/dist/index.html'), {
      hash: '/floating',
    });
  }

  return floatingWin;
}

app.whenReady().then(async () => {
  try {
    // 设置 Content Security Policy（函数内部根据环境自动选择合适的策略）
    setupCSP();

    // 初始化数据库
    await setupDatabase();
    console.log('Database setup complete');

    // 设置 IPC 处理器（支持异步初始化）- 在创建窗口之前设置
    await setupTaskHandlers();
    await setupProjectHandlers();
    setupWindowHandlers();
    setupNotificationHandlers();
    setupScheduleHandlers();
    
    console.log('IPC handlers setup complete');

    // 创建主窗口
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { mainWindow };
