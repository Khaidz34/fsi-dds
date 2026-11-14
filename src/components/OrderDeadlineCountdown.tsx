import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Lock, ShieldCheck, ToggleLeft } from 'lucide-react';

export type AdminDeadlineMode = 'auto' | 'locked' | 'extended_15';

export interface OrderDeadlineState {
  isPassed: boolean;
  isUrgent: boolean; // < 40 mins
  isCritical: boolean; // < 10 mins
  hours: number;
  minutes: number;
  seconds: number;
  formattedTime: string;
  deadlineString: string;
  overrideMode: AdminDeadlineMode;
}

interface DeadlineOverrideData {
  mode: AdminDeadlineMode;
  date: string; // YYYY-MM-DD
  extendedUntilTimestamp?: number;
}

const STORAGE_KEY = 'fsi_order_deadline_override';
const EVENT_NAME = 'fsi_order_deadline_override_changed';

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 */
export function getVietnamNow(): Date {
  const now = new Date();
  const vnString = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  return new Date(vnString);
}

/**
 * Lấy trạng thái ghi đè của Admin từ localStorage
 */
export function getDeadlineOverride(): DeadlineOverrideData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: 'auto', date: '' };
    const parsed: DeadlineOverrideData = JSON.parse(raw);
    const vnNow = getVietnamNow();
    const today = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`;
    if (parsed.date !== today) {
      // Sang ngày mới tự động hoàn về chế độ Auto
      return { mode: 'auto', date: today };
    }
    return parsed;
  } catch {
    return { mode: 'auto', date: '' };
  }
}

/**
 * Admin đặt trạng thái ghi đè: [Tự động theo giờ / Khóa đơn ngay lập tức / Mở thêm 15 phút]
 */
export function setDeadlineOverride(mode: AdminDeadlineMode): void {
  const vnNow = getVietnamNow();
  const today = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`;
  let extendedUntilTimestamp: number | undefined;

  if (mode === 'extended_15') {
    // Gia hạn đến 11:15 hoặc +15 phút từ thời điểm bấm nếu đã quá 11:15
    const base1115 = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 11, 15, 0).getTime();
    extendedUntilTimestamp = Math.max(base1115, vnNow.getTime() + 15 * 60 * 1000);
  }

  const data: DeadlineOverrideData = {
    mode,
    date: today,
    extendedUntilTimestamp
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));
  } catch (e) {
    console.error('Failed to save deadline override', e);
  }
}

/**
 * Kiểm tra xem đã quá hạn chốt đặt cơm hôm nay hay chưa (có tính toán override của Admin)
 */
export function isOrderDeadlinePassed(): boolean {
  const override = getDeadlineOverride();
  if (override.mode === 'locked') {
    return true;
  }
  const vnNow = getVietnamNow();
  if (override.mode === 'extended_15' && override.extendedUntilTimestamp) {
    return vnNow.getTime() >= override.extendedUntilTimestamp;
  }
  const deadline = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 11, 0, 0);
  return vnNow.getTime() >= deadline.getTime();
}

/**
 * Hook theo dõi đếm ngược thời gian còn lại đến hạn chốt cơm
 */
export function useOrderDeadline(lang: 'vi' | 'en' | 'ja' = 'vi'): OrderDeadlineState {
  const calculateState = useCallback((): OrderDeadlineState => {
    const vnNow = getVietnamNow();
    const override = getDeadlineOverride();

    // 1. Chế độ Khóa đơn ngay lập tức bởi Admin
    if (override.mode === 'locked') {
      return {
        isPassed: true,
        isUrgent: false,
        isCritical: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedTime: '00:00:00',
        deadlineString: '11:00',
        overrideMode: 'locked'
      };
    }

    // 2. Xác định mốc deadline: 11:00 hoặc thời gian gia hạn
    let deadlineMs: number;
    let deadlineString = '11:00';

    if (override.mode === 'extended_15' && override.extendedUntilTimestamp) {
      deadlineMs = override.extendedUntilTimestamp;
      const extDate = new Date(deadlineMs);
      const extH = String(extDate.getHours()).padStart(2, '0');
      const extM = String(extDate.getMinutes()).padStart(2, '0');
      deadlineString = `${extH}:${extM}`;
    } else {
      const deadline = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 11, 0, 0);
      deadlineMs = deadline.getTime();
    }

    const diffMs = deadlineMs - vnNow.getTime();

    if (diffMs <= 0) {
      return {
        isPassed: true,
        isUrgent: false,
        isCritical: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedTime: '00:00:00',
        deadlineString,
        overrideMode: override.mode
      };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    let formattedTime = '';
    if (lang === 'ja') {
      formattedTime = hours > 0
        ? `${hours}時間 ${pad(minutes)}分 ${pad(seconds)}秒`
        : `${pad(minutes)}分 ${pad(seconds)}秒`;
    } else {
      formattedTime = hours > 0
        ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
        : `${pad(minutes)}m ${pad(seconds)}s`;
    }

    return {
      isPassed: false,
      isUrgent: diffMs <= 40 * 60 * 1000,
      isCritical: diffMs <= 10 * 60 * 1000,
      hours,
      minutes,
      seconds,
      formattedTime,
      deadlineString,
      overrideMode: override.mode
    };
  }, [lang]);

  const [state, setState] = useState<OrderDeadlineState>(calculateState);

  useEffect(() => {
    setState(calculateState());

    const timer = setInterval(() => {
      setState(calculateState());
    }, 1000);

    const handleOverrideChange = () => {
      setState(calculateState());
    };

    window.addEventListener(EVENT_NAME, handleOverrideChange);
    window.addEventListener('storage', handleOverrideChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener(EVENT_NAME, handleOverrideChange);
      window.removeEventListener('storage', handleOverrideChange);
    };
  }, [calculateState]);

  return state;
}

