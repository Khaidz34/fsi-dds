/**
 * UNIFIED REALTIME CLIENT (SSE-First Architecture)
 * 
 * KIẾN TRÚC REALTIME:
 * - Hệ thống sử dụng Express Server-Sent Events (SSE / useSSE.ts) làm kênh truyền thời gian thực duy nhất.
 * - Khi có đơn hàng mới, cập nhật đơn, hủy đơn, hoặc gạch nợ thanh toán, Backend phát sự kiện SSE tới client.
 * - Client lắng nghe SSE và phát tín hiệu ('app:order-update' / 'app:payment-update') để các hooks tự động làm mới.
 * 
 * LỢI ÍCH CỦA VIỆC HỢP NHẤT QUA SSE:
 * 1. Tiết kiệm 100% quota kết nối WebSocket của Supabase (giới hạn 200 concurrent connections trên gói Free).
 * 2. Không cần tải thư viện @supabase/supabase-js (~169KB) về trình duyệt của người dùng.
 * 3. Loại bỏ hoàn toàn xung đột 2 sự kiện trùng lặp (Dual Realtime event storm).
 * 
 * Các hàm bên dưới được giữ lại dưới dạng no-op tương thích ngược để không làm hỏng interface của các hooks hiện tại.
 */

export const supabase: any = null;

export const subscribeToTable = (
  tableName: string,
  _callback: () => void,
  channelName?: string
) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📡 Realtime table subscription for '${tableName}' (${channelName || 'default'}) delegated to SSE.`);
  }
  return {
    unsubscribe: () => {}
  };
};

export const unsubscribeFromTable = (_channel: any) => {
  // No-op: Realtime lifecycle is managed via unified SSE (useSSE)
};
