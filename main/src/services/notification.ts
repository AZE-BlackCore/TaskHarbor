import { Notification } from 'electron';
import * as path from 'path';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  onClick?: () => void;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async send(options: NotificationOptions): Promise<void> {
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon || path.join(__dirname, '../../renderer/public/icon.ico'),
      });

      notification.on('click', () => {
        if (options.onClick) {
          options.onClick();
        }
      });

      notification.show();
      
      // 5 秒后自动关闭
      setTimeout(() => {
        notification.close();
      }, 5000);

      return Promise.resolve();
    } catch (error) {
      console.error('发送通知失败:', error);
      return Promise.reject(error);
    }
  }

  async sendTaskReminder(taskName: string, dueDate: string): Promise<void> {
    return this.send({
      title: '⏰ 任务提醒',
      body: `任务 "${taskName}" 即将到期：${dueDate}`,
    });
  }

  async sendTaskOverdue(taskName: string): Promise<void> {
    return this.send({
      title: '⚠️ 任务已逾期',
      body: `任务 "${taskName}" 已经逾期，请尽快处理！`,
    });
  }

  async sendTaskCompleted(taskName: string): Promise<void> {
    return this.send({
      title: '✅ 任务完成',
      body: `恭喜！任务 "${taskName}" 已完成`,
    });
  }

  async sendProjectCreated(projectName: string): Promise<void> {
    return this.send({
      title: '📁 项目已创建',
      body: `项目 "${projectName}" 创建成功`,
    });
  }
}

export const notificationService = NotificationService.getInstance();
