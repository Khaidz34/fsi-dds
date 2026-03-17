import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
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

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

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

      // Subscribe to realtime changes on payments table
      const channel = supabase
        .channel('payments-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments'
          },
          (payload) => {
            console.log('📡 Realtime payment update:', payload);
            fetchUserPayments();
            fetchPaymentHistory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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