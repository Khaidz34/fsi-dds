import { useState, useEffect } from 'react';
import { statsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
      // Fallback to empty data instead of mock data
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
      
      // Auto refresh every 5 seconds for faster updates
      const interval = setInterval(() => {
        fetchStats();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};