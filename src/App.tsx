import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  History, 
  User as UserIcon, 
  ChefHat, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Bell,
  Search,
  Filter,
  X,
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
  Dna,
  Coffee,
  IceCream,
  Trash2,
  Edit,
  Pizza,
  Soup,
  Fish,
  DollarSign,
  Menu,
  Palette,
  Sword,
  Play
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
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
import { FusionSliceGame } from './components/FusionSliceGame';
import PaymentDashboard from './components/PaymentDashboard';
import { useDashboardStats } from './hooks/useDashboardStats';
import { menuAPI, ordersAPI, usersAPI, adminAPI } from './services/api';

const TRANSLATIONS = {
  vi: {
    dashboard: 'Bảng điều khiển',
    menu: 'Thực đơn',
    orders: 'Đơn hàng',
    settings: 'Cài đặt',
    paymentCalendar: 'Thanh toán',
    protein: 'Đạm',
    carbs: 'Tinh bột',
    fat: 'Béo',
    orderNow: 'Đặt món',
    weeklyActivity: 'Suất cơm theo ngày',
    todayMenu: 'Thực đơn hôm nay',
    paymentQR: 'Mã QR Thanh toán',
    scanToPay: 'Quét để thanh toán',
    orderSuccess: 'Đặt món thành công!',
    nutritionInfo: 'Thông tin dinh dưỡng',
    logout: 'Đăng xuất',
    orderHistory: 'Lịch sử đặt món',
    feedback: 'Góp ý',
    // Order options
    extraRice: 'Thêm cơm',
    extraSoup: 'Thêm canh',
    chiliSauce: 'Thêm tương ớt',
    fishSauce: 'Thêm mắm',
    chopsticks: 'Thêm đũa',
    lessRice: 'Ít cơm',
    notes: 'Ghi chú',
    // Messages
    pleaseEnterMenu: 'Vui lòng nhập menu',
    pleaseAddDish: 'Vui lòng thêm ít nhất một món ăn',
    menuCreatedSuccess: 'Menu đa ngôn ngữ đã được tạo thành công!',
    menuFormatError: 'Vui lòng nhập menu theo đúng format:\nTiếng Việt >>>>> English >>>>> 日本語',
    pleaseFeedback: 'Vui lòng nhập nội dung góp ý',
    orderError: 'Lỗi khi đặt món',
    menuError: 'Lỗi khi tạo menu',
    unknownError: 'Lỗi không xác định',
    // Export menu
    exportMenu: 'Xuất thực đơn',
    exportMenuTitle: 'Xuất thực đơn cho Zalo',
    exportInstructions: 'Copy đoạn text dưới đây và gửi vào group Zalo:',
    copyToClipboard: 'Copy vào clipboard',
    copied: 'Đã copy!',
    close: 'Đóng',
    // Order Summary
    confirmOrder: 'Xác nhận đặt món',
    checkOrderInfo: 'Vui lòng kiểm tra thông tin đơn hàng',
    orderForSelf: 'Đặt cho bản thân',
    orderForOther: 'Đặt cho người khác',
    selectedDishes: 'Món đã chọn',
    additionalOptions: 'Tùy chọn thêm',
    totalAmount: 'Tổng tiền',
    cancel: 'Hủy',
    // Order Panel
    orderOptions: 'Tùy chọn',
    orderFor: 'Đặt cho',
    orderForLabel: 'Đặt món cho:',
    orderNotes: 'Ghi chú',
    orderNotesPlaceholder: 'Thêm ghi chú cho đơn hàng của bạn...',
    placeOrder: 'Đặt món',
    // Order History
    date: 'Ngày',
    person: 'Người ăn',
    dish1: 'Món 1',
    dish2: 'Món 2',
    noSecondDish: 'Không có',
    noNotes: 'Không có',
    // User labels
    myself: '(Bản thân)',
    // Units
    units: {
      orders: 'đơn',
      people: 'người',
      dishes: 'món'
    },
    // No data messages
    noData: {
      popularDishes: 'Chưa có dữ liệu món ăn phổ biến',
      createMenuFirst: 'Hãy tạo menu và đặt món để xem thống kê',
      noDataGeneral: 'Chưa có dữ liệu',
      noPaymentData: 'Chưa có dữ liệu thanh toán',
      paymentDataWillShow: 'Dữ liệu sẽ hiển thị khi có đơn hàng',
      noMenuToday: 'Chưa có menu hôm nay',
      pleaseComeLater: 'Vui lòng quay lại sau',
      addNewMenu: 'Hãy thêm menu mới'
    },
    admin: {
      menuManagement: 'Quản lý Menu',
      allOrders: 'Tất cả đơn',
      statistics: 'Thống kê',
      payments: 'Thanh toán',
      invoicing: 'Lịch đặt cơm',
      feedback: 'Góp ý',
      accountManagement: 'Quản lý tài khoản',
      ordersToday: 'Đơn hôm nay',
      monthlyOrders: 'Đơn tháng này',
      users: 'Người đặt',
      monthlyRevenue: 'Doanh thu tháng',
      popularDishes: 'Món phổ biến',
      menuToday: 'Menu hôm nay',
      favoriteDishes: 'Món được yêu thích'
    },
    // Payment Dashboard
    paymentDashboard: {
      title: 'Lịch đặt cơm',
      totalMeals: 'Tổng số cơm',
      paid: 'Đã thanh toán',
      unpaid: 'Chưa thanh toán',
      totalAmount: 'Tổng tiền',
      noData: 'Không có dữ liệu thanh toán',
      // Calendar
      monthNames: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                   'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
      dayNames: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
      // Legend
      noOrder: 'Không đặt',
      oneMeal: '1 suất',
      twoMeals: '2 suất',
      threePlusMeals: '3+ suất'
    },
    // Feedback Form
    feedbackForm: {
      title: 'Góp ý & Phản hồi',
      subjectLabel: 'Chủ đề (tùy chọn)',
      subjectPlaceholder: 'Ví dụ: Về chất lượng món ăn, dịch vụ...',
      contentLabel: 'Nội dung góp ý *',
      contentPlaceholder: 'Hãy chia sẻ ý kiến của bạn về món ăn, dịch vụ hoặc bất kỳ điều gì bạn muốn cải thiện...',
      submitButton: 'Gửi góp ý',
      clearButton: 'Xóa nội dung',
      noFeedback: 'Góp ý từ người dùng sẽ hiển thị ở đây'
    }
  },
  en: {
    dashboard: 'Dashboard',
    menu: 'Menu',
    orders: 'Orders',
    settings: 'Settings',
    paymentCalendar: 'Payment',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    orderNow: 'Order Now',
    weeklyActivity: 'Daily Meal Orders',
    todayMenu: "Today's Menu",
    paymentQR: 'Payment QR',
    scanToPay: 'Scan to pay',
    orderSuccess: 'Order Successful!',
    nutritionInfo: 'Nutrition Info',
    logout: 'Logout',
    orderHistory: 'Order History',
    feedback: 'Feedback',
    // Order options
    extraRice: 'Extra Rice',
    extraSoup: 'Extra Soup',
    chiliSauce: 'Chili Sauce',
    fishSauce: 'Fish Sauce',
    chopsticks: 'Chopsticks',
    lessRice: 'Less Rice',
    notes: 'Notes',
    // Messages
    pleaseEnterMenu: 'Please enter menu',
    pleaseAddDish: 'Please add at least one dish',
    menuCreatedSuccess: 'Multilingual menu created successfully!',
    menuFormatError: 'Please enter menu in correct format:\nVietnamese >>>>> English >>>>> Japanese',
    pleaseFeedback: 'Please enter feedback content',
    orderError: 'Order error',
    menuError: 'Menu creation error',
    unknownError: 'Unknown error',
    // Export menu
    exportMenu: 'Export Menu',
    exportMenuTitle: 'Export Menu for Zalo',
    exportInstructions: 'Copy the text below and send to Zalo group:',
    copyToClipboard: 'Copy to clipboard',
    copied: 'Copied!',
    close: 'Close',
    // Order Summary
    confirmOrder: 'Confirm Order',
    checkOrderInfo: 'Please check your order information',
    orderForSelf: 'Order for myself',
    orderForOther: 'Order for someone else',
    selectedDishes: 'Selected Dishes',
    additionalOptions: 'Additional Options',
    totalAmount: 'Total Amount',
    cancel: 'Cancel',
    // Order Panel
    orderOptions: 'Options',
    orderFor: 'Order for',
    orderForLabel: 'Order for:',
    orderNotes: 'Notes',
    orderNotesPlaceholder: 'Add notes for your order...',
    placeOrder: 'Place Order',
    // Order History
    date: 'Date',
    person: 'Person',
    dish1: 'Dish 1',
    dish2: 'Dish 2',
    noSecondDish: 'None',
    noNotes: 'No notes',
    // User labels
    myself: '(Myself)',
    // Units
    units: {
      orders: 'orders',
      people: 'people',
      dishes: 'dishes'
    },
    // No data messages
    noData: {
      popularDishes: 'No popular dishes data',
      createMenuFirst: 'Create menu and place orders to see statistics',
      noDataGeneral: 'No data available',
      noPaymentData: 'No payment data',
      paymentDataWillShow: 'Data will appear when there are orders',
      noMenuToday: 'No menu today',
      pleaseComeLater: 'Please come back later',
      addNewMenu: 'Please add new menu'
    },
    admin: {
      menuManagement: 'Menu Management',
      allOrders: 'All Orders',
      statistics: 'Statistics',
      payments: 'Payments',
      invoicing: 'Invoicing',
      feedback: 'Feedback',
      accountManagement: 'Account Management',
      ordersToday: 'Orders Today',
      monthlyOrders: 'Monthly Orders',
      users: 'Users',
      monthlyRevenue: 'Monthly Revenue',
      popularDishes: 'Popular Dishes',
      menuToday: 'Menu Today',
      favoriteDishes: 'Favorite Dishes'
    },
    // Payment Dashboard
    paymentDashboard: {
      title: 'Meal Schedule',
      totalMeals: 'Total Meals',
      paid: 'Paid',
      unpaid: 'Unpaid',
      totalAmount: 'Total Amount',
      noData: 'No payment data',
      // Calendar
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'],
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      // Legend
      noOrder: 'No order',
      oneMeal: '1 meal',
      twoMeals: '2 meals',
      threePlusMeals: '3+ meals'
    },
    // Feedback Form
    feedbackForm: {
      title: 'Feedback & Comments',
      subjectLabel: 'Subject (optional)',
      subjectPlaceholder: 'e.g., About food quality, service...',
      contentLabel: 'Feedback content *',
      contentPlaceholder: 'Share your thoughts about the food, service, or anything you\'d like to improve...',
      submitButton: 'Submit Feedback',
      clearButton: 'Clear Content',
      noFeedback: 'User feedback will be displayed here'
    }
  },
  ja: {
    dashboard: 'ダッシュボード',
    menu: 'メニュー',
    orders: '注文',
    settings: '設定',
    paymentCalendar: '支払い',
    protein: 'タンパク質',
    carbs: '炭水化物',
    fat: '脂質',
    orderNow: '今すぐ注文',
    weeklyActivity: '日別注文数',
    todayMenu: '今日のメニュー',
    paymentQR: '支払いQR',
    scanToPay: 'スキャンして支払い',
    orderSuccess: '注文完了！',
    nutritionInfo: '栄養情報',
    logout: 'ログアウト',
    orderHistory: '注文履歴',
    feedback: 'フィードバック',
    // Order options
    extraRice: 'ご飯追加',
    extraSoup: 'スープ追加',
    chiliSauce: 'チリソース',
    fishSauce: 'ヌクマム',
    chopsticks: '箸',
    lessRice: 'ご飯少なめ',
    notes: 'メモ',
    // Messages
    pleaseEnterMenu: 'メニューを入力してください',
    pleaseAddDish: '少なくとも1つの料理を追加してください',
    menuCreatedSuccess: '多言語メニューが正常に作成されました！',
    menuFormatError: '正しい形式でメニューを入力してください:\nベトナム語 >>>>> English >>>>> 日本語',
    pleaseFeedback: 'フィードバック内容を入力してください',
    orderError: '注文エラー',
    menuError: 'メニュー作成エラー',
    unknownError: '不明なエラー',
    // Export menu
    exportMenu: 'メニューエクスポート',
    exportMenuTitle: 'Zalo用メニューエクスポート',
    exportInstructions: '以下のテキストをコピーしてZaloグループに送信:',
    copyToClipboard: 'クリップボードにコピー',
    copied: 'コピーしました！',
    close: '閉じる',
    // Order Summary
    confirmOrder: '注文確認',
    checkOrderInfo: '注文情報をご確認ください',
    orderForSelf: '自分用の注文',
    orderForOther: '他の人用の注文',
    selectedDishes: '選択した料理',
    additionalOptions: '追加オプション',
    totalAmount: '合計金額',
    cancel: 'キャンセル',
    // Order Panel
    orderOptions: 'オプション',
    orderFor: '注文者',
    orderForLabel: '注文者:',
    orderNotes: 'メモ',
    orderNotesPlaceholder: '注文にメモを追加...',
    placeOrder: '注文する',
    // Order History
    date: '日付',
    person: '注文者',
    dish1: '料理1',
    dish2: '料理2',
    noSecondDish: 'なし',
    noNotes: 'メモなし',
    // User labels
    myself: '(自分)',
    // Units
    units: {
      orders: '件',
      people: '人',
      dishes: '品'
    },
    // No data messages
    noData: {
      popularDishes: '人気料理のデータがありません',
      createMenuFirst: 'メニューを作成して注文すると統計が表示されます',
      noDataGeneral: 'データがありません',
      noPaymentData: '支払いデータがありません',
      paymentDataWillShow: '注文があるとデータが表示されます',
      noMenuToday: '今日のメニューがありません',
      pleaseComeLater: '後でお越しください',
      addNewMenu: '新しいメニューを追加してください'
    },
    admin: {
      menuManagement: 'メニュー管理',
      allOrders: 'すべての注文',
      statistics: '統計',
      payments: '支払い',
      invoicing: '請求書発行',
      feedback: 'フィードバック',
      accountManagement: 'アカウント管理',
      ordersToday: '今日の注文',
      monthlyOrders: '月間注文',
      users: 'ユーザー',
      monthlyRevenue: '月間収益',
      popularDishes: '人気の料理',
      menuToday: '今日のメニュー',
      favoriteDishes: 'お気に入りの料理'
    },
    // Payment Dashboard
    paymentDashboard: {
      title: '食事スケジュール',
      totalMeals: '総食事数',
      paid: '支払済み',
      unpaid: '未払い',
      totalAmount: '合計金額',
      noData: '支払いデータがありません',
      // Calendar
      monthNames: ['1月', '2月', '3月', '4月', '5月', '6月',
                   '7月', '8月', '9月', '10月', '11月', '12月'],
      dayNames: ['日', '月', '火', '水', '木', '金', '土'],
      // Legend
      noOrder: '注文なし',
      oneMeal: '1食',
      twoMeals: '2食',
      threePlusMeals: '3食以上'
    },
    // Feedback Form
    feedbackForm: {
      title: 'フィードバック・コメント',
      subjectLabel: '件名（任意）',
      subjectPlaceholder: '例：料理の品質、サービスについて...',
      contentLabel: 'フィードバック内容 *',
      contentPlaceholder: '料理、サービス、改善したいことについてご意見をお聞かせください...',
      submitButton: 'フィードバック送信',
      clearButton: '内容をクリア',
      noFeedback: 'ユーザーフィードバックがここに表示されます'
    }
  }
};



