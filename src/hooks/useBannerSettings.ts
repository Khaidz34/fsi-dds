import { useState, useEffect, useCallback } from 'react';
import { bannerAPI } from '../services/api';

interface BannerSettings {
  bannerType: 'game' | 'anniversary' | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage banner settings
 * Fetches banner settings on mount and polls every 60 seconds
 */
export const useBannerSettings = (): BannerSettings => {
  const [bannerType, setBannerType] = useState<'game' | 'anniversary' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await bannerAPI.getSettings();
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
    // Initial fetch
    fetchSettings();

    // Poll every 60 seconds
    const intervalId = setInterval(fetchSettings, 60000);

    return () => clearInterval(intervalId);
  }, [fetchSettings]);

  return {
    bannerType,
    isLoading,
    error,
    refetch: fetchSettings
  };
};
