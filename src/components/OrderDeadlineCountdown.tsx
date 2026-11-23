import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Lock, ShieldCheck, ToggleLeft } from 'lucide-react';
import { deadlineAPI } from '../services/api';

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

// Clock offset between server and client (serverNow - Date.now()) so countdown & deadline always match server
let serverClockOffsetMs = 0;

export function getSyncedNowMs(): number {
  return Date.now() + serverClockOffsetMs;
}

function updateServerClockOffset(serverNow?: number) {
  if (typeof serverNow === 'number' && Number.isFinite(serverNow) && serverNow > 0) {
    serverClockOffsetMs = serverNow - Date.now();
  }
}

function normalizeDateStr(rawDate?: string): string {
  if (!rawDate) return '';
  const match = String(rawDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return rawDate;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

/**
 * Lấy ngày tháng năm theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 */
export function getVietnamDateParts(date = new Date(getSyncedNowMs())) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  return {
    year,
    month,
    day,
    dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  };
}

/**
 * Lấy mốc 11:00 AM VN (UTC+7 = 04:00 AM UTC) dưới dạng epoch timestamp chuẩn xác
 */
export function getVietnam1100Timestamp(date = new Date(getSyncedNowMs())): number {
  const { year, month, day } = getVietnamDateParts(date);
  return Date.UTC(year, month - 1, day, 4, 0, 0);
}

/**
 * Lấy mốc 11:15 AM VN (UTC+7 = 04:15 AM UTC) dưới dạng epoch timestamp chuẩn xác
 */
export function getVietnam1115Timestamp(date = new Date(getSyncedNowMs())): number {
  const { year, month, day } = getVietnamDateParts(date);
  return Date.UTC(year, month - 1, day, 4, 15, 0);
}

/**
 * Lấy trạng thái ghi đè của Admin từ localStorage
 */
export function getDeadlineOverride(): DeadlineOverrideData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: 'auto', date: '' };
    const parsed: DeadlineOverrideData = JSON.parse(raw);
    const { dateString } = getVietnamDateParts();
    if (normalizeDateStr(parsed.date) !== dateString) {
      // Sang ngày mới tự động hoàn về chế độ Auto
      return { mode: 'auto', date: dateString };
    }
    return { ...parsed, date: dateString };
  } catch {
    return { mode: 'auto', date: '' };
  }
}

/**
 * Admin đặt trạng thái ghi đè: [Tự động theo giờ / Khóa đơn ngay lập tức / Mở thêm 15 phút]
 * Đồng bộ cả LocalStorage và Backend Server (phát tán realtime tới toàn bộ user)
 */
export async function setDeadlineOverride(mode: AdminDeadlineMode): Promise<void> {
  const { dateString } = getVietnamDateParts();
  let extendedUntilTimestamp: number | undefined;

  if (mode === 'extended_15') {
    // Gia hạn đến 11:15 hoặc +15 phút từ thời điểm hiện tại nếu đã quá 11:15
    const base1115Utc = getVietnam1115Timestamp();
    extendedUntilTimestamp = Math.max(base1115Utc, getSyncedNowMs() + 15 * 60 * 1000);
  }

  const data: DeadlineOverrideData = {
    mode,
    date: dateString,
    extendedUntilTimestamp
  };

  // 1. Phản hồi tức thì trên UI Admin
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));
  } catch (e) {
    console.error('Failed to save deadline override locally', e);
  }

  // Thông báo xác nhận thao tác cho Admin
  if (mode === 'extended_15' && extendedUntilTimestamp) {
    const timeStr = new Date(extendedUntilTimestamp).toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    alert(`⏳ Đã mở thêm 15 phút đặt cơm cho toàn bộ nhân viên!\nHạn chốt mới là: ${timeStr}`);
  } else if (mode === 'locked') {
    alert('🔒 Đã khóa nhận đơn cơm hôm nay!');
  } else if (mode === 'auto') {
    alert('⏱️ Đã chuyển về chế độ chốt đơn tự động (11:00)!');
  }

  // 2. Đồng bộ lên Backend Server để toàn bộ nhân viên và backend logic cùng mở
  try {
    const res: any = await deadlineAPI.setOverride(mode);
    updateServerClockOffset(res?.serverNow);
    if (res?.override) {
      const normalized = { ...res.override, date: normalizeDateStr(res.override.date) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
    }
  } catch (err: any) {
    console.error('Failed to sync deadline override to server:', err.message || err);
  }
}

