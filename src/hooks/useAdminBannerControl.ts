import { useState, useEffect, useCallback } from 'react';
import { bannerAPI } from '../services/api';

interface AdminBannerControl {
  selectedBanner: 'game' | 'anniversary';
  updateBanner: (type: 'game' | 'anniversary') => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Hook for admin banner control
 * Manages banner selection and updates with optimistic updates
 */
export const useAdminBannerControl = (): AdminBannerControl => {
  const [selectedBanner, setSelectedBanner] = useState<'game' | 'anniversary'>('game');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch current banner settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await bannerAPI.getSettings();
        setSelectedBanner(settings.bannerType);
      } catch (err) {
        console.error('Error fetching banner settings:', err);
        setError(err as Error);
      }
    };

    fetchSettings();
  }, []);

  const updateBanner = useCallback(async (type: 'game' | 'anniversary') => {
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
