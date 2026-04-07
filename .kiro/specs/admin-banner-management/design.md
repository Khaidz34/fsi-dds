# Design Document: Admin Banner Management

## Overview

The Admin Banner Management system enables administrators to dynamically switch between two banner types displayed on the website homepage: the Game Banner (Fusion Slice Game) and the Anniversary Banner (1-year celebration). The system persists banner configuration in Supabase, ensures all users see the selected banner, and provides a responsive experience across all devices.

This design integrates the existing FusionSliceGame component with a new Anniversary Banner component, adds database storage for banner settings, implements admin-only API endpoints for banner management, and includes caching for optimal performance.

## Architecture

### System Components

The system follows a three-tier architecture:

1. **Frontend Layer**
   - Banner Display Component (renders selected banner)
   - Admin Banner Control Panel (admin-only UI for banner selection)
   - Game Banner Component (existing FusionSliceGame)
   - Anniversary Banner Component (new component to be integrated)

2. **Backend Layer**
   - Banner Settings API (GET/POST endpoints)
   - Authentication Middleware (admin role verification)
   - Cache Layer (in-memory caching with 60s TTL)

3. **Data Layer**
   - Supabase PostgreSQL database
   - banner_settings table (stores current banner configuration)

### Data Flow

```
User Request → Frontend → API Call → Cache Check → Database Query → Response
                ↓                                                      ↓
         Banner Display ← Banner Settings ← Cache/DB ← API Response ←┘

Admin Update → Admin Panel → POST /api/banner/settings → Validate → Update DB → Invalidate Cache
```

### Technology Stack

- **Frontend**: React, TypeScript, Framer Motion (animations)
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Caching**: In-memory cache with TTL
- **Authentication**: JWT tokens with role-based access control
- **AI Integration**: Google Gemini API (optional, for Anniversary Banner background)

## Components and Interfaces

### Frontend Components

#### 1. BannerDisplay Component

**Purpose**: Main component that fetches banner settings and renders the appropriate banner type.

**Props**: None (fetches data internally)

