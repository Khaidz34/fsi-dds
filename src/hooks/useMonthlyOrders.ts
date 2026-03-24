import { useState, useEffect, useRef } from 'react';
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get all orders (not just today)
      const data = await ordersAPI.getAll();
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
    
    // Only setup polling for admin users
    if (user?.role === 'admin') {
      // Poll for new orders every 3 seconds
      pollIntervalRef.current = setInterval(() => {
        fetchOrders();
      }, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
    // For regular users, no auto refresh - data only updates on manual refetch
  }, [month, user?.role]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders
  };
};
