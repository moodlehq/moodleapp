# Requirements: Aspire Moodle App Upstream Merge

**Defined:** 2026-01-23
**Core Value:** Preserve every Aspire customization while gaining upstream improvements

## v1 Requirements

### Phase 1: Non-Conflict Merge

- [ ] **MRG-01**: Merge upstream/latest with -X ours strategy
- [ ] **MRG-02**: Verify merge completes without fatal errors
- [ ] **MRG-03**: Commit merge state (app won't build yet - expected)

### Phase 2: Core Services Adaptation

- [ ] **SVC-01**: Update url.ts - fix CoreUrl.addParamsToUrl signature
- [ ] **SVC-02**: Update iframe.ts - fix CoreLoadings import path
- [ ] **SVC-03**: Update format-text.ts - adapt to new APIs
- [ ] **SVC-04**: Update app.module.ts - handle standalone changes

### Phase 2: User Menu Adaptation

- [ ] **USR-01**: Preserve parent/mentee system code
- [ ] **USR-02**: Preserve debug console functionality
- [ ] **USR-03**: Preserve app version/build display
- [ ] **USR-04**: Preserve app links feature
- [ ] **USR-05**: Update imports to new service paths
- [ ] **USR-06**: Adapt to standalone component pattern if needed

### Phase 2: Grades Adaptation

- [ ] **GRD-01**: Preserve grades card layout UI
- [ ] **GRD-02**: Preserve grades.ts custom logic
- [ ] **GRD-03**: Update imports and API calls
- [ ] **GRD-04**: Adapt course.html/courses.html templates

### Phase 2: Dashboard/Courses Adaptation

- [ ] **DSH-01**: Preserve Aspire dashboard customizations
- [ ] **DSH-02**: Preserve course-list-item styling
- [ ] **DSH-03**: Update courses.ts service imports
- [ ] **DSH-04**: Adapt component templates

### Phase 2: Course Components Adaptation

- [ ] **CRS-01**: Preserve course-section customizations
- [ ] **CRS-02**: Preserve course module styling
- [ ] **CRS-03**: Preserve course index page tweaks
- [ ] **CRS-04**: Update course-format.html

### Phase 2: Block Addons Adaptation

- [ ] **BLK-01**: Preserve timeline customizations
- [ ] **BLK-02**: Preserve myoverview customizations
- [ ] **BLK-03**: Update block component imports

### Phase 2: Other Addons Adaptation

- [ ] **ADD-01**: Preserve calendar page customizations
- [ ] **ADD-02**: Preserve messages page customizations
- [ ] **ADD-03**: Preserve resource component customizations
- [ ] **ADD-04**: Update addon imports

### Phase 2: Theme Adaptation

- [ ] **THM-01**: Preserve theme.base.scss customizations
- [ ] **THM-02**: Preserve ion-alert.scss customizations
- [ ] **THM-03**: Preserve ion-header.scss customizations
- [ ] **THM-04**: Merge theme.design-system.scss carefully

### Phase 3: Verification

- [ ] **VER-01**: Build completes with zero errors
- [ ] **VER-02**: App runs in browser (ionic serve)
- [ ] **VER-03**: Parent/mentee login works
- [ ] **VER-04**: Grades UI displays correctly
- [ ] **VER-05**: User menu shows all features
- [ ] **VER-06**: Course Index FAB works
- [ ] **VER-07**: LightboxGallery works
- [ ] **VER-08**: YouTube embeds work

## Out of Scope

| Feature | Reason |
|---------|--------|
| iOS/Android builds | Verify web first, native builds later |
| Full regression testing | Manual spot-check for v1, thorough testing later |
| Updating custom features | Just preserve them, enhancements are separate |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MRG-01 | Phase 1 | Pending |
| MRG-02 | Phase 1 | Pending |
| MRG-03 | Phase 1 | Pending |
| SVC-* | Phase 2 | Pending |
| USR-* | Phase 2 | Pending |
| GRD-* | Phase 2 | Pending |
| DSH-* | Phase 2 | Pending |
| CRS-* | Phase 2 | Pending |
| BLK-* | Phase 2 | Pending |
| ADD-* | Phase 2 | Pending |
| THM-* | Phase 2 | Pending |
| VER-* | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after initial definition*
