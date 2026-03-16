import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin thanh toán');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const data = await paymentsAPI.getHistory(currentMonth);
      setPaymentHistory(data);
    } catch (err) {
      console.error('Error fetching payment history:', err);
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
      
      // Auto refresh every 30 seconds for admin
      const interval = setInterval(() => {
        fetchUserPayments();
        fetchPaymentHistory();
      }, 30000);
      
      return () => clearInterval(interval);
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