import { useState, useEffect, useMemo, useCallback } from 'react';
import { ordersAPI } from '../services/api';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Order {
  id: number;
  ordered_by: number;
  ordered_for: number;
  user_id: number;
  price: number;
  notes?: string;
  rating?: number;
  created_at: string;
  paid?: boolean;
  dish1?: { id: number; name: string; sort_order: number };
  dish2?: { id: number; name: string; sort_order: number };
  orderer?: { id: number; fullname: string };
  receiver?: { id: number; fullname: string };
}

// Global in-memory cache shared across components and month switches
let cachedAllOrders: Order[] | null = null;
let fetchPromise: Promise<Order[]> | null = null;
const listeners = new Set<(orders: Order[]) => void>();

const notifyListeners = (orders: Order[]) => {
  listeners.forEach(listener => {
    try {
      listener(orders);
    } catch (e) {
      console.error('Error notifying orders listener:', e);
    }
  });
};

export const useMonthlyOrders = (month: string) => {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>(() => cachedAllOrders || []);
  const [isLoading, setIsLoading] = useState(() => !cachedAllOrders);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to changes from the global cache
  useEffect(() => {
    const handleUpdate = (newOrders: Order[]) => {
      setAllOrders(newOrders);
      setIsLoading(false);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const loadAllOrders = useCallback(async (isSilent: boolean = false) => {
    try {
      if (!isSilent && !cachedAllOrders) {
        setIsLoading(true);
      }
      setError(null);

      if (!fetchPromise) {
        fetchPromise = ordersAPI.getAll().finally(() => {
          fetchPromise = null;
        });
      }

      const data = await fetchPromise;
      const validData = Array.isArray(data) ? data : [];
      cachedAllOrders = validData;
      notifyListeners(validData);
      setAllOrders(validData);
    } catch (err) {
      console.error('Error loading orders in useMonthlyOrders:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once on mount or when user changes
  useEffect(() => {
    if (user?.id) {
      loadAllOrders(!!cachedAllOrders);

      // Subscribe to realtime orders table once per user
      const channelName = `realtime_monthly_orders_${user.id}`;
      const channel = subscribeToTable('orders', () => {
        console.log('📦 Realtime: Order update received, refreshing global cache silently...');
        loadAllOrders(true);
      }, channelName);

      return () => {
        unsubscribeFromTable(channel);
      };
    }
  }, [user?.id, loadAllOrders]);

  // Instant in-memory filter by month - ZERO LATENCY, NO RACE CONDITIONS!
  const orders = useMemo(() => {
    if (!month) return allOrders;
    return allOrders.filter(order => 
      order.created_at && order.created_at.startsWith(month)
    );
  }, [allOrders, month]);

  return {
    orders,
    allOrders,
    isLoading: isLoading && allOrders.length === 0,
    error,
    refetch: () => loadAllOrders(false)
  };
};
