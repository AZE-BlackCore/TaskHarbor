import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 小湾清单（Cove）移动端 · Capacitor 配置
 * 内部技术标识保留 TaskHarbor（品牌双轨制：对外「小湾清单 Cove」，内部 taskharbor）
 */
const config: CapacitorConfig = {
  appId: 'com.taskharbor.mobile',
  appName: '小湾清单',
  webDir: 'mobile-dist',
  loggingEnabled: false,
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
    // 移动端 WebView 以 https://localhost 加载，需跨源访问局域网明文 Hub(http://<LAN IP>:18766)。
    // 放开混合内容后，浏览器才允许 https 页 fetch 明文地址（否则先于 CORS 被拦截）。
    // CORS 头由桌面 Hub(syncServer.ts) 负责返回。
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsDatabaseLocationOnSDCard: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#3B82F6',
    },
  },
};

export default config;
