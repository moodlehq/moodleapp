# Project Research Summary

**Project:** Aspire Moodle App Fork Migration
**Domain:** Angular/Ionic Mobile App Framework Upgrade
**Researched:** 2026-01-23
**Confidence:** HIGH (verified against upstream codebase and official documentation)

## Executive Summary

This migration involves upgrading the Aspire Moodle App fork from Angular 17.3.12 to Angular 20.3.2 to align with upstream moodlehq/moodleapp v5.1.0. This is a **3 major version jump** (17 -> 18 -> 19 -> 20) that must be executed incrementally. The migration touches every layer of the application: build system, component architecture, template syntax, service organization, and reactive patterns.

The recommended approach is to split the migration into distinct phases: first the Angular version upgrades (one major version at a time), then the Moodle-specific service reorganization (CoreDomUtils split, import path changes), and finally the optional modern Angular patterns (signals, new control flow). This sequencing minimizes risk by isolating framework changes from application-layer refactoring.

Key risks include: the Angular 19 standalone default breaking all NgModule-based components (automated migration available), the CoreDomUtils deprecation requiring widespread import changes, and the control flow syntax migration affecting 100+ template files. All three have automated migration tools or clear migration patterns. The critical constraint is Node.js v20 requirement for Angular 20.

## Key Findings

### Recommended Stack (from ANGULAR17_APIS.md)

The migration targets alignment with upstream v5.1.0 dependencies:

**Core technologies:**
- **Angular 20.3.2**: Required for upstream compatibility; enables new control flow, signals API
- **Ionic 8.7.5**: Minor upgrade from 8.3.1; includes form control syntax changes
- **TypeScript 5.9.2**: Required by Angular 20; upgrade through 5.4 -> 5.6 -> 5.8 -> 5.9
- **Node.js 20+**: Hard requirement for Angular 20; upgrade before Angular 19->20 step
- **@angular/build 20.3.3**: Replaces @angular-devkit/build-angular; optional but recommended

**Version progression:**
| Component | Current | Target |
|-----------|---------|--------|
| Angular | 17.3.12 | 20.3.2 |
| Ionic | 8.3.1 | 8.7.5 |
| TypeScript | 5.3.3 | 5.9.2 |
| Zone.js | 0.14.10 | 0.15.1 |

### Expected Features (from STANDALONE_COMPONENTS.md)

**Must have (required for migration):**
- All components explicitly marked with `standalone: true` or `standalone: false`
- Import arrays on standalone components with required modules (CoreSharedModule minimum)
- Updated lazy loading modules (remove declarations, keep routing)

**Should have (recommended):**
- Full standalone component architecture (matches upstream pattern)
- `loadComponent` route pattern for lazy loading
- CUSTOM_ELEMENTS_SCHEMA for web components (Swiper)

**Defer (v2+):**
- Signal-based ViewChild/Input migrations (optional, not blocking)
- `output()` function migration from @Output decorator

### Architecture Approach (from SIGNALS_MIGRATION.md)

Angular signals represent a shift from decorator-based to function-based reactivity. The upstream uses this extensively, but migration is optional for initial sync.

**Major components:**
1. **Signal Queries** (`viewChild`, `viewChildren`) — Replace @ViewChild decorators with reactive signals
2. **Signal Inputs** (`input()`) — Replace @Input decorators with reactive InputSignal
3. **Reactive Effects** (`effect()`, `computed()`) — Replace ngOnChanges with signal-based reactivity

### Critical Pitfalls (from MOODLE_CHANGES.md)

1. **CoreDomUtils Deprecation** — Split into CoreAlerts, CoreLoadings, CoreModals, CorePopovers, CorePrompts, CoreToasts. Import paths changed from `@services/loadings` to `@services/overlays/loadings`. Migration required for all overlay service usage.

2. **Import Path Changes** — Overlay services moved to `@services/overlays/` subdirectory. USER_PROFILE_REFRESHED constant moved to `@features/user/constants`. Mass find/replace required.

3. **CoreUrl API Signature Change** — `addParamsToUrl()` third parameter changed from positional args to options object. Custom fork has modifications in `src/core/singletons/url.ts` that must be reviewed.

4. **Angular 19 Standalone Default** — All components without explicit `standalone` property will break. Automated migration adds `standalone: false` where needed.

5. **Control Flow Template Syntax** — `*ngIf`, `*ngFor`, `*ngSwitch` deprecated in Angular 20. Automated migration available via `ng g @angular/core:control-flow-migration`. Affects 100+ template files.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Angular 17 to 18
**Rationale:** Minimal breaking changes; establishes upgrade pattern; optional esbuild migration
**Delivers:** Angular 18 compatibility, faster builds (optional)
**Addresses:** Build system modernization (optional)
**Avoids:** None critical; lowest-risk upgrade step

**Tasks:**
- Run `ng update @angular/core@18 @angular/cli@18`
- Update TypeScript to 5.4+
- Optionally migrate to esbuild: `ng update @angular/cli --name use-application-builder`
- Test all functionality

### Phase 2: Angular 18 to 19
**Rationale:** Critical breaking change with standalone default; requires explicit marking of all components
**Delivers:** Angular 19 compatibility, standalone-ready architecture
**Addresses:** Component declarations, standalone property requirements
**Avoids:** Silent breakage of NgModule components

**Tasks:**
- Update Node.js to 18.19.1+
- Run `ng update @angular/core@19 @angular/cli@19`
- Verify automated `standalone: false` addition
- Update TypeScript to 5.6+
- Test all functionality

