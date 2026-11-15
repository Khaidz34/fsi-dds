import { useState, useEffect, useCallback } from 'react';
import { bannerAPI } from '../services/api';

export type BannerType = 'none' | 'anniversary';

interface AdminBannerControl {
  selectedBanner: BannerType;
  updateBanner: (type: BannerType) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Hook for admin banner control
 * Manages banner selection and updates with optimistic updates
 */
export const useAdminBannerControl = (): AdminBannerControl => {
  const [selectedBanner, setSelectedBanner] = useState<BannerType>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch current banner settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await bannerAPI.getSettings();
        setSelectedBanner(settings.bannerType === 'anniversary' ? 'anniversary' : 'none');
      } catch (err) {
        console.error('Error fetching banner settings:', err);
        setError(err as Error);
      }
    };

    fetchSettings();
  }, []);

  const updateBanner = useCallback(async (type: BannerType) => {
    // Store previous value for rollback
    const previousBanner = selectedBanner;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Optimistic update
      setSelectedBanner(type);
      
      // Call API
      await bannerAPI.updateSettings(type);
      
      console.log(`✅ Banner updated to "${type}"`);
    } catch (err) {
      console.error('Error updating banner:', err);
      setError(err as Error);
      
      // Rollback on error
      setSelectedBanner(previousBanner);
    } finally {
      setIsSaving(false);
    }
  }, [selectedBanner]);

  return {
    selectedBanner,
    updateBanner,
    isSaving,
    error
  };
};
