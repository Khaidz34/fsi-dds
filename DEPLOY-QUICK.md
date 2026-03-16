# 🚀 Deploy Nhanh - Hoàn toàn Miễn phí

## Render.com - 5 phút setup

### 1. Push code lên GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy Backend (2 phút)
1. Vào https://render.com → Đăng ký/Đăng nhập
2. **New** → **Web Service** → Chọn GitHub repo
3. **Settings:**
   - Name: `fsi-dds-backend`
   - Build: `cd backend && npm install --production`
   - Start: `cd backend && npm run start:sqlite`
   - Plan: **Free**

4. **Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=make-this-very-long-and-random-secret-key-123456789
   DATABASE_PATH=/opt/render/project/src/data/dining.db
   PORT=10000
   ```

5. **Advanced** → **Add Disk:**
   - Name: `data`
   - Mount: `/opt/render/project/src/data`
   - Size: 1GB

6. **Create Web Service**

### 3. Deploy Frontend (2 phút)
1. **New** → **Static Site** → Chọn cùng GitHub repo
2. **Settings:**
   - Name: `fsi-dds-frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`

3. **Environment Variables:**
   ```
   VITE_API_URL=https://fsi-dds-backend.onrender.com
   ```
   *(Thay `fsi-dds-backend` bằng tên backend service của bạn)*

4. **Create Static Site**

### 4. Xong! 🎉
- **Frontend:** `https://your-frontend-name.onrender.com`
- **Backend:** `https://your-backend-name.onrender.com`

---

## ⚡ Lưu ý quan trọng:

### Free Tier Limits:
- ✅ 750 giờ/tháng (đủ chạy 24/7)
- ✅ 1GB persistent storage
- ✅ SSL certificate miễn phí
- ✅ Đủ cho 100+ người dùng đồng thời

### Performance:
- Lần đầu truy cập có thể chậm 10-15s (cold start)
- Sau đó chạy bình thường
- Service "ngủ" sau 15 phút không hoạt động

### Backup:
- Database được lưu trong persistent disk
- Tự động backup khi deploy
- Có thể download database từ Render dashboard

---

## 🔧 Troubleshooting:

**Build failed?**
- Kiểm tra logs trong Render dashboard
- Đảm bảo `package.json` có đúng dependencies

**CORS error?**
- Kiểm tra `VITE_API_URL` trong frontend environment
- Đảm bảo backend URL đúng

**Database error?**
- Kiểm tra `DATABASE_PATH` environment variable
- Đảm bảo persistent disk được mount đúng

**404 khi refresh page?**
- Render tự động handle SPA routing
- Nếu vẫn lỗi, check build output

---

## 💡 Tips:

1. **Custom Domain:** Có thể add domain miễn phí từ Freenom
2. **Monitoring:** Xem logs realtime trong Render dashboard  
3. **Scaling:** Nếu cần nhiều tài nguyên, upgrade plan chỉ $7/tháng
4. **Backup:** Download database định kỳ từ dashboard

**Cần hỗ trợ?** Render có support chat 24/7 miễn phí!