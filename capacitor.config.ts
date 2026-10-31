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
    allowMixedContent: false,
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
