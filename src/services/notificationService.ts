/**
 * NotificationService
 * 
 * Manages Web Notifications API interactions for displaying desktop notifications.
 * Handles permission management, notification display, and lifecycle management.
 */

export type Language = 'vi' | 'en' | 'ja';

export interface OrderNotificationData {
  orderId: number;
  dishNames: string[];
  customerName: string;
  timestamp: Date;
  language: Language;
}

interface NotificationTranslations {
  newOrder: string;
  orderFrom: string;
  at: string;
}

const TRANSLATIONS: Record<Language, NotificationTranslations> = {
  vi: {
    newOrder: 'Đơn hàng mới',
    orderFrom: 'Đơn từ',
    at: 'lúc',
  },
  en: {
    newOrder: 'New Order',
    orderFrom: 'Order from',
    at: 'at',
  },
  ja: {
    newOrder: '新しい注文',
    orderFrom: '注文者',
    at: '時刻',
  },
};

// Track displayed notifications to prevent duplicates
const displayedNotifications = new Set<number>();
const DUPLICATE_WINDOW_MS = 5000; // 5 seconds

// Track active notification instances
const activeNotifications = new Map<number, Notification>();

class NotificationService {
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'Notification' in window;
    
    if (!this.isSupported) {
      console.warn('This browser does not support desktop notifications');
    }
  }

  /**
   * Check if Web Notifications API is supported
   */
  isBrowserSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Cannot request permission: notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Format timestamp to human-readable format
   */
  private formatTimestamp(date: Date, language: Language): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format dish names as comma-separated list
   */
  private formatDishNames(dishNames: string[]): string {
    return dishNames.join(', ');
  }

  /**
   * Display order notification
   */
  showOrderNotification(data: OrderNotificationData, onClickNavigate?: () => void): void {
    // Check browser support
    if (!this.isSupported) {
      console.warn('Cannot show notification: browser not supported');
      return;
    }

    // Check permission
    if (Notification.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    // Prevent duplicate notifications
    if (displayedNotifications.has(data.orderId)) {
      console.log('Skipping duplicate notification for order:', data.orderId);
      return;
    }

    try {
      const t = TRANSLATIONS[data.language];
      const title = t.newOrder;
      
      const dishList = this.formatDishNames(data.dishNames);
      const time = this.formatTimestamp(data.timestamp, data.language);
      const body = `${t.orderFrom} ${data.customerName}\n${dishList}\n${t.at} ${time}`;

      const options: NotificationOptions = {
        body,
        icon: '/fsidds.png', // Application icon
        badge: '/fsidds.png',
        tag: `order-${data.orderId}`, // Prevents duplicate notifications with same tag
        requireInteraction: false,
        silent: false,
      };

      const notification = new Notification(title, options);

      // Track this notification
      displayedNotifications.add(data.orderId);
      activeNotifications.set(data.orderId, notification);

      // Remove from tracking after duplicate window
      setTimeout(() => {
        displayedNotifications.delete(data.orderId);
      }, DUPLICATE_WINDOW_MS);

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
        activeNotifications.delete(data.orderId);
      }, 10000);

      // Handle click event
      notification.onclick = () => {
        console.log('Notification clicked for order:', data.orderId);
        
        // Focus window
        window.focus();
        
        // Navigate to orders view if callback provided
        if (onClickNavigate) {
          onClickNavigate();
        }
        
        // Close notification immediately
        notification.close();
        activeNotifications.delete(data.orderId);
      };

      // Handle close event
      notification.onclose = () => {
        activeNotifications.delete(data.orderId);
      };

      // Handle error event
      notification.onerror = (error) => {
        console.error('Notification error:', error);
        activeNotifications.delete(data.orderId);
      };

      console.log('✅ Notification displayed for order:', data.orderId);
    } catch (error) {
      console.error('Failed to display notification:', error, {
        orderId: data.orderId,
        customerName: data.customerName,
      });
      // Continue application operation despite error
    }
  }

  /**
   * Close a specific notification
   */
  closeNotification(orderId: number): void {
    const notification = activeNotifications.get(orderId);
    if (notification) {
      notification.close();
      activeNotifications.delete(orderId);
    }
  }

  /**
   * Close all active notifications
   */
  closeAllNotifications(): void {
    activeNotifications.forEach((notification) => {
      notification.close();
    });
    activeNotifications.clear();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
