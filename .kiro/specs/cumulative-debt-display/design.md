# Cumulative Debt Display Bugfix Design

## Overview

Hệ thống hiện tại chỉ tính công nợ trong tháng được chọn, không tính tổng nợ tích lũy từ các tháng trước. Bug này khiến admin không thể theo dõi người dùng còn nợ từ các tháng trước nếu họ không có đơn hàng mới trong tháng hiện tại. Fix này sẽ thay đổi logic query để tính tổng công nợ tích lũy từ TẤT CẢ các tháng trước đến tháng được chọn, đảm bảo hiển thị đầy đủ và chính xác tổng nợ của mỗi user.

## Glossary

- **Bug_Condition (C)**: Điều kiện kích hoạt bug - khi admin chọn một tháng để xem công nợ, hệ thống chỉ query orders và payments trong tháng đó thay vì tính tích lũy từ đầu
- **Property (P)**: Hành vi mong muốn - hệ thống phải tính tổng công nợ tích lũy (cumulative debt) từ TẤT CẢ các tháng trước đến tháng được chọn
- **Preservation**: Các hành vi hiện tại phải giữ nguyên - logic "ordered_for", soft delete, paid flag, cache, pagination, user permissions
- **get_payment_stats**: Database function trong `DROP-AND-CREATE-PAYMENT-STATS.sql` thực hiện query tổng hợp payment statistics
- **buildPaymentStatsQuery**: Function trong `backend/server.js` (dòng 1250-1350) gọi `get_payment_stats` và xử lý fallback
- **currentMonth**: Tháng được admin chọn để xem công nợ (format: YYYY-MM)
- **Cumulative Debt**: Tổng nợ tích lũy = (Tổng giá trị orders chưa thanh toán từ mọi tháng) - (Tổng số tiền đã thanh toán từ mọi tháng)

## Bug Details

### Bug Condition

Bug xảy ra khi admin chọn một tháng để xem công nợ. Hệ thống chỉ query orders và payments trong khoảng thời gian của tháng đó (từ ngày 1 đến cuối tháng), không tính các tháng trước. Điều này dẫn đến:
- Users có nợ từ tháng trước nhưng không có đơn hàng mới sẽ không xuất hiện trong danh sách
- Số nợ hiển thị không chính xác (chỉ tính nợ tháng hiện tại, không tính nợ tích lũy)

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { month: string, role: string }
  OUTPUT: boolean
  
  RETURN input.role == 'admin'
         AND input.month IS NOT NULL
         AND queryUsesMonthRangeFilter(input.month)
         AND NOT queryUsesAllTimeRangeUpToMonth(input.month)
END FUNCTION
```

### Examples

- **Example 1**: User A có nợ 80,000đ từ tháng 3/2026, không có đơn hàng mới trong tháng 4/2026
  - **Current (Bug)**: User A không xuất hiện trong danh sách thanh toán tháng 4/2026
  - **Expected**: User A xuất hiện với số nợ 80,000đ

- **Example 2**: User B có nợ 80,000đ từ tháng 3/2026 và nợ 40,000đ từ tháng 4/2026
  - **Current (Bug)**: Hiển thị số nợ 40,000đ (chỉ tháng 4)
  - **Expected**: Hiển thị tổng nợ tích lũy 120,000đ

- **Example 3**: User C có nợ 100,000đ từ tháng 2/2026, đã thanh toán 50,000đ trong tháng 3/2026, không có đơn hàng mới tháng 4/2026
  - **Current (Bug)**: User C không xuất hiện trong danh sách tháng 4/2026
  - **Expected**: User C xuất hiện với số nợ còn lại 50,000đ

- **Edge Case**: User D có nợ 200,000đ từ tháng 1/2026, đã thanh toán 250,000đ trong tháng 2/2026 (overpaid 50,000đ), không có đơn hàng mới tháng 3/2026
  - **Expected**: User D xuất hiện với overpaidTotal = 50,000đ, remainingTotal = 0đ

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Logic "ordered_for" phải tiếp tục hoạt động chính xác - nợ được tính cho người được đặt hàng (ordered_for), không phải người đặt (user_id)
- Soft delete phải tiếp tục hoạt động - orders có deleted_at IS NOT NULL không được tính vào công nợ
- Paid flag phải tiếp tục hoạt động - orders có paid = true không được tính vào remainingTotal
- Cache mechanism với TTL 10 phút phải tiếp tục hoạt động
- Pagination với limit và offset phải tiếp tục hoạt động
- User permissions phải giữ nguyên - admin xem tất cả, user thường chỉ xem của mình
- Payment history endpoint phải tiếp tục hiển thị tất cả payments từ mọi tháng
- Fallback query khi get_payment_stats không available phải tiếp tục hoạt động

**Scope:**
Tất cả các tính năng không liên quan đến việc tính toán công nợ tích lũy phải hoạt động y như cũ. Điều này bao gồm:
- Mouse clicks và UI interactions
- Authentication và authorization
- Order creation và deletion
- Payment recording
- Cache invalidation
- Error handling

## Hypothesized Root Cause

Dựa trên phân tích code, các nguyên nhân có thể gây ra bug:

1. **Incorrect Date Range in get_payment_stats Function**: Function hiện tại sử dụng `p_start_date` và `p_next_month` để filter orders và payments, chỉ query trong khoảng thời gian của tháng được chọn
   - File: `DROP-AND-CREATE-PAYMENT-STATS.sql`
   - Logic: `orders.created_at >= p_start_date AND orders.created_at < p_next_month`
   - Cần thay đổi: Query TẤT CẢ orders và payments từ đầu đến cuối tháng được chọn

2. **Incorrect Date Range in buildPaymentStatsQuery**: Function JavaScript tính toán startDate và nextMonth dựa trên tháng được chọn, sau đó truyền vào get_payment_stats
   - File: `backend/server.js` (dòng 1250-1350)
   - Logic: `const startDate = \`\${month}-01\``
   - Cần thay đổi: startDate phải là ngày đầu tiên có dữ liệu trong database, không phải ngày đầu tháng được chọn

