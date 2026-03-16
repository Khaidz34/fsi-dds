# 🔧 Fix Supabase Integration Issues

## Vấn đề hiện tại
- API endpoints trả về 404 errors
- Payment system vẫn dùng mock data
- Admin section thiếu phần đặt cơm cho bản thân
- Cần refresh mới thấy dữ liệu

## ✅ Các bước sửa lỗi

### 1. Cập nhật Supabase credentials

**Bước 1:** Lấy Supabase credentials
- Vào https://supabase.com/dashboard
- Chọn project: `abeaqpjfngcwjlcaypzh`
- Vào Settings → API
- Copy `URL` và `anon public` key

**Bước 2:** Cập nhật `backend/.env`
```env
SUPABASE_URL=https://abeaqpjfngcwjlcaypzh.supabase.co
SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY_HERE
JWT_SECRET=gourmetgrid_super_secret_key_2026_change_this_in_production
PORT=10000
FRONTEND_URL=http://localhost:5173
```

### 2. Cập nhật database schema

**Chạy SQL này trong Supabase SQL Editor:**
```sql
-- Add missing columns to feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'));

-- Update existing records
UPDATE feedback SET status = 'pending' WHERE status IS NULL;

-- Make rating optional
ALTER TABLE feedback ALTER COLUMN rating DROP NOT NULL;
```

### 3. Deploy lại backend

**Local development:**
```bash
cd backend
npm run start:supabase
```

**Render.com deployment:**
- Vào Render dashboard
- Chọn service `fsi-dds` backend
- Vào Environment → Add environment variables:
  - `SUPABASE_URL`: `https://abeaqpjfngcwjlcaypzh.supabase.co`
  - `SUPABASE_ANON_KEY`: `your-actual-anon-key`
- Click "Manual Deploy" để deploy lại

### 4. Kiểm tra endpoints

Sau khi deploy, test các endpoints này:
- `GET /api/admin/dashboard-stats` - Admin dashboard stats
- `GET /api/payments/history?month=2026-03` - Payment history
- `GET /api/feedback` - Feedback list
- `GET /api/orders/weekly-stats` - Weekly order stats
- `GET /api/payments?month=2026-03` - Payment data
- `GET /api/users` - Users list

## 🎯 Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Tất cả API endpoints hoạt động (không còn 404)
- ✅ Payment system dùng dữ liệu thực từ Supabase
- ✅ Admin có thể đặt cơm cho bản thân
- ✅ Không cần refresh để thấy dữ liệu mới
- ✅ Toàn bộ website dùng Supabase database

## 🚨 Lưu ý quan trọng

1. **Supabase Anon Key**: Phải lấy key thật từ dashboard, không dùng placeholder
2. **Environment Variables**: Phải set đúng trên Render.com
3. **Database Schema**: Phải chạy SQL update script trước
4. **Port**: Backend phải chạy trên port 10000

## 📞 Nếu vẫn có lỗi

Kiểm tra logs:
- Render.com: Vào service → Logs
- Local: Check terminal output
- Browser: F12 → Console → Network tab

Các lỗi thường gặp:
- `EADDRINUSE`: Port đã được sử dụng → Restart service
- `404 Not Found`: API endpoint không tồn tại → Check server.js
- `Network Error`: Không kết nối được backend → Check URL/CORS
- `Database Error`: Sai credentials hoặc schema → Check .env và SQL