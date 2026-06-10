import React, { useState, useEffect } from 'react';

import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  ShoppingBag, 
  CheckCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Utensils,
  QrCode,
  Copy,
  RefreshCw,
  AlertCircle,
  Building2,
  History
} from 'lucide-react';
import { usePayments } from '../hooks/usePayments';
import { useMonthlyOrders } from '../hooks/useMonthlyOrders';
import { useAuth } from '../contexts/AuthContext';
import { paymentsAPI } from '../services/api';

interface PaymentStats {
  month: string;
  ordersCount: number;
  ordersTotal: number;
  paidCount: number;
  paidTotal: number;
  remainingCount: number;
  remainingTotal: number;
  paidAt?: string;
}

interface DayOrder {
  date: string;
  count: number;
}

interface AutoPaymentInfo {
  userId: number;
  month: string;
  code: string;
  amount: number;
  remainingTotal: number;
  isPaid: boolean;
  bankConfigured: boolean;
  bank: {
    bankId: string;
    accountNo: string;
    accountName?: string;
  } | null;
  qrUrl?: string | null;
}

interface AutoPaymentUsage {
  supported: boolean;
  month: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  usagePercent: number | null;
  completed: number;
  failed: number;
  processing: number;
}

interface PaymentHistoryItem {
  id: number;
  amount: number;
  status?: string | null;
  method?: string | null;
  notes?: string | null;
  created_at: string;
}

interface PaymentDashboardProps {
  translations: any;
}

const DEFAULT_MEAL_PRICE = 40000;

