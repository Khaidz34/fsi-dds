# 🔍 Debug Deployment Issues

## ❌ Vấn đề hiện tại
- **401 Unauthorized**: "Tài khoản không tồn tại" / "Mật khẩu không đúng"
- **404 Not Found**: `/api/auth/register` endpoint
- Backend đang chạy nhưng database chưa có users

## 🔍 Bước 1: Kiểm tra Backend Logs

### Xem logs trong Render Dashboard:
1. Vào https://dashboard.render.com
2. Click vào service **`fsi-dds-backend`**
3. Click tab **"Logs"**
4. Tìm các dòng log:
   ```
   === FSI-DDS Server Starting ===
   Supabase URL: https://abeaqpjfngcwjlcaypzh.supabase.co
   Supabase Key: Configured (hoặc Missing)
   Initializing Supabase tables...
   Found X users (hoặc Found null users)
   ```

## 🔍 Bước 2: Kiểm tra Environment Variables

### Trong Render Dashboard → Settings → Environment:
Đảm bảo có đầy đủ:
```
NODE_ENV=production
JWT_SECRET=[auto-generated]
SUPABASE_URL=https://abeaqpjfngcwjlcaypzh.supabase.co
SUPABASE_ANON_KEY=[your-supabase-anon-key]
PORT=10000
```

**⚠️ Nếu thiếu SUPABASE_ANON_KEY:**
1. Vào https://supabase.com/dashboard
2. Chọn project của bạn
3. **Settings** → **API**
4. Copy **"anon public"** key (bắt đầu bằng `eyJ...`)
5. Paste vào Render Environment Variables

## 🔍 Bước 3: Kiểm tra Supabase Database

### Test Health Endpoint:
Vào: https://fsi-dds.onrender.com/health

**Kết quả mong đợi:**
```json
{
  "status": "ok",
  "database": "connected",
  "users": 4
}
```

**Nếu lỗi:**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "..."
}
```

### Tạo Database Schema (Nếu chưa có):
1. Vào https://supabase.com/dashboard
2. Chọn project: `abeaqpjfngcwjlcaypzh`
3. **SQL Editor**
4. Copy toàn bộ nội dung file `SUPABASE-SETUP.sql`
5. Paste và click **"Run"**
6. Kiểm tra **Table Editor** → Phải có các bảng: `users`, `menus`, `dishes`, `orders`, `payments`, `feedback`

## 🔍 Bước 4: Test API Endpoints

### Test từ browser console:
```javascript
// Test health
fetch('https://fsi-dds.onrender.com/health')
  .then(r => r.json())
  .then(console.log);

// Test login với user mặc định
fetch('https://fsi-dds.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'admin123'})
})
.then(r => r.json())
.then(console.log);
```

## 🔧 Các lỗi thường gặp:

### 1. "Found null users" trong logs
- **Nguyên nhân**: Database chưa có bảng users
- **Giải pháp**: Chạy `SUPABASE-SETUP.sql` trong Supabase SQL Editor

### 2. "SUPABASE_ANON_KEY missing"
- **Nguyên nhân**: Thiếu environment variable
- **Giải pháp**: Thêm key từ Supabase Dashboard → Settings → API

### 3. "404 Not Found" cho API endpoints
- **Nguyên nhân**: Server chưa start hoặc routes chưa load
- **Giải pháp**: Check logs xem server có start thành công không

### 4. CORS errors
- **Nguyên nhân**: Frontend và backend khác domain
- **Giải pháp**: Server đã config CORS cho *.onrender.com

## 🎯 Checklist Debug:

- [ ] Backend logs hiển thị "SERVER STARTED"
- [ ] Environment variables đầy đủ
- [ ] Supabase project active
- [ ] Database schema đã tạo (có 6 bảng)
- [ ] Health endpoint trả về status "ok"
- [ ] Login với admin/admin123 thành công

## 🆘 Nếu vẫn lỗi:

1. **Redeploy service**: Manual Deploy trong Render
2. **Restart Supabase project**: Pause/Resume trong Supabase
3. **Check Supabase logs**: Logs tab trong Supabase Dashboard
4. **Verify API URL**: Đảm bảo frontend gọi đúng backend URL