# Fix: Payment List Not Updating After Mark-Paid

## Vấn đề
Khi admin đánh dấu thanh toán cho người dùng và người đó hết nợ, họ vẫn hiển thị trong danh sách admin payments thay vì biến mất ngay lập tức.

## Nguyên nhân
Trong `src/hooks/useAdminPayments.ts`, hàm `markAsPaid` gọi `fetchUserPayments()` để refresh data sau khi đánh dấu thanh toán. Tuy nhiên, `fetchUserPayments()` có **debouncing logic** (chặn request nếu gọi quá nhanh trong vòng 1 giây), khiến cho việc refresh bị bỏ qua.

```typescript
// Debounce: don't fetch more than once per 1 second
const now = Date.now();
if (now - lastUpdateTime < 1000) {
  console.log('⏱️  Debouncing payment fetch (too soon)');
  return; // ❌ Bỏ qua refresh!
}
```

## Giải pháp
Thêm tham số `skipDebounce` vào hàm `fetchUserPayments()` để cho phép bỏ qua debouncing khi cần refresh ngay lập tức (ví dụ: sau khi đánh dấu thanh toán).

### Thay đổi trong `src/hooks/useAdminPayments.ts`:

1. **Thêm tham số `skipDebounce`:**
```typescript
const fetchUserPayments = async (loadMore: boolean = false, skipDebounce: boolean = false) => {
  try {
    // Debounce: don't fetch more than once per 1 second (unless skipDebounce is true)
    const now = Date.now();
    if (!skipDebounce && now - lastUpdateTime < 1000) {
      console.log('⏱️  Debouncing payment fetch (too soon)');
      return;
    }
    setLastUpdateTime(now);
    // ... rest of the code
```

2. **Sử dụng `skipDebounce` trong `markAsPaid`:**
```typescript
const markAsPaid = async (userId: number, amount: number) => {
  try {
    setIsLoading(true);
    await paymentsAPI.markPaid(userId, currentMonth, amount);
    // Refresh data after marking as paid - skip debounce to ensure immediate update
    await fetchUserPayments(false, true); // ✅ skipDebounce = true
    await fetchPaymentHistory();
    return true;
  } catch (err) {
    console.error('Mark as paid error:', err);
    throw err;
  } finally {
    setIsLoading(false);
  }
};
```

## Kết quả
- ✅ Sau khi đánh dấu thanh toán, danh sách admin payments được refresh ngay lập tức
- ✅ Người dùng hết nợ sẽ biến mất khỏi danh sách (vì backend chỉ trả về users có `remainingTotal > 0`)
- ✅ Debouncing vẫn hoạt động bình thường cho các trường hợp khác (polling, manual refresh)

## Deployment
1. ✅ Code đã được commit và push lên GitHub
2. ⏳ Đợi Render deploy backend mới (2-5 phút)
3. ✅ Sau khi deploy xong, tính năng sẽ hoạt động bình thường

## Testing
Để test:
1. Vào trang Admin Payments
2. Chọn một người dùng có nợ
3. Đánh dấu thanh toán đủ số tiền để họ hết nợ
4. Người dùng đó sẽ biến mất khỏi danh sách ngay lập tức

## Files Changed
- `src/hooks/useAdminPayments.ts` - Thêm tham số `skipDebounce` và sử dụng trong `markAsPaid`
- `test-mark-paid.cjs` - Test script để verify mark-paid functionality
- `GET-DEBT-USERS-COUNT-SIMPLE.sql` - SQL function để đếm số users có nợ

## Related Issues
- Task 3: Show only users with debt in admin payments page
- Backend uses `get_payment_stats_debt_only` SQL function to filter users with debt
