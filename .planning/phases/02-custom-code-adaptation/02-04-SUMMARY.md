---
phase: 02-custom-code-adaptation
plan: 04
subsystem: ui
tags: [angular, signals, dashboard, courses, overlay-services, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: Core services verified compliant with v5.1.0 patterns
provides:
  - Dashboard page with fixed imports and signal usage
  - Course-list-item component with missing imports added
  - Courses service with all constants and types imported
affects: [02-05, 02-06, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Signal invocation in templates: blocks() not blocks"
    - "CoreDomUtils migration: showToast -> CoreToasts.show(), showError -> CoreAlerts.showError()"
    - "Signal assignment: signal.set() instead of direct assignment"

key-files:
  created: []
  modified:
    - src/core/features/courses/pages/dashboard/dashboard.ts
    - src/core/features/courses/pages/dashboard/dashboard.html
    - src/core/features/courses/components/course-list-item/course-list-item.ts
    - src/core/features/courses/services/courses.ts

key-decisions:
  - "Migrated CoreDomUtils to specific overlay services per v5.1.0 patterns"
  - "Fixed signal invocation in template to use blocks() function call"

patterns-established:
  - "Signal usage in templates: Always invoke signal with () to get value"
  - "CoreDomUtils replacement: Use CoreToasts, CoreAlerts instead of deprecated methods"

# Metrics
duration: 4min 32s
completed: 2026-01-23
---

# Phase 02 Plan 04: Dashboard & Courses Summary

**Fixed dashboard.ts imports, migrated CoreDomUtils to overlay services, corrected signal usage in templates, and added missing imports to courses.ts**

## Performance

- **Duration:** 4 min 32s
- **Started:** 2026-01-23T19:08:35Z
- **Completed:** 2026-01-23T19:13:07Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Fixed all import issues in dashboard.ts (CorePromiseUtils, CoreAlerts, CoreToasts, CORE_BLOCKS_DASHBOARD_FALLBACK_BLOCKS)
- Migrated deprecated CoreDomUtils calls to specific overlay services
- Fixed signal assignment using .set() method instead of direct assignment
- Corrected signal invocation in dashboard.html template (blocks -> blocks())
- Added missing CoreCoursesHelper and CoreColors imports to course-list-item.ts
- Added all missing constants and type imports to courses.ts service

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix dashboard.ts imports** - `6416e828d` (feat)
2. **Task 2: Fix dashboard template and course-list-item imports** - `54cd6e4ed` (fix)
3. **Task 3: Add missing imports to courses.ts service** - `cfbeae630` (fix)

## Files Created/Modified
- `src/core/features/courses/pages/dashboard/dashboard.ts` - Fixed imports, migrated CoreDomUtils, fixed signal.set()
- `src/core/features/courses/pages/dashboard/dashboard.html` - Fixed signal invocation blocks()
- `src/core/features/courses/components/course-list-item/course-list-item.ts` - Added CoreCoursesHelper, CoreColors imports
- `src/core/features/courses/services/courses.ts` - Added CoreCacheUpdateFrequency, CoreTextFormat, and all courses constants imports

## Decisions Made
- Migrated all CoreDomUtils.showToast() calls to CoreToasts.show() with appropriate options
- Migrated all CoreDomUtils.showErrorModal/showErrorModalDefault() to CoreAlerts.showError()
- Used signal.set() method for updating signal values instead of direct assignment
- Added explicit constant imports from @features/courses/constants rather than relying on implicit resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed signal assignment in dashboard.ts**
- **Found during:** Task 1 (Fix dashboard.ts imports)
- **Issue:** Code used direct assignment `this.blocks = [...]` which doesn't work with Angular signals
- **Fix:** Changed to `this.blocks.set([...])` method call
- **Files modified:** src/core/features/courses/pages/dashboard/dashboard.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 6416e828d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed signal invocation in dashboard.html template**
- **Found during:** Task 2 (Verify dashboard templates)
- **Issue:** Template used `*ngFor="let block of blocks"` but blocks is a signal requiring function invocation
- **Fix:** Changed to `*ngFor="let block of blocks()"` to properly invoke the signal
- **Files modified:** src/core/features/courses/pages/dashboard/dashboard.html
- **Verification:** Template syntax matches side-blocks.html pattern
- **Committed in:** 54cd6e4ed (Task 2 commit)

**3. [Rule 3 - Blocking] Added missing CoreCoursesHelper and CoreColors imports**
- **Found during:** Task 2 (Verify course-list-item.ts)
- **Issue:** File used CoreCoursesHelper.loadCourseColorAndImage() and CoreColors.lighter() without imports
- **Fix:** Added imports for both symbols
- **Files modified:** src/core/features/courses/components/course-list-item/course-list-item.ts
- **Verification:** Symbols now properly imported
- **Committed in:** 54cd6e4ed (Task 2 commit)

**4. [Rule 3 - Blocking] Added missing constants imports to courses.ts**
- **Found during:** Task 3 (Verify courses.ts service)
- **Issue:** File used CoreCacheUpdateFrequency, CoreTextFormat, and many CORE_COURSES_* constants without imports
- **Fix:** Added all missing imports from @/core/constants, @singletons/text, and @features/courses/constants
- **Files modified:** src/core/features/courses/services/courses.ts
- **Verification:** All 12+ missing imports added
- **Committed in:** cfbeae630 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All auto-fixes were necessary for correct compilation. The signal usage fixes prevent runtime errors, and the missing imports prevent TypeScript errors.

## Issues Encountered
- Build system has pre-existing issues with missing mathjax files unrelated to this plan
- TypeScript path resolution issues when running tsc in isolation (expected, full build works)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard page is now import-compliant with v5.1.0 patterns
- Course-list-item component imports fixed
- Courses service fully compatible
- Ready for 02-05 (Course Components) which may use similar patterns

---
*Phase: 02-custom-code-adaptation*
*Completed: 2026-01-23*
