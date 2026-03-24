# Bugfix Requirements Document

## Introduction

When User A orders meals for User B using the "Đặt món cho" (Order for) dropdown feature, User B (the recipient) does not see the order in their order history or the payment amount in their payment dashboard. This breaks the core functionality of the "order for others" feature, where both the orderer and the recipient should see the order and have it reflected in their payment calculations.

The feature works correctly for User A (the person placing the order) but fails for User B (the person receiving the order), despite the backend code appearing to have the correct OR filter logic in place.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN User A orders meals for User B using the "Đặt món cho" dropdown THEN User B does not see the order in their order history (`/api/orders/all` endpoint)

1.2 WHEN User A orders meals for User B THEN User B's payment dashboard does not include the order amount (`/api/payments/my` endpoint)

1.3 WHEN User B views their order history THEN only orders where `user_id = User B's ID` are returned, excluding orders where `ordered_for = User B's ID`

1.4 WHEN User B views their payment dashboard THEN only orders where `user_id = User B's ID` are counted in the payment calculation, excluding orders where `ordered_for = User B's ID`

### Expected Behavior (Correct)

2.1 WHEN User A orders meals for User B using the "Đặt món cho" dropdown THEN User B SHALL see the order in their order history

2.2 WHEN User A orders meals for User B THEN User B's payment dashboard SHALL include the order amount in the total calculation

2.3 WHEN User B views their order history THEN the system SHALL return orders where `user_id = User B's ID` OR `ordered_for = User B's ID`

2.4 WHEN User B views their payment dashboard THEN the system SHALL count orders where `user_id = User B's ID` OR `ordered_for = User B's ID` in the payment calculation

2.5 WHEN the OR filter is applied in Supabase queries THEN the system SHALL use the correct syntax that Supabase accepts

### Unchanged Behavior (Regression Prevention)

3.1 WHEN User A orders meals for User B THEN User A SHALL CONTINUE TO see the order in their order history

3.2 WHEN User A orders meals for User B THEN User A's payment dashboard SHALL CONTINUE TO include the order amount

3.3 WHEN User A orders meals for themselves (orderedFor = User A's ID) THEN the order SHALL CONTINUE TO appear in User A's order history

3.4 WHEN an admin views all orders THEN the system SHALL CONTINUE TO return all orders without filtering by user

3.5 WHEN the frontend sends the `orderedFor` parameter THEN the backend SHALL CONTINUE TO store it correctly in the `ordered_for` field

3.6 WHEN orders are created THEN the system SHALL CONTINUE TO store both `user_id` (who placed the order) and `ordered_for` (who the order is for)

3.7 WHEN orders are soft-deleted THEN the system SHALL CONTINUE TO exclude them from order history and payment calculations using `deleted_at IS NULL` filter
