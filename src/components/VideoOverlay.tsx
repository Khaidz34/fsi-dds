import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useVideoSettings } from '../hooks/useVideoSettings';

interface VideoOverlayProps {
  canDismiss?: boolean;
}

/**
 * Full-screen video overlay shown to all users when enabled
 * - Polls settings every 10s via useVideoSettings
 * - User can dismiss via X (hides for session) or Esc key
 * - Admin can re-enable from AdminVideoControl
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({ canDismiss = true }) => {
  const { enabled, videoUrl, isLoading } = useVideoSettings();
  const [hidden, setHidden] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (enabled) setHidden(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) setHidden(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, canDismiss]);

  // Auto-play once visible (browsers may block muted autoplay only without user gesture)
  useEffect(() => {
    if (enabled && !hidden && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('[VideoOverlay] autoplay blocked:', err);
      });
    }
  }, [enabled, hidden, videoUrl]);

  if (isLoading || !enabled || hidden) return null;

  return (
    <div
      className="my-4 rounded-2xl overflow-hidden bg-black shadow-2xl border border-app-accent/20"
      role="region"
      aria-label="Video overlay"
    >
      <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
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
