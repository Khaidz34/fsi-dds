import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ordersAPI } from '../services/api';
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

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

export const useOrders = (language?: string) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ordersAPI.getToday(language);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng');
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (orderData: {
    dish1Id: number;
    dish2Id?: number;
    orderedFor: number;
    notes?: string;
    rating?: number;
  }) => {
    try {
      const response = await ordersAPI.create(orderData);
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
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchOrders();

      // Subscribe to realtime changes on orders table
      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('📡 Realtime order update:', payload);
            // Refetch orders when any change occurs
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, language]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder
  };
};