import React, { useEffect, useRef, useState } from 'react';
import { X, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useVideoSettings } from '../hooks/useVideoSettings';

interface VideoOverlayProps {
  canDismiss?: boolean;
  /**
   * Bypass the polled `enabled` flag. When true, the overlay renders if
   * `videoUrl` is truthy (caller-controlled). Useful when the parent has
   * already decided to show the video (e.g. as a dashboard replacement).
   */
  forceVisible?: boolean;
}

/**
 * Full-screen video overlay shown to all users when enabled
 * - Polls settings every 10s via useVideoSettings
 * - User can dismiss via X (hides for session) or Esc key
 * - Admin can re-enable from AdminVideoControl
 * - Plays intro video first, then main video automatically
 * - Prev/Next buttons to manually navigate between intro and main
 * - Prompts user to enable audio on first interaction
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({ canDismiss = true, forceVisible = false }) => {
  const { enabled, videoUrl, introVideoUrl, isLoading } = useVideoSettings();
  const [hidden, setHidden] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  const shouldShow = (forceVisible || enabled) && Boolean(videoUrl || introVideoUrl);

  // Build the playlist (deduplicated)
  const playlist: string[] = [
    introVideoUrl,
    ...(videoUrl && videoUrl !== introVideoUrl ? [videoUrl] : []),
  ].filter(Boolean);

  const currentIndex = playlist.indexOf(currentVideoUrl);
  const isIntro = currentVideoUrl === introVideoUrl && introVideoUrl !== videoUrl;
  const hasMultiple = playlist.length > 1;
  const canPrev = hasMultiple && currentIndex > 0;
  const canNext = hasMultiple && currentIndex < playlist.length - 1;

  const playByIndex = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentVideoUrl(playlist[index]);
    }
  };

  const handleEnableAudio = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.play().catch(() => {});
      setAudioUnlocked(true);
    }
  };

  // When intro finishes, auto-advance to main if not manually navigated
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      if (canNext) {
        playByIndex(currentIndex + 1);
      }
    };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [canNext, currentIndex]);

  // When video changes, re-trigger play
  useEffect(() => {
    if (!currentVideoUrl) return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [currentVideoUrl]);

  // Determine which video to show on mount
  useEffect(() => {
    if (!shouldShow || currentVideoUrl) return;
    const start = introVideoUrl ? introVideoUrl : (videoUrl || '');
    setCurrentVideoUrl(start);
  }, [shouldShow, introVideoUrl, videoUrl]);

  useEffect(() => {
    if (enabled) setHidden(false);
  }, [enabled]);

  useEffect(() => {
    if (!shouldShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) setHidden(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldShow, canDismiss]);

  if (isLoading && !forceVisible) return null;
  if (!shouldShow || hidden || !currentVideoUrl) return null;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-app-accent/20"
      role="region"
      aria-label="Video overlay"
    >
      <div className="relative aspect-video w-full bg-black">
        {isIntro && (
          <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/70 text-white text-xs rounded">
            Intro
          </div>
        )}

        <video
          key={currentVideoUrl}
          ref={videoRef}
          src={currentVideoUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        >
          Your browser does not support the video tag.
        </video>

        {/* Audio unlock prompt — shown until user taps */}
        {!audioUnlocked && (
          <button
            type="button"
            onClick={handleEnableAudio}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer z-20"
            aria-label="Bật âm thanh để xem video"
          >
            <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-2xl">
              <Volume2 size={28} className="text-teal-600" />
              <span className="text-lg font-semibold text-gray-900">Bật âm thanh</span>
            </div>
            <span className="mt-3 text-sm text-white/80">Nhấn để bật âm thanh video</span>
          </button>
        )}

        {/* Prev / Next nav */}
        {hasMultiple && (
          <div className="absolute bottom-16 left-0 right-0 flex items-center justify-center gap-6 pointer-events-none">
            <button
              type="button"
              onClick={() => playByIndex(currentIndex - 1)}
              disabled={!canPrev}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Video trước"
            >
              <SkipBack size={18} />
            </button>

            <span className="pointer-events-auto text-white text-sm bg-black/60 px-3 py-1 rounded-full">
              {currentIndex + 1} / {playlist.length}
            </span>

            <button
              type="button"
              onClick={() => playByIndex(currentIndex + 1)}
              disabled={!canNext}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Video tiếp theo"
            >
              <SkipForward size={18} />
            </button>
          </div>
        )}

        {canDismiss && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg transition-colors"
            aria-label="Close video"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
