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
    console.warn('Supabase client not initialized, using polling fallback');
    // Fallback to polling every 5 seconds
    const pollInterval = setInterval(() => {
      callback();
    }, 5000);
    return { unsubscribe: () => clearInterval(pollInterval) };
  }

  let pollInterval: NodeJS.Timeout | null = null;
  let subscriptionActive = false;

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
        subscriptionActive = true;
        // Clear polling if subscription is active
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`✗ Realtime subscription error for ${tableName}, falling back to polling`);
        subscriptionActive = false;
        // Start polling as fallback
        if (!pollInterval) {
          pollInterval = setInterval(() => {
            callback();
          }, 5000);
        }
      } else if (status === 'CLOSED') {
        console.log(`Realtime subscription closed for ${tableName}, falling back to polling`);
        subscriptionActive = false;
        // Start polling as fallback
        if (!pollInterval) {
          pollInterval = setInterval(() => {
            callback();
          }, 5000);
        }
      }
    });

  return {
    ...channel,
    unsubscribe: () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      channel.unsubscribe();
    }
  };
};

export const unsubscribeFromTable = (channel: any) => {
  if (channel) {
    channel.unsubscribe();
  }
};
