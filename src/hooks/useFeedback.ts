import { useState, useEffect } from 'react';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTable, unsubscribeFromTable } from '../services/supabase';

export interface Feedback {
  id: number;
  subject?: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  fullname: string;
  username: string;
}

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
      
      // Setup Supabase Realtime subscription for feedback
      const channel = subscribeToTable('feedback', () => {
        console.log('💬 Feedback update detected via Realtime');
        fetchFeedbacks();
      }, 'feedback_changes');

      return () => {
        unsubscribeFromTable(channel);
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
