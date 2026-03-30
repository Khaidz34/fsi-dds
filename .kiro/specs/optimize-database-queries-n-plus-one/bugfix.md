# Bugfix Requirements Document

## Introduction

Hệ thống hiện tại gặp vấn đề N+1 query trong hàm `buildPaymentStatsQuery()` (backend/server.js, lines 1200-1260), gây ra hiệu suất kém và database overload. Với 100 users, hệ thống thực hiện 200+ queries riêng lẻ (2 queries per user) thay vì sử dụng SQL JOINs và aggregations. Điều này dẫn đến response time chậm (>2-3 giây), database connection pool bị cạn kiệt khi có nhiều concurrent requests, và không scale được khi số lượng users tăng.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `buildPaymentStatsQuery()` được gọi với 100 users THEN hệ thống thực hiện 200+ database queries riêng lẻ (2 queries per user: 1 query cho orders, 1 query cho payments)

1.2 WHEN có nhiều concurrent requests gọi `buildPaymentStatsQuery()` THEN database connection pool bị cạn kiệt và hệ thống trở nên không ổn định

1.3 WHEN số lượng users tăng lên (ví dụ: 500 users) THEN số lượng queries tăng tuyến tính (1000+ queries) và response time tăng không kiểm soát được

1.4 WHEN `buildPaymentStatsQuery()` được gọi THEN response time thường >2-3 giây cho 100 users

### Expected Behavior (Correct)

2.1 WHEN `buildPaymentStatsQuery()` được gọi với 100 users THEN hệ thống SHALL thực hiện 1-2 database queries sử dụng SQL JOINs, GROUP BY, và aggregations (SUM, COUNT)

2.2 WHEN có nhiều concurrent requests gọi `buildPaymentStatsQuery()` THEN database connection pool SHALL không bị cạn kiệt và hệ thống SHALL duy trì ổn định

2.3 WHEN số lượng users tăng lên (ví dụ: 500 users) THEN số lượng queries SHALL giữ nguyên (1-2 queries) và response time SHALL tăng tuyến tính với dữ liệu chứ không phải số lượng queries

2.4 WHEN `buildPaymentStatsQuery()` được gọi THEN response time SHALL <500ms cho 100 users

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `buildPaymentStatsQuery()` được gọi THEN kết quả trả về SHALL CONTINUE TO chứa đầy đủ các trường: userId, fullname, username, month, ordersCount, ordersTotal, paidCount, paidTotal, remainingCount, remainingTotal, overpaidTotal

3.2 WHEN user có orders được đặt bởi người khác (ordered_for field) THEN hệ thống SHALL CONTINUE TO tính toán đúng ordersTotal và remainingTotal cho user đó (chỉ tính orders mà user phải trả tiền)

3.3 WHEN user có cả orders tự đặt và orders được đặt bởi người khác THEN hệ thống SHALL CONTINUE TO phân biệt và tính toán đúng orders nào user phải trả tiền

3.4 WHEN orders có trường `paid` = true/false THEN hệ thống SHALL CONTINUE TO tính toán đúng paidCount và remainingCount dựa trên trường này

3.5 WHEN orders có trường `deleted_at` IS NOT NULL THEN hệ thống SHALL CONTINUE TO loại trừ các orders đã bị xóa khỏi tính toán

3.6 WHEN filter theo month được áp dụng THEN hệ thống SHALL CONTINUE TO chỉ tính orders và payments trong tháng đó (sử dụng date range: `>= startDate AND < nextMonth`)

3.7 WHEN pagination được áp dụng (limit, offset) THEN hệ thống SHALL CONTINUE TO trả về đúng số lượng records theo limit và offset

3.8 WHEN cache được enabled THEN hệ thống SHALL CONTINUE TO cache kết quả với key `payments:admin:{month}` và TTL 5 phút
