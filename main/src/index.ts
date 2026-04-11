import { app, BrowserWindow, ipcMain, session, globalShortcut, Tray, Menu, dialog } from 'electron';
import * as path from 'path';
import { existsSync } from 'fs';
import { setupDatabase } from './services/database';
import { setupTaskHandlers } from './ipc-handlers/task-handlers';
import { setupProjectHandlers } from './ipc-handlers/project-handlers';
import { setupWindowHandlers } from './ipc-handlers/window-handlers';
import { setupNotificationHandlers } from './ipc-handlers/notification-handlers';
import { setupScheduleHandlers } from './ipc-handlers/schedule-handlers';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

// 自定义 app 退出标志
let isQuiting = false;

// 窗口状态跟踪
let mainWindowVisible = true;

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

  // 拦截窗口关闭事件，显示确认对话框
  mainWindow.on('close', (e) => {
    // 如果是退出应用，直接关闭
    if (isQuiting) {
      console.log('[createWindow] Application quitting, closing window');
      return;
    }

    e.preventDefault();
    
    // 显示确认对话框
    if (!mainWindow) return;
    
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['最小化到托盘', '退出程序'],
      defaultId: 0,
      cancelId: 1,
      title: '确认退出',
      message: '您想要做什么？',
      detail: '选择"最小化到托盘"将继续在后台运行，选择"退出程序"将完全退出应用。',
      checkboxLabel: '记住我的选择',
    }).then((result) => {
      if (result.checkboxChecked) {
        // 记住用户选择
        const action = result.response === 0 ? 'minimize' : 'exit';
        mainWindow?.webContents.send('close-preference', action);
      }

      if (result.response === 0) {
        // 最小化到托盘
        mainWindow?.minimize();
        mainWindow?.hide();
      } else {
        // 退出应用
        isQuiting = true;
        app.quit();
      }
    }).catch((err) => {
      console.error('[createWindow] Error showing dialog:', err);
    });
  });
}

// 获取图标路径（支持打包后环境）
function getIconPath(): string | undefined {
  let iconPath: string | undefined;
  
  // 生产环境 - 使用 process.resourcesPath
  if (app.isPackaged) {
    // 尝试多个可能的路径
    const paths = [
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
    {
      label: '桌面悬浮卡片',
      click: () => {
        console.log('[updateTrayMenu] Creating desktop card');
        createFloatingWindow({ page: 'desktop-card', x: 200, y: 200 });
      },
    },
    { type: 'separator' },
    {
      label: '关于 TaskHarbor',
      click: () => {
        console.log('[updateTrayMenu] Showing about dialog');
        dialog.showMessageBox({
          type: 'info',
          title: '关于 TaskHarbor',
          message: `TaskHarbor v${app.getVersion()}`,
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
  
  if (iconPath && existsSync(iconPath)) {
    try {
      tray = new Tray(iconPath);
      console.log('[createTray] Tray created with icon:', iconPath);
    } catch (error) {
      console.error('[createTray] Failed to create tray with icon:', error);
      // 使用空图标创建托盘（Windows 会显示默认图标）
      tray = new Tray(path.join(__dirname, 'icon.png'));
    }
  } else {
    console.warn('[createTray] No icon found, creating tray without custom icon');
    // 创建托盘时不使用图标，Windows 会显示默认图标
    tray = new Tray('');
  }

  if (!tray) {
    console.error('[createTray] Failed to create tray');
    return;
  }

  // 初始化托盘菜单
  updateTrayMenu();

  tray.setToolTip('TaskHarbor - 任务管理系统');

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
  page?: 'floating' | 'desktop-card';
}) {
  const page = options?.page || 'floating';
  const width = page === 'desktop-card' ? 400 : 400;
  const height = page === 'desktop-card' ? 700 : 600;

  const floatingWin = new BrowserWindow({
    width,
    height,
    x: options?.x || 100,
    y: options?.y || 100,
    // 桌面卡片使用普通窗口，悬浮窗口使用无边框透明
    frame: page === 'desktop-card' ? true : false,
    transparent: page === 'floating',
    // 桌面卡片不设置 alwaysOnTop 避免屏闪
    alwaysOnTop: page === 'floating',
    // 桌面卡片显示在任务栏
    skipTaskbar: page === 'floating',
    resizable: false,
    movable: true,
    // 桌面卡片添加阴影提高视觉效果
    hasShadow: page === 'desktop-card' ? true : false,
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
    floatingWin.loadURL(`http://localhost:5173/${page}`);
  } else {
    const htmlPath = getResourcePath('renderer/dist/index.html');
    floatingWin.loadURL(`file:///${htmlPath.replace(/\\/g, '/')}#/${page}`);
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

    // 菜单栏可见性 IPC 处理器
    ipcMain.handle('set-menu-bar-visibility', (_event, visible: boolean) => {
      mainWindow?.setMenuBarVisibility(visible);
      return { success: true };
    });

    // 获取应用版本信息
    ipcMain.handle('get-app-info', () => {
      return {
        success: true,
        version: app.getVersion(),
        buildDate: process.env.BUILD_DATE || new Date().toISOString(),
        author: 'AZE-BlackCore',
        productName: app.getName(),
        description: '桌面端任务管理软件 - 让任务安全停靠、高效启航',
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
  } catch (error) {
    console.error('[App] Failed to initialize app:', error);
  }
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  // 不退出应用，保持托盘运行
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
});

// 所有窗口关闭时退出应用（仅当没有托盘时）
app.on('before-quit', () => {
  console.log('[App] Before quit');
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

export { mainWindow };
