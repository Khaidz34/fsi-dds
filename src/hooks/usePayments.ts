import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPaymentStats = useCallback(async (isInitial: boolean = false, isSilent: boolean = false) => {
    try {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (isInitial) {
        setIsLoading(true);
      } else if (!isSilent) {
        setIsRefreshing(true);
      }
      setError(null);
      
      if (user?.role === 'admin') {
        const response = await paymentsAPI.getAll(month);

        if (response?.summary) {
          const summary = response.summary;
          setPaymentStats({
            month: month || new Date().toISOString().slice(0, 7),
            ordersCount: Number(summary.ordersCount) || 0,
            ordersTotal: Number(summary.ordersTotal) || 0,
            paidCount: Number(summary.paidCount) || 0,
            paidTotal: Number(summary.paidTotal) || 0,
            remainingCount: Math.max(0, Number(summary.remainingCount) || 0),
            remainingTotal: Math.max(0, Number(summary.remainingTotal) || 0),
            overpaidTotal: Number(summary.overpaidTotal) || 0
          });
          return;
        }

        const data = Array.isArray(response) ? response : response?.data || [];
        
        const totalStats = data.reduce((acc: any, curr: any) => ({
          month: month || new Date().toISOString().slice(0, 7),
          ordersCount: acc.ordersCount + (Number(curr.ordersCount) || 0),
          ordersTotal: acc.ordersTotal + (Number(curr.ordersTotal) || 0),
          paidCount: acc.paidCount + (Number(curr.paidCount) || 0),
          paidTotal: acc.paidTotal + (Number(curr.paidTotal) || 0),
          remainingCount: acc.remainingCount + (Number(curr.remainingCount) || 0),
          remainingTotal: acc.remainingTotal + (Number(curr.remainingTotal) || 0),
          overpaidTotal: acc.overpaidTotal + (Number(curr.overpaidTotal) || 0)
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
      if (isInitial) {
        setIsLoading(false);
      } else if (!isSilent) {
        setIsRefreshing(false);
      }
    }
  }, [month, user?.role]);

  const refetch = useCallback(() => fetchPaymentStats(false, false), [fetchPaymentStats]);

  useEffect(() => {
    if (user?.id) {
      // Fetch initial
      fetchPaymentStats(true, false);

      // Realtime subscription for payments table (silent update)
      const paymentsChannelName = `payments_stats_${user.role}_${user.id}`;
      const paymentsSubscription = subscribeToTable('payments', () => {
        console.log('💰 Realtime: Payment update detected, updating stats silently...');
        fetchPaymentStats(false, true);
      }, paymentsChannelName);

      // Realtime subscription for orders table (silent update)
      const ordersChannelName = `orders_stats_${user.role}_${user.id}`;
      const ordersSubscription = subscribeToTable('orders', () => {
        console.log('📦 Realtime: Order update detected, updating stats silently...');
        fetchPaymentStats(false, true);
      }, ordersChannelName);

      return () => {
        unsubscribeFromTable(paymentsSubscription);
        unsubscribeFromTable(ordersSubscription);
      };
    }
  }, [user?.id, user?.role, fetchPaymentStats]);

  return {
    paymentStats,
    isLoading,
    isRefreshing,
    error,
    refetch
  };
};