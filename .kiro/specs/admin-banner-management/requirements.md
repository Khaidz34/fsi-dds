# Requirements Document

## Introduction

Hệ thống Admin Banner Management cho phép quản trị viên chọn và hiển thị một trong hai loại banner trên trang chủ website: Banner trò chơi Fusion Slice Game hoặc Banner kỷ niệm 1 năm. Hệ thống lưu trữ cấu hình banner trong database và đảm bảo tất cả người dùng nhìn thấy banner được chọn. Banner phải responsive và hoạt động tốt trên mọi thiết bị.

## Glossary

- **Banner_System**: Hệ thống quản lý và hiển thị banner trên trang chủ website
- **Admin_Panel**: Giao diện quản trị cho phép admin chọn loại banner
- **Game_Banner**: Banner hiển thị trò chơi Fusion Slice Game
- **Anniversary_Banner**: Banner kỷ niệm 1 năm thành lập công ty với countdown timer và AI-generated background
- **Banner_Setting**: Cấu hình banner được lưu trong database (Supabase)
- **User**: Người dùng cuối xem website
- **Admin**: Người quản trị có quyền thay đổi cấu hình banner

## Requirements

### Requirement 1: Banner Type Selection

**User Story:** Là một admin, tôi muốn chọn loại banner hiển thị trên trang chủ, để có thể điều khiển nội dung marketing phù hợp với từng thời điểm.

#### Acceptance Criteria

1. THE Admin_Panel SHALL hiển thị hai tùy chọn banner: "Game Banner" và "Anniversary Banner"
2. WHEN admin chọn một loại banner, THE Banner_System SHALL lưu cấu hình vào database
3. THE Banner_System SHALL hiển thị banner được chọn cho tất cả Users
4. WHEN admin thay đổi loại banner, THE Banner_System SHALL cập nhật hiển thị cho tất cả Users trong vòng 5 giây
5. WHERE admin chưa chọn banner, THE Banner_System SHALL hiển thị Game_Banner làm mặc định

### Requirement 2: Banner Display and Rendering

**User Story:** Là một user, tôi muốn xem banner được admin chọn trên trang chủ, để nhận thông tin về trò chơi hoặc sự kiện kỷ niệm.

#### Acceptance Criteria

1. WHEN User truy cập trang chủ, THE Banner_System SHALL tải cấu hình banner từ database
2. IF banner type là "game", THEN THE Banner_System SHALL hiển thị Game_Banner component
3. IF banner type là "anniversary", THEN THE Banner_System SHALL hiển thị Anniversary_Banner component
4. THE Banner_System SHALL hiển thị banner trong vòng 2 giây kể từ khi trang được tải
5. WHEN database không khả dụng, THE Banner_System SHALL hiển thị Game_Banner làm fallback

### Requirement 3: Anniversary Banner Integration

**User Story:** Là một developer, tôi muốn tích hợp Anniversary Banner component vào website chính, để có thể sử dụng nó như một tùy chọn banner.

#### Acceptance Criteria

1. THE Banner_System SHALL tích hợp Anniversary_Banner component từ remix_-fsi-dds-1st-anniversary-banner
2. THE Anniversary_Banner SHALL hiển thị countdown timer đếm ngược đến ngày 10/04/2026
3. THE Anniversary_Banner SHALL sử dụng Framer Motion cho animations
4. WHERE Google Gemini API key được cấu hình, THE Anniversary_Banner SHALL tạo AI-generated background
5. IF Gemini API không khả dụng, THEN THE Anniversary_Banner SHALL hiển thị gradient background mặc định
6. THE Anniversary_Banner SHALL hiển thị logo FSI DDS và thông điệp kỷ niệm

### Requirement 4: Responsive Design

**User Story:** Là một user trên mobile, tôi muốn xem banner hiển thị đẹp và rõ ràng trên điện thoại, để có trải nghiệm tốt khi truy cập website.

#### Acceptance Criteria

1. THE Game_Banner SHALL responsive và hiển thị đúng trên màn hình từ 320px đến 2560px
2. THE Anniversary_Banner SHALL responsive và hiển thị đúng trên màn hình từ 320px đến 2560px
3. WHEN màn hình nhỏ hơn 768px, THE Anniversary_Banner SHALL điều chỉnh kích thước font và spacing
4. WHEN màn hình nhỏ hơn 768px, THE Game_Banner SHALL điều chỉnh kích thước canvas và controls
5. THE Banner_System SHALL test responsive trên iOS Safari, Android Chrome, và Desktop browsers

