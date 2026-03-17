import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface PaymentStats {
  month: string;
  ordersCount: number;
  ordersTotal: number;
  paidCount: number;
  paidTotal: number;
  remainingCount: number;
  remainingTotal: number;
  overpaidTotal?: number; // Số tiền thanh toán thừa
  paidAt?: string;
}

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        // Admin xem tất cả payments
        const data = await paymentsAPI.getAll(month);
        // Tính tổng stats từ tất cả users
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
        
        // Ensure remaining total is never negative
        totalStats.remainingTotal = Math.max(0, totalStats.remainingTotal);
        totalStats.remainingCount = Math.max(0, totalStats.remainingCount);
        
        setPaymentStats(totalStats);
      } else {
        // User xem payment của mình
        const data = await paymentsAPI.getMy(month);
        setPaymentStats(data);
      }
    } catch (err) {
      console.error('Payment stats error:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin thanh toán');
      // Set empty stats instead of mock data
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

      // Subscribe to realtime changes on payments and orders tables
      const channel = supabase
        .channel('payments-stats-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments'
          },
          (payload) => {
            console.log('📡 Realtime payment stats update:', payload);
            fetchPaymentStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('📡 Realtime order stats update:', payload);
            fetchPaymentStats();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
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