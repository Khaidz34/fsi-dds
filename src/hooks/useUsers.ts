import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

export interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export const useUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id: number, data: { fullname?: string; role?: string; username?: string; password?: string }) => {
    try {
      const result = await usersAPI.update(id, data);
      await fetchUsers();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const updateUserRole = async (id: number, role: string) => {
    try {
      const updatedUser = await usersAPI.updateRole(id, role);
      setUsers(prev => prev.map(user => user.id === id ? { ...user, ...updatedUser } : user));
      return updatedUser;
    } catch (err) {
      throw err;
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await usersAPI.delete(id);
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchUsers();
      
      // Setup Supabase Realtime subscription for users
      const channel = subscribeToTable('users', () => {
        console.log('👥 Users update detected via Realtime');
        fetchUsers();
      }, 'users_changes');

      return () => {
        unsubscribeFromTable(channel);
      };
    }
  }, [currentUser?.id]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
    updateUser,
    updateUserRole,
    deleteUser
  };
};