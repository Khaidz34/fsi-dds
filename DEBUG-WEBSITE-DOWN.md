# 🚨 Website Down - Debug Guide

## Tình trạng hiện tại
- **Frontend**: https://fsi-dds-fontend.onrender.com - Không truy cập được
- **Backend**: https://fsi-dds.onrender.com - Trả về 404/timeout
- **Thời gian**: 18/03/2026
- **Render Status**: All systems operational ✅

## Nguyên nhân có thể

### 1. Free Tier Sleep (Khả năng cao nhất)
- Render free tier tự động sleep sau 15 phút không hoạt động
- Service cần 30-60 giây để "wake up"
- **Giải pháp**: Đợi hoặc gọi API để đánh thức

### 2. Deployment Failed
- Commit gần đây có thể gây lỗi build
- Code changes trong hooks có thể gây vấn đề
- **Kiểm tra**: Render dashboard logs

### 3. Environment Variables Missing
- Supabase keys có thể bị mất
- JWT secret không được set
- **Kiểm tra**: Render environment settings

### 4. Database Connection Issues
- Supabase có thể có vấn đề
- Connection string sai
- **Kiểm tra**: Supabase dashboard

## Các bước khắc phục

### Bước 1: Wake Up Services (Thử ngay)
```bash
# Gọi API để đánh thức backend
curl https://fsi-dds.onrender.com/api/menu/today

# Gọi frontend để đánh thức
curl https://fsi-dds-fontend.onrender.com
```

### Bước 2: Kiểm tra Render Dashboard
1. Đăng nhập https://dashboard.render.com
2. Kiểm tra services:
   - `fsi-dds` (backend)
   - `fsi-dds-fontend` (frontend)
3. Xem logs để tìm lỗi
4. Kiểm tra deployment status

### Bước 3: Kiểm tra Environment Variables
**Backend cần:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `PORT`
- `FRONTEND_URL`

**Frontend cần:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Bước 4: Manual Redeploy
Nếu service bị stuck:
1. Vào Render dashboard
2. Chọn service
3. Click "Manual Deploy"
4. Chọn latest commit

### Bước 5: Rollback (Nếu cần)
Nếu commit gần đây gây lỗi:
```bash
# Rollback về commit trước
git revert 9c64c45
git push origin main
```

## Commits gần đây (có thể gây lỗi)

### 9c64c45 - Remove auto refresh for regular users
- Sửa `usePayments.ts`
- Sửa `useOrders.ts` 
- Sửa `useMonthlyOrders.ts`
- **Risk**: Medium - thay đổi logic hooks

### 9ff5703 - Add load test summary
- Chỉ thêm documentation
- **Risk**: Low

### fe9524f - Increase rate limit to 1000
- Sửa `backend/server.js`
- **Risk**: Low

### 248a99d - Load test performance fixes
- Nhiều thay đổi backend/frontend
- **Risk**: High - major changes

## Kiểm tra nhanh

### Test Backend Health
```bash
curl -f https://fsi-dds.onrender.com/api/menu/today
```

### Test Frontend
```bash
curl -f https://fsi-dds-fontend.onrender.com
```

### Test Database
```bash
curl -f https://fsi-dds.onrender.com/api/users
```

## Thông tin liên hệ Render Support
- Email: support@render.com
- Community: community.render.com
- Status: status.render.com

## Temporary Workaround
Nếu cần truy cập ngay:
1. Deploy local version
2. Sử dụng ngrok để expose
3. Hoặc deploy lên Vercel/Netlify tạm thời

---

**Cập nhật**: Đang kiểm tra và khắc phục...
**Trạng thái**: 🔴 Down
**ETA**: 15-30 phút để khắc phục