interface OrderDeadlineCountdownProps {
  isAdmin?: boolean;
  className?: string;
  variant?: 'banner' | 'compact' | 'pill';
  currentLang?: 'vi' | 'en' | 'ja';
  translations?: any;
}

export const OrderDeadlineCountdown: React.FC<OrderDeadlineCountdownProps> = ({
  isAdmin = false,
  className = '',
  variant = 'banner',
  currentLang = 'vi',
  translations: t
}) => {
  const d = t?.deadline;
  const { isPassed, isUrgent, isCritical, formattedTime, deadlineString, overrideMode } = useOrderDeadline(currentLang);

  // Render dạng pill nhỏ gọn trên header
  if (variant === 'pill') {
    if (overrideMode === 'locked') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 ${className}`}>
          <Lock size={12} className="text-red-700" />
          <span>{d?.pillAdminLocked || 'Khóa sớm bởi Admin'}</span>
          {isAdmin && <span className="text-[10px] text-amber-700 font-medium">• Admin</span>}
        </div>
      );
    }

    if (overrideMode === 'extended_15' && !isPassed) {
      const text = (d?.pillAdminExtended || 'Gia hạn 15p ({time})').replace('{time}', formattedTime);
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse ${className}`}>
          <Clock size={12} className="text-amber-700" />
          <span>{text}</span>
          {isAdmin && <span className="text-[10px] text-amber-700 font-medium">• Admin</span>}
        </div>
      );
    }

    if (isPassed) {
      const text = (d?.pillPassed || 'Đã chốt ({deadline})').replace('{deadline}', deadlineString);
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          <Lock size={12} className="text-slate-500" />
          <span>{text}</span>
          {isAdmin && <span className="text-[10px] text-amber-600 font-medium">• Admin</span>}
        </div>
      );
    }

    if (isCritical) {
      const text = (d?.pillCritical || 'Hạn chót {deadline} (còn {time})')
        .replace('{deadline}', deadlineString)
        .replace('{time}', formattedTime);
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse ${className}`}>
          <AlertTriangle size={12} className="text-red-600" />
          <span>{text}</span>
        </div>
      );
    }

    const text = (d?.pillNormal || 'Chốt lúc {deadline} ({time})')
      .replace('{deadline}', deadlineString)
      .replace('{time}', formattedTime);

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isUrgent ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} ${className}`}>
        <Clock size={12} className={isUrgent ? 'text-amber-600' : 'text-emerald-600'} />
        <span>{text}</span>
      </div>
    );
  }

  // Admin Switcher Control Component
  const adminSwitcher = isAdmin && (
    <div className="mt-3.5 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
        <ShieldCheck size={15} className="text-amber-600" />
        <span>{d?.adminOverrideLabel || 'Chế độ khóa sổ (Admin):'}</span>
      </div>
      <div className="inline-flex rounded-xl bg-slate-200/90 p-1 text-xs font-bold gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => setDeadlineOverride('auto')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            overrideMode === 'auto'
              ? 'bg-white text-slate-900 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⏱️</span>
          <span>{d?.adminOverrideAuto || 'Tự động (11:00)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setDeadlineOverride('locked')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            overrideMode === 'locked'
              ? 'bg-red-600 text-white shadow-sm font-black'
              : 'text-slate-600 hover:text-red-700'
          }`}
        >
          <span>🔒</span>
          <span>{d?.adminOverrideLock || 'Khóa ngay'}</span>
        </button>
        <button
          type="button"
          onClick={() => setDeadlineOverride('extended_15')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            overrideMode === 'extended_15'
              ? 'bg-amber-500 text-white shadow-sm font-black'
              : 'text-slate-600 hover:text-amber-700'
          }`}
        >
          <span>⏳</span>
          <span>{d?.adminOverrideExtend15 || 'Mở thêm 15p'}</span>
        </button>
      </div>
    </div>
  );

  // Render dạng Banner nổi bật trên đầu Menu
  if (isPassed) {
    const isManuallyLocked = overrideMode === 'locked';
    const mainTitle = isManuallyLocked
      ? (d?.adminLockedTitle || 'Hệ thống đã khóa nhận đơn sớm')
      : (d?.passedTitle || 'Đã hết giờ đặt cơm hôm nay');
    const titleText = (d?.passedCutoff || 'Hạn chót: {deadline}').replace('{deadline}', deadlineString);

    return (
      <div className={`rounded-2xl border p-4 sm:p-4.5 transition-all ${
        isManuallyLocked 
          ? 'bg-red-50 border-red-200 text-red-950'
          : isAdmin 
            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
            : 'bg-slate-100 border-slate-200 text-slate-800'
      } ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isManuallyLocked 
                ? 'bg-red-100 text-red-700'
                : isAdmin 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-slate-200 text-slate-600'
            }`}>
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base">
                  {mainTitle} {!isManuallyLocked && `(${titleText})`}
                </h4>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900">
                    <ShieldCheck size={12} />
                    {d?.adminBypass || 'Admin Bypass'}
                  </span>
                )}
                {isManuallyLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-200 text-red-900">
                    {d?.pillAdminLocked || 'Khóa sớm bởi Admin'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm opacity-80 mt-0.5">
                {isManuallyLocked
                  ? (d?.adminLockedDesc || 'Quản trị viên đã bấm khóa nhận đơn sớm để chốt số lượng cho bếp.')
                  : isAdmin
                    ? (d?.passedDescAdmin || 'Bếp đã chốt số lượng suất ăn. Bạn đang đăng nhập quyền Quản trị viên nên vẫn có thể tạo hoặc đổi món nếu cần hỗ trợ nhân viên.')
                    : (d?.passedDescUser || 'Hệ thống đã khóa tính năng đặt và sửa món sau {deadline} để bếp nấu. Vui lòng liên hệ Admin nếu bạn cần hỗ trợ gấp.').replace('{deadline}', deadlineString)}
              </p>
            </div>
          </div>
        </div>
        {adminSwitcher}
      </div>
    );
  }

  // Khi chưa đến giờ chốt (hoặc đang mở thêm 15p)
  const isExtended = overrideMode === 'extended_15';
  const tagText = isExtended
    ? (d?.adminExtendedTitle || 'Đã mở thêm thời gian')
    : isCritical
      ? (d?.tagCritical || 'Sắp hết hạn')
      : isUrgent
        ? (d?.tagUrgent || 'Gần giờ chốt')
        : (d?.tagNormal || 'Thời gian đặt cơm');

  const todayCutoffText = isExtended
    ? (d?.adminExtendedDesc || 'Bếp đã gia hạn mở thêm 15 phút đặt cơm ({deadline})').replace('{deadline}', deadlineString)
    : (d?.todayCutoff || 'Hạn chót: {deadline} trưa nay').replace('{deadline}', deadlineString);

  const messageText = isExtended
    ? (d?.adminExtendedDesc || 'Bếp đã gia hạn mở thêm 15 phút đặt cơm ({deadline})').replace('{deadline}', deadlineString)
    : isCritical
      ? (d?.msgCritical || 'Khẩn cấp: Hãy hoàn tất đặt món hoặc chỉnh sửa ngay trước khi hệ thống khóa sổ!')
      : isUrgent
        ? (d?.msgUrgent || 'Vui lòng chốt món sớm để quán cơm chuẩn bị nguyên liệu kịp thời.')
        : (d?.msgNormal || 'Bạn có thể chọn món, đổi món hoặc thêm ghi chú trước giờ chốt.');

  return (
    <div className={`rounded-2xl border p-4 sm:p-4.5 transition-all shadow-sm ${
      isExtended
        ? 'bg-amber-50 border-amber-300 text-amber-950'
        : isCritical 
          ? 'bg-red-500/10 border-red-500/30 text-red-950 animate-pulse' 
          : isUrgent 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-950' 
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isExtended 
              ? 'bg-amber-500 text-white'
              : isCritical 
                ? 'bg-red-500 text-white' 
                : isUrgent 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-emerald-600 text-white'
          }`}>
            {isCritical ? <AlertTriangle size={20} /> : <Clock size={20} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isExtended
                  ? 'bg-amber-200 text-amber-950'
                  : isCritical 
                    ? 'bg-red-200 text-red-900' 
                    : isUrgent 
                      ? 'bg-amber-200 text-amber-900' 
                      : 'bg-emerald-200 text-emerald-900'
              }`}>
                {tagText}
              </span>
              <span className="text-xs opacity-75 font-medium">{todayCutoffText}</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold mt-0.5 truncate">
              {messageText}
            </p>
          </div>
        </div>

        {/* Khung đồng hồ đếm ngược */}
        <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-black/5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">{d?.timeLeft || 'Còn lại:'}</span>
          <span className={`font-mono text-base sm:text-lg font-black tracking-tight ${
            isCritical ? 'text-red-600' : isUrgent || isExtended ? 'text-amber-600' : 'text-emerald-700'
          }`}>
            {formattedTime}
          </span>
        </div>
      </div>
      {adminSwitcher}
    </div>
  );
};

export default OrderDeadlineCountdown;
