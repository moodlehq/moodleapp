# Angular 17+ API Changes for Ionic/Moodle App Migration

**Project:** Aspire Moodle App Fork
**Researched:** 2026-01-23
**Migration Path:** Angular 17.3.12 -> Angular 20.3.2 (upstream v5.1.0)
**Confidence:** HIGH (verified against upstream codebase and official docs)

---

## CRITICAL DISCOVERY

The upstream moodlehq/moodleapp v5.1.0 uses **Angular 20.3.2**, not Angular 17. The current fork is on Angular 17.3.12. This is a **3 major version jump** requiring incremental migration:

| Component | Current (Fork) | Upstream v5.1.0 |
|-----------|----------------|-----------------|
| Angular | 17.3.12 | 20.3.2 |
| Ionic | 8.3.1 | 8.7.5 |
| TypeScript | 5.3.3 | 5.9.2 |
| Zone.js | 0.14.10 | 0.15.1 |
| @ionic/angular-toolkit | 11.0.1 | 12.3.0 |
| @awesome-cordova-plugins | 6.9.0 | 8.1.0 |

**Recommended migration path:** Angular 17 -> 18 -> 19 -> 20 (one major version at a time)

---

## 1. Angular 17 Current API Patterns

### @ViewChild Decorator (No Change Required for 17)

The current codebase uses `@ViewChild` correctly. No changes needed for Angular 17 itself.

**Current Pattern (Fork):**
```typescript
@ViewChild('dynamicComponent', { read: ViewContainerRef })
set dynamicComponent(el: ViewContainerRef) {
    this.container = el;
}
```

**Static Option Behavior:**
- `static: true` - Query resolves before `ngOnInit()`, result never updates
- `static: false` (default) - Query resolves before `ngAfterViewInit()`, updates with view changes

**Signal-Based Alternative (Angular 17.2+):**
```typescript
// New signal-based API available but optional
import { viewChild } from '@angular/core';

container = viewChild.required<ViewContainerRef>('dynamicComponent', { read: ViewContainerRef });
```

---

## 2. Angular 18 Breaking Changes

### Build System Migration (Optional but Recommended)

Angular 18 offers migration from webpack to esbuild.

**Command:**
```bash
ng update @angular/cli --name use-application-builder
```

**Impact:**
- Output moves from `dist/project` to `dist/project/browser`
- Build times improve ~5x
- Bundle sizes may initially increase

---

## 3. Angular 19 Breaking Changes (CRITICAL)

### Standalone Components Default (MAJOR BREAKING CHANGE)

**The Change:** `standalone: true` is now the DEFAULT for components, directives, and pipes.

**Impact on Fork:** All NgModule-based components will break unless explicitly marked `standalone: false`.

**Before (Angular 17 - Implicit `standalone: false`):**
```typescript
@Component({
    selector: 'app-my-component',
    templateUrl: './my-component.html',
})
export class MyComponent {}
```

**After (Angular 19+ - Must be explicit):**
```typescript
@Component({
    selector: 'app-my-component',
    templateUrl: './my-component.html',
    standalone: false,  // REQUIRED for NgModule components
})
export class MyComponent {}
```

**Automated Migration:**
```bash
ng update  # Automatically adds standalone: false where needed
```

**Note:** The upstream v5.1.0 appears to have converted most components to standalone, based on the deletion of many `*-lazy.module.ts` files.

### TypeScript 5.6 Required

Angular 19 requires TypeScript 5.6+.

---

## 4. Angular 20 Breaking Changes (CURRENT UPSTREAM)

### Node.js v20 Required

Angular 20 drops support for Node 18. Minimum: Node 20.

### New Build Package

**Old:** `@angular-devkit/build-angular`
**New:** `@angular/build`

The upstream v5.1.0 uses `@angular/build`:
```json
"@angular/build": "20.3.3"
```

**Impact:**
- Karma plugin removed from new package
- Must manually install old builder for Karma testing
- Alternative: Migrate to Vitest

### Control Flow Syntax Deprecation

Angular 20 deprecates `*ngIf`, `*ngFor`, `*ngSwitch` in favor of `@if`, `@for`, `@switch`.

**Current Fork Usage:** Extensive use of structural directives (100+ files with `*ngIf`/`*ngFor`)

**Before:**
```html
<div *ngIf="condition">Content</div>
<ion-item *ngFor="let item of items; trackBy: trackById">
    {{ item.name }}
</ion-item>
<div [ngSwitch]="value">
    <span *ngSwitchCase="'a'">A</span>
    <span *ngSwitchDefault>Default</span>
</div>
```

