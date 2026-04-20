# Deploy Fixed SQL Functions - Chỉ tính orders người nhận

## Vấn đề
SQL functions hiện tại đang tính SAI:
- Đang tính cả orders mà user đặt cho người khác (`user_id = user.id`)
- VÀ orders người khác đặt cho user (`ordered_for = user.id`)

**Ví dụ sai:**
- Khải Nguyễn đặt 2 orders cho người khác → Không nên tính vào nợ của Khải Nguyễn
- Nhưng SQL cũ tính cả 2 orders này → Khải Nguyễn bị hiện là có nợ

## Giải pháp
Chỉ tính orders mà user là **người nhận** (`ordered_for = user.id`), KHÔNG tính orders mà user đặt cho người khác.

## Các bước deploy

### Bước 1: Vào Supabase Dashboard
1. Mở https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)

### Bước 2: Deploy function `get_payment_stats_debt_only`
1. Click **New Query**
2. Copy toàn bộ nội dung file `CREATE-PAYMENT-STATS-DEBT-ONLY-FIXED.sql`
3. Paste vào SQL Editor
4. Click **Run** (hoặc nhấn Ctrl+Enter)
5. Đợi thông báo "Success. No rows returned"

### Bước 3: Deploy function `get_debt_users_count`
1. Click **New Query** (hoặc xóa query cũ)
2. Copy toàn bộ nội dung file `GET-DEBT-USERS-COUNT-FIXED.sql`
3. Paste vào SQL Editor
4. Click **Run** (hoặc nhấn Ctrl+Enter)
5. Đợi thông báo "Success. No rows returned"

### Bước 4: Kiểm tra
1. Refresh trang admin payments
2. Kiểm tra xem Khải Nguyễn còn hiện không
3. Nếu Khải Nguyễn không đặt món cho chính mình thì sẽ không hiện trong danh sách

## Sự khác biệt

### SQL CŨ (SAI):
```sql
LEFT JOIN orders ON (
  (orders.user_id = users.id OR orders.ordered_for = users.id)  -- ❌ SAI
  AND orders.deleted_at IS NULL
  AND orders.created_at >= p_start_date
  AND orders.created_at < p_next_month
)
```

### SQL MỚI (ĐÚNG):
```sql
LEFT JOIN orders ON (
  orders.ordered_for = users.id  -- ✅ ĐÚNG - chỉ tính orders người nhận
  AND orders.deleted_at IS NULL
  AND orders.created_at >= p_start_date
  AND orders.created_at < p_next_month
)
```

## Logic đúng
- **User A đặt món cho User B** → User B phải trả tiền (vì User B là người nhận)
- **User A đặt món cho chính mình** → User A phải trả tiền (vì User A là người nhận)
- **User A đặt món cho User B** → User A KHÔNG phải trả tiền (vì User A không phải người nhận)

## Files
- `CREATE-PAYMENT-STATS-DEBT-ONLY-FIXED.sql` - Function chính để lấy danh sách users có nợ
- `GET-DEBT-USERS-COUNT-FIXED.sql` - Function đếm số users có nợ
