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
  paidCount: number;
  paidTotal: number;
  remainingCount: number;
  remainingTotal: number;
  overpaidTotal?: number;
}

export interface PaymentHistory {
  id: number;
  amount: number;
  paid_at: string;
  fullname: string;
  username: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
}

export const useAdminPayments = (month?: string) => {
  const { user } = useAuth();
  const [userPayments, setUserPayments] = useState<UserPaymentInfo[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const fetchUserPayments = async (loadMore: boolean = false) => {
    try {
      // Debounce: don't fetch more than once per 1 second
      const now = Date.now();
      if (now - lastUpdateTime < 1000) {
        console.log('⏱️  Debouncing payment fetch (too soon)');
        return;
      }
      setLastUpdateTime(now);

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      if (user?.role === 'admin') {
        const offset = loadMore ? userPayments.length : 0;
        const response = await paymentsAPI.getAll(currentMonth, 20, offset);
        
        // Handle response with pagination
        const data = response?.data || [];
        const paginationInfo = response?.pagination;
        
        if (loadMore) {
          setUserPayments(prev => [...prev, ...data]);
        } else {
          setUserPayments(data);
        }
        
        if (paginationInfo) {
          setPagination(paginationInfo);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải thông tin thanh toán';
      console.error('Fetch user payments error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      // Get full payment history (all months), not just current month
      const data = await paymentsAPI.getHistory();
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

  const loadMore = () => {
    if (pagination?.hasMore && !isLoadingMore) {
      fetchUserPayments(true);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUserPayments();
      fetchPaymentHistory();
      
      // Use polling with longer interval to reduce server load
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling admin payments...');
        fetchUserPayments();
        fetchPaymentHistory();
      }, 10000); // Poll every 10 seconds (reduced from 3 seconds)

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [user?.role, currentMonth]);

  return {
    userPayments,
    paymentHistory,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    markAsPaid,
    loadMore,
    refetch: () => {
      fetchUserPayments();
      fetchPaymentHistory();
    }
  };
};
