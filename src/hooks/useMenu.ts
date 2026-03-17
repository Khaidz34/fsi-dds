import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { menuAPI } from '../services/api';
import { Language } from '../types';

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

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Subscribe to realtime changes on menus and dishes tables
    const channel = supabase
      .channel('menu-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menus'
        },
        (payload) => {
          console.log('📡 Realtime menu update:', payload);
          fetchMenu(language);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dishes'
        },
        (payload) => {
          console.log('📡 Realtime dishes update:', payload);
          fetchMenu(language);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
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