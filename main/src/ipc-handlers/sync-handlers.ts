/**
 * ipc-handlers/sync-handlers —— 桌面端同步中枢的开关与状态查询
 * 安全默认：Hub 默认关闭，仅用户显式开启时监听（ADR-06）
 */

import { ipcMain } from 'electron';
import {
  getHubStatus,
  listCandidateAddresses,
  rotatePin,
  startHub,
  stopHub,
} from '../services/syncServer';

export function setupSyncHandlers(): void {
  ipcMain.handle('sync:start', async (_e, host?: string) => {
    const r = await startHub({ host });
    return { ...r, status: getHubStatus() };
  });

  ipcMain.handle('sync:stop', async () => {
    await stopHub();
    return getHubStatus();
  });

  ipcMain.handle('sync:status', () => getHubStatus());

  ipcMain.handle('sync:rotatePin', () => {
    return { pin: rotatePin(), status: getHubStatus() };
  });

  ipcMain.handle('sync:candidates', () => listCandidateAddresses());
}
