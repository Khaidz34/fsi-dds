import { useState, useEffect } from 'react';
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

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await statsAPI.getAdminDashboard();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thống kê');
      setStats({
        ordersToday: 0,
        totalUsers: 0,
        popularDishesCount: 0,
        popularDishes: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
      
      // Auto-refresh every 5 seconds as fallback
      const interval = setInterval(() => {
        fetchStats();
      }, 5000);
      
      // Setup Supabase Realtime subscription for stats
      const channel = subscribeToTable('orders', fetchStats, 'stats_changes');

      return () => {
        clearInterval(interval);
        unsubscribeFromTable(channel);
      };
    }
  }, [user?.role]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};
