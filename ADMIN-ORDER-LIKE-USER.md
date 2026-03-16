# ✅ Cập nhật phần đặt cơm admin giống như user

## 🎯 Yêu cầu
Thay đổi phần "Đặt cơm cho bản thân" của admin để giống như phần thực đơn của user với:
- Có thể chọn nhiều món (tối đa 2)
- Hiển thị món đã chọn với số thứ tự
- Có thể xóa từng món
- Có order bar với tổng tiền
- UI/UX giống hệt phần user

## ✅ Đã thay đổi

### 1. **Thay thế toàn bộ Admin Order Section**

**Trước (đơn giản):**
```tsx
// Click vào món → Mở modal ngay lập tức
<div onClick={() => {
  setSelectedDishes([dish.id]);
  setOrderForUserId(user?.id || null);
  setShowOrderSummary(true);
}}>
  <h4>{dish.name}</h4>
  <p>Click để đặt món này</p>
</div>
```

**Sau (giống user menu):**
```tsx
// Chọn món → Thêm vào selectedDishes → Hiển thị order bar
<motion.div 
  className={`lacquer-card ${selectedDishes.includes(dish.id) ? 'selected' : ''}`}
  onClick={() => handleSelectDish(dish.id)}
>
  {selectedDishes.includes(dish.id) && <CheckCircle2 />}
  <h4>{dish.name}</h4>
  <span>Món {selectedDishes.indexOf(dish.id) + 1}</span>
</motion.div>
```

### 2. **Thêm Order Bar cho Admin**
```tsx
{selectedDishes.length > 0 && (
  <motion.div className="order-bar">
    <h4>Đơn hàng của bạn ({selectedDishes.length}/2)</h4>
    <div className="selected-dishes">
      {selectedDishes.map((dishId, index) => (
        <div key={dishId}>
          <span>Món {index + 1}</span>
          <span>{dish.name}</span>
          <button onClick={() => removeDish(dishId)}>×</button>
        </div>
      ))}
    </div>
    <button onClick={openOrderSummary}>Đặt cơm cho bản thân</button>
  </motion.div>
)}
```

### 3. **Features mới cho Admin Order**

✅ **Chọn nhiều món (tối đa 2)**
- Click món → Thêm vào selectedDishes
- Tối đa 2 món, món thứ 3 sẽ disabled
- Visual feedback khi chọn

✅ **Hiển thị món đã chọn**
- Badge "Món 1", "Món 2" trên từng món
- CheckCircle2 icon khi được chọn
- Highlight border và background

✅ **Order Bar động**
- Chỉ hiển thị khi có món được chọn
- Danh sách món đã chọn với số thứ tự
- Tổng tiền: 40,000đ
- Button xóa từng món

✅ **Animations giống user**
- Motion animations khi chọn/bỏ chọn
- Hover effects
- Scale animations
- Smooth transitions

✅ **Responsive design**
- Grid layout responsive
- Mobile-friendly order bar
- Touch-friendly buttons

## 🎨 UI/UX Features

### **Visual States:**
- **Unselected**: Border gray, hover effects
- **Selected**: Red border, red background, checkmark icon
- **Disabled**: Opacity 50% khi đã chọn đủ 2 món
- **Loading**: Animation states

### **Interactive Elements:**
- **Dish Cards**: Click to select/deselect
- **Remove Buttons**: X button trên từng món
- **Clear All**: X button để xóa tất cả
- **Order Button**: Mở OrderSummary modal

### **Responsive Behavior:**
- **Desktop**: 2-column grid, full order bar
- **Mobile**: 1-column grid, compact order bar
- **Touch**: Larger touch targets

## 🔄 Flow hoạt động mới

1. **Admin vào Menu Management tab**
2. **Thấy section "🍽️ Đặt cơm cho bản thân"**
3. **Click chọn món ăn** (tối đa 2 món)
   - Món được highlight với checkmark
   - Hiển thị "Món 1", "Món 2"
4. **Order bar xuất hiện** với:
   - Danh sách món đã chọn
   - Tổng tiền 40,000đ
   - Button xóa từng món
5. **Click "Đặt cơm cho bản thân"**
6. **OrderSummary modal mở** với thông tin đầy đủ
7. **Xác nhận → Đặt hàng thành công**

## 🎯 Kết quả

✅ **Trải nghiệm giống hệt user menu**
✅ **Có thể chọn nhiều món và quản lý dễ dàng**
✅ **Visual feedback rõ ràng**
✅ **Responsive trên mọi thiết bị**
✅ **Animations mượt mà**
✅ **Dễ sử dụng và trực quan**

Bây giờ admin có trải nghiệm đặt cơm giống hệt như user, với đầy đủ tính năng chọn nhiều món, quản lý đơn hàng, và UI/UX chuyên nghiệp! 🎉