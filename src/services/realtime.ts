/**
 * Real-time Manager for SSE (Server-Sent Events)
 * Handles real-time payment updates with automatic fallback to polling
 */

import { tokenStorage } from './api';

export interface RealtimeUpdate {
  type: 'payment_marked' | 'order_created' | 'order_updated' | 'order_deleted' | 'connected';
  userId: number;
  data: any;
  timestamp: number;
}

interface RealtimeConfig {
  userId: number;
  onUpdate: (update: RealtimeUpdate) => void;
  onError?: (error: Error) => void;
  onModeChange?: (mode: 'realtime' | 'polling') => void;
}

class RealtimeManager {
  private eventSource: EventSource | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private config: RealtimeConfig | null = null;
  private mode: 'realtime' | 'polling' = 'realtime';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private apiUrl: string;
  private lastPolledData: any = null;

  constructor(apiUrl: string = '') {
    this.apiUrl = apiUrl || ((import.meta as any).env?.VITE_API_URL || 'http://localhost:10000');
  }

  /**
   * Connect to real-time updates
   */
  connect(config: RealtimeConfig) {
    // If already connected with same user, don't reconnect
    if (this.config && this.config.userId === config.userId && this.eventSource) {
      console.log(`🔌 Already connected for user ${config.userId}`);
      return;
    }

    this.config = config;
    console.log(`🔌 Connecting to real-time updates for user ${config.userId}`);
    this.connectSSE();
  }

  /**
   * Connect to SSE endpoint
   */
  private connectSSE() {
    if (!this.config) return;

    try {
      const token = tokenStorage.get();
      if (!token) {
        console.warn('⚠️  No auth token, cannot connect to SSE');
        this.switchToPolling();
        return;
      }

      // EventSource doesn't support custom headers, so pass token as query parameter
      const url = `${this.apiUrl}/api/sse/payments?token=${encodeURIComponent(token)}`;
      console.log(`🔗 Connecting to SSE: ${this.apiUrl}/api/sse/payments`);
      
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.switchToRealtime();
      };

      this.eventSource.onmessage = (event) => {
        try {
          // Skip heartbeat messages
          if (event.data === ':heartbeat' || event.data.startsWith(':')) {
            return;
          }
          
          const update = JSON.parse(event.data);
          
          // Skip connection confirmation messages
          if (update.type === 'connected') {
            console.log('✅ SSE connection confirmed for user', update.userId);
            return;
          }
          
          // Skip error messages
          if (update.type === 'error') {
            console.error('❌ SSE error:', update.error);
            return;
          }
          
          console.log('📨 Real-time update received:', update.type);
          if (this.config?.onUpdate) {
            this.config.onUpdate(update);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        this.eventSource?.close();
        this.eventSource = null;
        this.handleSSEError();
      };
    } catch (err) {
      console.error('Error connecting to SSE:', err);
      this.handleSSEError();
    }
  }

  /**
   * Handle SSE connection error
   */
  private handleSSEError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectSSE();
      }, this.reconnectDelay);

      // Exponential backoff: 1s, 2s, 4s, 8s, max 8s
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
    } else {
      console.warn('⚠️  Max reconnection attempts reached, switching to polling');
      this.switchToPolling();
    }
  }

  /**
   * Switch to polling mode
   */
  private switchToPolling() {
    if (this.mode === 'polling') return;

    console.log('📡 Switching to polling mode');
    this.mode = 'polling';
    
    if (this.config?.onModeChange) {
      this.config.onModeChange('polling');
    }

    // Start polling every 5 seconds (faster updates when SSE unavailable)
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      this.pollForUpdates();
    }, 5000);

    // Poll immediately
    this.pollForUpdates();
  }

  /**
   * Switch back to real-time mode
   */
  private switchToRealtime() {
    if (this.mode === 'realtime') return;

    console.log('🔌 Switching to real-time mode');
    this.mode = 'realtime';

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.config?.onModeChange) {
      this.config.onModeChange('realtime');
    }
  }

  /**
   * Poll for updates (fallback when SSE is unavailable)
   */
  private async pollForUpdates() {
    if (!this.config) return;

    try {
      const token = tokenStorage.get();
      if (!token) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await fetch(
        `${this.apiUrl}/api/payments/my?month=${currentMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Only emit update if data actually changed
      // This prevents unnecessary re-renders
      const currentDataStr = JSON.stringify(this.lastPolledData);
      const newDataStr = JSON.stringify(data);
      
      if (this.lastPolledData && currentDataStr === newDataStr) {
        return; // Data hasn't changed, don't emit update
      }
      
      this.lastPolledData = data;
      
      // Emit update event
      if (this.config.onUpdate) {
        this.config.onUpdate({
          type: 'order_created',
          userId: this.config.userId,
          data,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Polling error:', err);
      if (this.config?.onError) {
        this.config.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Disconnect from real-time updates
   */
  disconnect() {
    console.log('🔌 Disconnecting from real-time updates');

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.config = null;
  }

  /**
   * Get current mode
   */
  getMode(): 'realtime' | 'polling' {
    return this.mode;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource !== null || this.pollInterval !== null;
  }

  /**
   * Check if SSE is connected
   */
  isSSEConnected(): boolean {
    return this.eventSource !== null;
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();
