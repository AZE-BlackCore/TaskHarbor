import { app, BrowserWindow, ipcMain, session, globalShortcut, Tray, Menu, dialog } from 'electron';
import * as path from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { setupDatabase, closeDatabase, forceSaveDatabase } from './services/database';

import { setupTaskHandlers } from './ipc-handlers/task-handlers';
import { setupTagHandlers } from './ipc-handlers/tag-handlers';
import { setupProjectHandlers } from './ipc-handlers/project-handlers';
import { setupWindowHandlers } from './ipc-handlers/window-handlers';
import { setupNotificationHandlers } from './ipc-handlers/notification-handlers';
import { setupScheduleHandlers } from './ipc-handlers/schedule-handlers';
import { setupReminderHandlers } from './ipc-handlers/reminder-handlers';
import { setupExportHandlers } from './ipc-handlers/export-handlers';
import { setupAgentHandlers } from './ipc-handlers/agent-handlers';
import { setupSyncHandlers } from './ipc-handlers/sync-handlers';
import { startReminderScheduler, stopReminderScheduler } from './services/reminderService';
import { setupApiServer, closeApiServer } from './server/apiServer';
import { taskService } from './services/taskService';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

// 自定义 app 退出标志
let isQuiting = false;

// 窗口状态跟踪
let mainWindowVisible = true;

// 文件日志：打包后无控制台，将主进程日志落盘到 userData/logs/main.log，便于用户反馈问题时定位
function setupFileLogging() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logFilePath = path.join(logDir, 'main.log');
    const stream = createWriteStream(logFilePath, { flags: 'a' });
    const ts = () => new Date().toISOString();
    const fmt = (a: any) => (a && a.stack) ? a.stack : (typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch { return String(a); } })() : String(a));
    const wrap = (orig: (...a: any[]) => void, level: string) => (...args: any[]) => {
      orig(...args);
      try { stream.write(`[${ts()}] [${level}] ${args.map(fmt).join(' ')}\n`); } catch { /* ignore */ }
    };
    console.log = wrap(console.log.bind(console), 'INFO');
    console.error = wrap(console.error.bind(console), 'ERROR');
    console.warn = wrap(console.warn.bind(console), 'WARN');
    process.on('uncaughtException', (e: any) => console.error('[uncaughtException]', e?.stack || e));
    process.on('unhandledRejection', (e: any) => console.error('[unhandledRejection]', e?.stack || e));
    console.log('[Log] File logging enabled at', logFilePath);
  } catch {
    // 日志初始化失败不影响主流程
  }
}

