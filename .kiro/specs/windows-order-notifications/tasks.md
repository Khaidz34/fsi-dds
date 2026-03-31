# Tasks: Windows Order Notifications

## Phase 1: Foundation and Service Layer

### Task 1.1: Create NotificationService Module
- [x] 1.1.1 Create `src/services/notificationService.ts` file
- [x] 1.1.2 Implement browser support detection
- [x] 1.1.3 Implement permission request function
- [x] 1.1.4 Implement permission status getter
- [x] 1.1.5 Add error handling for unsupported browsers

### Task 1.2: Implement Notification Display Logic
- [x] 1.2.1 Create `showOrderNotification` function
- [x] 1.2.2 Implement notification content formatting
- [x] 1.2.3 Add notification click handler (focus window + navigate)
- [x] 1.2.4 Implement auto-close after 10 seconds
- [ ] 1.2.5 Add duplicate notification prevention

### Task 1.3: Add Translation Keys
- [x] 1.3.1 Add Vietnamese notification translations to TRANSLATIONS object
- [x] 1.3.2 Add English notification translations to TRANSLATIONS object
- [x] 1.3.3 Add Japanese notification translations to TRANSLATIONS object

## Phase 2: SSE Integration

### Task 2.1: Create useSSE Hook
- [x] 2.1.1 Create `src/hooks/useSSE.ts` file
- [x] 2.1.2 Implement SSE connection establishment
- [x] 2.1.3 Implement event parsing logic
- [x] 2.1.4 Add error handling and reconnection logic
- [x] 2.1.5 Implement cleanup on unmount

### Task 2.2: Create useNotifications Hook
- [x] 2.2.1 Create `src/hooks/useNotifications.ts` file
- [x] 2.2.2 Integrate NotificationService with SSE events
- [x] 2.2.3 Implement role-based filtering (admin/staff only)
- [x] 2.2.4 Add permission request on mount for admin/staff
- [x] 2.2.5 Fetch order details when SSE event received
- [x] 2.2.6 Display notification with formatted data

## Phase 3: Backend Enhancement

### Task 3.1: Enhance SSE Order Notification Payload
- [x] 3.1.1 Modify POST /api/orders endpoint in `backend/server.js`
- [x] 3.1.2 Fetch dish details (names in all languages) when creating order
- [x] 3.1.3 Fetch customer details (fullname) when creating order
- [x] 3.1.4 Include dish names and customer name in SSE notification payload
- [ ] 3.1.5 Test SSE payload includes all required fields

## Phase 4: Frontend Integration

### Task 4.1: Integrate useNotifications in App Component
- [x] 4.1.1 Import useNotifications hook in `src/App.tsx`
- [x] 4.1.2 Call useNotifications with user and language
- [ ] 4.1.3 Display permission status in UI (optional)
- [x] 4.1.4 Test notification display on order creation

## Phase 5: Testing

### Task 5.1: Write Unit Tests
- [ ] 5.1.1 Test NotificationService permission management
- [ ] 5.1.2 Test NotificationService notification display
- [ ] 5.1.3 Test useSSE connection and event parsing
- [ ] 5.1.4 Test useNotifications role filtering
- [ ] 5.1.5 Test error handling scenarios

### Task 5.2: Write Property-Based Tests (PBT)
- [ ] 5.2.1 PBT: Notification display on order creation (Property 1)
- [ ] 5.2.2 PBT: Notification content completeness (Property 2)
- [ ] 5.2.3 PBT: Role-based filtering (Property 3)
- [ ] 5.2.4 PBT: Permission denial prevents notifications (Property 4)
- [ ] 5.2.5 PBT: Notification click behavior (Property 5)
- [ ] 5.2.6 PBT: SSE event triggers notification (Property 6)
- [ ] 5.2.7 PBT: SSE connection failure handling (Property 7)
- [ ] 5.2.8 PBT: Notification icon consistency (Property 8)
- [ ] 5.2.9 PBT: Notification auto-close timeout (Property 9)
- [ ] 5.2.10 PBT: Duplicate notification prevention (Property 10)
- [ ] 5.2.11 PBT: Graceful error handling (Property 11)
- [ ] 5.2.12 PBT: Multi-language support (Property 12)

### Task 5.3: Manual Testing
- [ ] 5.3.1 Test on Chrome browser (version 50+)
- [ ] 5.3.2 Test on Firefox browser (version 50+)
- [ ] 5.3.3 Test on Edge browser (version 14+)
- [ ] 5.3.4 Test permission request flow
- [ ] 5.3.5 Test notification click navigation
- [ ] 5.3.6 Test multi-language display (vi, en, ja)

## Phase 6: Documentation and Deployment

### Task 6.1: Update Documentation
- [ ] 6.1.1 Add notification feature to README
- [ ] 6.1.2 Document browser compatibility requirements
- [ ] 6.1.3 Add troubleshooting guide for notification issues

### Task 6.2: Deploy and Verify
- [ ] 6.2.1 Deploy backend changes to production
- [ ] 6.2.2 Deploy frontend changes to production
- [ ] 6.2.3 Verify notifications work in production environment
- [ ] 6.2.4 Monitor error logs for notification issues

