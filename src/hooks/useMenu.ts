import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Language } from '../types';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
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
    
    // Setup Supabase Realtime subscription for menu changes
    if (supabaseClient) {
      const subscription = supabaseClient
        .channel('menu_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menus' }, () => {
          // Refetch menu when any changes occur
          fetchMenu(language);
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('Menu realtime subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Menu subscription error, falling back to polling');
          }
        });

      return () => {
        subscription.unsubscribe();
      };
    }
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
