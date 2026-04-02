# Bugfix Requirements Document

## Introduction

Hệ thống hiện tại chỉ hiển thị công nợ của tháng được chọn, không tính tổng nợ tích lũy từ các tháng trước. Điều này dẫn đến việc admin không thể thấy những người dùng còn nợ từ các tháng trước nếu họ không có đơn hàng mới trong tháng hiện tại. Bug này ảnh hưởng đến khả năng quản lý và theo dõi công nợ tổng thể của hệ thống.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN admin xem trang thanh toán và chọn tháng 4/2026 THEN hệ thống chỉ hiển thị công nợ của các đơn hàng được tạo trong tháng 4/2026

1.2 WHEN một user có nợ 80,000đ từ tháng 3/2026 nhưng không có đơn hàng mới trong tháng 4/2026 THEN hệ thống không hiển thị user đó trong danh sách thanh toán của tháng 4/2026

1.3 WHEN một user có nợ 80,000đ từ tháng 3/2026 và nợ 40,000đ từ tháng 4/2026 THEN hệ thống chỉ hiển thị số nợ 40,000đ (của tháng 4) thay vì tổng nợ 120,000đ

1.4 WHEN backend function `get_payment_stats` được gọi với tham số tháng 4/2026 THEN function chỉ query orders và payments trong khoảng thời gian từ 2026-04-01 đến 2026-04-30

1.5 WHEN frontend gọi `paymentsAPI.getAll(currentMonth)` với tháng hiện tại THEN backend chỉ trả về dữ liệu công nợ của tháng đó

### Expected Behavior (Correct)

2.1 WHEN admin xem trang thanh toán và chọn tháng 4/2026 THEN hệ thống SHALL hiển thị tổng công nợ tích lũy từ TẤT CẢ các tháng trước đến tháng 4/2026

2.2 WHEN một user có nợ 80,000đ từ tháng 3/2026 nhưng không có đơn hàng mới trong tháng 4/2026 THEN hệ thống SHALL hiển thị user đó với số nợ 80,000đ trong danh sách thanh toán

2.3 WHEN một user có nợ 80,000đ từ tháng 3/2026 và nợ 40,000đ từ tháng 4/2026 THEN hệ thống SHALL hiển thị tổng nợ tích lũy 120,000đ

2.4 WHEN backend function `get_payment_stats` được gọi với tham số tháng 4/2026 THEN function SHALL query TẤT CẢ orders và payments từ tháng đầu tiên có dữ liệu đến hết tháng 4/2026

2.5 WHEN tính toán công nợ cho một user THEN hệ thống SHALL tính tổng giá trị tất cả orders chưa thanh toán từ mọi tháng trừ đi tổng số tiền đã thanh toán từ mọi tháng

2.6 WHEN một user đã thanh toán một phần nợ tích lũy THEN hệ thống SHALL hiển thị số nợ còn lại chính xác (tổng orders - tổng payments)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN một user không có đơn hàng nào và không có khoản thanh toán nào THEN hệ thống SHALL CONTINUE TO hiển thị số nợ là 0đ

3.2 WHEN một user đã thanh toán đủ tất cả các đơn hàng từ mọi tháng THEN hệ thống SHALL CONTINUE TO hiển thị số nợ là 0đ hoặc số tiền thừa (overpaid)

3.3 WHEN tính toán logic "ordered_for" (đặt hàng cho người khác) THEN hệ thống SHALL CONTINUE TO tính nợ cho người được đặt hàng (ordered_for), không phải người đặt (user_id)

3.4 WHEN một đơn hàng đã bị xóa mềm (deleted_at IS NOT NULL) THEN hệ thống SHALL CONTINUE TO không tính đơn hàng đó vào công nợ

3.5 WHEN một đơn hàng đã được đánh dấu là đã thanh toán (paid = true) THEN hệ thống SHALL CONTINUE TO không tính đơn hàng đó vào số nợ còn lại

3.6 WHEN admin xem lịch sử thanh toán (payment history) THEN hệ thống SHALL CONTINUE TO hiển thị tất cả các khoản thanh toán từ mọi tháng

3.7 WHEN user thường (không phải admin) xem thông tin thanh toán của mình THEN hệ thống SHALL CONTINUE TO chỉ hiển thị thông tin thanh toán của chính user đó

3.8 WHEN hệ thống sử dụng cache cho payment stats THEN hệ thống SHALL CONTINUE TO cache kết quả với TTL 10 phút

3.9 WHEN pagination được áp dụng cho danh sách thanh toán THEN hệ thống SHALL CONTINUE TO hỗ trợ phân trang với limit và offset
