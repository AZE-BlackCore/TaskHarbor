/**
 * 移动端入口：Capacitor WebView 加载此文件
 * 本地优先：初始化只读本地库，网络探测全部异步后置
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import './mobile.css';
import App from './App';
import { useMobileStore } from './store';
import { bindAutoSync } from './autosync';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

async function bootstrap() {
  if (Capacitor.isNativePlatform()) {
    try {
      // 关键：采用 edge-to-edge —— WebView 延伸到系统栏下方，系统栏透明，
      // 由原生注入的真实安全区（--safe-top/--safe-bottom）把内容推开，避免被压住。
      // Android 的 env(safe-area-inset-*) 在非刘海屏返回 0，不可靠，故改用原生注入。
      await StatusBar.setOverlaysWebView({ overlay: true });
      // 浅色 header 上需要「深色状态栏图标」（时间/电量可见）。
      // Capacitor: Style.Dark = 设置 LIGHT_STATUS_BAR 标志 → 深色图标；
      // Style.Light 会清除该标志 → 浅色图标在浅色 header 上不可见。
      await StatusBar.setStyle({ style: Style.Dark });
    } catch {
      /* 忽略状态栏设置失败 */
    }
    // Android 返回键：有抽屉/弹层时交给 UI 处理
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) CapApp.exitApp();
    });
  }
  await useMobileStore.getState().init();
  // 自动同步（回前台 / WiFi 恢复）+ 日程提醒排程，全部异步，不阻塞首屏
  void bindAutoSync();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

void bootstrap();
