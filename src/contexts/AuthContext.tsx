import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authAPI, tokenStorage } from '../services/api';

interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin';
}

// Cache user data in localStorage để giữ phiên đăng nhập mượt mà khi mạng/server bị lỗi tạm thời
const USER_CACHE_KEY = 'auth_user_cache';
const userCache = {
  get: (): User | null => {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set: (user: User) => {
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch {}
  },
  remove: () => {
    try {
      localStorage.removeItem(USER_CACHE_KEY);
    } catch {}
  }
};

const isGenuineAuthError = (error: unknown): boolean => {
  if (!error) return false;
  const status = (error as any)?.status;
  if (status === 401 || status === 403) return true;
  
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('HTTP 401') ||
    msg.includes('HTTP 403') ||
    msg.includes('Access token required') ||
    msg.includes('Invalid token') ||
    msg.includes('jwt expired')
  );
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, fullname: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => userCache.get());
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra token khi app khởi động
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        const savedToken = tokenStorage.get();
        const cachedUser = userCache.get();
        console.log('📝 Saved token:', savedToken ? 'Found' : 'Not found');
        
        if (savedToken) {
          setToken(savedToken);
          if (cachedUser) {
            setUser(cachedUser);
          }

          try {
            console.log('🔄 Verifying user session...');
            const userData = await authAPI.getMe();
            console.log('✅ User session valid:', userData);
            setUser(userData);
            userCache.set(userData);
          } catch (error) {
            if (isGenuineAuthError(error)) {
              console.warn('❌ Token genuinely invalid or expired. Logging out:', error);
              tokenStorage.remove();
              userCache.remove();
              setToken(null);
              setUser(null);
            } else {
              // Lỗi mạng hoặc Render cold start (502/503/timeout) -> giữ phiên đăng nhập, không logout!
              console.warn('⚠️ Network or server error during auth check, keeping active session:', error);
              if (cachedUser) {
                setUser(cachedUser);
              }
            }
          }
        } else {
          console.log('ℹ️ No saved token, user not authenticated');
          userCache.remove();
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initAuth();

    // Tự động kiểm tra lại session khi user quay lại tab trình duyệt
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const currentToken = tokenStorage.get();
        if (currentToken) {
          try {
            const freshUser = await authAPI.getMe();
            setUser(freshUser);
            userCache.set(freshUser);
          } catch (err) {
            if (isGenuineAuthError(err)) {
              console.warn('❌ Token expired while tab was inactive, logging out');
              tokenStorage.remove();
              userCache.remove();
              setToken(null);
              setUser(null);
            }
            // Nếu lỗi mạng tạm thời thì bỏ qua, không out
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      setUser(response.user);
      setToken(response.token);
      tokenStorage.set(response.token);
      userCache.set(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string, fullname: string) => {
    try {
      // Register only creates account, does not login
      await authAPI.register(username, password, fullname);
      // Do not set user or token - user must login manually
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    tokenStorage.remove();
    userCache.remove();
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
