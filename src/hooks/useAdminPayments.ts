import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';
import { realtimeManager } from '../services/realtime';

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
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const fetchUserPayments = async () => {
    try {
      // Debounce: don't fetch more than once per 2 seconds
      const now = Date.now();
      if (now - lastUpdateTime < 2000) {
        console.log('⏱️  Debouncing payment fetch (too soon)');
        return;
      }
      setLastUpdateTime(now);

      setIsLoading(true);
      setError(null);
      
      if (user?.role === 'admin') {
        const response = await paymentsAPI.getAll(currentMonth);
        // Handle both old format (array) and new format (object with data property)
        const data = Array.isArray(response) ? response : response?.data || [];
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
      
      // Use real-time manager for admin users
      realtimeManager.connect({
        userId: user.id,
        onUpdate: () => {
          console.log('💰 Real-time update received, refetching admin payments');
          fetchUserPayments();
          fetchPaymentHistory();
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
