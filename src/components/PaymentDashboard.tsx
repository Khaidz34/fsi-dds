import React, { useState, useEffect } from 'react';

import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  ShoppingBag, 
  CheckCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Utensils
} from 'lucide-react';
import { usePayments } from '../hooks/usePayments';
import { useMonthlyOrders } from '../hooks/useMonthlyOrders';

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

interface PaymentDashboardProps {
  translations: any;
}

const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ translations }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const { paymentStats, isLoading, isRefreshing } = usePayments(currentMonth);
  const { orders } = useMonthlyOrders(currentMonth);

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
