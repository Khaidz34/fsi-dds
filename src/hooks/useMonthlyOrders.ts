import { useState, useEffect } from 'react';
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

export const useMonthlyOrders = (month: string) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (isSilent: boolean = false) => {
    try {
      if (!isSilent) {
        setIsLoading(true);
      }
      setError(null);
      const data = await ordersAPI.getAll();
      const filteredData = data.filter(order => 
        order.created_at && order.created_at.startsWith(month)
      );
      setOrders(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders(false);

    // Setup realtime subscription to orders table (silent updates)
    const ordersChannel = subscribeToTable('orders', () => {
      console.log('📦 Realtime: Order update received in monthly orders, refreshing silently...');
      fetchOrders(true);
    }, 'monthly_orders_realtime');

    // Silent fallback poll every 30 seconds
    const fallbackPoll = setInterval(() => {
      fetchOrders(true);
    }, 30000);

    return () => {
      clearInterval(fallbackPoll);
      unsubscribeFromTable(ordersChannel);
    };
  }, [month, user?.role]);

  return {
    orders,
    isLoading,
    error,
    refetch: () => fetchOrders(false)
  };
};