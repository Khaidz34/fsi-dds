import { useState, useEffect, useCallback } from 'react';
import { bannerAPI } from '../services/api';
import { cacheService } from '../services/cache';

export type BannerType = 'none' | 'anniversary';

interface BannerSettings {
  bannerType: BannerType | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage banner settings
 * Fetches banner settings on mount with caching
 */
export const useBannerSettings = (): BannerSettings => {
  const [bannerType, setBannerType] = useState<BannerType | null>(() => {
    const cached = cacheService.get<string>('banner_settings');
    if (!cached) return null;
    return cached === 'anniversary' ? 'anniversary' : 'none';
  });
  const [isLoading, setIsLoading] = useState(() => !cacheService.has('banner_settings'));
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async (forceFresh = false) => {
    if (!forceFresh) {
      const cached = cacheService.get<string>('banner_settings');
      if (cached) {
        setBannerType(cached === 'anniversary' ? 'anniversary' : 'none');
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      const settings = await bannerAPI.getSettings();
      const normalized: BannerType = settings.bannerType === 'anniversary' ? 'anniversary' : 'none';
      cacheService.set('banner_settings', normalized, 300); // Cache 5 phút
      setBannerType(normalized);
    } catch (err) {
      console.error('Error fetching banner settings:', err);
      setError(err as Error);
      setBannerType('none');
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
