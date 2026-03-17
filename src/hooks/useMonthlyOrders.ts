import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

export interface Order {
  id: number;
  ordered_by: number;
  ordered_for: number;
  user_id: number;
  price: number;
  notes?: string;
  rating?: number;
  created_at: string;
  dish1?: { id: number; name: string; sort_order: number };
  dish2?: { id: number; name: string; sort_order: number };
  orderer?: { id: number; fullname: string };
  receiver?: { id: number; fullname: string };
}

export const useMonthlyOrders = (month: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get all orders for the month
      const data = await ordersAPI.getToday();
      // Filter by month
      const filteredData = data.filter(order => 
        order.created_at && order.created_at.startsWith(month)
      );
      setOrders(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Setup Supabase Realtime subscription for orders
    const channel = subscribeToTable('orders', () => {
      console.log('📦 Monthly orders update detected via Realtime');
      fetchOrders();
    }, `monthly_orders_${month}`);

    return () => {
      unsubscribeFromTable(channel);
    };
  }, [month]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders
  };
};
