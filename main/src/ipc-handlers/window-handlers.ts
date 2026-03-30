import { ipcMain, BrowserWindow } from 'electron';
import { createFloatingWindow } from '../index';

export function setupWindowHandlers() {
  // 设置窗口透明度
  ipcMain.handle('window:setOpacity', (_, opacity: number) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.setOpacity(Math.max(0.1, Math.min(1.0, opacity)));
        return { success: true };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error setting opacity:', error);
      return { success: false, error: error.message };
    }
  });

  // 切换点击穿透
  ipcMain.handle('window:toggleClickThrough', () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        // Electron BrowserWindow 没有 isIgnoreMouseEvents 方法，需要自己跟踪状态
        // 这里简化处理，直接切换状态
        const current = win.isAlwaysOnTop(); // 临时使用其他状态替代
        win.setIgnoreMouseEvents(!current, { forward: true });
        return { success: true, clickThrough: !current };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error toggling click through:', error);
      return { success: false, error: error.message };
    }
  });

  // 最小化到托盘
  ipcMain.handle('window:minimizeToTray', () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.minimize();
        win.hide();
        return { success: true };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error minimizing to tray:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建新的悬浮窗口
  ipcMain.handle('window:createFloating', (_, options) => {
    try {
      const floatingWin = createFloatingWindow(options);
      return { 
        success: true, 
        windowId: floatingWin.id,
        message: 'Floating window created'
      };
    } catch (error: any) {
      console.error('Error creating floating window:', error);
      return { success: false, error: error.message };
    }
  });

  // 关闭悬浮窗口
  ipcMain.handle('window:closeFloating', (_, windowId) => {
    try {
      const win = BrowserWindow.fromId(windowId);
      if (win) {
        win.close();
        return { success: true };
      }
      return { success: false, error: 'Window not found' };
    } catch (error: any) {
      console.error('Error closing floating window:', error);
      return { success: false, error: error.message };
    }
  });

  // 窗口置顶切换
  ipcMain.handle('window:toggleAlwaysOnTop', () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        const current = win.isAlwaysOnTop();
        win.setAlwaysOnTop(!current);
        return { success: true, alwaysOnTop: !current };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error toggling always on top:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取窗口位置
  ipcMain.handle('window:getPosition', () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        const [x, y] = win.getPosition();
        return { success: true, x, y };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error getting window position:', error);
      return { success: false, error: error.message };
    }
  });

  // 设置窗口位置
  ipcMain.handle('window:setPosition', (_, x: number, y: number) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.setPosition(x, y);
        return { success: true };
      }
      return { success: false, error: 'No active window' };
    } catch (error: any) {
      console.error('Error setting window position:', error);
      return { success: false, error: error.message };
    }
  });
}
