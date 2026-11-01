import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Utensils, 
  DollarSign, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ArrowRight
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
import { useMonthlyOrders } from '../hooks/useMonthlyOrders';
import { ordersAPI } from '../services/api';

interface AdminStatsViewProps {
  translations: any;
  theme?: string;
  accentColor?: string;
  onNavigateToCalendar?: () => void;
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({
  translations,
  theme = 'fusion',
  accentColor = '#DA251D',
  onNavigateToCalendar
}) => {
  const t = translations;
  const now = new Date();
  const currentMonthStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [weeklyData, setWeeklyData] = useState<Array<{ name: string; orders: number; date: string }>>([]);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);

  // Real-time monthly orders for the selected month (instant in-memory cache)
  const { orders, isLoading, refetch } = useMonthlyOrders(selectedMonth);

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

  // Compute accurate statistics strictly from orders of selectedMonth
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const todayOrdersCount = useMemo(() => {
    return orders.filter(o => o.created_at && o.created_at.startsWith(todayStr)).length;
  }, [orders, todayStr]);

  const monthOrdersCount = useMemo(() => {
    return orders.length;
  }, [orders]);

  const uniqueUsersCount = useMemo(() => {
    const userIds = new Set<number>();
    orders.forEach(o => {
      const uid = o.ordered_for || o.ordered_by || o.user_id;
      if (uid) userIds.add(uid);
    });
    return userIds.size;
  }, [orders]);

  const monthRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  }, [orders]);

  const paidRevenue = useMemo(() => {
    return orders
      .filter(o => o.paid === true)
      .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  }, [orders]);

  const unpaidRevenue = useMemo(() => {
    return Math.max(0, monthRevenue - paidRevenue);
  }, [monthRevenue, paidRevenue]);

  // Top Dishes
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

  // Daily Breakdown Table
  const dailyBreakdown = useMemo(() => {
    const map: { [date: string]: { count: number; revenue: number; paidCount: number } } = {};
    orders.forEach(o => {
      if (o.created_at) {
        const d = o.created_at.split('T')[0];
        if (!map[d]) map[d] = { count: 0, revenue: 0, paidCount: 0 };
        map[d].count++;
        map[d].revenue += (Number(o.price) || 0);
        if (o.paid === true) map[d].paidCount++;
      }
    });

    return Object.entries(map)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders]);

  // Navigate months using native Date to avoid any indexing errors
  const [selectedYearNum, selectedMonthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m]; // 1-indexed (e.g. 10 for October, 11 for November)
  }, [selectedMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + (direction === 'prev' ? -1 : 1), 1);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextStr);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  const isCurrentMonthActive = selectedMonth === currentMonthStr;

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const weekdayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = weekdayNames[dateObj.getDay()];
      return `${dayName}, ${d}/${m}/${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="admin-stats-view space-y-6 lg:space-y-8 pb-16">
      {/* Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 rounded-[2rem] p-5 lg:p-6 border border-app-accent/15 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-accent mb-1">
            <BarChart3 size={15} />
            <span>Báo cáo & Phân tích suất ăn</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-display font-black tracking-tight text-app-ink">
            Thống kê suất ăn nội bộ
          </h2>
          <p className="text-xs sm:text-sm text-app-ink/60 mt-0.5">
            Tổng hợp dữ liệu vận hành, doanh thu suất ăn và xu hướng theo tháng
          </p>
        </div>

        {/* Month Selector */}
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
                Tháng {selectedMonthNum} / {selectedYearNum}
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
            onClick={() => { refetch(); fetchWeekly(); }}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-app-accent/20 bg-white text-app-ink/60 hover:text-app-accent hover:bg-app-accent/5 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
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
            {todayOrdersCount > 0 ? 'Đã chốt suất ăn trong ngày' : 'Chưa có đơn đặt hôm nay'}
          </p>
        </div>

        {/* Monthly Orders */}
        <div className="lacquer-card p-5 lg:p-6 group relative overflow-hidden bg-white/95 border border-app-accent/15 shadow-sm rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
              <BarChart3 size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              T{selectedMonthNum}/{selectedYearNum}
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
            Tổng số suất đặt trong tháng {selectedMonthNum}
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
          <div className="flex items-center gap-2 text-[11px] text-app-ink/55 mt-2">
            <span className="text-emerald-700 font-bold">Thu: {paidRevenue.toLocaleString()}đ</span>
            <span>•</span>
            <span className="text-amber-800 font-bold">Nợ: {unpaidRevenue.toLocaleString()}đ</span>
          </div>
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
              <p className="text-xs text-app-ink/50 mt-0.5">Top món ăn được nhân viên gọi nhiều nhất</p>
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

      {/* Daily Breakdown Table */}
      <div className="lacquer-card bg-white/95 border border-app-accent/15 rounded-3xl p-5 lg:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-app-accent/10">
          <div>
            <h3 className="text-lg font-display font-bold text-app-ink tracking-tight">
              Tổng kết suất ăn theo ngày trong tháng {selectedMonthNum}/{selectedYearNum}
            </h3>
            <p className="text-xs text-app-ink/55">
              Danh sách các ngày có phục vụ cơm trong tháng
            </p>
          </div>

          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-app-accent/10 text-app-accent hover:bg-app-accent hover:text-white transition-all text-xs font-bold"
            >
              <CalendarIcon size={14} />
              <span>Xem dạng Lịch đặt cơm</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {dailyBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-app-accent/10 text-[11px] font-black uppercase text-app-ink/50 tracking-wider">
                  <th className="py-3 px-3">Ngày</th>
                  <th className="py-3 px-3 text-center">Số suất ăn</th>
                  <th className="py-3 px-3 text-right">Doanh thu</th>
                  <th className="py-3 px-3 text-center">Đã thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-accent/5">
                {dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-app-accent/5 transition-colors">
                    <td className="py-3 px-3 font-bold text-app-ink">
                      {formatDisplayDate(row.date)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-black px-2.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Utensils size={11} />
                        {row.count} suất
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-app-ink">
                      {row.revenue.toLocaleString()}đ
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        row.paidCount === row.count 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : row.paidCount > 0 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {row.paidCount}/{row.count} suất
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <CalendarIcon size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-app-ink/60">Tháng {selectedMonthNum}/{selectedYearNum} chưa có đơn đặt cơm nào</p>
            <p className="text-xs text-app-ink/40 mt-1">Dữ liệu sẽ tự động hiển thị khi nhân viên đặt món</p>
          </div>
        )}
      </div>
    </div>
  );
};
