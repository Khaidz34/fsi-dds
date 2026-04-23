/**
 * Mystical Website Component - Integrated into FSI DDS
 */

import React from 'react';
import { Home, Sparkles } from 'lucide-react';

export const FusionSliceGame: React.FC<{ onClose?: () => void }> = ({ onClose }) => {

  return (
    <div className="relative aspect-[4/1] w-full bg-slate-950 flex flex-col overflow-hidden rounded-2xl border border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 backdrop-blur-sm border-b border-purple-500/30">
        <div className="flex items-center gap-3">
          <Sparkles size={24} className="text-purple-400 animate-pulse" />
          <h1 className="text-xl font-black text-white">HUYỀN HỌC</h1>
          <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
            Khám Phá Bí Ẩn
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition-colors"
          >
            <Home size={16} />
            <span className="text-sm font-bold">Về FSI DDS</span>
          </button>
        )}
      </div>

      {/* Iframe Container */}
      <div className="flex-1 bg-black overflow-hidden relative">
        <iframe
          src="https://thuatso.onrender.com/"
          className="w-full h-full border-0"
          title="Huyền Học - Thuật Số"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
};