const FallingPetals = ({ theme }: { theme: 'fusion' | 'corporate' }) => {
  const items = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `-${Math.random() * 15}s`,
    duration: `${8 + Math.random() * 12}s`,
    size: 8 + Math.random() * 12,
    rotation: Math.random() * 360,
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`absolute animate-fall ${
            theme === 'fusion' 
              ? (i % 2 === 0 ? 'text-pink-400/30' : 'text-white/40')
              : (i % 2 === 0 ? 'text-blue-400/20' : 'text-white/30')
          }`}
          style={{
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          <div 
            className="w-4 h-6 bg-current blur-[1px]" 
            style={{ 
              borderRadius: '100% 0 100% 0',
              transform: `rotate(${item.rotation}deg)`,
              width: item.size,
              height: item.size * 1.5
            }} 
          />
        </div>
      ))}
    </div>
  );
};

const FallingFood = ({ theme }: { theme: 'fusion' | 'corporate' }) => {
  const foodIcons = [Pizza, Soup, Fish, Coffee, IceCream, Utensils];
  const items = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    Icon: foodIcons[i % foodIcons.length],
    left: `${Math.random() * 100}%`,
    delay: `-${Math.random() * 20}s`,
    duration: `${10 + Math.random() * 15}s`,
    size: 20 + Math.random() * 20,
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`absolute animate-fall ${
            theme === 'fusion' 
              ? (i % 2 === 0 ? 'text-app-accent/45' : 'text-app-gold/45')
              : (i % 2 === 0 ? 'text-app-accent/45' : 'text-app-gold/45')
          }`}
          style={{
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          <item.Icon size={item.size} />
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
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
  const { orders, createOrder, updateOrder, deleteOrder, refetch: refetchOrders } = useOrders(currentLang);
  const { users } = useUsers();
  const { userPayments, paymentHistory, markAsPaid } = useAdminPayments();
  const { stats: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  const { feedbacks, updateFeedbackStatus, createFeedback } = useFeedback();
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [menuText, setMenuText] = useState('');
  const [multilingualMenus, setMultilingualMenus] = useState<Array<{vi: string, en: string, ja: string}>>([]);
  const [showMultilingualModal, setShowMultilingualModal] = useState(false);
  const [multilingualText, setMultilingualText] = useState('');
  const [selectedDishes, setSelectedDishes] = useState<number[]>([]);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Game state
  const [showFusionSliceGame, setShowFusionSliceGame] = useState(false);

  // Edit order state
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editDish1, setEditDish1] = useState<number>(0);
  const [editDish2, setEditDish2] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  const t = TRANSLATIONS[currentLang];

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

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

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
  }, [user]);

  const fetchAllUsers = async () => {
    try {
      const users = await usersAPI.getList();
      console.log('Fetched users:', users);
      setAllUsers(users);
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
    }
  };

  const handleSelectDish = (dishId: number) => {
    if (selectedDishes.includes(dishId)) {
      // Bỏ chọn món này
      setSelectedDishes(selectedDishes.filter(id => id !== dishId));
    } else if (selectedDishes.length < 2) {
      // Thêm món mới nếu chưa đủ 2 món
      setSelectedDishes([...selectedDishes, dishId]);
    } else {
      // Đã chọn đủ 2 món, thay thế món cuối cùng
      setSelectedDishes([selectedDishes[0], dishId]);
    }
  };

  const handleShowOrderSummary = () => {
    if (!user || selectedDishes.length === 0) return;
    setShowOrderSummary(true);
  };

  const handleConfirmOrder = async () => {
    if (!user || selectedDishes.length === 0) return;
    
    setIsPlacingOrder(true);
    
    // Tạo ghi chú từ các tùy chọn
    const options = [];
    if (extraRice) options.push(t.extraRice);
    if (extraSoup) options.push(t.extraSoup);
    if (chiliSauce) options.push(t.chiliSauce);
    if (fishSauce) options.push(t.fishSauce);
    if (chopsticks) options.push(t.chopsticks);
    if (lessRice) options.push(t.lessRice);
    
    const finalNotes = [...options, orderNotes.trim()].filter(Boolean).join(', ');
    
    try {
      await createOrder({
        dish1Id: selectedDishes[0],
        dish2Id: selectedDishes[1] || undefined,
        orderedFor: orderForUserId || user.id,
        notes: finalNotes,
        rating: undefined
      });
      
      // Refresh orders list to show the new order immediately
      await refetchOrders();
      
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

    if (!menu?.dishes || menu.dishes.length === 0) {
      alert('Không có menu để tham chiếu');
      return;
    }

    // Group orders by user and create export format
    const exportLines: string[] = [];
    let counter = 1;

    orders.forEach((order) => {
      const userName = order.receiver?.fullname || 'N/A';
      
      // Use sort_order from the order dishes, which represents the position in menu
      const dish1Position = order.dish1?.sort_order || 0;
      const dish2Position = order.dish2?.sort_order || 0;
      
      let dishText = '';
      if (dish2Position > 0) {
        dishText = `${dish1Position}+${dish2Position}`;
      } else if (dish1Position > 0) {
        dishText = `${dish1Position}`;
      } else {
        dishText = 'N/A';
      }

      let line = `${counter}.\t${userName} ${dishText}`;
      
      // Add notes if available
      if (order.notes && order.notes.trim()) {
        line += ` (${order.notes})`;
      }
      
      exportLines.push(line);
      counter++;
    });

    const exportText = exportLines.join('\n');
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
  if (authLoading || isLoading) {
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
    <div className={`flex flex-col lg:flex-row min-h-screen text-app-ink font-sans ${theme === 'corporate' ? 'corporate-theme' : ''} bg-app-bg`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-app-ink/10 p-4 flex items-center justify-between sticky top-0 z-50">
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

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
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
                        icon={<ChefHat size={18} />} 
                        label={t.admin.menuManagement} 
                        active={activeTab === 'admin-menu'} 
                        onClick={() => {
                          setActiveTab('admin-menu');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<ClipboardList size={18} />} 
                        label={t.admin.allOrders} 
                        active={activeTab === 'admin-orders'} 
                        onClick={() => {
                          setActiveTab('admin-orders');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<BarChart3 size={18} />} 
                        label={t.admin.statistics} 
                        active={activeTab === 'admin-stats'} 
                        onClick={() => {
                          setActiveTab('admin-stats');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<DollarSign size={18} />} 
                        label={t.admin.payments} 
                        active={activeTab === 'admin-payments'} 
                        onClick={() => {
                          setActiveTab('admin-payments');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<FileText size={18} />} 
                        label={t.admin.feedback} 
                        active={activeTab === 'admin-feedback'} 
                        onClick={() => {
                          setActiveTab('admin-feedback');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
                        }} 
                      />
                      <MobileSidebarItem 
                        icon={<UserIcon size={18} />} 
                        label={t.admin.accountManagement} 
                        active={activeTab === 'admin-users'} 
                        onClick={() => {
                          setActiveTab('admin-users');
                          setIsMobileMenuOpen(false);
                          refetchOrders();
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-app-ink/10 flex-col transition-all duration-300 relative silk-texture">
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
            <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>Mục lục</p>
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
              onClick={() => {
                setActiveTab('orders');
                // Refresh orders when switching to orders tab
                refetchOrders();
              }} 
            />
            <SidebarItem 
              icon={<Calendar size={20} />} 
              label={t.paymentCalendar} 
              active={activeTab === 'payment-calendar'} 
              onClick={() => setActiveTab('payment-calendar')} 
            />
            <SidebarItem 
              icon={<MessageSquare size={20} />} 
              label={t.admin.feedback} 
              active={activeTab === 'feedback'} 
              onClick={() => setActiveTab('feedback')} 
            />
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4 border-t border-[#E5E1D1]">
              <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${theme === 'corporate' ? 'text-[#00A693]/40' : 'text-[#DA251D]/40'}`}>Quản trị</p>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-app-ink/10 px-4 py-2 z-50">
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
          
          {user?.role !== 'admin' && (
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === 'menu' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
              }`}
            >
              <Utensils size={20} />
              <span className="text-xs font-medium">{t.menu}</span>
            </button>
          )}
          
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
          
          <button
            onClick={() => setActiveTab('payment-calendar')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'payment-calendar' ? 'text-app-accent bg-app-accent/5' : 'text-gray-500'
            }`}
          >
            <Calendar size={20} />
            <span className="text-xs font-medium">{t.paymentCalendar}</span>
          </button>
          
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
      <main className="flex-1 flex flex-col overflow-hidden relative pb-20 lg:pb-0">
        {/* Header - Hidden on mobile */}
        <header className="hidden lg:flex h-24 border-b border-app-ink/10 items-center justify-between px-10 shrink-0 bg-white/80 backdrop-blur-md z-20 silk-texture relative">
          {/* Theme transition overlay */}
          <AnimatePresence>
            {isThemeChanging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-app-ink/70">Đang chuyển theme...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4">
            <motion.h2 
              key={`${activeTab}-${currentLang}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-display font-bold tracking-tight capitalize brush-accent"
            >
              {activeTab === 'menu-mgmt' ? t.admin.menuManagement : activeTab}
            </motion.h2>
          </div>

          <div className="flex items-center gap-6">
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

            <div className="flex items-center gap-4 pl-6 border-l border-[#E5E1D1]">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-[#1C1917]">{user?.fullname}</p>
                <p className="text-[10px] text-app-accent/60 font-bold uppercase tracking-widest">{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-app-accent/10 shadow-sm bg-app-accent flex items-center justify-center text-white font-bold">
                {user?.fullname?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#FDFCF8] relative">
          {/* Tab transition overlay */}
          <AnimatePresence>
            {isLanguageChanging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-40"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                  <p className="text-app-ink/70 font-medium">Đang chuyển ngôn ngữ...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && user?.role === 'user' && (
              <motion.div
                key="dashboard-user"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Chart Section */}
                  <div className="lg:col-span-2 lacquer-card p-4 lg:p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-display font-bold tracking-tight">{t.weeklyActivity}</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${theme === 'corporate' ? 'bg-[#00A693]' : 'bg-[#DA251D]'}`} />
                        <span className="text-xs text-[#1C1917]/40 font-bold uppercase tracking-widest">Suất cơm</span>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D1" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#1C1917', fontSize: 12, fontWeight: 700 }} 
                          />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: '#F5F2E9' }}
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #DA251D20', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="orders" radius={[10, 10, 10, 10]}>
                            {weeklyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 3 ? (theme === 'corporate' ? '#00A693' : '#DA251D') : (theme === 'corporate' ? '#00A69330' : '#DA251D30')} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Payment QR Section */}
                  <div className={`rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden ${theme === 'corporate' ? 'bg-gradient-to-br from-[#00A693] to-[#00BFA5] shadow-[#00A693]/20' : 'crimson-gradient shadow-[#DA251D]/20'}`}>
                    <div className="absolute top-0 left-0 w-full h-full lotus-pattern opacity-20" />
                    <div className="absolute bottom-0 right-0 w-full h-1/2 seigaiha-pattern opacity-5" />
                    <div className="bg-white p-6 rounded-3xl mb-6 shadow-2xl relative z-10 silk-texture">
                      <img 
                        src="QR.png" 
                        alt="Payment QR Code" 
                        className="w-48 h-48 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "qr-simple.svg";
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 relative z-10">{t.paymentQR}</h3>
                    <p className="text-white/80 text-sm mb-4 relative z-10">{t.scanToPay}</p>
                    
                    {/* Payment Info */}
                    <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/30 relative z-10 mb-4">
                      <div className="text-white text-sm space-y-1">
                        <div className="font-bold">NGUYEN DAC KHAI</div>
                        <div className="font-mono">189284047</div>
                        <div className="font-semibold">VPBank - VIETOR</div>
                        <div className="text-xs opacity-80">NAPAS 247</div>
                      </div>
                    </div>
                    

                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && user?.role === 'admin' && (
              <motion.div
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
                    <div className="flex items-center gap-3 mb-8">
                      <Utensils className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} size={24} />
                      <h3 className="text-xl font-display font-bold tracking-tight">{t.admin.menuToday}</h3>
                    </div>
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                        {isLanguageChanging ? (
                          <motion.div
                            key="admin-menu-loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center py-8"
                          >
                            <div className="w-8 h-8 border-2 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                          </motion.div>
                        ) : (
                          menu?.dishes?.map((dish, idx) => (
                            <motion.div 
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
                                <motion.p 
                                  key={`${dish.id}-admin-name-${currentLang}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: idx * 0.05 + 0.1 }}
                                  className="font-bold text-sm"
                                >
                                  {dish.name}
                                </motion.p>
                              </div>
                              <ChevronRight size={16} className="text-[#2D241E]/20" />
                            </motion.div>
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
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Promotional Banner */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-[2.5rem] crimson-gradient p-8 md:p-12 shadow-2xl shadow-[#DA251D]/20"
                >
                  <div className="absolute top-0 left-0 w-full h-full lotus-pattern opacity-30" />
                  <div className="absolute bottom-0 right-10 w-48 h-32 fuji-pattern opacity-60" />
                  <div className="absolute -top-10 -left-10 w-64 h-64 dongson-pattern opacity-20" />
                  <div className="absolute bottom-0 right-0 w-full h-1/2 seigaiha-pattern opacity-10" />
                  <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-white/10 blur-[80px] rounded-full animate-zen-float" />
                  
                  <div className="relative z-10 w-full">
                    {/* Game Integration - Fusion Slice */}
                    <div className="w-full h-[250px] bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                      {/* Game Header */}
                      <div className="relative p-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                              <Sword size={20} className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white tracking-tight">
                                FUSION SLICE
                              </h3>
                              <p className="text-xs text-white/60 font-bold tracking-widest uppercase">
                                Viet-Nippon Blade Game
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <Zap size={14} className="text-yellow-400" />
                            <span className="text-white font-bold text-xs">Mini Game</span>
                          </div>
                        </div>
                      </div>

                      {/* Game Preview/Demo Area */}
                      <div className="relative h-[180px] bg-gradient-to-br from-indigo-800 via-purple-800 to-rose-800 flex items-center justify-center overflow-hidden">
                        {/* Background Decor */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                          <div className="absolute top-1/4 left-1/4 text-4xl animate-bounce">🥖</div>
                          <div className="absolute bottom-1/4 right-1/4 text-4xl animate-bounce" style={{animationDelay: '0.5s'}}>🍣</div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-5 rotate-12">🍜</div>
                        </div>

                        {/* Game Preview Content */}
                        <div className="relative z-10 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-4"
                          >
                            <p className="text-white/80 text-sm max-w-md mx-auto leading-relaxed">
                              Thử thách kỹ năng blade master của bạn!
                            </p>
                          </motion.div>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowFusionSliceGame(true)}
                            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-2xl font-black text-base uppercase tracking-wider hover:shadow-2xl transition-all flex items-center gap-2 mx-auto"
                          >
                            <Play size={20} fill="currentColor" />
                            Chơi ngay
                            <Flame size={18} className="animate-pulse" />
                          </motion.button>
                        </div>

                        {/* Animated Slice Effect */}
                        <motion.div
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute inset-0 pointer-events-none"
                        >
                          <svg className="w-full h-full">
                            <motion.path
                              d="M 50 250 Q 200 100 350 200"
                              stroke="rgba(255,255,255,0.6)"
                              strokeWidth="4"
                              fill="none"
                              strokeLinecap="round"
                              filter="drop-shadow(0 0 10px rgba(96,165,250,0.8))"
                            />
                          </svg>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Menu List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-32 lg:pb-64">
                  <AnimatePresence mode="wait">
                    {isLanguageChanging ? (
                      <motion.div
                        key="language-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full flex items-center justify-center py-20"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-app-accent/20 border-t-app-accent rounded-full animate-spin" />
                          <p className="text-app-ink/60 font-medium">Đang chuyển ngôn ngữ...</p>
                        </div>
                      </motion.div>
                    ) : (
                      menu?.dishes?.map((dish, index) => (
                        <motion.div 
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
                          className={`lacquer-card p-6 flex flex-col cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                            selectedDishes.includes(dish.id) 
                              ? 'border-[#DA251D] ring-2 ring-[#DA251D]/20 bg-[#DA251D]/5' 
                              : selectedDishes.length >= 2 
                                ? 'opacity-50 border-gray-200' 
                                : 'hover:border-[#DA251D]/40 hover:shadow-lg'
                          }`}
                          onClick={() => handleSelectDish(dish.id)}
                        >
                          {selectedDishes.includes(dish.id) && (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute top-4 right-4 z-10"
                            >
                              <div className="bg-[#DA251D] text-white p-1 rounded-full shadow-lg">
                                <CheckCircle2 size={16} />
                              </div>
                            </motion.div>
                          )}
                          
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <motion.h4 
                                key={`${dish.id}-name-${currentLang}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 + 0.1 }}
                                className={`text-lg font-display font-bold transition-colors duration-300 ${
                                  selectedDishes.includes(dish.id) 
                                    ? 'text-[#DA251D]' 
                                    : selectedDishes.length >= 2 
                                      ? 'text-gray-400' 
                                      : 'text-[#1C1917] group-hover:text-[#DA251D]'
                                }`}
                              >
                                {dish.name}
                              </motion.h4>
                            </div>
                            
                            {/* Selection indicator */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {selectedDishes.includes(dish.id) && (
                                  <motion.span 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-xs bg-[#DA251D] text-white px-2 py-1 rounded-full font-bold"
                                  >
                                    Món {selectedDishes.indexOf(dish.id) + 1}
                                  </motion.span>
                                )}
                              </div>
                              
                              {!selectedDishes.includes(dish.id) && selectedDishes.length < 2 && (
                                <motion.div 
                                  whileHover={{ scale: 1.1 }}
                                  className="w-6 h-6 border-2 border-[#DA251D]/30 rounded-full group-hover:border-[#DA251D] transition-colors"
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                  
                  {(!menu?.dishes || menu.dishes.length === 0) && (
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
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-4 border-[#DA251D] shadow-2xl"
                  >
                    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
                      {/* Mobile: Compact View */}
                      <div className="lg:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                            <ShoppingBag size={18} className={theme === 'corporate' ? 'text-[#00A693]' : 'text-[#DA251D]'} />
                            {t.selectedDishes} ({selectedDishes.length}/2)
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#DA251D]">40,000đ</span>
                            <button 
                              onClick={() => setSelectedDishes([])}
                              className="text-sm text-red-500 hover:text-red-700 font-medium"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Compact dish list */}
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                          {selectedDishes.map((dishId, index) => {
                            const dish = menu?.dishes?.find(d => d.id === dishId);
                            return (
                              <div key={dishId} className="flex items-center gap-2 bg-[#FDF4E3] rounded-lg px-3 py-2 border border-[#F5E6D3] flex-shrink-0">
                                <div className="w-6 h-6 bg-[#DA251D] text-white rounded-full flex items-center justify-center font-bold text-xs">
                                  {index + 1}
                                </div>
                                <span className="font-medium text-[#1C1917] text-sm whitespace-nowrap">{dish?.name}</span>
                                <button 
                                  onClick={() => setSelectedDishes(prev => prev.filter(id => id !== dishId))}
                                  className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Mobile: Order for selection */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-[#1C1917] mb-1">Đặt món cho:</label>
                          <select
                            value={orderForUserId || user?.id || ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : null;
                              console.log('Selected user ID:', value);
                              setOrderForUserId(value);
                            }}
                            className="w-full px-3 py-2 border-2 border-[#E5E1D1] rounded-lg focus:outline-none focus:border-[#DA251D] bg-white text-[#1C1917] font-medium text-sm"
                          >
                            <option value={user?.id || ''}>{user?.fullname} (Bản thân)</option>
                            {allUsers.length > 0 ? (
                              allUsers.filter(u => u.id !== user?.id).map(u => (
                                <option key={u.id} value={u.id}>{u.fullname}</option>
                              ))
                            ) : (
                              <option disabled>Đang tải danh sách...</option>
                            )}
                          </select>
                        </div>
                        
                        {/* Mobile action button */}
                        <button 
                          onClick={handleShowOrderSummary}
                          className={`w-full text-white py-3 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                            theme === 'corporate' 
                              ? 'bg-[#00A693] hover:bg-[#00A693]/90' 
                              : 'bg-[#DA251D] hover:bg-[#DA251D]/90'
                          }`}
                        >
                          <CheckCircle2 size={20} />
                          {t.orderNow}
                        </button>
                      </div>

                      {/* Desktop: Full View */}
                      <div className="hidden lg:block">
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
                                  <div key={dishId} className="flex items-center justify-between bg-[#FDF4E3] rounded-xl px-4 py-3 border border-[#F5E6D3]">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-[#DA251D] text-white rounded-full flex items-center justify-center font-bold text-sm">
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
                            <div className="mt-3 p-3 bg-[#DA251D]/10 rounded-xl">
                              <p className="text-sm text-[#1C1917] font-semibold">Tổng tiền: <span className="text-[#DA251D] text-lg">40,000đ</span></p>
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
                              <select
                                value={orderForUserId || user?.id || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? Number(e.target.value) : null;
                                  console.log('Selected user ID:', value);
                                  setOrderForUserId(value);
                                }}
                                className="w-full px-4 py-2 border-2 border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] bg-white text-[#1C1917] font-medium"
                              >
                                <option value={user?.id || ''}>{user?.fullname} {t.myself}</option>
                                {allUsers.length > 0 ? (
                                  allUsers.filter(u => u.id !== user?.id).map(u => (
                                    <option key={u.id} value={u.id}>{u.fullname}</option>
                                  ))
                                ) : (
                                  <option disabled>Đang tải danh sách...</option>
                                )}
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
                                <label key={option.key} className="flex items-center gap-2 cursor-pointer p-2 bg-[#F5F2E9] rounded-lg hover:bg-[#FDF4E3] transition-colors">
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
                              className="w-full px-4 py-3 border-2 border-[#E5E1D1] rounded-xl focus:outline-none focus:border-[#DA251D] resize-none mb-4 text-[#1C1917]"
                              rows={3}
                            />
                            
                            {/* Order Button */}
                            <button 
                              onClick={handlePlaceOrder}
                              className={`w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                                theme === 'corporate' 
                                  ? 'bg-[#00A693] hover:bg-[#00A693]/90' 
                                  : 'bg-[#DA251D] hover:bg-[#DA251D]/90'
                              }`}
                            >
                              <CheckCircle2 size={24} />
                              {t.orderNow}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="lacquer-card p-4 lg:p-10 lotus-pattern">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-display font-bold tracking-tight">{user?.role === 'admin' ? t.admin.allOrders : t.orderHistory}</h3>
                    <div className="flex gap-2">
                      {user?.role === 'admin' && (
                        <button 
                          onClick={handleExportMenu}
                          className="px-4 py-2 bg-[#4ADE80] text-white rounded-xl font-bold text-sm hover:bg-[#4ADE80]/90 transition-colors flex items-center gap-2"
                        >
                          <FileText size={16} />
                          {t.exportMenu}
                        </button>
                      )}
                      <button className="p-3 bg-[#F5F2E9] rounded-xl border border-[#E5E1D1] text-[#1C1917]/40 hover:text-[#DA251D] transition-colors">
                        <Filter size={20} />
                      </button>
                      <button className="p-3 bg-[#F5F2E9] rounded-xl border border-[#E5E1D1] text-[#1C1917]/40 hover:text-[#DA251D] transition-colors">
                        <Search size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {orders.map((order) => (
                      <motion.div 
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
                                {order.date ? new Date(order.date + 'T00:00:00').toLocaleDateString('vi-VN') : 'N/A'}
                              </p>
                            </div>
                            
                            {/* Người ăn */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.person}</p>
                              <p className="text-sm font-bold text-[#1C1917] truncate">{order.receiver?.fullname || 'N/A'}</p>
                            </div>
                            
                            {/* Món 1 */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.dish1}</p>
                              <p className="text-sm font-bold text-[#1C1917] line-clamp-2">{order.dish1?.name || 'N/A'}</p>
                            </div>
                            
                            {/* Món 2 */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.dish2}</p>
                              <p className="text-sm font-bold text-[#1C1917] line-clamp-2">{order.dish2?.name || t.noSecondDish}</p>
                            </div>
                            
                            {/* Ghi chú */}
                            <div className="text-center md:text-left">
                              <p className="text-[10px] font-bold text-[#1C1917]/30 uppercase tracking-widest mb-1">{t.orderNotes}</p>
                              <p className="text-sm text-[#1C1917]/80 line-clamp-2">{order.notes || t.noNotes}</p>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center justify-center md:justify-end gap-2">
                              {/* Edit button - for order owner or admin */}
                              {(user?.role === 'admin' || order.user_id === user?.id || order.ordered_by === user?.id) && (
                                <motion.button 
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
                                </motion.button>
                              )}
                              
                              {/* Delete button - admin only */}
                              {user?.role === 'admin' && (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={async () => {
                                    if (confirm(`${t.confirmDeleteOrder} ${order.receiver?.fullname || 'N/A'}?\n\n${t.dish1}: ${order.dish1?.name || 'N/A'}\n${t.dish2}: ${order.dish2?.name || t.noSecondDish}`)) {
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
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {orders.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <div className="text-gray-400 mb-4">
                          <ClipboardList size={48} className="mx-auto" />
                        </div>
                        <p className="text-gray-500 text-lg font-medium">Chưa có đơn hàng nào</p>
                        <p className="text-gray-400 text-sm">Hãy đặt món đầu tiên của bạn</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'menu-mgmt' && (
              <motion.div
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
                        <motion.div
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
                        </motion.div>
                      ) : (
                        menu?.dishes?.map((dish, index) => (
                          <motion.div 
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
                              <motion.p 
                                key={`${dish.id}-mgmt-name-${currentLang}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08 + 0.2 }}
                                className="font-bold text-lg mb-1"
                              >
                                {dish.name}
                              </motion.p>
                              <div className="flex items-center justify-between">
                                <div className="flex gap-2">
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
                          </motion.div>
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

                {/* Admin Order Section */}
                {menu && menu.dishes && menu.dishes.length > 0 && (
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-4 lg:p-10 shadow-sm">
                    <h3 className="text-2xl font-display font-bold tracking-tight mb-6">🍽️ Đặt cơm cho bản thân</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {menu.dishes.map((dish, index) => (
                        <motion.div
                          key={`admin-order-${dish.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gradient-to-br from-[#F5E6D3] to-[#E5D5C8] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                          onClick={() => {
                            // Set selected dishes for admin order
                            setSelectedDish1(dish.id);
                            setSelectedCustomer(user?.id || 0);
                            setShowOrderModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-lg text-[#1C1917] mb-2">{dish.name}</h4>
                              <p className="text-sm text-[#1C1917]/60">Click để đặt món này</p>
                            </div>
                            <div className="w-12 h-12 bg-[#DA251D] rounded-full flex items-center justify-center">
                              <Utensils className="text-white" size={20} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Statistics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    icon={<Utensils className="text-[#DA251D]" />} 
                    label={t.admin.ordersToday} 
                    value={statsData?.todayOrders?.toString() || "0"} 
                    unit={t.units.orders} 
                  />
                  <StatCard 
                    icon={<BarChart3 className="text-[#4ADE80]" />} 
                    label={t.admin.monthlyOrders} 
                    value={statsData?.monthOrders?.toString() || "0"} 
                    unit={t.units.orders} 
                  />
                  <StatCard 
                    icon={<UserIcon className="text-[#3B82F6]" />} 
                    label={t.admin.users} 
                    value={statsData?.uniqueUsers?.toString() || "0"} 
                    unit={t.units.people} 
                  />
                  <StatCard 
                    icon={<DollarSign className="text-[#F59E0B]" />} 
                    label={t.admin.monthlyRevenue} 
                    value={statsData?.monthRevenue?.toLocaleString() || "0"} 
                    unit="đ" 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Weekly Orders Chart */}
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-display font-bold tracking-tight mb-6">Đơn hàng theo tuần</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D1" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#1C1917', fontSize: 12, fontWeight: 700 }} 
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1C1917', fontSize: 12, fontWeight: 700 }} />
                          <Tooltip 
                            cursor={{ fill: '#F5F2E9' }}
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #DA251D20', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="orders" fill="#DA251D" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Dishes */}
                  <div className="bg-white border border-[#F5E6D3] rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-display font-bold tracking-tight mb-6">Món ăn phổ biến</h3>
                    <div className="space-y-4">
                      {statsData?.topDishes?.map((dish, index) => (
                        <div key={dish.name} className="flex items-center justify-between p-4 bg-[#FDF4E3]/50 rounded-2xl border border-[#F5E6D3]">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                              index === 0 ? 'bg-[#DA251D] text-white' : 'bg-[#FDF4E3] text-[#2D241E]/40'
                            }`}>
                              {index + 1}
                            </div>
                            <p className="font-bold text-sm">{dish.name}</p>
                          </div>
                          <span className="text-sm font-black text-[#DA251D]">{dish.orderCount}</span>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t.noData.noDataGeneral}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* User Payments */}
                <div className="lacquer-card p-4 lg:p-10">
                  <h3 className="text-2xl font-display font-bold tracking-tight mb-8">{t.admin.payments}</h3>
                  
                  {userPayments.length > 0 ? (
                    <div className="space-y-4">
                      {userPayments.map((payment) => (
                        <div key={payment.userId} className="flex items-center justify-between p-6 bg-[#F5F2E9]/30 rounded-2xl border border-[#E5E1D1]">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#DA251D]">
                              <UserIcon size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-[#1C1917]">{payment.fullname}</p>
                              <p className="text-xs text-[#1C1917]/40 font-bold uppercase tracking-widest">
                                {payment.ordersCount} suất cơm
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-black text-[#DA251D]">{payment.remainingTotal.toLocaleString()}đ</p>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                payment.remainingTotal === 0 ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {payment.remainingTotal === 0 ? 'Đã thanh toán' : 'Chưa thanh toán'}
                              </span>
                            </div>
                            {payment.remainingTotal > 0 && (
                              <button
                                onClick={() => markAsPaid(payment.userId, payment.remainingTotal)}
                                className="bg-[#DA251D] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#DA251D]/90 transition-colors"
                              >
                                Thanh toán
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
                  <h3 className="text-xl font-display font-bold tracking-tight mb-6">Lịch sử thanh toán</h3>
                  
                  {paymentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {paymentHistory.map((history) => (
                        <div key={history.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#E5E1D1]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#1C1917]">{history.fullname}</p>
                              <p className="text-xs text-[#1C1917]/60">
                                {new Date(history.paid_at).toLocaleDateString('vi-VN')} lúc {new Date(history.paid_at).toLocaleTimeString('vi-VN')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600">{history.amount.toLocaleString()}đ</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Chưa có lịch sử thanh toán</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'invoicing' && (
              <motion.div
                key="invoicing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <PaymentDashboard translations={t} />
              </motion.div>
            )}

            {activeTab === 'payment-calendar' && (
              <motion.div
                key="payment-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <PaymentDashboard translations={t} />
              </motion.div>
            )}

            {activeTab === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {user?.role === 'admin' ? (
                  // Admin view - Xem tất cả góp ý
                  <div className="lacquer-card p-4 lg:p-10">
                    <h3 className="text-2xl font-display font-bold tracking-tight mb-8">{t.admin.feedback}</h3>
                    
                    {feedbacks.length > 0 ? (
                      <div className="space-y-6">
                        {feedbacks.map((feedback) => (
                          <div key={feedback.id} className="p-6 bg-[#F5F2E9]/30 rounded-2xl border border-[#E5E1D1]">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <p className="font-bold text-[#1C1917]">{feedback.fullname}</p>
                                <p className="text-xs text-[#1C1917]/40 font-bold uppercase tracking-widest">
                                  {new Date(feedback.created_at).toLocaleDateString('vi-VN')} lúc {new Date(feedback.created_at).toLocaleTimeString('vi-VN')}
                                </p>
                                {feedback.subject && (
                                  <p className="text-sm font-semibold text-[#1C1917] mt-1">Chủ đề: {feedback.subject}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={feedback.status}
                                  onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 bg-white"
                                >
                                  <option value="pending">Chờ xử lý</option>
                                  <option value="reviewed">Đã xem</option>
                                  <option value="resolved">Đã giải quyết</option>
                                </select>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                  feedback.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                                  feedback.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {feedback.status === 'resolved' ? 'Đã giải quyết' :
                                   feedback.status === 'reviewed' ? 'Đã xem' : 'Chờ xử lý'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-[#1C1917]/60 italic">"{feedback.message}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <MessageSquare size={48} className="mx-auto" />
                        </div>
                        <p className="text-gray-500 text-lg font-medium">Chưa có góp ý nào</p>
                        <p className="text-gray-400 text-sm">{t.feedbackForm.noFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // User view - Gửi góp ý
                  <div className="lacquer-card p-4 lg:p-10">
                    <h3 className="text-2xl font-display font-bold tracking-tight mb-8">{t.feedbackForm.title}</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1917] mb-2">
                          {t.feedbackForm.subjectLabel}
                        </label>
                        <input
                          type="text"
                          value={feedbackSubject}
                          onChange={(e) => setFeedbackSubject(e.target.value)}
                          placeholder={t.feedbackForm.subjectPlaceholder}
                          className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA251D]/20 focus:border-[#DA251D]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#1C1917] mb-2">
                          {t.feedbackForm.contentLabel}
                        </label>
                        <textarea
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                          placeholder={t.feedbackForm.contentPlaceholder}
                          rows={6}
                          className="w-full px-4 py-3 border border-[#E5E1D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA251D]/20 focus:border-[#DA251D] resize-none"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitFeedback}
                          disabled={!feedbackMessage.trim()}
                          className="bg-[#DA251D] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#DA251D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t.feedbackForm.submitButton}
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackSubject('');
                            setFeedbackMessage('');
                          }}
                          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                          {t.feedbackForm.clearButton}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'accounts' && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="lacquer-card p-4 lg:p-10">
                  <h3 className="text-2xl font-display font-bold tracking-tight mb-8">{t.admin.accountManagement}</h3>
                  
                  {users.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#E5E1D1]">
                            <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">Họ tên</th>
                            <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">Tên đăng nhập</th>
                            <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">Vai trò</th>
                            <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b border-[#E5E1D1]/50 last:border-0">
                              <td className="py-4 font-bold text-sm text-[#1C1917]">{user.fullname}</td>
                              <td className="py-4 text-sm text-[#1C1917]/60">{user.username}</td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${user.role === 'admin' ? 'bg-[#DA251D]/10 text-[#DA251D]' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-4">
                                <button className="text-[#DA251D] text-xs font-bold hover:underline">Chỉnh sửa</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <UserIcon size={48} className="mx-auto" />
                      </div>
                      <p className="text-gray-500 text-lg font-medium">Chưa có người dùng nào</p>
                      <p className="text-gray-400 text-sm">Danh sách người dùng sẽ hiển thị ở đây</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div 
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Menu Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <motion.div 
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMenuModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMenuModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <motion.div 
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multilingual Menu Modal */}
      <AnimatePresence>
        {showMultilingualModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMultilingualModal(false)}
              className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-sm"
            />
            <motion.div 
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Summary Modal */}
      <AnimatePresence>
        {showOrderSummary && (
          <motion.div
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
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fusion Slice Game */}
      <AnimatePresence>
        {showFusionSliceGame && (
          <FusionSliceGame onClose={() => setShowFusionSliceGame(false)} />
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {showEditOrderModal && editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditOrderModal(false)}
          >
            <motion.div
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
                    {editingOrder.dish1?.name} {editingOrder.dish2?.name ? `+ ${editingOrder.dish2.name}` : ''}
                  </p>
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
                        {dish.name}
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
                        {dish.name}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <motion.button 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-ink/40 hover:text-app-accent hover:bg-app-accent/5'}`}
    >
      {active && <div className="absolute inset-0 silk-texture opacity-10" />}
      <motion.div 
        className={`${active ? 'text-white' : 'group-hover:text-app-accent'} transition-colors duration-300 relative z-10`}
        whileHover={{ rotate: active ? 0 : 5 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>
      <motion.span 
        key={label}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden md:block font-bold text-xs uppercase tracking-widest relative z-10"
      >
        {label}
      </motion.span>
      {active && (
        <motion.div 
          layoutId="active-pill" 
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full relative z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

function MobileSidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <motion.button 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-ink/40 hover:text-app-accent hover:bg-app-accent/5'}`}
    >
      {active && <div className="absolute inset-0 silk-texture opacity-10" />}
      <motion.div 
        className={`${active ? 'text-white' : 'group-hover:text-app-accent'} transition-colors duration-300 relative z-10`}
        whileHover={{ rotate: active ? 0 : 5 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>
      <motion.span 
        key={label}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="block font-bold text-xs uppercase tracking-widest relative z-10"
      >
        {label}
      </motion.span>
      {active && (
        <motion.div 
          layoutId="mobile-active-pill" 
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full relative z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
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

