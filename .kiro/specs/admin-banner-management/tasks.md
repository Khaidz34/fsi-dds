# Implementation Plan: Admin Banner Management

## Overview

This implementation plan converts the Admin Banner Management design into actionable coding tasks. The feature enables administrators to dynamically switch between Game Banner and Anniversary Banner on the website homepage. Implementation follows a bottom-up approach: database setup → backend API → frontend hooks → UI components → integration.

## Tasks

- [x] 1. Set up database schema and initial configuration
  - Create banner_settings table in Supabase with id, banner_type, updated_at, updated_by fields
  - Add CHECK constraint to ensure banner_type is 'game' or 'anniversary'
  - Add CONSTRAINT to ensure only one row exists (id = 1)
  - Create index on banner_type field for query optimization
  - Insert default row with banner_type = 'game'
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement backend API endpoints
  - [x] 2.1 Create GET /api/banner/settings endpoint
    - Implement endpoint to fetch current banner configuration
    - Add 60-second in-memory cache with TTL
    - Return { bannerType, updatedAt, updatedBy } format
    - Handle database errors with fallback to { bannerType: 'game' }
    - _Requirements: 7.1, 7.4, 8.1_

  - [ ]* 2.2 Write property test for GET endpoint caching
    - **Property 11: Cache Behavior**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 2.3 Create POST /api/banner/settings endpoint
    - Implement admin-only endpoint to update banner configuration
    - Add authenticateToken middleware for JWT validation
    - Validate user role is 'admin' (return 403 if not)
    - Validate banner_type is 'game' or 'anniversary' (return 400 if invalid)
    - Update database with new banner_type, updated_at, updated_by
    - Invalidate cache immediately after update
    - Return { success, bannerType, updatedAt, updatedBy }
    - _Requirements: 1.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.3, 7.5, 7.6, 8.2_

  - [ ]* 2.4 Write property test for banner selection persistence
    - **Property 1: Banner Selection Persistence**
    - **Validates: Requirements 1.2, 5.3, 6.5**

  - [ ]* 2.5 Write property test for database constraint enforcement
    - **Property 6: Database Constraint Enforcement**
    - **Validates: Requirements 5.2, 7.3**

  - [ ]* 2.6 Write property test for single record invariant
    - **Property 7: Single Record Invariant**
    - **Validates: Requirements 5.4**

  - [ ]* 2.7 Write property test for admin access control
    - **Property 8: Admin Access Control**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 2.8 Write property test for JWT authentication
    - **Property 9: JWT Authentication**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 2.9 Write property test for API response correctness
    - **Property 10: API Response Correctness**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [ ] 3. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create frontend API service layer
  - [x] 4.1 Add banner API functions to services/api.ts
    - Create bannerAPI.getSettings() function to call GET /api/banner/settings
    - Create bannerAPI.updateSettings(bannerType) function to call POST /api/banner/settings
    - Add proper TypeScript types for request/response
    - Handle network errors with try-catch
    - _Requirements: 7.1, 7.2_

  - [ ]* 4.2 Write unit tests for banner API service
    - Test getSettings returns correct format
    - Test updateSettings sends correct payload
    - Test error handling for network failures
    - _Requirements: 7.1, 7.2_

- [x] 5. Implement custom React hooks
  - [x] 5.1 Create useBannerSettings hook
    - Fetch banner settings on mount using bannerAPI.getSettings()
    - Return { bannerType, isLoading, error, refetch }
    - Poll for updates every 60 seconds
    - Handle loading and error states
    - _Requirements: 2.1, 9.5_

  - [ ]* 5.2 Write unit tests for useBannerSettings hook
    - Test initial fetch on mount
    - Test polling every 60 seconds
    - Test error handling
    - Test refetch function
    - _Requirements: 2.1, 9.5_

  - [x] 5.3 Create useAdminBannerControl hook
    - Fetch current banner settings on mount
    - Provide updateBanner(type) function to call bannerAPI.updateSettings()
    - Return { selectedBanner, updateBanner, isSaving, error }
    - Implement optimistic updates
    - Handle loading and error states
    - _Requirements: 1.2, 1.4_

  - [ ]* 5.4 Write unit tests for useAdminBannerControl hook
    - Test initial fetch
    - Test updateBanner function
    - Test optimistic updates
    - Test error handling
    - _Requirements: 1.2, 1.4_

- [x] 6. Integrate Anniversary Banner component
  - [x] 6.1 Copy AnniversaryBanner component from remix project
    - Copy AnniversaryBanner.tsx from remix_-fsi-dds-1st-anniversary-banner to src/components/
    - Ensure all dependencies are installed (framer-motion)
    - Update import paths if necessary
    - _Requirements: 3.1_

  - [x] 6.2 Implement countdown timer logic
    - Calculate time remaining until April 10, 2026
    - Update countdown every second
    - Display days, hours, minutes, seconds
    - _Requirements: 3.2_

  - [x] 6.3 Add AI-generated background support
    - Check if GEMINI_API_KEY is configured
    - If configured, call Gemini API to generate anniversary background
    - Add 8-second timeout for API call
    - Fall back to gradient background if API fails or times out
    - Lazy load background image
    - _Requirements: 3.4, 3.5, 8.3, 9.4_

  - [x] 6.4 Implement responsive design for Anniversary Banner
    - Add responsive styles for 320px - 2560px viewports
    - Adjust font sizes and spacing for mobile (<768px)
    - Test on iOS Safari, Android Chrome, Desktop browsers
    - _Requirements: 4.2, 4.3, 4.5_

  - [ ]* 6.5 Write property test for responsive design
    - **Property 16: Responsive Design**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 6.6 Write unit tests for Anniversary Banner
    - Test countdown timer updates every second
    - Test AI background loading
    - Test gradient fallback when API fails
    - Test responsive styles
    - _Requirements: 3.2, 3.4, 3.5, 4.2_

