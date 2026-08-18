import { useState, useEffect, useCallback } from 'react';
import { videoAPI } from '../services/api';

interface VideoSettings {
  enabled: boolean;
  videoUrl: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setEnabled: (enabled: boolean, videoUrl?: string) => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook to fetch and toggle video overlay settings
 * - Polls every 10s so admin toggle propagates to all users
 * - Includes setEnabled helper for AdminVideoControl
 */
export const useVideoSettings = (): VideoSettings => {
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('/videos/0816.mp4');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await videoAPI.getSettings();
      setEnabledState(Boolean(settings.enabled));
      if (settings.videoUrl) setVideoUrl(settings.videoUrl);
      setError(null);
    } catch (err) {
      console.error('[useVideoSettings] fetch error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (nextEnabled: boolean, nextUrl?: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await videoAPI.updateSettings(nextEnabled, nextUrl ?? videoUrl);
      setEnabledState(nextEnabled);
      if (nextUrl) setVideoUrl(nextUrl);
    } catch (err) {
      console.error('[useVideoSettings] save error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [videoUrl]);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 10000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  return {
    enabled,
    videoUrl,
    isLoading,
    error,
    refetch: fetchSettings,
    setEnabled,
    isSaving
  };
};
