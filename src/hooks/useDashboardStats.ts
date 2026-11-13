import { useState, useEffect, useCallback } from 'react';
import { statsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

export interface DashboardStats {
  ordersToday: number;
  totalUsers: number;
  popularDishesCount: number;
  popularDishes: Array<{ name: string; orderCount: number }>;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setError(null);
      const data = await statsAPI.getAdminDashboard();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thống kê');
      setStats(prev => prev || {
        ordersToday: 0,
        totalUsers: 0,
        popularDishesCount: 0,
        popularDishes: []
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats(false);
      
      // Listen to app-wide order update events (SSE & local changes)
      const handleAppOrderUpdate = () => {
        console.log('📊 Live order update event received in useDashboardStats, refreshing silently...');
        fetchStats(true);
      };
      window.addEventListener('app:order-update', handleAppOrderUpdate);

      // Setup Supabase Realtime subscription for stats (silent update, no flicker)
      const channel = subscribeToTable('orders', () => {
        console.log('📊 Stats update detected via Realtime');
        fetchStats(true);
      }, 'stats_changes');

      return () => {
        window.removeEventListener('app:order-update', handleAppOrderUpdate);
        unsubscribeFromTable(channel);
      };
    }
  }, [user?.role, fetchStats]);

  return {
    stats,
    isLoading: isLoading && !stats,
    error,
    refetch: (isSilent = true) => fetchStats(isSilent)
  };
};