**After:**
```html
@if (condition) {
    <div>Content</div>
}
@for (item of items; track item.id) {
    <ion-item>{{ item.name }}</ion-item>
} @empty {
    <div>No items</div>
}
@switch (value) {
    @case ('a') { <span>A</span> }
    @default { <span>Default</span> }
}
```

**Automated Migration:**
```bash
ng g @angular/core:control-flow-migration
```

**Important:** The `track` expression is REQUIRED for `@for` loops (90% performance improvement).

### HttpClient withFetch() Warnings

Angular 20.1+ shows warnings when using XHR instead of fetch API:

```typescript
// Recommended for SSR apps
provideHttpClient(withFetch())
```

---

## 5. Service Import Path Changes (Upstream v5.1.0)

### Overlay Services Restructured

The upstream has moved overlay-related services to a new `overlays/` subdirectory:

| Old Path (Current Fork) | New Path (Upstream v5.1.0) |
|-------------------------|---------------------------|
| `@services/modals` | `@services/overlays/modals` |
| `@services/toasts` | `@services/overlays/toasts` |
| `@services/loadings` | `@services/overlays/loadings` |
| `@services/popovers` | `@services/overlays/popovers` |
| (new) | `@services/overlays/alerts` |
| (new) | `@services/overlays/prompts` |

### CoreDomUtils Deprecation (MAJOR CHANGE)

The upstream has deprecated `CoreDomUtilsProvider` in v5.0. Functions moved to specialized services:

**Before (Current Fork):**
```typescript
import { CoreDomUtils } from '@services/utils/dom';

CoreDomUtils.showToast('Message');
CoreDomUtils.showAlert('Title', 'Message');
CoreDomUtils.showLoading('Loading...');
CoreDomUtils.openModal(MyComponent, { props });
```

**After (Upstream v5.1.0):**
```typescript
import { CoreToasts } from '@services/overlays/toasts';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreModals } from '@services/overlays/modals';

CoreToasts.show({ message: 'Message' });
CoreAlerts.show({ header: 'Title', message: 'Message' });
CoreLoadings.show('Loading...');
CoreModals.open(MyComponent, { componentProps: { props } });
```

**Specific Method Migrations:**

| Old Method | New Service/Method |
|------------|-------------------|
| `CoreDomUtils.confirmDownloadSize()` | `CoreAlerts.confirmDownloadSize()` |
| `CoreDomUtils.convertToElement()` | `convertTextToHTMLElement()` (direct import) |
| `CoreDomUtils.createChangesFromKeyValueDiff()` | `CoreAngular.createChangesFromKeyValueDiff()` |
| `CoreDomUtils.showToast()` | `CoreToasts.show()` |
| `CoreDomUtils.showAlert()` | `CoreAlerts.show()` |

---

## 6. Dependency Injection Changes

### inject() Function (Preferred in Angular 17+)

The upstream uses the `inject()` function pattern instead of constructor injection.

**Before (Constructor Injection):**
```typescript
constructor(
    private differs: KeyValueDiffers,
    protected cdr: ChangeDetectorRef,
    protected element: ElementRef,
) {}
```

**After (inject() Function):**
```typescript
private differs = inject(KeyValueDiffers);
protected cdr = inject(ChangeDetectorRef);
protected element = inject(ElementRef);
```

**Benefits:**
- Works in standalone components without constructor
- Enables use in functions outside class context
- Better tree-shaking

### Signal-Based APIs (Angular 17.3+)

The upstream imports new signal-related symbols:

```typescript
import {
    EventEmitter,
    OutputEmitterRef,  // New in 17.3
} from '@angular/core';
```

**New output() Function:**
```typescript
// Old pattern
@Output() nameChange = new EventEmitter<string>();

// New pattern (Angular 17.3+)
nameChange = output<string>();  // Returns OutputEmitterRef<string>
```

---

## 7. Dynamic Component Creation

### ComponentFactoryResolver Removed

`ComponentFactoryResolver` was deprecated in Angular 13 and removed from Router APIs.

**Current Fork Pattern (Still Works):**
```typescript
const componentRef = this.container.createComponent(this.component);
```

This pattern is correct and doesn't use the deprecated resolver. The upstream uses the same pattern.

---

## 8. Ionic 8 Changes

### IonBackButtonDelegate Import Change

**Before:**
```typescript
import { IonBackButtonDelegate } from '@ionic/angular';
```

**After:**
```typescript
import { IonBackButton } from '@ionic/angular';
```

### Legacy Form Control Syntax Removed

The `legacy` property and legacy syntax for form controls have been removed.

**Removed Patterns:**
```html
<!-- No longer works -->
<ion-item>
    <ion-label>Label</ion-label>
    <ion-toggle></ion-toggle>
</ion-item>
```

