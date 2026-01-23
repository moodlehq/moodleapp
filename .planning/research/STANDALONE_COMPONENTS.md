# Angular Standalone Components Migration Guide

**Project:** Aspire Moodle App
**Researched:** 2026-01-23
**Confidence:** HIGH (verified with existing codebase patterns + official Angular docs)

## Executive Summary

Angular standalone components remove the need for NgModule declarations by allowing components to declare their own dependencies directly in the `@Component` decorator. Moodle App 5.0+ uses this pattern extensively. This guide explains how to convert existing NgModule-based components to standalone components, with specific examples from the Aspire Moodle App codebase.

---

## Key Concepts

### What Changes in @Component Decorator

**Before (NgModule-based):**
```typescript
@Component({
    selector: 'addon-mod-lightboxgallery-index',
    templateUrl: 'addon-mod-lightboxgallery-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModLightboxGalleryIndexComponent { }
```

**After (Standalone):**
```typescript
@Component({
    selector: 'addon-mod-lightboxgallery-index',
    templateUrl: 'addon-mod-lightboxgallery-index.html',
    styleUrls: ['index.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModLightboxGalleryIndexComponent { }
```

**Key changes:**
1. Add `standalone: true` (or omit it entirely in Angular 19+ where it defaults to true)
2. Add `imports: []` array with all dependencies the template needs
3. Remove the component from NgModule `declarations` array

### How Imports Work in Standalone Components

Each standalone component declares its own dependencies in the `imports` array:

| What You Need | What To Import |
|---------------|----------------|
| Common directives (ngIf, ngFor, etc.) | `CommonModule` or `CoreSharedModule` |
| Ionic components (ion-button, etc.) | `IonicModule` or `CoreSharedModule` |
| Translation pipe | `TranslateModule` or `CoreSharedModule` |
| Forms | `FormsModule`, `ReactiveFormsModule` or `CoreSharedModule` |
| Core Moodle components | `CoreSharedModule` |
| Other standalone components | Import them directly |

**CoreSharedModule in Moodle App exports:**
- CommonModule
- CoreComponentsModule
- CoreDirectivesModule
- CorePipesModule
- FormsModule
- IonicModule
- ReactiveFormsModule
- TranslateModule

For most components, importing `CoreSharedModule` is sufficient.

### What Happens to Existing NgModules

NgModules don't disappear entirely but their role changes:

1. **Feature modules** that only declare components can be removed
2. **Routing modules** remain (but may use `loadComponent` instead of `loadChildren`)
3. **Provider modules** (APP_INITIALIZER, services) remain unchanged
4. **Shared modules** like CoreSharedModule remain as convenience re-exports

---

## Step-by-Step Migration Process

### Step 1: Identify the Component to Migrate

Current structure in Aspire app (example: LightboxGallery):

```
src/addons/mod/lightboxgallery/
  components/
    components.module.ts          <- Will be removed
    index/
      index.ts                    <- Component to make standalone
      addon-mod-lightboxgallery-index.html
      index.scss
  pages/
    index/
      index.ts                    <- Page to make standalone
      index.html
  lightboxgallery-lazy.module.ts  <- Will be simplified
  lightboxgallery.module.ts       <- Remains (has APP_INITIALIZER)
```

### Step 2: Convert the Component

**Before (`components/index/index.ts`):**
```typescript
import { Component, OnInit, Optional } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
// ... other imports

@Component({
    selector: 'addon-mod-lightboxgallery-index',
    templateUrl: 'addon-mod-lightboxgallery-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModLightboxGalleryIndexComponent extends CoreCourseModuleMainResourceComponent {
    // ... component logic
}
```

**After (`components/index/index.ts`):**
```typescript
import { Component, OnInit, Optional } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreSharedModule } from '@/core/shared.module';
// ... other imports

@Component({
    selector: 'addon-mod-lightboxgallery-index',
    templateUrl: 'addon-mod-lightboxgallery-index.html',
    styleUrls: ['index.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModLightboxGalleryIndexComponent extends CoreCourseModuleMainResourceComponent {
    // ... component logic unchanged
}
```

### Step 3: Convert the Page Component

