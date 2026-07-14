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
  payerName?: string | null;
  payer_name?: string | null;
  transfer_description?: string | null;
  payment_code?: string | null;
  transaction_id?: string | null;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
}

export interface AutoPaymentUsage {
  supported: boolean;
  month: string;
  used: number;
  recordedUsed: number;
  providerOffset: number;
  providerUsed: number | null;
  providerSynced: boolean;
  providerSyncStatus?: string;
  providerSyncError?: string | null;
  providerDiagnostics?: {
    hasToken?: boolean;
    baseUrl?: string;
    query?: string;
    httpStatus?: number;
    responseStatus?: string;
    responsePreview?: string;
    responseKeys?: string[];
    countMethod?: string;
    dataCount?: number | null;
  } | null;
  usageSource: 'sepay-api' | 'local-plus-offset' | 'local';
  limit: number | null;
  remaining: number | null;
  usagePercent: number | null;
  completed: number;
  failed: number;
  ignored: number;
  processing: number;
}

export const useAdminPayments = (month?: string) => {
  const { user } = useAuth();
  const [userPayments, setUserPayments] = useState<UserPaymentInfo[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [autoPaymentUsage, setAutoPaymentUsage] = useState<AutoPaymentUsage | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const fetchUserPayments = async (loadMore: boolean = false, skipDebounce: boolean = false) => {
    try {
      // Debounce: don't fetch more than once per 1 second (unless skipDebounce is true)
      const now = Date.now();
      if (!skipDebounce && now - lastUpdateTime < 1000) {
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
        console.log('📡 Fetching payments from API, offset:', offset, 'skipDebounce:', skipDebounce);
        const response = await paymentsAPI.getAll(currentMonth, 20, offset);
        
        // Handle response with pagination
        const data = response?.data || [];
        const paginationInfo = response?.pagination;
        
        console.log('📊 Received', data.length, 'users with debt from API');
        
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

  const fetchAutoPaymentUsage = async () => {
    try {
      if (user?.role !== 'admin') {
        setAutoPaymentUsage(null);
        return;
      }

      const data = await paymentsAPI.getAutoUsage(currentMonth);
      setAutoPaymentUsage(data);
    } catch (err) {
      console.error('Fetch auto payment usage error:', err);
      setAutoPaymentUsage(null);
    }
  };

  const markAsPaid = async (userId: number, amount: number) => {
    try {
      console.log('🔄 markAsPaid called for user:', userId, 'amount:', amount);
      setIsLoading(true);
      await paymentsAPI.markPaid(userId, currentMonth, amount);
      console.log('✅ Payment marked successfully, refreshing data...');
      // Refresh data after marking as paid - skip debounce to ensure immediate update
      await fetchUserPayments(false, true);
      await fetchPaymentHistory();
      await fetchAutoPaymentUsage();
      console.log('✅ Data refreshed, new userPayments count:', userPayments.length);
      return true;
    } catch (err) {
      console.error('❌ Mark as paid error:', err);
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
      fetchAutoPaymentUsage();
      
      // Use polling with longer interval to reduce server load
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling admin payments...');
        fetchUserPayments();
        fetchPaymentHistory();
        fetchAutoPaymentUsage();
      }, 10000); // Poll every 10 seconds (reduced from 3 seconds)

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [user?.role, currentMonth]);

  return {
    userPayments,
    paymentHistory,
    autoPaymentUsage,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    markAsPaid,
    loadMore,
    refetch: () => {
      fetchUserPayments();
      fetchPaymentHistory();
      fetchAutoPaymentUsage();
    }
  };
};
