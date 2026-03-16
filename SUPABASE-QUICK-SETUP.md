# 🚀 Setup Supabase Nhanh - 5 phút

## ⚡ **Bước 1: Lấy Supabase Keys**

1. **Vào:** https://supabase.com/dashboard
2. **Chọn project:** `fsi-dds`
3. **Settings** → **API**
4. **Copy 2 thông tin:**

**Project URL:**
```
https://abeaqpjfngcwjlcaypzh.supabase.co
```

**anon public key:** (Dài ~200 ký tự, bắt đầu `eyJ`)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpm...
```

## ⚡ **Bước 2: Setup Database**

1. **SQL Editor** → **New Query**
2. **Copy paste** toàn bộ từ `SUPABASE-SETUP.sql`
3. **Run** → Thấy message "✅ FSI-DDS Database Schema Created Successfully!"

## ⚡ **Bước 3: Cấu hình Render**

1. **Render Dashboard** → **Backend Service** → **Environment**
2. **Add/Update variables:**

```
SUPABASE_URL=https://abeaqpjfngcwjlcaypzh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZWFxcGpm...
```

3. **Save Changes**

## ⚡ **Bước 4: Deploy**

1. **Deploy** tab → **Manual Deploy**
2. **Kiểm tra logs:**

```
🚀 Supabase Configuration:
   URL: https://abeaqpjfngcwjlcaypzh.supabase.co
   Key: ✅ Configured
✅ Tables already exist
👥 Found 4 users
🚀 Server đang chạy tại http://localhost:10000
```

## ⚡ **Bước 5: Test**

1. **Frontend URL** → Login:
   - `admin` / `admin123`
   - `toan` / `user123`

2. **Tạo menu, đặt cơm** → Kiểm tra data trong Supabase

## 🔍 **Troubleshooting:**

**❌ "Missing Supabase credentials"**
→ Kiểm tra SUPABASE_URL và SUPABASE_ANON_KEY

**❌ "Tables need to be created"**
→ Chạy lại SQL từ SUPABASE-SETUP.sql

**❌ Login failed**
→ Kiểm tra users table có 4 users không

**✅ Success:** Data sẽ xuất hiện trong Supabase Table Editor!