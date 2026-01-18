# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Excessive Debug Logging in Production Code:**
- Issue: Parent service and grades service contain ~60+ `console.log` statements used during development that remain in production code
- Files: `src/core/features/user/services/parent.ts`, `src/core/features/grades/services/grades.ts`, `src/core/features/mainmenu/components/user-menu/user-menu.ts`, `src/addons/calendar/pages/index/index.ts`
- Impact: Performance overhead, cluttered browser console, potential exposure of sensitive token data in logs
- Fix approach: Remove debug logging or gate behind debug mode flag (`CoreConstants.SETTINGS_DEBUG_DISPLAY`)

**Token Mutation via Type Casting:**
- Issue: Parent service directly mutates `site.token` using `(site as any).token = ...` to bypass TypeScript protection
- Files: `src/core/features/user/services/parent.ts` (lines 218, 256, 349)
- Impact: Violates encapsulation, circumvents CoreSite API, may cause race conditions between token state and site info
- Fix approach: Use the public `site.setToken()` method defined in `src/core/classes/sites/authenticated-site.ts:178`

**Debug Pages Committed to Production:**
- Issue: Development/debugging pages are included in production build
- Files: `src/core/features/grades/pages/debug/`, `src/core/features/grades/pages/courses-debug/`
- Impact: Increases bundle size, exposes internal data structures to curious users
- Fix approach: Remove debug pages or gate behind environment flag/developer mode

**Empty Catch Blocks:**
- Issue: 50+ instances of `catch { }` or `catch () { }` that silently swallow errors
- Files: Throughout `src/core/features/`, notably in `src/core/features/user/services/parent.ts:114,322`, `src/core/features/login/services/login-helper.ts`, `src/core/features/h5p/classes/`
- Impact: Debugging difficulty, silent failures that leave app in inconsistent state
- Fix approach: At minimum log errors, ideally handle or re-throw appropriately

**Widespread `any` Type Usage:**
- Issue: 74+ files with explicit `any` type declarations, type safety bypassed
- Files: Most concentrated in `src/core/features/user/pages/about/about.ts` (9), `src/core/features/comments/pages/viewer/viewer.ts` (10), custom Aspire code
- Impact: Runtime type errors, reduced IDE assistance, maintenance difficulty
- Fix approach: Incrementally add proper type definitions, especially for Aspire custom fields

## Known Bugs

**Calendar Token Switching Side Effect:**
- Symptoms: When parent views calendar in "view all children" mode, token is repeatedly switched for each child then cleared, potentially leaving app in inconsistent state
- Files: `src/addons/calendar/pages/index/index.ts` (lines 465-484)
- Trigger: Parent user views calendar without specific child selected
- Workaround: Select a specific child before viewing calendar

## Security Considerations

**Token Logging in Console:**
- Risk: Auth tokens are partially logged to browser console via debug statements
- Files: `src/core/features/user/services/parent.ts:213,264,281,366`, `src/core/features/grades/services/grades.ts:238`, `src/core/features/mainmenu/components/user-menu/user-menu.ts:526`
- Current mitigation: Token is truncated to first 20 chars in some places, but not all
- Recommendations: Remove all token logging, or ensure ALL instances truncate/hash tokens

**Mentee Token Generation:**
- Risk: Tokens generated for mentees have 12-week validity and are stored permanently in database
- Files: `local_aspireparent/classes/external/get_mentee_token.php`
- Current mitigation: Tokens validated against parent-mentee relationship on each use
- Recommendations: Consider shorter token validity, add token revocation on mentee relationship change

**Parent Token Storage:**
- Risk: Original parent token stored in local site config when switching to child view
- Files: `src/core/features/user/services/parent.ts:249`
- Current mitigation: Storage key includes site ID
- Recommendations: Consider encrypting stored token, add auto-expiration

## Performance Bottlenecks

**Cache Bypass on Every Request:**
- Problem: Grades service disables cache reading (`getFromCache: false`) on every grades request when switching children
- Files: `src/core/features/grades/services/grades.ts` (lines 227-233, 316-322, 352-358)
- Cause: Ensuring fresh data after child switch
- Improvement path: Track which child's data is cached, only bypass cache when child changes

