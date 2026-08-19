import React, { useState } from 'react';
import { useVideoSettings } from '../hooks/useVideoSettings';

interface AdminVideoControlProps {
  user?: { role?: string; id?: number; username?: string };
}

/**
 * Admin control panel for enabling/disabling the video overlay
 * Visible only to admin users
 */
export const AdminVideoControl: React.FC<AdminVideoControlProps> = ({ user }) => {
  const { enabled, videoUrl, introVideoUrl, setEnabled, isSaving, error } = useVideoSettings();
  const [draftUrl, setDraftUrl] = useState<string>(videoUrl);
  const [draftIntroUrl, setDraftIntroUrl] = useState<string>(introVideoUrl);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  React.useEffect(() => {
    setDraftUrl(videoUrl);
  }, [videoUrl]);

  React.useEffect(() => {
    setDraftIntroUrl(introVideoUrl);
  }, [introVideoUrl]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-yellow-50 rounded-lg shadow-md p-6 border border-yellow-200">
        <p className="text-sm text-yellow-800">⚠️ Bạn không có quyền quản lý video</p>
      </div>
    );
  }

  const showFeedback = (kind: 'ok' | 'err', msg: string) => {
    setFeedback({ kind, msg });
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggle = async () => {
    try {
      await setEnabled(!enabled, draftUrl, draftIntroUrl);
      showFeedback('ok', `Video đã được ${!enabled ? 'BẬT' : 'TẮT'}`);
    } catch (err) {
      showFeedback('err', `Lỗi: ${(err as Error).message}`);
    }
  };

  const handleUpdateUrls = async () => {
    try {
      await setEnabled(enabled, draftUrl, draftIntroUrl);
      showFeedback('ok', 'Đã cập nhật URL video');
    } catch (err) {
      showFeedback('err', `Lỗi: ${(err as Error).message}`);
    }
  };

  const urlsChanged = draftUrl !== videoUrl || draftIntroUrl !== introVideoUrl;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quản lý Video Overlay</h3>
        {isSaving && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Đang cập nhật...</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Video Intro (chạy trước)
          </label>
          <input
            type="text"
            value={draftIntroUrl}
            onChange={(e) => setDraftIntroUrl(e.target.value)}
            disabled={isSaving}
            placeholder="/videos/intro.mp4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Video Chính
          </label>
          <input
            type="text"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            disabled={isSaving}
            placeholder="/videos/0816.mp4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <button
          type="button"
          onClick={handleUpdateUrls}
          disabled={isSaving || !urlsChanged}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-sm font-medium rounded-lg"
        >
          Lưu URL
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Hiển thị overlay cho người dùng</p>
          <p className="text-xs text-gray-500 mt-1">
            Trạng thái: <span className={enabled ? 'text-green-600 font-semibold' : 'text-gray-500'}>{enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}`}
        >
          {enabled ? 'TẮT video' : 'BẬT video'}
        </button>
      </div>

      {feedback?.kind === 'ok' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          ✅ {feedback.msg}
        </div>
      )}
      {feedback?.kind === 'err' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          ❌ {feedback.msg}
        </div>
      )}
      {!feedback && error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          ❌ Lỗi: {error.message}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        💡 Intro chạy trước, sau đó tự động chuyển sang video chính.
        Video intro mặc định: <code>/videos/intro.mp4</code> | Video chính: <code>/videos/0816.mp4</code>
      </p>
    </div>
  );
};
