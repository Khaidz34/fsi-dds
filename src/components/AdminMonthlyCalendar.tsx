import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Utensils, 
  Clock, 
  User as UserIcon,
  CalendarCheck
} from 'lucide-react';
import { useMonthlyOrders, Order } from '../hooks/useMonthlyOrders';

interface AdminMonthlyCalendarProps {
  translations: any;
  theme?: string;
  accentColor?: string;
}

export const AdminMonthlyCalendar: React.FC<AdminMonthlyCalendarProps> = ({
  translations,
  theme = 'fusion',
  accentColor = '#DA251D'
}) => {
  const t = translations;
  const now = new Date();
  const currentMonthStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Real-time monthly orders for the selected month
  const { orders, isLoading, refetch } = useMonthlyOrders(selectedMonth);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  // Group orders by date (YYYY-MM-DD)
  const ordersByDate = useMemo(() => {
    const map: { [date: string]: Order[] } = {};
    orders.forEach(order => {
      if (order.created_at) {
        const d = order.created_at.split('T')[0];
        if (!map[d]) map[d] = [];
        map[d].push(order);
      }
    });
    return map;
  }, [orders]);

  // Navigate months
  const [selectedYearNum, selectedMonthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m - 1]; // 0-indexed
  }, [selectedMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYearNum;
    let newMonth = direction === 'prev' ? selectedMonthNum : selectedMonthNum + 2;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
    setSelectedDate(todayStr);
  };

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYearNum, selectedMonthNum, 1);
    const lastDay = new Date(selectedYearNum, selectedMonthNum + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday ...

    const days: Array<{
      day: number;
      dateString: string;
      orderCount: number;
      orders: Order[];
      isToday: boolean;
      isSelected: boolean;
    } | null> = [];

    // Empty cells before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days in month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${selectedYearNum}-${String(selectedMonthNum + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOrders = ordersByDate[dateString] || [];
      days.push({
        day: i,
        dateString,
        orderCount: dayOrders.length,
        orders: dayOrders,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDate
      });
    }

    return days;
  }, [selectedYearNum, selectedMonthNum, ordersByDate, todayStr, selectedDate]);

  // Selected date orders
  const selectedDayOrders = useMemo(() => {
    if (!selectedDate) return [];
    return ordersByDate[selectedDate] || [];
  }, [selectedDate, ordersByDate]);

  const activeDaysCount = useMemo(() => {
    return Object.keys(ordersByDate).length;
  }, [ordersByDate]);

  const avgMealsPerDay = useMemo(() => {
    if (activeDaysCount === 0) return 0;
    return (orders.length / activeDaysCount).toFixed(1);
  }, [orders.length, activeDaysCount]);

  const formatOrderTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '';
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const weekdayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = weekdayNames[dateObj.getDay()];
      return `${dayName}, ngày ${d}/${m}/${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getOrderBadgeColor = (count: number) => {
    if (count === 0) return 'text-gray-400 bg-gray-50 border-gray-200';
    if (count <= 5) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (count <= 12) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const isCurrentMonthActive = selectedMonth === currentMonthStr;

  return (
    <div className="admin-monthly-calendar space-y-6 lg:space-y-8 pb-16">
      {/* Top Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 rounded-[2rem] p-5 lg:p-6 border border-app-accent/15 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-accent mb-1">
            <CalendarIcon size={15} />
            <span>Lịch đặt cơm công ty</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-display font-black tracking-tight text-app-ink">
            Lịch đặt cơm — Tháng {selectedMonthNum + 1}/{selectedYearNum}
          </h2>
          <p className="text-xs sm:text-sm text-app-ink/60 mt-0.5">
            Xem số lượng suất ăn từng ngày và danh sách chi tiết nhân viên đặt cơm
          </p>
        </div>

        {/* Month Navigator Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center bg-app-accent/5 rounded-2xl border border-app-accent/15 p-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-white rounded-xl transition-colors text-app-ink/70 hover:text-app-accent"
              title="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="px-3 py-1 text-center min-w-[120px]">
              <p className="text-xs font-black uppercase tracking-wider text-app-ink">
                Tháng {selectedMonthNum + 1} / {selectedYearNum}
              </p>
              {isCurrentMonthActive && (
                <span className="text-[10px] font-bold text-app-accent">Tháng này</span>
              )}
            </div>

            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-white rounded-xl transition-colors text-app-ink/70 hover:text-app-accent"
              title="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isCurrentMonthActive && (
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-app-accent/20 bg-white text-app-accent hover:bg-app-accent/5 transition-colors"
            >
              Hôm nay
            </button>
          )}

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-app-accent/20 bg-white text-app-ink/60 hover:text-app-accent hover:bg-app-accent/5 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="lacquer-card p-4 rounded-2xl bg-white/95 border border-app-accent/15 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-app-ink/50 font-bold uppercase tracking-wider">Tổng số suất tháng</p>
            <p className="text-2xl font-black text-app-ink mt-0.5">{orders.length} <span className="text-xs font-bold text-app-ink/40">suất</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-app-accent/10 text-app-accent flex items-center justify-center">
            <Utensils size={18} />
          </div>
        </div>

        <div className="lacquer-card p-4 rounded-2xl bg-white/95 border border-app-accent/15 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-app-ink/50 font-bold uppercase tracking-wider">Số ngày có đặt cơm</p>
            <p className="text-2xl font-black text-app-ink mt-0.5">{activeDaysCount} <span className="text-xs font-bold text-app-ink/40">ngày</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CalendarCheck size={18} />
          </div>
        </div>

        <div className="lacquer-card p-4 rounded-2xl bg-white/95 border border-app-accent/15 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-app-ink/50 font-bold uppercase tracking-wider">Trung bình mỗi ngày</p>
            <p className="text-2xl font-black text-app-ink mt-0.5">{avgMealsPerDay} <span className="text-xs font-bold text-app-ink/40">suất/ngày</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="lacquer-card bg-white/95 border border-app-accent/15 rounded-3xl p-5 lg:p-8 shadow-sm space-y-6">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {/* Day of Week Headers */}
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((dayName, idx) => (
            <div 
              key={dayName} 
              className={`p-2 text-center text-xs font-black rounded-xl ${
                idx === 0 ? 'text-rose-600 bg-rose-50/60' : idx === 6 ? 'text-amber-700 bg-amber-50/60' : 'text-app-ink/70 bg-app-accent/5'
              }`}
            >
              {dayName}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[82px] rounded-xl bg-gray-50/30" />;
            }

            const { day, dateString, orderCount, isToday, isSelected } = cell;

            return (
              <button
                key={dateString}
                type="button"
                onClick={() => setSelectedDate(dateString)}
                className={`
                  min-h-[64px] sm:min-h-[82px] rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center justify-between
                  transition-all text-left relative group
                  ${isSelected ? 'ring-2 ring-app-accent shadow-md bg-app-accent/5' : 'hover:border-app-accent/30 hover:shadow-sm bg-white'}
                  ${isToday ? 'border-2 border-red-500/80' : 'border border-app-accent/10'}
                `}
              >
                <div className="w-full flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-black ${
                    isToday ? 'text-red-600' : isSelected ? 'text-app-accent' : 'text-app-ink'
                  }`}>
                    {day}
                  </span>
                  {isToday && (
                    <span className="hidden sm:inline-block text-[9px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                      Nay
                    </span>
                  )}
                </div>

                {orderCount > 0 ? (
                  <div className={`w-full text-center py-0.5 sm:py-1 px-1 rounded-lg border text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 ${getOrderBadgeColor(orderCount)}`}>
                    <Utensils size={10} className="shrink-0 hidden sm:inline" />
                    <span>{orderCount} <span className="hidden sm:inline">suất</span></span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300 font-medium sm:block hidden">-</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-3 border-t border-app-accent/10 text-xs text-app-ink/65">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-gray-50 border border-gray-200"></div>
            <span>Chưa có suất</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-700"></div>
            <span>1 - 5 suất</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-300 text-amber-800"></div>
            <span>6 - 12 suất</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-rose-50 border border-rose-300 text-rose-700"></div>
            <span>&gt;12 suất</span>
          </div>
        </div>

        {/* Selected Day Details Inspector */}
        <div className="mt-6 pt-6 border-t border-app-accent/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-app-accent/10 text-app-accent flex items-center justify-center">
                <CalendarCheck size={18} />
              </div>
              <div>
                <h4 className="text-base font-bold text-app-ink">
                  Danh sách đặt cơm: {formatDisplayDate(selectedDate)}
                </h4>
                <p className="text-xs text-app-ink/50">
                  Tổng cộng: <strong className="text-app-accent font-black">{selectedDayOrders.length} suất ăn</strong>
                </p>
              </div>
            </div>
          </div>

          {selectedDayOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedDayOrders.map((order, i) => {
                const receiverName = order.receiver?.fullname || order.orderer?.fullname || 'Nhân viên';
                const isOrderedForOther = order.orderer && order.receiver && order.orderer.id !== order.receiver.id;

                return (
                  <div
                    key={order.id || i}
                    className="p-4 rounded-2xl border border-app-accent/15 bg-white shadow-sm hover:border-app-accent/30 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-app-accent/10 text-app-accent font-black text-xs flex items-center justify-center shrink-0">
                          {receiverName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-app-ink truncate">{receiverName}</p>
                          {isOrderedForOther && (
                            <p className="text-[10px] text-app-ink/50 truncate">
                              Đặt bởi: {order.orderer?.fullname}
                            </p>
                          )}
                        </div>
                      </div>

                      {order.created_at && (
                        <div className="flex items-center gap-1 text-[11px] text-app-ink/50 bg-gray-50 px-2 py-0.5 rounded-md shrink-0 border border-gray-100">
                          <Clock size={11} />
                          <span>{formatOrderTime(order.created_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 text-xs">
                      {order.dish1?.name && (
                        <div className="flex items-start gap-1.5 text-app-ink font-semibold">
                          <span className="text-app-accent font-black">1.</span>
                          <span>{order.dish1.name}</span>
                        </div>
                      )}
                      {order.dish2?.name && (
                        <div className="flex items-start gap-1.5 text-app-ink/75">
                          <span className="text-app-gold font-black">2.</span>
                          <span>{order.dish2.name}</span>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
                        <p className="text-[11px] text-app-ink/65 italic bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-100/50">
                          💬 {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <CalendarIcon size={28} className="mx-auto mb-1.5 opacity-40" />
              <p className="text-sm font-semibold text-app-ink/60">Không có ai đặt cơm vào ngày này</p>
              <p className="text-xs text-app-ink/40 mt-0.5">Chọn ngày khác trên lịch để xem danh sách</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
