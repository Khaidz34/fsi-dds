import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin';
}

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const updateUserRole = async (id: number, role: string) => {
    try {
      const updatedUser = await usersAPI.updateRole(id, role);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
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

      // Subscribe to realtime changes on users table
      const channel = supabase
        .channel('users-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            console.log('📡 Realtime users update:', payload);
            fetchUsers();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser?.id]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
    updateUserRole,
    deleteUser
  };
};