- [x] 7. Create BannerDisplay component
  - [x] 7.1 Implement BannerDisplay component
    - Use useBannerSettings hook to fetch banner configuration
    - Render GameBanner (FusionSliceGame) if bannerType === 'game'
    - Render AnniversaryBanner if bannerType === 'anniversary'
    - Show loading state while fetching
    - Fall back to GameBanner on error
    - Add React Error Boundary for component errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2_

  - [ ]* 7.2 Write property test for banner display consistency
    - **Property 2: Banner Display Consistency**
    - **Validates: Requirements 1.3, 2.1**

  - [ ]* 7.3 Write property test for correct component rendering
    - **Property 4: Correct Component Rendering**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 7.4 Write property test for banner load performance
    - **Property 5: Banner Load Performance**
    - **Validates: Requirements 2.4**

  - [ ]* 7.5 Write unit tests for BannerDisplay component
    - Test renders GameBanner when bannerType is 'game'
    - Test renders AnniversaryBanner when bannerType is 'anniversary'
    - Test shows loading state while fetching
    - Test falls back to GameBanner on error
    - Test Error Boundary catches component errors
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 9.1, 9.2_

- [ ] 8. Checkpoint - Ensure frontend component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create AdminBannerControl component
  - [x] 9.1 Implement AdminBannerControl component
    - Use useAdminBannerControl hook to manage banner selection
    - Only render if user.role === 'admin'
    - Display two radio buttons or toggle for 'game' and 'anniversary'
    - Call updateBanner() when selection changes
    - Show success/error feedback after update
    - Implement optimistic UI updates
    - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.2_

  - [ ]* 9.2 Write unit tests for AdminBannerControl component
    - Test only renders for admin users
    - Test hides for non-admin users
    - Test calls updateBanner on selection change
    - Test shows success feedback
    - Test shows error feedback
    - Test optimistic updates
    - _Requirements: 1.1, 1.2, 6.1, 6.2_

- [x] 10. Integrate banner system into App.tsx
  - [x] 10.1 Add BannerDisplay to homepage
    - Import BannerDisplay component
    - Add BannerDisplay to homepage layout (above main content)
    - Ensure proper z-index and positioning
    - _Requirements: 2.1_

  - [x] 10.2 Add AdminBannerControl to admin panel
    - Import AdminBannerControl component
    - Add AdminBannerControl to admin settings or dashboard
    - Ensure proper layout and styling
    - _Requirements: 1.1_

  - [ ]* 10.3 Write integration tests for banner system
    - Test admin workflow: login → select banner → verify display
    - Test user sees selected banner on homepage
    - Test banner updates propagate to all users
    - _Requirements: 1.4, 2.1, 10.5_

- [x] 11. Implement error handling and logging
  - [x] 11.1 Add error logging to backend
    - Log all database errors with stack trace
    - Log authentication failures with user ID
    - Log validation errors with request details
    - _Requirements: 9.3_

  - [x] 11.2 Add error handling to frontend
    - Handle network errors in API calls
    - Handle component render errors with Error Boundary
    - Display user-friendly error messages
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ]* 11.3 Write property test for error logging
    - **Property 14: Error Logging**
    - **Validates: Requirements 9.3**

  - [ ]* 11.4 Write unit tests for error handling
    - Test database error fallback
    - Test Gemini API timeout fallback
    - Test component error fallback
    - _Requirements: 9.1, 9.2, 9.4_

- [-] 12. Optimize performance and caching
  - [x] 12.1 Implement cache invalidation
    - Invalidate cache immediately after POST /api/banner/settings
    - Verify cache expires after 60 seconds
    - _Requirements: 8.1, 8.2_

  - [x] 12.2 Add lazy loading for banner assets
    - Lazy load Game Banner assets (game sprites, sounds)
    - Lazy load Anniversary Banner AI background
    - _Requirements: 8.3, 8.4_

  - [ ]* 12.3 Write property test for cache behavior
    - **Property 11: Cache Behavior**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 12.4 Write property test for performance metrics
    - **Property 13: Performance Metrics**
    - **Validates: Requirements 8.5**

  - [ ]* 12.5 Write performance tests
    - Test First Contentful Paint < 1.5 seconds
    - Test banner load time < 2 seconds
    - Test API response time < 200ms (cached), < 500ms (uncached)
    - _Requirements: 8.5, 2.4_

- [-] 13. Final checkpoint - End-to-end testing
  - [x] 13.1 Test complete admin workflow
    - Admin logs in → navigates to admin panel → selects banner → verifies change on homepage
    - _Requirements: 10.5_

  - [x] 13.2 Test banner update propagation
    - Admin changes banner → verify all users see updated banner within 5 seconds
    - _Requirements: 1.4_

  - [ ]* 13.3 Write property test for banner update propagation
    - **Property 3: Banner Update Propagation**
    - **Validates: Requirements 1.4**

  - [x] 13.4 Test responsive design on multiple devices
    - Test on iOS Safari (iPhone)
    - Test on Android Chrome (Android phone)
    - Test on Desktop browsers (Chrome, Firefox, Safari)
    - Test on tablet (iPad, Android tablet)
    - _Requirements: 4.5_

  - [x] 13.5 Test error scenarios
    - Test database connection failure
    - Test Gemini API timeout
    - Test component render error
    - Test non-admin access attempt
    - _Requirements: 9.1, 9.2, 9.4, 6.2_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → backend → frontend hooks → components → integration
- All code examples use TypeScript for type safety
- Backend uses Node.js/Express.js, frontend uses React
- Database operations use Supabase PostgreSQL
