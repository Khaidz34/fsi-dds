# Bugfix Requirements Document

## Introduction

Hệ thống quản lý đơn hàng và thanh toán hiện tại có lỗi khi admin xóa đơn hàng. Khi admin xóa 2 đơn hàng, số tiền thanh toán không được cập nhật đúng, dẫn đến việc hệ thống vẫn hiển thị còn nợ 40000 đồng thay vì cập nhật lại số tiền chính xác.

Bug này ảnh hưởng đến tính chính xác của dữ liệu thanh toán và có thể gây nhầm lẫn cho cả admin và người dùng khi theo dõi công nợ.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN admin xóa 2 đơn hàng (mỗi đơn 40000đ) THEN hệ thống vẫn hiển thị số tiền còn nợ là 40000đ thay vì 0đ

1.2 WHEN admin xóa đơn hàng THEN cache thanh toán bị invalidate nhưng dữ liệu thanh toán không được tính toán lại chính xác

1.3 WHEN người dùng kiểm tra thông tin thanh toán sau khi admin xóa đơn THEN số tiền còn nợ không phản ánh đúng số đơn hàng còn lại

### Expected Behavior (Correct)

2.1 WHEN admin xóa 2 đơn hàng (mỗi đơn 40000đ) THEN hệ thống SHALL cập nhật số tiền còn nợ về 0đ

2.2 WHEN admin xóa đơn hàng THEN hệ thống SHALL tính toán lại tổng số tiền thanh toán dựa trên các đơn hàng còn lại (chưa bị xóa)

2.3 WHEN người dùng kiểm tra thông tin thanh toán sau khi admin xóa đơn THEN số tiền còn nợ SHALL phản ánh chính xác số đơn hàng còn lại

2.4 WHEN cache thanh toán bị invalidate THEN hệ thống SHALL tự động tính toán lại payment stats từ database với điều kiện lọc `deleted_at IS NULL`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN admin xóa đơn hàng THEN hệ thống SHALL CONTINUE TO thực hiện soft delete (đánh dấu `deleted_at` thay vì xóa vĩnh viễn)

3.2 WHEN tính toán thanh toán cho các đơn hàng chưa bị xóa THEN hệ thống SHALL CONTINUE TO tính đúng tổng tiền dựa trên giá của từng đơn

3.3 WHEN người dùng tạo đơn hàng mới THEN hệ thống SHALL CONTINUE TO cập nhật thông tin thanh toán chính xác

3.4 WHEN admin đánh dấu thanh toán đã hoàn thành THEN hệ thống SHALL CONTINUE TO cập nhật trạng thái `paid` của các đơn hàng

3.5 WHEN query đơn hàng cho mục đích hiển thị THEN hệ thống SHALL CONTINUE TO lọc các đơn đã xóa với điều kiện `deleted_at IS NULL`
