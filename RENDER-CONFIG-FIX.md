# 🔧 Fix Render Configuration Issue

## ❌ Vấn đề
Render đang chạy command cũ: `npm run start:supabase` thay vì `npm start`

## ✅ Giải pháp

### Cách 1: Cập nhật trong Render Dashboard (Khuyến nghị)
1. Vào Render Dashboard: https://dashboard.render.com
2. Chọn service `fsi-dds-backend`
3. Vào **Settings** tab
4. Tìm **Start Command** và sửa thành:
   ```
   cd backend && npm start
   ```
5. Click **Save Changes**
6. Service sẽ tự động redeploy

### Cách 2: Manual Deploy
1. Trong Render Dashboard
2. Vào service `fsi-dds-backend`
3. Click **Manual Deploy**
4. Chọn **Deploy latest commit**

### Cách 3: Force Redeploy (Nếu cách 1-2 không work)
1. Push một commit nhỏ lên GitHub:
   ```bash
   git add .
   git commit -m "Fix render start command"
   git push origin main
   ```
2. Render sẽ tự động deploy với config mới

## 🔍 Kiểm tra Scripts
Đảm bảo `backend/package.json` có:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test:supabase": "node test-supabase.js"
  }
}
```

## 🎯 Logs thành công sẽ hiển thị:
```
=== FSI-DDS Server Starting ===
Process ID: 123
Target Port: 10000
Supabase URL: https://abeaqpjfngcwjlcaypzh.supabase.co
Supabase Key: Configured
=== SERVER STARTED ===
Status: Ready
```

## 🆘 Nếu vẫn lỗi
1. Check **Environment Variables** trong Render:
   - `SUPABASE_URL` = `https://abeaqpjfngcwjlcaypzh.supabase.co`
   - `SUPABASE_ANON_KEY` = [your anon key]
2. Verify Supabase project active
3. Run `npm run test:supabase` locally để test connection