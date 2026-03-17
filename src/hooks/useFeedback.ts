import { useState, useEffect } from 'react';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

export interface Feedback {
  id: number;
  subject?: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  fullname: string;
  username: string;
}

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
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
      if (supabaseClient) {
        const subscription = supabaseClient
          .channel('feedback_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
            fetchFeedbacks();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Feedback realtime subscription active');
            }
          });

        return () => {
          subscription.unsubscribe();
        };
      }
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
