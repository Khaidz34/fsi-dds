import { useState, useEffect } from 'react';
import { statsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

export interface DashboardStats {
  ordersToday: number;
  totalUsers: number;
  popularDishesCount: number;
  popularDishes: Array<{ name: string; orderCount: number }>;
}

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
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
      
      // Setup Supabase Realtime subscription for stats
      if (supabaseClient) {
        const subscription = supabaseClient
          .channel('stats_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            fetchStats();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Dashboard stats realtime subscription active');
            }
          });

        return () => {
          subscription.unsubscribe();
        };
      }
    }
  }, [user?.role]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};
