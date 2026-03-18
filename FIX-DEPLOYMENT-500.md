# Fix Deployment 500 Error

## Vấn đề
- API trả về 500 error
- Backend không kết nối được Supabase
- `SUPABASE_ANON_KEY` chưa được cấu hình đúng

## Giải pháp

### Bước 1: Lấy Supabase Credentials

1. Vào Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào Settings → API
4. Copy 2 giá trị:
   - **Project URL**: `https://abeaqpjfngcwjlcaypzh.supabase.co`
   - **anon public key**: (một chuỗi JWT dài)

### Bước 2: Update Environment Variables trên Render

1. Vào Render Dashboard: https://dashboard.render.com
2. Chọn service "fsi-dds-backend"
3. Click tab "Environment"
4. Tìm và update các biến:
   - `SUPABASE_URL`: `https://abeaqpjfngcwjlcaypzh.supabase.co`
   - `SUPABASE_ANON_KEY`: paste anon public key từ Supabase
   - `JWT_SECRET`: giữ nguyên hoặc generate random string dài
5. Click "Save Changes"

### Bước 3: Redeploy

1. Vào tab "Manual Deploy"
2. Click "Deploy latest commit"
3. Đợi deploy xong (2-3 phút)

### Bước 4: Kiểm tra

Sau khi deploy xong, test API:
```bash
curl https://fsi-dds.onrender.com/health
curl https://fsi-dds.onrender.com/api/menu/today
```

Nếu thành công, website sẽ hoạt động bình thường tại https://fsi-dds.onrender.com

## Lưu ý

- KHÔNG commit Supabase anon key vào Git
- Chỉ cấu hình trên Render Dashboard
- Anon key là public key, an toàn để dùng ở frontend
