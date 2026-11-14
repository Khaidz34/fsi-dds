import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useVideoSettings } from './hooks/useVideoSettings';

import {
  Utensils, 
  History, 
  User,
  User as UserIcon, 
  ChefHat, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Bell,
  Search,
  Filter,
  X,
  Copy,
  Globe,
  Plus,
  PlusCircle,
  ClipboardList,
  BarChart3,
  FileText,
  MessageSquare,
  Settings,
  Calendar,
  Zap,
  Activity,
  QrCode,
  Flame,
  Trash2,
  Edit,
  DollarSign,
  Menu,
  Palette,
  Play,
  Sparkles,
  Lock,
  RefreshCw
} from 'lucide-react';
import { Language } from './types';
import { TRANSLATIONS } from './translations';
import { cacheService } from './services/cache';
import { OrderSummary } from './components/OrderSummary';
import { useAuth } from './contexts/AuthContext';
import { useMenu, type MenuDish } from './hooks/useMenu';
import { useOrders } from './hooks/useOrders';
import { useUsers } from './hooks/useUsers';
import { useAdminPayments } from './hooks/useAdminPayments';
import { useFeedback } from './hooks/useFeedback';
import { useNotifications } from './hooks/useNotifications';
import { useBannerSettings } from './hooks/useBannerSettings';
import { Login } from './components/Login';
import { BannerDisplay } from './components/BannerDisplay';

// Helper tự động xử lý khi server deploy bản mới làm lệch mã hash module động (Failed to fetch dynamically imported module)
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      const res = await factory();
      sessionStorage.removeItem('chunk_reload_attempted');
      return res;
    } catch (error: any) {
      const isChunkError = 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('Loading chunk');

      const alreadyReloaded = sessionStorage.getItem('chunk_reload_attempted');

      if (isChunkError && !alreadyReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        console.warn('🔄 Phát hiện phiên bản ứng dụng mới, tự động tải lại trang...');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}

// Lazy-loaded heavy components for faster initial load & lower memory on low-spec server/clients
const DailyQuote = lazyWithRetry(() => import('./components/DailyQuote'));
const PaymentDashboard = lazyWithRetry(() => import('./components/PaymentDashboard'));
const AdminStatsView = lazyWithRetry(() => import('./components/AdminStatsView').then(m => ({ default: m.AdminStatsView })));
const AdminMonthlyCalendar = lazyWithRetry(() => import('./components/AdminMonthlyCalendar').then(m => ({ default: m.AdminMonthlyCalendar })));
const AdminBannerControl = lazyWithRetry(() => import('./components/AdminBannerControl').then(m => ({ default: m.AdminBannerControl })));
const AdminVideoControl = lazyWithRetry(() => import('./components/AdminVideoControl').then(m => ({ default: m.AdminVideoControl })));
const VideoOverlay = lazyWithRetry(() => import('./components/VideoOverlay').then(m => ({ default: m.VideoOverlay })));
const FeedbackView = lazyWithRetry(() => import('./components/FeedbackView').then(m => ({ default: m.FeedbackView })));
const AccountsManagementView = lazyWithRetry(() => import('./components/AccountsManagementView').then(m => ({ default: m.AccountsManagementView })));
import { OrderDeadlineCountdown, useOrderDeadline } from './components/OrderDeadlineCountdown';

const TabLoadingSkeleton = () => (
  <div className="p-8 space-y-4 animate-pulse">
    <div className="h-8 bg-slate-200/70 rounded-xl w-1/3"></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="h-28 bg-slate-200/60 rounded-2xl"></div>
      <div className="h-28 bg-slate-200/60 rounded-2xl"></div>
      <div className="h-28 bg-slate-200/60 rounded-2xl"></div>
      <div className="h-28 bg-slate-200/60 rounded-2xl"></div>
    </div>
    <div className="h-64 bg-slate-200/50 rounded-2xl"></div>
  </div>
);
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStats } from './hooks/useDashboardStats';
import { menuAPI, ordersAPI, usersAPI, adminAPI, paymentsAPI } from './services/api';
import { AnimatePresence } from './framer-motion-mock';

