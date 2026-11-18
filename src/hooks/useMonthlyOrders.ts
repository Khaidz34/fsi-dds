import { useState, useEffect, useCallback } from 'react';
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

// Per-(user, month) cache so switching months is instant and older months are never truncated by the 1,000-row PostgREST cap
const monthlyOrdersCache = new Map<string, Order[]>();
const inFlightByKey = new Map<string, Promise<Order[]>>();
const monthListeners = new Map<string, Set<(orders: Order[]) => void>>();

const notifyMonthListeners = (cacheKey: string, orders: Order[]) => {
  const set = monthListeners.get(cacheKey);
  if (!set) return;
  set.forEach(listener => {
    try {
      listener(orders);
    } catch (e) {
      console.error('Error notifying orders listener:', e);
    }
  });
};

export const useMonthlyOrders = (month: string) => {
  const { user } = useAuth();
  const safeMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : '';
  const cacheKey = user?.id ? `${user.id}:${safeMonth || 'all'}` : '';

  const [orders, setOrders] = useState<Order[]>(() => (cacheKey ? monthlyOrdersCache.get(cacheKey) || [] : []));
  const [isLoading, setIsLoading] = useState(() => (cacheKey ? !monthlyOrdersCache.has(cacheKey) : false));
  const [error, setError] = useState<string | null>(null);

  // Sync local state immediately whenever cacheKey changes (e.g. user switches month)
  useEffect(() => {
    if (!cacheKey) return;
    const cached = monthlyOrdersCache.get(cacheKey);
    if (cached) {
      setOrders(cached);
      setIsLoading(false);
    } else {
      setOrders([]);
      setIsLoading(true);
    }
  }, [cacheKey]);

  // Subscribe to cache updates for this specific (user, month)
  useEffect(() => {
    if (!cacheKey) return;
    const handleUpdate = (newOrders: Order[]) => {
      setOrders(newOrders);
      setIsLoading(false);
    };
    if (!monthListeners.has(cacheKey)) {
      monthListeners.set(cacheKey, new Set());
    }
    monthListeners.get(cacheKey)!.add(handleUpdate);
    return () => {
      const set = monthListeners.get(cacheKey);
      if (set) {
        set.delete(handleUpdate);
        if (set.size === 0) monthListeners.delete(cacheKey);
      }
    };
  }, [cacheKey]);

  const loadMonthOrders = useCallback(async (isSilent: boolean = false, forceRefresh: boolean = false) => {
    if (!cacheKey) return;
    try {
      if (!isSilent && !monthlyOrdersCache.has(cacheKey)) {
        setIsLoading(true);
      }
      setError(null);

      let promise = !forceRefresh ? inFlightByKey.get(cacheKey) : undefined;
      if (!promise) {
        promise = ordersAPI.getAll(undefined, safeMonth || undefined).finally(() => {
          inFlightByKey.delete(cacheKey);
        });
        inFlightByKey.set(cacheKey, promise);
      }

      const data = await promise;
      const validData = Array.isArray(data) ? data : [];
      monthlyOrdersCache.set(cacheKey, validData);
      notifyMonthListeners(cacheKey, validData);
      setOrders(validData);
    } catch (err) {
      console.error('Error loading orders in useMonthlyOrders:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, safeMonth]);

  // Fetch when user or selected month changes
  useEffect(() => {
    if (user?.id && cacheKey) {
      loadMonthOrders(monthlyOrdersCache.has(cacheKey));

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleSilentRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadMonthOrders(true, true);
        }, 300);
      };

      window.addEventListener('app:order-update', scheduleSilentRefresh);

      const channelName = `realtime_monthly_orders_${user.id}_${safeMonth || 'all'}`;
      const channel = subscribeToTable('orders', scheduleSilentRefresh, channelName);

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        window.removeEventListener('app:order-update', scheduleSilentRefresh);
        unsubscribeFromTable(channel);
      };
    }
  }, [user?.id, cacheKey, safeMonth, loadMonthOrders]);

  return {
    orders,
    allOrders: orders,
    isLoading: isLoading && orders.length === 0,
    error,
    refetch: () => loadMonthOrders(false, true)
  };
};
