import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
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
      if (supabaseClient) {
        const subscription = supabaseClient
          .channel('payments_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
            // Refetch payments when any changes occur
            fetchPaymentStats();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Payments realtime subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Payments subscription error');
            }
          });

        return () => {
          subscription.unsubscribe();
        };
      }
    }
  }, [user?.id, month]);

  return {
    paymentStats,
    isLoading,
    error,
    refetch: fetchPaymentStats
  };
};
