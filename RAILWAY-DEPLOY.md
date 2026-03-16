# 🚂 Deploy lên Railway (Miễn phí + Persistent Database)

## ✅ **Ưu điểm Railway:**
- Miễn phí $5 credit/tháng
- Hỗ trợ persistent volumes
- SQLite database không bị reset
- Dễ setup hơn Render

## 🚀 **Hướng dẫn Deploy:**

### **Bước 1: Tạo tài khoản Railway**
1. Vào https://railway.app
2. Đăng nhập bằng GitHub account
3. Verify email nếu cần

### **Bước 2: Deploy Backend**
1. **New Project** → **Deploy from GitHub repo**
2. **Chọn repository:** `fsi-dds`
3. **Railway sẽ tự động detect** và deploy

### **Bước 3: Cấu hình Environment Variables**
1. **Click vào service** vừa tạo
2. **Variables tab**
3. **Thêm variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   DATABASE_PATH=/app/data/gourmetgrid.db
   BACKUP_ENABLED=true
   ```

### **Bước 4: Cấu hình Persistent Volume**
1. **Settings tab**
2. **Volumes section**
3. **Add Volume:**
   - **Mount Path:** `/app/data`
   - **Size:** 1GB (miễn phí)

### **Bước 5: Deploy Frontend**
1. **New Project** → **Deploy from GitHub repo**
2. **Chọn cùng repository** `fsi-dds`
3. **Settings** → **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-name.railway.app
   ```

### **Bước 6: Cấu hình Build**
**Backend:**
- **Build Command:** `cd backend && npm install --production`
- **Start Command:** `cd backend && npm run start:sqlite`

**Frontend:**
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve -s dist -p $PORT`

---

## 🔧 **Cập nhật Code cho Railway:**