import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Language } from '../types';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';
import { debounce, cacheService } from '../services/cache';

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

  const fetchMenu = async (lang?: Language, forceFresh = false) => {
    const activeLang = lang || language || 'vi';
    const cacheKey = `menu_today_${activeLang}`;

    if (!forceFresh) {
      const cached = cacheService.get<TodayMenu>(cacheKey);
      if (cached) {
        setMenu(cached);
        setIsLoading(false);
        return;
      }
    }

    try {
      if (!menu) {
        setIsLoading(true);
      }
      setError(null);
      const data = await menuAPI.getToday(activeLang);
      cacheService.set(cacheKey, data, 180); // Cache 3 phút
      setMenu(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải menu');
    } finally {
      setIsLoading(false);
    }
  };

  const syncAutoDeadlineOverride = (serverOverride?: any) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
      const todayVN = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      const overrideData = serverOverride || {
        mode: 'auto',
        date: todayVN,
        extendedUntilTimestamp: null
      };
      localStorage.setItem('fsi_order_deadline_override', JSON.stringify(overrideData));
      window.dispatchEvent(new CustomEvent('fsi_order_deadline_override_changed', { detail: overrideData }));
    } catch (e) {
      console.warn('Could not sync auto deadline override locally:', e);
    }
  };

  const createMenu = async (dishes: string[], imageUrl?: string) => {
    try {
      const newMenu = await menuAPI.create(dishes, imageUrl);
      cacheService.clear();
      syncAutoDeadlineOverride(newMenu?.deadlineOverride);
      setMenu(newMenu);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  const createMultilingualMenu = async (dishes: Array<{vi: string, en?: string, ja?: string}>, imageUrl?: string) => {
    try {
      const newMenu = await menuAPI.createMultilingual(dishes, imageUrl);
      cacheService.clear();
      syncAutoDeadlineOverride(newMenu?.deadlineOverride);
      await fetchMenu(language, true);
      return newMenu;
    } catch (err) {
      throw err;
    }
  };

  // Debounce refetch to prevent duplicate requests
  const debouncedFetch = debounce(() => {
    cacheService.clear();
    fetchMenu(language, true);
  }, 100);

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
    refetch: (lang?: Language) => fetchMenu(lang, true),
    createMenu,
    createMultilingualMenu
  };
};
