# Supabase Realtime Setup Guide

## Bước 1: Enable Realtime ở Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **Database** → **Replication**
4. Bật Realtime cho các bảng sau:
   - `payments` ✓
   - `orders` ✓
   - `menus` ✓
   - `feedback` ✓
   - `users` ✓

## Bước 2: Kiểm tra RLS (Row Level Security)

Realtime cần RLS được enable. Kiểm tra:
1. Vào **Authentication** → **Policies**
2. Đảm bảo RLS được enable cho tất cả bảng
3. Thêm policy cho phép SELECT:

```sql
-- Cho phép tất cả authenticated users xem dữ liệu
CREATE POLICY "Enable read access for authenticated users"
ON payments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users"
ON orders FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users"
ON menus FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users"
ON feedback FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');
```

## Bước 3: Kiểm tra Environment Variables

Đảm bảo `.env.local` có:
```
VITE_SUPABASE_URL=https://abeaqpjfngcwjlcaypzh.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Bước 4: Test Realtime Connection

Mở browser console và kiểm tra:
- Tìm message "subscription active" 
- Nếu thấy "CHANNEL_ERROR", có vấn đề với connection

## Troubleshooting

### WebSocket Connection Failed
- Kiểm tra CORS settings ở Supabase
- Đảm bảo frontend URL được whitelist

### Realtime không trigger
- Kiểm tra RLS policies
- Đảm bảo bảng có Realtime enabled
- Kiểm tra network tab xem WebSocket connection

### Fallback to Polling
Nếu Realtime không hoạt động, code sẽ tự động fallback sang polling 5 giây
