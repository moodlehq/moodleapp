# Aspire Moodle App - Upstream Merge

## What This Is

A strategic merge of moodlehq/moodleapp v5.1.0 into the Aspire School custom fork (v4.5.6). The goal is to capture upstream bug fixes and new features while preserving all Aspire-specific customizations, adapting custom code to Angular 17 APIs where needed.

## Core Value

**Preserve every Aspire customization while gaining upstream improvements.** If a conflict arises, Aspire's custom features win. Upstream changes are only accepted where they don't override custom work.

## Requirements

### Validated

These features exist and MUST be preserved:

- ✓ Parent/Mentee system (login as mentee, token switching, permissions) — existing
- ✓ Aspire compact course UI redesign — existing
- ✓ Grades UI card layout redesign — existing
- ✓ User menu customizations (version info, debug console, app links) — existing
- ✓ LightboxGallery addon module — existing
- ✓ YouTube proxy for iOS Error 153 — existing
- ✓ Course Index FAB buttons on activity pages — existing
- ✓ Contact Us overhaul and UI styles — existing
- ✓ COEP/COOP headers for credentialless embeds — existing
- ✓ System browser for external links — existing
- ✓ Package ID: org.capriolegroup.aspire — existing
- ✓ Custom theme.custom.scss styles — existing
- ✓ Custom theme variables and colors — existing

### Active

- [ ] Merge upstream v5.1.0 bug fixes
- [ ] Merge upstream v5.1.0 new features (non-conflicting)
- [ ] Adapt custom code to Angular 17 standalone components
- [ ] Adapt custom code to Angular 17 signals API
- [ ] Update imports for moved/renamed services
- [ ] Ensure build compiles with zero errors
- [ ] Ensure all custom features still work

### Out of Scope

- Upstream UI changes that override Aspire customizations — conflicts with our design
- New upstream features that don't fit Aspire's design context — maintain consistency
- Major refactors of working custom code — if it works, keep it

## Context

**Current state:** Aspire fork at v4.5.6 based on older Moodle app
**Target:** Merge moodlehq/moodleapp v5.1.0

**Key upstream changes in v5.1.0:**
- Angular 17 migration (standalone components, signals)
- Service reorganization (@services/overlays/*, constants moved to */constants.ts)
- ViewChild → viewChild.required() signals
- CoreDomUtils → CoreAlerts for modals
- Many API signature changes

**Files with heavy Aspire customization (protect these):**
- src/core/features/mainmenu/components/user-menu/* (35+ commits)
- src/core/features/grades/* (10+ commits)
- src/core/features/courses/pages/dashboard/* (6+ commits)
- src/core/features/course/classes/main-activity-page.ts (openCourseIndex)
- src/addons/mod/lightboxgallery/* (custom addon)
- src/addons/block/timeline/* (5+ commits)
- src/addons/block/myoverview/* (5+ commits)
- src/theme/theme.custom.scss
- config.xml, moodle.config.json, package.json

## Constraints

- **Tech stack**: Must use Angular 17 patterns after merge (standalone, signals)
- **Compatibility**: Must build and run on iOS and Android
- **Design**: New additions must match existing Aspire UI style
- **Dependencies**: Keep Kotlin 1.9.24, cordova-android 14

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize Aspire code in conflicts | Custom features are the product differentiator | — Pending |
| Adapt to Angular 17 APIs | Required for upstream compatibility | — Pending |
| Check commit history for ambiguous files | Ensures we don't lose small customizations | — Pending |

---
*Last updated: 2026-01-23 after initialization*
