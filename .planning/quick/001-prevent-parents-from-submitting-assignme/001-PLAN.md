---
phase: 001-prevent-parents-from-submitting-assignme
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/addons/mod/assign/components/submission/submission.ts
  - src/addons/mod/quiz/components/index/index.ts
  - src/core/features/course/services/course-helper.ts
autonomous: true

must_haves:
  truths:
    - "Parents viewing as mentee cannot submit assignments"
    - "Parents viewing as mentee cannot attempt quizzes"
    - "Parents viewing as mentee cannot mark activities complete/incomplete"
    - "Students can still perform all these actions normally"
  artifacts:
    - path: "src/addons/mod/assign/components/submission/submission.ts"
      provides: "Parent check before submit/edit actions"
      contains: "isParentViewingMentee"
    - path: "src/addons/mod/quiz/components/index/index.ts"
      provides: "Parent check before quiz attempt"
      contains: "isParentViewingMentee"
    - path: "src/core/features/course/services/course-helper.ts"
      provides: "Parent check before manual completion change"
      contains: "isParentViewingMentee"
  key_links:
    - from: "submission.ts"
      to: "CoreUserParentModuleHelper"
      via: "import and isParentViewingMentee call"
    - from: "quiz/index.ts"
      to: "CoreUserParentModuleHelper"
      via: "import and isParentViewingMentee call"
    - from: "course-helper.ts"
      to: "CoreUserParentModuleHelper"
      via: "import and isParentViewingMentee call"
---

<objective>
Prevent parents from performing student-only actions when viewing their mentee's courses.

Purpose: Parents should be able to VIEW their children's assignments, quizzes, and progress but should NOT be able to ACT on their behalf (submit work, attempt quizzes, mark things complete).

Output: Modified components with parent role checks that show an error alert when a parent tries to perform a restricted action.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/core/features/user/services/parent-module-helper.ts (provides isParentViewingMentee method)
@src/addons/mod/assign/components/submission/submission.ts (assignment submission component)
@src/addons/mod/quiz/components/index/index.ts (quiz index component)
@src/core/features/course/services/course-helper.ts (manual completion handler)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Block assignment submission and editing for parents</name>
  <files>src/addons/mod/assign/components/submission/submission.ts</files>
  <action>
Add parent viewing check to prevent submission actions:

1. Add import at top of file:
   `import { CoreUserParentModuleHelper } from '@features/user/services/parent-module-helper';`

2. Modify `submitForGrading()` method (around line 824):
   - At the start of the method, after the initial `if (!this.assign || !this.userSubmission)` check, add:
   ```typescript
   // Prevent parents from submitting on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('submit assignments'));
       return;
   }
   ```

3. Modify `goToEdit()` method (around line 331):
   - At the start of the method, add:
   ```typescript
   // Prevent parents from editing assignments on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('edit assignments'));
       return;
   }
   ```

4. Modify `copyPrevious()` method (around line 266):
   - At the start of the method, after the initial `if (!this.assign)` check, add:
   ```typescript
   // Prevent parents from copying submissions on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('edit assignments'));
       return;
   }
   ```

5. Modify `remove()` method (around line 358):
   - At the start of the method, after the initial check, add:
   ```typescript
   // Prevent parents from removing submissions on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('remove submissions'));
       return;
   }
   ```
  </action>
  <verify>
   - `npm run lint -- --filter="**/assign/components/submission/**"` passes
   - Build compiles without TypeScript errors: `npm run build:dev -- --filter="**/assign/**"`
  </verify>
  <done>
   Assignment submission, editing, copying, and removal are blocked for parents viewing as mentee with appropriate error messages.
  </done>
</task>

<task type="auto">
  <name>Task 2: Block quiz attempts for parents</name>
  <files>src/addons/mod/quiz/components/index/index.ts</files>
  <action>
Add parent viewing check to prevent quiz attempts:

1. Add import at top of file (after existing imports around line 56):
   `import { CoreUserParentModuleHelper } from '@features/user/services/parent-module-helper';`

2. Modify `attemptQuiz()` method (around line 140):
   - After the initial `if (this.showStatusSpinner || !this.quiz)` check, add:
   ```typescript
   // Prevent parents from attempting quizzes on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('attempt quizzes'));
       return;
   }
   ```

Note: The `openQuiz()` method is protected and called only from `attemptQuiz()`, so blocking at `attemptQuiz()` is sufficient.
  </action>
  <verify>
   - `npm run lint -- --filter="**/quiz/components/index/**"` passes
   - Build compiles without TypeScript errors: `npm run build:dev -- --filter="**/quiz/**"`
  </verify>
  <done>
   Quiz attempts are blocked for parents viewing as mentee with appropriate error message.
  </done>
</task>

<task type="auto">
  <name>Task 3: Block manual activity completion for parents</name>
  <files>src/core/features/course/services/course-helper.ts</files>
  <action>
Add parent viewing check to prevent manual completion changes:

1. Add import at top of file (with other imports):
   `import { CoreUserParentModuleHelper } from '@features/user/services/parent-module-helper';`

2. Modify `changeManualCompletion()` method (around line 2077):
   - After the initial completion and tracking checks (around line 2087), before the modal show, add:
   ```typescript
   // Prevent parents from changing completion status on behalf of students
   const isParentViewing = await CoreUserParentModuleHelper.isParentViewingMentee();
   if (isParentViewing) {
       CoreAlerts.showError(CoreUserParentModuleHelper.getParentRestrictionMessage('mark activities as complete'));
       return;
   }
   ```

This blocks the core service method which is called from both:
- module-completion.ts (completionClicked)
- module-completion-legacy.ts (completionClicked)
  </action>
  <verify>
   - `npm run lint -- --filter="**/course/services/**"` passes
   - Build compiles without TypeScript errors: `npm run build:dev -- --filter="**/course/**"`
  </verify>
  <done>
   Manual activity completion changes are blocked for parents viewing as mentee with appropriate error message.
  </done>
</task>

</tasks>

<verification>
1. Run full lint: `npm run lint`
2. Run full build: `npm run build:dev`
3. Manual test (parent view):
   - Login as parent, switch to viewing child
   - Open an assignment -> try to submit/edit -> should see error
   - Open a quiz -> try to attempt -> should see error
   - Find activity with manual completion -> try to toggle -> should see error
4. Manual test (student view):
   - Login as student directly
   - All above actions should work normally
</verification>

<success_criteria>
- All three files modified with parent viewing checks
- No TypeScript or lint errors
- Parents see clear error message when attempting restricted actions
- Students (non-parent view) can still perform all actions normally
</success_criteria>

<output>
After completion, create `.planning/quick/001-prevent-parents-from-submitting-assignme/001-SUMMARY.md`
</output>