**Before (`pages/index/index.ts`):**
```typescript
import { Component, ViewChild } from '@angular/core';
import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { AddonModLightboxGalleryIndexComponent } from '../../components/index/index';

@Component({
    selector: 'page-addon-mod-lightboxgallery-index',
    templateUrl: 'index.html',
})
export class AddonModLightboxGalleryIndexPage extends CoreCourseModuleMainActivityPage<AddonModLightboxGalleryIndexComponent> {
    @ViewChild(AddonModLightboxGalleryIndexComponent) activityComponent?: AddonModLightboxGalleryIndexComponent;
}
```

**After (`pages/index/index.ts`):**
```typescript
import { Component, ViewChild } from '@angular/core';
import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModLightboxGalleryIndexComponent } from '../../components/index/index';

@Component({
    selector: 'page-addon-mod-lightboxgallery-index',
    templateUrl: 'index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        AddonModLightboxGalleryIndexComponent,  // Import the child component directly
    ],
})
export class AddonModLightboxGalleryIndexPage extends CoreCourseModuleMainActivityPage<AddonModLightboxGalleryIndexComponent> {
    @ViewChild(AddonModLightboxGalleryIndexComponent) activityComponent?: AddonModLightboxGalleryIndexComponent;
}
```

### Step 4: Remove the Components Module

**Delete `components/components.module.ts` entirely.** It's no longer needed.

### Step 5: Update the Lazy Module

**Before (`lightboxgallery-lazy.module.ts`):**
```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModLightboxGalleryComponentsModule } from './components/components.module';
import { AddonModLightboxGalleryIndexPage } from './pages/index/index';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModLightboxGalleryIndexPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModLightboxGalleryComponentsModule,
    ],
    declarations: [
        AddonModLightboxGalleryIndexPage,
    ],
})
export default class AddonModLightboxGalleryLazyModule {}
```

**After (`lightboxgallery-lazy.module.ts`):**

Option A - Keep NgModule (simpler migration):
```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddonModLightboxGalleryIndexPage } from './pages/index/index';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModLightboxGalleryIndexPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export default class AddonModLightboxGalleryLazyModule {}
```

Option B - Use loadComponent (fully standalone):
```typescript
import { Routes } from '@angular/router';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index/index')
            .then(m => m.AddonModLightboxGalleryIndexPage),
    },
];

export default routes;
```

### Step 6: Update Parent Route (if using Option B)

If you switch to exporting routes directly, update the parent module:

**Before:**
```typescript
{
    path: ADDON_MOD_LIGHTBOXGALLERY_PAGE_NAME,
    loadChildren: () => import('./lightboxgallery-lazy.module'),
},
```

**After:**
```typescript
{
    path: ADDON_MOD_LIGHTBOXGALLERY_PAGE_NAME,
    loadChildren: () => import('./lightboxgallery-lazy.module')
        .then(m => m.default),
},
```

---

## Real Examples from Current Codebase

### Example 1: Block Component (Already Standalone)

File: `src/addons/block/activitymodules/components/activitymodules/activitymodules.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
// ... other imports

@Component({
    selector: 'addon-block-activitymodules',
    templateUrl: 'addon-block-activitymodules.html',
    styleUrl: 'activitymodules.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonBlockActivityModulesComponent extends CoreBlockBaseComponent implements OnInit {
    // ... component logic
}
```

### Example 2: Page Component (Already Standalone)

File: `src/addons/badges/pages/issued-badge/issued-badge.ts`

```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
// ... other imports

@Component({
    selector: 'page-addon-badges-issued-badge',
    templateUrl: 'issued-badge.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonBadgesIssuedBadgePage implements OnInit, OnDestroy {
    // ... page logic
}
```

### Example 3: Component with Multiple Module Imports

File: `src/addons/blog/pages/edit-entry/edit-entry.ts`

```typescript
import { CoreSharedModule } from '@/core/shared.module';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreCommentsComponentsModule } from '@features/comments/components/components.module';
import { CoreTagComponentsModule } from '@features/tag/components/components.module';

@Component({
    selector: 'addon-blog-edit-entry',
    templateUrl: './edit-entry.html',
    standalone: true,
    imports: [
        CoreEditorComponentsModule,
        CoreSharedModule,
        CoreCommentsComponentsModule,
        CoreTagComponentsModule,
    ],
})
export class AddonBlogEditEntryPage implements CanLeave, OnInit, OnDestroy {
    // ... page logic
}
```

