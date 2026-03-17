# Performance Improvements - Realtime & Caching

## Tóm tắt các cải tiến

### 1. Supabase Realtime Subscriptions
Tất cả các hooks đã được cập nhật để subscribe vào realtime changes từ Supabase:

- **useOrders**: Subscribe vào bảng `orders` - cập nhật tức thì khi có đơn hàng mới/thay đổi
- **usePayments**: Subscribe vào bảng `payments` - cập nhật tức thì khi có thanh toán mới
- **useAdminPayments**: Subscribe vào bảng `payments` - admin thấy cập nhật realtime
- **useFeedback**: Subscribe vào bảng `feedback` - cập nhật tức thì khi có góp ý mới
- **useDashboardStats**: Subscribe vào bảng `orders` - thống kê cập nhật realtime
- **useMenu**: Subscribe vào bảng `menus` và `dishes` - menu cập nhật tức thì
- **useUsers**: Subscribe vào bảng `users` - danh sách người dùng cập nhật realtime

### 2. Giảm thời gian Auto-Refresh
- **Trước**: 30 giây
- **Sau**: 5 giây
- Kết hợp với Realtime subscriptions, website sẽ cập nhật gần như tức thì

### 3. Backend Caching
Thêm in-memory cache cho các dữ liệu thường xuyên được truy cập:

```javascript
// Cache configuration
const cache = {
  menus: { data: null, timestamp: 0, ttl: 5000 },      // 5 seconds
  dishes: { data: null, timestamp: 0, ttl: 5000 },
  users: { data: null, timestamp: 0, ttl: 5000 },
  stats: { data: null, timestamp: 0, ttl: 5000 }
};
```

- **GET /api/menu/today**: Trả về cached data nếu còn hợp lệ
- **POST /api/menu/multilingual**: Clear cache khi tạo menu mới

## Lợi ích

✅ **Tốc độ phản hồi nhanh hơn**: Realtime updates + caching
✅ **Giảm tải server**: Cache giảm số lần query database
✅ **Trải nghiệm người dùng tốt hơn**: Dữ liệu luôn cập nhật
✅ **Tiết kiệm bandwidth**: Realtime chỉ gửi thay đổi, không toàn bộ dữ liệu

## Cách hoạt động

1. **Lần đầu tiên**: Frontend gọi API → Backend query database → Cache kết quả
2. **Lần tiếp theo (trong 5s)**: Frontend gọi API → Backend trả về cached data (nhanh hơn)
3. **Khi có thay đổi**: Supabase Realtime phát hiện → Frontend tự động refetch
4. **Khi tạo/cập nhật**: Backend clear cache → Lần tiếp theo sẽ query database mới

## Cấu hình Supabase Realtime

Để Realtime hoạt động, bạn cần enable Realtime trên Supabase:

1. Vào Supabase Dashboard
2. Chọn project của bạn
3. Vào **Database** → **Replication**
4. Enable replication cho các bảng: `orders`, `payments`, `feedback`, `menus`, `dishes`, `users`

## Kiểm tra hoạt động

Mở browser console và xem logs:
- `✅ Returning cached menu` - Cache hit
- `Order change detected` - Realtime update
- `Payment change detected` - Realtime update

## Tối ưu hóa thêm (tương lai)

- [ ] Thêm caching cho orders, payments, stats
- [ ] Implement request debouncing
- [ ] Optimize database queries với indexes
- [ ] Implement pagination cho danh sách lớn
