# Bugfix Summary: Order-for-Others Not Showing

## Problem

Khi User A đặt cơm cho User B (sử dụng dropdown "Đặt món cho"), User B (người được đặt) KHÔNG thấy:
- ❌ Đơn hàng trong lịch sử đặt món
- ❌ Tiền trong phần thanh toán

## Root Cause

Function `getUserPaymentStats()` trong `backend/server.js` chỉ query orders có `user_id = userId`, không bao gồm orders có `ordered_for = userId`.

**Code cũ (SAI)**:
```javascript
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('id, price, paid')
  .eq('user_id', userId)  // ❌ Chỉ lấy orders placed BY user
  .is('deleted_at', null)
  .gte('created_at', `${startDate}T00:00:00`)
  .lt('created_at', `${nextMonth}T00:00:00`);
```

## Solution

Thêm OR filter để bao gồm cả orders placed BY user VÀ orders placed FOR user.

**Code mới (ĐÚNG)**:
```javascript
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('id, price, paid, user_id, ordered_for')
  .or(`user_id.eq.${userId},ordered_for.eq.${userId}`)  // ✅ Lấy cả 2 loại orders
  .is('deleted_at', null)
  .gte('created_at', `${startDate}T00:00:00`)
  .lt('created_at', `${nextMonth}T00:00:00`);
```

## Changes Made

### 1. Fixed `/api/orders/all` endpoint (lines 867-900)
- ✅ Đã có OR filter từ trước
- ✅ Thêm logging để debug
- ✅ Sửa join từ `ordered_by` thành `user_id` (đúng field name)

### 2. Fixed `getUserPaymentStats()` function (lines 1253-1310)
- ✅ Thêm OR filter: `.or(\`user_id.eq.${userId},ordered_for.eq.${userId}\`)`
- ✅ Thêm logging để debug
- ✅ Thêm fields `user_id, ordered_for` vào select để có thể log

### 3. Verified `buildPaymentStatsQuery()` function (lines 1168-1250)
- ✅ Đã có OR filter từ trước (dòng 1199)
- ✅ Không cần sửa

## Testing

### Bug Exploration Test
File: `backend/test-bug-order-for-others.js`

Test này sẽ:
1. Tạo 2 users (User A và User B)
2. User A đặt cơm cho User B
3. Kiểm tra User B có thấy order không
4. Kiểm tra User B payment có tính order không

**Trên code chưa fix**: Test sẽ FAIL (xác nhận bug tồn tại)
**Trên code đã fix**: Test sẽ PASS (xác nhận bug đã được sửa)

## Expected Behavior After Fix

### Scenario: User A đặt cơm cho User B

**User A (người đặt)**:
- ✅ Thấy order trong lịch sử (vì `user_id = User A`)
- ✅ Payment tính order (vì `user_id = User A`)

**User B (người được đặt)**:
- ✅ Thấy order trong lịch sử (vì `ordered_for = User B`) ← **FIXED**
- ✅ Payment tính order (vì `ordered_for = User B`) ← **FIXED**

**Admin**:
- ✅ Thấy tất cả orders (không filter)

## Verification Steps

1. Start backend server: `node backend/server.js`
2. Run bug test: `node backend/test-bug-order-for-others.js`
3. Expected result: Test PASSES (bug is fixed)

## Files Modified

- `backend/server.js`:
  - Line 867-900: `/api/orders/all` endpoint (added logging, fixed join)
  - Line 1253-1310: `getUserPaymentStats()` function (added OR filter)

## Files Created

- `backend/test-bug-order-for-others.js`: Bug exploration test
- `BUGFIX-ORDER-FOR-OTHERS-SUMMARY.md`: This summary document

## Status

✅ **FIXED** - Code đã được sửa và sẵn sàng để test