**New Pattern:**
```html
<ion-toggle>Label</ion-toggle>
<!-- Or with slot -->
<ion-item>
    <ion-toggle slot="start">Label</ion-toggle>
</ion-item>
```

### Dark Mode Theming

Dark palette now targets `:root` instead of `body`. Custom CSS variables should target `:root`.

### Picker Component Renamed

`ion-picker` is now the inline picker. For legacy modal picker, use `ion-picker-legacy`.

### Haptics Cordova Support Dropped

Cordova haptics plugin no longer supported. Migrate to Capacitor for haptics.

---

## 9. Migration Checklist

### Phase 1: Angular 17 -> 18
- [ ] Run `ng update @angular/core@18 @angular/cli@18`
- [ ] Optionally migrate to esbuild: `ng update @angular/cli --name use-application-builder`
- [ ] Update TypeScript to 5.4+
- [ ] Test all functionality

### Phase 2: Angular 18 -> 19
- [ ] Run `ng update @angular/core@19 @angular/cli@19`
- [ ] Verify all components have `standalone: false` added (automated)
- [ ] Update TypeScript to 5.6+
- [ ] Update Node.js to 18.19.1+
- [ ] Test all functionality

### Phase 3: Angular 19 -> 20
- [ ] Update Node.js to v20+
- [ ] Run `ng update @angular/core@20 @angular/cli@20`
- [ ] Update TypeScript to 5.8+
- [ ] Consider migrating to `@angular/build` from `@angular-devkit/build-angular`
- [ ] Run control flow migration: `ng g @angular/core:control-flow-migration`
- [ ] Review and test all changes

### Phase 4: Service Path Updates
- [ ] Update imports from `@services/modals` to `@services/overlays/modals`
- [ ] Update imports from `@services/toasts` to `@services/overlays/toasts`
- [ ] Update imports from `@services/loadings` to `@services/overlays/loadings`
- [ ] Update imports from `@services/popovers` to `@services/overlays/popovers`
- [ ] Migrate `CoreDomUtils` calls to new services

### Phase 5: Custom Code Updates
- [ ] Review all `@ViewChild` usages for signal migration (optional)
- [ ] Review all `@Output` usages for `output()` migration (optional)
- [ ] Update Ionic form controls to new syntax
- [ ] Update any IonBackButtonDelegate imports

---

## 10. Files Most Affected in Custom Code

Based on grep analysis of the fork:

### High Impact (CoreDomUtils usage):
- `src/core/services/utils/dom.ts` - 946 lines changed in upstream
- All files importing `CoreDomUtils`

### Medium Impact (Overlay services):
- Files importing from `@services/toasts`, `@services/modals`, `@services/loadings`, `@services/popovers`

### Template Impact (Control flow):
- 100+ HTML files using `*ngIf`, `*ngFor`, `*ngSwitch`

---

## Sources

### Official Documentation
- [Angular Update Guide](https://angular.dev/update-guide)
- [Angular Versioning and Releases](https://angular.dev/reference/releases)
- [Angular Control Flow Migration](https://angular.dev/reference/migrations/control-flow)
- [Angular Standalone Migration](https://angular.dev/reference/migrations/standalone)
- [Angular Build System Migration](https://angular.dev/tools/cli/build-system-migration)
- [Ionic 8 Update Guide](https://ionicframework.com/docs/updating/8-0)

### Angular Blog
- [The Future is Standalone](https://blog.angular.dev/the-future-is-standalone-475d7edbc706)
- [Meet Angular's New output() API](https://blog.angular.dev/meet-angulars-new-output-api-253a41ffa13c)

### Community Resources
- [Angular 19 Migration Guide](https://markaicode.com/angular-19-migration-guide/)
- [Angular 19 to 20 Migration Checklist](https://www.yeou.dev/articulos/upgrading-to-angular-20)
- [Ionic 7 to 8 Migration Guide](https://www.angularminds.com/blog/ionic7-to-ionic8-migration)

### Upstream Codebase
- Verified against `upstream/latest` (moodlehq/moodleapp v5.1.0)
- `git show upstream/latest:package.json` - Angular 20.3.2 confirmed
- `git show upstream/latest:src/core/services/utils/dom.ts` - Deprecation confirmed

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Version differences | HIGH | Verified against upstream package.json |
| Service path changes | HIGH | Verified against upstream directory structure |
| CoreDomUtils deprecation | HIGH | Verified in upstream source code |
| Control flow migration | HIGH | Official Angular documentation |
| Standalone default change | HIGH | Official Angular blog post |
| Build system changes | MEDIUM | Official docs, but migration is optional |
| Signal APIs | MEDIUM | Available but migration is optional |
