# Design Document: Windows Order Notifications

## Overview

This design document specifies the implementation of desktop notifications for new orders in the FSI-DDS (Food Service Information - Daily Dish System). The feature leverages the Web Notifications API to display native Windows desktop notifications when new orders are placed, enabling admin and kitchen staff to receive immediate alerts even when the application is not in focus.

The notification system integrates with the existing Server-Sent Events (SSE) infrastructure to receive real-time order updates and displays formatted notifications containing order details including dish names, customer information, and timestamps. The system includes role-based filtering to ensure only admin and staff users receive notifications, comprehensive permission management, and multi-language support for Vietnamese, English, and Japanese.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Window                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Application                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         NotificationService                     │  │  │
│  │  │  - Permission Management                        │  │  │
│  │  │  - Notification Display                         │  │  │
│  │  │  - Lifecycle Management                         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                      ↑                                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         SSE Client (useSSE hook)                │  │  │
│  │  │  - Connection Management                        │  │  │
│  │  │  - Event Parsing                                │  │  │
│  │  │  - Reconnection Logic                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                      ↑                                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         AuthContext                             │  │  │
│  │  │  - User Role Information                        │  │  │
│  │  │  - Authentication State                         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ SSE Connection
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server (Node.js)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SSE Manager                                   │  │
│  │  - Connection Registry (Map<userId, connection>)     │  │
│  │  - sendSSENotification(userId, notification)         │  │
│  │  - Heartbeat Management                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                      ↑                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Order API Endpoints                           │  │
│  │  - POST /api/orders (creates order + sends SSE)      │  │
│  │  - GET /api/sse/connect (establishes SSE connection) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Initialization Phase**:
   - User logs in → AuthContext provides user role
   - If user role is 'admin' or 'staff' → Request notification permission
   - Establish SSE connection to backend

2. **Order Creation Phase**:
   - Admin/Staff creates new order via POST /api/orders
   - Backend sends SSE notification to relevant users
   - SSE Client receives event and parses order data

3. **Notification Display Phase**:
   - NotificationService checks user role and permission
   - Format notification content with order details
   - Display native desktop notification
   - Auto-close after 10 seconds

4. **User Interaction Phase**:
   - User clicks notification → Focus window and navigate to orders
   - User dismisses notification → Close notification
   - Notification auto-closes after timeout

## Components and Interfaces

### 1. NotificationService

A service module responsible for managing Web Notifications API interactions.

**Location**: `src/services/notificationService.ts`

**Interface**:
```typescript
interface NotificationService {
  // Permission management
  requestPermission(): Promise<NotificationPermission>;
  getPermissionStatus(): NotificationPermission;
  
  // Notification display
  showOrderNotification(orderData: OrderNotificationData): void;
  
  // Lifecycle management
  closeNotification(notificationId: string): void;
}

interface OrderNotificationData {
  orderId: number;
  dishNames: string[];
  customerName: string;
  timestamp: Date;
  language: 'vi' | 'en' | 'ja';
}
```

**Responsibilities**:
- Check browser support for Web Notifications API
- Request and manage notification permissions
- Create and display notifications with formatted content
- Handle notification click events (focus window, navigate to orders)
- Manage notification lifecycle (auto-close after 10 seconds)
- Prevent duplicate notifications for the same order

### 2. useSSE Hook

A React hook that manages SSE connections and event handling.

**Location**: `src/hooks/useSSE.ts`

**Interface**:
```typescript
interface UseSSEHook {
  (userId: number, onOrderCreated: (data: SSEOrderData) => void): {
    isConnected: boolean;
    error: Error | null;
    reconnect: () => void;
  };
}

interface SSEOrderData {
  type: 'order_created';
  userId: number;
  data: {
    orderId: number;
    price: number;
    month: string;
    timestamp: number;
    orderedFor?: number;
  };
}
```

**Responsibilities**:
- Establish SSE connection to `/api/sse/connect`
- Parse incoming SSE events
- Handle connection errors and implement reconnection logic
- Invoke callback when 'order_created' event is received
- Clean up connection on component unmount

### 3. useNotifications Hook

A React hook that integrates NotificationService with SSE events.

**Location**: `src/hooks/useNotifications.ts`

**Interface**:
```typescript
interface UseNotificationsHook {
  (user: User | null, language: Language): {
    permissionStatus: NotificationPermission;
    requestPermission: () => Promise<void>;
    isSupported: boolean;
  };
}
```

**Responsibilities**:
- Initialize notification service on mount
- Request permission for admin/staff users
- Listen to SSE events via useSSE hook
- Fetch order details when notification event received
- Display notification with formatted order data
- Handle role-based filtering (only admin/staff)

### 4. Backend SSE Endpoint Enhancement

**Location**: `backend/server.js`

**Existing Implementation**:
The backend already has SSE infrastructure in place:
- `sendSSENotification(userId, notification)` function
- SSE connection registry: `Map<userId, {res, lastHeartbeat}>`
- Heartbeat mechanism (every 30 seconds)
- Order creation endpoint sends SSE notifications

**Required Enhancement**:
Modify the SSE notification payload for order_created events to include additional order details:

