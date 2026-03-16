# 🚀 FSI-DDS - Chỉ sử dụng Supabase Database

## ✅ Đã dọn dẹp
- ❌ Xóa tất cả file SQLite server
- ❌ Xóa SQLite dependencies 
- ❌ Xóa các file backup/reset SQLite
- ✅ Chỉ giữ lại Supabase server (`backend/server.js`)
- ✅ Cập nhật package.json đơn giản
- ✅ Cập nhật render.yaml sử dụng `npm start`

## 📁 Cấu trúc Backend hiện tại
```
backend/
├── server.js              # Server chính (Supabase only)
├── test-supabase.js        # Test kết nối Supabase
├── debug-port.js           # Debug port conflicts
└── package.json            # Dependencies đã dọn dẹp
```

## 🚀 Các bước setup

### Bước 1: Tạo Database Schema trong Supabase
1. Vào: https://supabase.com/dashboard
2. Chọn project: `abeaqpjfngcwjlcaypzh`
3. Vào **SQL Editor**
4. Copy toàn bộ nội dung file `SUPABASE-SETUP.sql`
5. Click **Run**

### Bước 2: Lấy Supabase ANON Key
1. Trong Supabase Dashboard → **Settings** → **API**
2. Copy **anon public** key (bắt đầu bằng `eyJ...`)

### Bước 3: Cập nhật Render Environment Variables
1. Vào Render Dashboard → Service → **Environment**
2. Cập nhật:
   ```
   SUPABASE_URL=https://abeaqpjfngcwjlcaypzh.supabase.co
   SUPABASE_ANON_KEY=[paste key từ bước 2]
   ```

### Bước 4: Deploy
1. Push code lên GitHub
2. Render sẽ tự động deploy với `npm start`

## 🔍 Logs thành công
```
=== FSI-DDS Server Starting ===
Process ID: 123
Target Port: 10000
Supabase URL: https://abeaqpjfngcwjlcaypzh.supabase.co
Supabase Key: Configured
Initializing Supabase tables...
Tables already exist
Found 4 users
=== SERVER STARTED ===
URL: http://localhost:10000
Database: Supabase PostgreSQL
Status: Ready
```

## 🎯 Lợi ích
- ✅ Chỉ 1 database duy nhất (Supabase)
- ✅ Code đơn giản, dễ maintain
- ✅ Không còn conflict giữa SQLite và Supabase
- ✅ Database persistent hoàn toàn
- ✅ Miễn phí với Supabase free tier

## 📋 API Endpoints có sẵn
- `GET /health` - Health check
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user
- `GET /api/menu/today` - Menu hôm nay
- `POST /api/menu/multilingual` - Tạo menu
- `GET /api/orders/today` - Đơn hàng hôm nay
- `POST /api/orders` - Tạo đơn hàng
- `PUT /api/orders/:id` - Sửa đơn hàng
- `DELETE /api/orders/:id` - Xóa đơn hàng (admin only)
- `GET /api/users/list` - Danh sách users
- `GET /api/payments/today` - Thanh toán hôm nay
- `POST /api/payments` - Tạo thanh toán
- `GET /api/admin/stats` - Thống kê admin
- `POST /api/feedback` - Gửi feedback