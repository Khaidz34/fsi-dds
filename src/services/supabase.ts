/**
 * SUPABASE REALTIME CLIENT
 * 
 * KIẾN TRÚC DATA ACCESS:
 * - Frontend KHÔNG thực hiện trực tiếp các truy vấn CRUD (SELECT/INSERT/UPDATE/DELETE) qua Supabase client này.
 * - Mọi thao tác nghiệp vụ, xác thực JWT, tạo/xoá đơn, thanh toán đều tập trung đi qua Backend Express API (src/services/api.ts).
 * - File này CHỈ phục vụ duy nhất mục đích: lắng nghe sự kiện thay đổi dữ liệu qua WebSocket Realtime (subscribeToTable).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found in environment variables');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export const subscribeToTable = (
  tableName: string,
  callback: () => void,
  channelName?: string
) => {
  if (!supabase) {
    console.warn('Supabase client not initialized, skipping realtime subscription');
    return { unsubscribe: () => {} };
  }

  let isSubscribed = false;
  let isUnsubscribed = false;
  let reconnectTimeout: any = null;
  let retryCount = 0;
  const uniqueChannelName = channelName || `${tableName}_changes_${Math.random().toString(36).slice(2, 7)}`;
  let currentChannel: any = null;

  const setupChannel = () => {
    if (isUnsubscribed || !supabase) return;

    if (currentChannel) {
      try {
        supabase.removeChannel(currentChannel);
      } catch (e) {
        // ignore
      }
      currentChannel = null;
    }

    try {
      currentChannel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          () => {
            console.log(`Realtime update received for ${tableName}`);
            callback();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✓ Realtime subscription active for ${tableName} (${uniqueChannelName})`);
            isSubscribed = true;
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`Realtime subscription status for ${tableName}: ${status}. Attempting auto-reconnect...`);
            isSubscribed = false;
            if (!isUnsubscribed) {
              if (reconnectTimeout) clearTimeout(reconnectTimeout);
              const delay = Math.min(2000 * Math.pow(1.5, retryCount), 15000);
              retryCount++;
              reconnectTimeout = setTimeout(() => {
                console.log(`🔄 Auto-reconnecting Realtime for ${tableName} (attempt ${retryCount})...`);
                setupChannel();
              }, delay);
            }
          }
        });
    } catch (err) {
      console.error(`Failed to setup realtime subscription for ${tableName}:`, err);
    }
  };

  setupChannel();

  // Khi chuyển tab quay lại (visibility change), kiểm tra và reconnect nếu cần, đồng thời trigger callback để cập nhật dữ liệu mới nhất
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isUnsubscribed) {
      if (!isSubscribed) {
        console.log(`👁️ Tab became visible and Realtime for ${tableName} was disconnected, reconnecting...`);
        setupChannel();
      }
      // Luôn trigger callback khi quay lại tab để không bị lỡ dữ liệu phát sinh khi tab đang inactive
      callback();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    unsubscribe: () => {
      isUnsubscribed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (currentChannel && supabase) {
        try {
          supabase.removeChannel(currentChannel);
        } catch (e) {
          // ignore
        }
        currentChannel = null;
      }
    }
  };
};

export const unsubscribeFromTable = (channel: any) => {
  if (channel) {
    channel.unsubscribe();
  }
};
