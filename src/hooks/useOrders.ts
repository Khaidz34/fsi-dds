import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface Order {
  id: number;
  ordered_by: number;
  ordered_for: number;
  user_id: number;
  price: number;
  date: string;
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
      // Don't add incomplete order to state, let the parent component refetch
      // setOrders(prev => [newOrder, ...prev]);
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
      // Update the order in local state
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
    if (user) {
      fetchOrders();
    }
  }, [user, language]);

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