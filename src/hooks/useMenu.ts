import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Language } from '../types';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';
import { cacheService, debounce } from '../services/cache';

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
      
      // Check cache first
      const cacheKey = `menu_${lang || language}`;
      const cachedMenu = cacheService.get<TodayMenu>(cacheKey);
      if (cachedMenu) {
        setMenu(cachedMenu);
        setIsLoading(false);
        return;
      }
      
      const data = await menuAPI.getToday(lang || language);
      setMenu(data);
      
      // Cache for 5 minutes
      cacheService.set(cacheKey, data, 300);
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
      // Clear cache on mutation
      cacheService.clear(`menu_${language}`);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  const createMultilingualMenu = async (dishes: Array<{vi: string, en?: string, ja?: string}>, imageUrl?: string) => {
    try {
      const newMenu = await menuAPI.createMultilingual(dishes, imageUrl);
      await fetchMenu(language);
      // Clear cache on mutation
      cacheService.clear(`menu_${language}`);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  // Debounce refetch to prevent duplicate requests
  const debouncedFetch = debounce(() => fetchMenu(language), 100);

  useEffect(() => {
    fetchMenu(language);
    
    // Setup Supabase Realtime subscription for menu changes
    const channel = subscribeToTable('menus', debouncedFetch, 'menu_changes');

    return () => {
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