```javascript
sendSSENotification(orderedFor, {
  type: 'order_created',
  userId: orderedFor,
  data: {
    orderId: order.id,
    price: order.price,
    month: currentMonth,
    timestamp: Date.now(),
    // NEW: Add order details for notifications
    dish1Name: dish1.name_vi,
    dish1NameEn: dish1.name_en,
    dish1NameJa: dish1.name_ja,
    dish2Name: dish2?.name_vi,
    dish2NameEn: dish2?.name_en,
    dish2NameJa: dish2?.name_ja,
    customerName: orderedForUser.fullname
  }
});
```

## Data Models

### Notification Data Structure

```typescript
interface NotificationData {
  id: string;                    // Unique notification ID
  orderId: number;               // Order ID from database
  dishNames: string[];           // Array of dish names (1-2 items)
  customerName: string;          // Full name of customer
  timestamp: Date;               // Order creation timestamp
  language: 'vi' | 'en' | 'ja'; // Display language
}
```

### SSE Event Structure

```typescript
interface SSEEvent {
  type: 'order_created' | 'order_deleted' | 'payment_marked';
  userId: number;
  data: {
    orderId: number;
    price: number;
    month: string;
    timestamp: number;
    // Order-specific fields
    dish1Name?: string;
    dish1NameEn?: string;
    dish1NameJa?: string;
    dish2Name?: string;
    dish2NameEn?: string;
    dish2NameJa?: string;
    customerName?: string;
    orderedFor?: number;
  };
}
```

### Translation Keys