// 设置 Content Security Policy
function setupCSP() {
  const isDev = !app.isPackaged;

  const csp = isDev
    ? [
        "default-src 'self'; ",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; ",
        "style-src 'self' 'unsafe-inline' http://localhost:5173; ",
        "font-src 'self' data:; ",
        "img-src 'self' data: blob: http://localhost:5173; ",
        // 放行本机回环：Agent 接入面板需 fetch 本地 HTTP API（端口可在面板调整）
        "connect-src 'self' http://localhost:5173 ws://localhost:5173 http://127.0.0.1:* http://localhost:*; ",
      ].join('')
    : [
        "default-src 'self'; ",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; ",
        "style-src 'self' 'unsafe-inline' data:; ",
        "font-src 'self' data:; ",
        "img-src 'self' data: blob:; ",
        // 放行本机回环：Agent 接入面板需 fetch 本地 HTTP API（端口可在面板调整）
        "connect-src 'self' http://127.0.0.1:* http://localhost:*; ",
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

  // 正式版默认隐藏菜单栏
  if (app.isPackaged) {
    mainWindow.setMenuBarVisibility(false);
  }

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

  // 窗口显示/隐藏时更新状态和托盘菜单
  mainWindow.on('show', () => {
    console.log('[createWindow] Window shown');
    mainWindowVisible = true;
    updateTrayMenu();
  });

  mainWindow.on('hide', () => {
    console.log('[createWindow] Window hidden');
    mainWindowVisible = false;
    updateTrayMenu();
  });

  mainWindow.on('minimize', () => {
    console.log('[createWindow] Window minimized');
    mainWindowVisible = false;
    updateTrayMenu();
  });

  mainWindow.on('restore', () => {
    console.log('[createWindow] Window restored');
    mainWindowVisible = true;
    updateTrayMenu();
  });

  // 拦截窗口关闭事件：始终干净退出
  // 注意：原先的「最小化到托盘/退出」确认框会拦截安装器升级时发来的 WM_CLOSE，
  // 导致升级卡在「无法关闭」。改为关闭即退出（数据已在 before-quit 中保存），
  // 让安装器能自动关闭旧程序；最小化到托盘仍可通过托盘菜单「隐藏主窗口」实现。
  mainWindow.on('close', (e) => {
    if (isQuiting) {
      console.log('[createWindow] Application quitting, closing window');
      return;
    }
    e.preventDefault();
    isQuiting = true;
    app.quit();
  });
}

// 获取图标路径（支持打包后环境）
function getIconPath(): string | undefined {
  let iconPath: string | undefined;
  
  // 生产环境 - 使用 process.resourcesPath
  if (app.isPackaged) {
    // 尝试多个可能的路径
    const paths = [
      // 品牌更名后图标位于 renderer/public（extraResources 复制到 resources/renderer/public）
      path.join(process.resourcesPath, 'renderer', 'public', 'icon.ico'),
      path.join(process.resourcesPath, 'renderer', 'dist', 'icon.ico'),
      path.join(process.resourcesPath, 'build', 'icon.ico'),
      path.join(process.resourcesPath, 'icon.ico'),
      path.join(__dirname, '../build', 'icon.ico'),
      path.join(__dirname, '../../build', 'icon.ico'),
    ];
    
    for (const p of paths) {
      if (existsSync(p)) {
        iconPath = p;
        console.log('[getIconPath] Using production icon:', iconPath);
        break;
      }
    }
    
    // 如果 ICO 不存在，尝试 PNG
    if (!iconPath) {
      const pngPaths = [
        path.join(process.resourcesPath, 'build', 'icon.png'),
        path.join(process.resourcesPath, 'icon.png'),
        path.join(__dirname, '../build', 'icon.png'),
        path.join(__dirname, '../../build', 'icon.png'),
      ];
      
      for (const p of pngPaths) {
        if (existsSync(p)) {
          iconPath = p;
          console.log('[getIconPath] Using production PNG icon:', iconPath);
          break;
        }
      }
    }
  } else {
    // 开发环境
    const devPaths = [
      path.join(__dirname, '../../build/icon.ico'),
      path.join(__dirname, '../../../build/icon.ico'),
      path.join(process.cwd(), 'build/icon.ico'),
    ];
    
    for (const p of devPaths) {
      if (existsSync(p)) {
        iconPath = p;
        console.log('[getIconPath] Using dev icon:', iconPath);
        break;
      }
    }
    
    // 如果 ICO 不存在，尝试 PNG
    if (!iconPath) {
      const pngPaths = [
        path.join(__dirname, '../../build/icon.png'),
        path.join(__dirname, '../../../build/icon.png'),
        path.join(process.cwd(), 'build/icon.png'),
      ];
      
      for (const p of pngPaths) {
        if (existsSync(p)) {
          iconPath = p;
          console.log('[getIconPath] Using dev PNG icon:', iconPath);
          break;
        }
      }
    }
  }
  
  if (!iconPath) {
    console.warn('[getIconPath] No icon found, using default');
  }
  
  return iconPath;
}

// 更新托盘菜单（根据窗口状态动态切换）
function updateTrayMenu() {
  console.log('[updateTrayMenu] mainWindowVisible:', mainWindowVisible);
  
  if (!tray) {
    console.warn('[updateTrayMenu] Tray not initialized');
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindowVisible ? '隐藏主窗口' : '显示主窗口',
      click: () => {
        console.log('[updateTrayMenu] Menu item clicked:', mainWindowVisible ? '隐藏' : '显示');
        if (!mainWindow) return;
        
        if (mainWindowVisible) {
          mainWindow.hide();
          mainWindowVisible = false;
        } else {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          mainWindowVisible = true;
        }
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: '关于 小湾清单',
      click: () => {
        console.log('[updateTrayMenu] Showing about dialog');
        dialog.showMessageBox({
          type: 'info',
          title: '关于 小湾清单',
          message: `小湾清单 v${app.getVersion()}`,
          detail: '桌面端任务管理软件\n让任务安全停靠、高效启航',
          buttons: ['确定'],
        });
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        console.log('[updateTrayMenu] Quitting application');
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  console.log('[updateTrayMenu] Context menu updated');
}

// 创建系统托盘
function createTray() {
  const iconPath = getIconPath();

  // 托盘创建失败不得阻断主初始化（历史上 new Tray('') 会抛 "Failed to load image from path ''"）
  try {
    if (iconPath && existsSync(iconPath)) {
      tray = new Tray(iconPath);
      console.log('[createTray] Tray created with icon:', iconPath);
    } else {
      console.warn('[createTray] No icon found, tray skipped (window still available)');
      return;
    }
  } catch (error) {
    console.error('[createTray] Failed to create tray:', error);
    return;
  }

  if (!tray) {
    console.error('[createTray] Failed to create tray');
    return;
  }

  // 初始化托盘菜单
  updateTrayMenu();

  tray.setToolTip('小湾清单 - 任务管理系统');

  // 单击托盘图标显示/隐藏主窗口
  tray.on('click', () => {
    console.log('[Tray] Single click');
    if (!mainWindow) return;
    
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      mainWindowVisible = false;
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindowVisible = true;
    }
    updateTrayMenu();
  });

  // 双击托盘图标显示主窗口
  tray.on('double-click', () => {
    console.log('[Tray] Double click');
    if (!mainWindow) return;
    
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindowVisible = true;
    updateTrayMenu();
  });

  console.log('[createTray] Tray created successfully');
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
    opacity: options?.opacity || 0.95,
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
    floatingWin.loadURL(`http://localhost:5173/floating`);
  } else {
    const htmlPath = getResourcePath('renderer/dist/index.html');
    floatingWin.loadURL(`file:///${htmlPath.replace(/\\/g, '/')}#/floating`);
  }

  return floatingWin;
}

// ---------------------------------------------------------------- 单实例保护
// 背景：曾出现多个实例并存，旧实例后台常驻继续监听 18766，
// 新实例开启同步报 EADDRINUSE；且升级安装时文件被占用会造成「半升级」。
// 单实例锁以 userData 路径为键，不同 --user-data-dir 的验证实例互不干扰。
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[App] Another instance already running, quitting this one');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  try {
    setupFileLogging();
    console.log('[App] App ready, initializing...');

    setupCSP();

    await setupDatabase();
    // 初始化任务服务单例的数据库连接，供 HTTP API 任务端点使用
    await taskService.init();
    console.log('[App] Database setup complete');

    await setupTaskHandlers();
    await setupTagHandlers();
    await setupProjectHandlers();
    setupWindowHandlers();
    setupNotificationHandlers();
    await setupScheduleHandlers();
    setupReminderHandlers();
    setupExportHandlers();
    setupAgentHandlers();
    setupSyncHandlers();
    console.log('[App] IPC handlers setup complete');

    // 启动本地 HTTP API（供 WorkBuddy / MCP / 脚本对接写入日程）
    setupApiServer();

    // 启动提醒调度器（每 60 秒扫描一次到期提醒）
    startReminderScheduler(async (_taskId) => null);
    console.log('[App] Reminder scheduler started');

    // 菜单栏可见性 IPC 处理器
    ipcMain.handle('set-menu-bar-visibility', (_event, visible: boolean) => {
      mainWindow?.setMenuBarVisibility(visible);
      return { success: true };
    });

    // 获取应用版本信息
    ipcMain.handle('get-app-info', () => {
      // MCP server 路径：打包后随安装包内置到 resources/mcp-server，开发时指向源码
      const mcpServerPath = app.isPackaged
        ? path.join(process.resourcesPath, 'mcp-server', 'server.mjs')
        : path.join(app.getAppPath(), 'tools', 'mcp-server', 'server.mjs');
      return {
        success: true,
        version: app.getVersion(),
        buildDate: process.env.BUILD_DATE || new Date().toISOString(),
        author: 'AZE-BlackCore',
        productName: app.getName(),
        description: '桌面端任务管理软件 - 让任务安全停靠、高效启航',
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        appPath: app.getAppPath(),
        mcpServerPath,
      };
    });

    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        createTray();
      }
    });
  } catch (error: any) {
    console.error('[App] Failed to initialize app:', error);
  }
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  // 窗口全部关闭后先强制刷盘一次，避免数据未持久化（用户常通过升级安装包覆盖旧进程）
  try { forceSaveDatabase(); } catch (e) { console.error('[App] Save on window-close failed:', e); }
  // 不退出应用，保持托盘运行
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
});

// 应用即将退出：同步关闭数据库（强制刷盘），避免安装新版本覆盖旧进程导致数据丢失
app.on('before-quit', (event) => {
  console.log('[App] Before quit, force saving database...');
  try {
    closeApiServer();
  } catch (e) {
    console.error('[App] Failed to close API server on quit:', e);
  }
  try {
    closeDatabase();
    console.log('[App] Database closed successfully');
  } catch (e) {
    console.error('[App] Failed to close database on quit:', e);
  }
  stopReminderScheduler();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// will-quit 作为最终兜底保存，防止 before-quit 未执行完时进程强杀
app.on('will-quit', (event) => {
  console.log('[App] Will quit, final save attempt...');
  try { forceSaveDatabase(); } catch (e) { /* ignore */ }
});

export { mainWindow };
