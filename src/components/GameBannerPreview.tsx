/**
 * Game Banner Preview Component
 * Displays a non-interactive preview of the Fusion Slice game for the banner
 */

import React from 'react';
import { Sword } from 'lucide-react';

interface GameBannerPreviewProps {
  onClose?: () => void;
}

export const GameBannerPreview: React.FC<GameBannerPreviewProps> = ({ onClose }) => {
  return (
    <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 border border-slate-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <Sword size={24} className="text-orange-500" />
          <h1 className="text-xl font-black text-white">FUSION SLICE</h1>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            Viet-Nippon Blade
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition-colors"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Game Preview Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <div className="text-[30vh] font-black text-white rotate-90">FUSION</div>
        </div>

        {/* Preview Content */}
        <div className="relative z-10 text-center">
          <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-4">
            FUSION<br/>
            <span className="text-orange-500 text-7xl">SLICE</span>
          </h2>
          <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-8">Viet-Nippon Blade</p>
          
          <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-full border border-white/20 inline-block">
            <p className="text-white font-bold text-sm">🎮 Trò chơi cắt thực phẩm Viet-Nippon</p>
          </div>
        </div>
      </div>
    </div>
  );
};