```typescript
interface NotificationTranslations {
  vi: {
    newOrder: string;           // "Đơn hàng mới"
    orderFrom: string;          // "Đơn từ"
    at: string;                 // "lúc"
  };
  en: {
    newOrder: string;           // "New Order"
    orderFrom: string;          // "Order from"
    at: string;                 // "at"
  };
  ja: {
    newOrder: string;           // "新しい注文"
    orderFrom: string;          // "注文者"
    at: string;                 // "時刻"
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing the acceptance criteria, I identified the following redundancies:

**Redundant Properties Identified:**
1. **3.2 and 3.3 are redundant with 3.1**: Testing that only admin/staff receive notifications inherently verifies that regular users don't receive them and that role verification occurs.

2. **6.2 and 6.3 are redundant with 6.1**: Testing that dish names are formatted as a comma-separated list covers both single-dish and two-dish scenarios.

3. **10.3 and 10.4 are redundant with 10.1 and 10.2**: Testing that notifications display in the correct language for all three supported languages (vi, en, ja) inherently verifies that the system uses the application context and supports these languages.

**Properties to Combine:**
1. **4.1 and 4.2 can be combined**: Both describe what happens when a notification is clicked - they can be tested together as a single comprehensive property about notification click behavior.

2. **8.1 and 8.2 can be combined**: Both are about notification lifecycle management and can be tested as a single property about notification closing behavior.

3. **9.1 and 9.2 can be combined**: Both are about error handling and can be tested together as a single property about graceful error handling.

After reflection, we will write properties that eliminate these redundancies and provide unique validation value.

### Property 1: Notification Display on Order Creation

*For any* new order created in the system, when the order event is received, a desktop notification should be displayed to all admin and staff users.

**Validates: Requirements 1.1, 3.1**

### Property 2: Notification Content Completeness

*For any* order notification displayed, the notification body should contain all dish names (formatted as comma-separated list), the customer name, and a human-readable timestamp.

**Validates: Requirements 1.2, 1.3, 1.4, 6.1, 6.4**

### Property 3: Role-Based Notification Filtering

*For any* new order event, when the notification system processes the event, notifications should only be sent to users with role 'admin' or 'staff', and no notifications should be sent to users with role 'user'.

**Validates: Requirements 3.1**

### Property 4: Permission Denial Prevents Notifications

*For any* user who has denied notification permission, when an order event is received, no notification should be displayed to that user.

**Validates: Requirements 2.2**

### Property 5: Notification Click Behavior

*For any* notification displayed, when the user clicks on it, the application window should be focused and the view should navigate to the orders page, and the notification should be immediately closed.

**Validates: Requirements 4.1, 4.2, 8.2**

### Property 6: SSE Event Triggers Notification

*For any* SSE event of type 'order_created' received by the SSE client, the notification system should trigger a notification display with the parsed order data.

**Validates: Requirements 5.2, 5.3**

### Property 7: SSE Connection Failure Handling

*For any* SSE connection failure or error, the notification system should handle the error gracefully without crashing the application.

**Validates: Requirements 5.4**

### Property 8: Notification Icon Consistency

*For any* notification displayed, the notification should use the application icon as its icon.

**Validates: Requirements 6.5**

### Property 9: Notification Auto-Close Timeout

*For any* notification displayed, if the user does not interact with it, the notification should automatically close after 10 seconds.

**Validates: Requirements 8.1**

### Property 10: Duplicate Notification Prevention

*For any* order, if multiple SSE events are received for the same order ID within a short time window, only one notification should be displayed.

**Validates: Requirements 8.4**

### Property 11: Graceful Error Handling

*For any* error that occurs during notification display, the error should be logged to the console and the application should continue operating normally without throwing unhandled exceptions.

**Validates: Requirements 9.1, 9.2, 9.4**

### Property 12: Multi-Language Support

*For any* notification displayed, the notification title and body text should be rendered in the user's currently selected language (Vietnamese, English, or Japanese).

**Validates: Requirements 10.1, 10.2**

## Error Handling

### Permission Errors

**Scenario**: User denies notification permission or permission is unavailable.

**Handling**:
- Check permission status before attempting to display notifications
- If permission is 'denied' or 'default', do not attempt to show notifications
- Log permission status for debugging purposes
- Continue application operation normally

**Implementation**:
```typescript
if (Notification.permission !== 'granted') {
  console.warn('Notification permission not granted:', Notification.permission);
  return; // Exit gracefully without displaying notification
}
```

### Browser Compatibility Errors

**Scenario**: Browser does not support Web Notifications API.

**Handling**:
- Check for `window.Notification` availability on initialization
- If not available, log a warning and disable notification features
- Set a flag to prevent future notification attempts
- Continue application operation without notifications

**Implementation**:
```typescript
if (!('Notification' in window)) {
  console.warn('This browser does not support desktop notifications');
  return { isSupported: false };
}
```

### Notification Display Errors

**Scenario**: Notification constructor throws an error or notification creation fails.

**Handling**:
- Wrap notification creation in try-catch block
- Log the error with context (order ID, user ID)
- Continue application operation
- Do not retry automatically to avoid notification spam

**Implementation**:
```typescript
try {
  const notification = new Notification(title, options);
  // ... handle notification
} catch (error) {
  console.error('Failed to display notification:', error, { orderId, userId });
  // Continue without notification
}
```

### SSE Connection Errors

**Scenario**: SSE connection fails, disconnects, or receives malformed data.

**Handling**:
- Implement exponential backoff for reconnection attempts
- Parse SSE data with error handling for malformed JSON
- Log connection errors for debugging
- Continue application operation with degraded real-time functionality

**Implementation**:
```typescript
eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  setError(error);
  // Implement reconnection logic with backoff
  setTimeout(() => reconnect(), backoffDelay);
};
```

### Order Data Fetching Errors

**Scenario**: Failed to fetch order details after receiving SSE event.

**Handling**:
- Log the error with order ID
- Do not display notification if order details cannot be fetched
- Continue listening for future events
- Consider implementing retry logic with limited attempts

**Implementation**:
```typescript
try {
  const orderDetails = await ordersAPI.getById(orderId);
  showNotification(orderDetails);
} catch (error) {
  console.error('Failed to fetch order details:', error, { orderId });
  // Skip this notification, continue listening
}
```

### Language/Translation Errors

**Scenario**: Translation key is missing or language is not supported.

**Handling**:
- Fallback to Vietnamese (default language) if translation is missing
- Log missing translation keys for future fixes
- Display notification with available translations
- Do not block notification display due to translation issues

**Implementation**:
```typescript
const getTranslation = (key: string, lang: Language): string => {
  const translation = TRANSLATIONS[lang]?.[key];
  if (!translation) {
    console.warn(`Missing translation: ${key} for language ${lang}`);
    return TRANSLATIONS.vi[key] || key; // Fallback to Vietnamese
  }
  return translation;
};
```

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points:
- Permission request flow for admin users on first load
- Notification display with specific order data
- Click handler navigation behavior
- Browser compatibility detection
- Error scenarios (permission denied, API unavailable)

**Property-Based Tests**: Verify universal properties across randomized inputs:
- Notification display for all order types
- Role-based filtering across different user roles
- Content formatting for various dish combinations
- Multi-language support across all three languages
- Error handling for various failure scenarios

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference
- Tag format: `Feature: windows-order-notifications, Property {number}: {property_text}`

**Example Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: windows-order-notifications, Property 2: Notification Content Completeness
test('notification body contains all required order information', () => {
  fc.assert(
    fc.property(
      fc.record({
        orderId: fc.integer({ min: 1 }),
        dishNames: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 2 }),
        customerName: fc.string({ minLength: 1 }),
        timestamp: fc.date(),
      }),
      (orderData) => {
        const notification = formatNotification(orderData);
        
        // Verify all dish names are present
        orderData.dishNames.forEach(dish => {
          expect(notification.body).toContain(dish);
        });
        
        // Verify customer name is present
        expect(notification.body).toContain(orderData.customerName);
        
        // Verify timestamp is present (in some format)
        expect(notification.body).toMatch(/\d{1,2}:\d{2}/); // Time format
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage for notification service and hooks
- **Property Test Coverage**: All 12 correctness properties implemented as property-based tests
- **Integration Tests**: SSE connection → notification display flow
- **Manual Testing**: Browser compatibility across Chrome, Firefox, Edge

### Testing Priorities

1. **High Priority**: Properties 1-6 (core functionality)
2. **Medium Priority**: Properties 7-10 (lifecycle and error handling)
3. **Low Priority**: Properties 11-12 (localization and edge cases)