**State**:
```typescript
interface BannerDisplayState {
  bannerType: 'game' | 'anniversary' | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Behavior**:
- Fetches banner settings on mount via GET /api/banner/settings
- Renders Game Banner if bannerType === 'game'
- Renders Anniversary Banner if bannerType === 'anniversary'
- Shows loading state while fetching
- Falls back to Game Banner on error
- Refreshes settings every 60 seconds

#### 2. AdminBannerControl Component

**Purpose**: Admin-only control panel for selecting banner type.

**Props**: None

**State**:
```typescript
interface AdminBannerControlState {
  selectedBanner: 'game' | 'anniversary';
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
}
```

**Behavior**:
- Only visible to users with role === 'admin'
- Displays two radio buttons or toggle for banner selection
- Calls POST /api/banner/settings on selection change
- Shows success/error feedback
- Optimistically updates UI before server response

#### 3. AnniversaryBanner Component

**Purpose**: Displays 1-year anniversary celebration banner with countdown timer.

**Props**:
```typescript
interface AnniversaryBannerProps {
  onClose?: () => void;
}
```

**Features**:
- Countdown timer to April 10, 2026
- FSI DDS logo display
- Anniversary message in multiple languages
- AI-generated background (via Gemini API) with gradient fallback
- Framer Motion animations
- Responsive design (320px - 2560px)

**State**:
```typescript
interface AnniversaryBannerState {
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  backgroundImage: string | null;
  isLoadingBackground: boolean;
}
```

#### 4. GameBanner Component (Existing)

**Purpose**: Displays Fusion Slice Game banner with play button.

**Current Implementation**: FusionSliceGame component
- Game canvas with fruit slicing mechanics
- Score tracking
- Responsive design
- Modal overlay with close button

### Backend API Endpoints

#### GET /api/banner/settings

**Purpose**: Retrieve current banner configuration

**Authentication**: None (public endpoint)

**Response**:
```typescript
{
  bannerType: 'game' | 'anniversary';
  updatedAt: string; // ISO 8601 timestamp
  updatedBy: number | null; // user ID
}
```

**Status Codes**:
- 200: Success
- 500: Database error (returns default: { bannerType: 'game' })

**Caching**: 60-second in-memory cache

#### POST /api/banner/settings

**Purpose**: Update banner configuration (admin only)

**Authentication**: Required (JWT token, admin role)

**Request Body**:
```typescript
{
  bannerType: 'game' | 'anniversary';
}
```

**Response**:
```typescript
{
  success: true;
  bannerType: 'game' | 'anniversary';
  updatedAt: string;
  updatedBy: number;
}
```

**Status Codes**:
- 200: Success
- 400: Invalid banner type
- 401: Unauthorized (no token or invalid token)
- 403: Forbidden (non-admin user)
- 500: Database error

**Side Effects**:
- Invalidates banner settings cache
- Logs change with user ID and timestamp

### Custom Hooks

#### useBannerSettings

**Purpose**: Fetch and manage banner settings state

```typescript
function useBannerSettings(): {
  bannerType: 'game' | 'anniversary' | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Behavior**:
- Fetches banner settings on mount
- Polls every 60 seconds for updates
- Provides refetch function for manual refresh
- Handles loading and error states

#### useAdminBannerControl

**Purpose**: Manage admin banner selection and updates

```typescript
function useAdminBannerControl(): {
  selectedBanner: 'game' | 'anniversary';
  updateBanner: (type: 'game' | 'anniversary') => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}
```

**Behavior**:
- Fetches current banner settings
- Provides updateBanner function to change banner type
- Handles optimistic updates
- Manages loading and error states

## Data Models

### Database Schema

#### banner_settings Table

```sql
CREATE TABLE banner_settings (
  id SERIAL PRIMARY KEY,
  banner_type VARCHAR(20) NOT NULL CHECK (banner_type IN ('game', 'anniversary')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Index for performance
CREATE INDEX idx_banner_settings_type ON banner_settings(banner_type);

-- Insert default row
INSERT INTO banner_settings (id, banner_type, updated_at, updated_by)
VALUES (1, 'game', NOW(), NULL)
ON CONFLICT (id) DO NOTHING;
```

**Constraints**:
- Only one row allowed (id = 1)
- banner_type must be 'game' or 'anniversary'
- updated_by references users table (nullable for initial setup)

**Indexes**:
- Primary key on id
- Index on banner_type for query optimization

### TypeScript Interfaces

```typescript
// Banner Settings
interface BannerSettings {
  id: number;
  bannerType: 'game' | 'anniversary';
  updatedAt: string;
  updatedBy: number | null;
}

// API Request/Response Types
interface UpdateBannerRequest {
  bannerType: 'game' | 'anniversary';
}

interface BannerSettingsResponse {
  bannerType: 'game' | 'anniversary';
  updatedAt: string;
  updatedBy: number | null;
}

interface UpdateBannerResponse {
  success: boolean;
  bannerType: 'game' | 'anniversary';
  updatedAt: string;
  updatedBy: number;
}

// Component Props
interface AnniversaryBannerProps {
  onClose?: () => void;
}

interface GameBannerProps {
  onClose?: () => void;
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Banner Selection Persistence

For any banner type selection made by an admin, the system should persist the selection to the database with updated_at timestamp and updated_by user ID.

**Validates: Requirements 1.2, 5.3, 6.5**

### Property 2: Banner Display Consistency

For any banner type stored in the database, all users accessing the homepage should see the same banner type rendered.

**Validates: Requirements 1.3, 2.1**

### Property 3: Banner Update Propagation

For any admin banner type change, all users should see the updated banner within 5 seconds of the change.

**Validates: Requirements 1.4**

### Property 4: Correct Component Rendering

For any banner type value ('game' or 'anniversary'), the system should render the corresponding banner component (Game_Banner for 'game', Anniversary_Banner for 'anniversary').

**Validates: Requirements 2.2, 2.3**

### Property 5: Banner Load Performance

For any user accessing the homepage, the banner should be visible within 2 seconds of page load.

**Validates: Requirements 2.4**

### Property 6: Database Constraint Enforcement

For any attempt to insert or update banner_type in the database, only the values 'game' or 'anniversary' should be accepted, and any other value should be rejected.

**Validates: Requirements 5.2, 7.3**

### Property 7: Single Record Invariant

For any database operation on the banner_settings table, the table should contain exactly one record after the operation completes.

**Validates: Requirements 5.4**

### Property 8: Admin Access Control

For any user attempting to access the Admin Panel or update banner settings, access should only be granted if the user's role is 'admin', otherwise access should be denied with an error message.

**Validates: Requirements 6.1, 6.2**

### Property 9: JWT Authentication

For any request to update banner settings, the system should validate the JWT token and return HTTP 401 if the token is invalid or missing.

**Validates: Requirements 6.3, 6.4**

### Property 10: API Response Correctness

For any API request to banner endpoints, the system should return the appropriate HTTP status code: 200 for success, 400 for invalid input, 401 for unauthorized access, 403 for forbidden access, and 500 for server errors.

**Validates: Requirements 7.4, 7.5, 7.6**

### Property 11: Cache Behavior

For any banner settings query within 60 seconds of a previous query, the system should return cached data without querying the database, and for any banner settings update, the cache should be invalidated immediately.

**Validates: Requirements 8.1, 8.2**

### Property 12: Lazy Loading

For any banner component (Game_Banner or Anniversary_Banner), heavy assets (game assets or AI-generated backgrounds) should load asynchronously after the initial component render.

**Validates: Requirements 8.3, 8.4**

### Property 13: Performance Metrics

For any page load, the First Contentful Paint should occur within 1.5 seconds.

**Validates: Requirements 8.5**

### Property 14: Error Logging

For any error that occurs in the banner system, the system should log the error to the console with a complete stack trace.

**Validates: Requirements 9.3**

### Property 15: Loading State Display

For any banner settings fetch operation, the system should display a loading indicator while the fetch is in progress.

**Validates: Requirements 9.5**

### Property 16: Responsive Design

For any viewport width between 320px and 2560px, both Game_Banner and Anniversary_Banner should render without layout issues or horizontal scrolling.

**Validates: Requirements 4.1, 4.2**

## Error Handling

### Error Categories

1. **Database Errors**
   - Connection failures
   - Query timeouts
   - Constraint violations

2. **Authentication Errors**
   - Missing JWT token
   - Invalid JWT token
   - Expired JWT token
   - Insufficient permissions (non-admin)

3. **Validation Errors**
   - Invalid banner type
   - Missing required fields

4. **External API Errors**
   - Gemini API timeout (8 seconds)
   - Gemini API rate limiting
   - Gemini API authentication failure

5. **Component Errors**
   - Anniversary Banner render failure
   - Game Banner render failure

### Error Handling Strategies

#### Database Errors

**Strategy**: Graceful degradation with fallback to default banner

```typescript
try {
  const settings = await fetchBannerSettings();
  return settings;
} catch (error) {
  console.error('Database error:', error);
  // Fall back to default game banner
  return { bannerType: 'game', updatedAt: new Date().toISOString(), updatedBy: null };
}
```

**User Experience**: Users see the Game Banner (default) without error messages

**Logging**: Full error with stack trace logged to console

#### Authentication Errors

**Strategy**: Return appropriate HTTP status codes with error messages

```typescript
// Missing token
if (!token) {
  return res.status(401).json({ error: 'Access token required' });
}

// Invalid token
if (!isValidToken(token)) {
  return res.status(401).json({ error: 'Invalid token' });
}

// Non-admin user
if (user.role !== 'admin') {
  return res.status(403).json({ error: 'Admin access required' });
}
```

**User Experience**: Clear error messages explaining why access was denied

**Logging**: Authentication failures logged with user ID (if available)

#### Validation Errors

**Strategy**: Return HTTP 400 with specific validation error messages

```typescript
if (!['game', 'anniversary'].includes(bannerType)) {
  return res.status(400).json({ 
    error: 'Invalid banner type',
    message: 'Banner type must be "game" or "anniversary"'
  });
}
```

**User Experience**: Admin sees specific error message about what went wrong

**Logging**: Validation errors logged with request details

#### External API Errors (Gemini)

**Strategy**: Timeout after 8 seconds and fall back to gradient background

```typescript
const fetchAIBackground = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(geminiApiUrl, {
      signal: controller.signal,
      // ... other options
    });
    
    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    console.warn('Gemini API error, using gradient fallback:', error);
    return null; // Triggers gradient background
  }
};
```

**User Experience**: Anniversary Banner displays with gradient background instead of AI-generated image

**Logging**: API errors logged as warnings (not critical failures)

#### Component Errors

**Strategy**: React Error Boundaries with fallback to Game Banner

```typescript
class BannerErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Banner component error:', error, errorInfo);
    this.setState({ hasError: true });
  }
  
  render() {
    if (this.state.hasError) {
      return <GameBanner />; // Fallback to game banner
    }
    return this.props.children;
  }
}
```

**User Experience**: Users see Game Banner if Anniversary Banner fails to render

**Logging**: Component errors logged with full stack trace

### Error Recovery

1. **Automatic Retry**: Database queries retry once after 1 second delay
2. **Cache Fallback**: If database fails, use last cached value (if available)
3. **Default Fallback**: If all else fails, display Game Banner
4. **User Notification**: Admin users see error notifications; regular users see seamless fallback

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Unit Testing

Unit tests focus on specific scenarios and edge cases:

1. **API Endpoint Tests**
   - GET /api/banner/settings returns correct format
   - POST /api/banner/settings with valid data succeeds
   - POST /api/banner/settings with invalid banner type returns 400
   - POST /api/banner/settings without auth token returns 401
   - POST /api/banner/settings with non-admin user returns 403

2. **Component Tests**
   - BannerDisplay renders Game Banner when bannerType is 'game'
   - BannerDisplay renders Anniversary Banner when bannerType is 'anniversary'
   - BannerDisplay shows loading state while fetching
   - BannerDisplay falls back to Game Banner on error
   - AdminBannerControl only renders for admin users
   - AdminBannerControl updates banner on selection change

3. **Database Tests**
   - banner_settings table enforces CHECK constraint on banner_type
   - banner_settings table maintains single record constraint
   - Updates to banner_settings record updated_at and updated_by

4. **Cache Tests**
   - Cache returns same data within TTL period
   - Cache invalidates on banner update
   - Cache expires after 60 seconds

5. **Error Handling Tests**
   - Database connection failure triggers fallback
   - Gemini API timeout triggers gradient background
   - Component error triggers Error Boundary fallback

### Property-Based Testing

Property tests verify universal behaviors across randomized inputs. Each test runs a minimum of 100 iterations.

**Testing Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

**Tagging Format**: Each test includes a comment referencing the design property:
```typescript
// Feature: admin-banner-management, Property 1: Banner Selection Persistence
```

#### Property Test Examples

**Property 1: Banner Selection Persistence**
```typescript
// Feature: admin-banner-management, Property 1: Banner Selection Persistence
fc.assert(
  fc.asyncProperty(
    fc.constantFrom('game', 'anniversary'),
    fc.integer({ min: 1, max: 1000 }), // admin user ID
    async (bannerType, adminId) => {
      // Update banner settings
      await updateBannerSettings(bannerType, adminId);
      
      // Fetch from database
      const settings = await fetchBannerSettingsFromDB();
      
      // Verify persistence
      expect(settings.bannerType).toBe(bannerType);
      expect(settings.updatedBy).toBe(adminId);
      expect(settings.updatedAt).toBeDefined();
    }
  ),
  { numRuns: 100 }
);
```

**Property 6: Database Constraint Enforcement**
```typescript
// Feature: admin-banner-management, Property 6: Database Constraint Enforcement
fc.assert(
  fc.asyncProperty(
    fc.string().filter(s => s !== 'game' && s !== 'anniversary'),
    async (invalidBannerType) => {
      // Attempt to update with invalid banner type
      const result = await updateBannerSettings(invalidBannerType, 1);
      
      // Verify rejection
      expect(result.status).toBe(400);
      expect(result.error).toContain('Invalid banner type');
    }
  ),
  { numRuns: 100 }
);
```

**Property 7: Single Record Invariant**
```typescript
// Feature: admin-banner-management, Property 7: Single Record Invariant
fc.assert(
  fc.asyncProperty(
    fc.constantFrom('game', 'anniversary'),
    async (bannerType) => {
      // Perform update
      await updateBannerSettings(bannerType, 1);
      
      // Count records in table
      const count = await countBannerSettingsRecords();
      
      // Verify exactly one record
      expect(count).toBe(1);
    }
  ),
  { numRuns: 100 }
);
```

**Property 11: Cache Behavior**
```typescript
// Feature: admin-banner-management, Property 11: Cache Behavior
fc.assert(
  fc.asyncProperty(
    fc.constantFrom('game', 'anniversary'),
    async (bannerType) => {
      // First fetch (populates cache)
      const firstFetch = await fetchBannerSettings();
      const firstTimestamp = Date.now();
      
      // Second fetch within TTL (should use cache)
      await sleep(1000); // 1 second delay
      const secondFetch = await fetchBannerSettings();
      const secondTimestamp = Date.now();
      
      // Verify cache was used (no database query)
      expect(secondFetch).toEqual(firstFetch);
      expect(secondTimestamp - firstTimestamp).toBeLessThan(60000);
      
      // Update banner (should invalidate cache)
      await updateBannerSettings(bannerType === 'game' ? 'anniversary' : 'game', 1);
      
      // Third fetch (should query database)
      const thirdFetch = await fetchBannerSettings();
      
      // Verify cache was invalidated
      expect(thirdFetch.bannerType).not.toBe(firstFetch.bannerType);
    }
  ),
  { numRuns: 100 }
);
```

**Property 16: Responsive Design**
```typescript
// Feature: admin-banner-management, Property 16: Responsive Design
fc.assert(
  fc.property(
    fc.integer({ min: 320, max: 2560 }), // viewport width
    fc.constantFrom('game', 'anniversary'),
    (viewportWidth, bannerType) => {
      // Set viewport
      setViewportWidth(viewportWidth);
      
      // Render banner
      const banner = renderBanner(bannerType);
      
      // Verify no horizontal overflow
      expect(banner.scrollWidth).toBeLessThanOrEqual(viewportWidth);
      
      // Verify no layout issues
      expect(banner.hasLayoutIssues()).toBe(false);
    }
  ),
  { numRuns: 100 }
);
```

### Integration Testing

Integration tests verify interactions between components:

1. **Admin Workflow**
   - Admin logs in → sees Admin Panel → selects banner → banner updates for all users

2. **Database Integration**
   - API endpoint → database query → cache update → response

3. **Component Integration**
   - BannerDisplay → fetch settings → render correct banner component

### End-to-End Testing

E2E tests verify complete user journeys:

1. **User Views Banner**
   - User navigates to homepage → banner loads → correct banner displays

2. **Admin Changes Banner**
   - Admin logs in → navigates to admin panel → selects different banner → verifies change

3. **Responsive Behavior**
   - User accesses site on mobile → banner displays correctly → user rotates device → banner adjusts

### Visual Regression Testing

Visual tests capture screenshots and compare against baselines:

1. **Game Banner**
   - Desktop view (1920x1080)
   - Tablet view (768x1024)
   - Mobile view (375x667)

2. **Anniversary Banner**
   - Desktop view (1920x1080)
   - Tablet view (768x1024)
   - Mobile view (375x667)
   - With AI background
   - With gradient fallback

### Performance Testing

Performance tests measure key metrics:

1. **First Contentful Paint**: < 1.5 seconds
2. **Banner Load Time**: < 2 seconds
3. **API Response Time**: < 200ms (cached), < 500ms (uncached)
4. **Cache Hit Rate**: > 90% under normal load

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% for API endpoints and business logic
- **Integration Test Coverage**: All critical user paths
- **E2E Test Coverage**: All user journeys and admin workflows
- **Property Test Coverage**: All correctness properties from design document

