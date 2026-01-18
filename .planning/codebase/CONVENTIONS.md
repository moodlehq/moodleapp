# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- Components: `kebab-case.ts` (e.g., `user-menu.ts`, `course-list-item.ts`)
- Pages: `kebab-case.ts` or `kebab-case.page.ts` (e.g., `sites.ts`, `course.page.ts`)
- Services: `kebab-case.ts` (e.g., `login-helper.ts`, `sites.ts`)
- Modules: `kebab-case.module.ts` (e.g., `grades.module.ts`, `grades-lazy.module.ts`)
- Tests: `kebab-case.test.ts` (e.g., `text.test.ts`, `sites.test.ts`)
- Singletons: `kebab-case.ts` (e.g., `text.ts`, `events.ts`)
- Errors: `kebab-case.ts` (e.g., `network-error.ts`, `loginerror.ts`)

**Functions:**
- Methods: `camelCase` (e.g., `fetchInitialCourses`, `getCoursesForMentee`)
- Event handlers: `verbNoun` pattern (e.g., `refreshCourses`, `toggleCategory`)
- Async methods: same pattern, no special prefix

**Variables:**
- Regular: `camelCase` (e.g., `isParentView`, `selectedMenteeId`)
- Private: `camelCase` with optional leading underscore allowed
- Boolean: prefix with `is`, `has`, `can`, `should` (e.g., `isParentView`, `hasAnyCourses`)

**Constants:**
- Class-level readonly: `UPPER_CASE` (e.g., `VALID_VERSION`, `WORKPLACE_APP`)
- Module-level exports: `UPPER_CASE` (e.g., `CORE_SITE_SCHEMAS`, `SITES_TABLE_NAME`)

**Types/Interfaces:**
- Prefix interfaces with context: `CoreSiteInfo`, `CategoryNode`
- Type aliases: PascalCase (e.g., `CoreAnyError`, `ServiceInjectionToken`)

**Classes:**
- Services: `Core{Feature}Provider` (e.g., `CoreSitesProvider`, `CoreLoginHelperProvider`)
- Components: `Core{Feature}Component` or `Core{Feature}Page` (e.g., `CoreGradesCoursesPage`)
- Errors: `Core{Type}Error` (e.g., `CoreError`, `CoreNetworkError`, `CoreLoginError`)
- Singletons: `Core{Name}` (e.g., `CoreText`, `CoreEvents`)

## Code Style

**Formatting:**
- Tool: EditorConfig (`.editorconfig`)
- Indentation: 4 spaces
- Quotes: single quotes for TypeScript
- Line endings: Unix (LF)
- Max line length: 132 characters (code), 140 (HTML templates)
- Trailing whitespace: trimmed
- Final newline: required

**Linting:**
- Tool: ESLint with `@angular-eslint`, `@typescript-eslint`
- Config: `.eslintrc.js`
- Key rules:
  - `'@typescript-eslint/explicit-module-boundary-types': 'error'` - explicit return types on public methods
  - `'@typescript-eslint/naming-convention'` - enforces camelCase properties, UPPER_CASE readonly
  - `'no-console': 'error'` - no console.log (use CoreLogger)
  - `'prefer-const': 'error'` - use const when variable not reassigned
  - `'curly': 'error'` - always use braces
  - `'padded-blocks': ['error', { classes: 'always' }]` - blank line after class open brace
  - `'arrow-body-style': ['error', 'as-needed']` - omit braces for single-expression arrows

**Header Requirement:**
All source files must include Apache 2.0 license header:
```typescript
// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...
```

## Import Organization

**Order:**
1. Angular core imports (`@angular/core`, `@angular/common`, etc.)
2. Angular router imports (`@angular/router`)
3. Third-party libraries (`rxjs`, `@ionic/angular`, `@ngx-translate`, etc.)
4. Core classes (`@classes/*`)
5. Core services (`@services/*`)
6. Core singletons (`@singletons`, `@singletons/*`)
7. Feature services (`@features/*/services/*`)
8. Components (`@components/*`)
9. Relative imports (`./`, `../`)

**Path Aliases (from `tsconfig.json`):**
```typescript
'@addons/*'      -> './addons/*'
'@classes/*'     -> './core/classes/*'
'@components/*'  -> './core/components/*'
'@directives/*'  -> './core/directives/*'
'@features/*'    -> './core/features/*'
'@guards/*'      -> './core/guards/*'
'@pipes/*'       -> './core/pipes/*'
'@services/*'    -> './core/services/*'
'@singletons'    -> './core/singletons/index'
'@singletons/*'  -> './core/singletons/*'
'@/*'            -> './*'
```

**Usage:**
- Always use path aliases for cross-module imports
- Use relative imports only within same directory/module
- Import from barrel files (`index.ts`) when available

## Error Handling

**Error Class Hierarchy:**
```
CoreError (base)
├── CoreCanceledError      - User cancelled operation
├── CoreNetworkError       - Network connectivity issues
├── CoreSiteError          - Site-specific errors
├── CoreLoginError         - Authentication errors
├── CoreWSError            - Web service errors
├── CoreAjaxError          - AJAX request errors
├── CoreAjaxWSError        - AJAX web service errors
├── CoreHttpError          - HTTP errors
├── CoreCaptureError       - Media capture errors
├── CoreSilentError        - Errors that should not show UI
└── CoreErrorWithOptions   - Errors with recovery options
```

