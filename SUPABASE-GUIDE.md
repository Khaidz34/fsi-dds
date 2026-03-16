# 🔥 Hướng dẫn Setup Supabase

## 🚀 **Bước 1: Tạo Supabase Project**

1. **Truy cập:** https://supabase.com
2. **Sign up** với GitHub account
3. **New Project:**
   - **Name:** `fsi-dds`
   - **Database Password:** Tạo password mạnh (lưu lại!)
   - **Region:** Southeast Asia (Singapore)
4. **Create Project** (chờ 2-3 phút)

## 🗄️ **Bước 2: Setup Database Schema**

1. **Supabase Dashboard** → **SQL Editor**
2. **Copy toàn bộ nội dung** từ file `SUPABASE-SETUP.sql`
3. **Paste vào SQL Editor**
4. **Click "Run"**
5. **Kiểm tra:** Sẽ thấy message "✅ FSI-DDS Database Schema Created Successfully!"

## 🔑 **Bước 3: Lấy API Credentials**

1. **Settings** → **API**
2. **Copy 2 thông tin này:**
   - **Project URL:** `https://xxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## ⚙️ **Bước 4: Cấu hình Render**

1. **Render Dashboard** → **Backend Service** → **Environment**
2. **Thêm 2 variables:**
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Save Changes**

## 🚀 **Bước 5: Deploy**

1. **Deploy** tab → **Manual Deploy**
2. **Deploy Latest Commit**
3. **Kiểm tra logs:**
   ```
   🚀 Supabase Configuration:
      URL: https://xxx.supabase.co
      Key: ✅ Configured
   ✅ Tables already exist
   👥 Found 4 users
   🚀 Server đang chạy tại http://localhost:10000
   ```

## ✅ **Bước 6: Test**

1. **Truy cập frontend URL**
2. **Login với:**
   - `admin` / `admin123`
   - `toan` / `user123`
   - `user1` / `user123`
   - `user2` / `user123`

## 🎯 **Kết quả:**

- ✅ **Database persistent** - không bao giờ bị reset
- ✅ **4 default users** sẵn sàng
- ✅ **Hoàn toàn miễn phí** (500MB database)
- ✅ **Managed backup** tự động
- ✅ **Real-time dashboard** để quản lý data

## 🔧 **Quản lý Database:**

### **Xem dữ liệu:**
1. **Supabase Dashboard** → **Table Editor**
2. **Chọn table:** users, orders, menus, etc.
3. **Xem/Edit** data trực tiếp

### **Backup:**
1. **Settings** → **Database**
2. **Download backup** (SQL format)

### **Monitor:**
1. **Reports** → **Database**
2. **Xem usage, performance**

## 🆘 **Troubleshooting:**

### **Lỗi "Missing Supabase credentials":**
- Kiểm tra SUPABASE_URL và SUPABASE_ANON_KEY trong Render
- Đảm bảo không có space thừa

### **Lỗi "Tables need to be created":**
- Chạy lại SQL từ file SUPABASE-SETUP.sql
- Kiểm tra SQL Editor có lỗi không

### **Login failed:**
- Kiểm tra users table có data không
- Password hash phải đúng format bcrypt

## 💡 **Tips:**

1. **Supabase Dashboard** rất mạnh - dùng để debug
2. **Row Level Security** có thể enable sau
3. **Real-time subscriptions** có thể dùng cho notifications
4. **Storage** miễn phí 1GB cho upload files

**Database sẽ không bao giờ bị reset nữa!** 🎉