### Phase 3: Angular 19 to 20
**Rationale:** Reaches target version; enables modern patterns; control flow available
**Delivers:** Angular 20 compatibility, new control flow syntax (optional)
**Uses:** @angular/build, Node.js 20+
**Avoids:** Old structural directives (deprecated but not removed)

**Tasks:**
- Update Node.js to v20+
- Run `ng update @angular/core@20 @angular/cli@20`
- Update TypeScript to 5.8+
- Consider migrating to `@angular/build` from `@angular-devkit/build-angular`
- Run control flow migration: `ng g @angular/core:control-flow-migration`
- Review and test all changes

### Phase 4: Moodle Service Reorganization
**Rationale:** Aligns with upstream v5.1.0 architecture; enables future merge compatibility
**Delivers:** Updated import paths, new overlay service usage
**Implements:** CoreDomUtils deprecation, overlay service restructure

**Tasks:**
- Update imports from `@services/modals` to `@services/overlays/modals`
- Update imports from `@services/toasts` to `@services/overlays/toasts`
- Update imports from `@services/loadings` to `@services/overlays/loadings`
- Update imports from `@services/popovers` to `@services/overlays/popovers`
- Migrate CoreDomUtils calls to new services (CoreAlerts, CoreLoadings, etc.)
- Update USER_PROFILE_REFRESHED import to `@features/user/constants`
- Review CoreUrl.addParamsToUrl usage for API signature changes

### Phase 5: Standalone Component Conversion
**Rationale:** Fully adopts modern Angular architecture; matches upstream patterns
**Delivers:** All components standalone, removed component modules
**Implements:** Angular standalone architecture pattern

**Tasks:**
- Convert components to standalone: true with imports array
- Remove `*-components.module.ts` files
- Update lazy modules to use loadComponent where appropriate
- Add CUSTOM_ELEMENTS_SCHEMA for Swiper components

### Phase 6: Signal APIs (Optional)
**Rationale:** Modernizes reactivity; improves performance; can be deferred
**Delivers:** Signal-based ViewChild, Input, computed values
**Implements:** Modern Angular reactivity patterns

**Tasks:**
- Convert @ViewChild to viewChild()
- Convert @Input to input()
- Replace ngOnChanges with effect()
- Update template access patterns (add function calls)

### Phase Ordering Rationale

- **Angular versions must be sequential**: Each major version has breaking changes that build on the previous version's migration
- **Node.js upgrade before Angular 20**: Hard dependency that blocks the upgrade
- **Moodle services after Angular**: Service changes are application-layer, should happen on stable framework
- **Standalone conversion after Angular 19**: Angular 19 adds `standalone: false` automatically, then conversion to true can proceed
- **Signals are optional**: Performance improvement but not blocking; can be deferred indefinitely

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Moodle Services):** Custom fork modifications in `src/core/singletons/url.ts` need individual review for API compatibility
- **Phase 5 (Standalone):** Custom addon modules (lightboxgallery, etc.) need template dependency analysis

Phases with standard patterns (skip research-phase):
- **Phase 1, 2, 3 (Angular Upgrades):** Well-documented with official migration guides and automated schematics
- **Phase 6 (Signals):** Official Angular documentation and automated migration schematics available

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Angular Versions | HIGH | Verified against upstream package.json |
| Service Paths | HIGH | Verified against upstream directory structure |
| CoreDomUtils Deprecation | HIGH | Verified in upstream source code with deprecation annotations |
| Standalone Migration | HIGH | Official Angular documentation + 77 examples in codebase |
| Signals Migration | MEDIUM | Optional; patterns documented but not required |
| Control Flow | HIGH | Official Angular documentation with automated schematic |

**Overall confidence:** HIGH

### Gaps to Address

- **Custom CoreUrl modifications**: Fork has local changes in `src/core/singletons/url.ts`; manual review required during Phase 4
- **Ionic 8 form control syntax**: Some templates may use legacy `<ion-label>` patterns; needs grep during Phase 3
- **Test framework migration**: If using Karma, `@angular/build` removes Karma plugin; may need Vitest migration or manual builder configuration
- **Haptics plugin**: If using Cordova haptics, must migrate to Capacitor (Ionic 8 drops Cordova haptics support)

## Sources

### Primary (HIGH confidence)
- [Angular Update Guide](https://angular.dev/update-guide) — version migration paths
- [Angular Standalone Migration](https://angular.dev/reference/migrations/standalone) — component patterns
- [Angular Control Flow Migration](https://angular.dev/reference/migrations/control-flow) — template syntax
- [Angular Signal Queries](https://angular.dev/reference/migrations/signal-queries) — viewChild patterns
- [Ionic 8 Update Guide](https://ionicframework.com/docs/updating/8-0) — breaking changes
- Upstream codebase `upstream/latest` (moodlehq/moodleapp v5.1.0) — verified changes

### Secondary (MEDIUM confidence)
- [Angular 19 Migration Guide](https://markaicode.com/angular-19-migration-guide/) — community patterns
- [Angular 19 to 20 Migration Checklist](https://www.yeou.dev/articulos/upgrading-to-angular-20) — checklist
- Existing standalone components in codebase (77 found) — migration patterns

### Tertiary (LOW confidence)
- Build system performance claims (5x improvement) — needs validation in this codebase

---
*Research completed: 2026-01-23*
*Ready for roadmap: yes*
