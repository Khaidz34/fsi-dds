/**
 * API Service để kết nối với backend
 */

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check if we're in production and have a custom API URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development fallback - Backend runs on port 10000
  if (import.meta.env.DEV) {
    return 'http://localhost:10000';
  }
  
  // Production fallback - same origin
  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

// Lưu trữ token trong localStorage
export const tokenStorage = {
  get: () => localStorage.getItem('auth_token'),
  set: (token: string) => localStorage.setItem('auth_token', token),
  remove: () => localStorage.removeItem('auth_token')
};

// Helper function để tạo headers với auth token
const getHeaders = () => {
  const token = tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// API call function - kết nối trực tiếp với backend
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    apiCall<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  register: (username: string, password: string, fullname: string) =>
    apiCall<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, fullname })
    }),

  getMe: () => apiCall<any>('/auth/me'),

  resetPassword: (username: string, newPassword: string) =>
    apiCall<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ username, newPassword })
    })
};

// Users API
export const usersAPI = {
  getAll: () => apiCall<any[]>('/users'),
  
  getList: () => apiCall<Array<{id: number, fullname: string}>>('/users/list'),
  
  updateRole: (id: number, role: string) =>
    apiCall<any>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),

  delete: (id: number) =>
    apiCall<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE'
    })
};

// Menu API
export const menuAPI = {
  getToday: (lang?: string) => apiCall<{
    id?: number;
    date: string;
    imageUrl: string;
    dishes: Array<{ id: number; name: string; order_index: number }>;
  }>(`/menu/today${lang ? `?lang=${lang}` : ''}`),

  create: (dishes: string[], imageUrl?: string) =>
    apiCall<any>('/menu', {
      method: 'POST',
      body: JSON.stringify({ dishes, imageUrl })
    }),

  createMultilingual: (dishes: Array<{vi: string, en?: string, ja?: string}>, imageUrl?: string) =>
    apiCall<any>('/menu/multilingual', {
      method: 'POST',
      body: JSON.stringify({ dishes, imageUrl })
    }),

  deleteDish: (dishId: number) =>
    apiCall<{ success: boolean }>(`/dishes/${dishId}`, {
      method: 'DELETE'
    })
};

// Orders API
export const ordersAPI = {
  getToday: (lang?: string) => apiCall<any[]>(`/orders/today${lang ? `?lang=${lang}` : ''}`),
  
  getMy: (month?: string) => apiCall<any[]>(`/orders/my${month ? `?month=${month}` : ''}`),

  getWeeklyStats: () => apiCall<Array<{ name: string; orders: number; date: string }>>('/orders/weekly-stats'),

  create: (orderData: {
    dish1Id: number;
    dish2Id?: number;
    orderedFor: number;
    notes?: string;
    rating?: number;
  }) => apiCall<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),

  update: (id: number, orderData: {
    dish1Id: number;
    dish2Id?: number;
    notes?: string;
    rating?: number;
  }) => apiCall<{ success: boolean; message: string; order: any }>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData)
  }),

  delete: (id: number) =>
    apiCall<{ success: boolean }>(`/orders/${id}`, {
      method: 'DELETE'
    })
};

// Stats API
export const statsAPI = {
  getMonth: (month?: string) => 
    apiCall<any[]>(`/stats/month${month ? `?month=${month}` : ''}`),
  
  getWeek: () => apiCall<any[]>('/stats/week'),
  
  getDashboard: () => apiCall<{
    todayOrders: number;
    monthOrders: number;
    monthRevenue: number;
    uniqueUsers: number;
    topDishes: Array<{ name: string; orderCount: number }>;
  }>('/stats/dashboard'),
  
  getAdminDashboard: () => apiCall<{
    ordersToday: number;
    totalUsers: number;
    popularDishesCount: number;
    popularDishes: Array<{ name: string; orderCount: number }>;
  }>('/admin/dashboard-stats')
};

// Payments API
export const paymentsAPI = {
  getAll: (month?: string) =>
    apiCall<any[]>(`/payments${month ? `?month=${month}` : ''}`),
  
  getMy: (month?: string) =>
    apiCall<any>(`/payments/my${month ? `?month=${month}` : ''}`),
  
  getHistory: (month?: string) =>
    apiCall<any[]>(`/payments/history${month ? `?month=${month}` : ''}`),
  
  markPaid: (userId: number, month: string, amount: number) =>
    apiCall<any>('/payments/mark-paid', {
      method: 'POST',
      body: JSON.stringify({ userId, month, amount })
    })
};

// Invoices API
export const invoicesAPI = {
  getMonth: (month?: string) =>
    apiCall<any>(`/invoices/month${month ? `?month=${month}` : ''}`)
};

// Feedback API
export const feedbackAPI = {
  getAll: () => apiCall<any[]>('/feedback'),
  
  create: (subject?: string, message?: string) =>
    apiCall<{ success: boolean; feedback: any }>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ subject, message })
    }),
  
  updateStatus: (id: number, status: string) =>
    apiCall<{ success: boolean }>(`/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
};

// Admin API
export const adminAPI = {
  cleanupMarkdown: () =>
    apiCall<{ success: boolean; message: string; updatedCount: number }>('/admin/cleanup-markdown', {
      method: 'POST'
    })
};