interface DashboardAutoPaymentInfo {
  code: string;
  transferContent?: string;
  payerName?: string;
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

interface DashboardAutoPaymentUsage {
  supported: boolean;
  month: string;
  used: number;
  providerUsed?: number | null;
  providerSynced?: boolean;
  providerSyncStatus?: string;
  providerSyncError?: string | null;
  providerDiagnostics?: {
    hasToken?: boolean;
    baseUrl?: string;
    query?: string;
    httpStatus?: number;
    responseStatus?: string;
    responsePreview?: string;
    responseKeys?: string[];
    countMethod?: string;
    dataCount?: number | null;
  } | null;
  usageSource?: string;
  limit: number | null;
  remaining: number | null;
  usagePercent: number | null;
}

// Helper function to get dish name by language
const getDishName = (dish: any, lang: Language): string => {
  if (!dish) return '';
  
  switch (lang) {
    case 'en':
      return dish.name_en || dish.name || '';
    case 'ja':
      return dish.name_ja || dish.name || '';
    case 'vi':
    default:
      return dish.name_vi || dish.name || '';
  }
};

const getDishDisplayName = (dish: any, lang: Language): string => {
  return getDishName(dish, lang).replace(/^\s*\d+[.)]\s*/, '').trim();
};

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout, token } = useAuth();

  const videoSettings = useVideoSettings();
  const { isPassed: isOrderDeadlinePassed } = useOrderDeadline(currentLang);
  const canPlaceOrder = user?.role === 'admin' || !isOrderDeadlinePassed;

  const [theme, setTheme] = useState<'fusion' | 'corporate'>('corporate'); // Default to corporate
  const [currentLang, setCurrentLang] = useState<Language>('vi');
  const [isLanguageChanging, setIsLanguageChanging] = useState(false);
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get theme colors - FSI Company Colors
  const getThemeColor = (type: 'primary' | 'hover' | 'light') => {
    if (theme === 'corporate') {
      switch (type) {
        case 'primary': return '#00A693';
        case 'hover': return '#00897B';
        case 'light': return '#B2DFDB';
        default: return '#00A693';
      }
    } else {
      switch (type) {
        case 'primary': return '#DA251D';
        case 'hover': return '#B91C1C';
        case 'light': return '#FCA5A5';
        default: return '#DA251D';
      }
    }
  };
  
  const { menu, isLoading: menuLoading, createMenu, createMultilingualMenu, refetch: refetchMenu } = useMenu(currentLang);
  const { orders, isLoading: ordersLoading, isUpdating: ordersUpdating, createOrder, updateOrder, deleteOrder, refetch: refetchOrders } = useOrders(currentLang);
  const { users, updateUser, deleteUser, refetch: refetchUsers } = useUsers();
  const { userPayments, paymentHistory, autoPaymentUsage, pagination, isLoading: isLoadingPayments, isUpdating: isUpdatingPayments, isLoadingMore, markAsPaid, loadMore, loadPrevious, refetch: refetchAdminPayments } = useAdminPayments();
  const { stats: dashboardStats, isLoading: dashboardStatsLoading, refetch: refetchDashboardStats } = useDashboardStats();
  const { feedbacks, updateFeedbackStatus, createFeedback } = useFeedback();
  
  // Notifications - navigate to orders when notification clicked
  const handleNotificationClick = useCallback(() => {
    setActiveTab('orders');
  }, []);

  const liveRefreshUserPaymentRef = useRef<() => void>();

  const handleLiveOrderUpdate = useCallback(() => {
    console.log('🔄 Live order/payment update received via SSE, refreshing data...');
    refetchOrders();
    if (user?.role === 'admin') {
      refetchAdminPayments();
      refetchDashboardStats(true);
    } else {
      liveRefreshUserPaymentRef.current?.();
    }
    // Broadcast to any component listening for live order updates
    window.dispatchEvent(new CustomEvent('app:order-update'));
  }, [refetchOrders, refetchAdminPayments, refetchDashboardStats, user?.role]);
  
  const { 
    permissionStatus, 
    requestPermission: requestNotificationPermission, 
    isSupported: notificationsSupported,
    latestNotification,
    clearLatestNotification
  } = useNotifications(
    user,
    token,
    currentLang,
    handleNotificationClick,
    handleLiveOrderUpdate
  );

  // Banner settings
  const { bannerType } = useBannerSettings();
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Lọc các suất cơm theo user (trang admin)
  const [orderFilterUserId, setOrderFilterUserId] = useState<number | 'all'>('all');
  const [showOrderFilter, setShowOrderFilter] = useState(false);
  const [isReprocessingAutoPayments, setIsReprocessingAutoPayments] = useState(false);

  const handleReprocessAutoPayments = async () => {
    setIsReprocessingAutoPayments(true);
    try {
      const res = await paymentsAPI.reprocessAutoPayments();
      if (res?.recovered && res.recovered.length > 0) {
        const names = res.recovered.map(r => `${r.userName} (${r.amount.toLocaleString()}đ)`).join(', ');
        alert(`🎉 Đã phục hồi và ghi nhận thành công ${res.recovered.length} thanh toán:\n${names}`);
        refetchAdminPayments();
      } else {
        alert(`Đã quét ${res?.reprocessed || 0} giao dịch, không có giao dịch nào chưa nhận cần phục hồi.`);
      }
    } catch (err: any) {
      alert(`Lỗi khi quét lại giao dịch: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsReprocessingAutoPayments(false);
    }
  };

  // Modal đối soát sao kê ngân hàng
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileInputText, setReconcileInputText] = useState('');
  const [isReconcilingText, setIsReconcilingText] = useState(false);

  const handleReconcileSubmit = async () => {
    if (!reconcileInputText.trim()) {
      alert('Vui lòng dán nội dung tin nhắn hoặc thông báo ngân hàng.');
      return;
    }
    setIsReconcilingText(true);
    try {
      const res = await paymentsAPI.reconcileText(reconcileInputText);
      if (res?.results && res.results.length > 0) {
        const details = res.results.map((r: any) => `• ${r.fullname}: +${r.amount.toLocaleString()}đ (gạch ${r.markedOrders} suất)`).join('\n');
        alert(`🎉 Đối soát thành công ${res.results.length} giao dịch:\n${details}`);
        setShowReconcileModal(false);
        setReconcileInputText('');
        refetchAdminPayments();
      } else {
        alert('Không tìm thấy giao dịch hoặc user nào khớp trong nội dung đã dán.');
      }
    } catch (err: any) {
      alert(`Lỗi khi đối soát: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsReconcilingText(false);
    }
  };

  // Modal chỉnh sửa user (trang admin)
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserFullname, setEditUserFullname] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin'>('user');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Danh sách suất cơm (lọc theo user nếu admin chọn)
  const displayedOrders = useMemo(() => {
    if (user?.role === 'admin' && orderFilterUserId !== 'all') {
      return orders.filter(o => o.receiver?.id === orderFilterUserId || o.ordered_for === orderFilterUserId || o.user_id === orderFilterUserId);
    }
    return orders;
  }, [orders, user?.role, orderFilterUserId]);

  // Phân trang đơn hàng (cả admin và user)
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);
  const totalOrderPages = Math.max(1, Math.ceil(displayedOrders.length / orderPageSize));

  // Tự động điều chỉnh trang hợp lệ
  useEffect(() => {
    if (orderPage > totalOrderPages) {
      setOrderPage(1);
    }
  }, [totalOrderPages, orderPage]);

  // Danh sách đơn của trang hiện tại
  const paginatedOrders = useMemo(() => {
    const startIndex = (orderPage - 1) * orderPageSize;
    return displayedOrders.slice(startIndex, startIndex + orderPageSize);
  }, [displayedOrders, orderPage, orderPageSize]);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [menuText, setMenuText] = useState('');
  const [multilingualMenus, setMultilingualMenus] = useState<Array<{vi: string, en: string, ja: string}>>([]);
  const [showMultilingualModal, setShowMultilingualModal] = useState(false);
  const [multilingualText, setMultilingualText] = useState('');
  const [selectedDishes, setSelectedDishes] = useState<number[]>([]);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  // Order options
  const [orderNotes, setOrderNotes] = useState('');
  const [extraRice, setExtraRice] = useState(false);
  const [extraSoup, setExtraSoup] = useState(false);
  const [chiliSauce, setChiliSauce] = useState(false);
  const [fishSauce, setFishSauce] = useState(false);
  const [chopsticks, setChopsticks] = useState(false);
  const [lessRice, setLessRice] = useState(false);
  const [orderForUserId, setOrderForUserId] = useState<number | null>(null);
  
  // Users for ordering
  const [allUsers, setAllUsers] = useState<Array<{id: number, fullname: string}>>([]);
  
  // Feedback form
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Export menu state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedMenu, setExportedMenu] = useState('');
  
  // Weekly chart data
  const [weeklyData, setWeeklyData] = useState<Array<{ name: string; orders: number; date: string }>>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  
  // Statistics data
  const [statsData, setStatsData] = useState<{
    todayOrders: number;
    monthOrders: number;
    monthRevenue: number;
    uniqueUsers: number;
    topDishes: Array<{ name: string; orderCount: number }>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Banner visibility state
  const [showBanner, setShowBanner] = useState(true);

  // Edit order state
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editDish1, setEditDish1] = useState<number>(0);
  const [editDish2, setEditDish2] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Payment confirmation state
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ userId: number; amount: number; fullname?: string; paidTotal?: number; remainingTotal?: number } | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [dashboardAutoPaymentInfo, setDashboardAutoPaymentInfo] = useState<DashboardAutoPaymentInfo | null>(null);
  const [dashboardAutoPaymentUsage, setDashboardAutoPaymentUsage] = useState<DashboardAutoPaymentUsage | null>(null);
  const [dashboardQrImageFailed, setDashboardQrImageFailed] = useState(false);
  const [isDashboardQrLoading, setIsDashboardQrLoading] = useState(false);
  const [dashboardCopiedField, setDashboardCopiedField] = useState<'account' | 'content' | 'amount' | null>(null);
  const [dishSelectFeedback, setDishSelectFeedback] = useState<string | null>(null);
  const [isMobileOrderSheetExpanded, setIsMobileOrderSheetExpanded] = useState(false);
  const [orderForSearch, setOrderForSearch] = useState('');

  const handleCopyDashboardField = async (text: string, field: 'account' | 'content' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setDashboardCopiedField(field);
      setTimeout(() => setDashboardCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const t = TRANSLATIONS[currentLang];

  const maxSelectableDishes = 2;
  const mealPriceText = '40,000đ';
  const selectedDishDetails = useMemo<MenuDish[]>(() => {
    if (!menu?.dishes?.length) return [];

    return selectedDishes
      .map(dishId => menu.dishes.find(dish => dish.id === dishId))
      .filter((dish): dish is MenuDish => Boolean(dish));
  }, [menu?.dishes, selectedDishes]);
  const mobileOrderCopy = useMemo(() => {
    const copies = {
      vi: {
        title: 'Chọn món hôm nay',
        helper: 'Chạm vào món để chọn, kiểm tra lại ở thanh đặt món phía dưới.',
        perMeal: 'Mỗi suất',
        limit: 'Tối đa 2 món',
        selected: 'Đã chọn',
        empty: 'Chưa chọn món',
        clear: 'Xóa tất cả',
        removeDish: 'Xóa món',
        chooseMore: 'Có thể chọn thêm món thứ 2',
        orderFor: 'Đặt cho',
        quickOptions: 'Tùy chọn nhanh',
        noteHint: 'Ghi chú cho bếp',
        loadingUsers: 'Đang tải danh sách...',
        optionPrefix: 'Món'
      },
      en: {
        title: "Today's meal",
        helper: 'Tap dishes to choose, then review the tray at the bottom.',
        perMeal: 'Per meal',
        limit: 'Up to 2 dishes',
        selected: 'Selected',
        empty: 'No dish selected',
        clear: 'Clear all',
        removeDish: 'Remove dish',
        chooseMore: 'You can choose one more dish',
        orderFor: 'Order for',
        quickOptions: 'Quick options',
        noteHint: 'Kitchen note',
        loadingUsers: 'Loading users...',
        optionPrefix: 'Dish'
      },
      ja: {
        title: '今日の食事',
        helper: '料理をタップして選び、下の注文欄で確認してください。',
        perMeal: '1食',
        limit: '最大2品',
        selected: '選択済み',
        empty: '未選択',
        clear: 'すべて削除',
        removeDish: '削除',
        chooseMore: 'もう1品選べます',
        orderFor: '注文者',
        quickOptions: 'クイック設定',
        noteHint: '厨房メモ',
        loadingUsers: '読み込み中...',
        optionPrefix: '品'
      }
    };

    return copies[currentLang];
  }, [currentLang]);
  const orderOptionItems = [
    { key: 'extraRice', label: t.extraRice, compactLabel: currentLang === 'vi' ? 'Cơm' : currentLang === 'ja' ? 'ご飯' : 'Rice', checked: extraRice, onChange: setExtraRice },
    { key: 'extraSoup', label: t.extraSoup, compactLabel: currentLang === 'vi' ? 'Canh' : currentLang === 'ja' ? 'スープ' : 'Soup', checked: extraSoup, onChange: setExtraSoup },
    { key: 'chiliSauce', label: t.chiliSauce, compactLabel: currentLang === 'vi' ? 'Tương ớt' : currentLang === 'ja' ? 'チリ' : 'Chili', checked: chiliSauce, onChange: setChiliSauce },
    { key: 'fishSauce', label: t.fishSauce, compactLabel: currentLang === 'vi' ? 'Mắm' : currentLang === 'ja' ? '魚醤' : 'Sauce', checked: fishSauce, onChange: setFishSauce },
    { key: 'chopsticks', label: t.chopsticks, compactLabel: currentLang === 'vi' ? 'Đũa' : currentLang === 'ja' ? '箸' : 'Sticks', checked: chopsticks, onChange: setChopsticks },
    { key: 'lessRice', label: t.lessRice, compactLabel: currentLang === 'vi' ? 'Ít cơm' : currentLang === 'ja' ? '少なめ' : 'Less', checked: lessRice, onChange: setLessRice }
  ];
  const activePageLabel = useMemo(() => {
    const labels: Record<string, string> = {
      dashboard: t.dashboard,
      menu: t.menu,
      orders: user?.role === 'admin' ? t.admin.allOrders : t.orders,
      'payment-calendar': t.paymentCalendar,
      feedback: t.admin.feedback,
      'menu-mgmt': t.admin.menuManagement,
      stats: t.admin.statistics,
      payments: t.admin.payments,
      invoicing: t.admin.invoicing,
      accounts: t.admin.accountManagement,
      'banner-video': t.admin.bannerVideo || 'Quản lý Banner & Video',
      'media-mgmt': t.admin.bannerVideo || 'Quản lý Banner & Video'
    };

    return labels[activeTab] || activeTab;
  }, [activeTab, t, user?.role]);
  const activePageSubtitle = useMemo(() => {
    if (activeTab === 'banner-video' || activeTab === 'media-mgmt') {
      return 'Cấu hình banner hiển thị và video overlay toàn hệ thống';
    }
    if (user?.role === 'admin') {
      return 'Quản lý suất ăn nội bộ và theo dõi vận hành hằng ngày';
    }

    if (activeTab === 'menu') return 'Chọn món, kiểm tra tùy chọn và đặt cơm trong một màn hình';
    if (activeTab === 'payment-calendar') return 'Theo dõi công nợ, QR thanh toán và lịch ăn cá nhân';
    if (activeTab === 'orders') return 'Xem lại các suất cơm đã đặt và trạng thái gần nhất';
    return 'Tổng quan đặt cơm, thanh toán và hoạt động trong tuần';
  }, [activeTab, user?.role]);
  const weeklyOrderTotal = useMemo(() => {
    return weeklyData.reduce((total, item) => total + (Number(item.orders) || 0), 0);
  }, [weeklyData]);

  // Trạng thái mở rộng lịch sử thanh toán của từng user (mặc định chỉ hiện 3 lần gần nhất)
  const [expandedUserHistory, setExpandedUserHistory] = useState<Record<string, boolean>>({});
  const toggleUserHistoryExpanded = useCallback((userKey: string) => {
    setExpandedUserHistory(prev => ({
      ...prev,
      [userKey]: !prev[userKey]
    }));
  }, []);

  const paymentHistoryPageSize = 5;
  const paymentHistoryGroups = useMemo(() => {
    const grouped = paymentHistory.reduce((acc, history: any) => {
      const fullname = history.user?.fullname || history.fullname || history.username || 'Unknown';
      if (!acc[fullname]) {
        acc[fullname] = [];
      }
      acc[fullname].push(history);
      return acc;
    }, {} as Record<string, any[]>);

    // Sắp xếp mỗi danh sách giao dịch của từng người dùng theo ngày mới nhất trước
    Object.values(grouped).forEach(list => {
      list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    });

    return Object.entries(grouped).sort(([, firstHistory], [, secondHistory]) => {
      const firstDate = new Date(firstHistory?.[0]?.created_at || 0).getTime();
      const secondDate = new Date(secondHistory?.[0]?.created_at || 0).getTime();
      return secondDate - firstDate;
    });
  }, [paymentHistory]);
  const paymentHistoryTotalPages = Math.max(1, Math.ceil(paymentHistoryGroups.length / paymentHistoryPageSize));
  const paginatedPaymentHistoryGroups = useMemo(() => {
    const safePage = Math.min(Math.max(paymentHistoryPage, 1), paymentHistoryTotalPages);
    const start = (safePage - 1) * paymentHistoryPageSize;
    return paymentHistoryGroups.slice(start, start + paymentHistoryPageSize);
  }, [paymentHistoryGroups, paymentHistoryPage, paymentHistoryTotalPages]);

  useEffect(() => {
    setPaymentHistoryPage((page) => Math.min(page, paymentHistoryTotalPages));
  }, [paymentHistoryTotalPages]);

  const getPaymentUserId = useCallback((payment: any) => {
    const parsed = Number(payment?.userId ?? payment?.user_id ?? payment?.userid ?? payment?.id ?? payment?.user?.id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, []);

  const getPaymentDisplayName = useCallback((payment: any) => {
    const userId = getPaymentUserId(payment);
    return String(
      payment?.fullname ||
      payment?.username ||
      payment?.user?.fullname ||
      payment?.user?.username ||
      (userId ? `Người dùng #${userId}` : 'Không xác định người dùng')
    ).trim();
  }, [getPaymentUserId]);

  const dashboardPaymentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const getBankDisplayName = (bankId?: string) => {
    if (!bankId) return 'TPBank';
    if (bankId === '970423' || bankId.toUpperCase() === 'TPB' || bankId.toUpperCase() === 'TPBANK') {
      return 'TPBank';
    }
    return bankId;
  };

  const getEffectiveAccountNo = (accountNo?: string) => {
    if (!accountNo || accountNo === '00004446755') return '0097 2905 328';
    return accountNo;
  };

  const buildDashboardVietQrUrl = (bankId: string, info: DashboardAutoPaymentInfo) => {
    const amount = Math.max(0, Math.round(Number(info.amount || info.remainingTotal || 0)));
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: info.transferContent || info.code
    });

    if (info.bank?.accountName) {
      params.set('accountName', info.bank.accountName);
    }

    const safeAccountNo = (info.bank?.accountNo === '00004446755' || !info.bank?.accountNo)
      ? '00972905328'
      : info.bank.accountNo.replace(/\s+/g, '');
    const safeBankId = (bankId === '970423' || bankId === 'TPB' || !bankId) ? 'TPBank' : bankId;

    return `https://img.vietqr.io/image/${encodeURIComponent(safeBankId)}-${encodeURIComponent(safeAccountNo)}-compact2.png?${params.toString()}`;
  };

  const loadDashboardAutoPaymentInfo = useCallback(async (isSilent: boolean = false) => {
    if (!user || user.role !== 'user') {
      setDashboardAutoPaymentInfo(null);
      return;
    }

    try {
      if (!isSilent) {
        setIsDashboardQrLoading(true);
      }
      setDashboardQrImageFailed(false);
      const info = await paymentsAPI.getAutoInfo(dashboardPaymentMonth);
      setDashboardAutoPaymentInfo(info);
    } catch (error) {
      console.error('Dashboard dynamic QR error:', error);
      if (!isSilent) {
        setDashboardAutoPaymentInfo(null);
        setDashboardQrImageFailed(true);
      }
    } finally {
      if (!isSilent) {
        setIsDashboardQrLoading(false);
      }
    }
  }, [dashboardPaymentMonth, user?.id, user?.role]);

  const loadDashboardAutoPaymentUsage = useCallback(async () => {
    if (!user || user.role !== 'user') {
      setDashboardAutoPaymentUsage(null);
      return;
    }

    try {
      const usage = await paymentsAPI.getAutoUsage(dashboardPaymentMonth);
      setDashboardAutoPaymentUsage(usage);
    } catch (error) {
      console.error('Dashboard auto payment usage error:', error);
      setDashboardAutoPaymentUsage(null);
    }
  }, [dashboardPaymentMonth, user?.id, user?.role]);

  useEffect(() => {
    liveRefreshUserPaymentRef.current = () => {
      loadDashboardAutoPaymentInfo(true);
      loadDashboardAutoPaymentUsage();
    };
  }, [loadDashboardAutoPaymentInfo, loadDashboardAutoPaymentUsage]);

  const handleDashboardQrImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
    info: DashboardAutoPaymentInfo
  ) => {
    const img = event.currentTarget;
    const fallbackState = img.dataset.fallbackState || 'primary';

    if (fallbackState === 'primary') {
      img.dataset.fallbackState = 'tpbank';
      img.src = buildDashboardVietQrUrl('TPBank', info);
      return;
    }

    if (fallbackState === 'tpbank') {
      img.dataset.fallbackState = '970423';
      img.src = buildDashboardVietQrUrl('970423', info);
      return;
    }

    if (fallbackState === '970423') {
      img.dataset.fallbackState = 'tpb';
      img.src = buildDashboardVietQrUrl('TPB', info);
      return;
    }

    if (fallbackState === 'tpb') {
      img.dataset.fallbackState = 'static';
      img.src = '/QR.png';
      return;
    }

    setDashboardQrImageFailed(true);
  };

  const isDashboardAutoPaymentQuotaExhausted = !!(
    dashboardAutoPaymentUsage?.supported &&
    dashboardAutoPaymentUsage.limit &&
    dashboardAutoPaymentUsage.remaining === 0
  );

  // Smooth language switching
  const handleLanguageChange = async (newLang: Language) => {
    if (newLang === currentLang) return;
    
    setIsLanguageChanging(true);
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      setCurrentLang(newLang);
      // Force refresh menu for new language
      setTimeout(() => {
        refetchMenu(newLang);
        refetchOrders(); // Also refresh orders for new language
        setIsLanguageChanging(false);
      }, 300);
    }, 150);
  };

  // Smooth theme switching
  const handleThemeChange = (newTheme: 'fusion' | 'corporate') => {
    if (newTheme === theme) return;
    
    setIsThemeChanging(true);
    
    // Add transition class to body
    document.body.style.transition = 'all 0.3s ease-in-out';
    
    setTimeout(() => {
      setTheme(newTheme);
      setTimeout(() => {
        setIsThemeChanging(false);
        document.body.style.transition = '';
      }, 300);
    }, 150);
  };

  useEffect(() => {
    document.documentElement.className = theme === 'corporate' ? 'theme-corporate' : '';
  }, [theme]);

  // Reset banner visibility when banner type changes
  useEffect(() => {
    setShowBanner(true);
  }, [bannerType]);

  // Fetch weekly data
  const fetchWeeklyData = async () => {
    try {
      setWeeklyLoading(true);
      const data = await ordersAPI.getWeeklyStats();
      setWeeklyData(data);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      // Fallback to empty data
      setWeeklyData([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Fetch statistics data
  const fetchStatsData = async () => {
    try {
      setStatsLoading(true);
      // Temporarily disable stats to avoid errors
      setStatsData({
        todayOrders: 0,
        monthOrders: 0,
        monthRevenue: 0,
        uniqueUsers: 0,
        topDishes: []
      });
    } catch (error) {
      console.error('Error fetching stats data:', error);
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWeeklyData();
      fetchAllUsers();
      if (user.role === 'admin') {
        fetchStatsData();
      }
    }
  }, [user?.id]); // Only re-run when user ID changes, not the entire user object

  useEffect(() => {
    if (activeTab === 'dashboard' && user?.role === 'user') {
      loadDashboardAutoPaymentInfo();
      loadDashboardAutoPaymentUsage();

      const handleVisibilityOrFocus = () => {
        if (document.visibilityState === 'visible') {
          loadDashboardAutoPaymentInfo(true);
          loadDashboardAutoPaymentUsage();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);

      // Định kỳ 30 giây đồng bộ lại trạng thái nợ / QR trên Dashboard (chạy ngầm)
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadDashboardAutoPaymentInfo(true);
          loadDashboardAutoPaymentUsage();
        }
      }, 30000);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        clearInterval(intervalId);
      };
    }
  }, [activeTab, user?.id, user?.role, loadDashboardAutoPaymentInfo, loadDashboardAutoPaymentUsage]);

  const fetchAllUsers = async () => {
    try {
      const cached = cacheService.get<Array<{id: number, fullname: string}>>('users_list');
      if (cached) {
        setAllUsers(cached);
        return;
      }
      const users = await usersAPI.getList();
      cacheService.set('users_list', users, 300);
      setAllUsers(users);
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
    }
  };

  const filteredOrderForUsers = useMemo(() => {
    if (!orderForSearch.trim()) return allUsers;
    const term = orderForSearch.toLowerCase().trim();
    return allUsers.filter(u => u.fullname?.toLowerCase().includes(term) || String(u.id).includes(term));
  }, [allUsers, orderForSearch]);

  const handleSelectDish = (dishId: number) => {
    if (selectedDishes.includes(dishId)) {
      // Bỏ chọn món này
      const nextDishes = selectedDishes.filter(id => id !== dishId);
      setSelectedDishes(nextDishes);
      setDishSelectFeedback('Đã bỏ chọn món');
    } else if (selectedDishes.length < 2) {
      // Thêm món mới nếu chưa đủ 2 món
      const nextDishes = [...selectedDishes, dishId];
      setSelectedDishes(nextDishes);
      setDishSelectFeedback(nextDishes.length === 1 ? 'Đã chọn món 1 (chọn thêm 1 món nữa nếu muốn)' : 'Đã chọn đủ 2 món!');
    } else {
      // Đã chọn đủ 2 món, thay thế món cuối cùng
      setSelectedDishes([selectedDishes[0], dishId]);
      setDishSelectFeedback('Đã đổi sang món mới (tối đa 2 món)');
    }
  };

  useEffect(() => {
    if (!dishSelectFeedback) return;
    const timer = setTimeout(() => setDishSelectFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [dishSelectFeedback]);

  useEffect(() => {
    if (selectedDishes.length === 0) {
      setIsMobileOrderSheetExpanded(false);
    }
  }, [selectedDishes.length]);

  const handleShowOrderSummary = () => {
    if (!user || selectedDishes.length === 0) return;
    setShowOrderSummary(true);
  };

  const handleConfirmOrder = async () => {
    if (!user || selectedDishes.length === 0) return;
    
    if (!canPlaceOrder) {
      alert((t.deadline?.alertExpiredOrder || 'Đã hết giờ đặt cơm hôm nay (hạn chót là {deadline}). Bếp đã khóa danh sách để nấu món.').replace('{deadline}', '11:00'));
      return;
    }
    
    setIsPlacingOrder(true);
    
    // Tạo ghi chú từ các tùy chọn - luôn dùng tiếng Việt
    const viTranslations = TRANSLATIONS.vi;
    const options = [];
    if (extraRice) options.push(viTranslations.extraRice);
    if (extraSoup) options.push(viTranslations.extraSoup);
    if (chiliSauce) options.push(viTranslations.chiliSauce);
    if (fishSauce) options.push(viTranslations.fishSauce);
    if (chopsticks) options.push(viTranslations.chopsticks);
    if (lessRice) options.push(viTranslations.lessRice);
    
    const finalNotes = [...options, orderNotes.trim()].filter(Boolean).join(' ');
    
    try {
      await createOrder({
        dish1Id: selectedDishes[0],
        dish2Id: selectedDishes[1] || undefined,
        orderedFor: orderForUserId || user.id,
        notes: finalNotes,
        rating: undefined
      });
      
      // Close modal and show success immediately without waiting for background fetches
      setShowOrderSummary(false);
      setShowOrderSuccess(true);
      setSelectedDishes([]);
      // Reset options
      setOrderNotes('');
      setExtraRice(false);
      setExtraSoup(false);
      setChiliSauce(false);
      setFishSauce(false);
      setChopsticks(false);
      setLessRice(false);
      setOrderForUserId(null);

      // Instantly refresh admin stats and notify listening components
      if (user?.role === 'admin') {
        refetchDashboardStats(true);
      }
      window.dispatchEvent(new CustomEvent('app:order-update'));
      
      setTimeout(() => setShowOrderSuccess(false), 3000);
    } catch (error) {
      console.error('Lỗi khi đặt món:', error);
      alert(t.orderError + ': ' + (error instanceof Error ? error.message : t.unknownError));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    handleShowOrderSummary();
  };

  const handleCreateMenu = async () => {
    const lines = menuText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      alert(t.pleaseEnterMenu);
      return;
    }

    try {
      await createMenu(lines);
      setShowAddMenuModal(false);
      setMenuText('');
      // Refetch menu sau khi tạo thành công
      await refetchMenu();
    } catch (error) {
      console.error('Lỗi khi tạo menu:', error);
      alert(t.menuError);
    }
  };

  const handleCreateMultilingualMenu = async () => {
    if (multilingualMenus.length === 0) {
      alert(t.pleaseAddDish);
      return;
    }

    try {
      await createMultilingualMenu(multilingualMenus);
      setShowMultilingualModal(false);
      setMultilingualMenus([]);
      setMultilingualText('');
      alert('Menu đa ngôn ngữ đã được tạo thành công!');
    } catch (error) {
      console.error('Lỗi khi tạo menu đa ngôn ngữ:', error);
      alert('Lỗi khi tạo menu đa ngôn ngữ');
    }
  };

  const parseMultilingualText = () => {
    const lines = multilingualText.trim().split('\n').filter(line => line.trim() !== '');
    const parsedDishes: Array<{vi: string, en: string, ja: string}> = [];
    
    lines.forEach(line => {
      const parts = line.split('>>>>>').map(part => part.trim());
      if (parts.length === 3) {
        // Remove markdown formatting (**, *, _, etc.)
        const cleanVi = parts[0].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        const cleanEn = parts[1].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        const cleanJa = parts[2].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
        
        parsedDishes.push({
          vi: cleanVi,
          en: cleanEn, 
          ja: cleanJa
        });
      }
    });
    
    setMultilingualMenus(parsedDishes);
  };

  const handleCreateMultilingualFromText = async () => {
    parseMultilingualText();
    
    if (multilingualMenus.length === 0) {
      // Parse first, then check
      const lines = multilingualText.trim().split('\n').filter(line => line.trim() !== '');
      const parsedDishes: Array<{vi: string, en: string, ja: string}> = [];
      
      lines.forEach(line => {
        const parts = line.split('>>>>>').map(part => part.trim());
        if (parts.length === 3) {
          // Remove markdown formatting (**, *, _, etc.)
          const cleanVi = parts[0].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
          const cleanEn = parts[1].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
          const cleanJa = parts[2].replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
          
          parsedDishes.push({
            vi: cleanVi,
            en: cleanEn, 
            ja: cleanJa
          });
        }
      });
      
      if (parsedDishes.length === 0) {
        alert(t.menuFormatError);
        return;
      }
      
      try {
        await createMultilingualMenu(parsedDishes);
        setShowMultilingualModal(false);
        setMultilingualMenus([]);
        setMultilingualText('');
        alert('Menu đa ngôn ngữ đã được tạo thành công!');
      } catch (error) {
        console.error('Lỗi khi tạo menu đa ngôn ngữ:', error);
        alert('Lỗi khi tạo menu đa ngôn ngữ');
      }
    }
  };

  const addMultilingualDish = () => {
    setMultilingualMenus([...multilingualMenus, { vi: '', en: '', ja: '' }]);
  };

  const updateMultilingualDish = (index: number, lang: 'vi' | 'en' | 'ja', value: string) => {
    // Remove markdown formatting when updating dish names
    const cleanValue = value.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
    const updated = [...multilingualMenus];
    updated[index][lang] = cleanValue;
    setMultilingualMenus(updated);
  };

  const removeMultilingualDish = (index: number) => {
    setMultilingualMenus(multilingualMenus.filter((_, i) => i !== index));
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      alert(t.pleaseFeedback);
      return;
    }

    try {
      console.log('Sending feedback:', { subject: feedbackSubject, message: feedbackMessage });
      await createFeedback(feedbackSubject.trim() || undefined, feedbackMessage.trim());
      setFeedbackSubject('');
      setFeedbackMessage('');
      setShowFeedbackForm(false);
      alert('Góp ý đã được gửi thành công!');
    } catch (error) {
      console.error('Lỗi khi gửi góp ý:', error);
      alert('Lỗi khi gửi góp ý: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    }
  };

  const handleDeleteDish = async (dishId: number) => {
    if (!confirm('Bạn có chắc muốn xóa món này?')) return;
    
    try {
      await menuAPI.deleteDish(dishId);
      refetchMenu();
    } catch (error) {
      console.error('Lỗi khi xóa món:', error);
      alert('Lỗi khi xóa món');
    }
  };

  // Export menu function
  const handleExportMenu = () => {
    if (!orders || orders.length === 0) {
      alert('Không có đơn hàng nào để xuất');
      return;
    }

    // Filter orders for today only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    if (todayOrders.length === 0) {
      alert(t.ui?.noOrdersTodayToExport || 'Không có đơn hàng nào hôm nay để xuất');
      return;
    }

    // Debug log
    console.log('📋 Export menu - Today\'s Orders data:');
    todayOrders.forEach((order, idx) => {
      console.log(`Order ${idx + 1}:`, {
        id: order.id,
        date: order.created_at,
        receiver: order.receiver?.fullname,
        dish1: order.dish1 ? { name: order.dish1.name, sort_order: order.dish1.sort_order } : null,
        dish2: order.dish2 ? { name: order.dish2.name, sort_order: order.dish2.sort_order } : null,
        notes: order.notes
      });
    });

    // Mapping tiếng Nhật sang tiếng Việt
    const jaToViMapping = {
      'ご飯追加': 'Thêm cơm',
      'スープ追加': 'Thêm canh',
      'チリソース': 'Thêm tương ớt',
      'ヌクマム': 'Thêm mắm',
      '箸': 'Thêm thìa',
      'ご飯少なめ': 'Ít cơm'
    };

    // Create export format: Number. Name 1+2 (Notes)
    const exportLines: string[] = [];

    todayOrders.forEach((order, index) => {
      const userName = order.receiver?.fullname || 'N/A';
      
      // Get dish positions (sort_order) and add 1 to get menu number
      const dish1Position = (order.dish1?.sort_order ?? 0) + 1;
      const dish2Position = order.dish2 ? ((order.dish2?.sort_order ?? 0) + 1) : 0;
      
      // Build dish text: 1+2 or just 1
      let dishText = '';
      if (dish2Position > 0) {
        dishText = `${dish1Position}+${dish2Position}`;
      } else {
        dishText = `${dish1Position}`;
      }

      let line = `${index + 1}.\t${userName} ${dishText}`;
      
      // Add notes if available - convert Japanese to Vietnamese if needed
      if (order.notes && order.notes.trim()) {
        let notes = order.notes;
        // Replace Japanese text with Vietnamese
        Object.entries(jaToViMapping).forEach(([ja, vi]) => {
          notes = notes.replace(new RegExp(ja, 'g'), vi);
        });
        line += ` (${notes})`;
      }
      
      exportLines.push(line);
    });

    const exportText = exportLines.join('\n');
    console.log('📋 Export text:', exportText);
    setExportedMenu(exportText);
    setShowExportModal(true);
  };

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedMenu);
      // Show success message
      const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = `✅ ${t.copied}`;
        button.disabled = true;
        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error('Lỗi khi copy:', error);
      alert('Lỗi khi copy. Vui lòng copy thủ công bằng cách chọn text và Ctrl+C.');
    }
  };

  // Show loading screen
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center lotus-pattern ${theme === 'corporate' ? 'corporate-theme bg-[#F0FDFA]' : 'bg-app-bg'}`}>
        <div className="flex flex-col items-center gap-6">
          <div className={`w-16 h-16 border-4 rounded-full animate-spin shadow-xl ${theme === 'corporate' ? 'border-[#00A693]/10 border-t-[#00A693] shadow-[#00A693]/5' : 'border-app-accent/10 border-t-app-accent shadow-app-accent/5'}`} />
          <div className="flex flex-col items-center">
            <p className={`text-sm font-display font-bold tracking-tight mb-1 ${theme === 'corporate' ? 'text-[#004D40]' : 'text-app-ink'}`}>FSI DDS</p>
            <p className={`text-[10px] font-bold tracking-[0.3em] uppercase ${theme === 'corporate' ? 'text-[#00A693]/60' : 'text-app-accent/60'}`}>Đang chuẩn bị không gian...</p>
          </div>
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

  return (
    <div className={`app-shell desktop-app-shell flex flex-col lg:flex-row min-h-screen text-app-ink font-sans ${theme === 'corporate' ? 'corporate-theme' : ''} bg-app-bg`}>
      {/* Toast floating notification for admin/staff */}
      {latestNotification && (
        <div 
          onClick={() => {
            setActiveTab('orders');
            clearLatestNotification();
          }}
          className="fixed top-5 right-5 z-[100] max-w-sm w-full bg-slate-950/90 backdrop-blur-xl text-white border border-amber-500/50 rounded-2xl shadow-2xl cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-slide-in-right overflow-hidden ring-1 ring-white/10"
        >
          <div className="p-4 flex items-start gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <Bell className="text-amber-400" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Đơn hàng mới!
                </span>
              </div>
              <p className="font-bold text-sm text-white truncate mt-1">{latestNotification.customerName}</p>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{latestNotification.dishNames?.join(', ')}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                clearLatestNotification();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          {/* Animated 6-second progress bar */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 w-full animate-toast-progress" />
        </div>
      )}
      {/* Video Overlay is rendered inside <main> as a dashboard replacement */}
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-app-ink/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="fsi-logo">
          <div className="fsi-logo-icon">
            {/* FSI Logo Pattern */}
          </div>
          <div className="fsi-logo-text text-sm">FSI DDS</div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Switcher - Mobile */}
          <button
            onClick={() => handleThemeChange(theme === 'corporate' ? 'fusion' : 'corporate')}
            disabled={isThemeChanging}
            className={`p-2 rounded-lg transition-all duration-300 ${
              theme === 'corporate' 
                ? 'bg-[#00A693]/10 text-[#00A693]' 
                : 'bg-[#DA251D]/10 text-[#DA251D]'
            } ${isThemeChanging ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={theme === 'corporate' ? 'Switch to Fusion' : 'Switch to Corporate'}
          >
            <Palette size={16} />
          </button>
          
          {/* Language Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['vi', 'en', 'ja'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                  currentLang === lang 
                    ? 'bg-white text-app-accent shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-app-accent/10 text-app-accent hover:bg-app-accent/20 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Sticky Deadline Bar (Toàn trang) */}
      <div className="lg:hidden bg-white/95 border-b border-app-ink/10 px-4 py-1.5 flex items-center justify-between sticky top-[57px] z-40 backdrop-blur-md">
        <span className="text-[10px] font-black uppercase tracking-wider text-app-ink/40">Hạn chót đặt cơm</span>
        <OrderDeadlineCountdown
          variant="pill"
          isAdmin={user?.role === 'admin'}
          currentLang={currentLang}
          translations={t}
        />
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-white z-50 lg:hidden"
            >
              <div className="p-6 border-b border-app-ink/10">
                <div className="flex items-center justify-between">
                  <div className="fsi-logo">
                    <div className="fsi-logo-icon">
                      {/* FSI Logo Pattern */}
                    </div>
                    <div>
                      <div className="fsi-logo-text">FSI DDS</div>
                      <div className="fsi-logo-subtitle">Digital Data Solutions</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <div className="mb-4">
                  <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>
                    {currentLang === 'vi' ? 'Mục lục' : currentLang === 'en' ? 'Menu' : 'メニュー'}
                  </p>
                  
                  <MobileSidebarItem 
                    icon={<LayoutDashboard size={18} />} 
                    label={t.dashboard} 
                    active={activeTab === 'dashboard'} 
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsMobileMenuOpen(false);
                      refetchOrders();
                    }} 
                  />
                  <MobileSidebarItem 
                    icon={<Utensils size={18} />} 
                    label={t.menu} 
                    active={activeTab === 'menu'} 
                    onClick={() => {
                      setActiveTab('menu');
                      setIsMobileMenuOpen(false);
                      refetchOrders();
                    }} 
                  />
                  <MobileSidebarItem 
                    icon={<History size={18} />} 
                    label={t.orders} 
                    active={activeTab === 'orders'} 
                    onClick={() => {
                      setActiveTab('orders');
                      setIsMobileMenuOpen(false);
                      refetchOrders();
                    }} 
                  />
                  {user?.role !== 'admin' && (
                    <MobileSidebarItem 
                      icon={<Calendar size={18} />} 
                      label={t.paymentCalendar} 
                      active={activeTab === 'payment-calendar'} 
                      onClick={() => {
                        setActiveTab('payment-calendar');
                        setIsMobileMenuOpen(false);
                        refetchOrders();
                      }} 
                    />
                  )}
                  <MobileSidebarItem 
                    icon={<MessageSquare size={18} />} 
                    label={t.feedback} 
                    active={activeTab === 'feedback'} 
                    onClick={() => {
                      setActiveTab('feedback');
                      setIsMobileMenuOpen(false);
                      refetchOrders();
                    }} 
                  />
                  
                  {user?.role === 'admin' && (
                    <>
                      <div className="my-6 border-t border-app-ink/5" />
                      <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>
                        {currentLang === 'vi' ? 'Quản trị' : currentLang === 'en' ? 'Admin' : '管理'}
                      </p>
                      <MobileSidebarItem 
                        icon={<Settings size={18} />} 
                        label={t.admin.menuManagement} 
                        active={activeTab === 'menu-mgmt'} 
                        onClick={() => {
                          setActiveTab('menu-mgmt');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<ClipboardList size={18} />} 
                        label={t.admin.allOrders} 
                        active={activeTab === 'orders'} 
                        onClick={() => {
                          setActiveTab('orders');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<BarChart3 size={18} />} 
                        label={t.admin.statistics} 
                        active={activeTab === 'stats'} 
                        onClick={() => {
                          setActiveTab('stats');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<DollarSign size={18} />} 
                        label={t.admin.payments} 
                        active={activeTab === 'payments'} 
                        onClick={() => {
                          setActiveTab('payments');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<Calendar size={18} />} 
                        label={t.admin.invoicing} 
                        active={activeTab === 'invoicing'} 
                        onClick={() => {
                          setActiveTab('invoicing');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<MessageSquare size={18} />} 
                        label={t.admin.feedback} 
                        active={activeTab === 'feedback'} 
                        onClick={() => {
                          setActiveTab('feedback');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<UserIcon size={18} />} 
                        label={t.admin.accountManagement} 
                        active={activeTab === 'accounts'} 
                        onClick={() => {
                          setActiveTab('accounts');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<Play size={18} />} 
                        label={t.admin.bannerVideo} 
                        active={activeTab === 'banner-video'} 
                        onClick={() => {
                          setActiveTab('banner-video');
                          setIsMobileMenuOpen(false);
                        }} 
                      />
                    </>
                  )}
                </div>
              </nav>
              
              <div className="p-4 border-t border-app-ink/10">
                {/* Theme Switcher */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-app-ink/60 mb-2">Theme</p>
                  <div className="flex items-center gap-2 bg-app-cream p-1.5 rounded-xl border border-app-ink/10">
                    {(['fusion', 'corporate'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        disabled={isThemeChanging}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                          theme === t 
                            ? 'bg-app-accent text-white shadow-md scale-105' 
                            : 'text-app-ink/40 hover:text-app-accent hover:scale-102'
                        } ${isThemeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {t === 'fusion' ? 'Fusion' : 'Corp'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full border border-app-accent/10 bg-app-accent flex items-center justify-center text-white font-bold text-sm">
                    {user?.fullname?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-app-ink">{user?.fullname}</p>
                    <p className="text-xs text-app-ink/40">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-bold text-sm">{t.logout}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="desktop-sidebar hidden lg:flex w-72 bg-white border-r border-app-ink/10 flex-col transition-all duration-300 relative silk-texture">
        <div className="p-8 flex items-center gap-4">
          {/* FSI DDS Logo */}
          <div className="fsi-logo">
            <div className="fsi-logo-icon">
              {/* FSI Logo Pattern */}
            </div>
            <div>
              <div className="fsi-logo-text">FSI DDS</div>
              <div className="fsi-logo-subtitle">Digital Data Solutions</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
          <div className="mb-4">
            <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>{t.ui?.navigation || 'Mục lục'}</p>
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label={t.dashboard} 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<Utensils size={20} />} 
              label={t.menu} 
              active={activeTab === 'menu'} 
              onClick={() => setActiveTab('menu')} 
            />
            <SidebarItem 
              icon={<ClipboardList size={20} />} 
              label={user?.role === 'admin' ? t.admin.allOrders : t.orders} 
              active={activeTab === 'orders'} 
              onClick={() => {
                setActiveTab('orders');
                // Refresh orders when switching to orders tab
                refetchOrders();
              }} 
            />
            {user?.role !== 'admin' && (
              <SidebarItem 
                icon={<Calendar size={20} />} 
                label={t.paymentCalendar} 
                active={activeTab === 'payment-calendar'} 
                onClick={() => setActiveTab('payment-calendar')} 
              />
            )}
            <SidebarItem 
              icon={<MessageSquare size={20} />} 
              label={t.admin.feedback} 
              active={activeTab === 'feedback'} 
              onClick={() => setActiveTab('feedback')} 
            />
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4 border-t border-[#E5E1D1]">
              <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>{t.ui?.administration || 'Quản trị'}</p>
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
              <SidebarItem 
                icon={<Calendar size={20} />} 
                label={t.admin.payments} 
                active={activeTab === 'payments'} 
                onClick={() => setActiveTab('payments')} 
              />
              <SidebarItem 
                icon={<Calendar size={20} />} 
                label={t.admin.invoicing} 
                active={activeTab === 'invoicing'} 
                onClick={() => setActiveTab('invoicing')} 
              />
              <SidebarItem 
                icon={<UserIcon size={20} />} 
                label={t.admin.accountManagement} 
                active={activeTab === 'accounts'} 
                onClick={() => setActiveTab('accounts')} 
              />
              <SidebarItem 
                icon={<Play size={20} />} 
                label={t.admin.bannerVideo} 
                active={activeTab === 'banner-video'} 
                onClick={() => setActiveTab('banner-video')} 
              />
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-4 text-app-ink/40 hover:text-app-accent transition-colors"
          >
            <LogOut size={20} />
            <span className="font-bold text-xs uppercase tracking-widest">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-app-ink/10 px-4 py-2 z-50 mobile-bottom-nav">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'dashboard' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-xs font-medium">{t.dashboard}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'menu' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
            }`}
          >
            <Utensils size={20} />
            <span className="text-xs font-medium">{t.menu}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('orders');
              refetchOrders();
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'orders' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
            }`}
          >
            <ClipboardList size={20} />
            <span className="text-xs font-medium">{user?.role === 'admin' ? t.admin.allOrders : t.orders}</span>
          </button>
          
          {user?.role !== 'admin' ? (
            <button
              onClick={() => setActiveTab('payment-calendar')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === 'payment-calendar' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
              }`}
            >
              <Calendar size={20} />
              <span className="text-xs font-medium">{t.paymentCalendar}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === 'stats' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
              }`}
            >
              <BarChart3 size={20} />
              <span className="text-xs font-medium">{t.admin.statistics}</span>
            </button>
          )}
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('menu-mgmt')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === 'menu-mgmt' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
              }`}
            >
              <Settings size={20} />
              <span className="text-xs font-medium">Menu</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main flex-1 flex flex-col overflow-hidden relative pb-20 lg:pb-0">
        {/* Header - Hidden on mobile */}
        <header className="desktop-topbar hidden lg:flex h-24 border-b border-app-ink/10 items-center justify-between px-10 shrink-0 bg-white/85 backdrop-blur-md z-20 silk-texture relative">
          {/* Theme transition overlay */}
          <AnimatePresence>
            {isThemeChanging && (
              <div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-app-ink/70">{t.ui?.switchingTheme || 'Đang chuyển theme...'}</span>
                </div>
              </div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4">
            <div
              key={`${activeTab}-${currentLang}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-app-accent/55 mb-1">FSI DDS Workspace</p>
              <h2 className="text-3xl font-display font-bold tracking-tight brush-accent">
                {activePageLabel}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-xs font-semibold text-app-ink/45 tracking-wide">
                  {activePageSubtitle}
                </p>
                {(ordersUpdating || isUpdatingPayments) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-pulse">
                    <RefreshCw size={11} className="animate-spin text-emerald-600" />
                    <span>{t.ui?.syncing || 'Đang đồng bộ...'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 xl:gap-6">
            {/* Live Order Deadline Countdown Pill */}
            <OrderDeadlineCountdown
              variant="pill"
              isAdmin={user?.role === 'admin'}
              currentLang={currentLang}
              translations={t}
            />

            <div className="flex items-center gap-2 bg-app-cream p-1.5 rounded-xl border border-app-ink/10">
              {(['fusion', 'corporate'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  disabled={isThemeChanging}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                    theme === t 
                      ? 'bg-app-accent text-white shadow-md scale-105' 
                      : 'text-app-ink/40 hover:text-app-accent hover:scale-102'
                  } ${isThemeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t === 'fusion' ? 'Fusion' : 'Corp'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-app-cream p-1.5 rounded-xl border border-app-ink/10">
              {(['vi', 'en', 'ja'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  disabled={isLanguageChanging}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                    currentLang === lang 
                      ? 'bg-app-accent text-white shadow-lg scale-105' 
                      : 'text-app-ink/40 hover:text-app-accent hover:scale-102'
                  } ${isLanguageChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Notification Bell toggle for Admin/Staff */}
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                title={
                  permissionStatus === 'granted'
                    ? 'Thông báo đơn mới: Đang BẬT'
                    : 'Nhấn để BẬT thông báo đơn mới trên trình duyệt'
                }
                className={`relative p-2.5 rounded-xl border transition-all ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
                }`}
              >
                <Bell size={18} />
                {permissionStatus === 'granted' && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            )}

            <div className="flex items-center gap-4 pl-6 border-l border-[#E5E1D1]">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-[#1C1917]">{user?.fullname}</p>
                <p className="text-[10px] text-app-accent/60 font-bold uppercase tracking-widest">{user?.role === 'admin' ? (t.ui?.adminRole || 'Quản trị viên') : (t.ui?.userRole || 'Người dùng')} {user?.id ? `(#${user.id})` : ''}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-app-accent/10 shadow-sm bg-app-accent flex items-center justify-center text-white font-bold">
                {user?.fullname?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="app-content desktop-content flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10 bg-app-bg relative">
          {/* Tab transition overlay */}
          <AnimatePresence>
            {isLanguageChanging && (
              <div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-40"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                  <p className="text-app-ink/70 font-medium">{t.ui?.switchingLanguage || 'Đang chuyển ngôn ngữ...'}</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && user?.role === 'user' && videoSettings.enabled && !videoSettings.isLoading && (
              <div
                key="dashboard-video"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="desktop-dashboard w-full"
              >
                <React.Suspense fallback={null}><VideoOverlay forceVisible /></React.Suspense>
              </div>
            )}

            {activeTab === 'dashboard' && user?.role === 'user' && (!videoSettings.enabled || videoSettings.isLoading) && (
              <div
                key="dashboard-user"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="desktop-dashboard space-y-5 lg:space-y-6"
              >
                {/* Banner Display */}
                {showBanner && (
                  <div className="w-full">
                    <BannerDisplay onClose={() => setShowBanner(false)} />
                  </div>
                )}

                <div className="hidden lg:grid grid-cols-3 gap-4">
                  {/* Daily Quote Mini Card */}
                  <div className="desktop-summary-card lacquer-card p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-ink/35">Hôm nay</p>
                      <p className="mt-1 text-sm font-semibold text-app-ink leading-snug line-clamp-2">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center shrink-0">
                      <Sparkles size={24} />
                    </div>
                  </div>

                  {/* Debt / Payment Due Card */}
                  <div className={`desktop-summary-card lacquer-card p-5 flex items-center justify-between gap-4 transition-all ${
                    dashboardAutoPaymentInfo?.isPaid || (dashboardAutoPaymentInfo?.amount || 0) <= 0
                      ? 'border-2 border-emerald-300 bg-emerald-50/80 text-emerald-950'
                      : 'border-2 border-amber-300 bg-amber-50/60 text-slate-900'
                  }`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-ink/40">{t.ui?.paymentDue || 'Cần thanh toán'}</p>
                      {dashboardAutoPaymentInfo?.isPaid || (dashboardAutoPaymentInfo?.amount || 0) <= 0 ? (
                        <>
                          <p className="mt-1.5 text-base sm:text-lg font-black text-emerald-800 leading-snug">
                            {t.deadline?.debtFreeTitle || 'Tuyệt vời! Bạn không còn nợ tiền cơm'}
                          </p>
                          <p className="mt-0.5 text-xs text-emerald-700/80 font-medium">
                            {t.deadline?.debtFreeDesc || 'Toàn bộ các suất ăn tháng này đã hoàn tất.'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1.5 text-3xl font-black text-[#DA251D]">
                            {(dashboardAutoPaymentInfo?.amount || 0).toLocaleString()}đ
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const qrCard = document.querySelector('.desktop-qr-card');
                              if (qrCard) {
                                qrCard.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                setActiveTab('payment-calendar');
                              }
                            }}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-accent text-white text-xs font-bold hover:bg-app-accent/90 transition-all shadow-sm shadow-app-accent/20"
                          >
                            <QrCode size={13} />
                            <span>{t.deadline?.payNowWithQr || 'Thanh toán ngay bằng QR'}</span>
                          </button>
                        </>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      dashboardAutoPaymentInfo?.isPaid || (dashboardAutoPaymentInfo?.amount || 0) <= 0
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {dashboardAutoPaymentInfo?.isPaid || (dashboardAutoPaymentInfo?.amount || 0) <= 0 ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <QrCode size={24} />
                      )}
                    </div>
                  </div>

                  <div className="desktop-summary-card lacquer-card p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-ink/35">{t.ui?.autoQuota || 'Lượt tự động'}</p>
                      <p className="mt-2 text-3xl font-black text-app-ink">
                        {dashboardAutoPaymentUsage?.limit && !dashboardAutoPaymentUsage?.providerSynced && dashboardAutoPaymentUsage?.used === 0
                          ? '--'
                          : dashboardAutoPaymentUsage?.remaining !== null && dashboardAutoPaymentUsage?.remaining !== undefined
                          ? dashboardAutoPaymentUsage.remaining
                          : dashboardAutoPaymentUsage?.used || 0}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-app-ink/45">
                        {dashboardAutoPaymentUsage?.limit && !dashboardAutoPaymentUsage?.providerSynced && dashboardAutoPaymentUsage?.used === 0
                          ? 'Chưa sync SePay'
                          : dashboardAutoPaymentUsage?.providerSynced
                          ? 'Còn lại theo SePay'
                          : dashboardAutoPaymentUsage?.remaining !== null && dashboardAutoPaymentUsage?.remaining !== undefined
                            ? 'Còn lại trong tháng'
                            : 'Đã ghi nhận'}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
                  {/* Daily Quote Section */}
                  <div className="desktop-panel lg:col-span-7 xl:col-span-8 lacquer-card overflow-hidden h-full min-h-[320px] xl:min-h-[360px]">
                    <React.Suspense fallback={
                      <div className="w-full h-full min-h-[320px] xl:min-h-[360px] bg-stone-100 animate-pulse rounded-2xl" />
                    }>
                      <DailyQuote currentLang={currentLang} />
                    </React.Suspense>
                  </div>

                  {/* Payment QR Section */}
                  <div className="desktop-qr-card lg:col-span-5 xl:col-span-4 lacquer-card p-5 xl:p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full seigaiha-pattern opacity-20" />
                    <div className="bg-app-accent/10 p-4 rounded-[1.75rem] mb-5 shadow-inner shadow-app-accent/5 relative z-10">
                      <div className="bg-white p-5 rounded-3xl shadow-sm silk-texture">
                      {isDashboardQrLoading ? (
                        <div className="w-44 h-44 flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                        </div>
                      ) : dashboardAutoPaymentInfo?.qrUrl && !dashboardAutoPaymentInfo.isPaid && !dashboardQrImageFailed ? (
                        <img
                          key={`${dashboardAutoPaymentInfo.code}-${dashboardAutoPaymentInfo.amount}`}
                          src={dashboardAutoPaymentInfo.qrUrl}
                          alt="Payment QR Code"
                          referrerPolicy="no-referrer"
                          className="w-44 h-44 object-contain"
                          onError={(event) => handleDashboardQrImageError(event, dashboardAutoPaymentInfo)}
                        />
                      ) : (
                        <div className="w-44 h-44 flex flex-col items-center justify-center gap-3 text-app-ink">
                          <QrCode size={42} className="text-app-accent" />
                          <p className="text-sm font-bold">
                            {dashboardAutoPaymentInfo?.isPaid ? 'Đã thanh toán' : 'Chưa có QR động'}
                          </p>
                          <p className="text-xs text-app-ink/60">
                            {dashboardAutoPaymentInfo?.isPaid ? 'Hiện không còn khoản nợ.' : 'Mở tab Thanh toán để cập nhật lại.'}
                          </p>
                        </div>
                      )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full mb-2 relative z-10 px-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-accent/60">{t.ui?.paymentThisMonth || 'Thanh toán tháng này'}</p>
                      <button
                        onClick={() => {
                          loadDashboardAutoPaymentInfo();
                          loadDashboardAutoPaymentUsage();
                          refetchOrders();
                        }}
                        disabled={isDashboardQrLoading}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-app-accent hover:text-app-accent/80 transition-colors py-0.5 px-2 rounded-lg hover:bg-app-accent/10 disabled:opacity-50"
                        title="Đồng bộ lại khoản nợ và QR"
                      >
                        <RefreshCw size={12} className={isDashboardQrLoading ? 'animate-spin' : ''} />
                        <span>Làm mới</span>
                      </button>
                    </div>
                    <h3 className="text-xl font-display font-bold text-app-ink mb-2 relative z-10">
                      {isDashboardAutoPaymentQuotaExhausted ? 'Thanh toán trực tiếp TPBank' : t.paymentQR}
                    </h3>
                    <p className="text-app-ink/55 text-sm mb-4 relative z-10">
                      {isDashboardAutoPaymentQuotaExhausted && dashboardAutoPaymentInfo && !dashboardAutoPaymentInfo.isPaid
                        ? `Hết lượt tự động, chuyển trực tiếp: ${dashboardAutoPaymentInfo.amount.toLocaleString()}đ`
                        : dashboardAutoPaymentInfo && !dashboardAutoPaymentInfo.isPaid
                          ? `${t.scanToPay}: ${dashboardAutoPaymentInfo.amount.toLocaleString()}đ`
                          : t.scanToPay}
                    </p>
                    
                    {/* Payment Info */}
                    <div className="bg-app-accent/5 px-4 py-3.5 rounded-2xl border border-app-accent/15 relative z-10 mb-4 w-full">
                      <div className="text-app-ink text-sm space-y-2">
                        {dashboardAutoPaymentInfo?.isPaid ? (
                          <div className="flex flex-col items-center justify-center py-2 text-center text-emerald-700">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center mb-1.5 shadow-sm">
                              <CheckCircle2 size={20} className="text-emerald-600" />
                            </div>
                            <div className="font-bold text-base">Đã thanh toán xong!</div>
                            <div className="text-xs text-slate-500 mt-0.5">Tháng này bạn hiện không còn khoản nợ nào.</div>
                          </div>
                        ) : dashboardAutoPaymentInfo?.bank ? (
                          <>
                            <div className="flex items-center justify-between pb-1.5 border-b border-app-accent/10">
                              <span className="text-xs text-app-ink/50">Ngân hàng</span>
                              <span className="font-bold text-xs text-app-ink">{getBankDisplayName(dashboardAutoPaymentInfo.bank.bankId)}</span>
                            </div>
                            
                            {/* STK */}
                            <div className="flex items-center justify-between py-1">
                              <div className="min-w-0">
                                <span className="text-[10px] text-app-ink/50 uppercase font-bold block">Số tài khoản</span>
                                <span className="font-mono font-bold text-xs sm:text-sm text-app-ink">{getEffectiveAccountNo(dashboardAutoPaymentInfo.bank.accountNo)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyDashboardField(getEffectiveAccountNo(dashboardAutoPaymentInfo.bank?.accountNo).replace(/\s+/g, ''), 'account')}
                                className="px-2.5 py-1 bg-white hover:bg-app-accent/10 rounded-lg text-xs font-semibold text-app-accent border border-app-accent/20 flex items-center gap-1 transition-colors shrink-0"
                              >
                                <Copy size={12} />
                                <span>{dashboardCopiedField === 'account' ? 'Đã chép!' : 'Chép STK'}</span>
                              </button>
                            </div>

                            {/* Nội dung CK */}
                            {dashboardAutoPaymentInfo.code && (
                              <div className="flex items-center justify-between py-1">
                                <div className="min-w-0">
                                  <span className="text-[10px] text-app-ink/50 uppercase font-bold block">Cú pháp chuyển khoản</span>
                                  <span className="font-mono font-bold text-xs sm:text-sm text-app-accent truncate block max-w-[130px] sm:max-w-[160px]">
                                    {dashboardAutoPaymentInfo.transferContent || dashboardAutoPaymentInfo.code}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDashboardField(dashboardAutoPaymentInfo.transferContent || dashboardAutoPaymentInfo.code, 'content')}
                                  className="px-2.5 py-1 bg-white hover:bg-app-accent/10 rounded-lg text-xs font-semibold text-app-accent border border-app-accent/20 flex items-center gap-1 transition-colors shrink-0"
                                >
                                  <Copy size={12} />
                                  <span>{dashboardCopiedField === 'content' ? 'Đã chép!' : 'Chép cú pháp'}</span>
                                </button>
                              </div>
                            )}

                            {/* Số tiền */}
                            {dashboardAutoPaymentInfo.amount > 0 && (
                              <div className="flex items-center justify-between py-1">
                                <div className="min-w-0">
                                  <span className="text-[10px] text-app-ink/50 uppercase font-bold block">Số tiền</span>
                                  <span className="font-bold text-xs sm:text-sm text-slate-900">{dashboardAutoPaymentInfo.amount.toLocaleString()}đ</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDashboardField(String(dashboardAutoPaymentInfo.amount), 'amount')}
                                  className="px-2.5 py-1 bg-white hover:bg-app-accent/10 rounded-lg text-xs font-semibold text-app-accent border border-app-accent/20 flex items-center gap-1 transition-colors shrink-0"
                                >
                                  <Copy size={12} />
                                  <span>{dashboardCopiedField === 'amount' ? 'Đã chép!' : 'Chép tiền'}</span>
                                </button>
                              </div>
                            )}

                            {/* Ghi chú SePay tự động */}
                            <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 mt-2 text-center">
                              💡 Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động gạch nợ sau 30 giây.
                            </div>

                            {isDashboardAutoPaymentQuotaExhausted && (
                              <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 mt-1">
                                Chế độ chuyển khoản trực tiếp: Admin sẽ đối soát và gạch nợ thủ công.
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-bold">Chưa có tài khoản thanh toán</div>
                            <div className="text-xs opacity-90">Kiểm tra cấu hình QR động.</div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payment-calendar')}
                      className="relative z-10 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-app-accent px-4 py-3 text-sm font-black text-white shadow-lg shadow-app-accent/20 hover:bg-app-accent/90 transition-colors"
                    >
<Calendar size={17} />
                      Mở thanh toán
</button>

                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && user?.role === 'admin' && (
              <div
                key="dashboard-admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Admin Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard 
                    icon={<Utensils className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />} 
                    label={t.admin.ordersToday} 
                    value={dashboardStatsLoading ? "..." : (dashboardStats?.ordersToday || 0).toString()} 
                    unit={t.units.orders} 
                  />
                  <StatCard 
                    icon={<UserIcon className="text-[#4ADE80]" />} 
                    label={t.admin.users} 
                    value={dashboardStatsLoading ? "..." : (dashboardStats?.totalUsers || 0).toString()} 
                    unit={t.units.people} 
                  />
                  <StatCard 
                    icon={<Flame className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />} 
                    label={t.admin.popularDishes} 
                    value={dashboardStatsLoading ? "..." : (dashboardStats?.popularDishesCount || 0).toString()} 
                    unit={t.units.dishes} 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Today's Menu List */}
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <Utensils className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} size={24} />
                        <h3 className="text-xl font-display font-bold tracking-tight">{t.admin.menuToday}</h3>
                      </div>
                      {menuLoading && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-pulse">
                          <RefreshCw size={11} className="animate-spin text-emerald-600" />
                          <span>Đang tải...</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                        {isLanguageChanging ? (
                          <div
                            key="admin-menu-loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center py-8"
                          >
                            <div className="w-8 h-8 border-2 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                          </div>
                        ) : (
                          menu?.dishes?.map((dish, idx) => (
                            <div 
                              key={`${dish.id}-admin-${currentLang}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: 1, 
                                x: 0,
                                transition: {
                                  delay: idx * 0.05,
                                  duration: 0.3
                                }
                              }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center justify-between p-4 bg-[#FDF4E3]/50 rounded-2xl border border-[#F5E6D3] hover:border-[#DA251D]/30 transition-all duration-300"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-black text-[#DA251D]">{idx + 1}</span>
                                <p 
                                  key={`${dish.id}-admin-name-${currentLang}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: idx * 0.05 + 0.1 }}
                                  className="font-bold text-sm"
                                >
                                  {getDishName(dish, currentLang)}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-[#2D241E]/20" />
                            </div>
                          ))
                        )}
                      </AnimatePresence>
                      {(!menu?.dishes || menu.dishes.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t.noData.noMenuToday}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Favorite Dishes List */}
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <Flame className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} size={24} />
                      <h3 className="text-xl font-display font-bold tracking-tight">{t.admin.favoriteDishes}</h3>
                    </div>
                    <div className="space-y-6">
                      {dashboardStatsLoading ? (
                        <div className="text-center py-4 text-gray-500">Đang tải...</div>
                      ) : dashboardStats?.popularDishes && dashboardStats.popularDishes.length > 0 ? (
                        dashboardStats.popularDishes.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-[#DA251D] text-white' : 'bg-[#FDF4E3] text-[#2D241E]/40'}`}>
                                {idx + 1}
                              </div>
                              <p className="font-bold text-sm">{item.name}</p>
                            </div>
                            <span className="text-sm font-black">{item.orderCount}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t.noData.popularDishes}</p>
                          <p className="text-sm">{t.noData.createMenuFirst}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="desktop-menu-section menu-luxury-stage space-y-4 sm:space-y-6 lg:space-y-7"
              >
                {/* Order Deadline Countdown Banner */}
                <OrderDeadlineCountdown isAdmin={user?.role === 'admin'} className="mb-4" currentLang={currentLang} translations={t} />
                <div className="desktop-menu-hero hidden lg:grid grid-cols-[minmax(0,1fr)_minmax(300px,330px)] items-center gap-5 lacquer-card p-5 xl:p-6 overflow-hidden relative">
                  <div className="absolute inset-0 menu-heritage-surface" />
                  <div className="absolute inset-y-0 left-0 w-1/3 lotus-pattern opacity-[0.045]" />
                  <div className="absolute inset-y-0 right-0 w-1/3 seigaiha-pattern opacity-[0.16]" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-[52px] h-[52px] rounded-2xl bg-app-accent text-white flex items-center justify-center shadow-lg shadow-app-accent/20 shrink-0">
                      <Utensils size={26} />
                    </div>
                    <div>
                      <div className="desktop-menu-kicker-row flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-app-accent/65">{t.todayMenu}</p>
                        <span className="menu-culture-chip">Cơm Việt</span>
                        <span className="menu-culture-chip">和の味</span>
                      </div>
                      <h3 className="text-[2rem] font-display font-bold tracking-tight text-app-ink leading-tight">{mobileOrderCopy.title}</h3>
                      <p className="mt-1.5 max-w-2xl text-[13px] font-semibold leading-relaxed text-app-ink/50">
                        Chọn tối đa 2 món, thêm tùy chọn nhanh và kiểm tra lại ở thanh đặt món phía dưới.
                      </p>
                      <div className="personal-menu-mission">
                        <span className="menu-mission-icon" aria-hidden="true">
                          <Sparkles size={15} />
                        </span>
                        <span className="menu-mission-copy">Giúp bạn chọn bữa trưa dễ dàng, nhanh gọn và luôn ngon miệng.</span>
                      </div>
                    </div>
                  </div>
                  <div className="personal-menu-postcard" aria-hidden="true">
                    <span className="personal-postcard-label">seal</span>
                    <span className="personal-menu-handnote">FSI DDS</span>
                  </div>

                  <div className="desktop-menu-metrics relative z-10 grid grid-cols-3 gap-2.5">
                    <div className="desktop-menu-metric rounded-2xl border border-app-accent/15 bg-app-accent/5 px-3.5 py-3">
                      <p className="desktop-menu-metric-label text-[10px] font-black uppercase tracking-[0.16em] text-app-ink/35">{t.ui?.todayDishes || 'Món hôm nay'}</p>
                      <p className="desktop-menu-metric-value mt-1.5 text-[1.35rem] font-black text-app-ink leading-none">{menu?.dishes?.length || 0}</p>
                    </div>
                    <div className="desktop-menu-metric rounded-2xl border border-app-accent/15 bg-white px-3.5 py-3">
                      <p className="desktop-menu-metric-label text-[10px] font-black uppercase tracking-[0.16em] text-app-ink/35">Đã chọn</p>
                      <p className="desktop-menu-metric-value mt-1.5 text-[1.35rem] font-black text-app-accent leading-none">{selectedDishes.length}/{maxSelectableDishes}</p>
                    </div>
                    <div className="desktop-menu-metric rounded-2xl border border-app-accent/15 bg-white px-3.5 py-3">
                      <p className="desktop-menu-metric-label text-[10px] font-black uppercase tracking-[0.16em] text-app-ink/35">{mobileOrderCopy.perMeal}</p>
                      <p className="desktop-menu-metric-value mt-1.5 text-[1.35rem] font-black text-app-ink leading-none">{mealPriceText}</p>
                    </div>
                  </div>
                </div>

                <div className="mobile-menu-hero-card menu-heritage-surface lg:hidden bg-white border border-app-accent/15 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="mobile-menu-postcard" aria-hidden="true">
                    <span className="personal-postcard-label">seal</span>
                    <span className="personal-menu-handnote">FSI DDS</span>
                  </div>

                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center shrink-0">
                        <Utensils size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-app-accent/70">{t.todayMenu}</p>
                        <h3 className="text-xl font-black text-slate-950 leading-tight">{mobileOrderCopy.title}</h3>
                        <p className="text-sm text-slate-500 mt-1 leading-snug">{mobileOrderCopy.helper}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold text-slate-400">{mobileOrderCopy.selected}</p>
                      <p className="text-lg font-black text-app-accent">{selectedDishes.length}/{maxSelectableDishes}</p>
                    </div>
                  </div>

                  <div className="mobile-menu-mission relative z-10">
                    <span className="menu-mission-icon" aria-hidden="true">
                      <Sparkles size={14} />
                    </span>
                    <span className="menu-mission-copy">Giúp bạn chọn bữa trưa dễ dàng, nhanh gọn và luôn ngon miệng.</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
                    <div className="rounded-xl border border-app-accent/15 bg-app-accent/5 px-3 py-2">
                      <p className="text-[11px] font-bold text-slate-400">{mobileOrderCopy.perMeal}</p>
                      <p className="text-base font-black text-slate-950">{mealPriceText}</p>
                    </div>
                    <div className="rounded-xl border border-app-accent/15 bg-app-accent/5 px-3 py-2">
                      <p className="text-[11px] font-bold text-slate-400">{t.selectedDishes}</p>
                      <p className="text-base font-black text-slate-950">{mobileOrderCopy.limit}</p>
                    </div>
                  </div>
                </div>

                {/* Menu List */}
                <div className={`mobile-menu-dish-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-4 xl:gap-5 lg:pb-64 ${
                  selectedDishes.length > 0 ? 'pb-36 sm:pb-36' : 'pb-28'
                }`}>
                  {/* Floating micro-toast when selecting dishes */}
                  <AnimatePresence>
                    {dishSelectFeedback && (
                      <div
                        key="dish-select-toast"
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-down backdrop-blur-md pointer-events-none"
                      >
                        <Sparkles size={14} className="text-amber-400" />
                        <span>{dishSelectFeedback}</span>
                      </div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    {isLanguageChanging ? (
                      <div
                        key="language-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full flex items-center justify-center py-20"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                          <p className="text-app-ink/60 font-medium">{t.ui?.switchingLanguage || 'Đang chuyển ngôn ngữ...'}</p>
                        </div>
                      </div>
                    ) : menuLoading && (!menu?.dishes || menu.dishes.length === 0) ? (
                      <div
                        key="menu-loading"
                        className="col-span-full flex items-center justify-center py-20"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                          <p className="text-app-ink/60 font-medium">{t.ui?.loadingTodayMenu || 'Đang tải thực đơn hôm nay...'}</p>
                        </div>
                      </div>
                    ) : (
                      menu?.dishes?.map((dish, index) => (
                        <div 
                          key={`${dish.id}-${currentLang}`}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: {
                              delay: index * 0.05,
                              duration: 0.3,
                              ease: "easeOut"
                            }
                          }}
                          exit={{ 
                            opacity: 0, 
                            y: -10, 
                            scale: 0.95,
                            transition: { duration: 0.2 }
                          }}
                          whileHover={{ 
                            scale: selectedDishes.length < 2 || selectedDishes.includes(dish.id) ? 1.02 : 1.01,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={{ scale: 0.98 }}
                          className={`mobile-dish-card desktop-dish-card menu-dish-card lacquer-card p-4 sm:p-4 lg:p-4 xl:p-5 min-h-[92px] sm:min-h-[128px] lg:min-h-[154px] flex flex-col cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                            selectedDishes.includes(dish.id) 
                              ? 'border-app-accent ring-2 ring-app-accent/20 bg-app-accent/5' 
                              : selectedDishes.length >= 2 
                                ? 'menu-dish-card-muted border-slate-200 bg-white/95'
                                : 'hover:border-app-accent/40 hover:shadow-lg'
                          }`}
                          onClick={() => handleSelectDish(dish.id)}
                        >
                          {selectedDishes.includes(dish.id) && (
                            <div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute top-3 right-3 z-10"
                            >
                              <div className="bg-app-accent text-white p-1 rounded-full shadow-lg">
                                <CheckCircle2 size={14} />
                              </div>
                            </div>
                          )}
                          
                          
                          <div className="menu-dish-number inline-flex mb-2.5 lg:mb-3 w-fit items-center gap-2 rounded-full border border-app-accent/15 bg-app-accent/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-app-accent">
                            #{index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1.5 sm:mb-3">
                              <h4 
                                key={`${dish.id}-name-${currentLang}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 + 0.1 }}
                                className={`mobile-dish-title text-[15px] sm:text-[17px] lg:text-[1.05rem] xl:text-[1.1rem] font-display font-bold leading-snug break-words pr-9 transition-colors duration-300 ${
                                  selectedDishes.includes(dish.id) 
                                    ? 'text-app-accent' 
                                    : selectedDishes.length >= 2 
                                      ? 'text-slate-500'
                                      : 'text-[#1C1917] group-hover:text-app-accent'
                                }`}
                              >
                                {getDishDisplayName(dish, currentLang)}
                              </h4>
                            </div>
                            
                            {/* Selection indicator */}
                            <div className="menu-dish-footer mt-auto pt-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`menu-dish-status text-[11px] px-2.5 py-1 rounded-full font-black ${
                                    selectedDishes.includes(dish.id)
                                      ? 'bg-app-accent text-white'
                                      : 'bg-white text-app-ink/45 border border-app-accent/10'
                                  }`}
                                >
                                  {selectedDishes.includes(dish.id)
                                    ? `${mobileOrderCopy.optionPrefix} ${selectedDishes.indexOf(dish.id) + 1}`
                                    : `Món ${index + 1}`}
                                </span>
                              </div>
                              
                              {!selectedDishes.includes(dish.id) && selectedDishes.length < 2 && (
                                <div 
                                  whileHover={{ scale: 1.1 }}
                                  className="w-7 h-7 border-2 border-app-accent/30 rounded-full group-hover:border-app-accent transition-colors flex items-center justify-center bg-white"
                                >
                                  <Plus size={14} className="text-app-accent/70" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                  
                  {!menuLoading && (!menu?.dishes || menu.dishes.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <Utensils size={48} className="mx-auto" />
                      </div>
                      <p className="text-gray-500 text-lg font-medium">{t.noData.noMenuToday}</p>
                      <p className="text-gray-400 text-sm">{t.noData.pleaseComeLater}</p>
                    </div>
                  )}
                </div>

                {/* Place Order Bar - Mobile Optimized */}
                {selectedDishes.length > 0 && (
                  <>
                    {/* Mobile: Floating Bottom Bar when collapsed */}
                    {!isMobileOrderSheetExpanded && (
                      <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-app-accent/25 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-slide-up">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-app-accent text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-app-accent/20">
                            {selectedDishes.length}/{maxSelectableDishes}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {selectedDishDetails.map(d => getDishDisplayName(d, currentLang)).join(' + ')}
                            </p>
                            <p className="text-[11px] font-bold text-app-accent mt-0.5">{mealPriceText}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setSelectedDishes([])}
                            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                            title={mobileOrderCopy.clear}
                          >
                            <X size={15} />
                          </button>
                          <button
                            onClick={() => setIsMobileOrderSheetExpanded(true)}
                            className="px-3.5 py-2 rounded-xl bg-app-accent text-white text-xs font-black shadow-lg shadow-app-accent/25 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all"
                          >
                            <span>Xem & Đặt</span>
                            <ChevronUp size={15} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mobile: Slide-up Bottom Sheet Modal when expanded */}
                    {isMobileOrderSheetExpanded && (
                      <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setIsMobileOrderSheetExpanded(false)} 
                        />
                        <div className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t-4 border-app-accent overflow-hidden animate-slide-up">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingBag size={20} className="text-app-accent" />
                              <h3 className="font-black text-base text-slate-900">Chi tiết bữa trưa của bạn</h3>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-app-accent/10 text-app-accent">
                                {selectedDishes.length}/{maxSelectableDishes} món
                              </span>
                            </div>
                            <button
                              onClick={() => setIsMobileOrderSheetExpanded(false)}
                              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <ChevronDown size={20} />
                            </button>
                          </div>

                          <div className="p-4 overflow-y-auto space-y-4 flex-1">
                            {/* Selected dishes */}
                            <div className="space-y-1.5">
                              {selectedDishDetails.map((dish, index) => (
                                <div key={dish.id} className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 bg-app-accent text-white rounded-full flex items-center justify-center font-black text-xs shrink-0">
                                      {index + 1}
                                    </div>
                                    <span className="mobile-selected-dish-name font-bold text-slate-950 text-sm leading-snug">
                                      {getDishDisplayName(dish, currentLang)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setSelectedDishes(prev => prev.filter(id => id !== dish.id))}
                                    className="w-8 h-8 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors shrink-0"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Đặt cho ai with search */}
                            <div>
                              <span className="block text-xs font-black text-slate-500 mb-1.5">{mobileOrderCopy.orderFor}</span>
                              {allUsers.length > 5 && (
                                <div className="relative mb-2">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={orderForSearch}
                                    onChange={(e) => setOrderForSearch(e.target.value)}
                                    placeholder="Gõ tìm đồng nghiệp..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-app-accent bg-slate-50 text-slate-900"
                                  />
                                </div>
                              )}
                              <select
                                value={orderForUserId || user?.id || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? Number(e.target.value) : null;
                                  setOrderForUserId(value);
                                }}
                                className="w-full min-h-11 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-app-accent bg-white text-slate-950 font-bold text-sm"
                              >
                                <option value={user?.id || ''}>{user?.fullname} {user?.id ? `(#${user.id})` : ''} {t.myself}</option>
                                {filteredOrderForUsers.filter(u => u.id !== user?.id).map(u => (
                                  <option key={u.id} value={u.id}>{u.fullname} (#{u.id})</option>
                                ))}
                              </select>
                            </div>

                            {/* Quick options */}
                            <div>
                              <div className="mobile-order-options-header mb-1.5">
                                <p>{mobileOrderCopy.quickOptions}</p>
                                <span>{orderOptionItems.filter(option => option.checked).length}/{orderOptionItems.length}</span>
                              </div>
                              <div className="mobile-order-option-grid">
                                {orderOptionItems.map(option => (
                                  <label
                                    key={option.key}
                                    className={`mobile-order-option-chip ${option.checked ? 'is-selected' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={option.checked}
                                      onChange={(e) => option.onChange(e.target.checked)}
                                      className="sr-only"
                                    />
                                    <span className="mobile-order-option-check" aria-hidden="true" />
                                    <span className="mobile-order-option-label">{option.compactLabel}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <span className="block text-xs font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <FileText size={14} className="text-app-accent" />
                                {t.orderNotes}
                              </span>
                              <textarea
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                placeholder={t.orderNotesPlaceholder}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-app-accent resize-none text-slate-950 text-sm"
                                rows={2}
                              />
                            </div>

                            {/* Place order button */}
                            <button 
                              onClick={handleShowOrderSummary}
                              disabled={!canPlaceOrder || selectedDishes.length === 0}
                              className={`w-full text-white py-3.5 rounded-xl font-black text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                                !canPlaceOrder || selectedDishes.length === 0
                                  ? 'bg-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                  : theme === 'corporate' 
                                    ? 'bg-[#00A693] hover:bg-[#00A693]/90' 
                                    : 'bg-[#DA251D] hover:bg-[#DA251D]/90'
                              }`}
                            >
                              {!canPlaceOrder ? (
                                <>
                                  <Lock size={18} />
                                  <span>{(t.deadline?.btnExpired || 'Đã hết giờ đặt ({deadline})').replace('{deadline}', '11:00')}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={20} />
                                  <span>
                                    {orderForUserId && orderForUserId !== user?.id
                                      ? `Đặt cơm cho ${allUsers.find(u => u.id === orderForUserId)?.fullname || 'người khác'}`
                                      : t.orderNow}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Desktop: Full View */}
                    <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-50 bg-white border-t-4 border-app-accent shadow-2xl">
                      <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Left: Selected Dishes */}
                          <div className="col-span-1">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
                                <ShoppingBag size={20} className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />
                                {t.selectedDishes} ({selectedDishes.length}/2)
                              </h4>
                              <button 
                                onClick={() => setSelectedDishes([])}
                                className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                              >
                                <X size={16} />
                                Xóa tất cả
                              </button>
                            </div>
                            <div className="space-y-2">
                              {selectedDishes.map((dishId, index) => {
                                const dish = menu?.dishes?.find(d => d.id === dishId);
                                return (
                                  <div key={dishId} className="flex items-center justify-between bg-app-accent/5 rounded-xl px-4 py-3 border border-app-accent/15">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-app-accent text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                      </div>
                                      <span className="font-semibold text-[#1C1917]">{dish?.name}</span>
                                    </div>
                                    <button 
                                      onClick={() => setSelectedDishes(prev => prev.filter(id => id !== dishId))}
                                      className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-3 p-3 bg-app-accent/10 rounded-xl">
                              <p className="text-sm text-[#1C1917] font-semibold">Tổng tiền: <span className="text-app-accent text-lg">40,000đ</span></p>
                            </div>
                          </div>

                          {/* Middle: Options */}
                          <div className="col-span-1">
                            <h4 className="text-lg font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                              <Settings size={20} className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />
                              {t.orderOptions}
                            </h4>
                            
                            {/* Đặt cho ai */}
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-[#1C1917] mb-2">{t.orderForLabel}</label>
                              {allUsers.length > 5 && (
                                <div className="relative mb-2">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={orderForSearch}
                                    onChange={(e) => setOrderForSearch(e.target.value)}
                                    placeholder="Gõ tìm đồng nghiệp..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-app-accent bg-slate-50 text-slate-900"
                                  />
                                </div>
                              )}
                              <select
                                value={orderForUserId || user?.id || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? Number(e.target.value) : null;
                                  setOrderForUserId(value);
                                }}
                                className="w-full px-4 py-2 border-2 border-[#E5E1D1] rounded-xl focus:outline-none focus:border-app-accent bg-white text-[#1C1917] font-medium text-sm"
                              >
                                <option value={user?.id || ''}>{user?.fullname} {user?.id ? `(#${user.id})` : ''} {t.myself}</option>
                                {filteredOrderForUsers.filter(u => u.id !== user?.id).map(u => (
                                  <option key={u.id} value={u.id}>{u.fullname} (#{u.id})</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Quick Options */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              {[
                                { key: 'extraRice', label: t.extraRice, state: extraRice, setState: setExtraRice },
                                { key: 'extraSoup', label: t.extraSoup, state: extraSoup, setState: setExtraSoup },
                                { key: 'chiliSauce', label: t.chiliSauce, state: chiliSauce, setState: setChiliSauce },
                                { key: 'fishSauce', label: t.fishSauce, state: fishSauce, setState: setFishSauce },
                                { key: 'chopsticks', label: t.chopsticks, state: chopsticks, setState: setChopsticks },
                                { key: 'lessRice', label: t.lessRice, state: lessRice, setState: setLessRice }
                              ].map(option => (
                                <label key={option.key} className="flex items-center gap-2 cursor-pointer p-2 bg-app-accent/5 rounded-lg hover:bg-app-accent/10 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={option.state}
                                    onChange={(e) => option.setState(e.target.checked)}
                                    className={`w-4 h-4 border-gray-300 rounded focus:ring-2 ${
                                      theme === 'corporate' 
                                        ? 'text-[#00A693] focus:ring-[#00A693]' 
                                        : 'text-[#DA251D] focus:ring-[#DA251D]'
                                    }`}
                                  />
                                  <span className="text-sm font-medium text-[#1C1917]">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Right: Notes & Action */}
                          <div className="col-span-1">
                            <h4 className="text-lg font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                              <FileText size={20} className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />
                              {t.orderNotes}
                            </h4>
                            <textarea
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              placeholder={t.orderNotesPlaceholder}
                              className="w-full px-4 py-3 border-2 border-[#E5E1D1] rounded-xl focus:outline-none focus:border-app-accent resize-none mb-4 text-[#1C1917]"
                              rows={3}
                            />
                            
                            {/* Order Button */}
                            <button 
                              onClick={handlePlaceOrder}
                              disabled={!canPlaceOrder || selectedDishes.length === 0}
                              className={`w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                                !canPlaceOrder || selectedDishes.length === 0
                                  ? 'bg-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                  : theme === 'corporate' 
                                    ? 'bg-[#00A693] hover:bg-[#00A693]/90' 
                                    : 'bg-[#DA251D] hover:bg-[#DA251D]/90'
                              }`}
                            >
                              {!canPlaceOrder ? (
                                <>
                                  <Lock size={22} />
                                  <span>{(t.deadline?.btnExpiredFull || 'Đã hết giờ đặt cơm hôm nay ({deadline})').replace('{deadline}', '11:00')}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={24} />
                                  <span>
                                    {orderForUserId && orderForUserId !== user?.id
                                      ? `Đặt cơm cho ${allUsers.find(u => u.id === orderForUserId)?.fullname || 'người khác'}${user?.role === 'admin' && isOrderDeadlinePassed ? ' (Admin)' : ''}`
                                      : user?.role === 'admin' && isOrderDeadlinePassed
                                      ? t.deadline?.orderAsAdmin || 'Đặt cơm hôm nay (Quyền Admin)'
                                      : t.orderNow}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'orders' && (
              <div
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="lacquer-card p-4 lg:p-10 lotus-pattern">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-display font-bold tracking-tight">{user?.role === 'admin' ? t.admin.allOrders : t.orderHistory}</h3>
                      {(ordersLoading || ordersUpdating) && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-xs font-semibold animate-pulse">
                          <RefreshCw size={12} className="animate-spin text-emerald-600" />
                          <span>{ordersLoading ? 'Đang tải...' : 'Đang cập nhật...'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => refetchOrders()}
                        disabled={ordersLoading || ordersUpdating}
                        className="p-3 bg-[#F5F2E9] border border-[#E5E1D1] rounded-xl text-[#1C1917]/70 hover:text-app-accent hover:border-app-accent/30 transition-all disabled:opacity-50"
                        title="Tải lại danh sách"
                      >
                        <RefreshCw size={18} className={ordersLoading || ordersUpdating ? 'animate-spin' : ''} />
                      </button>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={handleExportMenu}
                          className="px-4 py-2 bg-[#4ADE80] text-white rounded-xl font-bold text-sm hover:bg-[#4ADE80]/90 transition-colors flex items-center gap-2"
                        >
                          <FileText size={16} />
                          {t.exportMenu}
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <div className="relative">
                          <button 
                            onClick={() => setShowOrderFilter(!showOrderFilter)}
                            className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                              orderFilterUserId !== 'all' 
                                ? 'bg-[#DA251D] text-white border-[#DA251D] shadow-sm' 
                                : 'bg-[#F5F2E9] border-[#E5E1D1] text-[#1C1917]/60 hover:text-[#DA251D]'
                            }`}
                            title="Lọc các suất cơm theo user"
                          >
                            <Filter size={20} />
                            {orderFilterUserId !== 'all' && (
                              <span className="text-xs font-bold truncate max-w-[120px]">
                                {users.find(u => u.id === orderFilterUserId)?.fullname || 'Đã lọc'}
                              </span>
                            )}
                          </button>
                          
                          {showOrderFilter && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E5E1D1] p-4 z-50">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E1D1]">
                                <span className="text-xs font-bold text-[#1C1917]/60 uppercase tracking-wider">Lọc theo người ăn</span>
                                {orderFilterUserId !== 'all' && (
                                  <button 
                                    onClick={() => { setOrderFilterUserId('all'); setOrderPage(1); setShowOrderFilter(false); }}
                                    className="text-xs text-[#DA251D] hover:underline font-semibold"
                                  >
                                    Xóa lọc
                                  </button>
                                )}
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-1">
                                <button
                                  onClick={() => { setOrderFilterUserId('all'); setShowOrderFilter(false); }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                    orderFilterUserId === 'all' 
                                      ? 'bg-[#DA251D]/10 text-[#DA251D] font-bold' 
                                      : 'hover:bg-gray-100 text-[#1C1917]'
                                  }`}
                                >
                                  Tất cả người dùng ({orders.length} đơn)
                                </button>
                                {users.map(u => {
                                  const userOrderCount = orders.filter(o => o.receiver?.id === u.id || o.ordered_for === u.id || o.user_id === u.id).length;
                                  return (
                                    <button
                                      key={u.id}
                                      onClick={() => { setOrderFilterUserId(u.id); setOrderPage(1); setShowOrderFilter(false); }}
                                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between ${
                                        orderFilterUserId === u.id 
                                          ? 'bg-[#DA251D]/10 text-[#DA251D] font-bold' 
                                          : 'hover:bg-gray-100 text-[#1C1917]'
                                      }`}
                                    >
                                      <span className="truncate">{u.fullname}</span>
                                      <span className="text-xs text-gray-400 font-mono ml-2">({userOrderCount})</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {orderFilterUserId !== 'all' && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-sm">
                      <span className="text-[#DA251D] font-semibold flex items-center gap-2">
                        <Filter size={16} />
                        Đang lọc các suất ăn của: <strong>{users.find(u => u.id === orderFilterUserId)?.fullname}</strong> ({displayedOrders.length} suất)
                      </span>
                      <button 
                        onClick={() => { setOrderFilterUserId('all'); setOrderPage(1); }}
                        className="text-xs text-[#DA251D] font-bold underline hover:opacity-80"
                      >
                        Bỏ lọc
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {paginatedOrders.map((order) => (
                      <div 
                        key={order.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-2xl border border-[#E5E1D1] hover:border-[#DA251D] hover:shadow-md transition-all group overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 items-start md:items-center">
                            {/* Ngày */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.date}</p>
                              <p className="text-sm font-bold text-[#1C1917]">
                                {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                              </p>
                              {order.created_at && (
                                <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center md:justify-start gap-1 mt-0.5" title="Giờ đặt cơm">
                                  <Clock size={12} className="inline flex-shrink-0" />
                                  <span>{new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                              )}
                            </div>
                            
                            {/* Người ăn */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.person}</p>
                              <p className="text-sm font-bold text-[#1C1917] truncate">{order.receiver?.fullname || 'N/A'}</p>
                              {order.orderer && order.receiver && order.orderer.id !== order.receiver.id && (
                                <p className="text-[11px] text-amber-700 font-semibold truncate mt-0.5" title={`Đặt hộ bởi ${order.orderer.fullname}`}>
                                  (Đặt bởi: {order.orderer.fullname})
                                </p>
                              )}
                            </div>
                            
                            {/* Món 1 */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.dish1}</p>
                              <p className="text-sm font-bold text-[#1C1917] line-clamp-2">{getDishName(order.dish1, currentLang) || 'N/A'}</p>
                            </div>
                            
                            {/* Món 2 */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.dish2}</p>
                              <p className="text-sm font-bold text-[#1C1917] line-clamp-2">{getDishName(order.dish2, currentLang) || t.noSecondDish}</p>
                            </div>
                            
                            {/* Ghi chú */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.orderNotes}</p>
                              <p className="text-sm text-[#1C1917]/80 line-clamp-2">{order.notes || t.noNotes}</p>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center justify-center md:justify-end gap-2">
                              {/* Edit button - for order owner within deadline or admin */}
                              {(user?.role === 'admin' || (canPlaceOrder && (order.user_id === user?.id || order.ordered_by === user?.id))) && (
                                <button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setEditDish1(order.dish1?.id || 0);
                                    setEditDish2(order.dish2?.id || 0);
                                    setEditNotes(order.notes || '');
                                    setShowEditOrderModal(true);
                                  }}
                                  className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all"
                                  title="Chỉnh sửa đơn hàng"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              
                              {/* Delete button - admin only */}
                              {user?.role === 'admin' && (
                                <button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={async () => {
                                    if (confirm(`${t.confirmDeleteOrder} ${order.receiver?.fullname || 'N/A'}?\n\n${t.dish1}: ${getDishName(order.dish1, currentLang) || 'N/A'}\n${t.dish2}: ${getDishName(order.dish2, currentLang) || t.noSecondDish}`)) {
                                      try {
                                        await deleteOrder(order.id);
                                        // Refresh orders list to ensure UI is updated
                                        await refetchOrders();
                                      } catch (error) {
                                        console.error('Lỗi khi xóa đơn hàng:', error);
                                        alert('Lỗi khi xóa đơn hàng. Vui lòng thử lại.');
                                      }
                                    }
                                  }}
                                  className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all"
                                  title="Xóa đơn hàng"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {ordersLoading && displayedOrders.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-10 h-10 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-app-ink/60 font-medium">Đang tải danh sách đơn hàng...</p>
                      </div>
                    ) : displayedOrders.length === 0 ? (
                      <div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <div className="text-gray-400 mb-4">
                          <ClipboardList size={48} className="mx-auto" />
                        </div>
                        <p className="text-gray-500 text-lg font-medium">Chưa có đơn hàng nào</p>
                        <p className="text-gray-400 text-sm">Hãy đặt món đầu tiên của bạn</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Phân trang đơn hàng (admin & user) */}
                  {displayedOrders.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#E5E1D1] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-xs text-[#1C1917]/60 font-semibold">
                        <span>
                          Hiển thị <strong className="text-[#1C1917]">{(orderPage - 1) * orderPageSize + 1}</strong> - <strong className="text-[#1C1917]">{Math.min(orderPage * orderPageSize, displayedOrders.length)}</strong> / <strong className="text-[#DA251D]">{displayedOrders.length}</strong> đơn
                        </span>
                        <select
                          value={orderPageSize}
                          onChange={(e) => {
                            setOrderPageSize(Number(e.target.value));
                            setOrderPage(1);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-[#E5E1D1] rounded-lg text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#DA251D]"
                        >
                          <option value={5}>5 đơn / trang</option>
                          <option value={10}>10 đơn / trang</option>
                          <option value={20}>20 đơn / trang</option>
                          <option value={50}>50 đơn / trang</option>
                        </select>
                      </div>

                      {totalOrderPages > 1 && (
                        <div className="flex items-center gap-1.5">
                          {/* Nút Prev */}
                          <button
                            onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                            disabled={orderPage === 1}
                            className="p-2 rounded-xl border border-[#E5E1D1] bg-white text-[#1C1917] hover:bg-[#F5F2E9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Trang trước"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          {/* Danh sách các trang */}
                          {Array.from({ length: totalOrderPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalOrderPages || Math.abs(p - orderPage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                              if (idx > 0 && p - arr[idx - 1] > 1) {
                                acc.push('...');
                              }
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, idx) => typeof p === 'number' ? (
                              <button
                                key={p}
                                onClick={() => setOrderPage(p)}
                                className={`min-w-[36px] h-9 px-2 rounded-xl font-bold text-xs transition-all ${
                                  orderPage === p
                                    ? 'bg-[#DA251D] text-white shadow-md shadow-[#DA251D]/20'
                                    : 'border border-[#E5E1D1] bg-white text-[#1C1917]/70 hover:bg-[#F5F2E9] hover:text-[#DA251D]'
                                }`}
                              >
                                {p}
                              </button>
                            ) : (
                              <span key={`dots-${idx}`} className="px-1 text-xs text-[#1C1917]/40">
                                ...
                              </span>
                            ))}

                          {/* Nút Next */}
                          <button
                            onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                            disabled={orderPage === totalOrderPages}
                            className="p-2 rounded-xl border border-[#E5E1D1] bg-white text-[#1C1917] hover:bg-[#F5F2E9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Trang sau"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'menu-mgmt' && (
              <div
                key="menu-mgmt"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-4 lg:p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-display font-bold tracking-tight">{t.admin.menuManagement}</h3>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowAddMenuModal(true)}
                        className="bg-[#DA251D] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#DA251D]/20 hover:scale-105 transition-all"
                      >
                        + Thêm thực đơn 8 món
                      </button>
                      <button 
                        onClick={() => setShowMultilingualModal(true)}
                        className="bg-[#4ADE80] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#4ADE80]/20 hover:scale-105 transition-all"
                      >
                        🌐 Menu đa ngôn ngữ
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('Bạn có chắc muốn làm sạch tất cả dấu ** từ tên món ăn?')) {
                            try {
                              const result = await adminAPI.cleanupMarkdown();
                              alert(result.message);
                              refetchMenu(); // Refresh menu to show cleaned names
                            } catch (error) {
                              console.error('Lỗi khi làm sạch markdown:', error);
                              alert('Lỗi khi làm sạch markdown: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }
                        }}
                        className="bg-[#F59E0B] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#F59E0B]/20 hover:scale-105 transition-all"
                      >
                        🧹 Làm sạch **
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence mode="wait">
                      {isLanguageChanging ? (
                        <div
                          key="mgmt-menu-loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="col-span-full flex items-center justify-center py-12"
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-3 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                            <p className="text-app-ink/60 text-sm">Đang tải menu...</p>
                          </div>
                        </div>
                      ) : (
                        menu?.dishes?.map((dish, index) => (
                          <div 
                            key={`${dish.id}-mgmt-${currentLang}`}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0, 
                              scale: 1,
                              transition: {
                                delay: index * 0.08,
                                duration: 0.4,
                                ease: "easeOut"
                              }
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-6 p-6 bg-[#FDF4E3]/30 rounded-3xl border border-[#F5E6D3] hover:border-[#DA251D]/40 transition-all duration-300"
                          >
                            <div className="flex-1">
                              <p 
                                key={`${dish.id}-mgmt-name-${currentLang}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08 + 0.2 }}
                                className="font-bold text-lg mb-3"
                              >
                                {getDishName(dish, currentLang)}
                              </p>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex gap-2">
                                  {/* Language buttons */}
                                  <button 
                                    onClick={() => setCurrentLang('vi')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                      currentLang === 'vi' 
                                        ? 'bg-[#DA251D] text-white' 
                                        : 'bg-white border border-[#F5E6D3] text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title="Tiếng Việt"
                                  >
                                    🇻🇳 VI
                                  </button>
                                  <button 
                                    onClick={() => setCurrentLang('en')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                      currentLang === 'en' 
                                        ? 'bg-[#DA251D] text-white' 
                                        : 'bg-white border border-[#F5E6D3] text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title="English"
                                  >
                                    🇬🇧 EN
                                  </button>
                                  <button 
                                    onClick={() => setCurrentLang('ja')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                      currentLang === 'ja' 
                                        ? 'bg-[#DA251D] text-white' 
                                        : 'bg-white border border-[#F5E6D3] text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title="日本語"
                                  >
                                    🇯🇵 JA
                                  </button>
                                </div>
                                <button 
                                  onClick={() => handleDeleteDish(dish.id)}
                                  className="p-2 bg-white rounded-lg border border-[#F5E6D3] text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-105"
                                  title="Xóa món"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </AnimatePresence>
                    
                    {(!menu?.dishes || menu.dishes.length === 0) && (
                      <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Utensils size={48} className="mx-auto" />
                        </div>
                        <p className="text-gray-500 text-lg font-medium">{t.noData.noMenuToday}</p>
                        <p className="text-gray-400 text-sm">{t.noData.addNewMenu}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Order Section - Giống như phần menu user */}
                {user?.role === 'admin' && menu && menu.dishes && menu.dishes.length > 0 && (
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-4 lg:p-10 shadow-sm">
                    <h3 className="text-2xl font-display font-bold tracking-tight mb-6">🍽️ Đặt cơm cho bản thân</h3>
                    
                    {/* Menu dishes grid - giống như user menu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <AnimatePresence mode="wait">
                        {menu.dishes.map((dish, index) => (
                          <div 
                            key={`admin-order-${dish.id}`}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0, 
                              scale: 1,
                              transition: {
                                delay: index * 0.05,
                                duration: 0.3,
                                ease: "easeOut"
                              }
                            }}
                            exit={{ 
                              opacity: 0, 
                              y: -10, 
                              scale: 0.95,
                              transition: { duration: 0.2 }
                            }}
                            whileHover={{ 
                              scale: selectedDishes.length < 2 || selectedDishes.includes(dish.id) ? 1.02 : 1.01,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                            className={`lacquer-card p-6 flex flex-col cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                              selectedDishes.includes(dish.id) 
                                ? 'border-[#DA251D] ring-2 ring-[#DA251D]/20 bg-[#DA251D]/5' 
                                : selectedDishes.length >= 2 
                                  ? 'menu-dish-card-muted border-gray-200 bg-white/95'
                                  : 'hover:border-[#DA251D]/40 hover:shadow-lg'
                            }`}
                            onClick={() => handleSelectDish(dish.id)}
                          >
                            {selectedDishes.includes(dish.id) && (
                              <div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute top-4 right-4 z-10"
                              >
                                <div className="bg-[#DA251D] text-white p-1 rounded-full shadow-lg">
                                  <CheckCircle2 size={16} />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4">
                                <h4 
                                  key={`${dish.id}-admin-name`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 + 0.1 }}
                                  className={`text-lg font-display font-bold transition-colors duration-300 ${
                                    selectedDishes.includes(dish.id) 
                                      ? 'text-[#DA251D]' 
                                      : selectedDishes.length >= 2 
                                      ? 'text-slate-500'
                                        : 'text-[#1C1917] group-hover:text-[#DA251D]'
                                  }`}
                                >
                                  {getDishName(dish, currentLang)}
                                </h4>
                              </div>
                              
                              {/* Selection indicator */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {selectedDishes.includes(dish.id) && (
                                    <span 
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="text-xs bg-[#DA251D] text-white px-2 py-1 rounded-full font-bold"
                                    >
                                      Món {selectedDishes.indexOf(dish.id) + 1}
                                    </span>
                                  )}
                                </div>
                                
                                {!selectedDishes.includes(dish.id) && selectedDishes.length < 2 && (
                                  <div 
                                    whileHover={{ scale: 1.1 }}
                                    className="w-6 h-6 border-2 border-[#DA251D]/30 rounded-full group-hover:border-[#DA251D] transition-colors"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Admin Order Bar - khi đã chọn món */}
                    {selectedDishes.length > 0 && (
                      <div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="bg-gradient-to-r from-[#DA251D]/10 to-[#DA251D]/5 border-2 border-[#DA251D]/20 rounded-2xl p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
                            <ShoppingBag size={20} className="text-[#DA251D]" />
                            Đơn hàng của bạn ({selectedDishes.length}/2)
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-[#DA251D]">40,000đ</span>
                            <button 
                              onClick={() => setSelectedDishes([])}
                              className="text-red-500 hover:text-red-700 font-medium p-1"
                              title="Xóa tất cả"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Selected dishes list */}
                        <div className="flex flex-wrap gap-3 mb-4">
                          {selectedDishes.map((dishId, index) => {
                            const dish = menu?.dishes?.find(d => d.id === dishId);
                            return (
                              <div key={dishId} className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-[#F5E6D3] shadow-sm">
                                <div className="w-6 h-6 bg-[#DA251D] text-white rounded-full flex items-center justify-center font-bold text-xs">
                                  {index + 1}
                                </div>
                                <span className="font-medium text-[#1C1917]">{dish?.name}</span>
                                <button 
                                  onClick={() => setSelectedDishes(prev => prev.filter(id => id !== dishId))}
                                  className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                                  title="Xóa món này"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Selector người nhận cơm */}
                        <div className="mb-4 bg-white/90 p-3.5 rounded-xl border border-[#F5E6D3] shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                              <User size={14} className="text-[#DA251D]" />
                              <span>Đặt cơm cho ai:</span>
                            </label>
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                              Quyền Admin (Không giới hạn giờ)
                            </span>
                          </div>
                          <select
                            value={orderForUserId || user?.id || ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : null;
                              setOrderForUserId(value);
                            }}
                            className="w-full px-3 py-2 border-2 border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] bg-white text-[#1C1917] font-bold text-sm"
                          >
                            <option value={user?.id || ''}>{user?.fullname} {user?.id ? `(#${user.id})` : ''} (Bản thân)</option>
                            {allUsers.length > 0 ? (
                              allUsers.filter(u => u.id !== user?.id).map(u => (
                                <option key={u.id} value={u.id}>{u.fullname} (#{u.id})</option>
                              ))
                            ) : (
                              <option disabled>Đang tải danh sách nhân viên...</option>
                            )}
                          </select>
                        </div>
                        
                        {/* Order button */}
                        <button 
                          onClick={() => {
                            setShowOrderSummary(true);
                          }}
                          className="w-full bg-[#DA251D] hover:bg-[#DA251D]/90 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={20} />
                          {orderForUserId && orderForUserId !== user?.id
                            ? `Đặt cơm cho ${allUsers.find(u => u.id === orderForUserId)?.fullname || 'người khác'}`
                            : 'Đặt cơm cho bản thân'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <ErrorBoundary fallbackTitle="Không thể tải tab Thống kê">
                  <React.Suspense fallback={<TabLoadingSkeleton />}>
                    <AdminStatsView 
                      translations={t} 
                      theme={theme} 
                      accentColor={theme === 'corporate' ? '#00A693' : '#DA251D'}
                      onNavigateToCalendar={() => setActiveTab('invoicing')}
                    />
                  </React.Suspense>
                </ErrorBoundary>
              </div>
            )}

            {(activeTab === 'payments' || activeTab === 'admin-payments') && (
              <div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* User Payments */}
                <div className="lacquer-card p-4 lg:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-display font-bold tracking-tight">{t.admin.payments}</h3>
                      {(isLoadingPayments || isUpdatingPayments) && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-xs font-semibold animate-pulse">
                          <RefreshCw size={12} className="animate-spin text-emerald-600" />
                          <span>{isLoadingPayments ? 'Đang tải...' : 'Đang cập nhật...'}</span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => refetchAdminPayments()}
                      disabled={isLoadingPayments || isUpdatingPayments}
                      className="p-2.5 bg-[#F5F2E9] border border-[#E5E1D1] rounded-xl text-[#1C1917]/70 hover:text-app-accent hover:border-app-accent/30 transition-all disabled:opacity-50"
                      title="Tải lại thanh toán"
                    >
                      <RefreshCw size={18} className={isLoadingPayments || isUpdatingPayments ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {autoPaymentUsage && (
                    <div className="mb-8 rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                            <QrCode size={24} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Lượt thanh toán tự động tháng này</p>
                              <button
                                type="button"
                                onClick={handleReprocessAutoPayments}
                                disabled={isReprocessingAutoPayments}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                                title="Quét lại các giao dịch ngân hàng từng bị bỏ qua để đối soát và ghi nhận thanh toán"
                              >
                                <RefreshCw className={`w-3 h-3 ${isReprocessingAutoPayments ? 'animate-spin' : ''}`} />
                                {isReprocessingAutoPayments ? 'Đang quét...' : 'Quét lại giao dịch'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowReconcileModal(true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                title="Dán tin nhắn hoặc thông báo nhận tiền từ app ngân hàng để gạch nợ hàng loạt"
                              >
                                <FileText className="w-3 h-3" />
                                Dán sao kê
                              </button>
                            </div>
                            <p className="text-3xl font-black text-[#1C1917] mt-1">
                              {autoPaymentUsage.limit && !autoPaymentUsage.providerSynced && autoPaymentUsage.used === 0
                                ? 'Chưa đồng bộ SePay'
                                : (
                                  <>
                                    {autoPaymentUsage.used.toLocaleString()}
                                    {autoPaymentUsage.limit ? ` / ${autoPaymentUsage.limit.toLocaleString()}` : ''}
                                  </>
                                )}
                            </p>
                            <p className="text-sm text-[#1C1917]/60 mt-1">
                              {autoPaymentUsage.limit && !autoPaymentUsage.providerSynced && autoPaymentUsage.used === 0
                                ? autoPaymentUsage.providerSyncStatus === 'missing-token'
                                  ? 'Backend chưa có SEPAY_API_TOKEN trên Render nên chưa đọc được số lượt từ SePay.'
                                  : `Backend chưa đồng bộ được SePay${autoPaymentUsage.providerSyncError ? `: ${autoPaymentUsage.providerSyncError}` : '.'}`
                                : autoPaymentUsage.supported
                                ? autoPaymentUsage.remaining !== null
                                  ? `Còn khoảng ${autoPaymentUsage.remaining.toLocaleString()} lượt trong tháng ${autoPaymentUsage.month}.`
                                  : `Đã nhận ${autoPaymentUsage.used.toLocaleString()} webhook trong tháng ${autoPaymentUsage.month}.`
                                : 'Chưa có bảng auto_payment_transactions, hãy chạy AUTO-PAYMENT-SCHEMA.sql để bật bộ đếm.'}
                            </p>
                            {autoPaymentUsage.providerSynced ? (
                              <p className="text-xs text-blue-700/70 mt-1">
                                Đã đồng bộ từ SePay: {autoPaymentUsage.providerUsed?.toLocaleString() || 0} lượt đã dùng trong tháng này.
                              </p>
                            ) : autoPaymentUsage.supported && autoPaymentUsage.providerOffset > 0 && (
                              <p className="text-xs text-blue-700/70 mt-1">
                                Web ghi nhận {autoPaymentUsage.recordedUsed.toLocaleString()} lượt, cộng bù {autoPaymentUsage.providerOffset.toLocaleString()} lượt đã dùng trên SePay.
                              </p>
                            )}
                            {autoPaymentUsage.providerDiagnostics && (
                              <details className="mt-3 rounded-2xl border border-blue-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
                                <summary className="cursor-pointer font-bold text-blue-800">Kiểm tra kết nối SePay</summary>
                                <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed break-all">
                                  <p>status: {autoPaymentUsage.providerSyncStatus || 'unknown'}</p>
                                  <p>hasToken: {autoPaymentUsage.providerDiagnostics.hasToken ? 'yes' : 'no'}</p>
                                  {autoPaymentUsage.providerDiagnostics.httpStatus && (
                                    <p>http: {autoPaymentUsage.providerDiagnostics.httpStatus}</p>
                                  )}
                                  {autoPaymentUsage.providerDiagnostics.countMethod && (
                                    <p>count: {autoPaymentUsage.providerDiagnostics.countMethod}</p>
                                  )}
                                  {autoPaymentUsage.providerDiagnostics.dataCount !== null && autoPaymentUsage.providerDiagnostics.dataCount !== undefined && (
                                    <p>dataCount: {autoPaymentUsage.providerDiagnostics.dataCount}</p>
                                  )}
                                  {autoPaymentUsage.providerDiagnostics.query && (
                                    <p>query: {autoPaymentUsage.providerDiagnostics.query}</p>
                                  )}
                                  {autoPaymentUsage.providerDiagnostics.responsePreview && (
                                    <p>response: {autoPaymentUsage.providerDiagnostics.responsePreview}</p>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>

                        {autoPaymentUsage.limit && (
                          <div className="w-full lg:w-72">
                            <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-2">
                              <span>Đã dùng</span>
                              <span>{autoPaymentUsage.usagePercent || 0}%</span>
                            </div>
                            <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
                              <div
                                className={`h-full rounded-full ${
                                  (autoPaymentUsage.usagePercent || 0) >= 90
                                    ? 'bg-red-500'
                                    : (autoPaymentUsage.usagePercent || 0) >= 75
                                      ? 'bg-orange-500'
                                      : 'bg-blue-500'
                                }`}
                                style={{ width: `${autoPaymentUsage.usagePercent || 0}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                              <div className="rounded-xl bg-white/80 px-2 py-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Xong</p>
                                <p className="font-black text-emerald-600">{autoPaymentUsage.completed}</p>
                              </div>
                              <div className="rounded-xl bg-white/80 px-2 py-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Lỗi</p>
                                <p className="font-black text-red-600">{autoPaymentUsage.failed}</p>
                              </div>
                              <div className="rounded-xl bg-white/80 px-2 py-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Bỏ qua</p>
                                <p className="font-black text-slate-500">{autoPaymentUsage.ignored || 0}</p>
                              </div>
                              <div className="rounded-xl bg-white/80 px-2 py-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Đang xử lý</p>
                                <p className="font-black text-orange-600">{autoPaymentUsage.processing}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {isLoadingPayments && (!userPayments || userPayments.length === 0) ? (
                    <div className="text-center py-16">
                      <div className="w-10 h-10 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-app-ink/60 font-medium">Đang tải dữ liệu công nợ...</p>
                    </div>
                  ) : userPayments && userPayments.length > 0 ? (
                    <>
                      <div className="mb-6 overflow-x-auto rounded-2xl border border-[#E5E1D1] bg-white">
                        <div className="min-w-[720px]">
                          <div className="grid grid-cols-[minmax(220px,1.5fr)_150px_150px_150px] bg-[#F5F2E9] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#1C1917]/55">
                            <div>Người dùng</div>
                            <div className="text-right">Đã trả</div>
                            <div className="text-right">Còn nợ</div>
                            <div className="text-right">Thao tác</div>
                          </div>
                          <div className="divide-y divide-[#E5E1D1]">
                            {userPayments.map((payment) => (
                              <div key={getPaymentUserId(payment) || `${getPaymentDisplayName(payment)}-${payment.remainingTotal}`} className="grid grid-cols-[minmax(220px,1.5fr)_150px_150px_150px] items-center px-4 py-3 text-sm hover:bg-[#FDF4E3]/45">
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-[#1C1917]">{getPaymentDisplayName(payment)}</p>
                                  <p className="mt-0.5 text-xs text-[#1C1917]/45">{getPaymentUserId(payment) ? `#${getPaymentUserId(payment)}` : 'Thiếu ID người dùng'}</p>
                                </div>
                                <div className="text-right font-black text-emerald-600">{payment.paidTotal.toLocaleString()}đ</div>
                                <div className="text-right font-black text-[#DA251D]">{payment.remainingTotal.toLocaleString()}đ</div>
                                <div className="text-right">
                                  <button
                                    onClick={() => {
                                      const paymentUserId = getPaymentUserId(payment);
                                      if (!paymentUserId) {
                                        alert('Không xác định được người dùng để ghi thanh toán. Vui lòng bấm Cập nhật rồi thử lại.');
                                        return;
                                      }
                                      const amount = Math.max(0, Number(payment.remainingTotal || 0));
                                      setPendingPayment({
                                        userId: paymentUserId,
                                        amount,
                                        fullname: getPaymentDisplayName(payment),
                                        paidTotal: payment.paidTotal,
                                        remainingTotal: payment.remainingTotal
                                      });
                                      setPaymentAmountInput(String(amount));
                                      setShowPaymentConfirm(true);
                                    }}
                                    disabled={isProcessingPayment || !getPaymentUserId(payment) || payment.remainingTotal <= 0}
                                    className="inline-flex items-center justify-center rounded-xl bg-[#DA251D] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#DA251D]/90 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Ghi thanh toán
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userPayments
                          .map((payment) => (
                            <div key={payment.userId} className="bg-gradient-to-br from-[#FDF4E3] to-[#F5E6D3] rounded-3xl border-2 border-[#E5D4B8] p-6 shadow-lg hover:shadow-xl transition-shadow">
                              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-[#E5D4B8]">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#DA251D] shadow-md">
                                  <UserIcon size={28} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-lg text-[#1C1917]">{payment.fullname || payment.username || `Người dùng #${payment.userId || 'không rõ'}`}</p>
                                </div>
                              </div>
                              <div className="space-y-4 mb-6">
                                <div className="bg-white/60 rounded-2xl p-4">
                                  <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/60 mb-1">Đã thanh toán</p>
                                  <p className="text-2xl font-black text-emerald-600">{payment.paidTotal.toLocaleString()}đ</p>
                                </div>
                                <div className="bg-white/60 rounded-2xl p-4">
                                  <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/60 mb-1">Số nợ</p>
                                  <p className="text-2xl font-black text-[#DA251D]">{payment.remainingTotal.toLocaleString()}đ</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const paymentUserId = getPaymentUserId(payment);
                                  if (!paymentUserId) {
                                    alert('Không xác định được người dùng để ghi thanh toán. Vui lòng bấm Cập nhật rồi thử lại.');
                                    return;
                                  }
                                  setPendingPayment({
                                    userId: paymentUserId,
                                    amount: payment.remainingTotal,
                                    fullname: getPaymentDisplayName(payment),
                                    paidTotal: payment.paidTotal,
                                    remainingTotal: payment.remainingTotal
                                  });
                                  setPaymentAmountInput(String(payment.remainingTotal));
                                  setShowPaymentConfirm(true);
                                }}
                                disabled={isProcessingPayment || !getPaymentUserId(payment)}
                                className="w-full bg-[#DA251D] text-white py-3 rounded-2xl font-bold text-sm hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                              >
                                {isProcessingPayment ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                              </button>
                            </div>
                          ))}
                      </div>

                      {pagination && (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-[#1C1917]/55">
                            Đang hiển thị {userPayments.length} / {pagination.total} người còn nợ
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={loadPrevious}
                              disabled={(pagination.page || 1) <= 1 || isLoadingMore}
                              className="rounded-xl border border-[#E5E1D1] px-4 py-2 text-sm font-bold text-[#1C1917] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Trước
                            </button>
                            <span className="min-w-[90px] text-center text-sm font-bold text-[#1C1917]/65">
                              {pagination.page || 1} / {pagination.totalPages || 1}
                            </span>
                            <button
                              type="button"
                              onClick={loadMore}
                              disabled={!pagination.hasMore || isLoadingMore}
                              className="rounded-xl border border-[#E5E1D1] px-4 py-2 text-sm font-bold text-[#1C1917] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isLoadingMore ? 'Đang tải...' : pagination.hasMore ? 'Tải trang sau' : 'Đã hết'}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Load More Button */}
                      {false && pagination && pagination.hasMore && (
                        <div className="mt-8 text-center">
                          <button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="bg-[#DA251D] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg inline-flex items-center gap-2"
                          >
                            {isLoadingMore ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Đang tải...
                              </>
                            ) : (
                              <>
                                Xem thêm ({pagination.total - userPayments.length} người còn lại)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <DollarSign size={48} className="mx-auto" />
                      </div>
                      <p className="text-gray-500 text-lg font-medium">{t.noData.noPaymentData}</p>
                      <p className="text-gray-400 text-sm">{t.noData.paymentDataWillShow}</p>
                    </div>
                  )}
                </div>

                {/* Payment History */}
                <div className="lacquer-card p-4 lg:p-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-display font-bold tracking-tight">{t.ui?.paymentHistory || 'Lịch sử thanh toán'}</h3>
                    {isUpdatingPayments && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-[11px] font-semibold animate-pulse">
                        <RefreshCw size={11} className="animate-spin text-emerald-600" />
                        <span>Đang đồng bộ...</span>
                      </span>
                    )}
                  </div>
                  
                  {paymentHistory.length > 0 ? (
                    <div className="space-y-8">
                      {/* Group payment history by user */}
                      {paginatedPaymentHistoryGroups.map(([fullname, userHistory]: [string, any]) => {
                        const isExpanded = !!expandedUserHistory[fullname];
                        const displayedHistory = isExpanded ? userHistory : userHistory.slice(0, 3);
                        const hasMore = userHistory.length > 3;

                        return (
                          <div key={fullname} className="border-b-2 border-[#E5E1D1] pb-6 last:border-b-0">
                            {/* User Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5D4B8]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                  <UserIcon size={20} className="text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#1C1917]">{fullname}</p>
                                  <p className="text-xs text-[#1C1917]/50">
                                    {userHistory.length} lần thanh toán {hasMore && !isExpanded && `(đang hiện 3 lần gần nhất)`}
                                  </p>
                                </div>
                              </div>
                              {hasMore && (
                                <button
                                  type="button"
                                  onClick={() => toggleUserHistoryExpanded(fullname)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/60"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp size={14} />
                                      <span>Thu gọn</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={14} />
                                      <span>Xem thêm ({userHistory.length - 3})</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Payment Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b-2 border-[#E5D4B8]">
                                    <th className="text-left py-3 px-4 font-bold text-[#1C1917]/70 uppercase tracking-widest text-xs">Người chuyển</th>
                                    <th className="text-left py-3 px-4 font-bold text-[#1C1917]/70 uppercase tracking-widest text-xs">Ngày giờ</th>
                                    <th className="text-right py-3 px-4 font-bold text-[#1C1917]/70 uppercase tracking-widest text-xs">Số tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {displayedHistory.map((history: any) => (
                                    <tr key={history.id} className="border-b border-[#E5E1D1] hover:bg-[#FDF4E3]/50 transition-colors">
                                      <td className="py-3 px-4">
                                        <div className="space-y-1">
                                          <p className="font-bold text-[#1C1917]">
                                            {history.payerName || history.payer_name || 'Chưa có thông tin'}
                                          </p>
                                          {(history.payment_code || history.transfer_description) && (
                                            <p className="text-xs text-[#1C1917]/45 line-clamp-1">
                                              {history.payment_code || history.transfer_description}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                                          <span className="text-[#1C1917]">
                                            {new Date(history.created_at).toLocaleDateString('vi-VN')} lúc {new Date(history.created_at).toLocaleTimeString('vi-VN')}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <p className="font-bold text-emerald-600">{history.amount.toLocaleString()}đ</p>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Nút Xem thêm ở dưới của danh sách lịch sử thanh toán của mỗi user */}
                            {hasMore && (
                              <div className="flex justify-center mt-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleUserHistoryExpanded(fullname)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm active:scale-95"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp size={15} />
                                      <span>Thu gọn (chỉ hiển thị 3 lần gần nhất)</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={15} />
                                      <span>Xem thêm ({userHistory.length - 3} lần chuyển khoản trước)</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* User Total */}
                            <div className="flex justify-end mt-3 pt-3 border-t border-[#E5D4B8]">
                              <div className="text-right">
                                <p className="text-xs text-[#1C1917]/60 font-semibold mb-1">Tổng thanh toán</p>
                                <p className="text-lg font-black text-emerald-600">
                                  {userHistory.reduce((sum: number, h: any) => sum + h.amount, 0).toLocaleString()}đ
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex flex-col gap-3 border-t border-[#E5E1D1] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-[#1C1917]/55">
                          Hiển thị {paginatedPaymentHistoryGroups.length} / {paymentHistoryGroups.length} người dùng ({paymentHistory.length} giao dịch)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentHistoryPage((page) => Math.max(1, page - 1))}
                            disabled={paymentHistoryPage <= 1}
                            className="rounded-xl border border-[#E5E1D1] px-4 py-2 text-sm font-bold text-[#1C1917] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Trước
                          </button>
                          <span className="min-w-[90px] text-center text-sm font-bold text-[#1C1917]/65">
                            {paymentHistoryPage} / {paymentHistoryTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPaymentHistoryPage((page) => Math.min(paymentHistoryTotalPages, page + 1))}
                            disabled={paymentHistoryPage >= paymentHistoryTotalPages}
                            className="rounded-xl border border-[#E5E1D1] px-4 py-2 text-sm font-bold text-[#1C1917] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t.ui?.noPaymentHistory || 'Chưa có lịch sử thanh toán'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'invoicing' && (
              <div
                key="invoicing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <ErrorBoundary fallbackTitle="Không thể tải tab Lịch đặt cơm">
                  <React.Suspense fallback={<TabLoadingSkeleton />}>
                    <AdminMonthlyCalendar 
                      translations={t} 
                      theme={theme} 
                      accentColor={theme === 'corporate' ? '#00A693' : '#DA251D'} 
                    />
                  </React.Suspense>
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'payment-calendar' && (
              <div
                key="payment-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {user?.role === 'admin' ? (
                  <React.Suspense fallback={<TabLoadingSkeleton />}>
                    <AdminStatsView 
                      translations={t} 
                      theme={theme} 
                      accentColor={theme === 'corporate' ? '#00A693' : '#DA251D'}
                      onNavigateToCalendar={() => setActiveTab('invoicing')}
                    />
                  </React.Suspense>
                ) : (
                  <ErrorBoundary fallbackTitle="Không thể tải tab Thanh toán">
                    <React.Suspense fallback={<TabLoadingSkeleton />}>
                      <PaymentDashboard translations={t} currentLang={currentLang} />
                    </React.Suspense>
                  </ErrorBoundary>
                )}
              </div>
            )}

            {activeTab === 'feedback' && (
              <React.Suspense fallback={<TabLoadingSkeleton />}>
                <FeedbackView
                  user={user}
                  feedbacks={feedbacks}
                  translations={t}
                  updateFeedbackStatus={updateFeedbackStatus}
                  createFeedback={createFeedback}
                />
              </React.Suspense>
            )}

            {activeTab === 'accounts' && (
              <React.Suspense fallback={<TabLoadingSkeleton />}>
                <AccountsManagementView
                  users={users}
                  currentUser={user}
                  translations={t}
                  onEditUser={(userItem) => {
                    setEditingUser(userItem);
                    setEditUserFullname(userItem.fullname || '');
                    setEditUserUsername(userItem.username || '');
                    setEditUserRole(userItem.role || 'user');
                    setEditUserPassword('');
                  }}
                  onDeleteUser={deleteUser}
                />
              </React.Suspense>
            )}

            {activeTab === 'banner-video' && user?.role === 'admin' && (
              <div key="banner-video-page" className="space-y-8">
                <React.Suspense fallback={<TabLoadingSkeleton />}>
                  <AdminBannerControl user={user} />
                </React.Suspense>
                <React.Suspense fallback={<TabLoadingSkeleton />}>
                  <AdminVideoControl user={user} />
                </React.Suspense>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showOrderSuccess && (
          <div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 right-10 z-[100] bg-[#DA251D] text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-[#DA251D]/50"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-xs">{t.orderSuccess}</p>
              <p className="text-[10px] opacity-80 font-medium">Your meal is being prepared with love.</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Menu Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm sm:max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture mx-4"
            >
              <div className="p-4 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-display font-bold tracking-tight">📋 {t.exportMenuTitle}</h3>
                    <p className="text-sm text-app-ink/60 mt-1">{t.exportInstructions}</p>
                  </div>
                  <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-[#F5F2E9] rounded-xl transition-colors">
                    <X size={24} className="text-[#1C1917]/20" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Display current menu for reference */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h5 className="font-bold text-blue-800 mb-3">📋 Menu hôm nay (để tham khảo):</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {menu?.dishes?.map((dish, index) => (
                        <div key={dish.id} className="flex items-center gap-2 text-blue-700">
                          <span className="font-bold">{index + 1}.</span>
                          <span className="truncate">{dish.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#F5F2E9] rounded-2xl p-6 border border-[#E5E1D1]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg">Danh sách đặt món ({orders.length} đơn)</h4>
                      <button
                        onClick={copyToClipboard}
                        data-copy-button
                        className="px-4 py-2 bg-[#4ADE80] text-white rounded-xl font-bold text-sm hover:bg-[#4ADE80]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        📋 {t.copyToClipboard}
                      </button>
                    </div>
                    
                    <textarea
                      value={exportedMenu}
                      readOnly
                      rows={12}
                      className="w-full bg-white border border-[#E5E1D1] rounded-xl p-4 text-sm font-mono resize-none focus:outline-none focus:border-[#DA251D]"
                      placeholder="Thực đơn sẽ hiển thị ở đây..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-500 mt-0.5">💡</div>
                      <div>
                        <h5 className="font-bold text-blue-800 mb-1">Hướng dẫn sử dụng:</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Click "Copy" để copy toàn bộ thực đơn</li>
                          <li>• Mở Zalo và paste (Ctrl+V) vào tin nhắn</li>
                          <li>• Số đầu mỗi dòng là thứ tự món trong menu</li>
                          <li>• Format: Tên + Món1+Món2 + (Ghi chú nếu có)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end">
                    <button 
                      onClick={() => setShowExportModal(false)}
                      className="px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest border border-[#E5E1D1] text-[#1C1917]/40 hover:bg-[#F5F2E9] transition-all"
                    >
                      {t.close}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMenuModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMenuModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm sm:max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture mx-4"
            >
              <div className="p-4 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-3xl font-display font-bold tracking-tight">Thêm thực đơn hôm nay</h3>
                    <p className="text-sm text-app-ink/60 mt-2">Copy menu từ quán cơm và paste vào đây (mỗi món một dòng)</p>
                  </div>
                  <button onClick={() => setShowAddMenuModal(false)} className="p-2 hover:bg-[#F5F2E9] rounded-xl transition-colors">
                    <X size={24} className="text-[#1C1917]/20" />
                  </button>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={menuText}
                    onChange={(e) => setMenuText(e.target.value)}
                    placeholder="Ví dụ:&#10;Cơm gà xối mỡ&#10;Cơm sườn nướng&#10;Cơm bò lúc lắc&#10;Cơm cá kho&#10;..."
                    rows={12}
                    className="w-full px-6 py-4 bg-[#F5F2E9]/50 border-2 border-[#E5E1D1] rounded-2xl focus:outline-none focus:border-[#DA251D] text-sm font-medium resize-none"
                  />
                  <p className="text-xs text-app-ink/40">
                    💡 Mỗi món ăn một dòng. Menu sẽ tự động xóa sau 23:00 mỗi tối.
                  </p>
                </div>

                <div className="mt-10 flex gap-4 justify-end">
                  <button 
                    onClick={() => setShowAddMenuModal(false)}
                    className="px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest border border-[#E5E1D1] text-[#1C1917]/40 hover:bg-[#F5F2E9] transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleCreateMenu}
                    className="px-8 py-4 bg-[#DA251D] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#DA251D]/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Tạo menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Multilingual Menu Modal */}
      <AnimatePresence>
        {showMultilingualModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMultilingualModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm sm:max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="p-4 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-3xl font-display font-bold tracking-tight">🌐 Tạo menu đa ngôn ngữ</h3>
                    <p className="text-sm text-app-ink/60 mt-2">Nhập menu theo format: Tiếng Việt {'>>>>>'} English {'>>>>>'} 日本語</p>
                  </div>
                  <button onClick={() => setShowMultilingualModal(false)} className="p-2 hover:bg-[#F5F2E9] rounded-xl transition-colors">
                    <X size={24} className="text-[#1C1917]/20" />
                  </button>
                </div>

                {/* Format Input Method */}
                <div className="mb-8">
                  <h4 className="text-lg font-bold mb-4">📝 Nhập nhanh theo format</h4>
                  <div className="space-y-4">
                    <textarea
                      value={multilingualText}
                      onChange={(e) => setMultilingualText(e.target.value)}
                      placeholder="Ví dụ:&#10;Cá trắm sốt cà chua >>>>> Grass carp in tomato sauce >>>>> トマトソースのソウギョ（草魚）&#10;Tóp mỡ xào dưa cải >>>>> Stir-fried pork cracklings with pickled mustard greens >>>>> 豚脂かすと高菜の炒め物&#10;Sườn non sốt nấm tươi >>>>> Pork ribs with fresh mushroom sauce >>>>> スペアリブのフレッシュきのこソース"
                      rows={8}
                      className="w-full px-6 py-4 bg-[#F5F2E9]/50 border-2 border-[#E5E1D1] rounded-2xl focus:outline-none focus:border-[#DA251D] text-sm font-medium resize-none"
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={parseMultilingualText}
                        className="px-6 py-3 bg-[#4ADE80] text-white rounded-xl font-bold hover:bg-[#4ADE80]/90 transition-colors"
                      >
                        🔄 Xem trước
                      </button>
                      <button
                        onClick={handleCreateMultilingualFromText}
                        disabled={!multilingualText.trim()}
                        className="px-6 py-3 bg-[#DA251D] text-white rounded-xl font-bold hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🌐 Tạo menu ngay
                      </button>
                    </div>
                    <p className="text-xs text-app-ink/40">
                      💡 Mỗi món một dòng, phân cách bằng {'>>>>>'} giữa 3 ngôn ngữ
                    </p>
                  </div>
                </div>

                {/* Preview/Manual Edit */}
                {multilingualMenus.length > 0 && (
                  <div className="border-t border-[#E5E1D1] pt-8">
                    <h4 className="text-lg font-bold mb-4">👀 Xem trước & chỉnh sửa</h4>
                    <div className="space-y-6">
                      {multilingualMenus.map((dish, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-[#F5F2E9]/50 rounded-2xl border border-[#E5E1D1]">
                          <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-2">🇻🇳 Tiếng Việt</label>
                            <input
                              type="text"
                              value={dish.vi}
                              onChange={(e) => updateMultilingualDish(index, 'vi', e.target.value)}
                              className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-2">🇺🇸 English</label>
                            <input
                              type="text"
                              value={dish.en}
                              onChange={(e) => updateMultilingualDish(index, 'en', e.target.value)}
                              className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-sm font-bold text-[#1C1917] mb-2">🇯🇵 日本語</label>
                              <input
                                type="text"
                                value={dish.ja}
                                onChange={(e) => updateMultilingualDish(index, 'ja', e.target.value)}
                                className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] text-sm"
                              />
                            </div>
                            <button
                              onClick={() => removeMultilingualDish(index)}
                              className="mt-7 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Xóa món này"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={addMultilingualDish}
                        className="w-full p-4 border-2 border-dashed border-[#E5E1D1] rounded-2xl text-[#1C1917]/40 hover:border-[#DA251D] hover:text-[#DA251D] transition-all"
                      >
                        + Thêm món ăn mới
                      </button>
                    </div>

                    <div className="mt-8 flex gap-4 justify-end">
                      <button 
                        onClick={() => {
                          setShowMultilingualModal(false);
                          setMultilingualMenus([]);
                          setMultilingualText('');
                        }}
                        className="px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest border border-[#E5E1D1] text-[#1C1917]/40 hover:bg-[#F5F2E9] transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleCreateMultilingualMenu}
                        disabled={multilingualMenus.length === 0}
                        className="px-8 py-4 bg-[#4ADE80] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#4ADE80]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🌐 Tạo menu đa ngôn ngữ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Summary Modal */}
      <AnimatePresence>
        {showOrderSummary && (
          <div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => !isPlacingOrder && setShowOrderSummary(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <OrderSummary
                selectedDishes={menu?.dishes?.filter(dish => selectedDishes.includes(dish.id)) || []}
                customerName={orderForUserId ? allUsers.find(u => u.id === orderForUserId)?.fullname || '' : user?.fullname || ''}
                isForSelf={!orderForUserId || orderForUserId === user?.id}
                notes={orderNotes}
                options={{
                  extraRice,
                  extraSoup,
                  chiliSauce,
                  fishSauce,
                  chopsticks,
                  lessRice
                }}
                onConfirm={handleConfirmOrder}
                onCancel={() => setShowOrderSummary(false)}
                isLoading={isPlacingOrder}
                translations={t}
                theme={theme}
                currentLang={currentLang}
                allUsers={allUsers}
                currentUserId={user?.id}
                orderForUserId={orderForUserId}
                onOrderForUserChange={(id) => setOrderForUserId(id)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && (
          <div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-8 shadow-2xl z-[70] text-center"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Đặt món thành công!</h3>
            <p className="text-gray-600">Đơn hàng của bạn đã được ghi nhận</p>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {showEditOrderModal && editingOrder && (
          <div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditOrderModal(false)}
          >
            <div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-[#1C1917] mb-6">Chỉnh sửa đơn hàng</h3>
              
              <div className="space-y-6">
                {/* Current order info */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 mb-2">Đơn hàng hiện tại:</p>
                  <p className="font-semibold">{editingOrder.receiver?.fullname}</p>
                  <p className="text-sm text-gray-600">
                    {getDishName(editingOrder.dish1, currentLang)} {editingOrder.dish2?.name ? `+ ${getDishName(editingOrder.dish2, currentLang)}` : ''}
                  </p>
                  {editingOrder.created_at && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-medium">
                      <Clock size={12} className="inline text-emerald-600" />
                      <span>Đặt lúc: {new Date(editingOrder.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(editingOrder.created_at).toLocaleDateString('vi-VN')})</span>
                    </p>
                  )}
                </div>

                {/* Dish 1 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Món chính *
                  </label>
                  <select
                    value={editDish1}
                    onChange={(e) => setEditDish1(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent"
                  >
                    <option value={0}>Chọn món chính</option>
                    {menu?.dishes?.map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        {getDishName(dish, currentLang)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dish 2 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Món phụ (tùy chọn)
                  </label>
                  <select
                    value={editDish2}
                    onChange={(e) => setEditDish2(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent"
                  >
                    <option value={0}>Không chọn món phụ</option>
                    {menu?.dishes?.map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        {getDishName(dish, currentLang)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ghi chú đặc biệt..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA251D] focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEditOrderModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!canPlaceOrder) {
                        alert((t.deadline?.alertExpiredEdit || 'Đã hết giờ chỉnh sửa đơn cơm hôm nay (hạn chót là {deadline}). Bếp đã khóa danh sách để nấu món.').replace('{deadline}', '11:00'));
                        return;
                      }
                      if (!editDish1) {
                        alert('Vui lòng chọn món chính');
                        return;
                      }

                      try {
                        await updateOrder(editingOrder.id, {
                          dish1Id: editDish1,
                          dish2Id: editDish2 || undefined,
                          notes: editNotes || undefined
                        });
                        
                        setShowEditOrderModal(false);
                        await refetchOrders();
                        alert('Đã cập nhật đơn hàng thành công!');
                      } catch (error) {
                        console.error('Lỗi khi cập nhật đơn hàng:', error);
                        alert('Lỗi khi cập nhật đơn hàng. Vui lòng thử lại.');
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-[#DA251D] text-white rounded-xl hover:bg-[#DA251D]/90 transition-colors"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Chỉnh sửa tài khoản */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingUser && setEditingUser(null)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] p-6 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D1] mb-5">
                <h3 className="text-xl font-bold text-[#1C1917]">Chỉnh sửa tài khoản</h3>
                <button 
                  onClick={() => !isSavingUser && setEditingUser(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]/60 mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={editUserFullname}
                    onChange={(e) => setEditUserFullname(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E5E1D1] rounded-xl text-sm focus:outline-none focus:border-[#DA251D] focus:ring-1 focus:ring-[#DA251D]"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]/60 mb-1.5">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E5E1D1] rounded-xl text-sm focus:outline-none focus:border-[#DA251D] focus:ring-1 focus:ring-[#DA251D]"
                    placeholder="nguyenvana"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]/60 mb-1.5">
                    Vai trò
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as 'user' | 'admin')}
                    className="w-full px-3 py-2.5 border border-[#E5E1D1] rounded-xl text-sm bg-white focus:outline-none focus:border-[#DA251D] focus:ring-1 focus:ring-[#DA251D]"
                  >
                    <option value="user">Nhân viên (user)</option>
                    <option value="admin">Quản trị viên (admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]/60 mb-1.5">
                    Mật khẩu mới (tùy chọn)
                  </label>
                  <input
                    type="password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E5E1D1] rounded-xl text-sm focus:outline-none focus:border-[#DA251D] focus:ring-1 focus:ring-[#DA251D]"
                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-[#E5E1D1]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingUser}
                  className="flex-1 px-4 py-2.5 border border-[#E5E1D1] text-[#1C1917] rounded-xl font-bold text-sm hover:bg-[#F5F2E9] transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSavingUser || !editUserFullname.trim() || !editUserUsername.trim()}
                  onClick={async () => {
                    if (!editUserFullname.trim() || !editUserUsername.trim()) {
                      alert('Vui lòng nhập đầy đủ họ tên và tên đăng nhập');
                      return;
                    }
                    try {
                      setIsSavingUser(true);
                      await updateUser(editingUser.id, {
                        fullname: editUserFullname.trim(),
                        username: editUserUsername.trim(),
                        role: editUserRole,
                        password: editUserPassword.trim() || undefined
                      });
                      alert('Cập nhật tài khoản thành công!');
                      setEditingUser(null);
                    } catch (err) {
                      alert('Lỗi cập nhật: ' + (err.message || 'Lỗi server'));
                    } finally {
                      setIsSavingUser(false);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#DA251D] text-white rounded-xl font-bold text-sm hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50"
                >
                  {isSavingUser ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showPaymentConfirm && pendingPayment && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPaymentConfirm(false);
                setPaymentAmountInput('');
              }}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E1D1] silk-texture"
            >
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-[#DA251D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign size={32} className="text-[#DA251D]" />
                  </div>
                  <h3 className="text-2xl font-display font-bold tracking-tight mb-2">Xác nhận thanh toán</h3>
                  <p className="text-sm text-[#1C1917]/60">Vui lòng xác nhận thông tin thanh toán</p>
                </div>

                <div className="bg-[#F5F2E9] rounded-2xl p-6 mb-8 border border-[#E5E1D1]">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/45">Người dùng</p>
                      <p className="mt-1 font-bold text-[#1C1917]">{pendingPayment.fullname || `#${pendingPayment.userId}`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white/70 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/45">Đã trả</p>
                        <p className="mt-1 font-black text-emerald-600">{(pendingPayment.paidTotal || 0).toLocaleString()}đ</p>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/45">Còn nợ</p>
                        <p className="mt-1 font-black text-[#DA251D]">{(pendingPayment.remainingTotal ?? pendingPayment.amount).toLocaleString()}đ</p>
                      </div>
                    </div>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/45">Số tiền ghi nhận</span>
                      <div className="mt-2 flex items-center rounded-xl border border-[#E5E1D1] bg-white px-3 py-2 focus-within:border-[#DA251D] focus-within:ring-2 focus-within:ring-[#DA251D]/10">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={paymentAmountInput}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/[^\d]/g, '');
                            const maxAmount = Number(pendingPayment.remainingTotal ?? pendingPayment.amount);
                            const normalized = digits ? Math.min(Number(digits), maxAmount) : 0;
                            setPaymentAmountInput(digits ? String(normalized) : '');
                          }}
                          className="min-w-0 flex-1 bg-transparent text-xl font-black text-[#1C1917] outline-none"
                          placeholder="40000"
                        />
                        <span className="text-sm font-bold text-[#1C1917]/45">đ</span>
                      </div>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[40000, 80000, Number(pendingPayment.remainingTotal ?? pendingPayment.amount)].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPaymentAmountInput(String(value))}
                          className="rounded-xl border border-[#E5E1D1] bg-white px-2 py-2 text-xs font-bold text-[#1C1917] hover:border-[#DA251D]/40 hover:text-[#DA251D]"
                        >
                          {value === Number(pendingPayment.remainingTotal ?? pendingPayment.amount) ? 'Trả hết' : `${value.toLocaleString()}đ`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden bg-[#F5F2E9] rounded-2xl p-6 mb-8 border border-[#E5E1D1]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1C1917]/60">Số tiền thanh toán:</span>
                      <span className="text-2xl font-black text-[#DA251D]">{pendingPayment.amount.toLocaleString()}đ</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPaymentConfirm(false);
                      setPaymentAmountInput('');
                    }}
                    disabled={isProcessingPayment}
                    className="flex-1 px-6 py-3 border border-[#E5E1D1] text-[#1C1917] rounded-2xl font-bold hover:bg-[#F5F2E9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingPayment.userId) {
                        alert('Không xác định được người dùng để ghi thanh toán. Vui lòng đóng popup, bấm Cập nhật rồi thử lại.');
                        return;
                      }
                      setIsProcessingPayment(true);
                      try {
                        const enteredAmount = Number(paymentAmountInput || 0);
                        const maxAmount = Number(pendingPayment.remainingTotal ?? pendingPayment.amount);
                        if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
                          alert('Vui lòng nhập số tiền thanh toán hợp lệ.');
                          return;
                        }
                        if (enteredAmount > maxAmount) {
                          alert('Số tiền thanh toán không được lớn hơn số nợ còn lại.');
                          return;
                        }
                        await markAsPaid(pendingPayment.userId, enteredAmount);
                        setShowPaymentConfirm(false);
                        setPendingPayment(null);
                        setPaymentAmountInput('');
                      } catch (error) {
                        console.error('Payment error:', error);
                        alert('Lỗi khi thanh toán. Vui lòng thử lại.');
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    }}
                    disabled={isProcessingPayment}
                    className="flex-1 px-6 py-3 bg-[#DA251D] text-white rounded-2xl font-bold hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReconcileModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Đối soát sao kê / SMS ngân hàng</h3>
                    <p className="text-xs text-gray-500">Dán nội dung tin nhắn hoặc biến động số dư từ app ngân hàng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nội dung sao kê / SMS (mỗi dòng một giao dịch)
                </label>
                <textarea
                  value={reconcileInputText}
                  onChange={(e) => setReconcileInputText(e.target.value)}
                  placeholder="Ví dụ:&#10;Từ: FSI172M202611 LE DUYEN + 40,000 VND&#10;Từ: FSI171M202611 TRAN LINH CHI + 40,000 VND"
                  className="w-full h-36 px-4 py-3 rounded-2xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  💡 Hệ thống tự động nhận diện mã <code>FSI...</code>, họ tên user và số tiền để gạch nợ chính xác.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleReconcileSubmit}
                  disabled={isReconcilingText || !reconcileInputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconcilingText ? 'animate-spin' : ''}`} />
                  {isReconcilingText ? 'Đang xử lý...' : 'Xác nhận đối soát'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-ink/40 hover:text-app-accent hover:bg-app-accent/5'}`}
    >
      {active && <div className="absolute inset-0 silk-texture opacity-10" />}
      <div 
        className={`${active ? 'text-white' : 'group-hover:text-app-accent'} transition-colors duration-300 relative z-10`}
        whileHover={{ rotate: active ? 0 : 5 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </div>
      <span 
        key={label}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden md:block font-bold text-xs uppercase tracking-widest relative z-10"
      >
        {label}
      </span>
      {active && (
        <div 
          layoutId="active-pill" 
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full relative z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

function MobileSidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-ink/40 hover:text-app-accent hover:bg-app-accent/5'}`}
    >
      {active && <div className="absolute inset-0 silk-texture opacity-10" />}
      <div 
        className={`${active ? 'text-white' : 'group-hover:text-app-accent'} transition-colors duration-300 relative z-10`}
        whileHover={{ rotate: active ? 0 : 5 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </div>
      <span 
        key={label}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="block font-bold text-xs uppercase tracking-widest relative z-10"
      >
        {label}
      </span>
      {active && (
        <div 
          layoutId="mobile-active-pill" 
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full relative z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string, unit: string }) {
  return (
    <div className="lacquer-card p-6 group relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-16 h-16 lotus-pattern opacity-[0.1] -mr-4 -mb-4" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-app-accent/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-app-accent/10">
            {icon}
          </div>
          <ChevronRight size={16} className="text-app-ink/20" />
        </div>
        <p className="text-[10px] font-bold text-app-ink/40 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-app-ink">{value}</span>
          <span className="text-[10px] font-bold text-app-ink/20 uppercase tracking-widest">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function NutritionMini({ label, value }: { label: string, value: number }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-bold text-[#1C1917]/20 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-black text-[#1C1917]">{value}</p>
    </div>
  );
}



