# Fix Supabase Resource Exhaustion

## Vấn đề hiện tại
- Supabase báo "exhausting multiple resources"
- API trả về 500 error
- Database có thể chưa có data

## Giải pháp

### 1. Cấu hình Supabase Anon Key (QUAN TRỌNG NHẤT)

Vào Render Dashboard:
1. https://dashboard.render.com → service "fsi-dds-backend"
2. Tab "Environment"
3. Tìm `SUPABASE_ANON_KEY`
4. Lấy key từ: https://supabase.com/dashboard/project/abeaqpjfngcwjlcaypzh/settings/api
5. Copy "anon public" key và paste vào Render
6. Click "Save Changes"
7. Redeploy service

### 2. Tạo Sample Data

Vào Supabase SQL Editor:
1. https://supabase.com/dashboard/project/abeaqpjfngcwjlcaypzh/sql/new
2. Chạy file `SUPABASE-SETUP.sql` (nếu chưa chạy)
3. Chạy file `CREATE-SAMPLE-DATA.sql` để tạo:
   - Admin user (username: admin, password: admin123)
   - Menu mẫu cho hôm nay
   - 3 món ăn mẫu

### 3. Thêm Indexes để tối ưu performance

Chạy file `ADD-INDEXES.sql` trong Supabase SQL Editor để:
- Tăng tốc độ query
- Giảm resource usage
- Cải thiện performance

### 4. Kiểm tra Connection Pooling

Supabase free tier giới hạn:
- 60 concurrent connections
- 500MB database
- 2GB bandwidth/month

Nếu vượt quá, cần:
- Upgrade lên paid plan
- Hoặc tối ưu queries
- Hoặc thêm caching

### 5. Test sau khi fix

```bash
# Test health
curl https://fsi-dds.onrender.com/health

# Test menu API
curl https://fsi-dds.onrender.com/api/menu/today

# Test login
curl -X POST https://fsi-dds.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 6. Monitoring

Vào Supabase Dashboard → Reports để xem:
- Database size
- API requests
- Connection count

Nếu vẫn exhausting resources, cần:
- Giảm polling frequency ở frontend
- Thêm caching layer
- Optimize queries
- Upgrade plan

## Thứ tự ưu tiên

1. ✅ Fix SUPABASE_ANON_KEY (QUAN TRỌNG NHẤT)
2. ✅ Tạo sample data
3. ✅ Thêm indexes
4. ⏳ Monitor và optimize nếu cần
