import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

export interface MultilingualDish {
  vi: string;
  en: string;
  ja: string;
}

interface MultilingualMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (dishes: MultilingualDish[]) => Promise<void>;
  formatErrorText?: string;
  pleaseAddDishText?: string;
}

export const MultilingualMenuModal: React.FC<MultilingualMenuModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  formatErrorText = 'Định dạng menu không hợp lệ. Vui lòng kiểm tra lại cấu trúc: Tiếng Việt >>>>> English >>>>> 日本語',
  pleaseAddDishText = 'Vui lòng thêm ít nhất một món ăn'
}) => {
  const [multilingualText, setMultilingualText] = useState('');
  const [multilingualMenus, setMultilingualMenus] = useState<MultilingualDish[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parseMultilingualText = (): MultilingualDish[] => {
    const lines = multilingualText.trim().split('\n').filter(line => line.trim() !== '');
    const parsedDishes: MultilingualDish[] = [];
    
    lines.forEach(line => {
      const parts = line.split('>>>>>').map(part => part.trim());
      if (parts.length === 3) {
        // Remove markdown formatting (**, *, _, etc.)
        const cleanVi = parts[0].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        const cleanEn = parts[1].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        const cleanJa = parts[2].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        
        parsedDishes.push({
          vi: cleanVi,
          en: cleanEn, 
          ja: cleanJa
        });
      }
    });
    
    setMultilingualMenus(parsedDishes);
    return parsedDishes;
  };

  const handleCreateFromText = async () => {
    const parsedDishes = parseMultilingualText();
    if (parsedDishes.length === 0) {
      alert(formatErrorText);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onCreate(parsedDishes);
      handleClose();
      alert('Menu đa ngôn ngữ đã được tạo thành công!');
    } catch (error) {
      console.error('Lỗi khi tạo menu đa ngôn ngữ:', error);
      alert('Lỗi khi tạo menu đa ngôn ngữ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFromList = async () => {
    if (multilingualMenus.length === 0) {
      alert(pleaseAddDishText);
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate(multilingualMenus);
      handleClose();
      alert('Menu đa ngôn ngữ đã được tạo thành công!');
    } catch (error) {
      console.error('Lỗi khi tạo menu đa ngôn ngữ:', error);
      alert('Lỗi khi tạo menu đa ngôn ngữ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMultilingualDish = () => {
    setMultilingualMenus([...multilingualMenus, { vi: '', en: '', ja: '' }]);
  };

  const updateMultilingualDish = (index: number, lang: 'vi' | 'en' | 'ja', value: string) => {
    const cleanValue = value.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
    const updated = [...multilingualMenus];
    updated[index][lang] = cleanValue;
    setMultilingualMenus(updated);
  };

  const removeMultilingualDish = (index: number) => {
    setMultilingualMenus(multilingualMenus.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    onClose();
    setMultilingualMenus([]);
    setMultilingualText('');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div 
        onClick={handleClose}
        className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm sm:max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture max-h-[90vh] overflow-y-auto mx-4 z-10">
        <div className="p-4 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-display font-bold tracking-tight">🌐 Tạo menu đa ngôn ngữ</h3>
              <p className="text-sm text-app-ink/60 mt-2">Nhập menu theo format: Tiếng Việt {'>>>>>'} English {'>>>>>'} 日本語</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-[#F5F2E9] rounded-xl transition-colors">
              <X size={24} className="text-[#1C1917]/20" />
            </button>
          </div>

          {/* Format Input Method */}
          <div className="mb-8">
            <h4 className="text-lg font-bold mb-4">📝 Nhập nhanh theo format</h4>
            <div className="space-y-4">
              <textarea
                value={multilingualText}
                onChange={(e) => setMultilingualText(e.target.value)}
                placeholder="Ví dụ:&#10;Cá trắm sốt cà chua >>>>> Grass carp in tomato sauce >>>>> トマトソースのソウギョ（草魚）&#10;Tóp mỡ xào dưa cải >>>>> Stir-fried pork cracklings with pickled mustard greens >>>>> 豚脂かすと高菜の炒め物&#10;Sườn non sốt nấm tươi >>>>> Pork ribs with fresh mushroom sauce >>>>> スペアリブのフレッシュきのこソース"
                rows={8}
                className="w-full px-6 py-4 bg-[#F5F2E9]/50 border-2 border-[#E5E1D1] rounded-2xl focus:outline-none focus:border-[#DA251D] text-sm font-medium resize-none"
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={parseMultilingualText}
                  className="px-6 py-3 bg-[#4ADE80] text-white rounded-xl font-bold hover:bg-[#4ADE80]/90 transition-colors"
                >
                  🔄 Xem trước
                </button>
                <button
                  type="button"
                  onClick={handleCreateFromText}
                  disabled={!multilingualText.trim() || isSubmitting}
                  className="px-6 py-3 bg-[#DA251D] text-white rounded-xl font-bold hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🌐 Tạo menu ngay
                </button>
              </div>
              <p className="text-xs text-app-ink/40">
                💡 Mỗi món một dòng, phân cách bằng {'>>>>>'} giữa 3 ngôn ngữ
              </p>
            </div>
          </div>

          {/* Preview/Manual Edit */}
          {multilingualMenus.length > 0 && (
            <div className="border-t border-[#E5E1D1] pt-8">
              <h4 className="text-lg font-bold mb-4">👀 Xem trước & chỉnh sửa</h4>
              <div className="space-y-6">
                {multilingualMenus.map((dish, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-[#F5F2E9]/50 rounded-2xl border border-[#E5E1D1]">
                    <div>
                      <label className="block text-sm font-bold text-[#1C1917] mb-2">🇻🇳 Tiếng Việt</label>
                      <input
                        type="text"
                        value={dish.vi}
                        onChange={(e) => updateMultilingualDish(index, 'vi', e.target.value)}
                        className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#1C1917] mb-2">🇺🇸 English</label>
                      <input
                        type="text"
                        value={dish.en}
                        onChange={(e) => updateMultilingualDish(index, 'en', e.target.value)}
                        className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-[#1C1917] mb-2">🇯🇵 日本語</label>
                        <input
                          type="text"
                          value={dish.ja}
                          onChange={(e) => updateMultilingualDish(index, 'ja', e.target.value)}
                          className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMultilingualDish(index)}
                        className="mt-7 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Xóa món này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addMultilingualDish}
                  className="w-full p-4 border-2 border-dashed border-[#E5E1D1] rounded-2xl text-[#1C1917]/40 hover:border-[#DA251D] hover:text-[#DA251D] transition-all"
                >
                  + Thêm món ăn mới
                </button>
              </div>

              <div className="mt-8 flex gap-4 justify-end">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest border border-[#E5E1D1] text-[#1C1917]/40 hover:bg-[#F5F2E9] transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="button"
                  onClick={handleCreateFromList}
                  disabled={multilingualMenus.length === 0 || isSubmitting}
                  className="px-8 py-4 bg-[#4ADE80] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#4ADE80]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🌐 Tạo menu đa ngôn ngữ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
