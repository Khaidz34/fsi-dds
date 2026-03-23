# Hướng dẫn Enable Supabase Realtime

## Tổng quan
Thay vì polling liên tục, hệ thống giờ sử dụng Supabase Realtime để:
- **User**: Chỉ refresh khi admin thanh toán hoặc có thay đổi orders (event-driven)
- **Admin**: Vẫn polling mỗi 3 giây để theo dõi tất cả users

## Lợi ích
✅ Tiết kiệm tài nguyên server (giảm 90% API calls từ users)
✅ Tiết kiệm băng thông cho người dùng
✅ Cập nhật real-time chính xác hơn
✅ Giảm độ trễ khi admin thanh toán

## Cách Enable Realtime trên Supabase

### Bước 1: Truy cập Supabase Dashboard
1. Đăng nhập vào https://supabase.com
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)

### Bước 2: Chạy SQL Script
Copy và chạy nội dung file `ENABLE-REALTIME.sql`:

```sql
-- Enable Realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable Realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

### Bước 3: Kiểm tra Realtime đã hoạt động
1. Vào **Database** → **Replication** (menu bên trái)
2. Kiểm tra xem `payments` và `orders` đã có trong danh sách **supabase_realtime** publication chưa

### Bước 4: Test
1. Đăng nhập với tài khoản user
2. Mở Developer Console (F12)
3. Bạn sẽ thấy log: `👂 Subscribing to payment & order updates (user)...`
4. Khi admin thanh toán, bạn sẽ thấy: `💰 Payment update received, refreshing stats...`

## Troubleshooting

### Nếu Realtime không hoạt động
Hệ thống sẽ tự động fallback về polling mỗi 5 giây. Kiểm tra console log:
- ✓ `Realtime subscription active for payments` → Đang hoạt động
- ✗ `Realtime subscription error, falling back to polling` → Có lỗi, đang dùng polling

### Kiểm tra RLS (Row Level Security)
Đảm bảo RLS policies cho phép users đọc dữ liệu:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename IN ('payments', 'orders');
```

## Cấu trúc mới

### User Flow
```
User Login
    ↓
Subscribe to Realtime (payments + orders)
    ↓
Wait for events (không polling)
    ↓
Admin marks payment → Realtime event → Auto refresh
```

### Admin Flow
```
Admin Login
    ↓
Poll every 3 seconds (monitor all users)
    ↓
Mark payment → Trigger realtime event to user
```

## Monitoring

### Console Logs
- User: `👂 Subscribing to payment & order updates (user)...`
- User: `💰 Payment update received, refreshing stats...`
- Admin: `🔄 Polling payment stats (admin)...`

### Network Tab
- User: Chỉ thấy WebSocket connection (wss://), không có polling requests
- Admin: Thấy polling requests mỗi 3 giây

## Rollback (nếu cần)
Nếu muốn quay lại polling cho users:
```typescript
// In src/hooks/usePayments.ts
// Change user section back to:
const pollInterval = setInterval(() => {
  fetchPaymentStats(false);
}, 10000); // 10 seconds
```
