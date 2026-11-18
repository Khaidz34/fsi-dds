/**
 * SUPABASE REALTIME CLIENT (Lazy-loaded)
 * 
 * KIẾN TRÚC DATA ACCESS:
 * - Frontend KHÔNG thực hiện trực tiếp các truy vấn CRUD (SELECT/INSERT/UPDATE/DELETE) qua Supabase client này.
 * - Mọi thao tác nghiệp vụ, xác thực JWT, tạo/xoá đơn, thanh toán đều tập trung đi qua Backend Express API (src/services/api.ts).
 * - File này CHỈ phục vụ duy nhất mục đích: lắng nghe sự kiện thay đổi dữ liệu qua WebSocket Realtime (subscribeToTable).
 * - SDK @supabase/supabase-js (~169KB) được dynamic import theo nhu cầu để KHÔNG làm chậm trang Đăng nhập.
 */

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found in environment variables');
}

export let supabase: any = null;
let supabaseClientPromise: Promise<any> | null = null;

async function getSupabaseClient(): Promise<any> {
  if (supabase) return supabase;
  if (!supabaseUrl || !supabaseKey) return null;

  if (!supabaseClientPromise) {
    supabaseClientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        supabase = createClient(supabaseUrl, supabaseKey, {
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
        return supabase;
      })
      .catch((err) => {
        console.error('Failed to lazy-load Supabase Realtime client:', err);
        supabaseClientPromise = null;
        return null;
      });
  }

  return supabaseClientPromise;
}

export const subscribeToTable = (
  tableName: string,
  callback: () => void,
  channelName?: string
) => {
  if (!supabaseUrl || !supabaseKey) {
    return { unsubscribe: () => {} };
  }

  let isSubscribed = false;
  let isUnsubscribed = false;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  const uniqueChannelName = channelName || `${tableName}_changes_${Math.random().toString(36).slice(2, 7)}`;
  let currentChannel: any = null;
  let clientRef: any = null;

  const triggerCallbackDebounced = () => {
    if (isUnsubscribed) return;
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (!isUnsubscribed) {
        callback();
      }
    }, 300);
  };

  const setupChannel = async () => {
    if (isUnsubscribed) return;
    const client = await getSupabaseClient();
    if (!client || isUnsubscribed) return;
    clientRef = client;

    if (currentChannel) {
      try {
        client.removeChannel(currentChannel);
      } catch {
        // ignore
      }
      currentChannel = null;
    }

    try {
      currentChannel = client
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
            triggerCallbackDebounced();
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

  // Khi quay lại tab: CHỈ reconnect và refresh nếu kết nối Realtime thực sự đã bị đứt
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isUnsubscribed && !isSubscribed) {
      console.log(`👁️ Tab visible & Realtime for ${tableName} was disconnected, reconnecting...`);
      setupChannel();
      triggerCallbackDebounced();
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
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (currentChannel && clientRef) {
        try {
          clientRef.removeChannel(currentChannel);
        } catch {
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
