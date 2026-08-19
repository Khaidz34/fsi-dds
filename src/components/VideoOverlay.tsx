import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
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
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({ canDismiss = true, forceVisible = false }) => {
  const { enabled, videoUrl, introVideoUrl, isLoading } = useVideoSettings();
  const [hidden, setHidden] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');

  const shouldShow = (forceVisible || enabled) && Boolean(videoUrl || introVideoUrl);

  // When intro finishes, switch to main video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      // intro just ended — switch to main if we haven't already
      if (currentVideoUrl !== videoUrl && introVideoUrl && videoUrl) {
        setCurrentVideoUrl(videoUrl);
      }
    };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [currentVideoUrl, videoUrl, introVideoUrl]);

  // Determine which video to show
  useEffect(() => {
    if (!shouldShow) return;
    // Always start with intro; fall back to main if no intro
    const start = introVideoUrl && introVideoUrl !== videoUrl ? introVideoUrl : (videoUrl || '');
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

  // Auto-play once visible
  useEffect(() => {
    if (shouldShow && !hidden && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('[VideoOverlay] autoplay blocked:', err);
      });
    }
  }, [shouldShow, hidden, currentVideoUrl]);

  if (isLoading && !forceVisible) return null;
  if (!shouldShow || hidden || !currentVideoUrl) return null;

  const isIntro = currentVideoUrl === introVideoUrl && introVideoUrl !== videoUrl;

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
          muted
          className="w-full h-full object-contain"
        >
          Your browser does not support the video tag.
        </video>

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
