import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  Utensils, 
  DollarSign, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Clock, 
  User as UserIcon, 
  CalendarCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useMonthlyOrders, Order } from '../hooks/useMonthlyOrders';
import { usePayments } from '../hooks/usePayments';
import { ordersAPI } from '../services/api';

interface AdminUnifiedStatsProps {
  translations: any;
  theme?: string;
  accentColor?: string;
}

export const AdminUnifiedStats: React.FC<AdminUnifiedStatsProps> = ({
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

  const [weeklyData, setWeeklyData] = useState<Array<{ name: string; orders: number; date: string }>>([]);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);

  // Real-time hooks for orders and payment stats for the selected month
  const { orders, isLoading: isOrdersLoading, refetch: refetchOrders } = useMonthlyOrders(selectedMonth);
  const { paymentStats, isLoading: isPaymentLoading, refetch: refetchPayments } = usePayments(selectedMonth);

  // Fetch weekly data
  const fetchWeekly = async () => {
    try {
      setIsWeeklyLoading(true);
      const data = await ordersAPI.getWeeklyStats();
      setWeeklyData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch weekly stats:', err);
      setWeeklyData([]);
    } finally {
      setIsWeeklyLoading(false);
    }
  };

  useEffect(() => {
    fetchWeekly();
  }, []);

  // Compute stats from monthly orders
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const todayOrdersCount = useMemo(() => {
    return orders.filter(o => o.created_at && o.created_at.startsWith(todayStr)).length;
  }, [orders, todayStr]);

  const monthOrdersCount = useMemo(() => {
    return paymentStats?.ordersCount ?? orders.length;
  }, [orders, paymentStats]);

  const uniqueUsersCount = useMemo(() => {
    const userIds = new Set<number>();
    orders.forEach(o => {
      const uid = o.ordered_for || o.ordered_by || o.user_id;
      if (uid) userIds.add(uid);
    });
    return userIds.size;
  }, [orders]);

  const monthRevenue = useMemo(() => {
    if (paymentStats && paymentStats.ordersTotal > 0) {
      return paymentStats.ordersTotal;
    }
    return orders.reduce((sum, o) => sum + (o.price || 0), 0);
  }, [orders, paymentStats]);

  // Compute Top Dishes in the selected month
  const topDishes = useMemo(() => {
    const counts: { [name: string]: number } = {};
    orders.forEach(o => {
      if (o.dish1?.name) {
        counts[o.dish1.name] = (counts[o.dish1.name] || 0) + 1;
      }
      if (o.dish2?.name && o.dish2.name !== o.dish1?.name) {
        counts[o.dish2.name] = (counts[o.dish2.name] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, orderCount]) => ({ name, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);
  }, [orders]);

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
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = direction === 'prev' ? month - 1 : month + 1;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    const nextMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
    setSelectedDate(todayStr);
  };

  const handleRefresh = () => {
    refetchOrders();
    refetchPayments();
    fetchWeekly();
  };

  // Calendar days generation
  const [selectedYearNum, selectedMonthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m - 1]; // 0-indexed month
  }, [selectedMonth]);

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
    <div className="admin-unified-stats space-y-6 lg:space-y-8 pb-16">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 rounded-[2rem] p-5 lg:p-6 border border-app-accent/15 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-accent mb-1">
            <BarChart3 size={15} />
            <span>Trung tâm thống kê & Lịch ăn</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-display font-black tracking-tight text-app-ink">
            Thống kê suất ăn nội bộ
          </h2>
          <p className="text-xs sm:text-sm text-app-ink/60 mt-0.5">
            Tổng hợp dữ liệu vận hành, doanh thu suất ăn và lịch đặt cơm toàn công ty
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
            onClick={handleRefresh}
            disabled={isOrdersLoading || isPaymentLoading}
            className="p-2.5 rounded-xl border border-app-accent/20 bg-white text-app-ink/60 hover:text-app-accent hover:bg-app-accent/5 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isOrdersLoading || isPaymentLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Today's Orders */}
        <div className="lacquer-card p-5 lg:p-6 group relative overflow-hidden bg-white/95 border border-app-accent/15 shadow-sm rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm border border-red-100 group-hover:scale-110 transition-transform">
              <Utensils size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600/70 bg-red-50 px-2.5 py-0.5 rounded-full">
              Hôm nay
            </span>
          </div>
          <p className="text-xs font-bold text-app-ink/50 uppercase tracking-wider mb-1">
            {t.admin?.ordersToday || 'Đơn hôm nay'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-app-ink">{todayOrdersCount}</span>
            <span className="text-xs font-bold text-app-ink/40 uppercase">suất</span>
          </div>
          <p className="text-[11px] text-app-ink/45 mt-2">
            Đã chốt suất ăn trong ngày
          </p>
        </div>

        {/* Monthly Orders */}
        <div className="lacquer-card p-5 lg:p-6 group relative overflow-hidden bg-white/95 border border-app-accent/15 shadow-sm rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
              <BarChart3 size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              T{selectedMonthNum + 1}/{selectedYearNum}
            </span>
          </div>
          <p className="text-xs font-bold text-app-ink/50 uppercase tracking-wider mb-1">
            {t.admin?.monthlyOrders || 'Đơn tháng này'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-app-ink">{monthOrdersCount}</span>
            <span className="text-xs font-bold text-app-ink/40 uppercase">suất</span>
          </div>
          <p className="text-[11px] text-app-ink/45 mt-2">
            Toàn bộ suất cơm đặt trong tháng
          </p>
        </div>

        {/* Unique Users */}
        <div className="lacquer-card p-5 lg:p-6 group relative overflow-hidden bg-white/95 border border-app-accent/15 shadow-sm rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Nhân sự
            </span>
          </div>
          <p className="text-xs font-bold text-app-ink/50 uppercase tracking-wider mb-1">
            {t.admin?.users || 'Người đặt'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-app-ink">{uniqueUsersCount}</span>
            <span className="text-xs font-bold text-app-ink/40 uppercase">người</span>
          </div>
          <p className="text-[11px] text-app-ink/45 mt-2">
            Số nhân viên có đặt cơm tháng này
          </p>
        </div>

        {/* Monthly Revenue */}
        <div className="lacquer-card p-5 lg:p-6 group relative overflow-hidden bg-white/95 border border-app-accent/15 shadow-sm rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm border border-amber-100 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              Doanh số
            </span>
          </div>
          <p className="text-xs font-bold text-app-ink/50 uppercase tracking-wider mb-1">
            {t.admin?.monthlyRevenue || 'Doanh thu tháng'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-app-ink">
              {monthRevenue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-app-ink/40 uppercase">đ</span>
          </div>
          <p className="text-[11px] text-app-ink/45 mt-2">
            {paymentStats?.paidTotal ? `Đã thu: ${paymentStats.paidTotal.toLocaleString()}đ` : 'Tính theo đơn giá suất ăn'}
          </p>
        </div>
      </div>

      {/* Middle Grid: Weekly Chart & Top Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Weekly Orders Chart */}
        <div className="lacquer-card bg-white/95 border border-app-accent/15 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg lg:text-xl font-display font-bold text-app-ink tracking-tight">
                Đơn hàng 7 ngày gần nhất
              </h3>
              <p className="text-xs text-app-ink/50 mt-0.5">Theo dõi biến động suất ăn theo các ngày trong tuần</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-app-accent/10 text-app-accent flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="h-[260px] w-full min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D1" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#1C1917', fontSize: 12, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#1C1917', fontSize: 12, fontWeight: 700 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#F5F2E9' }}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #E5E1D1', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' 
                  }}
                  formatter={(value: any) => [`${value} suất`, 'Số đơn']}
                />
                <Bar dataKey="orders" fill={accentColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Dishes */}
        <div className="lacquer-card bg-white/95 border border-app-accent/15 rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg lg:text-xl font-display font-bold text-app-ink tracking-tight">
                Món ăn phổ biến trong tháng
              </h3>
              <p className="text-xs text-app-ink/50 mt-0.5">Top món ăn được nhân viên ưa chuộng nhất</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Utensils size={18} />
            </div>
          </div>

          <div className="space-y-3">
            {topDishes.length > 0 ? (
              topDishes.map((dish, index) => (
                <div 
                  key={dish.name} 
                  className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50/40 to-transparent rounded-2xl border border-amber-100/80 hover:border-amber-200 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      index === 0 
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' 
                        : index === 1
                        ? 'bg-amber-100 text-amber-800'
                        : index === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <p className="font-bold text-sm text-app-ink truncate">{dish.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-black text-amber-700">{dish.orderCount}</span>
                    <span className="text-xs text-app-ink/40 font-medium">lượt</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Utensils size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có dữ liệu gọi món trong tháng này</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section: Monthly Orders Calendar */}
      <div className="lacquer-card bg-white/95 border border-app-accent/15 rounded-3xl p-5 lg:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-app-accent/10 text-app-accent rounded-2xl flex items-center justify-center shrink-0">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-display font-bold text-app-ink tracking-tight">
                Lịch đặt cơm toàn công ty — Tháng {selectedMonthNum + 1}/{selectedYearNum}
              </h3>
              <p className="text-xs sm:text-sm text-app-ink/55">
                Bấm vào ngày trên lịch để xem danh sách chi tiết các nhân viên đặt cơm
              </p>
            </div>
          </div>

          {/* Quick month jumper inside calendar */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-app-accent/5 rounded-xl transition-colors text-app-ink/70 hover:text-app-accent"
              title="Tháng trước"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-black text-app-ink min-w-[100px] text-center">
              T{selectedMonthNum + 1} / {selectedYearNum}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-app-accent/5 rounded-xl transition-colors text-app-ink/70 hover:text-app-accent"
              title="Tháng sau"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

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
