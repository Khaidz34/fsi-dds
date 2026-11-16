/**
 * useSSE Hook
 * 
 * Manages Server-Sent Events (SSE) connection for real-time updates.
 * Handles connection establishment, event parsing, error handling, and reconnection logic.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '../services/api';

export interface SSEOrderData {
  type: 'order_created' | 'order_deleted' | 'order_updated' | 'payment_marked' | 'payment_auto_completed' | 'deadline_override_changed';
  userId: number;
  data: {
    orderId: number;
    price: number;
    month: string;
    timestamp: number;
    // Order-specific fields for notifications
    dish1Name?: string;
    dish1NameEn?: string;
    dish1NameJa?: string;
    dish2Name?: string;
    dish2NameEn?: string;
    dish2NameJa?: string;
    customerName?: string;
    orderedFor?: number;
  };
}

interface UseSSEOptions {
  onOrderCreated?: (data: SSEOrderData) => void;
  onOrderUpdated?: (data: SSEOrderData) => void;
  onOrderDeleted?: (data: SSEOrderData) => void;
  onPaymentMarked?: (data: SSEOrderData) => void;
  onError?: (error: Error) => void;
}

interface UseSSEReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

const API_BASE_URL = getApiBaseUrl();
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export function useSSE(
  userId: number | null,
  token: string | null,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const calculateBackoffDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );
    return delay;
  }, []);

  // Store callbacks in refs to avoid recreating connect function
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    // Don't connect if already connecting or no user/token
    if (!userId || !token || isReconnectingRef.current) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      console.log('🔌 Establishing SSE connection for user:', userId);
      
      const url = `${API_BASE_URL}/api/sse/payments?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(url);
      
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        isReconnectingRef.current = false;
      };

      eventSource.onmessage = (event) => {
        try {
          // Parse SSE data
          const data: SSEOrderData = JSON.parse(event.data);
          console.log('📨 SSE event received:', data.type, data);

          // Route to appropriate handler
          switch (data.type) {
            case 'order_created':
              if (optionsRef.current.onOrderCreated) {
                optionsRef.current.onOrderCreated(data);
              }
              break;
            case 'order_updated':
              if (optionsRef.current.onOrderUpdated) {
                optionsRef.current.onOrderUpdated(data);
              } else if (optionsRef.current.onOrderDeleted) {
                optionsRef.current.onOrderDeleted(data);
              }
              break;
            case 'order_deleted':
              if (optionsRef.current.onOrderDeleted) {
                optionsRef.current.onOrderDeleted(data);
              }
              break;
            case 'payment_marked':
            case 'payment_auto_completed':
              if (optionsRef.current.onPaymentMarked) {
                optionsRef.current.onPaymentMarked(data);
              }
              break;
            case 'deadline_override_changed':
              try {
                const override = (data as any).data || data;
                localStorage.setItem('fsi_order_deadline_override', JSON.stringify(override));
                window.dispatchEvent(new CustomEvent('fsi_order_deadline_override_changed', { detail: override }));
              } catch (e) {
                console.error('Failed to handle deadline_override_changed SSE:', e);
              }
              break;
            default:
              console.log('Unknown SSE event type:', data.type);
          }
        } catch (parseError) {
          console.error('Failed to parse SSE event data:', parseError, event.data);
          // Continue listening despite parse error
        }
      };

      eventSource.onerror = (event) => {
        console.error('❌ SSE connection error:', event);
        
        const errorObj = new Error('SSE connection failed');
        setError(errorObj);
        setIsConnected(false);

        if (optionsRef.current.onError) {
          optionsRef.current.onError(errorObj);
        }

        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          isReconnectingRef.current = true;
          const delay = calculateBackoffDelay();
          
          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          isReconnectingRef.current = false;
        }
      };
    } catch (err) {
      console.error('Failed to establish SSE connection:', err);
      const errorObj = err instanceof Error ? err : new Error('SSE connection failed');
      setError(errorObj);
      setIsConnected(false);
      
      if (optionsRef.current.onError) {
        optionsRef.current.onError(errorObj);
      }
    }
  }, [userId, token, calculateBackoffDelay]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnect
    isReconnectingRef.current = false;
    connect();
  }, [connect]);

  // Establish connection on mount and when dependencies change
  useEffect(() => {
    if (userId && token) {
      connect();
    }

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' && userId && token) {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          console.log('🔄 Auto-resuming SSE on tab focus / online');
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up SSE connection');
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setIsConnected(false);
      isReconnectingRef.current = false;
    };
  }, [userId, token, connect]);

  return {
    isConnected,
    error,
    reconnect,
  };
}
