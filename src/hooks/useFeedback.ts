import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface Feedback {
  id: number;
  subject?: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  fullname: string;
  username: string;
}

// Initialize Supabase client for realtime
const supabaseUrl = 'https://abeaqpjfngcwjlcaypzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpmbmdjd2psY2F5cHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NzI5NzcsImV4cCI6MjA0ODI0ODk3N30.Aw0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0Yd0';
const supabase = createClient(supabaseUrl, supabaseKey);

export const useFeedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (user?.role === 'admin') {
        const data = await feedbackAPI.getAll();
        setFeedbacks(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải góp ý');
    } finally {
      setIsLoading(false);
    }
  };

  const createFeedback = async (subject?: string, message?: string) => {
    try {
      const result = await feedbackAPI.create(subject, message);
      // Refresh feedbacks if admin
      if (user?.role === 'admin') {
        await fetchFeedbacks();
      }
      return result;
    } catch (err) {
      console.error('Error creating feedback:', err);
      throw err;
    }
  };

  const updateFeedbackStatus = async (id: number, status: string) => {
    try {
      await feedbackAPI.updateStatus(id, status);
      // Update local state
      setFeedbacks(prev => prev.map(f => 
        f.id === id ? { ...f, status: status as any } : f
      ));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFeedbacks();

      // Subscribe to realtime changes on feedback table
      const channel = supabase
        .channel('feedback-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback'
          },
          (payload) => {
            console.log('📡 Realtime feedback update:', payload);
            fetchFeedbacks();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.role]);

  return {
    feedbacks,
    isLoading,
    error,
    createFeedback,
    updateFeedbackStatus,
    refetch: fetchFeedbacks
  };
};