**Patterns:**
```typescript
// Throw typed errors
throw new CoreNetworkError();
throw new CoreError('Something went wrong');

// Catch and show user-friendly message
try {
    await someOperation();
} catch (error) {
    CoreDomUtils.showErrorModalDefault(error, 'Error loading courses');
}

// Ignore errors silently
await CoreUtils.ignoreErrors(this.courses.reload());

// Check error type
if (error instanceof CoreNetworkError) {
    // Handle network error
}
```

**Service Error Display:**
- Use `CoreDomUtils.showErrorModalDefault(error, fallbackMessage)` for user-facing errors
- Use `CoreDomUtils.showErrorModal(message)` for specific error messages
- Translated error keys: `'core.login.errordeletesite'`

## Logging

**Framework:** `CoreLogger` singleton

**Patterns:**
```typescript
// In service constructor
protected logger: CoreLogger;

constructor() {
    this.logger = CoreLogger.getInstance('CoreSitesProvider');
}

// Usage
this.logger.debug('Debug message');
this.logger.warn('Warning message');
this.logger.error('Error message', error);
```

**Rules:**
- Never use `console.log` directly (linting error)
- Use `CoreLogger.getInstance('ClassName')` with class name identifier
- Debug logs silenced in test setup

## Comments

**When to Comment:**
- Public method documentation: JSDoc required
- Complex logic: inline comments explaining why
- TODO/FIXME: allowed with descriptive text
- Deprecated methods: use `@deprecated` JSDoc tag with migration info

**JSDoc Pattern:**
```typescript
/**
 * Fetch courses with grades for all mentees.
 *
 * @param siteId Site ID. If not defined, current site.
 * @returns Promise resolved with courses array.
 * @deprecated since 4.4. Use CorePolicy.acceptMandatoryPolicies instead.
 */
async fetchMenteeCourses(siteId?: string): Promise<Course[]> {
```

**Custom JSDoc Tags:**
- `@deprecatedonmoodle` - Deprecated in Moodle core
- `@inheritdoc` - Inherits documentation from parent

## Function Design

**Size:**
- Keep methods focused, single responsibility
- Extract helper methods for complex logic
- Typical page component: 100-400 lines

**Parameters:**
```typescript
// Optional parameters with defaults
async fetchMenteeCourses(siteId?: string): Promise<void>

// Configuration objects for multiple options
async renderComponent<T>(
    component: Type<T>,
    config: Partial<RenderConfig> = {},
): Promise<TestingComponentFixture<T>>
```

**Return Values:**
- Promise for async operations
- void for side-effect-only operations
- Explicit return types required (eslint rule)

**Async/Await:**
- Always use async/await (not .then())
- Handle errors with try/catch

## Module Design

**Exports:**
- Services: `@Injectable({ providedIn: 'root' })` for singletons
- Singletons: `makeSingleton()` pattern for service proxies
- Components: export from module barrel file

**Barrel Files:**
- Use `index.ts` for public exports
- Example: `@singletons` imports from `src/core/singletons/index.ts`

**Lazy Loading:**
- Feature modules split into `*.module.ts` and `*-lazy.module.ts`
- Routing modules: `*-routing.module.ts`

## Angular Patterns

**Component Decorators:**
```typescript
@Component({
    selector: 'page-core-grades-courses',  // prefix with page- or core-
    templateUrl: 'courses.html',
    styleUrls: ['courses.scss'],
})
```

**Service Decorators:**
```typescript
@Injectable({ providedIn: 'root' })
export class CoreSitesProvider {
```

**Lifecycle Hooks:**
- Implement interfaces: `OnInit`, `OnDestroy`, `AfterViewInit`
- Use `@inheritdoc` in JSDoc for hook methods
- Clean up subscriptions in `ngOnDestroy`

**Dependency Injection:**
- Constructor injection for required dependencies
- `@Optional()` for optional dependencies
- `@Inject()` for injection tokens

## Singleton Pattern

**makeSingleton Usage:**
```typescript
// In singletons/index.ts
export const CoreSites = makeSingleton(CoreSitesProvider);

// Usage anywhere
CoreSites.getCurrentSite();
```

**Static Class Pattern (non-injectable):**
```typescript
export class CoreText {
    private constructor() {
        // Nothing to do - prevent instantiation
    }

    static addEndingSlash(text: string): string {
        // ...
    }
}
```

## TypeScript Strict Mode

**Enabled Checks:**
- `strictNullChecks: true`
- `strictPropertyInitialization: true`

**Patterns:**
```typescript
// Handle nullable
const site = CoreSites.getCurrentSite();
if (site) {
    // site is now CoreSite, not CoreSite | undefined
}

// Non-null assertion (use sparingly)
this.splitView!.component

// Optional chaining
course?.grade ?? '-'
```

---

*Convention analysis: 2026-01-18*
