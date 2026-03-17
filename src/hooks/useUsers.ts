import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

export interface User {
  id: number;
  username: string;
  fullname: string;
  role: 'user' | 'admin';
}

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
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
      
      // Setup Supabase Realtime subscription for users
      if (supabaseClient) {
        const subscription = supabaseClient
          .channel('users_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            fetchUsers();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Users realtime subscription active');
            }
          });

        return () => {
          subscription.unsubscribe();
        };
      }
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