3. **Incorrect Date Range in getUserPaymentStats**: Function tính payment stats cho single user cũng sử dụng month range filter
   - File: `backend/server.js` (dòng 1350-1450)
   - Logic: `.gte('created_at', \`\${startDate}T00:00:00Z\`).lt('created_at', \`\${nextMonth}T00:00:00Z\`)`
   - Cần thay đổi: Query từ đầu đến cuối tháng được chọn

4. **Cache Key Not Reflecting Cumulative Nature**: Cache key hiện tại chỉ dựa trên tháng được chọn, không phản ánh việc tính tích lũy
   - File: `backend/server.js` (dòng 1514-1598)
   - Logic: `const cacheKey = \`payments:admin:\${currentMonth}\``
   - Cần xem xét: Cache key có thể cần thay đổi hoặc giữ nguyên tùy thuộc vào implementation

## Correctness Properties

Property 1: Bug Condition - Cumulative Debt Calculation

_For any_ admin request to view payment stats for a selected month, the fixed get_payment_stats function SHALL calculate cumulative debt by querying ALL orders and payments from the earliest date in the database up to the end of the selected month, ensuring users with debt from previous months are displayed even if they have no new orders in the selected month.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Existing Logic and Features

_For any_ input that involves existing features (ordered_for logic, soft delete, paid flag, cache, pagination, user permissions, payment history), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-cumulative-calculation aspects.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

Giả sử phân tích root cause đúng, các thay đổi cần thực hiện:

**File**: `DROP-AND-CREATE-PAYMENT-STATS.sql`

**Function**: `get_payment_stats`

**Specific Changes**:
1. **Remove Month Range Filter for Orders**: Thay đổi WHERE clause để query TẤT CẢ orders từ đầu đến cuối tháng được chọn
   - Current: `orders.created_at >= p_start_date AND orders.created_at < p_next_month`
   - Fixed: `orders.created_at < p_next_month` (chỉ filter upper bound, không filter lower bound)

2. **Remove Month Range Filter for Payments**: Thay đổi WHERE clause để query TẤT CẢ payments từ đầu đến cuối tháng được chọn
   - Current: `payments.created_at >= p_start_date AND payments.created_at < p_next_month`
   - Fixed: `payments.created_at < p_next_month` (chỉ filter upper bound, không filter lower bound)

3. **Update Function Parameters (Optional)**: Có thể loại bỏ parameter `p_start_date` vì không còn sử dụng
   - Current: `p_start_date TIMESTAMP`
   - Fixed: Có thể loại bỏ hoặc giữ lại để tương thích ngược

**File**: `backend/server.js`

**Function**: `buildPaymentStatsQuery`

**Specific Changes**:
4. **Update startDate Calculation (Optional)**: Nếu loại bỏ p_start_date parameter, có thể đơn giản hóa code
   - Current: `const startDate = \`\${month}-01\``
   - Fixed: Có thể loại bỏ hoặc giữ lại để tương thích

5. **Update RPC Call**: Nếu thay đổi function signature, cần update RPC call
   - Current: `p_start_date: \`\${startDate}T00:00:00Z\``
   - Fixed: Loại bỏ parameter này nếu không còn cần

**File**: `backend/server.js`

**Function**: `getUserPaymentStats`

**Specific Changes**:
6. **Remove Lower Bound Filter for Orders**: Thay đổi query để lấy TẤT CẢ orders từ đầu đến cuối tháng được chọn
   - Current: `.gte('created_at', \`\${startDate}T00:00:00Z\`).lt('created_at', \`\${nextMonth}T00:00:00Z\`)`
   - Fixed: `.lt('created_at', \`\${nextMonth}T00:00:00Z\`)` (chỉ filter upper bound)

7. **Remove Lower Bound Filter for Payments**: Thay đổi query để lấy TẤT CẢ payments từ đầu đến cuối tháng được chọn
   - Current: `.gte('created_at', \`\${startDate}T00:00:00Z\`).lt('created_at', \`\${nextMonth}T00:00:00Z\`)`
   - Fixed: `.lt('created_at', \`\${nextMonth}T00:00:00Z\`)` (chỉ filter upper bound)

