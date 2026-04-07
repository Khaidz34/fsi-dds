import React from 'react';
import { useBannerSettings } from '../hooks/useBannerSettings';
import { AnniversaryBanner } from './AnniversaryBanner';
import { GameBannerPreview } from './GameBannerPreview';

interface BannerDisplayProps {
  onClose?: () => void;
}

export const BannerDisplay: React.FC<BannerDisplayProps> = ({ onClose }) => {
  const { bannerType, isLoading, error } = useBannerSettings();

  if (isLoading) {
    return (
      <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Đang tải banner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.warn('Banner display error, showing game banner preview:', error);
    return <GameBannerPreview onClose={onClose} />;
  }

  try {
    switch (bannerType) {
      case 'anniversary':
        return <AnniversaryBanner onClose={onClose} />;
      case 'game':
      default:
        return null;
    }
  } catch (err) {
    console.error('Banner render error:', err);
    return null;
  }
};
