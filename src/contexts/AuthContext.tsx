import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, tokenStorage } from '../services/api';

interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin';
}

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra token khi app khởi động
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        const savedToken = tokenStorage.get();
        console.log('📝 Saved token:', savedToken ? 'Found' : 'Not found');
        
        if (savedToken) {
          try {
            setToken(savedToken);
            console.log('🔄 Fetching user data...');
            const userData = await authAPI.getMe();
            console.log('✅ User data fetched:', userData);
            setUser(userData);
          } catch (error) {
            console.error('❌ Token invalid:', error);
            tokenStorage.remove();
            setToken(null);
            setUser(null);
          }
        } else {
          console.log('ℹ️ No saved token, user not authenticated');
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      setUser(response.user);
      setToken(response.token);
      tokenStorage.set(response.token);
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
