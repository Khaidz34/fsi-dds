import React, { useState, useEffect } from 'react';
import { X, Save, Edit2 } from 'lucide-react';
import type { MenuDish } from '../hooks/useMenu';

interface EditDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: MenuDish | null;
  onSave: (dishId: number, data: { name_vi: string; name_en?: string; name_ja?: string; sort_order?: number }) => Promise<any>;
}

export const EditDishModal: React.FC<EditDishModalProps> = ({
  isOpen,
  onClose,
  dish,
  onSave
}) => {
  const [nameVi, setNameVi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dish) {
      setNameVi(dish.name_vi || dish.name || '');
      setNameEn(dish.name_en || '');
      setNameJa(dish.name_ja || '');
      setSortOrder(dish.sort_order ?? 0);
      setError(null);
    }
  }, [dish]);

  if (!isOpen || !dish) return null;

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
      await onSave(dish.id, {
        name_vi: cleanVi,
        name_en: nameEn.trim().replace(/\*\*/g, '') || undefined,
        name_ja: nameJa.trim().replace(/\*\*/g, '') || undefined,
        sort_order: sortOrder
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving dish:', err);
      setError(err?.message || 'Có lỗi xảy ra khi cập nhật món ăn');
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
              <div className="w-10 h-10 rounded-2xl bg-[#DA251D]/10 flex items-center justify-center text-[#DA251D]">
                <Edit2 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Chỉnh sửa món ăn</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cập nhật thông tin & bản dịch đa ngôn ngữ</p>
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
                placeholder="VD: Ba chỉ sốt chua ngọt"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🇬🇧</span> Tên tiếng Anh (English)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="VD: Sweet and sour pork belly"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🇯🇵</span> Tên tiếng Nhật (日本語)
              </label>
              <input
                type="text"
                value={nameJa}
                onChange={(e) => setNameJa(e.target.value)}
                placeholder="VD: 豚バラ肉の甘酢あんかけ"
                className="w-full px-4 py-3 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                🔢 Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                className="w-28 px-4 py-2.5 bg-[#FDF4E3]/30 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm font-medium"
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
                className="px-6 py-2.5 bg-[#DA251D] hover:bg-[#c01f18] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#DA251D]/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Lưu thay đổi</span>
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
