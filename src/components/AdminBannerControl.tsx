/**
 * AdminBannerControl Component
 * Admin-only control panel for selecting banner type
 */

import React, { useState } from 'react';
import { useAdminBannerControl } from '../hooks/useAdminBannerControl';

interface AdminBannerControlProps {
  user?: { role: string };
}

export const AdminBannerControl: React.FC<AdminBannerControlProps> = ({ user }) => {
  const { selectedBanner, updateBanner, isSaving, error } = useAdminBannerControl();
  const [showFeedback, setShowFeedback] = useState(false);

  // Only show for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleBannerChange = async (type: 'game' | 'anniversary') => {
    if (type === selectedBanner) return;

    try {
      await updateBanner(type);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    } catch (err) {
      console.error('Error updating banner:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quản lý Banner</h3>
        {isSaving && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Đang cập nhật...</span>
          </div>
        )}
      </div>

      {/* Banner Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Chọn loại banner hiển thị
        </label>

        <div className="flex gap-4">
          {/* Game Banner Option */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="banner-type"
              value="game"
              checked={selectedBanner === 'game'}
              onChange={() => handleBannerChange('game')}
              disabled={isSaving}
              className="w-4 h-4 text-teal-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              🎮 Game Banner (Fusion Slice)
            </span>
          </label>

          {/* Anniversary Banner Option */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="banner-type"
              value="anniversary"
              checked={selectedBanner === 'anniversary'}
              onChange={() => handleBannerChange('anniversary')}
              disabled={isSaving}
              className="w-4 h-4 text-teal-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              🎉 Anniversary Banner (1 năm)
            </span>
          </label>
        </div>
      </div>

      {/* Feedback Messages */}
      {showFeedback && !error && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-green-800">
            ✅ Banner đã được cập nhật thành công
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-red-800">
            ❌ Lỗi: {error.message}
          </span>
        </div>
      )}

      {/* Info Text */}
      <p className="mt-4 text-xs text-gray-500">
        💡 Thay đổi banner sẽ được cập nhật cho tất cả người dùng trong vòng 5 giây
      </p>
    </div>
  );
};
