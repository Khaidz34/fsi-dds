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
      
      let refreshTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleSilentRefresh = () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          fetchStats(true);
        }, 300);
      };

      window.addEventListener('app:order-update', scheduleSilentRefresh);
      const channel = subscribeToTable('orders', scheduleSilentRefresh, 'stats_changes');

      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        window.removeEventListener('app:order-update', scheduleSilentRefresh);
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
