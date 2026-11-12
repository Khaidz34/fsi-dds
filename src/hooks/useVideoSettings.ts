import { useState, useEffect, useCallback } from 'react';
import { videoAPI } from '../services/api';
import { cacheService } from '../services/cache';

interface VideoSettings {
  enabled: boolean;
  videoUrl: string;
  introVideoUrl: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setEnabled: (enabled: boolean, videoUrl?: string, introVideoUrl?: string) => Promise<void>;
  isSaving: boolean;
}

interface CachedVideoSettings {
  enabled: boolean;
  videoUrl: string;
  introVideoUrl: string;
}

/**
 * Hook to fetch and toggle video overlay settings with caching
 */
export const useVideoSettings = (): VideoSettings => {
  const initialCache = cacheService.get<CachedVideoSettings>('video_settings');

  const [enabled, setEnabledState] = useState<boolean>(initialCache?.enabled ?? false);
  const [videoUrl, setVideoUrl] = useState<string>(initialCache?.videoUrl ?? '/videos/0816.mp4');
  const [introVideoUrl, setIntroVideoUrl] = useState<string>(initialCache?.introVideoUrl ?? '/videos/intro.mp4');
  const [isLoading, setIsLoading] = useState<boolean>(!initialCache);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async (forceFresh = false) => {
    if (!forceFresh) {
      const cached = cacheService.get<CachedVideoSettings>('video_settings');
      if (cached) {
        setEnabledState(cached.enabled);
        if (cached.videoUrl) setVideoUrl(cached.videoUrl);
        if (cached.introVideoUrl) setIntroVideoUrl(cached.introVideoUrl);
        setIsLoading(false);
        return;
      }
    }

    try {
      const settings = await videoAPI.getSettings();
      const nextEnabled = Boolean(settings.enabled);
      const nextVideo = settings.videoUrl || '/videos/0816.mp4';
      const nextIntro = settings.introVideoUrl || '/videos/intro.mp4';

      setEnabledState(nextEnabled);
      setVideoUrl(nextVideo);
      setIntroVideoUrl(nextIntro);

      cacheService.set('video_settings', {
        enabled: nextEnabled,
        videoUrl: nextVideo,
        introVideoUrl: nextIntro
      }, 120); // Cache 2 phút

      setError(null);
    } catch (err) {
      console.error('[useVideoSettings] fetch error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (nextEnabled: boolean, nextUrl?: string, nextIntroUrl?: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await videoAPI.updateSettings(nextEnabled, nextUrl ?? videoUrl, nextIntroUrl ?? introVideoUrl);
      setEnabledState(nextEnabled);
      if (nextUrl) setVideoUrl(nextUrl);
      if (nextIntroUrl) setIntroVideoUrl(nextIntroUrl);

      cacheService.set('video_settings', {
        enabled: nextEnabled,
        videoUrl: nextUrl ?? videoUrl,
        introVideoUrl: nextIntroUrl ?? introVideoUrl
      }, 120);
    } catch (err) {
      console.error('[useVideoSettings] save error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [videoUrl, introVideoUrl]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    enabled,
    videoUrl,
    introVideoUrl,
    isLoading,
    error,
    refetch: () => fetchSettings(true),
    setEnabled,
    isSaving
  };
};
