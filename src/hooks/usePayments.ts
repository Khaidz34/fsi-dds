import { useState, useEffect, useRef } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';
import { realtimeManager } from '../services/realtime';

export interface PaymentStats {
  month: string;
  ordersCount: number;
  ordersTotal: number;
  paidCount: number;
  paidTotal: number;
  remainingCount: number;
  remainingTotal: number;
  overpaidTotal?: number;
  paidAt?: string;
}

export const usePayments = (month?: string) => {
  const { user } = useAuth();
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPaymentStats = async () => {
    try {
      // Clear any pending fetch
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      setIsRefreshing(true);
      setError(null);
      
      if (user?.role === 'admin') {
        const response = await paymentsAPI.getAll(month);
        // Handle both old format (array) and new format (object with data property)
        const data = Array.isArray(response) ? response : response?.data || [];
        
        const totalStats = data.reduce((acc, curr) => ({
          month: month || new Date().toISOString().slice(0, 7),
          ordersCount: acc.ordersCount + curr.ordersCount,
          ordersTotal: acc.ordersTotal + curr.ordersTotal,
          paidCount: acc.paidCount + curr.paidCount,
          paidTotal: acc.paidTotal + curr.paidTotal,
          remainingCount: acc.remainingCount + curr.remainingCount,
          remainingTotal: acc.remainingTotal + curr.remainingTotal,
          overpaidTotal: acc.overpaidTotal + (curr.overpaidTotal || 0)
        }), {
          month: month || new Date().toISOString().slice(0, 7),
          ordersCount: 0,
          ordersTotal: 0,
          paidCount: 0,
          paidTotal: 0,
          remainingCount: 0,
          remainingTotal: 0,
          overpaidTotal: 0
        });
        
        totalStats.remainingTotal = Math.max(0, totalStats.remainingTotal);
        totalStats.remainingCount = Math.max(0, totalStats.remainingCount);
        
        setPaymentStats(totalStats);
      } else {
        const response = await paymentsAPI.getMy(month);
        // Handle both old format (object) and new format (object with data property)
        const data = response?.data ? response.data[0] : response;
        setPaymentStats(data);
      }
    } catch (err) {
      console.error('Payment stats error:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin thanh toán');
      setPaymentStats({
        month: month || new Date().toISOString().slice(0, 7),
        ordersCount: 0,
        ordersTotal: 0,
        paidCount: 0,
        paidTotal: 0,
        remainingCount: 0,
        remainingTotal: 0
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      const initialFetch = async () => {
        await fetchPaymentStats();
        setIsLoading(false);
      };
      
      initialFetch();
      
      // Setup real-time for all users (both admin and regular)
      // Always try to connect to SSE, even if polling is running
      realtimeManager.connect({
        userId: user.id,
        onUpdate: (update) => {
          console.log('💰 Real-time update received:', update.type);
          // Refresh payment stats on order or payment changes
          if (update.type === 'order_created' || update.type === 'order_updated' || update.type === 'order_deleted' || update.type === 'payment_marked') {
            fetchPaymentStats();
          }
        },
        onError: (error) => {
          console.error('Real-time error:', error);
        },
        onModeChange: (mode) => {
          console.log(`📡 Real-time mode changed to: ${mode}`);
        }
      });

      return () => {
        // Don't disconnect here - let it persist across month changes
        // realtimeManager.disconnect();
      };
    }
  }, [user?.id]);

  // Separate effect for month changes - just refetch data
  useEffect(() => {
    if (user?.id) {
      fetchPaymentStats();
    }
  }, [month]);

  return {
    paymentStats,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchPaymentStats
  };
};
