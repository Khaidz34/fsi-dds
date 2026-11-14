/**
 * useNotifications Hook
 * 
 * Integrates NotificationService with SSE events to display desktop notifications
 * for new orders. Handles role-based filtering and permission management.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSSE, SSEOrderData } from './useSSE';
import { notificationService, Language, OrderNotificationData } from '../services/notificationService';

interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin' | 'staff';
}

interface UseNotificationsReturn {
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<void>;
  isSupported: boolean;
  isConnected: boolean;
  latestNotification: OrderNotificationData | null;
  clearLatestNotification: () => void;
}

export function useNotifications(
  user: User | null,
  token: string | null,
  language: Language,
  onNavigateToOrders?: () => void,
  onOrderUpdate?: () => void
): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [latestNotification, setLatestNotification] = useState<OrderNotificationData | null>(null);
  const isSupported = notificationService.isBrowserSupported();

  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  // Check if user should receive notifications (admin or staff only)
  const shouldReceiveNotifications = user && (user.role === 'admin' || user.role === 'staff');

  // Request permission on mount for admin/staff users
  useEffect(() => {
    if (shouldReceiveNotifications && isSupported) {
      const currentPermission = notificationService.getPermissionStatus();
      setPermissionStatus(currentPermission);

      // Auto-request permission if not yet decided
      if (currentPermission === 'default') {
        console.log('📢 Auto-requesting notification permission for', user.role);
        notificationService.requestPermission().then((permission) => {
          setPermissionStatus(permission);
        });
      }
    }
  }, [shouldReceiveNotifications, isSupported, user?.role]);

  // Manual permission request function
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Cannot request permission: notifications not supported');
      return;
    }

    const permission = await notificationService.requestPermission();
    setPermissionStatus(permission);
  }, [isSupported]);

  // Handle order created events
  const handleOrderCreated = useCallback(
    async (data: SSEOrderData) => {
      // Only show notifications for admin/staff users
      if (!shouldReceiveNotifications) {
        console.log('Skipping notification: user role is not admin/staff');
        return;
      }

      try {
        console.log('📬 Processing order notification:', data);

        // Extract dish names based on current language
        const dishNames: string[] = [];
        
        if (language === 'vi') {
          if (data.data.dish1Name) dishNames.push(data.data.dish1Name);
          if (data.data.dish2Name) dishNames.push(data.data.dish2Name);
        } else if (language === 'en') {
          if (data.data.dish1NameEn) dishNames.push(data.data.dish1NameEn);
          if (data.data.dish2NameEn) dishNames.push(data.data.dish2NameEn);
        } else if (language === 'ja') {
          if (data.data.dish1NameJa) dishNames.push(data.data.dish1NameJa);
          if (data.data.dish2NameJa) dishNames.push(data.data.dish2NameJa);
        }

        // If dish names not in SSE payload, use fallback
        if (dishNames.length === 0) {
          console.warn('Dish names not in SSE payload, using fallback');
          dishNames.push('Order #' + data.data.orderId);
        }

        // Get customer name from SSE data or use fallback
        const customerName = data.data.customerName || 'Customer';

        // Create notification data
        const notificationData: OrderNotificationData = {
          orderId: data.data.orderId,
          dishNames,
          customerName,
          timestamp: new Date(data.data.timestamp),
          language,
        };

        // Always play gentle audio chime for new orders
        notificationService.playOrderChime();

        // Update in-app floating banner state
        setLatestNotification(notificationData);
        setTimeout(() => {
          setLatestNotification(prev => prev?.orderId === notificationData.orderId ? null : prev);
        }, 8000);

        // Display desktop notification if permission granted
        if (permissionStatus === 'granted') {
          notificationService.showOrderNotification(notificationData, onNavigateToOrders);
        }

        // Trigger live refresh in app
        if (onOrderUpdate) {
          onOrderUpdate();
        }
      } catch (error) {
        console.error('Error processing order notification:', error);
        // Continue operation despite error
      }
    },
    [shouldReceiveNotifications, permissionStatus, language, onNavigateToOrders, onOrderUpdate]
  );

  // Establish SSE connection
  const { isConnected } = useSSE(user?.id || null, token, {
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: () => {
      if (onOrderUpdate) onOrderUpdate();
    },
    onOrderDeleted: () => {
      if (onOrderUpdate) onOrderUpdate();
    },
    onPaymentMarked: () => {
      if (onOrderUpdate) onOrderUpdate();
    },
    onError: (error) => {
      console.error('SSE error in useNotifications:', error);
    },
  });

  return {
    permissionStatus,
    requestPermission,
    isSupported,
    isConnected,
    latestNotification,
    clearLatestNotification
  };
}
