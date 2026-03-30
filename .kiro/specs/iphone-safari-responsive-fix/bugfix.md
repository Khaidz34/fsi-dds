# Bugfix Requirements Document

## Introduction

Người dùng trên iPhone Safari không thể nhấn vào nút "Đặt món" vì nút bị che khuất bởi thanh công cụ Safari ở dưới cùng màn hình. Vấn đề này xảy ra trên tất cả các model iPhone khi sử dụng trình duyệt Safari, ảnh hưởng nghiêm trọng đến khả năng đặt món của người dùng di động.

Safari trên iOS có thanh công cụ động (dynamic toolbar) ở dưới cùng màn hình, che khuất các phần tử UI được đặt ở vị trí bottom của viewport. Điều này khiến nút "Đặt món" không thể truy cập được, ngăn người dùng hoàn thành quy trình đặt món.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN người dùng truy cập trang web trên iPhone Safari THEN nút "Đặt món" ở dưới cùng màn hình bị che khuất bởi thanh công cụ Safari

1.2 WHEN người dùng cố gắng tap vào nút "Đặt món" THEN không có phản ứng vì nút bị che khuất và không thể tương tác

1.3 WHEN người dùng cuộn trang lên xuống THEN thanh công cụ Safari vẫn che khuất nút "Đặt món" do không có khoảng cách an toàn (safe area) phù hợp

1.4 WHEN người dùng xem trang ở chế độ portrait hoặc landscape trên iPhone THEN nút "Đặt món" vẫn bị che khuất trong cả hai chế độ

### Expected Behavior (Correct)

2.1 WHEN người dùng truy cập trang web trên iPhone Safari THEN nút "Đặt món" SHALL hiển thị đầy đủ và không bị che khuất bởi thanh công cụ Safari

2.2 WHEN người dùng tap vào nút "Đặt món" trên iPhone Safari THEN nút SHALL phản hồi ngay lập tức và thực hiện hành động đặt món

2.3 WHEN người dùng cuộn trang lên xuống THEN nút "Đặt món" SHALL luôn duy trì khoảng cách an toàn với thanh công cụ Safari bằng cách sử dụng `env(safe-area-inset-bottom)`

2.4 WHEN người dùng xem trang ở chế độ portrait hoặc landscape THEN nút "Đặt món" SHALL tự động điều chỉnh vị trí để không bị che khuất

2.5 WHEN người dùng sử dụng iPhone có notch (iPhone X trở lên) THEN nút "Đặt món" SHALL tôn trọng safe area insets của thiết bị

2.6 WHEN người dùng tap vào vùng nút "Đặt món" THEN vùng tap target SHALL đủ lớn (tối thiểu 44x44px) theo Apple Human Interface Guidelines

### Unchanged Behavior (Regression Prevention)

3.1 WHEN người dùng truy cập trang web trên desktop browsers (Chrome, Firefox, Edge) THEN giao diện và vị trí nút "Đặt món" SHALL CONTINUE TO hoạt động bình thường như hiện tại

3.2 WHEN người dùng truy cập trang web trên Android devices THEN giao diện và vị trí nút "Đặt món" SHALL CONTINUE TO hoạt động bình thường như hiện tại

3.3 WHEN người dùng sử dụng các tính năng khác của ứng dụng (xem menu, lịch sử đơn hàng, dashboard) THEN các tính năng này SHALL CONTINUE TO hoạt động bình thường không bị ảnh hưởng

3.4 WHEN người dùng tap vào các nút khác trên trang (nút chọn món, nút đăng xuất, navigation buttons) THEN các nút này SHALL CONTINUE TO hoạt động bình thường như hiện tại

3.5 WHEN người dùng xem trang trên iPad Safari THEN giao diện SHALL CONTINUE TO hiển thị đúng như hiện tại

3.6 WHEN người dùng sử dụng theme "fusion" hoặc "corporate" THEN cả hai theme SHALL CONTINUE TO hiển thị đúng với màu sắc và style riêng

3.7 WHEN người dùng chuyển đổi ngôn ngữ (Tiếng Việt, English, 日本語) THEN chức năng đa ngôn ngữ SHALL CONTINUE TO hoạt động bình thường