/**
 * Kiểm tra xem đã quá hạn chốt đặt cơm hôm nay hay chưa (có tính toán override của Admin)
 */
export function isOrderDeadlinePassed(): boolean {
  const nowMs = getSyncedNowMs();
  const override = getDeadlineOverride();
  if (override.mode === 'locked') {
    return true;
  }
  if (override.mode === 'extended_15' && override.extendedUntilTimestamp) {
    return nowMs >= override.extendedUntilTimestamp;
  }
  const deadline1100Utc = getVietnam1100Timestamp();
  return nowMs >= deadline1100Utc;
}

/**
 * Hook theo dõi đếm ngược thời gian còn lại đến hạn chốt cơm
 */
export function useOrderDeadline(lang: 'vi' | 'en' | 'ja' = 'vi'): OrderDeadlineState {
  const calculateState = useCallback((): OrderDeadlineState => {
    const nowMs = getSyncedNowMs();
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
      deadlineString = new Date(deadlineMs).toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      deadlineMs = getVietnam1100Timestamp();
      deadlineString = '11:00';
    }

    const diffMs = deadlineMs - nowMs;

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
    return registerDeadlineServerSync();
  }, []);

  useEffect(() => {
    const updateIfChanged = () => {
      const next = calculateState();
      setState(prev => {
        if (
          prev.isPassed === next.isPassed &&
          prev.isUrgent === next.isUrgent &&
          prev.isCritical === next.isCritical &&
          prev.formattedTime === next.formattedTime &&
          prev.deadlineString === next.deadlineString &&
          prev.overrideMode === next.overrideMode
        ) {
          return prev;
        }
        return next;
      });
    };

    updateIfChanged();

    // Chỉ chạy timer 1 giây khi chưa hết giờ; nếu đã hết giờ chỉ kiểm tra nhẹ mỗi 30 giây (đề phòng qua ngày mới)
    const timer = setInterval(updateIfChanged, state.isPassed ? 30000 : 1000);

    window.addEventListener(EVENT_NAME, updateIfChanged);
    window.addEventListener('storage', updateIfChanged);
    document.addEventListener('visibilitychange', updateIfChanged);

    return () => {
      clearInterval(timer);
      window.removeEventListener(EVENT_NAME, updateIfChanged);
      window.removeEventListener('storage', updateIfChanged);
      document.removeEventListener('visibilitychange', updateIfChanged);
    };
  }, [calculateState, state.isPassed]);

  return state;
}

// =====================================================
// Singleton Server Sync (chỉ 1 vòng đồng bộ duy nhất cho toàn app)
// =====================================================
let activeDeadlineSyncSubscribers = 0;
let deadlineSyncInterval: ReturnType<typeof setInterval> | null = null;
let lastDeadlineSyncTime = 0;
let deadlineSyncInFlight = false;

async function syncDeadlineFromServerOnce(force = false) {
  const now = Date.now();
  if (deadlineSyncInFlight) return;
  if (!force && now - lastDeadlineSyncTime < 15000) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && !force) return;

  deadlineSyncInFlight = true;
  try {
    const res: any = await deadlineAPI.getOverride();
    lastDeadlineSyncTime = Date.now();
    updateServerClockOffset(res?.serverNow);
    if (res?.override) {
      const normalized = { ...res.override, date: normalizeDateStr(res.override.date) };
      const current = getDeadlineOverride();
      if (
        current.mode !== normalized.mode ||
        current.date !== normalized.date ||
        current.extendedUntilTimestamp !== normalized.extendedUntilTimestamp
      ) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
      }
    }
  } catch {
    // im lặng nếu mạng bận
  } finally {
    deadlineSyncInFlight = false;
  }
}

function handleDeadlineVisibilitySync() {
  if (document.visibilityState === 'visible') {
    syncDeadlineFromServerOnce(true);
  }
}

