import React, { useEffect, useRef, useState } from 'react';
import { X, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useVideoSettings } from '../hooks/useVideoSettings';

interface VideoOverlayProps {
  canDismiss?: boolean;
  forceVisible?: boolean;
}

/**
 * Full-screen video overlay — auto-plays intro then main quietly (muted by default).
 * Provides clear one-click button to unmute sound politely for office environments.
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({ canDismiss = true, forceVisible = false }) => {
  const { enabled, videoUrl, introVideoUrl, isLoading } = useVideoSettings();
  const [hidden, setHidden] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');

  const shouldShow = (forceVisible || enabled) && Boolean(videoUrl || introVideoUrl);

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

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // When intro finishes, auto-advance
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      if (canNext) playByIndex(currentIndex + 1);
    };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [canNext, currentIndex]);

  // Autoplay quietly (muted) by default to prevent startling people in office
  useEffect(() => {
    if (!currentVideoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.load();
    video.play().catch(() => {});
  }, [currentVideoUrl]);

  // Mount: pick starting video
  useEffect(() => {
    if (!shouldShow || currentVideoUrl) return;
    setCurrentVideoUrl(introVideoUrl || videoUrl || '');
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

        {/* Audio Mute/Unmute toggle button */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg border border-white/20 hover:scale-105"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <VolumeX size={16} className="text-amber-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          <span>{isMuted ? 'Bấm để bật âm thanh' : 'Đang bật âm thanh'}</span>
        </button>

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
