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
  Building2
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

interface PaymentDashboardProps {
  translations: any;
}

const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ translations }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const { user } = useAuth();
  const { paymentStats, isLoading, isRefreshing, refetch } = usePayments(currentMonth);
  const { orders } = useMonthlyOrders(currentMonth);
  const [autoPaymentInfo, setAutoPaymentInfo] = useState<AutoPaymentInfo | null>(null);
  const [isAutoPaymentLoading, setIsAutoPaymentLoading] = useState(false);
  const [autoPaymentError, setAutoPaymentError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      const info = await paymentsAPI.getAutoInfo(currentMonth);
      setAutoPaymentInfo(info);
    } catch (error) {
      console.error('Auto payment info error:', error);
      setAutoPaymentError(error instanceof Error ? error.message : 'Không tải được thông tin thanh toán tự động');
    } finally {
      setIsAutoPaymentLoading(false);
    }
  };

  useEffect(() => {
    loadAutoPaymentInfo();
  }, [currentMonth, user?.id, user?.role, paymentStats?.remainingTotal]);

  const handleRefreshAutoPayment = async () => {
    await refetch();
    await loadAutoPaymentInfo();
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

  const buildClientVietQrUrl = (bankId: string, info: AutoPaymentInfo) => {
    const params = new URLSearchParams({
      amount: String(Math.round(info.amount)),
      addInfo: info.code
    });

    if (info.bank?.accountName) {
      params.set('accountName', info.bank.accountName);
    }

    return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(info.bank?.accountNo || '')}-compact2.png?${params.toString()}`;
  };

  const handleQrImageError = (event: React.SyntheticEvent<HTMLImageElement>, info: AutoPaymentInfo) => {
    const img = event.currentTarget;
    const fallbackState = img.dataset.fallbackState || 'primary';

    if (fallbackState === 'primary') {
      img.dataset.fallbackState = 'tpb';
      img.src = buildClientVietQrUrl('TPB', info);
      return;
    }

    if (fallbackState === 'tpb') {
      img.dataset.fallbackState = 'tpbank';
      img.src = buildClientVietQrUrl('TPBank', info);
      return;
    }

    if (fallbackState !== 'static') {
      img.dataset.fallbackState = 'static';
      img.src = 'QR.png';
    }
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
                <h3 className="text-lg font-bold text-gray-900">Thanh toán tự động</h3>
                <p className="text-sm text-gray-500">Quét mã VietQR để tự điền số tiền và nội dung chuyển khoản.</p>
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
                <p className="text-sm mt-1">Nếu vừa chuyển khoản, hãy bấm cập nhật sau khi ngân hàng gửi webhook về hệ thống.</p>
              </div>
            </div>
          ) : autoPaymentInfo ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_1fr]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-center min-h-[260px]">
                {autoPaymentInfo.qrUrl ? (
                  <img
                    src={autoPaymentInfo.qrUrl}
                    alt="QR thanh toán"
                    referrerPolicy="no-referrer"
                    className="w-full max-w-[220px] rounded-lg bg-white"
                    onError={(event) => handleQrImageError(event, autoPaymentInfo)}
                  />
                ) : (
                  <div className="text-center px-4">
                    <Building2 className="mx-auto text-gray-400 mb-3" size={36} />
                    <p className="font-semibold text-gray-700">Chưa cấu hình tài khoản ngân hàng</p>
                    <p className="text-sm text-gray-500 mt-1">Thêm biến môi trường AUTO_PAYMENT_BANK_ID và AUTO_PAYMENT_ACCOUNT_NO để hiện QR.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase font-bold text-gray-500">Số tiền cần thanh toán</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{autoPaymentInfo.amount.toLocaleString()}đ</p>
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
                  Quét mã này bằng app ngân hàng, sau đó kiểm tra số tiền và nội dung <span className="font-bold">{autoPaymentInfo.code}</span> trước khi xác nhận. Khi tiền vào, webhook sẽ tự ghi nhận thanh toán.
                </div>
              </div>
            </div>
          ) : null}
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
