import React, { useState, useEffect } from 'react';

import { ChefHat, ChevronRight, Eye, EyeOff, Globe, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

interface LoginProps {
  theme: 'fusion' | 'corporate';
  currentLang: 'vi' | 'en' | 'ja';
  setTheme: (theme: 'fusion' | 'corporate') => void;
  setCurrentLang: (lang: 'vi' | 'en' | 'ja') => void;
}

const FallingPetals = ({ theme }: { theme: 'fusion' | 'corporate' }) => {
  const items = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `-${Math.random() * 15}s`,
    duration: `${8 + Math.random() * 12}s`,
    size: 8 + Math.random() * 12,
    rotation: Math.random() * 360,
  }));

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

type ViewMode = 'login' | 'register' | 'forgot-password';

const translations = {
  vi: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    forgotPassword: 'Quên mật khẩu',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    fullname: 'Họ và tên',
    confirmPassword: 'Xác nhận mật khẩu',
    loginButton: 'Đăng nhập',
    registerButton: 'Tạo tài khoản',
    resetButton: 'Đặt lại mật khẩu',
    backToLogin: 'Quay lại đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    haveAccount: 'Đã có tài khoản?',
    registerNow: 'Đăng ký ngay',
    loginNow: 'Đăng nhập ngay',
    enterUsername: 'Nhập tên đăng nhập',
    enterPassword: 'Nhập mật khẩu',
    enterFullname: 'Nhập họ và tên',
    enterNewPassword: 'Nhập mật khẩu mới',
    resetPasswordDesc: 'Nhập tên đăng nhập và mật khẩu mới của bạn'
  },
  en: {
    login: 'Login',
    register: 'Register',
    forgotPassword: 'Forgot Password',
    username: 'Username',
    password: 'Password',
    fullname: 'Full Name',
    confirmPassword: 'Confirm Password',
    loginButton: 'Sign In',
    registerButton: 'Create Account',
    resetButton: 'Reset Password',
    backToLogin: 'Back to Login',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    registerNow: 'Register now',
    loginNow: 'Login now',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    enterFullname: 'Enter full name',
    enterNewPassword: 'Enter new password',
    resetPasswordDesc: 'Enter your username and new password'
  },
  ja: {
    login: 'ログイン',
    register: '登録',
    forgotPassword: 'パスワードを忘れた',
    username: 'ユーザー名',
    password: 'パスワード',
    fullname: '氏名',
    confirmPassword: 'パスワード確認',
    loginButton: 'ログイン',
    registerButton: 'アカウント作成',
    resetButton: 'パスワードリセット',
    backToLogin: 'ログインに戻る',
    noAccount: 'アカウントをお持ちでない？',
    haveAccount: 'アカウントをお持ちですか？',
    registerNow: '今すぐ登録',
    loginNow: '今すぐログイン',
    enterUsername: 'ユーザー名を入力',
    enterPassword: 'パスワードを入力',
    enterFullname: '氏名を入力',
    enterNewPassword: '新しいパスワードを入力',
    resetPasswordDesc: 'ユーザー名と新しいパスワードを入力してください'
  }
};

