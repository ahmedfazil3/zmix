export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async sendNotification(
    title: string,
    message: string,
    type: NotificationType = 'info',
    options?: {
      icon?: string;
      actionUrl?: string;
      silent?: boolean;
    }
  ): Promise<void> {
    // Always send to in-app notification center
    this.sendInAppNotification(title, message, type, options?.actionUrl);

    // Send browser notification only if permission granted and tab not focused
    if (this.permission === 'granted' && document.hidden) {
      try {
        const icon = options?.icon || this.getDefaultIcon(type);
        const notification = new Notification(title, {
          body: message,
          icon,
          badge: icon,
          silent: options?.silent,
          tag: `zmix-${type}-${Date.now()}`,
          requireInteraction: type === 'error' || type === 'success',
        });

        notification.onclick = () => {
          window.focus();
          if (options?.actionUrl) {
            window.location.hash = options.actionUrl;
          }
          notification.close();
        };
      } catch (error) {
        console.error('Error sending browser notification:', error);
      }
    }
  }

  private sendInAppNotification(
    title: string,
    message: string,
    type: NotificationType,
    actionUrl?: string
  ): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      actionUrl,
    };

    // Store in localStorage for now (will be replaced with API call)
    const notifications = this.getStoredNotifications();
    notifications.unshift(notification);
    
    // Keep only last 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem('zmix-notifications', JSON.stringify(trimmed));

    // Dispatch custom event for notification center to listen
    window.dispatchEvent(new CustomEvent('zmix-notification', { detail: notification }));
  }

  getStoredNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem('zmix-notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  markAsRead(notificationId: string): void {
    const notifications = this.getStoredNotifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem('zmix-notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('zmix-notifications-updated'));
  }

  markAllAsRead(): void {
    const notifications = this.getStoredNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('zmix-notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('zmix-notifications-updated'));
  }

  clearAll(): void {
    localStorage.removeItem('zmix-notifications');
    window.dispatchEvent(new Event('zmix-notifications-updated'));
  }

  getUnreadCount(): number {
    return this.getStoredNotifications().filter(n => !n.read).length;
  }

  private getDefaultIcon(type: NotificationType): string {
    const baseUrl = window.location.origin;
    switch (type) {
      case 'success':
        return `${baseUrl}/success-icon.png`;
      case 'error':
        return `${baseUrl}/error-icon.png`;
      case 'warning':
        return `${baseUrl}/warning-icon.png`;
      default:
        return `${baseUrl}/info-icon.png`;
    }
  }

  // Notification helpers for common scenarios
  async notifyMixSuccess(solAmount: string, hops: number): Promise<void> {
    await this.sendNotification(
      'Mix Completed Successfully! 🎉',
      `${solAmount} SOL routed through ${hops} privacy hops to your destination. Remember to burn your wallet!`,
      'success',
      { actionUrl: '#/' }
    );
  }

  async notifyMixError(error: string): Promise<void> {
    await this.sendNotification(
      'Mix Failed',
      `Privacy mix encountered an error: ${error}. Your funds are safe.`,
      'error',
      { actionUrl: '#/' }
    );
  }

  async notifyDelayComplete(): Promise<void> {
    await this.sendNotification(
      'Privacy Delay Complete',
      'Starting privacy hop chain now...',
      'info',
      { silent: true }
    );
  }

  async notifyHopProgress(currentHop: number, totalHops: number): Promise<void> {
    if (document.hidden) {
      await this.sendNotification(
        'Privacy Hop Progress',
        `Completed hop ${currentHop} of ${totalHops}`,
        'info',
        { silent: true }
      );
    }
  }
}

export const notificationService = NotificationService.getInstance();
