# Phase 2: Custom Code Adaptation - Research

**Researched:** 2026-01-23
**Domain:** Angular 17-20 migration for Moodle App conflict files
**Confidence:** HIGH (verified against merged codebase and existing research)

## Summary

This research analyzes the 47 conflict files that need updating after the Moodle App v5.1.0 merge. The merge used `-X ours` to preserve Aspire customizations, so these files have our OLD code that must be updated to work with the NEW Angular 20 APIs and Moodle v5.1.0 service reorganization.

Key changes required across all files:
1. **Import path updates**: Overlay services moved from `@services/loadings` to `@services/overlays/loadings`
2. **Constant renames**: `USER_PROFILE_REFRESHED` is now `CORE_USER_PROFILE_REFRESHED` from `@features/user/constants`
3. **Missing imports**: Many files use `CoreAlerts`, `CorePromiseUtils`, etc. without importing them
4. **Standalone component patterns**: Some components need `imports` arrays and proper exports

**Primary recommendation:** Update files in order of dependencies - core services first, then UI components, then theme files.

---

## Plan 2.1: Core Services

### Files to Modify
- `src/core/singletons/url.ts`
- `src/core/singletons/iframe.ts`
- `src/core/directives/format-text.ts`
- `src/app/app.module.ts`

### url.ts - Already Updated
**Status:** This file appears to be already aligned with upstream v5.1.0 patterns.
- Uses the new `CoreUrlAddParamsOptions` interface correctly
- Has the new `buildMapsURL()` method
- Has the new `isYoutubeURL()` method
- Contains Aspire customizations (YouTube proxy for iOS) that are preserved

**Changes needed:** NONE - file is already compatible.

### iframe.ts - Check Imports

**Expected issues:**
- Verify import of `CoreLoadings` uses correct path

**Pattern to apply:**
```typescript
// Check for:
import { CoreLoadings } from '@services/loadings';
// Should be:
import { CoreLoadings } from '@services/overlays/loadings';
```

### format-text.ts - Already Updated
**Status:** This file is already using Angular 17+ patterns (signals, effect(), viewChild).
- Uses `viewChild()` signal pattern correctly
- Uses `input()` for inputs
- Uses `effect()` for reactivity
- Imports `CoreAlerts` from `@services/overlays/alerts` correctly

**Changes needed:** NONE - file is already compatible.

### app.module.ts - Check Compatibility

**Expected issues:**
- May need standalone component adjustments
- Verify all module imports are present

---

## Plan 2.2: User Menu

### Files to Modify
- `src/core/features/mainmenu/components/user-menu/user-menu.ts`
- `src/core/features/mainmenu/components/user-menu/user-menu.html`
- `src/core/features/mainmenu/components/user-menu/user-menu.scss`

### user-menu.ts - CRITICAL ISSUES FOUND

**Issue 1: Wrong constant import**
```typescript
// CURRENT (line 22):
import { CoreUser, CoreUserProfile, USER_PROFILE_REFRESHED } from '@features/user/services/user';

// SHOULD BE:
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CORE_USER_PROFILE_REFRESHED } from '@features/user/constants';
```

**Issue 2: Update usages**
```typescript
// CURRENT (lines 625, 675):
CoreEvents.trigger(USER_PROFILE_REFRESHED, { userId: mentee.id }, this.siteId);

// SHOULD BE:
CoreEvents.trigger(CORE_USER_PROFILE_REFRESHED, { userId: mentee.id }, this.siteId);
```

**Issue 3: Missing CoreSiteLogoComponent import**
The component decorator imports `CoreSiteLogoComponent` but it's not imported in the file:
```typescript
// ADD:
import { CoreSiteLogoComponent } from '@components/site-logo/site-logo';
```

**Issue 4: Missing CoreAlerts import**
Uses `CoreAlerts.confirmDelete()` but doesn't import it:
```typescript
// ADD:
import { CoreAlerts } from '@services/overlays/alerts';
```

**Issue 5: Missing CoreLoginHelper import**
Uses `CoreLoginHelper.goToAddSite()` but doesn't import it:
```typescript
// ADD:
import { CoreLoginHelper } from '@features/login/services/login-helper';
```

