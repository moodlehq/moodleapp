---
phase: 02-custom-code-adaptation
plan: 07
subsystem: addons
tags: [angular, imports, overlay-services, messages, calendar, user, resource]

# Dependency graph
requires:
  - phase: 02-01
    provides: Core services verified compliant with v5.1.0 patterns
provides:
  - Updated overlay service imports in messages/discussion.ts
  - Updated overlay service imports in user/about.ts
  - Updated overlay service imports in calendar/index.ts
  - Verified resource/index.ts already compliant
affects: [02-08-theme, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All overlay services imported from @services/overlays/* namespace"
    - "Constants imported from feature-specific constants.ts files"
    - "Angular standalone component imports declared explicitly"

key-files:
  modified:
    - src/addons/messages/pages/discussion/discussion.ts
    - src/core/features/user/pages/about/about.ts
    - src/addons/calendar/pages/index/index.ts

key-decisions:
  - "calendar/pages/list/list.ts does not exist - only calendar/pages/index/index.ts needed fixing"
  - "resource/index.ts already had correct imports - no changes needed"
  - "Added missing Angular standalone component imports (CoreSharedModule, CoreSplitViewComponent, etc.)"
  - "Added missing constants imports from respective constants.ts files"

patterns-established:
  - "Import CoreLoadings from @services/overlays/loadings (not @services/loadings)"
  - "Import CoreModals from @services/overlays/modals (not @services/modals)"
  - "Import CoreAlerts from @services/overlays/alerts (not @services/alerts)"
  - "Import feature constants from ./constants or ../../constants"

# Metrics
duration: 4min 20s
completed: 2026-01-23
---

# Phase 02 Plan 07: Other Addons Summary

**Fixed overlay service import paths in messages, calendar, and user about pages - all addon imports now use @services/overlays/* namespace**

## Performance

- **Duration:** 4 min 20 sec
- **Started:** 2026-01-23T19:08:34Z
- **Completed:** 2026-01-23T19:12:54Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Fixed CoreLoadings and CoreModals imports in messages/discussion.ts
- Fixed CoreLoadings, CoreModals, and CoreAlerts imports in user/about.ts
- Fixed CoreModals import in calendar/index.ts
- Added missing standalone component imports (CoreSharedModule, CoreSplitViewComponent, etc.)
- Added missing constants imports from respective constants.ts files
- Verified resource/index.ts already compliant (no changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix messages/discussion.ts imports** - `959fe96e6` (fix)
2. **Task 2: Fix user/about.ts imports** - `7707504ee` (fix)
3. **Task 3: Fix calendar and resource addon imports** - `9da79d1ed` (fix)

## Files Created/Modified

- `src/addons/messages/pages/discussion/discussion.ts` - Updated overlay service imports, added constants imports
- `src/core/features/user/pages/about/about.ts` - Updated overlay service imports, added constants imports
- `src/addons/calendar/pages/index/index.ts` - Updated CoreModals import, added constants imports

## Decisions Made

1. **calendar/pages/list/list.ts does not exist** - The plan referenced a file that was renamed/removed. Only calendar/pages/index/index.ts exists and was fixed.

2. **resource/index.ts already compliant** - Already imports CoreAlerts from @services/overlays/alerts, no changes needed.

3. **Added comprehensive imports** - Beyond just fixing the overlay service paths, also added missing imports for:
   - CoreSharedModule, CoreSplitViewComponent (Angular standalone components)
   - Constants from respective constants.ts files (ADDON_MESSAGES_*, ADDON_CALENDAR_*, CORE_USER_PROFILE_*)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing Angular standalone component imports**
- **Found during:** Tasks 1-3
- **Issue:** Files used CoreSharedModule, CoreSplitViewComponent, CoreUserProfileFieldComponent, CoreMainMenuUserButtonComponent without importing them
- **Fix:** Added proper import statements from their respective modules
- **Files modified:** discussion.ts, about.ts, index.ts
- **Verification:** No build errors related to these imports
- **Committed in:** respective task commits

**2. [Rule 2 - Missing Critical] Added missing constants imports**
- **Found during:** Tasks 1-3
- **Issue:** Files used constants (ADDON_MESSAGES_*, ADDON_CALENDAR_*, CORE_USER_PROFILE_*) without importing them
- **Fix:** Added import statements from respective constants.ts files
- **Files modified:** discussion.ts, about.ts, index.ts
- **Verification:** Constants now properly imported
- **Committed in:** respective task commits

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. Files would not compile without these imports.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All addon import issues fixed
- Ready for 02-08 (Theme) plan
- No blockers identified

---
*Phase: 02-custom-code-adaptation*
*Completed: 2026-01-23*
