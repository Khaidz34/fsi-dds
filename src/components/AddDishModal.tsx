import React, { useState } from 'react';
import { X, Plus, Utensils } from 'lucide-react';

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name_vi: string; name_en?: string; name_ja?: string }) => Promise<any>;
}

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [nameVi, setNameVi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVi = nameVi.trim().replace(/\*\*/g, '');
    if (!cleanVi) {
      setError('Vui lòng nhập tên món ăn tiếng Việt');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        name_vi: cleanVi,
        name_en: nameEn.trim().replace(/\*\*/g, '') || undefined,
        name_ja: nameJa.trim().replace(/\*\*/g, '') || undefined
      });
      setNameVi('');
      setNameEn('');
      setNameJa('');
      onClose();
    } catch (err: any) {
      console.error('Error adding dish:', err);
      setError(err?.message || 'Có lỗi xảy ra khi thêm món ăn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F5E6D3]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Utensils size={20} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Thêm món ăn mới</h3>
                <p className="text-xs text-gray-500 mt-0.5">Bổ sung thêm 1 món vào thực đơn hôm nay</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-[#F5F2E9] rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🇻🇳</span> Tên món (Tiếng Việt) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nameVi}
                onChange={(e) => setNameVi(e.target.value)}
                placeholder="VD: Canh chua cá lóc"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🇬🇧</span> Tên tiếng Anh (tùy chọn)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="VD: Snakehead fish sour soup"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🇯🇵</span> Tên tiếng Nhật (tùy chọn)
              </label>
              <input
                type="text"
                value={nameJa}
                onChange={(e) => setNameJa(e.target.value)}
                placeholder="VD: ライギョの酸味スープ"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
              />
            </div>

            <div className="mt-8 pt-4 border-t border-[#F5E6D3] flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-bold transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !nameVi.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang thêm...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Thêm món</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
