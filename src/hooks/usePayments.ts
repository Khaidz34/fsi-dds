import { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentStats = async () => {
    try {
      setIsLoading(true);
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
        // Recalculate remainingCount based on total remaining amount (40,000đ per order)
        const orderPrice = 40000;
        totalStats.remainingCount = totalStats.remainingTotal > 0 ? Math.ceil(totalStats.remainingTotal / orderPrice) : 0;
        
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPaymentStats();
      
      // Setup real-time for all users (both admin and regular)
      realtimeManager.connect({
        userId: user.id,
        onUpdate: () => {
          console.log('💰 Real-time update received, refetching payment stats');
          fetchPaymentStats();
        },
        onError: (error) => {
          console.error('Real-time error:', error);
        },
        onModeChange: (mode) => {
          console.log(`📡 Real-time mode changed to: ${mode}`);
        }
      });

      return () => {
        realtimeManager.disconnect();
      };
    }
  }, [user?.id, month]);

  return {
    paymentStats,
    isLoading,
    error,
    refetch: fetchPaymentStats
  };
};
