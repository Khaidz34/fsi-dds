import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

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
      
      // Auto-refresh every 5 seconds as fallback
      const interval = setInterval(() => {
        fetchUserPayments();
        fetchPaymentHistory();
      }, 5000);
      
      // Setup Supabase Realtime subscriptions
      const paymentsChannel = subscribeToTable('payments', () => {
        fetchUserPayments();
        fetchPaymentHistory();
      }, 'admin_payments');
      
      const ordersChannel = subscribeToTable('orders', fetchUserPayments, 'admin_orders');

      return () => {
        clearInterval(interval);
        unsubscribeFromTable(paymentsChannel);
        unsubscribeFromTable(ordersChannel);
      };
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