const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ translations }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const { user } = useAuth();
  const { paymentStats, isLoading, isRefreshing, refetch } = usePayments(currentMonth);
  const { orders } = useMonthlyOrders(currentMonth);
  const [autoPaymentInfo, setAutoPaymentInfo] = useState<AutoPaymentInfo | null>(null);
  const [isAutoPaymentLoading, setIsAutoPaymentLoading] = useState(false);
  const [autoPaymentError, setAutoPaymentError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState(0);
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [autoPaymentQrFailed, setAutoPaymentQrFailed] = useState(false);
  const [autoPaymentUsage, setAutoPaymentUsage] = useState<AutoPaymentUsage | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(false);

  // Tạo dữ liệu calendar từ orders thực tế
  const [monthlyOrders, setMonthlyOrders] = useState<DayOrder[]>([]);

  useEffect(() => {
    // Tạo dữ liệu calendar từ orders
    const ordersByDate: { [key: string]: number } = {};
    
    orders.forEach(order => {
      const date = order.created_at ? order.created_at.split('T')[0] : null;
      if (date && date.startsWith(currentMonth)) {
        ordersByDate[date] = (ordersByDate[date] || 0) + 1;
      }
    });

    const calendarData = Object.entries(ordersByDate).map(([date, count]) => ({
      date,
      count
    }));

    setMonthlyOrders(calendarData);
  }, [orders, currentMonth]);

  const loadAutoPaymentInfo = async () => {
    if (!user || user.role === 'admin') {
      setAutoPaymentInfo(null);
      return;
    }

    try {
      setIsAutoPaymentLoading(true);
      setAutoPaymentError(null);
      setAutoPaymentQrFailed(false);
      const info = await paymentsAPI.getAutoInfo(currentMonth);
      setAutoPaymentInfo(info);
    } catch (error) {
      console.error('Auto payment info error:', error);
      setAutoPaymentError(error instanceof Error ? error.message : 'Không tải được thông tin thanh toán tự động');
    } finally {
      setIsAutoPaymentLoading(false);
    }
  };

  const loadAutoPaymentUsage = async () => {
    if (!user || user.role === 'admin') {
      setAutoPaymentUsage(null);
      return;
    }

    try {
      const usage = await paymentsAPI.getAutoUsage(currentMonth);
      setAutoPaymentUsage(usage);
    } catch (error) {
      console.error('Auto payment usage error:', error);
      setAutoPaymentUsage(null);
    }
  };

  const loadPaymentHistory = async () => {
    if (!user || user.role === 'admin') {
      setPaymentHistory([]);
      return;
    }

    try {
      setIsPaymentHistoryLoading(true);
      const response = await paymentsAPI.getMyHistory(currentMonth, 50);
      setPaymentHistory(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('My payment history error:', error);
      setPaymentHistory([]);
    } finally {
      setIsPaymentHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAutoPaymentInfo();
    loadAutoPaymentUsage();
    loadPaymentHistory();
  }, [currentMonth, user?.id, user?.role, paymentStats?.remainingTotal]);

  useEffect(() => {
    if (!autoPaymentInfo || autoPaymentInfo.isPaid) {
      setSelectedPaymentAmount(0);
      setCustomPaymentAmount('');
      return;
    }

    const amount = Math.max(0, Number(autoPaymentInfo.amount || autoPaymentInfo.remainingTotal || 0));
    setSelectedPaymentAmount(amount);
    setCustomPaymentAmount(amount ? String(amount) : '');
    setAutoPaymentQrFailed(false);
  }, [autoPaymentInfo?.code, autoPaymentInfo?.amount, autoPaymentInfo?.remainingTotal, autoPaymentInfo?.isPaid]);

  const handleRefreshAutoPayment = async () => {
    await refetch();
    await loadAutoPaymentInfo();
    await loadAutoPaymentUsage();
    await loadPaymentHistory();
  };

  const copyToClipboard = async (value: string, field: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1600);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const getPaymentMethodLabel = (payment: PaymentHistoryItem) => {
    if (payment.method === 'transfer') return 'Chuyển khoản';
    if (payment.method === 'cash') return 'Admin xác nhận';
    if (payment.notes?.includes('source:bank-webhook')) return 'Chuyển khoản';
    if (payment.notes?.includes('source:manual')) return 'Admin xác nhận';
    return 'Thanh toán';
  };

  const getPaymentCodeFromNotes = (notes?: string | null) => {
    if (!notes) return null;
    const match = notes.match(/code:([^|]+)/);
    return match?.[1]?.trim() || null;
  };

  const formatPaymentDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';

    return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  const getMaxAutoPaymentAmount = (info: AutoPaymentInfo) =>
    Math.max(0, Number(info.amount || info.remainingTotal || 0));

  const normalizePaymentAmount = (value: number, maxAmount: number) => {
    const rounded = Math.floor(Number(value) || 0);
    if (rounded <= 0) return 0;
    return Math.min(rounded, maxAmount);
  };

  const getPaymentAmountOptions = (info: AutoPaymentInfo) => {
    const maxAmount = getMaxAutoPaymentAmount(info);
    const options = [
      { label: '1 suất', value: DEFAULT_MEAL_PRICE },
      { label: '2 suất', value: DEFAULT_MEAL_PRICE * 2 }
    ].filter((option) => option.value > 0 && option.value < maxAmount);

    if (maxAmount > 0) {
      options.push({ label: 'Trả hết', value: maxAmount });
    }

    return options;
  };

  const selectPaymentAmount = (amount: number, info: AutoPaymentInfo) => {
    const normalizedAmount = normalizePaymentAmount(amount, getMaxAutoPaymentAmount(info));
    setAutoPaymentQrFailed(false);
    setSelectedPaymentAmount(normalizedAmount);
    setCustomPaymentAmount(normalizedAmount ? String(normalizedAmount) : '');
  };

  const handleCustomPaymentAmountChange = (value: string, info: AutoPaymentInfo) => {
    const digitsOnly = value.replace(/[^\d]/g, '');

    if (!digitsOnly) {
      setSelectedPaymentAmount(0);
      setCustomPaymentAmount('');
      setAutoPaymentQrFailed(false);
      return;
    }

    const normalizedAmount = normalizePaymentAmount(Number(digitsOnly), getMaxAutoPaymentAmount(info));
    setAutoPaymentQrFailed(false);
    setSelectedPaymentAmount(normalizedAmount);
    setCustomPaymentAmount(String(normalizedAmount));
  };

  const buildClientVietQrUrl = (bankId: string, info: AutoPaymentInfo, amount: number) => {
    const safeAmount = normalizePaymentAmount(amount, getMaxAutoPaymentAmount(info));
    const params = new URLSearchParams({
      amount: String(Math.round(safeAmount)),
      addInfo: info.code
    });

    if (info.bank?.accountName) {
      params.set('accountName', info.bank.accountName);
    }

    return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(info.bank?.accountNo || '')}-compact2.png?${params.toString()}`;
  };

  const getCurrentQrUrl = (info: AutoPaymentInfo) => {
    const safeAmount = normalizePaymentAmount(selectedPaymentAmount, getMaxAutoPaymentAmount(info));

    if (autoPaymentQrFailed || !info.bankConfigured || !info.bank?.accountNo || safeAmount <= 0) {
      return null;
    }

    return buildClientVietQrUrl(info.bank.bankId, info, safeAmount);
  };

  const handleQrImageError = (event: React.SyntheticEvent<HTMLImageElement>, info: AutoPaymentInfo) => {
    const img = event.currentTarget;
    const fallbackState = img.dataset.fallbackState || 'primary';
    const safeAmount = normalizePaymentAmount(selectedPaymentAmount, getMaxAutoPaymentAmount(info));

    if (fallbackState === 'primary') {
      img.dataset.fallbackState = 'tpb';
      img.src = buildClientVietQrUrl('TPB', info, safeAmount);
      return;
    }

    if (fallbackState === 'tpb') {
      img.dataset.fallbackState = 'tpbank';
      img.src = buildClientVietQrUrl('TPBank', info, safeAmount);
      return;
    }

    setAutoPaymentQrFailed(true);
  };

  const generateCalendar = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const orderData = monthlyOrders.find(o => o.date === dateStr);
      days.push({
        day,
        date: dateStr,
        orderCount: orderData?.count || 0
      });
    }

    return days;
  };

  const currentDate = new Date(currentMonth + '-01');
  const calendarDays = generateCalendar(currentDate.getFullYear(), currentDate.getMonth());

  const navigateMonth = (direction: 'prev' | 'next') => {
    const date = new Date(currentMonth + '-01');
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!paymentStats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">{translations.paymentDashboard.noData}</p>
      </div>
    );
  }

  const getOrderCountColor = (count: number) => {
    if (count === 0) return 'bg-gray-50 text-gray-800';
    if (count === 1) return 'bg-green-100 text-green-900 border-green-200';
    if (count === 2) return 'bg-yellow-100 text-yellow-900 border-yellow-200';
    return 'bg-red-100 text-red-900 border-red-200';
  };

  const maxAutoPaymentAmount = autoPaymentInfo ? getMaxAutoPaymentAmount(autoPaymentInfo) : 0;
  const activeAutoPaymentAmount = normalizePaymentAmount(selectedPaymentAmount, maxAutoPaymentAmount);
  const autoPaymentAmountOptions = autoPaymentInfo ? getPaymentAmountOptions(autoPaymentInfo) : [];
  const currentAutoPaymentQrUrl = autoPaymentInfo ? getCurrentQrUrl(autoPaymentInfo) : null;
  const autoPaymentUsagePercent = autoPaymentUsage?.usagePercent || 0;
  const autoPaymentQuotaClass = autoPaymentUsagePercent >= 90
    ? 'bg-red-500'
    : autoPaymentUsagePercent >= 75
      ? 'bg-orange-500'
      : 'bg-blue-500';
  const isAutoPaymentQuotaExhausted = !!(
    autoPaymentUsage?.supported &&
    autoPaymentUsage.limit &&
    autoPaymentUsage.remaining === 0
  );

  return (
    <div className="space-y-8">
      {/* Payment Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all ${isRefreshing ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-4 relative">
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-xl">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{translations.paymentDashboard.totalMeals}</p>
              <p className="text-2xl font-bold text-gray-900">{paymentStats?.ordersCount || 0}</p>
            </div>
          </div>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all ${isRefreshing ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-4 relative">
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-xl">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
              </div>
            )}
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{translations.paymentDashboard.paid}</p>
              <p className="text-2xl font-bold text-green-600">{paymentStats?.paidTotal?.toLocaleString() || '0'}đ</p>
            </div>
          </div>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all ${isRefreshing ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-4 relative">
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-xl">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
              </div>
            )}
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{translations.paymentDashboard.unpaid}</p>
              <p className="text-2xl font-bold text-orange-600">{paymentStats?.remainingTotal?.toLocaleString() || '0'}đ</p>
              {paymentStats?.overpaidTotal && paymentStats.overpaidTotal > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Đã thanh toán thừa: {paymentStats.overpaidTotal.toLocaleString()}đ
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all ${isRefreshing ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-4 relative">
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-xl">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            )}
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{translations.paymentDashboard.totalAmount}</p>
              <p className="text-2xl font-bold text-gray-900">{paymentStats?.ordersTotal?.toLocaleString() || '0'}đ</p>
            </div>
          </div>
        </div>
      </div>

      {user?.role !== 'admin' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                <QrCode className="text-blue-600" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isAutoPaymentQuotaExhausted ? 'Thanh toán trực tiếp qua TPBank' : 'Thanh toán tự động'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isAutoPaymentQuotaExhausted
                    ? 'Hệ thống đã hết lượt tự động trong tháng. Chuyển khoản trực tiếp, admin sẽ xác nhận thủ công.'
                    : 'Quét mã VietQR để tự điền số tiền và nội dung chuyển khoản.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshAutoPayment}
              disabled={isAutoPaymentLoading || isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={isAutoPaymentLoading || isRefreshing ? 'animate-spin' : ''} />
              Cập nhật
            </button>
          </div>

          {autoPaymentUsage && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase font-bold text-blue-700">Lượt chuyển khoản tự động</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {autoPaymentUsage.remaining !== null
                      ? `${autoPaymentUsage.remaining.toLocaleString()} lượt còn lại`
                      : `${autoPaymentUsage.used.toLocaleString()} lượt đã dùng`}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {autoPaymentUsage.supported
                      ? autoPaymentUsage.limit
                        ? `Hệ thống đã dùng ${autoPaymentUsage.used.toLocaleString()} / ${autoPaymentUsage.limit.toLocaleString()} lượt trong tháng ${autoPaymentUsage.month}.`
                        : `Hệ thống đã nhận ${autoPaymentUsage.used.toLocaleString()} giao dịch trong tháng ${autoPaymentUsage.month}.`
                      : 'Hệ thống chưa bật bảng đếm giao dịch tự động.'}
                  </p>
                </div>

                {autoPaymentUsage.limit && (
                  <div className="w-full sm:w-56">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-2">
                      <span>Đã dùng</span>
                      <span>{autoPaymentUsagePercent}%</span>
                    </div>
                    <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
                      <div
                        className={`h-full rounded-full ${autoPaymentQuotaClass}`}
                        style={{ width: `${autoPaymentUsagePercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {autoPaymentUsage.remaining === 0 && autoPaymentUsage.limit && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                  Gói tự động đã hết lượt trong tháng. Giao diện đã chuyển sang thanh toán trực tiếp qua tài khoản TPBank; admin sẽ kiểm tra và xác nhận thủ công.
                </div>
              )}
            </div>
          )}

          {isAutoPaymentLoading && !autoPaymentInfo ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : autoPaymentError ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Chưa tải được thông tin thanh toán</p>
                <p className="text-sm mt-1">{autoPaymentError}</p>
              </div>
            </div>
          ) : autoPaymentInfo?.isPaid ? (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Tháng này đã được thanh toán</p>
                <p className="text-sm mt-1">
                  {isAutoPaymentQuotaExhausted
                    ? 'Nếu vừa chuyển khoản trực tiếp, admin sẽ kiểm tra và xác nhận thủ công.'
                    : 'Nếu vừa chuyển khoản, hãy bấm cập nhật sau khi ngân hàng gửi webhook về hệ thống.'}
                </p>
              </div>
            </div>
          ) : autoPaymentInfo ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_1fr]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-center min-h-[260px]">
                {currentAutoPaymentQrUrl ? (
                  <img
                    key={`${autoPaymentInfo.code}-${activeAutoPaymentAmount}`}
                    src={currentAutoPaymentQrUrl}
                    alt="QR thanh toán"
                    referrerPolicy="no-referrer"
                    className="w-full max-w-[220px] rounded-lg bg-white"
                    onError={(event) => handleQrImageError(event, autoPaymentInfo)}
                  />
                ) : (
                  <div className="text-center px-4">
                    <Building2 className="mx-auto text-gray-400 mb-3" size={36} />
                    <p className="font-semibold text-gray-700">
                      {autoPaymentQrFailed
                        ? 'Chưa tạo được QR động'
                        : autoPaymentInfo.bankConfigured
                          ? 'Nhập số tiền cần thanh toán'
                          : 'Chưa cấu hình tài khoản ngân hàng'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {autoPaymentQrFailed
                        ? 'Hãy bấm Cập nhật hoặc kiểm tra lại cấu hình ngân hàng.'
                        : autoPaymentInfo.bankConfigured
                          ? 'Chọn số tiền lớn hơn 0 để hiện mã VietQR.'
                        : 'Thêm biến môi trường AUTO_PAYMENT_BANK_ID và AUTO_PAYMENT_ACCOUNT_NO để hiện QR.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                {isAutoPaymentQuotaExhausted && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                    <p className="font-bold">Đang dùng chế độ thanh toán trực tiếp</p>
                    <p className="mt-1">
                      Vẫn quét QR hoặc chuyển khoản vào tài khoản TPBank bên dưới. Sau khi chuyển xong, admin sẽ đối chiếu tài khoản và xác nhận thanh toán thủ công.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Chọn số tiền thanh toán</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Còn nợ {maxAutoPaymentAmount.toLocaleString()}đ, có thể trả từng phần.
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                      Đang chọn {activeAutoPaymentAmount.toLocaleString()}đ
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {autoPaymentAmountOptions.map((option) => {
                      const isSelected = activeAutoPaymentAmount === option.value;

                      return (
                        <button
                          key={`${option.label}-${option.value}`}
                          type="button"
                          onClick={() => selectPaymentAmount(option.value, autoPaymentInfo)}
                          className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {option.label} ({option.value.toLocaleString()}đ)
                        </button>
                      );
                    })}
                  </div>

                  <label className="block">
                    <span className="text-xs uppercase font-bold text-gray-500">Hoặc nhập số tiền khác</span>
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-blue-400">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customPaymentAmount}
                        onChange={(event) => handleCustomPaymentAmountChange(event.target.value, autoPaymentInfo)}
                        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-900 outline-none"
                        placeholder="40000"
                      />
                      <span className="text-sm font-semibold text-gray-500">đ</span>
                    </div>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase font-bold text-gray-500">Số tiền QR sẽ tạo</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{activeAutoPaymentAmount.toLocaleString()}đ</p>
                    <p className="text-xs text-gray-500 mt-1">Tổng còn nợ {autoPaymentInfo.amount.toLocaleString()}đ</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 min-w-0">
                    <p className="text-xs uppercase font-bold text-gray-500">Nội dung chuyển khoản</p>
                    <div className="mt-1 flex items-center gap-2 min-w-0">
                      <p className="text-lg font-bold text-gray-900 truncate">{autoPaymentInfo.code}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(autoPaymentInfo.code, 'code')}
                        className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Copy nội dung chuyển khoản"
                      >
                        <Copy size={16} className="text-gray-600" />
                      </button>
                    </div>
                    {copiedField === 'code' && (
                      <p className="text-xs text-green-600 mt-1">Đã copy</p>
                    )}
                  </div>
                </div>

                {autoPaymentInfo.bankConfigured && autoPaymentInfo.bank && (
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <span className="text-sm text-gray-500">Ngân hàng</span>
                      <span className="font-semibold text-gray-900 text-right">{autoPaymentInfo.bank.bankId}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <span className="text-sm text-gray-500">Số tài khoản</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-900 truncate">{autoPaymentInfo.bank.accountNo}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(autoPaymentInfo.bank?.accountNo || '', 'account')}
                          className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy số tài khoản"
                        >
                          <Copy size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                    {autoPaymentInfo.bank.accountName && (
                      <div className="flex items-center justify-between gap-3 p-4">
                        <span className="text-sm text-gray-500">Chủ tài khoản</span>
                        <span className="font-semibold text-gray-900 text-right">{autoPaymentInfo.bank.accountName}</span>
                      </div>
                    )}
                    {copiedField === 'account' && (
                      <div className="p-4 text-xs text-green-600">Đã copy số tài khoản</div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  {isAutoPaymentQuotaExhausted ? (
                    <>
                      Quét mã này bằng app ngân hàng hoặc chuyển khoản trực tiếp vào tài khoản TPBank ở trên. Vui lòng giữ nội dung <span className="font-bold">{autoPaymentInfo.code}</span> để admin đối chiếu và xác nhận thủ công.
                    </>
                  ) : (
                    <>
                      Quét mã này bằng app ngân hàng, sau đó kiểm tra số tiền đã chọn và nội dung <span className="font-bold">{autoPaymentInfo.code}</span> trước khi xác nhận. Khi tiền vào, webhook sẽ tự ghi nhận theo đúng số tiền ngân hàng gửi về.
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {user?.role !== 'admin' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                <History className="text-emerald-600" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Lịch sử thanh toán của tôi</h3>
                <p className="text-sm text-gray-500">Các khoản đã ghi nhận trong tháng đang chọn.</p>
              </div>
            </div>

            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {currentMonth}
            </span>
          </div>

          {isPaymentHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment) => {
                const paymentCode = getPaymentCodeFromNotes(payment.notes);

                return (
                  <div
                    key={payment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900">{getPaymentMethodLabel(payment)}</p>
                        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          {payment.status || 'completed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatPaymentDateTime(payment.created_at)}</p>
                      {paymentCode && (
                        <p className="text-xs text-blue-700 font-semibold mt-1">Mã: {paymentCode}</p>
                      )}
                    </div>

                    <p className="text-xl font-black text-emerald-600 whitespace-nowrap">
                      {Number(payment.amount || 0).toLocaleString()}đ
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              Chưa có thanh toán nào được ghi nhận trong tháng này.
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      <div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="text-gray-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">{translations.paymentDashboard.title}</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            
            <h4 className="text-lg font-semibold text-gray-900 min-w-[120px] text-center">
              {translations.paymentDashboard.monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h4>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {translations.paymentDashboard.dayNames.map((day: string) => (
            <div key={day} className="p-2 text-center text-sm font-bold text-gray-700 bg-gray-50 rounded">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div key={index} className="h-16">
              {day ? (
                <div className={`
                  w-full h-full rounded-lg border border-gray-200 p-1 flex flex-col items-center justify-center
                  ${getOrderCountColor(day.orderCount)}
                  ${day.orderCount > 0 ? 'cursor-pointer hover:border-gray-400 hover:shadow-sm' : ''}
                  transition-all
                `}>
                  <span className="text-base font-bold text-gray-800">{day.day}</span>
                  {day.orderCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Utensils size={10} />
                      <span className="text-xs font-bold">{day.orderCount}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full"></div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-50 rounded border"></div>
            <span className="text-xs text-gray-600">{translations.paymentDashboard.noOrder}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 rounded border"></div>
            <span className="text-xs text-gray-600">{translations.paymentDashboard.oneMeal}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 rounded border"></div>
            <span className="text-xs text-gray-600">{translations.paymentDashboard.twoMeals}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 rounded border"></div>
            <span className="text-xs text-gray-600">{translations.paymentDashboard.threePlusMeals}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;
