/**
 * BannerDisplay Component
 * Main component that fetches banner settings and renders the appropriate banner type
 */

import React from 'react';
import { useBannerSettings } from '../hooks/useBannerSettings';
import { AnniversaryBanner } from './AnniversaryBanner';
import { FusionSliceGame } from './FusionSliceGame';

interface BannerDisplayProps {
  onClose?: () => void;
}

/**
 * Error Boundary for banner component errors
 */
class BannerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Banner component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback to game banner on error
      return <FusionSliceGame />;
    }

    return this.props.children;
  }
}

export const BannerDisplay: React.FC<BannerDisplayProps> = ({ onClose }) => {
  const { bannerType, isLoading, error } = useBannerSettings();

  // Show loading state
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

  // Show error state with fallback
  if (error) {
    console.warn('Banner display error, showing game banner:', error);
  }

  // Render appropriate banner based on type
  const renderBanner = () => {
    switch (bannerType) {
      case 'anniversary':
        return <AnniversaryBanner onClose={onClose} />;
      case 'game':
      default:
        return <FusionSliceGame />;
    }
  };

  return (
    <BannerErrorBoundary>
      {renderBanner()}
    </BannerErrorBoundary>
  );
};
