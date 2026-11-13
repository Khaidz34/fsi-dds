import { useState, useEffect, useCallback, useRef } from 'react';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

export const useOrders = (language?: string) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;

  const fetchOrders = useCallback(async (silent: boolean = false) => {
    try {
      if (ordersRef.current.length === 0) {
        setIsLoading(true);
      } else if (!silent) {
        setIsUpdating(true);
      }
      setError(null);
      // Backend /api/orders/all automatically filters: admin gets all orders, normal user gets only their orders + orders placed for them
      const data = await ordersAPI.getAll(language);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [language]);

  const refetch = useCallback(() => fetchOrders(false), [fetchOrders]);

  const createOrder = async (orderData: {
    dish1Id: number;
    dish2Id?: number;
    orderedFor: number;
    notes?: string;
    rating?: number;
  }) => {
    try {
      const response = await ordersAPI.create(orderData);
      // Fetch fresh orders silently in background without blocking UI
      fetchOrders(true);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateOrder = async (id: number, orderData: {
    dish1Id: number;
    dish2Id?: number;
    notes?: string;
    rating?: number;
  }) => {
    try {
      const response = await ordersAPI.update(id, orderData);
      setOrders(prev => prev.map(order => 
        order.id === id 
          ? { ...order, ...response.order }
          : order
      ));
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteOrder = async (id: number) => {
    try {
      await ordersAPI.delete(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      window.dispatchEvent(new CustomEvent('app:order-update'));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
      
      const handleAppOrderUpdate = () => {
        console.log('📦 Live order update event received in useOrders, refreshing silently...');
        fetchOrders(true);
      };
      window.addEventListener('app:order-update', handleAppOrderUpdate);

      // Setup Supabase Realtime subscription for orders
      const channel = subscribeToTable('orders', () => {
        console.log('📦 Order update detected via Realtime');
        fetchOrders(false);
      }, `orders_realtime_${user.role}_${user.id}`);

      return () => {
        window.removeEventListener('app:order-update', handleAppOrderUpdate);
        unsubscribeFromTable(channel);
      };
    }
  }, [user?.id, user?.role, fetchOrders]);

  return {
    orders,
    isLoading,
    isUpdating,
    error,
    refetch,
    createOrder,
    updateOrder,
    deleteOrder
  };
};