**Issue 6: Missing CoreUtils import**
Uses `CoreUtils.openInBrowser()` but doesn't import it:
```typescript
// ADD:
import { CoreUtils } from '@services/utils/utils';
```

**Issue 7: Missing CoreSite type import**
Uses `CoreSite` in `loadSiteLogo` method but doesn't import it:
```typescript
// ADD:
import { CoreSite } from '@classes/sites/site';
```

---

## Plan 2.3: Grades

### Files to Modify
- `src/core/features/grades/pages/courses/courses.ts`
- `src/core/features/grades/pages/courses/courses.html`
- `src/core/features/grades/pages/courses/courses.scss`
- `src/core/features/grades/pages/course/course.ts`
- `src/core/features/grades/pages/course/course.html`
- `src/core/features/grades/pages/course/course.scss`
- `src/core/features/grades/services/grades.ts`

### courses.ts - ISSUES FOUND

**Issue 1: Missing CoreAlerts import**
Uses `CoreAlerts.showError()` but doesn't import it:
```typescript
// ADD:
import { CoreAlerts } from '@services/overlays/alerts';
```

**Issue 2: Uses deprecated CoreDomUtils (line 26)**
```typescript
// CURRENT:
import { CoreDomUtils } from '@services/utils/dom';

// This is deprecated. Should use specific overlay services:
import { CoreAlerts } from '@services/overlays/alerts';
```

### course.ts - ISSUES FOUND

**Issue 1: Missing CoreSharedModule in imports**
The component uses `imports: [CoreSharedModule]` but doesn't import it:
```typescript
// ADD at top:
import { CoreSharedModule } from '@/core/shared.module';
```

**Issue 2: Missing CoreAlerts import**
Uses `CoreAlerts.showError()` but doesn't have the import.

---

## Plan 2.4: Dashboard & Courses

### Files to Modify
- `src/core/features/courses/pages/dashboard/dashboard.ts`
- `src/core/features/courses/pages/dashboard/dashboard.html`
- `src/core/features/courses/pages/dashboard/dashboard.scss`
- `src/core/features/courses/components/course-list-item/course-list-item.ts`
- `src/core/features/courses/services/courses.ts`

### dashboard.ts - ISSUES FOUND

**Issue 1: Missing CorePromiseUtils import**
Uses `CorePromiseUtils.ignoreErrors()` and `CorePromiseUtils.allPromisesIgnoringErrors()` but doesn't import it:
```typescript
// ADD:
import { CorePromiseUtils } from '@singletons/promise-utils';
```

**Issue 2: Missing CoreDomUtils import (deprecated)**
Uses `CoreDomUtils.showToast()`, `CoreDomUtils.showErrorModalDefault()`, `CoreDomUtils.showErrorModal()`:
```typescript
// These should be replaced with:
import { CoreToasts } from '@services/overlays/toasts';
import { CoreAlerts } from '@services/overlays/alerts';

// Old: CoreDomUtils.showToast('message')
// New: CoreToasts.show({ message: 'message' })

// Old: CoreDomUtils.showErrorModalDefault(error, 'key', true)
// New: CoreAlerts.showError(error)

// Old: CoreDomUtils.showErrorModal(error)
// New: CoreAlerts.showError(error)
```

**Issue 3: Missing CoreAlerts import**
Used in error handling but not imported.

**Issue 4: Missing CORE_BLOCKS_DASHBOARD_FALLBACK_BLOCKS import (line 158)**
```typescript
// ADD:
import { CORE_BLOCKS_DASHBOARD_FALLBACK_BLOCKS } from '@features/courses/constants';
```

---

## Plan 2.5: Course Components

### Files to Modify
- `src/core/features/course/components/course-section/course-section.ts`
- `src/core/features/course/components/module/module.ts`
- `src/core/features/course/pages/index/index.ts`
- Related HTML and SCSS files

### Common Issues Expected