**Large Service Files:**
- Problem: Several service files exceed 2000+ lines, making navigation and maintenance difficult
- Files: `src/addons/mod/lesson/services/lesson.ts` (4215 lines), `src/addons/messages/services/messages.ts` (3703 lines), `src/core/services/filepool.ts` (3245 lines), `src/addons/mod/quiz/services/quiz.ts` (2513 lines)
- Cause: Organic growth without refactoring
- Improvement path: Split into smaller focused modules (e.g., lesson-offline.ts, lesson-sync.ts)

## Fragile Areas

**Parent/Mentee Token Switching:**
- Files: `src/core/features/user/services/parent.ts`
- Why fragile: Complex state management between parent token, mentee token, site info, and cache invalidation. Multiple async operations must complete in order. Token directly mutated bypassing setters.
- Safe modification: Always test with: fresh login, switch to child, switch between children, switch back to parent, logout. Verify cache invalidation.
- Test coverage: No unit tests for parent service

**Grades Display for Multiple User Types:**
- Files: `src/core/features/grades/services/grades.ts`, `src/core/features/grades/pages/courses/courses.ts`
- Why fragile: Multiple code paths for student view, parent viewing child (with token switch), parent viewing child (without token switch, via custom WS). Custom WS fallback logic intertwined with standard API calls.
- Safe modification: Test all three user paths after changes
- Test coverage: No grades-specific tests

**User Menu Component:**
- Files: `src/core/features/mainmenu/components/user-menu/user-menu.ts`
- Why fragile: 640 lines handling user profile, parent/mentee state, external URLs, resource sections. Multiple async operations in ngOnInit. Child selection triggers cache invalidation and forced navigation.
- Safe modification: Test as student, parent without children, parent with children
- Test coverage: None

## Scaling Limits

**Mentee Loading:**
- Current capacity: All mentees loaded at once when parent opens user menu
- Limit: May become slow with many mentees per parent (though unlikely >10 children)
- Scaling path: Pagination or lazy loading if needed

## Dependencies at Risk

**Deprecated APIs in Login Helper:**
- Risk: 15+ deprecated methods still in use that may be removed in future Moodle app versions
- Files: `src/core/features/login/services/login-helper.ts` (lines 103, 152, 239, 255, 299, 311, 344, 487, 500, 513, 528, 550, 951, 1144)
- Impact: Breaking changes on Moodle app upgrade
- Migration plan: Review each deprecated method and migrate to recommended alternatives before upgrading

**Moment.js Usage:**
- Risk: Moment.js is in maintenance mode, no longer recommended for new projects
- Files: `src/addons/calendar/pages/index/index.ts` and throughout calendar addon
- Impact: Large bundle size contribution, potential security updates only
- Migration plan: Consider migrating to date-fns or dayjs during major refactor

## Missing Critical Features

**No Parent Service Tests:**
- Problem: `CoreUserParentService` has no unit tests despite handling critical auth token switching
- Blocks: Safe refactoring of token switching logic
- Files: `src/core/features/user/services/parent.ts` (457 lines, 0 tests)

**No Integration Tests for Child Switching:**
- Problem: No automated tests verifying parent-to-child and child-to-child switching works correctly
- Blocks: Confident deployment of parent portal features

## Test Coverage Gaps

**Aspire Custom Features:**
- What's not tested: All parent/mentee functionality, custom grades APIs, calendar mentee aggregation
- Files: `src/core/features/user/services/parent.ts`, `src/core/features/grades/services/grades.ts` (Aspire modifications), `src/core/features/mainmenu/components/user-menu/user-menu.ts`, `src/addons/calendar/pages/index/index.ts` (mentee calendar logic)
- Risk: Regressions in parent portal go unnoticed until reported by users
- Priority: High

**Core Test Suite Present but Limited:**
- What's not tested: 40 test files exist but coverage is sparse for complex services
- Files: Test files in `src/core/singletons/tests/`, `src/core/utils/tests/`, `src/core/services/tests/`
- Risk: Changes to untested code may introduce regressions
- Priority: Medium - focus on critical paths first

---

*Concerns audit: 2026-01-18*
