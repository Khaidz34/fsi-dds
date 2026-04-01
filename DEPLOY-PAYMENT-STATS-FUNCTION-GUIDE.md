# Hướng Dẫn Deploy PostgreSQL Function lên Supabase

## Vấn đề hiện tại
Backend đang gọi function `get_payment_stats()` nhưng function này chưa được tạo trên Supabase, gây lỗi 500 khi truy cập `/api/payments/history`.

## Giải pháp

### Bước 1: Mở Supabase Dashboard
1. Truy cập: https://supabase.com/dashboard
2. Chọn project: **fsi-dds** (ID: bsmylhwyfmzbqnytnhzh)
3. Click vào **SQL Editor** ở menu bên trái

### Bước 2: Tạo Query mới
1. Click **New Query** (nút xanh)
2. Xóa template mặc định
3. Copy toàn bộ nội dung từ file `CREATE-PAYMENT-STATS-FUNCTION.sql`

### Bước 3: Chạy Query
1. Paste code vào editor
2. Click **Run** (nút xanh góc phải)
3. Chờ khoảng 5-10 giây

### Bước 4: Kiểm tra kết quả
Nếu thành công, bạn sẽ thấy:
```
Query executed successfully
```

Nếu có lỗi, kiểm tra:
- Có dấu ngoặc đóng đúng không?
- Có khoảng trắng thừa không?
- Tên function có đúng không?

### Bước 5: Xác nhận function đã tạo
1. Vào **Database** → **Functions** ở menu bên trái
2. Tìm function `get_payment_stats`
3. Nếu thấy, function đã được tạo thành công

## Nếu vẫn lỗi

### Cách 1: Xóa function cũ rồi tạo lại
```sql
DROP FUNCTION IF EXISTS get_payment_stats(TEXT, TIMESTAMP, TIMESTAMP, INTEGER, INTEGER);
```

Rồi chạy lại `CREATE-PAYMENT-STATS-FUNCTION.sql`

### Cách 2: Kiểm tra lỗi chi tiết
Chạy query này để xem lỗi:
```sql
SELECT * FROM pg_proc WHERE proname = 'get_payment_stats';
```

Nếu không có kết quả, function chưa được tạo.

## Sau khi deploy thành công

1. Refresh lại app web
2. Đăng nhập lại
3. Vào trang **Thanh toán** (admin)
4. Nếu thấy dữ liệu, lỗi đã được fix

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `function get_payment_stats does not exist` | Function chưa được tạo | Chạy CREATE-PAYMENT-STATS-FUNCTION.sql |
| `syntax error` | Có lỗi SQL | Kiểm tra dấu ngoặc, dấu phẩy |
| `permission denied` | Không có quyền | Dùng tài khoản admin Supabase |
| `column does not exist` | Tên cột sai | Kiểm tra tên cột trong bảng |

## Liên hệ hỗ trợ
Nếu vẫn gặp vấn đề, cung cấp:
- Screenshot lỗi từ Supabase
- Nội dung của `CREATE-PAYMENT-STATS-FUNCTION.sql`
- Project ID: bsmylhwyfmzbqnytnhzh
