# iPhone Safari Responsive Fix - Implementation Tasks

## Phase 1: Exploratory Testing (Bug Confirmation)

- [ ] 1.1 Test on iPhone 14 Pro (Portrait) - Document button obstruction behavior
- [ ] 1.2 Test on iPhone SE (Portrait) - Document button accessibility issues
- [ ] 1.3 Test on iPhone 13 (Landscape) - Document button visibility in landscape mode
- [ ] 1.4 Test dynamic toolbar behavior - Document how toolbar affects button during scrolling
- [ ] 1.5 Capture screenshots/videos of bug manifestation on actual devices

## Phase 2: Implementation

- [x] 2.1 Update viewport meta tag in `index.html` to include `viewport-fit=cover`
- [x] 2.2 Add safe area inset CSS rules in `src/index.css` for order button container
- [x] 2.3 Apply `padding-bottom: max(1rem, calc(env(safe-area-inset-bottom) + 1rem))` to order button
- [x] 2.4 Use `@supports` query to ensure safe area padding only applies when supported
- [ ] 2.5 Test implementation on iPhone Safari to verify button is fully visible and tappable

## Phase 3: Fix Verification

- [ ] 3.1 Verify button visibility on iPhone 14 Pro (Portrait) - Should be fully visible with proper padding
- [ ] 3.2 Verify button tappability on iPhone SE (Portrait) - Should be accessible and responsive
- [ ] 3.3 Verify button in landscape mode on iPhone 13 - Should remain accessible
- [ ] 3.4 Verify button with notch devices (iPhone X and later) - Should respect all safe areas
- [ ] 3.5 Verify dynamic toolbar behavior - Button should remain accessible during scrolling

## Phase 4: Preservation Testing

- [ ] 4.1 Test on Desktop Chrome (Windows/Mac) - Verify no visual changes to button
- [ ] 4.2 Test on Desktop Firefox - Verify button displays exactly as before
- [ ] 4.3 Test on Desktop Safari (macOS) - Verify button displays exactly as before
- [ ] 4.4 Test on Android Chrome - Verify button displays exactly as before
- [ ] 4.5 Test on iPad Safari - Verify button displays exactly as before
- [ ] 4.6 Test theme switching (fusion/corporate) - Verify both themes work correctly
- [ ] 4.7 Test language switching (vi/en/ja) - Verify all languages display correctly

## Phase 5: Integration Testing

- [ ] 5.1 Complete full order flow on iPhone Safari (select dishes → order → confirm)
- [ ] 5.2 Complete full order flow on Desktop Chrome (verify no regression)
- [ ] 5.3 Complete full order flow on Android Chrome (verify no regression)
- [ ] 5.4 Test rotation behavior (portrait ↔ landscape) on iPhone
- [ ] 5.5 Test with different iPhone models (SE, 13, 14 Pro, 15) if available

## Phase 6: Documentation & Deployment

- [ ] 6.1 Document the fix implementation and testing results
- [ ] 6.2 Update any relevant user documentation if needed
- [ ] 6.3 Deploy to production
- [ ] 6.4 Monitor for any issues post-deployment
