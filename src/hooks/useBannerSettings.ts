import { useState, useEffect, useCallback } from 'react';
import { bannerAPI } from '../services/api';
import { cacheService } from '../services/cache';

interface BannerSettings {
  bannerType: 'game' | 'anniversary' | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage banner settings
 * Fetches banner settings on mount with caching
 */
export const useBannerSettings = (): BannerSettings => {
  const [bannerType, setBannerType] = useState<'game' | 'anniversary' | null>(() => {
    return cacheService.get<'game' | 'anniversary'>('banner_settings');
  });
  const [isLoading, setIsLoading] = useState(() => !cacheService.has('banner_settings'));
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async (forceFresh = false) => {
    if (!forceFresh) {
      const cached = cacheService.get<'game' | 'anniversary'>('banner_settings');
      if (cached) {
        setBannerType(cached);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      const settings = await bannerAPI.getSettings();
      cacheService.set('banner_settings', settings.bannerType, 300); // Cache 5 phút
      setBannerType(settings.bannerType);
    } catch (err) {
      console.error('Error fetching banner settings:', err);
      setError(err as Error);
      // Fallback to game banner on error
      setBannerType('game');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    bannerType,
    isLoading,
    error,
    refetch: () => fetchSettings(true)
  };
};
