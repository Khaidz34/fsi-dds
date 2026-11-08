import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';

export interface OrderDeadlineState {
  isPassed: boolean;
  isUrgent: boolean; // < 40 mins
  isCritical: boolean; // < 10 mins
  hours: number;
  minutes: number;
  seconds: number;
  formattedTime: string;
  deadlineString: string;
}

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 */
export function getVietnamNow(): Date {
  const now = new Date();
  const vnString = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  return new Date(vnString);
}

/**
 * Kiểm tra xem đã quá hạn chốt đặt cơm hôm nay (11h10) hay chưa
 */
export function isOrderDeadlinePassed(): boolean {
  const vnNow = getVietnamNow();
  const deadline = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 11, 10, 0);
  return vnNow.getTime() >= deadline.getTime();
}

/**
 * Hook theo dõi đếm ngược thời gian còn lại đến hạn chốt cơm 11:10
 */
export function useOrderDeadline(): OrderDeadlineState {
  const calculateState = (): OrderDeadlineState => {
    const vnNow = getVietnamNow();
    const deadline = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 11, 10, 0);
    const diffMs = deadline.getTime() - vnNow.getTime();

    if (diffMs <= 0) {
      return {
        isPassed: true,
        isUrgent: false,
        isCritical: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedTime: '00:00:00',
        deadlineString: '11:10'
      };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formattedTime = hours > 0
      ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(minutes)}m ${pad(seconds)}s`;

    return {
      isPassed: false,
      isUrgent: diffMs <= 40 * 60 * 1000, // Còn dưới 40 phút
      isCritical: diffMs <= 10 * 60 * 1000, // Còn dưới 10 phút
      hours,
      minutes,
      seconds,
      formattedTime,
      deadlineString: '11:10'
    };
  };

  const [state, setState] = useState<OrderDeadlineState>(calculateState);

  useEffect(() => {
    // Cập nhật mỗi 1 giây để đếm ngược mượt mà
    const timer = setInterval(() => {
      setState(calculateState());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return state;
}

interface OrderDeadlineCountdownProps {
  isAdmin?: boolean;
  className?: string;
  variant?: 'banner' | 'compact' | 'pill';
}

export const OrderDeadlineCountdown: React.FC<OrderDeadlineCountdownProps> = ({
  isAdmin = false,
  className = '',
  variant = 'banner'
}) => {
  const { isPassed, isUrgent, isCritical, formattedTime, deadlineString } = useOrderDeadline();

  // Render dạng pill nhỏ gọn trên header
  if (variant === 'pill') {
    if (isPassed) {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          <Lock size={12} className="text-slate-500" />
          <span>Đã chốt ({deadlineString})</span>
          {isAdmin && <span className="text-[10px] text-amber-600 font-medium">• Admin</span>}
        </div>
      );
    }

    if (isCritical) {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse ${className}`}>
          <AlertTriangle size={12} className="text-red-600" />
          <span>Hạn chót {deadlineString} (còn {formattedTime})</span>
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isUrgent ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} ${className}`}>
        <Clock size={12} className={isUrgent ? 'text-amber-600' : 'text-emerald-600'} />
        <span>Chốt lúc {deadlineString} ({formattedTime})</span>
      </div>
    );
  }

  // Render dạng Banner nổi bật trên đầu Menu
  if (isPassed) {
    return (
      <div className={`rounded-2xl border p-4 sm:p-4.5 transition-all ${isAdmin ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-800'} ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base">
                  Đã hết giờ đặt cơm hôm nay (Hạn chót: {deadlineString})
                </h4>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900">
                    <ShieldCheck size={12} />
                    Admin Bypass
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm opacity-80 mt-0.5">
                {isAdmin
                  ? 'Bếp đã chốt số lượng suất ăn. Bạn đang đăng nhập quyền Quản trị viên nên vẫn có thể tạo hoặc đổi món nếu cần hỗ trợ nhân viên.'
                  : 'Hệ thống đã khóa tính năng đặt và sửa món sau 11h10 để bếp nấu. Vui lòng liên hệ Admin nếu bạn cần hỗ trợ gấp.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Khi chưa đến giờ chốt
  return (
    <div className={`rounded-2xl border p-4 sm:p-4.5 transition-all shadow-sm ${
      isCritical 
        ? 'bg-red-500/10 border-red-500/30 text-red-950 animate-pulse' 
        : isUrgent 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-950' 
          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isCritical ? 'bg-red-500 text-white' : isUrgent ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {isCritical ? <AlertTriangle size={20} /> : <Clock size={20} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCritical ? 'bg-red-200 text-red-900' : isUrgent ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isCritical ? 'Sắp hết hạn' : isUrgent ? 'Gần giờ chốt' : 'Thời gian đặt cơm'}
              </span>
              <span className="text-xs opacity-75 font-medium">Hạn chót: {deadlineString} trưa nay</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold mt-0.5 truncate">
              {isCritical
                ? 'Khẩn cấp: Hãy hoàn tất đặt món hoặc chỉnh sửa ngay trước khi hệ thống khóa sổ!'
                : isUrgent
                  ? 'Vui lòng chốt món sớm để quán cơm chuẩn bị nguyên liệu kịp thời.'
                  : 'Bạn có thể chọn món, đổi món hoặc thêm ghi chú trước giờ chốt.'}
            </p>
          </div>
        </div>

        {/* Khung đồng hồ đếm ngược */}
        <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-black/5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Còn lại:</span>
          <span className={`font-mono text-base sm:text-lg font-black tracking-tight ${
            isCritical ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-emerald-700'
          }`}>
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderDeadlineCountdown;
