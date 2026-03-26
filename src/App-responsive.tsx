import React, { useState, useEffect, useMemo } from 'react';

import { 
  LayoutDashboard, 
  Utensils, 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  UserIcon, 
  LogOut,
  ChevronRight,
  ShoppingBag,
  Users,
  TrendingUp,
  Plus,
  Minus,
  Trash2,
  Pizza,
  Soup,
  Fish,
  Coffee,
  IceCream,
  DollarSign,
  CalendarIcon,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { Language } from './types';
import { OrderSummary } from './components/OrderSummary';
import { useAuth } from './contexts/AuthContext';
import { useMenu } from './hooks/useMenu';
import { useOrders } from './hooks/useOrders';
import { useUsers } from './hooks/useUsers';
import { useAdminPayments } from './hooks/useAdminPayments';
import { useFeedback } from './hooks/useFeedback';
import { Login } from './components/Login';
import PaymentDashboard from './components/PaymentDashboard';
import { useDashboardStats } from './hooks/useDashboardStats';
import { menuAPI, ordersAPI, usersAPI, adminAPI } from './services/api';
import { AnimatePresence } from './framer-motion-mock';

// Import translations from original file
const TRANSLATIONS = {
  vi: {
    dashboard: 'Bảng điều khiển',
    menu: 'Thực đơn',
    orders: 'Đơn hàng',
    paymentCalendar: 'Thanh toán',
    logout: 'Đăng xuất',
    orderNow: 'Đặt món',
    todayMenu: 'Thực đơn hôm nay',
    admin: {
      menuManagement: 'Quản lý Menu',
      allOrders: 'Tất cả đơn',
      statistics: 'Thống kê',
      payments: 'Thanh toán',
      feedback: 'Góp ý',
      accountManagement: 'Quản lý tài khoản'
    }
  },
  en: {
    dashboard: 'Dashboard',
    menu: 'Menu',
    orders: 'Orders',
    paymentCalendar: 'Payment',
    logout: 'Logout',
    orderNow: 'Order Now',
    todayMenu: "Today's Menu",
    admin: {
      menuManagement: 'Menu Management',
      allOrders: 'All Orders',
      statistics: 'Statistics',
      payments: 'Payments',
      feedback: 'Feedback',
      accountManagement: 'Account Management'
    }
  },
  ja: {
    dashboard: 'ダッシュボード',
    menu: 'メニュー',
    orders: '注文',
    paymentCalendar: '支払い',
    logout: 'ログアウト',
    orderNow: '今すぐ注文',
    todayMenu: '今日のメニュー',
    admin: {
      menuManagement: 'メニュー管理',
      allOrders: 'すべての注文',
      statistics: '統計',
      payments: '支払い',
      feedback: 'フィードバック',
      accountManagement: 'アカウント管理'
    }
  }
};

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
  const [theme, setTheme] = useState<'fusion' | 'corporate'>('corporate');
  const [currentLang, setCurrentLang] = useState<Language>('vi');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const { menu, isLoading: menuLoading } = useMenu(currentLang);
  const { orders } = useOrders(currentLang);
  const { stats: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  
  const t = TRANSLATIONS[currentLang];

  // Show loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <Login 
        theme={theme}
        currentLang={currentLang}
        setTheme={setTheme}
        setCurrentLang={setCurrentLang}
      />
    );
  }

  const SidebarItem = ({ icon, label, active, onClick }: { 
    icon: React.ReactNode, 
    label: string, 
    active: boolean, 
    onClick: () => void 
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-blue-50 text-blue-600 shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FSI</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">FSI DDS</div>
            <div className="text-xs text-gray-500">Digital Data Solutions</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['vi', 'en', 'ja'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLang(lang)}
                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                  currentLang === lang 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            {showMobileMenu ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowMobileMenu(false)}
          >
            <div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-80 h-full bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">FSI</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">FSI DDS</div>
                    <div className="text-sm text-gray-500">Digital Data Solutions</div>
                  </div>
                </div>
              </div>
              
              <nav className="p-4 space-y-2">
                <SidebarItem 
                  icon={<LayoutDashboard size={20} />} 
                  label={t.dashboard} 
                  active={activeTab === 'dashboard'} 
                  onClick={() => {
                    setActiveTab('dashboard');
                    setShowMobileMenu(false);
                  }} 
                />
                {user?.role !== 'admin' && (
                  <SidebarItem 
                    icon={<Utensils size={20} />} 
                    label={t.menu} 
                    active={activeTab === 'menu'} 
                    onClick={() => {
                      setActiveTab('menu');
                      setShowMobileMenu(false);
                    }} 
                  />
                )}
                <SidebarItem 
                  icon={<ClipboardList size={20} />} 
                  label={user?.role === 'admin' ? t.admin.allOrders : t.orders} 
                  active={activeTab === 'orders'} 
                  onClick={() => {
                    setActiveTab('orders');
                    setShowMobileMenu(false);
                  }} 
                />
                <SidebarItem 
                  icon={<Calendar size={20} />} 
                  label={t.paymentCalendar} 
                  active={activeTab === 'payment-calendar'} 
                  onClick={() => {
                    setActiveTab('payment-calendar');
                    setShowMobileMenu(false);
                  }} 
                />
                
                {user?.role === 'admin' && (
                  <>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="px-4 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quản trị</p>
                      <SidebarItem 
                        icon={<Settings size={20} />} 
                        label={t.admin.menuManagement} 
                        active={activeTab === 'menu-mgmt'} 
                        onClick={() => {
                          setActiveTab('menu-mgmt');
                          setShowMobileMenu(false);
                        }} 
                      />
                      <SidebarItem 
                        icon={<BarChart3 size={20} />} 
                        label={t.admin.statistics} 
                        active={activeTab === 'stats'} 
                        onClick={() => {
                          setActiveTab('stats');
                          setShowMobileMenu(false);
                        }} 
                      />
                    </div>
                  </>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <LogOut size={20} />
                    <span className="font-medium text-sm">{t.logout}</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 bg-white border-r border-gray-200 flex-col">
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">FSI</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">FSI DDS</div>
              <div className="text-sm text-gray-500">Digital Data Solutions</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <div className="mb-6">
            <p className="px-4 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Mục lục</p>
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label={t.dashboard} 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            {user?.role !== 'admin' && (
              <SidebarItem 
                icon={<Utensils size={20} />} 
                label={t.menu} 
                active={activeTab === 'menu'} 
                onClick={() => setActiveTab('menu')} 
              />
            )}
            <SidebarItem 
              icon={<ClipboardList size={20} />} 
              label={user?.role === 'admin' ? t.admin.allOrders : t.orders} 
              active={activeTab === 'orders'} 
              onClick={() => setActiveTab('orders')} 
            />
            <SidebarItem 
              icon={<Calendar size={20} />} 
              label={t.paymentCalendar} 
              active={activeTab === 'payment-calendar'} 
              onClick={() => setActiveTab('payment-calendar')} 
            />
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4 border-t border-gray-200">
              <p className="px-4 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Quản trị</p>
              <SidebarItem 
                icon={<Settings size={20} />} 
                label={t.admin.menuManagement} 
                active={activeTab === 'menu-mgmt'} 
                onClick={() => setActiveTab('menu-mgmt')} 
              />
              <SidebarItem 
                icon={<BarChart3 size={20} />} 
                label={t.admin.statistics} 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')} 
              />
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">
                {user?.fullname?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{user?.fullname}</p>
              <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
            </div>
          </div>
          
          {/* Language Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            {(['vi', 'en', 'ja'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLang(lang)}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded transition-all ${
                  currentLang === lang 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-gray-200 items-center justify-between px-8">
          <h1 className="text-xl font-bold text-gray-900 capitalize">
            {activeTab === 'menu-mgmt' ? t.admin.menuManagement : activeTab}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-bold text-xs">
                  {user?.fullname?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.fullname}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Utensils className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">{t.todayMenu}</p>
                        <p className="text-2xl font-bold text-gray-900">{menu?.dishes?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <ClipboardList className="text-green-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">{t.orders}</p>
                        <p className="text-2xl font-bold text-gray-900">{orders?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Users className="text-purple-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Người dùng</p>
                        <p className="text-2xl font-bold text-gray-900">{dashboardStats?.totalUsers || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Display */}
                {menu?.dishes && menu.dishes.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t.todayMenu}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {menu.dishes.map((dish, index) => (
                        <div key={dish.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{dish.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu' && (
              <div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t.todayMenu}</h3>
                  {menu?.dishes && menu.dishes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {menu.dishes.map((dish, index) => (
                        <div key={dish.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                              {t.orderNow}
                            </button>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{dish.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Utensils size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Chưa có menu hôm nay</p>
                      <p className="text-gray-400 text-sm">Vui lòng quay lại sau</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {user?.role === 'admin' ? t.admin.allOrders : t.orders}
                  </h3>
                  {orders && orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{order.receiver?.fullname}</p>
                              <p className="text-sm text-gray-500">
                                {order.dish1?.name} {order.dish2 ? `+ ${order.dish2.name}` : ''}
                              </p>
                              {order.notes && (
                                <p className="text-xs text-gray-400 mt-1">{order.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : 'N/A'}</p>
                              <p className="text-sm text-green-600 font-medium">{order.price?.toLocaleString()}đ</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Chưa có đơn hàng nào</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'payment-calendar' && (
              <div
                key="payment-calendar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PaymentDashboard translations={t} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
              activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-xs font-medium truncate">{t.dashboard}</span>
          </button>
          
          {user?.role !== 'admin' && (
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
                activeTab === 'menu' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
              }`}
            >
              <Utensils size={20} />
              <span className="text-xs font-medium truncate">{t.menu}</span>
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
              activeTab === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
            }`}
          >
            <ClipboardList size={20} />
            <span className="text-xs font-medium truncate">
              {user?.role === 'admin' ? 'Orders' : t.orders}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('payment-calendar')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
              activeTab === 'payment-calendar' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
            }`}
          >
            <Calendar size={20} />
            <span className="text-xs font-medium truncate">{t.paymentCalendar}</span>
          </button>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('menu-mgmt')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
                activeTab === 'menu-mgmt' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
              }`}
            >
              <Settings size={20} />
              <span className="text-xs font-medium truncate">Menu</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
