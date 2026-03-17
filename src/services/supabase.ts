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
    console.warn('Supabase client not initialized');
    return null;
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
        console.error(`✗ Realtime subscription error for ${tableName}`);
      } else if (status === 'CLOSED') {
        console.log(`Realtime subscription closed for ${tableName}`);
      }
    });

  return channel;
};

export const unsubscribeFromTable = (channel: any) => {
  if (channel) {
    channel.unsubscribe();
  }
};