**Import patterns to check:**
```typescript
// OLD overlay service paths:
import { CoreLoadings } from '@services/loadings';
import { CoreToasts } from '@services/toasts';
import { CoreModals } from '@services/modals';
import { CorePopovers } from '@services/popovers';

// NEW overlay service paths:
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreModals } from '@services/overlays/modals';
import { CorePopovers } from '@services/overlays/popovers';
```

---

## Plan 2.6: Block Addons

### Files to Modify
- `src/addons/block/timeline/components/timeline/timeline.ts`
- `src/addons/block/timeline/components/timeline/addon-block-timeline.html`
- `src/addons/block/timeline/components/timeline/timeline.scss`
- `src/addons/block/myoverview/components/myoverview/myoverview.ts`
- Related HTML and SCSS files

### timeline.ts - ISSUES FOUND

**Issue 1: Missing imports for RxJS operators**
Uses `Observable`, `BehaviorSubject`, `combineLatest`, `distinctUntilChanged`, etc. but imports are incomplete:
```typescript
// ADD:
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import {
    catchError,
    combineLatest,
    distinctUntilChanged,
    map,
    mergeAll,
    share,
    tap
} from 'rxjs/operators';
```

**Issue 2: Missing CoreLogger import**
```typescript
// ADD:
import { CoreLogger } from '@singletons/logger';
```

**Issue 3: Missing CoreDomUtils import (deprecated)**
Uses `CoreDomUtils.showErrorModalDefault()`:
```typescript
// Replace with:
import { CoreAlerts } from '@services/overlays/alerts';
// Use: CoreAlerts.showError(error)
```

**Issue 4: Missing ICoreBlockComponent import**
```typescript
// ADD:
import { ICoreBlockComponent } from '@features/block/classes/block-component';
```

**Issue 5: Missing CoreSearchBoxComponent import**
Used in the imports array but not imported:
```typescript
// ADD:
import { CoreSearchBoxComponent } from '@components/search-box/search-box';
```

**Issue 6: Missing formControlValue helper**
Uses `formControlValue()` but doesn't import it:
```typescript
// ADD:
import { formControlValue } from '@/core/utils/rxjs';
```

**Issue 7: Missing resolved helper**
Uses `resolved()` RxJS operator:
```typescript
// ADD:
import { resolved } from '@/core/utils/rxjs';
```

**Issue 8: Code has syntax issues**
The file appears to have incomplete/broken code around lines 330-470 with mixed async patterns and incomplete method bodies. This needs careful manual review.

---

## Plan 2.7: Other Addons

### Files to Modify
- `src/addons/calendar/pages/list/list.ts`
- `src/addons/messages/pages/discussion/discussion.ts`
- `src/addons/mod/resource/components/index/index.ts`
- Related HTML and SCSS files

### messages/discussion.ts - Wrong Import Path

**Issue: Old import path for CoreLoadings**
```typescript
// CURRENT (line 46):
import { CoreLoadings } from '@services/loadings';

// SHOULD BE:
import { CoreLoadings } from '@services/overlays/loadings';
```

### user/about.ts - Wrong Import Path

**Issue: Old import path for CoreLoadings**
```typescript
// CURRENT (line 31):
import { CoreLoadings } from '@services/loadings';

// SHOULD BE:
import { CoreLoadings } from '@services/overlays/loadings';
```

---

## Plan 2.8: Theme Files

### Files to Modify
- `src/theme/theme.base.scss`
- `src/theme/components/ion-alert.scss` (if exists)
- `src/theme/components/ion-header.scss` (if exists)
- `src/theme/globals.variables.scss` (design system)

### Theme Issues Expected
Theme SCSS files typically don't have import issues but may have:
- Ionic component class name changes
- CSS variable naming changes
- Dark mode targeting changes (`:root` vs `body`)

**Ionic 8 CSS changes to check:**
- Dark palette now targets `:root` instead of `body`
- Form control syntax changes (legacy patterns removed)
- `ion-picker` vs `ion-picker-legacy` for modal picker

---

## Import Path Migration Reference

### Overlay Services - Complete List

