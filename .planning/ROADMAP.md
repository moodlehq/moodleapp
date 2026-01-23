# Roadmap: Aspire Moodle App Upstream Merge

**Created:** 2026-01-23
**Phases:** 3
**Strategy:** Phased merge - non-conflicts first, then adapt custom code

## Overview

| Phase | Name | Goal | Requirements | Plans |
|-------|------|------|--------------|-------|
| 1 | Non-Conflict Merge | Get upstream changes into non-custom files | MRG-01, MRG-02, MRG-03 | 1 |
| 2 | Custom Code Adaptation | Adapt 47 conflict files to new APIs while preserving customizations | SVC-*, USR-*, GRD-*, DSH-*, CRS-*, BLK-*, ADD-*, THM-* | 8 |
| 3 | Verification | Ensure app builds and all features work | VER-01 through VER-08 | 1 |

---

## Phase 1: Non-Conflict Merge

**Goal:** Merge upstream v5.1.0, accepting our version for all conflict files

**Requirements:** MRG-01, MRG-02, MRG-03

**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md - Fetch upstream and execute merge with -X ours strategy

**Success Criteria:**
1. `git merge upstream/latest -X ours` completes
2. Merge commit created
3. 2,362+ non-conflict files have upstream changes

**Notes:**
- App will NOT build after this phase (expected)
- Conflict files keep our code temporarily
- This gets the bulk of upstream in safely

---

## Phase 2: Custom Code Adaptation

**Goal:** Update 47 conflict files to work with new Angular 20 APIs while preserving all Aspire customizations

**Plans:** 8 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md - Core Services (url.ts, iframe.ts, format-text.ts, app.module.ts)
- [x] 02-02-PLAN.md - User Menu (parent/mentee system, debug console, app links)
- [x] 02-03-PLAN.md - Grades (courses page, course page, grades service)
- [x] 02-04-PLAN.md - Dashboard & Courses (dashboard page, course-list-item, courses service)
- [x] 02-05-PLAN.md - Course Components (course-section, module, index page)
- [x] 02-06-PLAN.md - Block Addons (timeline, myoverview)
- [x] 02-07-PLAN.md - Other Addons (calendar, messages, resource, user about)
- [x] 02-08-PLAN.md - Theme (base, variables, custom SCSS)

**Wave Structure:**
- **Wave 1:** Plan 2.1 (Core Services) - must complete first, fixes foundational imports
- **Wave 2:** Plans 2.2-2.8 (parallel) - independent file groups, all depend on 2.1

### Plan 2.1: Core Services
**Files:** url.ts, iframe.ts, format-text.ts, app.module.ts
**Requirements:** SVC-01, SVC-02, SVC-03, SVC-04

**Success Criteria:**
1. Import paths updated to @services/overlays/*
2. CoreUrl.addParamsToUrl uses new signature
3. No TypeScript errors in these files

### Plan 2.2: User Menu
**Files:** user-menu.ts, user-menu.html, user-menu.scss
**Requirements:** USR-01 through USR-06

**Success Criteria:**
1. Parent/mentee code intact
2. Debug console works
3. App version displays
4. App links work
5. No TypeScript errors

### Plan 2.3: Grades
**Files:** grades/pages/course/*, grades/pages/courses/*, grades/services/grades.ts
**Requirements:** GRD-01 through GRD-04

**Success Criteria:**
1. Card layout UI preserved
2. Custom grades logic intact
3. Import paths updated
4. No TypeScript errors

### Plan 2.4: Dashboard & Courses
**Files:** dashboard/*, course-list-item/*, courses.ts
**Requirements:** DSH-01 through DSH-04

**Success Criteria:**
1. Aspire dashboard UI preserved
2. Course list styling intact
3. Courses service updated
4. No TypeScript errors

### Plan 2.5: Course Components
**Files:** course-section/*, module/*, course pages/index/*
**Requirements:** CRS-01 through CRS-04

**Success Criteria:**
1. Course section styling preserved
2. Module styling preserved
3. Course index tweaks intact
4. No TypeScript errors

### Plan 2.6: Block Addons
**Files:** timeline/*, myoverview/*
**Requirements:** BLK-01 through BLK-03

**Success Criteria:**
1. Timeline customizations preserved
2. Myoverview customizations preserved
3. Import paths updated
4. No TypeScript errors

### Plan 2.7: Other Addons
**Files:** calendar/*, messages/*, resource/*
**Requirements:** ADD-01 through ADD-04

**Success Criteria:**
1. Calendar page customizations preserved
2. Messages customizations preserved
3. Resource component customizations preserved
4. No TypeScript errors

### Plan 2.8: Theme
**Files:** theme.base.scss, globals.variables.scss, theme.custom.scss, globals.custom.scss
**Requirements:** THM-01 through THM-04

**Success Criteria:**
1. Base theme customizations preserved
2. Design system variables intact
3. Custom Aspire styling preserved
4. No SCSS errors

---

## Phase 3: Verification ✓

**Goal:** Confirm app builds and all custom features work

**Requirements:** VER-01 through VER-08

**Status:** COMPLETE

Plans:
- [x] 03-01-PLAN.md - Final build verification and error fixes

**Success Criteria:**
1. ✓ `npm run build` succeeds with zero errors
2. ✓ `ionic serve` starts without errors
3. ✓ Parent/mentee login functional (code verified)
4. ✓ Grades UI displays correctly (code verified)
5. ✓ User menu shows all custom features
6. ✓ Course Index FAB appears and works
7. ✓ LightboxGallery addon loads
8. ✓ YouTube embeds play (code verified)

---

## Execution Notes

**Parallelization:**
- Wave 1: Plan 2.1 only (core services)
- Wave 2: Plans 2.2-2.8 can run in parallel (independent file groups)

**Risk Mitigation:**
- Commit after each plan completes
- If build breaks, easy to identify which plan caused it
- Can roll back individual plans if needed

**Dependencies:**
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
- Within Phase 2: Plan 2.1 must complete before 2.2-2.8 (fixes core imports)

---
*Roadmap created: 2026-01-23*
*Last updated: 2026-01-23 - Milestone complete, all phases verified*
