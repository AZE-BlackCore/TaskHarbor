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
      // 关键：不让 WebView 绘制到系统栏下方。
      // Android Chrome 的 env(safe-area-inset-top) 只对「刘海/挖孔」返回非零值，
      // 不返回状态栏高度 —— 之前标题被状态栏压住就是因为这个。
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#F7F9FC' });
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