export const Login: React.FC<LoginProps> = ({ theme, currentLang, setTheme, setCurrentLang }) => {
  const { login, register: registerUser } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Generate random form ID to prevent browser autofill
  const [formId] = useState(() => Math.random().toString(36).substring(7));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = translations[currentLang];

  // Reset form when view mode changes
  useEffect(() => {
    setUsername('');
    setPassword('');
    setFullname('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  }, [viewMode]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullname('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(currentLang === 'vi' ? 'Vui lòng nhập đầy đủ thông tin' : 
              currentLang === 'en' ? 'Please fill in all fields' : 
              'すべてのフィールドを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 
              currentLang === 'vi' ? 'Đăng nhập thất bại' :
              currentLang === 'en' ? 'Login failed' :
              'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullname) {
      setError(currentLang === 'vi' ? 'Vui lòng nhập đầy đủ thông tin' :
              currentLang === 'en' ? 'Please fill in all fields' :
              'すべてのフィールドを入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError(currentLang === 'vi' ? 'Mật khẩu xác nhận không khớp' :
              currentLang === 'en' ? 'Passwords do not match' :
              'パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError(currentLang === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự' :
              currentLang === 'en' ? 'Password must be at least 6 characters' :
              'パスワードは6文字以上である必要があります');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await registerUser(username, password, fullname);
      setSuccess(currentLang === 'vi' ? 'Đăng ký thành công! Vui lòng đăng nhập.' :
                currentLang === 'en' ? 'Registration successful! Please login.' :
                '登録成功！ログインしてください。');
      
      // Chuyển về trang đăng nhập sau 2 giây
      setTimeout(() => {
        setViewMode('login');
        setPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message :
              currentLang === 'vi' ? 'Đăng ký thất bại' :
              currentLang === 'en' ? 'Registration failed' :
              '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(currentLang === 'vi' ? 'Vui lòng nhập tên đăng nhập và mật khẩu mới' :
              currentLang === 'en' ? 'Please enter username and new password' :
              'ユーザー名と新しいパスワードを入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError(currentLang === 'vi' ? 'Mật khẩu xác nhận không khớp' :
              currentLang === 'en' ? 'Passwords do not match' :
              'パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await authAPI.resetPassword(username, password);

      setSuccess(currentLang === 'vi' ? 'Đặt lại mật khẩu thành công!' :
                currentLang === 'en' ? 'Password reset successful!' :
                'パスワードリセット成功！');
      setTimeout(() => {
        setViewMode('login');
        setPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message :
              currentLang === 'vi' ? 'Đặt lại mật khẩu thất bại' :
              currentLang === 'en' ? 'Password reset failed' :
              'パスワードリセットに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-app-bg text-app-ink flex items-center justify-center p-4 relative overflow-hidden ${theme === 'corporate' ? 'corporate-theme' : ''}`}>
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none flex">
        <div className="w-1/2 h-full lotus-pattern border-r border-app-accent/10" />
        <div className="w-1/2 h-full seigaiha-pattern" />
      </div>

      <FallingPetals theme={theme} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[50vh] fuji-pattern opacity-80 pointer-events-none" />
      {theme === 'corporate' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#00A693]/5 to-transparent pointer-events-none" />
      )}

      {/* Red/Blue Sun and Soft Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-app-accent blur-[120px] rounded-full opacity-10 animate-zen-float" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] aspect-square bg-app-gold blur-[120px] rounded-full opacity-5" />

      <div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-2xl p-6 lg:p-8 rounded-[2.5rem] shadow-2xl border border-app-accent/5 silk-texture relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-app-accent via-app-gold to-app-accent" />
          
          {/* Mobile-friendly Theme and Language Controls */}
          <div className="flex items-center justify-between mb-6">
            {/* Theme Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowThemeMenu(!showThemeMenu);
                  setShowLangMenu(false);
                }}
                className="flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-app-accent/20 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Palette size={16} className="text-app-accent" />
                <span className="text-xs font-bold text-app-ink hidden sm:inline">
                  {theme === 'fusion' ? '🎨 Fusion' : '💼 Corp'}
                </span>
              </button>
              
              <AnimatePresence>
                {showThemeMenu && (
                  <div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-app-accent/20 overflow-hidden min-w-[140px] z-[100]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('fusion');
                        setShowThemeMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors flex items-center gap-2 ${
                        theme === 'fusion'
                          ? 'bg-app-accent text-white'
                          : 'text-app-ink hover:bg-app-cream'
                      }`}
                    >
                      🎨 <span>Fusion</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('corporate');
                        setShowThemeMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors flex items-center gap-2 ${
                        theme === 'corporate'
                          ? 'bg-app-accent text-white'
                          : 'text-app-ink hover:bg-app-cream'
                      }`}
                    >
                      💼 <span>Corporate</span>
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowThemeMenu(false);
                }}
                className="flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-app-accent/20 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Globe size={16} className="text-app-accent" />
                <span className="text-xs font-bold text-app-ink">
                  {currentLang === 'vi' ? '🇻🇳' : currentLang === 'en' ? '🇬🇧' : '🇯🇵'}
                  <span className="hidden sm:inline ml-1">
                    {currentLang === 'vi' ? 'VI' : currentLang === 'en' ? 'EN' : 'JA'}
                  </span>
                </span>
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-app-accent/20 overflow-hidden min-w-[140px] z-[100]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('vi');
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors flex items-center gap-2 ${
                        currentLang === 'vi'
                          ? 'bg-app-accent text-white'
                          : 'text-app-ink hover:bg-app-cream'
                      }`}
                    >
                      🇻🇳 <span>Tiếng Việt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('en');
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors flex items-center gap-2 ${
                        currentLang === 'en'
                          ? 'bg-app-accent text-white'
                          : 'text-app-ink hover:bg-app-cream'
                      }`}
                    >
                      🇬🇧 <span>English</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('ja');
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors flex items-center gap-2 ${
                        currentLang === 'ja'
                          ? 'bg-app-accent text-white'
                          : 'text-app-ink hover:bg-app-cream'
                      }`}
                    >
                      🇯🇵 <span>日本語</span>
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex flex-col items-center mb-8">
            {/* Modern Logo Design */}
            <div className="relative mb-6">
              {/* Main Circle with Gradient */}
              <div className={`w-28 h-28 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden ${
                theme === 'corporate' 
                  ? 'bg-gradient-to-br from-[#00A693] via-[#00BFA5] to-[#00897B] shadow-[#00A693]/40' 
                  : 'bg-gradient-to-br from-app-accent via-red-500 to-red-700 shadow-app-accent/40'
              }`}>
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-full h-full" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px), radial-gradient(circle at 80% 50%, white 2px, transparent 2px)',
                    backgroundSize: '30px 30px'
                  }} />
                </div>
                
                {/* FSI Letters */}
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-4xl font-black text-white tracking-tighter leading-none">FSI</span>
                  <div className="h-0.5 w-12 bg-white/80 my-1" />
                  <span className="text-xs font-bold text-white/90 tracking-[0.3em]">DDS</span>
                </div>
                
                {/* Decorative Corner Badge */}
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-3 border-white shadow-lg">
                  <ChefHat className="text-white" size={20} />
                </div>
              </div>
              
              {/* Glow Effect */}
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-app-accent/20 blur-2xl -z-10 animate-pulse" />
            </div>

            <h1 className={`text-4xl font-display font-black tracking-tight mb-2 bg-clip-text text-transparent ${
              theme === 'corporate'
                ? 'bg-gradient-to-r from-[#00A693] via-[#00BFA5] to-[#00A693]'
                : 'bg-gradient-to-r from-app-accent via-red-600 to-app-accent'
            }`}>
              FSI DDS
            </h1>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-app-accent to-transparent" />
              <p className="text-xs text-app-accent font-bold tracking-[0.3em] uppercase">
                {currentLang === 'vi' ? 'Digital Data Solutions' : 
                 currentLang === 'en' ? 'Digital Data Solutions' : 
                 'デジタルデータソリューション'}
              </p>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-app-accent to-transparent" />
            </div>
            <p className="text-[10px] text-app-ink/50 font-medium">
              {currentLang === 'vi' ? 'Hệ Thống Đặt Cơm Nội Bộ' : 
               currentLang === 'en' ? 'Internal Dining System' : 
               '社内食事システム'}
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-1.5 mb-6">
            <button
              type="button"
              onClick={() => { setViewMode('login'); resetForm(); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                viewMode === 'login' 
                  ? 'bg-app-accent text-white shadow-lg' 
                  : 'bg-app-cream text-app-ink/40 hover:text-app-accent'
              }`}
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('register'); resetForm(); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                viewMode === 'register' 
                  ? 'bg-app-accent text-white shadow-lg' 
                  : 'bg-app-cream text-app-ink/40 hover:text-app-accent'
              }`}
            >
              {t.register}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Login Form */}
            {viewMode === 'login' && (
            <form 
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleLogin}
              autoComplete="off"
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.username}
                </label>
                <input 
                  type="text" 
                  name={`username-${formId}`}
                  id={`username-${formId}`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.enterUsername}
                  disabled={isLoading}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.password}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name={`password-${formId}`}
                    id={`password-${formId}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    data-form-type="other"
                    className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 pr-12 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-app-ink/40 hover:text-app-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setViewMode('forgot-password'); resetForm(); }}
                className="text-xs text-app-accent hover:underline font-medium"
              >
                {t.forgotPassword}?
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-sm font-medium">{success}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-app-accent text-white font-bold py-5 rounded-2xl shadow-2xl shadow-app-accent/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="uppercase tracking-[0.2em] text-xs">
                  {isLoading ? (currentLang === 'vi' ? 'Đang đăng nhập...' : currentLang === 'en' ? 'Signing in...' : 'ログイン中...') : t.loginButton}
                </span>
                {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {/* Register Form */}
          {viewMode === 'register' && (
            <form 
              key="register-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleRegister}
              autoComplete="off"
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.fullname}
                </label>
                <input 
                  type="text" 
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder={t.enterFullname}
                  disabled={isLoading}
                  autoComplete="off"
                  className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.username}
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.enterUsername}
                  disabled={isLoading}
                  autoComplete="off"
                  className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.password}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 pr-12 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-app-ink/40 hover:text-app-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 pr-12 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-app-ink/40 hover:text-app-accent transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-sm font-medium">{success}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-app-accent text-white font-bold py-5 rounded-2xl shadow-2xl shadow-app-accent/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="uppercase tracking-[0.2em] text-xs">
                  {isLoading ? (currentLang === 'vi' ? 'Đang tạo tài khoản...' : currentLang === 'en' ? 'Creating account...' : 'アカウント作成中...') : t.registerButton}
                </span>
                {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {viewMode === 'forgot-password' && (
            <form 
              key="forgot-password-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleForgotPassword}
              autoComplete="off"
              className="space-y-6"
            >
              <p className="text-sm text-app-ink/60 text-center mb-4">
                {t.resetPasswordDesc}
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.username}
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.enterUsername}
                  disabled={isLoading}
                  autoComplete="off"
                  className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.password}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.enterNewPassword}
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 pr-12 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-app-ink/40 hover:text-app-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent/60 ml-2">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full bg-app-cream/50 border-2 border-app-ink/10 rounded-2xl py-4 px-6 pr-12 text-app-ink outline-none focus:border-app-accent/30 focus:ring-4 focus:ring-app-accent/5 transition-all placeholder:text-app-ink/20 font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-app-ink/40 hover:text-app-accent transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-sm font-medium">{success}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-app-accent text-white font-bold py-5 rounded-2xl shadow-2xl shadow-app-accent/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="uppercase tracking-[0.2em] text-xs">
                  {isLoading ? (currentLang === 'vi' ? 'Đang xử lý...' : currentLang === 'en' ? 'Processing...' : '処理中...') : t.resetButton}
                </span>
                {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('login'); resetForm(); }}
                className="w-full text-sm text-app-accent hover:underline font-medium"
              >
                ← {t.backToLogin}
              </button>
            </form>
          )}
          </AnimatePresence>
        </div>
        
        <div className="text-center mt-8 px-4">
          <div className="inline-block bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl border-2 border-app-accent/10 shadow-lg">
            <p className="text-xs text-app-ink font-bold tracking-wide">
              © 2026 <span className="text-app-accent">FSI DDS</span>
            </p>
            <p className="text-[10px] text-app-ink/60 font-medium mt-1">
              {currentLang === 'vi' ? 'Hệ Thống Đặt Cơm Nội Bộ' : 
                currentLang === 'en' ? 'Internal Dining System' : 
                '社内食事システム'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
