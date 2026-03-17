import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Language } from '../types';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

export interface MenuDish {
  id: number;
  name: string;
  name_vi: string;
  name_en: string;
  name_ja: string;
  sort_order: number;
}

export interface TodayMenu {
  id?: number;
  date: string;
  imageUrl: string;
  dishes: MenuDish[];
}

export const useMenu = (language?: Language) => {
  const [menu, setMenu] = useState<TodayMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = async (lang?: Language) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await menuAPI.getToday(lang || language);
      setMenu(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải menu');
    } finally {
      setIsLoading(false);
    }
  };

  const createMenu = async (dishes: string[], imageUrl?: string) => {
    try {
      const newMenu = await menuAPI.create(dishes, imageUrl);
      setMenu(newMenu);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  const createMultilingualMenu = async (dishes: Array<{vi: string, en?: string, ja?: string}>, imageUrl?: string) => {
    try {
      const newMenu = await menuAPI.createMultilingual(dishes, imageUrl);
      await fetchMenu(language);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchMenu(language);
    
    // Auto-refresh every 5 seconds as fallback
    const interval = setInterval(() => {
      fetchMenu(language);
    }, 5000);
    
    // Setup Supabase Realtime subscription for menu changes
    const channel = subscribeToTable('menus', () => fetchMenu(language), 'menu_changes');

    return () => {
      clearInterval(interval);
      unsubscribeFromTable(channel);
    };
  }, [language]);

  return {
    menu,
    isLoading,
    error,
    refetch: fetchMenu,
    createMenu,
    createMultilingualMenu
  };
};
