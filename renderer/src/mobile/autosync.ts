/**
 * mobile/autosync —— 自动同步触发（FR-10 / UC-03）
 * 触发时机：App 回到前台、网络恢复为 WiFi（非计量）、手动立即同步
 * 约束：同步永远异步执行，读取不等网络
 */

import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { useMobileStore } from './store';
import { scheduleReminders } from './notifications';

let bound = false;

export async function bindAutoSync(): Promise<void> {
  if (bound || !Capacitor.isNativePlatform()) return;
  bound = true;

  CapApp.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;
    void trigger('app-resume');
  });

  Network.addListener('networkStatusChange', async (status) => {
    if (status.connected && status.connectionType === 'wifi') {
      void trigger('network-restored');
    }
  });

  void trigger('startup');
}

async function trigger(reason: string): Promise<void> {
  const store = useMobileStore.getState();
  console.log(`[autosync] trigger=${reason}`);
  await store.syncNow();
  if (store.repo) {
    try {
      await scheduleReminders(store.repo);
    } catch {
      /* 通知排程失败不影响主流程 */
    }
  }
}
