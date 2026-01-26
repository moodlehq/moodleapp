---
phase: 001-prevent-parents-from-submitting-assignme
plan: 01
subsystem: parent-module-restrictions
tags:
  - parent-viewing
  - access-control
  - assignments
  - quizzes
  - completion
dependency-graph:
  requires:
    - parent-module-helper.ts
  provides:
    - Parent restriction enforcement for student-only actions
  affects:
    - Any future parent-viewable modules needing similar restrictions
tech-stack:
  added: []
  patterns:
    - Parent viewing check before mutating student data
key-files:
  created: []
  modified:
    - src/addons/mod/assign/components/submission/submission.ts
    - src/addons/mod/quiz/components/index/index.ts
    - src/core/features/course/services/course-helper.ts
decisions:
  - key: restriction-point
    choice: Block at UI action handlers
    rationale: Prevents parent action at earliest point, shows clear error message
  - key: error-messaging
    choice: Use CoreUserParentModuleHelper.getParentRestrictionMessage()
    rationale: Consistent messaging across all restricted actions
metrics:
  duration: ~3 minutes
  completed: 2026-01-26
---

# Quick Task 001: Prevent Parents from Submitting Assignments Summary

**One-liner:** Block parent users from submitting assignments, attempting quizzes, and toggling activity completion when viewing as their mentee.

## What Was Built

Added parent viewing checks to prevent student-only actions when a parent is viewing their child's (mentee's) courses. Parents can still VIEW all content but cannot ACT on behalf of students.

### Protected Actions

| Action | File | Method |
|--------|------|--------|
| Submit assignment for grading | submission.ts | submitForGrading() |
| Edit assignment | submission.ts | goToEdit() |
| Copy previous submission | submission.ts | copyPrevious() |
| Remove submission | submission.ts | remove() |
| Attempt quiz | index.ts | attemptQuiz() |
| Toggle manual completion | course-helper.ts | changeManualCompletion() |

### Implementation Pattern

Each protected method follows the same pattern:
```typescript
// Prevent parents from [action] on behalf of students
const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
if (isParentViewing) {
    CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('[action description]'));
    return;
}
```

## Commits

| Hash | Message |
|------|---------|
| 64242cf4c | feat(001-01): block assignment actions for parents viewing as mentee |
| 4aac03922 | feat(001-01): block quiz attempts for parents viewing as mentee |
| 9e23e8751 | feat(001-01): block manual completion for parents viewing as mentee |

## Verification

- [x] TypeScript compilation passes
- [x] Production build completes without errors
- [x] All three files modified with parent viewing checks

## Testing Checklist

Manual verification steps:

1. **Parent view testing:**
   - [ ] Login as parent, switch to viewing child
   - [ ] Open an assignment -> try to submit/edit -> should see "Parents cannot submit assignments on behalf of their children."
   - [ ] Open a quiz -> try to attempt -> should see "Parents cannot attempt quizzes on behalf of their children."
   - [ ] Find activity with manual completion -> try to toggle -> should see "Parents cannot mark activities as complete on behalf of their children."

2. **Student view testing:**
   - [ ] Login as student directly
   - [ ] All above actions should work normally

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- The `CoreUserParentModuleHelper` service was already implemented and provides the `isParentViewingMentee()` and `getParentRestrictionMessage()` methods
- The blocking happens at the earliest point in each action handler, before any loading modals or API calls
- Students (non-parent view) continue to have full functionality
