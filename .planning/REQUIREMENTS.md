# Requirements: Aspire Moodle App Upstream Merge

**Defined:** 2026-01-23
**Core Value:** Preserve every Aspire customization while gaining upstream improvements

## v1 Requirements

### Phase 1: Non-Conflict Merge

- [x] **MRG-01**: Merge upstream/latest with -X ours strategy
- [x] **MRG-02**: Verify merge completes without fatal errors
- [x] **MRG-03**: Commit merge state (app won't build yet - expected)

### Phase 2: Core Services Adaptation

- [x] **SVC-01**: Update url.ts - fix CoreUrl.addParamsToUrl signature
- [x] **SVC-02**: Update iframe.ts - fix CoreLoadings import path
- [x] **SVC-03**: Update format-text.ts - adapt to new APIs
- [x] **SVC-04**: Update app.module.ts - handle standalone changes

### Phase 2: User Menu Adaptation

- [x] **USR-01**: Preserve parent/mentee system code
- [x] **USR-02**: Preserve debug console functionality
- [x] **USR-03**: Preserve app version/build display
- [x] **USR-04**: Preserve app links feature
- [x] **USR-05**: Update imports to new service paths
- [x] **USR-06**: Adapt to standalone component pattern if needed

### Phase 2: Grades Adaptation

- [x] **GRD-01**: Preserve grades card layout UI
- [x] **GRD-02**: Preserve grades.ts custom logic
- [x] **GRD-03**: Update imports and API calls
- [x] **GRD-04**: Adapt course.html/courses.html templates

### Phase 2: Dashboard/Courses Adaptation

- [x] **DSH-01**: Preserve Aspire dashboard customizations
- [x] **DSH-02**: Preserve course-list-item styling
- [x] **DSH-03**: Update courses.ts service imports
- [x] **DSH-04**: Adapt component templates

### Phase 2: Course Components Adaptation

- [x] **CRS-01**: Preserve course-section customizations
- [x] **CRS-02**: Preserve course module styling
- [x] **CRS-03**: Preserve course index page tweaks
- [x] **CRS-04**: Update course-format.html

### Phase 2: Block Addons Adaptation

- [x] **BLK-01**: Preserve timeline customizations
- [x] **BLK-02**: Preserve myoverview customizations
- [x] **BLK-03**: Update block component imports

### Phase 2: Other Addons Adaptation

- [x] **ADD-01**: Preserve calendar page customizations
- [x] **ADD-02**: Preserve messages page customizations
- [x] **ADD-03**: Preserve resource component customizations
- [x] **ADD-04**: Update addon imports

### Phase 2: Theme Adaptation

- [x] **THM-01**: Preserve theme.base.scss customizations
- [x] **THM-02**: Preserve ion-alert.scss customizations
- [x] **THM-03**: Preserve ion-header.scss customizations
- [x] **THM-04**: Merge theme.design-system.scss carefully

### Phase 3: Verification

- [x] **VER-01**: Build completes with zero errors
- [x] **VER-02**: App runs in browser (ionic serve)
- [x] **VER-03**: Parent/mentee login works
- [x] **VER-04**: Grades UI displays correctly
- [x] **VER-05**: User menu shows all features
- [x] **VER-06**: Course Index FAB works
- [x] **VER-07**: LightboxGallery works
- [x] **VER-08**: YouTube embeds work

## Out of Scope

| Feature | Reason |
|---------|--------|
| iOS/Android builds | Verify web first, native builds later |
| Full regression testing | Manual spot-check for v1, thorough testing later |
| Updating custom features | Just preserve them, enhancements are separate |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MRG-01 | Phase 1 | Complete |
| MRG-02 | Phase 1 | Complete |
| MRG-03 | Phase 1 | Complete |
| SVC-* | Phase 2 | Complete |
| USR-* | Phase 2 | Complete |
| GRD-* | Phase 2 | Complete |
| DSH-* | Phase 2 | Complete |
| CRS-* | Phase 2 | Complete |
| BLK-* | Phase 2 | Complete |
| ADD-* | Phase 2 | Complete |
| THM-* | Phase 2 | Complete |
| VER-* | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after milestone completion - all requirements verified*
