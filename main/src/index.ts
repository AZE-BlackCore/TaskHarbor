import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { setupDatabase } from './services/database';
import { setupTaskHandlers } from './ipc-handlers/task-handlers';
import { setupProjectHandlers } from './ipc-handlers/project-handlers';
import { setupWindowHandlers } from './ipc-handlers/window-handlers';
import { setupNotificationHandlers } from './ipc-handlers/notification-handlers';

let mainWindow: BrowserWindow | null = null;

// 设置 Content Security Policy
function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; " +
          "style-src 'self' 'unsafe-inline' http://localhost:5173; " +
          "font-src 'self' data:; " +
          "img-src 'self' data: blob: http://localhost:5173; " +
          "connect-src 'self' http://localhost:5173 ws://localhost:5173;"
        ],
      },
    });
  });
}

// 获取资源路径（兼容开发环境和打包后）
function getResourcePath(relativePath: string): string {
  // 打包后资源在 app.asar 中
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', relativePath);
  }
  // 开发环境
  return path.join(__dirname, '..', '..', relativePath);
}

function createWindow() {
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
      preload: getResourcePath('preload/dist/index.js'),
    },
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(getResourcePath('renderer/dist/index.html'));
  }

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
      preload: path.join(__dirname, '../../preload/dist/index.js'),
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
    // 设置 Content Security Policy
    // 注意：开发环境需要 'unsafe-eval' 支持 Vite HMR，会显示安全警告
    // 生产环境打包后会使用更严格的 CSP，不会显示警告
    if (app.isPackaged) {
      setupCSP();
    }

    // 初始化数据库
    await setupDatabase();
    console.log('Database setup complete');

    // 创建主窗口
    createWindow();

    // 设置 IPC 处理器
    setupTaskHandlers();
    setupProjectHandlers();
    setupWindowHandlers();
    setupNotificationHandlers();

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
