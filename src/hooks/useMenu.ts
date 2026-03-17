import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Language } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface MenuDish {
  id: number;
  name: string;
  order_index: number;
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
      await fetchMenu(language); // Refresh with current language
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchMenu(language);
    
    // Auto refresh every 5 seconds for faster updates
    const interval = setInterval(() => {
      fetchMenu(language);
    }, 5000);
    
    // Subscribe to realtime changes on menus and dishes
    const menusChannel = supabase
      .channel('menu-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menus'
        },
        (payload) => {
          console.log('Menu change detected:', payload);
          fetchMenu(language);
        }
      )
      .subscribe();
    
    const dishesChannel = supabase
      .channel('dishes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dishes'
        },
        (payload) => {
          console.log('Dishes change detected:', payload);
          fetchMenu(language);
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(menusChannel);
      supabase.removeChannel(dishesChannel);
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