### Requirement 5: Database Schema and Storage

**User Story:** Là một developer, tôi muốn lưu trữ cấu hình banner trong database, để đảm bảo tính nhất quán và persistence.

#### Acceptance Criteria

1. THE Banner_System SHALL tạo bảng "banner_settings" trong Supabase với các trường: id, banner_type, updated_at, updated_by
2. THE banner_type field SHALL chỉ chấp nhận giá trị "game" hoặc "anniversary"
3. WHEN admin cập nhật banner setting, THE Banner_System SHALL ghi log updated_at và updated_by
4. THE Banner_System SHALL chỉ lưu một record duy nhất trong bảng banner_settings
5. THE Banner_System SHALL tạo index trên trường banner_type để tối ưu query performance

### Requirement 6: Admin Authorization

**User Story:** Là một admin, tôi muốn chỉ mình và các admin khác có quyền thay đổi banner, để bảo vệ nội dung website khỏi thay đổi trái phép.

#### Acceptance Criteria

1. THE Admin_Panel SHALL chỉ hiển thị cho Users có role là "admin"
2. WHEN non-admin User cố gắng truy cập Admin_Panel, THE Banner_System SHALL từ chối và hiển thị thông báo lỗi
3. THE Banner_System SHALL xác thực JWT token trước khi cho phép cập nhật banner setting
4. WHEN JWT token không hợp lệ, THE Banner_System SHALL trả về HTTP 401 Unauthorized
5. THE Banner_System SHALL log tất cả thay đổi banner setting với thông tin user_id và timestamp

### Requirement 7: API Endpoints

**User Story:** Là một developer, tôi muốn có API endpoints để quản lý banner settings, để frontend có thể tương tác với backend một cách chuẩn hóa.

#### Acceptance Criteria

1. THE Banner_System SHALL cung cấp endpoint GET /api/banner/settings để lấy cấu hình banner hiện tại
2. THE Banner_System SHALL cung cấp endpoint POST /api/banner/settings để cập nhật cấu hình banner
3. WHEN POST request được gửi, THE Banner_System SHALL validate banner_type là "game" hoặc "anniversary"
4. THE Banner_System SHALL trả về HTTP 200 với banner settings khi GET request thành công
5. THE Banner_System SHALL trả về HTTP 400 khi banner_type không hợp lệ
6. THE Banner_System SHALL trả về HTTP 401 khi user không có quyền admin

### Requirement 8: Performance and Caching

**User Story:** Là một user, tôi muốn banner tải nhanh và không làm chậm trang web, để có trải nghiệm mượt mà.

#### Acceptance Criteria

1. THE Banner_System SHALL cache banner settings trong memory với TTL 60 giây
2. WHEN banner settings được cập nhật, THE Banner_System SHALL invalidate cache ngay lập tức
3. THE Anniversary_Banner SHALL lazy load AI-generated background
4. THE Game_Banner SHALL lazy load game assets
5. THE Banner_System SHALL đảm bảo First Contentful Paint dưới 1.5 giây

### Requirement 9: Error Handling and Fallback

**User Story:** Là một user, tôi muốn vẫn thấy banner khi có lỗi xảy ra, để không bị gián đoạn trải nghiệm.

#### Acceptance Criteria

1. IF database query thất bại, THEN THE Banner_System SHALL hiển thị Game_Banner làm fallback
2. IF Anniversary_Banner component lỗi, THEN THE Banner_System SHALL hiển thị Game_Banner
3. THE Banner_System SHALL log tất cả errors vào console với đầy đủ stack trace
4. WHEN Gemini API timeout sau 8 giây, THE Anniversary_Banner SHALL hiển thị gradient background
5. THE Banner_System SHALL hiển thị loading state trong khi tải banner settings

### Requirement 10: Testing and Quality Assurance

**User Story:** Là một developer, tôi muốn có test coverage đầy đủ cho banner system, để đảm bảo chất lượng và tránh regression bugs.

#### Acceptance Criteria

1. THE Banner_System SHALL có unit tests cho API endpoints với coverage tối thiểu 80%
2. THE Banner_System SHALL có integration tests cho database operations
3. THE Banner_System SHALL có visual regression tests cho cả hai loại banner
4. THE Banner_System SHALL test responsive design trên ít nhất 5 kích thước màn hình khác nhau
5. THE Banner_System SHALL có end-to-end tests cho admin workflow: login → chọn banner → verify hiển thị
