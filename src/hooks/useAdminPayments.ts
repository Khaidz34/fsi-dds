import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

export interface UserPaymentInfo {
  userId: number;
  fullname: string;
  username: string;
  month: string;
  ordersCount: number;
  ordersTotal: number;
  paidTotal: number;
  remainingTotal: number;
}

export interface PaymentHistory {
  id: number;
  amount: number;
  paid_at: string;
  fullname: string;
  username: string;
}

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

export const useAdminPayments = (month?: string) => {
  const { user } = useAuth();
  const [userPayments, setUserPayments] = useState<UserPaymentInfo[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const fetchUserPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (user?.role === 'admin') {
        const data = await paymentsAPI.getAll(currentMonth);
        setUserPayments(data);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải thông tin thanh toán';
      console.error('Fetch user payments error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const data = await paymentsAPI.getHistory(currentMonth);
      setPaymentHistory(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải lịch sử thanh toán';
      console.error('Fetch payment history error:', errorMsg);
    }
  };

  const markAsPaid = async (userId: number, amount: number) => {
    try {
      setIsLoading(true);
      await paymentsAPI.markPaid(userId, currentMonth, amount);
      // Refresh data after marking as paid
      await fetchUserPayments();
      await fetchPaymentHistory();
      return true;
    } catch (err) {
      console.error('Mark as paid error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUserPayments();
      fetchPaymentHistory();
      
      // Setup Supabase Realtime subscriptions
      if (supabaseClient) {
        const paymentsSubscription = supabaseClient
          .channel('admin_payments_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
            fetchUserPayments();
            fetchPaymentHistory();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Admin payments realtime subscription active');
            }
          });

        const ordersSubscription = supabaseClient
          .channel('admin_orders_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            fetchUserPayments();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Admin orders realtime subscription active');
            }
          });

        return () => {
          paymentsSubscription.unsubscribe();
          ordersSubscription.unsubscribe();
        };
      }
    }
  }, [user?.role, currentMonth]);

  return {
    userPayments,
    paymentHistory,
    isLoading,
    error,
    markAsPaid,
    refetch: () => {
      fetchUserPayments();
      fetchPaymentHistory();
    }
  };
};
