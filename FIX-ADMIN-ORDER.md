# ✅ Đã sửa lỗi admin không đặt được cơm

## 🐛 Vấn đề
- Admin không thể đặt cơm cho bản thân từ phần "Đặt cơm cho bản thân"
- Click vào món ăn không có phản ứng gì

## 🔧 Nguyên nhân
1. **Missing state**: Code gọi `setShowOrderModal(true)` nhưng không có state `showOrderModal`
2. **Wrong state**: Code set `selectedCustomer` nhưng OrderSummary modal sử dụng `orderForUserId`
3. **Missing admin condition**: Phần admin order không kiểm tra `user?.role === 'admin'`

## ✅ Đã sửa

### 1. **Thêm điều kiện admin** ✅
```tsx
// Trước:
{menu && menu.dishes && menu.dishes.length > 0 && (

// Sau:
{user?.role === 'admin' && menu && menu.dishes && menu.dishes.length > 0 && (
```

### 2. **Sửa logic đặt hàng** ✅
```tsx
// Trước (lỗi):
onClick={() => {
  setSelectedDish1(dish.id);           // ← Wrong state
  setSelectedCustomer(user?.id || 0);  // ← Wrong state
  setShowOrderModal(true);             // ← State không tồn tại
}}

// Sau (đã sửa):
onClick={() => {
  setSelectedDishes([dish.id]);        // ← Đúng state cho modal
  setOrderForUserId(user?.id || null); // ← Đúng state cho customer
  setShowOrderSummary(true);           // ← Sử dụng modal có sẵn
}}
```

### 3. **Sử dụng modal có sẵn** ✅
- **Không tạo modal mới** - sử dụng `OrderSummary` modal có sẵn
- **Tương thích với logic hiện tại** - sử dụng `selectedDishes` và `orderForUserId`
- **Tái sử dụng code** - không duplicate logic đặt hàng

## 🎯 Kết quả

✅ **Admin có thể đặt cơm cho bản thân**
✅ **Click vào món ăn mở modal đặt hàng**
✅ **Modal hiển thị đúng thông tin admin**
✅ **Đặt hàng thành công và lưu vào database**
✅ **Phần này chỉ hiển thị cho admin**

## 📍 Vị trí

**Tab:** Menu Management (`menu-mgmt`)
**Section:** "🍽️ Đặt cơm cho bản thân"
**Điều kiện:** Chỉ admin mới thấy
**Chức năng:** Click món ăn → Mở modal → Xác nhận → Đặt hàng thành công

## 🔄 Flow hoạt động

1. **Admin vào tab Menu Management**
2. **Thấy section "Đặt cơm cho bản thân"** (nếu có menu)
3. **Click vào món ăn muốn đặt**
4. **Modal OrderSummary mở ra** với thông tin:
   - Món đã chọn
   - Người nhận: Admin (bản thân)
   - Giá: 40,000đ
5. **Click "Xác nhận đặt hàng"**
6. **Đặt hàng thành công** → Lưu vào database

Bây giờ admin có thể đặt cơm cho bản thân một cách bình thường!