function registerDeadlineServerSync(): () => void {
  activeDeadlineSyncSubscribers += 1;
  if (activeDeadlineSyncSubscribers === 1) {
    syncDeadlineFromServerOnce(true);
    // Poll mỗi 15s để đồng bộ trạng thái hạn chốt từ admin tới toàn bộ thiết bị
    deadlineSyncInterval = setInterval(() => syncDeadlineFromServerOnce(false), 15000);
    document.addEventListener('visibilitychange', handleDeadlineVisibilitySync);
  }

  return () => {
    activeDeadlineSyncSubscribers = Math.max(0, activeDeadlineSyncSubscribers - 1);
    if (activeDeadlineSyncSubscribers === 0) {
      if (deadlineSyncInterval) {
        clearInterval(deadlineSyncInterval);
        deadlineSyncInterval = null;
      }
      document.removeEventListener('visibilitychange', handleDeadlineVisibilitySync);
    }
  };
}

/**
 * Hook siêu nhẹ dành cho App.tsx: CHỈ trigger re-render khi isPassed hoặc deadlineString thực sự thay đổi
 * (1–2 lần/ngày thay vì 86.400 lần/ngày).
 */
export function useOrderDeadlineStatus(): { isPassed: boolean; deadlineString: string; overrideMode: AdminDeadlineMode } {
  const computeStatus = useCallback(() => {
    const nowMs = getSyncedNowMs();
    const override = getDeadlineOverride();
    if (override.mode === 'locked') {
      return { isPassed: true, deadlineString: '11:00', overrideMode: 'locked' as AdminDeadlineMode };
    }
    if (override.mode === 'extended_15' && override.extendedUntilTimestamp) {
      const deadlineString = new Date(override.extendedUntilTimestamp).toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return {
        isPassed: nowMs >= override.extendedUntilTimestamp,
        deadlineString,
        overrideMode: 'extended_15' as AdminDeadlineMode
      };
    }
    return {
      isPassed: nowMs >= getVietnam1100Timestamp(),
      deadlineString: '11:00',
      overrideMode: override.mode
    };
  }, []);

  const [status, setStatus] = useState(computeStatus);

  useEffect(() => {
    return registerDeadlineServerSync();
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const next = computeStatus();
      setStatus(prev =>
        prev.isPassed === next.isPassed &&
        prev.deadlineString === next.deadlineString &&
        prev.overrideMode === next.overrideMode
          ? prev
          : next
      );
    };

    checkStatus();
    // Kiểm tra trạng thái chốt mỗi 5 giây khi chưa chốt (và 30s khi đã chốt) — chỉ setState khi thực sự chuyển trạng thái!
    const interval = setInterval(checkStatus, status.isPassed ? 30000 : 5000);
    window.addEventListener(EVENT_NAME, checkStatus);
    window.addEventListener('storage', checkStatus);
    document.addEventListener('visibilitychange', checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener(EVENT_NAME, checkStatus);
      window.removeEventListener('storage', checkStatus);
      document.removeEventListener('visibilitychange', checkStatus);
    };
  }, [computeStatus, status.isPassed]);

  return status;
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

  // Compact Inline Admin Switcher Control Component
  const adminSwitcher = isAdmin && (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
        <ShieldCheck size={13} className="text-amber-600" />
        <span>{d?.adminOverrideLabel || 'Khóa sổ:'}</span>
      </span>
      <div className="inline-flex rounded-lg bg-slate-200/90 p-0.5 text-[11px] font-bold gap-0.5 shadow-inner">
        <button
          type="button"
          onClick={() => setDeadlineOverride('auto')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
            overrideMode === 'auto'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⏱️</span>
          <span>{d?.adminOverrideAuto || 'Tự động (11:00)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setDeadlineOverride('locked')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
            overrideMode === 'locked'
              ? 'bg-red-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-red-700'
          }`}
        >
          <span>🔒</span>
          <span>{d?.adminOverrideLock || 'Khóa ngay'}</span>
        </button>
        <button
          type="button"
          onClick={() => setDeadlineOverride('extended_15')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
            overrideMode === 'extended_15'
              ? 'bg-amber-500 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-amber-700'
          }`}
        >
          <span>⏳</span>
          <span>{d?.adminOverrideExtend15 || 'Mở thêm 15p'}</span>
        </button>
      </div>
    </div>
  );

  // Render dạng Banner nhỏ gọn trên đầu Menu
  if (isPassed) {
    const isManuallyLocked = overrideMode === 'locked';
    const mainTitle = isManuallyLocked
      ? (d?.adminLockedTitle || 'Hệ thống đã khóa nhận đơn sớm')
      : (d?.passedTitle || 'Đã hết giờ đặt cơm hôm nay');
    const titleText = (d?.passedCutoff || 'Hạn chót: {deadline}').replace('{deadline}', deadlineString);

    return (
      <div className={`rounded-xl border px-3.5 py-2 sm:py-2.5 transition-all ${
        isManuallyLocked 
          ? 'bg-red-50 border-red-200 text-red-950'
          : isAdmin 
            ? 'bg-amber-50/75 border-amber-200 text-amber-900' 
            : 'bg-slate-100 border-slate-200 text-slate-800'
      } ${className}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isManuallyLocked 
                ? 'bg-red-100 text-red-700'
                : isAdmin 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-slate-200 text-slate-600'
            }`}>
              <Lock size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm leading-tight">
                  {mainTitle} {!isManuallyLocked && `(${titleText})`}
                </h4>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    <ShieldCheck size={11} />
                    {d?.adminBypass || 'Admin Bypass'}
                  </span>
                )}
                {isManuallyLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-900">
                    {d?.pillAdminLocked || 'Khóa sớm bởi Admin'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs opacity-75 truncate">
                {isManuallyLocked
                  ? (d?.adminLockedDesc || 'Quản trị viên đã bấm khóa nhận đơn sớm để chốt số lượng cho bếp.')
                  : isAdmin
                    ? (d?.passedDescAdmin || 'Bếp đã chốt suất ăn. Quyền Quản trị viên vẫn có thể đặt/đổi món hỗ trợ nhân viên.')
                    : (d?.passedDescUser || 'Hệ thống đã khóa đặt và sửa món sau {deadline}. Liên hệ Admin nếu cần hỗ trợ gấp.').replace('{deadline}', deadlineString)}
              </p>
            </div>
          </div>
          {adminSwitcher}
        </div>
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
    ? (d?.adminExtendedCutoff || 'Hạn chót mới: {deadline}').replace('{deadline}', deadlineString)
    : (d?.todayCutoff || 'Hạn chót: {deadline} trưa nay').replace('{deadline}', deadlineString);

  const messageText = isExtended
    ? (d?.adminExtendedDesc || 'Bếp đã gia hạn mở thêm 15 phút đặt cơm ({deadline}).').replace('{deadline}', deadlineString)
    : isCritical
      ? (d?.msgCritical || 'Khẩn cấp: Hoàn tất đặt món trước khi hệ thống khóa sổ!')
      : isUrgent
        ? (d?.msgUrgent || 'Vui lòng chốt món sớm để quán cơm chuẩn bị kịp thời.')
        : (d?.msgNormal || 'Bạn có thể chọn món, đổi món hoặc thêm ghi chú trước giờ chốt.');

  return (
    <div className={`rounded-xl border px-3.5 py-2 sm:py-2.5 transition-all shadow-xs ${
      isExtended
        ? 'bg-amber-50 border-amber-300 text-amber-950'
        : isCritical 
          ? 'bg-red-500/10 border-red-500/30 text-red-950 animate-pulse' 
          : isUrgent 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-950' 
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950'
    } ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isExtended 
              ? 'bg-amber-500 text-white'
              : isCritical 
                ? 'bg-red-500 text-white' 
                : isUrgent 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-emerald-600 text-white'
          }`}>
            {isCritical ? <AlertTriangle size={16} /> : <Clock size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
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
              <span className="text-[11px] opacity-75 font-semibold">{todayCutoffText}</span>
            </div>
            <p className="text-xs font-medium mt-0.5 truncate opacity-85">
              {messageText}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 flex-wrap">
          {/* Khung đồng hồ đếm ngược nhỏ gọn */}
          <div className="shrink-0 flex items-center gap-1.5 bg-white/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-black/5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500">{d?.timeLeft || 'Còn lại:'}</span>
            <span className={`font-mono text-sm font-black tracking-tight ${
              isCritical ? 'text-red-600' : isUrgent || isExtended ? 'text-amber-600' : 'text-emerald-700'
            }`}>
              {formattedTime}
            </span>
          </div>
          {adminSwitcher}
        </div>
      </div>
    </div>
  );
};

export default OrderDeadlineCountdown;
