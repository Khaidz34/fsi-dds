import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

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
        dish2Id: dish2 || undefined,
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Món phụ (tùy chọn)
            </label>
            <select
              value={dish2}
              onChange={(e) => setDish2(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent"
            >
              <option value={0}>Không chọn món phụ</option>
              {menu?.dishes?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {getDishName(d, currentLang)}
                </option>
              ))}
            </select>
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
