import { app, BrowserWindow, ipcMain, session, globalShortcut } from 'electron';
import * as path from 'path';
import { existsSync } from 'fs';
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
console.log('isPackaged:', app.isPackaged);
console.log('resourcesPath:', process.resourcesPath);
console.log('__dirname:', __dirname);
console.log('cwd:', process.cwd());

let mainWindow: BrowserWindow | null = null;

// 设置 Content Security Policy
function setupCSP() {
  const isDev = !app.isPackaged;

  // 生产环境需要更宽松的 CSP 以支持 Vite 打包的模块
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; ",
        "style-src 'self' 'unsafe-inline' data:; ",
        "font-src 'self' data:; ",
        "img-src 'self' data: blob:; ",
        "connect-src 'self';",
      ].join('');

  console.log('[CSP] Mode:', isDev ? 'Dev' : 'Production');
  console.log('[CSP] Policy:', csp);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

// 获取资源路径
function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    const fullPath = path.join(process.resourcesPath, relativePath);
    console.log('[getResourcePath] Packaged mode, path:', fullPath);
    console.log('[getResourcePath] Exists:', existsSync(fullPath));
    return fullPath;
  }
  const fullPath = path.join(__dirname, '..', '..', relativePath);
  console.log('[getResourcePath] Dev mode, path:', fullPath);
  return fullPath;
}

// 获取 preload 脚本路径
function getPreloadPath(): string {
  if (app.isPackaged) {
    const fullPath = path.join(process.resourcesPath, 'preload', 'dist', 'index.js');
    console.log('[getPreloadPath] Packaged mode, path:', fullPath);
    console.log('[getPreloadPath] Exists:', existsSync(fullPath));
    return fullPath;
  }
  const fullPath = path.join(__dirname, '../../preload/dist/index.js');
  console.log('[getPreloadPath] Dev mode, path:', fullPath);
  return fullPath;
}

function createWindow() {
  const preloadPath = getPreloadPath();
  console.log('[createWindow] Preload path:', preloadPath);
  console.log('[createWindow] Preload exists:', existsSync(preloadPath));

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
      webSecurity: false, // 关闭 web 安全检查，允许加载本地文件
    },
  });

  // 监听渲染进程控制台消息
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelStr = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'][level] || 'UNKNOWN';
    console.log(`[Renderer ${levelStr}] ${message} (${sourceId}:${line})`);
  });

  // 监听加载事件
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[createWindow] Web contents started loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[createWindow] Web contents finished loading');
    // 加载完成后再打开 DevTools
    if (app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[createWindow] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[createWindow] Render process gone:', details.reason, details.exitCode);
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    console.log('[createWindow] Loading dev URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = getResourcePath('renderer/dist/index.html');
    console.log('[createWindow] Loading HTML from:', htmlPath);
    console.log('[createWindow] HTML exists:', existsSync(htmlPath));
    
    // 使用 loadFile 加载本地文件，确保路由正确
    mainWindow.loadFile(htmlPath).then(() => {
      console.log('[createWindow] HTML loaded successfully');
    }).catch((err) => {
      console.error('[createWindow] Failed to load HTML:', err);
    });
  }

  // Ctrl+Shift+I 切换 DevTools
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

  mainWindow.on('closed', () => {
    console.log('[createWindow] Window closed');
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

  if (options?.clickThrough) {
    floatingWin.setIgnoreMouseEvents(true, { forward: true });
  }

  if (process.env.NODE_ENV === 'development') {
    floatingWin.loadURL('http://localhost:5173/floating');
  } else {
    const htmlPath = getResourcePath('renderer/dist/index.html');
    floatingWin.loadURL(`file:///${htmlPath.replace(/\\/g, '/')}#/floating`);
  }

  return floatingWin;
}

app.whenReady().then(async () => {
  try {
    console.log('[App] App ready, initializing...');

    setupCSP();

    await setupDatabase();
    console.log('[App] Database setup complete');

    await setupTaskHandlers();
    await setupProjectHandlers();
    setupWindowHandlers();
    setupNotificationHandlers();
    await setupScheduleHandlers();
    console.log('[App] IPC handlers setup complete');

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[App] Failed to initialize app:', error);
  }
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { mainWindow };