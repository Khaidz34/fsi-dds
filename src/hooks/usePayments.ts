import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

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
        const data = await paymentsAPI.getAll(month);
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
        const data = await paymentsAPI.getMy(month);
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
      
      // Setup Supabase Realtime subscription for payments
      const paymentsChannel = subscribeToTable('payments', () => {
        console.log('💰 Payment update detected via Realtime');
        fetchPaymentStats();
      }, 'user_payments');
      
      const ordersChannel = subscribeToTable('orders', () => {
        console.log('📦 Order update detected via Realtime');
        fetchPaymentStats();
      }, 'user_orders');

      return () => {
        unsubscribeFromTable(paymentsChannel);
        unsubscribeFromTable(ordersChannel);
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
