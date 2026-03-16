# Hướng dẫn Deploy miễn phí lên Render.com

## Phương án 1: Render.com (Khuyến nghị - Hoàn toàn miễn phí)

### Ưu điểm:
- ✅ Hoàn toàn miễn phí (750 giờ/tháng)
- ✅ Hỗ trợ SQLite với persistent disk
- ✅ Auto-deploy từ GitHub
- ✅ SSL certificate miễn phí
- ✅ Đủ cho 100+ người dùng

### Bước 1: Chuẩn bị GitHub Repository

1. **Push code lên GitHub:**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Bước 2: Deploy Backend trên Render

1. **Truy cập:** https://render.com và đăng ký/đăng nhập
2. **Tạo Web Service:**
   - Click "New" → "Web Service"
   - Connect GitHub repository của bạn
   - Chọn repository chứa project

3. **Cấu hình Backend:**
   - **Name:** `fsi-dds-backend`
   - **Region:** Singapore (gần Việt Nam nhất)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `cd backend && npm install --production`
   - **Start Command:** `cd backend && npm run start:sqlite`
   - **Plan:** Free

4. **Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   DATABASE_PATH=/opt/render/project/src/data/dining.db
   BACKUP_ENABLED=true
   PORT=10000
   ```

5. **Persistent Disk:**
   - Trong Advanced settings
   - Add Disk: Name `fsi-dds-data`, Mount Path `/opt/render/project/src/data`, Size 1GB

6. **Deploy:** Click "Create Web Service"

### Bước 3: Deploy Frontend trên Render

1. **Tạo Static Site:**
   - Click "New" → "Static Site"
   - Chọn cùng repository

2. **Cấu hình Frontend:**
   - **Name:** `fsi-dds-frontend`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

3. **Environment Variables:**
   ```
   VITE_API_URL=https://fsi-dds-backend.onrender.com
   ```
   (Thay `fsi-dds-backend` bằng tên service backend của bạn)

4. **Deploy:** Click "Create Static Site"

### Bước 4: Cấu hình Custom Domain (Tùy chọn)

1. **Mua domain miễn phí:** Freenom.com hoặc dùng subdomain
2. **Trong Render Dashboard:**
   - Vào Settings của từng service
   - Add Custom Domain
   - Cấu hình DNS records

### Bước 5: Kiểm tra và Test

1. **Backend URL:** `https://your-backend-name.onrender.com`
2. **Frontend URL:** `https://your-frontend-name.onrender.com`
3. **Test API:** `https://your-backend-name.onrender.com/api/menu/today`

---

## Phương án 2: Vercel + Railway (Backup)

### Vercel cho Frontend (Miễn phí)
1. Truy cập vercel.com
2. Import GitHub repository
3. Set Environment Variables:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```

### Railway cho Backend (Miễn phí $5 credit/tháng)
1. Truy cập railway.app
2. Deploy from GitHub
3. Sử dụng file `railway.json` có sẵn

---

## Phương án 3: Netlify + Render (Backup)

### Netlify cho Frontend
1. Drag & drop folder `dist` sau khi build
2. Hoặc connect GitHub repository

### Render cho Backend
- Như hướng dẫn ở Phương án 1

---

## Lưu ý quan trọng:

### 1. Database Backup
- Render free tier có thể restart service
- Database sẽ được lưu trong persistent disk
- Nên setup backup định kỳ

### 2. Performance
- Free tier có thể "sleep" sau 15 phút không hoạt động
- Lần đầu truy cập có thể chậm (cold start)
- Đủ cho 100 người dùng bình thường

### 3. Monitoring
- Render cung cấp logs miễn phí
- Có thể monitor qua dashboard

### 4. Scaling
- Nếu cần nhiều tài nguyên hơn, có thể upgrade plan
- Hoặc chuyển sang VPS như DigitalOcean

---

## Troubleshooting

### Lỗi thường gặp:
1. **Build failed:** Kiểm tra dependencies trong package.json
2. **Database error:** Kiểm tra DATABASE_PATH environment variable
3. **CORS error:** Kiểm tra VITE_API_URL trong frontend
4. **404 on refresh:** Cần cấu hình redirect rules cho SPA

### Liên hệ hỗ trợ:
- Render Support: help@render.com
- Community: render.com/community