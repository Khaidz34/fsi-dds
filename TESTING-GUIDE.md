# Testing Guide: Order-for-Others Fix

## Vấn đề đã sửa

Backend đã được sửa để User B có thể thấy orders được đặt cho họ. Các thay đổi:

1. ✅ `/api/orders/all` - Đã có OR filter
2. ✅ `getUserPaymentStats()` - Đã thêm OR filter
3. ✅ `buildPaymentStatsQuery()` - Đã có OR filter từ trước

## Các bước test

### Bước 1: Verify Database Schema

Chạy script SQL để kiểm tra foreign keys:
```bash
# Mở Supabase SQL Editor và chạy:
cat VERIFY-FOREIGN-KEYS.sql
```

Kết quả mong đợi:
- Foreign keys `ordered_by` và `ordered_for` đều reference đến `users(id)`
- Có data trong bảng orders với `ordered_for` khác `user_id`

### Bước 2: Restart Backend Server

```bash
# Stop server hiện tại (Ctrl+C)
# Start lại server
node backend/server.js
```

### Bước 3: Clear Frontend Cache

Nếu đang dùng development server:
```bash
# Stop frontend dev server (Ctrl+C)
# Clear cache
rm -rf node_modules/.vite
# Start lại
npm run dev
```

Nếu đang dùng production build:
```bash
# Rebuild frontend
npm run build
# Copy build vào backend/public
cp -r dist/* backend/public/
```

### Bước 4: Test End-to-End

#### Test Case 1: User A đặt cho User B

1. **Login as User A**
   - Username: user_a
   - Password: (your password)

2. **Đặt món cho User B**
   - Chọn món ăn
   - Trong dropdown "Đặt món cho:", chọn User B
   - Click "Đặt món"

3. **Verify User A sees order**
   - Vào tab "Lịch sử đặt món"
   - ✅ Phải thấy order vừa đặt
   - ✅ Cột "Người ăn" hiển thị tên User B

4. **Verify User A payment**
   - Vào tab "Thanh toán"
   - ✅ Phải thấy order được tính vào tổng tiền

5. **Logout và Login as User B**
   - Logout User A
   - Login as User B

6. **Verify User B sees order**
   - Vào tab "Lịch sử đặt món"
   - ✅ Phải thấy order mà User A đặt cho mình
   - ✅ Cột "Người ăn" hiển thị tên User B (chính mình)

7. **Verify User B payment**
   - Vào tab "Thanh toán"
   - ✅ Phải thấy order được tính vào tổng tiền

### Bước 5: Check Backend Logs

Khi User B query orders, backend logs phải hiển thị:
```
🔍 Applying OR filter for user <User B ID>: user_id.eq.<User B ID>,ordered_for.eq.<User B ID>
📋 All orders fetched: 1
   - Orders placed by user: 0
   - Orders placed for user: 1
```

Khi User B query payment:
```
💰 User payment stats: userId=<User B ID>, month=2026-03
🔍 Querying orders with OR filter: user_id.eq.<User B ID>,ordered_for.eq.<User B ID>
  📊 1 orders (40000đ), paid: 0 orders, unpaid: 1 orders, money remaining: 40000đ
     - Orders placed by user: 0
     - Orders placed for user: 1
```

## Troubleshooting

### Vấn đề: User B vẫn không thấy order

**Kiểm tra:**
1. Backend server đã restart chưa?
2. Frontend đã clear cache và rebuild chưa?
3. Database có foreign keys đúng chưa? (chạy VERIFY-FOREIGN-KEYS.sql)
4. Order có `ordered_for = User B ID` chưa? (check trong database)

**Debug:**
```bash
# Check backend logs khi User B query
# Phải thấy OR filter được apply
```

### Vấn đề: Frontend hiển thị "N/A" cho người ăn

**Nguyên nhân:** Join với `ordered_for` không trả về user data

**Giải pháp:**
1. Verify foreign key `ordered_for` references `users(id)`
2. Check Supabase RLS policies (phải disable hoặc allow read)
3. Thử query trực tiếp trong Supabase SQL Editor:
```sql
SELECT 
    o.*,
    u.fullname as receiver_name
FROM orders o
LEFT JOIN users u ON o.ordered_for = u.id
WHERE o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT 10;
```

### Vấn đề: OR filter không hoạt động

**Kiểm tra syntax:**
```javascript
// Đúng
.or(`user_id.eq.${userId},ordered_for.eq.${userId}`)

// Sai
.or('user_id.eq.' + userId + ' OR ordered_for.eq.' + userId)
```

**Alternative approach nếu OR filter vẫn không work:**
```javascript
// Query 1: Orders placed by user
const { data: ordersByUser } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .is('deleted_at', null);

// Query 2: Orders placed for user  
const { data: ordersForUser } = await supabase
  .from('orders')
  .select('*')
  .eq('ordered_for', userId)
  .is('deleted_at', null);

// Merge and deduplicate
const allOrders = [...ordersByUser, ...ordersForUser];
const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
```

## Expected Results

Sau khi fix:
- ✅ User A thấy orders họ đặt (cả cho bản thân và cho người khác)
- ✅ User B thấy orders được đặt cho họ (bởi bất kỳ ai)
- ✅ Payment calculation đúng cho cả User A và User B
- ✅ Admin thấy tất cả orders

## Files Changed

- `backend/server.js`:
  - Line 867-900: `/api/orders/all` endpoint
  - Line 1253-1310: `getUserPaymentStats()` function
- `backend/test-bug-order-for-others.js`: Bug exploration test
- `BUGFIX-ORDER-FOR-OTHERS-SUMMARY.md`: Summary document
- `VERIFY-FOREIGN-KEYS.sql`: SQL verification script
- `TESTING-GUIDE.md`: This testing guide