| Old Path | New Path |
|----------|----------|
| `@services/loadings` | `@services/overlays/loadings` |
| `@services/toasts` | `@services/overlays/toasts` |
| `@services/modals` | `@services/overlays/modals` |
| `@services/popovers` | `@services/overlays/popovers` |
| `@services/alerts` | `@services/overlays/alerts` |
| `@services/prompts` | `@services/overlays/prompts` |

### Constants Migration - User Feature

| Old Export | New Export | New Path |
|------------|------------|----------|
| `USER_PROFILE_REFRESHED` | `CORE_USER_PROFILE_REFRESHED` | `@features/user/constants` |
| `USER_PROFILE_PICTURE_UPDATED` | `CORE_USER_PROFILE_PICTURE_UPDATED` | `@features/user/constants` |

### CoreDomUtils Deprecation - Method Migration

| Old Method | New Service | New Method |
|------------|-------------|------------|
| `CoreDomUtils.showLoading()` | `CoreLoadings` | `show()` |
| `CoreDomUtils.showToast()` | `CoreToasts` | `show()` |
| `CoreDomUtils.showAlert()` | `CoreAlerts` | `show()` |
| `CoreDomUtils.showErrorModal()` | `CoreAlerts` | `showError()` |
| `CoreDomUtils.showErrorModalDefault()` | `CoreAlerts` | `showError()` |
| `CoreDomUtils.showConfirm()` | `CoreAlerts` | `confirm()` |
| `CoreDomUtils.confirmDelete()` | `CoreAlerts` | `confirmDelete()` |
| `CoreDomUtils.showPrompt()` | `CorePrompts` | `show()` |
| `CoreDomUtils.openModal()` | `CoreModals` | `openModal()` |
| `CoreDomUtils.openPopover()` | `CorePopovers` | `open()` |

---

## Standalone Component Patterns

### Required Imports for Standalone Components

Most components should have:
```typescript
@Component({
    selector: 'my-component',
    templateUrl: 'template.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
```

### When Using Additional Components

```typescript
imports: [
    CoreSharedModule,
    OtherStandaloneComponent,  // Direct import of standalone components
    CoreEditorComponentsModule,  // For editor
    CoreTagComponentsModule,  // For tags
]
```

### When Using Web Components (Swiper)

```typescript
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
    // ...
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
```

---

## Verification Checklist

For each file, verify:

- [ ] All import paths use new overlay service paths
- [ ] `USER_PROFILE_REFRESHED` replaced with `CORE_USER_PROFILE_REFRESHED`
- [ ] All used symbols are properly imported
- [ ] `CoreDomUtils` calls replaced with specific overlay services
- [ ] Standalone components have `imports` array
- [ ] No TypeScript compilation errors
- [ ] Aspire customizations are preserved

---

## Priority Order for Implementation

1. **Core Services (Plan 2.1)** - Foundational, needed by other components
2. **User Menu (Plan 2.2)** - Many missing imports, critical for parent features
3. **Dashboard (Plan 2.4)** - Many missing imports, high visibility
4. **Grades (Plan 2.3)** - Missing imports, parent viewing features
5. **Block Addons (Plan 2.6)** - Timeline has significant issues
6. **Course Components (Plan 2.5)** - Check import paths
7. **Other Addons (Plan 2.7)** - Simple import path fixes
8. **Theme (Plan 2.8)** - SCSS only, no TypeScript issues

---

## Sources

### Primary (HIGH confidence)
- Merged codebase analysis (`src/core/`, `src/addons/`)
- `.planning/research/MOODLE_CHANGES.md` - Verified migration patterns
- `.planning/research/ANGULAR17_APIS.md` - Angular version changes
- `.planning/research/STANDALONE_COMPONENTS.md` - Component patterns

### Secondary (MEDIUM confidence)
- Git diff analysis of conflict files
- Upstream file comparisons

---

## Metadata

**Confidence breakdown:**
- Import path changes: HIGH - Verified against merged codebase
- Missing imports: HIGH - Direct code analysis
- Deprecated method replacements: HIGH - From prior research
- Theme changes: MEDIUM - Less detailed analysis

**Research date:** 2026-01-23
**Valid until:** Until merge is complete (one-time migration)
