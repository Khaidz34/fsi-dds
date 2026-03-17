import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export const RealtimeTest = () => {
  const [status, setStatus] = useState('Checking...');
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase) {
      setStatus('Supabase not initialized');
      return;
    }

    const addMessage = (msg: string) => {
      console.log(msg);
      setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    addMessage('Starting Realtime test...');

    // Test payments table subscription
    const channel = supabase
      .channel('test_payments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          addMessage(`✓ Payment change detected: ${payload.eventType}`);
          console.log('Payload:', payload);
        }
      )
      .subscribe((status) => {
        addMessage(`Channel status: ${status}`);
        setStatus(status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-bold mb-2">Realtime Test</h3>
      <p className="text-sm mb-2">Status: <span className="font-bold">{status}</span></p>
      <div className="bg-white p-2 rounded text-xs max-h-40 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="font-mono text-gray-700">{msg}</div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Try making a payment in another browser tab and watch for updates here
      </p>
    </div>
  );
};
