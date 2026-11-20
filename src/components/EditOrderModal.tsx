import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const isSingleOnlyDish = (dish: any) => {
  if (!dish) return false;
  const name = (dish.name_vi || dish.name || '').toLowerCase().replace(/^\s*\d+[.)]\s*/, '').trim();
  return name === 'bún gà' || name === 'miến gà' || name === 'phở gà' ||
         name.includes('bún gà') || name.includes('miến gà') || name.includes('phở gà');
};

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  menu: any;
  currentLang: string;
  canPlaceOrder: boolean;
  deadlineString?: string;
  deadlineExpiredEditAlert?: string;
  getDishName: (dish: any, lang: string) => string;
  onUpdate: (orderId: number, data: { dish1Id: number; dish2Id?: number; notes?: string }) => Promise<void>;
  onRefetchOrders: () => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  menu,
  currentLang,
  canPlaceOrder,
  deadlineString = '11:00',
  deadlineExpiredEditAlert = 'Đã hết giờ chỉnh sửa đơn cơm hôm nay (hạn chót là {deadline}). Bếp đã khóa danh sách để nấu món.',
  getDishName,
  onUpdate,
  onRefetchOrders
}) => {
  const [dish1, setDish1] = useState<number>(0);
  const [dish2, setDish2] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      setDish1(order.dish1?.id || 0);
      setDish2(order.dish2?.id || 0);
      setNotes(order.notes || '');
    }
  }, [order]);

  const selectedDish1Obj = menu?.dishes?.find((d: any) => d.id === dish1);
  const isDish1SingleOnly = isSingleOnlyDish(selectedDish1Obj);

  useEffect(() => {
    if (isDish1SingleOnly && dish2 !== 0) {
      setDish2(0);
    }
  }, [isDish1SingleOnly, dish2]);

  if (!isOpen || !order) return null;

  const handleSubmit = async () => {
    if (!canPlaceOrder) {
      alert(deadlineExpiredEditAlert.replace('{deadline}', deadlineString || '11:00'));
      return;
    }
    if (!dish1) {
      alert('Vui lòng chọn món chính');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate(order.id, {
        dish1Id: dish1,
        dish2Id: isDish1SingleOnly ? undefined : (dish2 || undefined),
        notes: notes || undefined
      });
      
      onClose();
      await onRefetchOrders();
      alert('Đã cập nhật đơn hàng thành công!');
    } catch (error) {
      console.error('Lỗi khi cập nhật đơn hàng:', error);
      alert('Lỗi khi cập nhật đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-[#1C1917] mb-6">Chỉnh sửa đơn hàng</h3>
        
        <div className="space-y-6">
          {/* Current order info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-600 mb-2">Đơn hàng hiện tại:</p>
            <p className="font-semibold">{order.receiver?.fullname}</p>
            <p className="text-sm text-gray-600">
              {getDishName(order.dish1, currentLang)} {order.dish2?.name ? `+ ${getDishName(order.dish2, currentLang)}` : ''}
            </p>
            {order.created_at && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-medium">
                <Clock size={12} className="inline text-emerald-600" />
                <span>Đặt lúc: {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(order.created_at).toLocaleDateString('vi-VN')})</span>
              </p>
            )}
          </div>

          {/* Dish 1 Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Món chính *
            </label>
            <select
              value={dish1}
              onChange={(e) => setDish1(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent"
            >
              <option value={0}>Chọn món chính</option>
              {menu?.dishes?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {getDishName(d, currentLang)}
                </option>
              ))}
            </select>
          </div>

          {/* Dish 2 Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Món phụ (tùy chọn)
              </label>
              {isDish1SingleOnly && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Món nước (chỉ chọn 1 món)
                </span>
              )}
            </div>
            <select
              value={isDish1SingleOnly ? 0 : dish2}
              onChange={(e) => setDish2(Number(e.target.value))}
              disabled={isDish1SingleOnly}
              className={`w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent transition-all ${
                isDish1SingleOnly ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-dashed' : ''
              }`}
            >
              <option value={0}>{isDish1SingleOnly ? 'Không áp dụng món phụ cho món nước' : 'Không chọn món phụ'}</option>
              {!isDish1SingleOnly && menu?.dishes?.map((d: any) => {
                const isSingle = isSingleOnlyDish(d);
                return (
                  <option key={d.id} value={d.id} disabled={isSingle}>
                    {getDishName(d, currentLang)} {isSingle ? ' (Món nước - chỉ chọn ở Món chính)' : ''}
                  </option>
                );
              })}
            </select>
            {isDish1SingleOnly && (
              <p className="text-xs text-amber-700 font-medium mt-1.5 flex items-center gap-1">
                🍜 Bún gà, Miến gà, Phở gà là suất ăn trọn vẹn, không chọn kèm món thứ 2.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú đặc biệt..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#DA251D] text-white rounded-xl hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