### Example 4: Mixed Module Pattern

File: `src/addons/blog/blog-lazy.module.ts`

This shows a transitional pattern where some pages are NgModule-declared and others use loadComponent:

```typescript
@NgModule({
    imports: [
        CoreSharedModule,
        CoreCommentsComponentsModule,
        CoreTagComponentsModule,
        CoreMainMenuComponentsModule,
    ],
    declarations: [
        AddonBlogIndexPage,  // Non-standalone, declared in module
    ],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export class AddonBlogLazyModule {}

function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index',
            component: AddonBlogIndexPage,  // Traditional routing
        },
        {
            path: 'edit/:id',
            loadComponent: () => import('./pages/edit-entry/edit-entry')
                .then(c => c.AddonBlogEditEntryPage),  // Standalone lazy loading
            canDeactivate: [canLeaveGuard],
        },
        // ...
    ];
}
```

---

## Common Pitfalls

### Pitfall 1: Missing Imports

**Problem:** Template fails to compile with "X is not a known element" error.

**Cause:** Forgot to add required module to the `imports` array.

**Solution:** Add the module that exports the component/directive:
```typescript
imports: [
    CoreSharedModule,  // For core directives, pipes, components
    OtherStandaloneComponent,  // For other standalone components you use
]
```

### Pitfall 2: Circular Dependencies

**Problem:** "Circular dependency detected" error when importing components.

**Cause:** Component A imports Component B which imports Component A.

**Solution:**
- Extract shared logic to a service
- Use `forwardRef()` if absolutely necessary
- Restructure component hierarchy

### Pitfall 3: Services Not Available

**Problem:** Injected service is undefined.

**Cause:** Service was previously provided by the NgModule.

**Solution:** Services should use `providedIn: 'root'` or be provided in the component:
```typescript
@Component({
    // ...
    providers: [MyService],  // Component-level provider
})
```

### Pitfall 4: CUSTOM_ELEMENTS_SCHEMA Missing

**Problem:** Web components (like Swiper's `<swiper-container>`) cause errors.

**Cause:** Angular doesn't recognize custom elements by default.

**Solution:** Add the schema:
```typescript
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
    // ...
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
```

### Pitfall 5: TranslateModule Not Working

**Problem:** `translate` pipe or `[translate]` directive not found.

**Solution:** Import `CoreSharedModule` which re-exports `TranslateModule`, or import directly:
```typescript
imports: [
    TranslateModule,  // or CoreSharedModule
]
```

---

## Migration Checklist

For each component/page to migrate:

- [ ] Add `standalone: true` to `@Component` decorator
- [ ] Add `imports: [CoreSharedModule]` (minimum for most components)
- [ ] Add additional modules if using editor, comments, tags, etc.
- [ ] Import any standalone child components directly
- [ ] Add `schemas: [CUSTOM_ELEMENTS_SCHEMA]` if using web components
- [ ] Remove component from NgModule `declarations` array
- [ ] Remove NgModule imports that are no longer needed
- [ ] Delete the `components.module.ts` if all its components are standalone
- [ ] Update lazy module to remove shared module imports
- [ ] Test the component renders correctly
- [ ] Test all functionality works

---

## Summary of File Changes for LightboxGallery Migration

| File | Action |
|------|--------|
| `components/index/index.ts` | Add `standalone: true`, add `imports: [CoreSharedModule]` |
| `components/components.module.ts` | DELETE |
| `pages/index/index.ts` | Add `standalone: true`, add `imports: [CoreSharedModule, AddonModLightboxGalleryIndexComponent]` |
| `lightboxgallery-lazy.module.ts` | Remove `declarations`, remove `CoreSharedModule` import, remove `ComponentsModule` import |
| `lightboxgallery.module.ts` | No changes (has APP_INITIALIZER, not declarations) |

---

## Sources

- [Angular Official Standalone Migration Guide](https://angular.dev/reference/migrations/standalone) - HIGH confidence
- [Angular Route Lazy Loading Migration](https://angular.dev/reference/migrations/route-lazy-loading) - HIGH confidence
- [Moodle App 5.0.0 Release Notes](https://moodledev.io/general/app_releases/v5/v5.0.0) - MEDIUM confidence
- Existing codebase patterns in `/home/yui/Documents/moodleapp/src/` - HIGH confidence (77 standalone components found)
