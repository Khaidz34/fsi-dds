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

  const channel = supabase
    .channel(channelName || `${tableName}_changes`)
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
        console.log(`✓ Realtime subscription active for ${tableName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`Realtime subscription error for ${tableName}`);
      } else if (status === 'CLOSED') {
        console.log(`Realtime subscription closed for ${tableName}`);
      }
    });

  return {
    ...channel,
    unsubscribe: () => {
      channel.unsubscribe();
    }
  };
};

export const unsubscribeFromTable = (channel: any) => {
  if (channel) {
    channel.unsubscribe();
  }
};