## Testing Strategy

### Validation Approach

Testing strategy sử dụng two-phase approach: đầu tiên, chạy exploratory tests trên UNFIXED code để surface counterexamples và confirm root cause, sau đó verify fix hoạt động đúng và preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating bug TRƯỚC KHI implement fix. Confirm hoặc refute root cause analysis. Nếu refute, cần re-hypothesize.

**Test Plan**: Tạo test data với users có nợ từ các tháng khác nhau, sau đó query payment stats cho tháng hiện tại trên UNFIXED code. Observe rằng users có nợ từ tháng trước không xuất hiện hoặc số nợ không chính xác.

**Test Cases**:
1. **User With Debt From Previous Month Only**: Tạo user có order 80,000đ tháng 3/2026, query tháng 4/2026 (will fail on unfixed code - user không xuất hiện)
2. **User With Debt From Multiple Months**: Tạo user có order 80,000đ tháng 3/2026 và 40,000đ tháng 4/2026, query tháng 4/2026 (will fail on unfixed code - chỉ hiển thị 40,000đ)
3. **User With Partial Payment**: Tạo user có order 100,000đ tháng 2/2026, payment 50,000đ tháng 3/2026, query tháng 4/2026 (will fail on unfixed code - user không xuất hiện)
4. **User With Overpayment**: Tạo user có order 200,000đ tháng 1/2026, payment 250,000đ tháng 2/2026, query tháng 3/2026 (may fail on unfixed code - user không xuất hiện hoặc overpaid không đúng)

**Expected Counterexamples**:
- Users có nợ từ tháng trước không xuất hiện trong danh sách
- Số nợ hiển thị không chính xác (chỉ tính tháng hiện tại)
- Possible causes: month range filter trong get_payment_stats, buildPaymentStatsQuery, getUserPaymentStats

### Fix Checking

**Goal**: Verify rằng với mọi input có bug condition, fixed function tính đúng cumulative debt.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := get_payment_stats_fixed(input.month)
  ASSERT cumulativeDebtCalculatedCorrectly(result)
END FOR
```

**Testing Approach**: Property-based testing được recommend vì:
- Tự động generate nhiều test cases với các tháng khác nhau
- Catch edge cases như tháng đầu tiên có dữ liệu, tháng không có orders mới
- Provide strong guarantees rằng cumulative debt được tính đúng cho mọi tháng

### Preservation Checking

**Goal**: Verify rằng với mọi input KHÔNG liên quan đến cumulative calculation, fixed function produce same result như original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT affectsCumulativeCalculation(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing được recommend cho preservation checking vì:
- Generate nhiều test cases tự động across input domain
- Catch edge cases mà manual unit tests có thể miss
- Provide strong guarantees rằng behavior unchanged cho all non-cumulative features

**Test Plan**: Observe behavior trên UNFIXED code trước cho các features không liên quan đến cumulative calculation, sau đó write property-based tests capturing behavior đó.

**Test Cases**:
1. **Ordered_For Logic Preservation**: Observe rằng orders với ordered_for được tính cho người được đặt hàng trên unfixed code, verify behavior này continues sau fix
2. **Soft Delete Preservation**: Observe rằng deleted orders không được tính trên unfixed code, verify behavior này continues sau fix
3. **Paid Flag Preservation**: Observe rằng paid orders không được tính vào remainingTotal trên unfixed code, verify behavior này continues sau fix
4. **Cache Preservation**: Observe rằng cache hoạt động với TTL 10 phút trên unfixed code, verify behavior này continues sau fix
5. **Pagination Preservation**: Observe rằng pagination với limit/offset hoạt động trên unfixed code, verify behavior này continues sau fix
6. **User Permissions Preservation**: Observe rằng user thường chỉ xem được payment của mình trên unfixed code, verify behavior này continues sau fix

### Unit Tests

- Test cumulative debt calculation với users có orders từ nhiều tháng khác nhau
- Test edge cases (user không có orders, user đã thanh toán hết, user overpaid)
- Test rằng month parameter vẫn được sử dụng làm upper bound filter
- Test rằng ordered_for logic vẫn hoạt động đúng
- Test rằng soft delete và paid flag vẫn hoạt động đúng

### Property-Based Tests

- Generate random users với orders và payments từ nhiều tháng khác nhau, verify cumulative debt được tính đúng
- Generate random tháng để query, verify rằng chỉ orders và payments đến cuối tháng đó được tính
- Generate random scenarios với ordered_for, soft delete, paid flag, verify preservation
- Test across nhiều scenarios để ensure không có regression

### Integration Tests

- Test full flow: tạo users với orders từ nhiều tháng, query payment stats, verify cumulative debt hiển thị đúng
- Test switching giữa các tháng khác nhau, verify cumulative debt thay đổi đúng
- Test cache invalidation khi có orders hoặc payments mới
- Test pagination với cumulative debt calculation
