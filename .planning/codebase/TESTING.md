# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- Jest 29.7.0
- Preset: `jest-preset-angular` 13.1.6
- Config: `jest.config.js`

**Assertion Library:**
- Jest built-in matchers
- Angular TestBed for component testing

**Run Commands:**
```bash
npm run test              # Run all tests with gulp preprocessing
npm run test:ci           # CI mode, sequential, verbose
npm run test:watch        # Watch mode for development
npm run test:coverage     # Run with coverage report
```

## Test File Organization

**Location:**
- Co-located with source in `tests/` subdirectory
- Pattern: `src/core/{area}/tests/*.test.ts`

**Naming:**
- Test files: `{name}.test.ts` (NOT `.spec.ts`)
- Must match pattern: `**/?(*.)test.ts`

**Structure:**
```
src/
├── core/
│   ├── classes/
│   │   └── tests/
│   │       ├── database-table.test.ts
│   │       ├── error.test.ts
│   │       └── promised-value.test.ts
│   ├── components/
│   │   └── tests/
│   │       ├── iframe.test.ts
│   │       └── user-avatar.test.ts
│   ├── directives/
│   │   └── tests/
│   │       ├── format-text.test.ts
│   │       └── link.test.ts
│   ├── features/
│   │   └── {feature}/
│   │       └── tests/
│   │           └── *.test.ts
│   ├── services/
│   │   └── tests/
│   │       ├── sites.test.ts
│   │       ├── lang.test.ts
│   │       └── navigator.test.ts
│   ├── singletons/
│   │   └── tests/
│   │       ├── text.test.ts
│   │       ├── events.test.ts
│   │       └── array.test.ts
│   └── utils/
│       └── tests/
│           └── async-instance.test.ts
└── app/
    ├── app.component.test.ts
    └── app-routing.module.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// (C) Copyright 2015 Moodle Pty Ltd.
// ... license header ...

import { SomeClass } from '@classes/some-class';
import { mock, mockSingleton } from '@/testing/utils';

describe('SomeClass', () => {

    let instance: SomeClass;

    beforeEach(() => {
        // Setup mocks and instance
        instance = new SomeClass();
    });

    it('does something specific', () => {
        // Arrange
        const input = 'test';

        // Act
        const result = instance.doSomething(input);

        // Assert
        expect(result).toEqual('expected');
    });

    it('handles edge case', async () => {
        // Async test
        await expect(instance.asyncMethod()).resolves.toEqual('result');
    });

});
```

**Nested Describe Blocks:**
```typescript
describe('CoreDatabaseTable with eager caching', () => {

    let records: User[];
    let database: SQLiteDB;
    let table: CoreDatabaseTable<User>;

    beforeEach(() => [records, database, table] = prepareStubs({ cachingStrategy: CoreDatabaseCachingStrategy.Eager }));

    it('reads all records on initialization', async () => {
        await table.initialize();
        expect(database.getAllRecords).toHaveBeenCalledWith('users');
    });

    it('finds items', async () => {
        await testFindItems(records, table);
        expect(database.getRecord).not.toHaveBeenCalled();
    });

});

describe('CoreDatabaseTable with lazy caching', () => {
    // Similar structure, different config
});
```

**Patterns:**
- Blank line after opening brace of describe/it blocks (enforced by eslint in test files)
- Use descriptive test names: "does X when Y"
- Group related tests with nested `describe()`
- Extract common setup to helper functions

## Mocking

**Framework:** Jest built-in + custom utilities

**Core Mock Utilities (`src/testing/utils.ts`):**

```typescript
// mock() - Convert object methods to jest.fn()
export function mock<T>(
    instance: T | Partial<T> = {},
    overrides: string[] | Record<string, unknown> = {},
): T;

// mockSingleton() - Mock a singleton service
export function mockSingleton<T>(
    singletonClass: CoreSingletonProxy<T>,
    instance: T | Partial<T>
): T;

// Or with method names array
export function mockSingleton<T>(
    singletonClass: CoreSingletonProxy<unknown>,
    methods: string[],
    instance?: Record<string, unknown>,
): T;
```

**Mock Patterns:**

```typescript
// Mock a singleton service with partial implementation
mockSingleton(CoreSites, { getSite: () => Promise.reject() });

// Mock with method array (creates empty jest.fn() for each)
const navControllerMock = mockSingleton(NavController, ['navigateRoot', 'navigateForward']);

// Mock a class instance
const site = mock(new CoreSite('42', 'https://mysite.com', 'token'), {
    canDownloadFiles: () => true,
});

// Mock database for table tests
const database = mock<SQLiteDB>({
    getRecord: async <T>(_, conditions) => { /* ... */ },
    insertRecord: async (_, user: User) => records.push(user) && 1,
});
```

**What to Mock:**
- External services (CoreSites, CoreConfig, CoreFilter, etc.)
- HTTP/network requests
- Database operations
- Navigation (CoreNavigator, NavController)
- Platform-specific features

**What NOT to Mock:**
- The class under test
- Pure utility functions being tested
- Simple data transformations

## Fixtures and Factories

**Test Data Creation:**

```typescript
// Direct object creation for simple cases
const john = { id: 1, name: 'John', surname: 'Doe' };
const amy = { id: 2, name: 'Amy', surname: 'Doe' };

// Factory function for complex setup
function prepareStubs(config: Partial<CoreDatabaseConfiguration> = {}): [User[], SQLiteDB, CoreDatabaseTable<User>] {
    const records: User[] = [];
    const database = mock<SQLiteDB>({
        // ... mock implementation
    });
    const table = new CoreDatabaseTableProxy<User>(config, database, 'users');

    mockSingleton(CoreConfig, { ready: () => Promise.resolve() });

    return [records, database, table];
}
```

**Faker Library:**
- Available: `faker` 5.5.3
- Types: `@types/faker` 5.5.9
- Usage:
```typescript
import Faker from 'faker';

const sentence = Faker.lorem.sentence();
```

**Location:**
- Test data defined inline in test files
- Helper functions at top of test file or in shared module
- No dedicated fixtures directory

## Coverage

**Requirements:** None enforced (no coverage threshold)

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Configuration (`jest.config.js`):**
```javascript
collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',        // Exclude test files
    '!src/assets/**/*',          // Exclude assets
    '!src/testing/**/*',         // Exclude testing utilities
    '!src/core/initializers/index.ts',
    '!src/core/features/emulators/services/zip.ts',
],
```

## Test Types

**Unit Tests:**
- Scope: Single class/function in isolation
- Location: `src/core/{area}/tests/*.test.ts`
- Approach: Mock all dependencies, test behavior

**Component Tests:**
- Scope: Angular component rendering and behavior
- Uses: `renderComponent()`, `renderTemplate()`, `renderWrapperComponent()`
- Example:
```typescript
const fixture = await renderComponent(AppComponent);
expect(fixture.debugElement.componentInstance).toBeTruthy();
expect(fixture.nativeElement.querySelector('ion-router-outlet')).toBeTruthy();
```

**Integration Tests:**
- Limited: Most tests are unit tests with mocked dependencies
- Some service tests verify event-driven interactions

**E2E Tests:**
- Framework: Behat (separate from Jest)
- Location: `src/testing/services/behat-*.ts`
- Moodle plugin: `local_moodleappbehat`

## Common Patterns

**Async Testing:**
```typescript
// Async/await
it('loads data', async () => {
    await expect(table.getOne({ id: 1 })).resolves.toEqual(john);
});

// Rejection testing
it('throws on missing record', async () => {
    await expect(table.getOneByPrimaryKey({ id: 999 })).rejects.toThrow();
});

// Waiting for async operations
await CoreWait.nextTick();
```

**Error Testing:**
```typescript
it('rejects on missing record', async () => {
    await expect(table.getOneByPrimaryKey({ id: 1 })).rejects.toThrow();
});

// Testing specific error type
it('throws CanceledError', () => {
    expect(() => { throw new CoreCanceledError(); }).toThrow(CoreCanceledError);
});
```

**Component Rendering:**
```typescript
// Basic component
const fixture = await renderComponent(CoreUserAvatarComponent);
expect(fixture.nativeElement.innerHTML.trim()).not.toHaveLength(0);

// With inputs
const fixture = await renderWrapperComponent(
    CoreFormatTextDirective,
    'core-format-text',
    { text: sentence },
    config,
);

// With template
const { nativeElement } = await renderTemplate(
    CoreFormatTextDirective,
    '<core-format-text text="Lorem ipsum dolor"></core-format-text>',
);
```

**Mock Assertions:**
```typescript
expect(database.insertRecord).toHaveBeenCalledWith('users', john);
expect(database.getRecord).toHaveBeenCalledTimes(2);
expect(CoreFilter.formatText).toHaveBeenCalledWith(
    'Lorem ipsum dolor',
    expect.anything(),
    expect.anything(),
    undefined,
);
```

**DOM Assertions:**
```typescript
const text = nativeElement.querySelector('core-format-text');
expect(text).not.toBeNull();
expect(text?.textContent).toEqual('Formatted text');

const initials = nativeElement.querySelector('.userinitials');
expect(initials?.getAttribute('data-initials')?.trim()).toEqual('UNK');
```

**Placeholder Tests:**
```typescript
// Mark tests for future implementation
it.todo('navigates to a different site');
it.todo('navigates to login credentials');
```

## Test Setup

**Global Setup (`src/testing/setup.ts`):**
```typescript
import 'jest-preset-angular/setup-jest';

// Silence debug logs
console.debug = () => {};

// Convert console.error to thrown errors (fail fast)
console.error = (...args: any[]) => {
    throw new Error(args.map(a => String(a)).join(''));
};

// Fail on unhandled promise rejections
process.on('unhandledRejection', error => {
    throw new Error(error as string);
});

// Setup singleton method proxying for mock assertions
setCreateSingletonMethodProxy(/* ... */);

// Reset testing environment before each test
beforeEach(() => resetTestingEnvironment());
```

**Default Service Mocks:**
The testing utilities provide default mocks for common services:
- `Translate` - Returns key as-is
- `CoreDB` - Empty mock
- `CoreNavigator` - Mock navigation
- `ApplicationInit` - Resolved promise
- `CorePlatform` - Not mobile, not iOS/Android
- `CoreNetwork` - Always online
- `CoreLoadings` - Mock loader
- `CoreUtils` - Instant nextTick

**Transform Ignore Patterns:**
```javascript
transformIgnorePatterns: [
    'node_modules/(?!@stencil|@angular|@ionic|@moodlehq|@ngx-translate|@awesome-cordova-plugins|swiper)'
],
```

## Testing Utilities API

**`renderComponent<T>(component, config?)`**
- Renders standalone component
- Returns `TestingComponentFixture<T>`

**`renderTemplate<T>(component, template, config?)`**
- Renders component within a template
- Returns `WrapperComponentFixture<T>`

**`renderWrapperComponent<T>(component, tag, inputs?, config?)`**
- Renders component with inputs
- Generates template from tag and inputs

**`renderPageComponent<T>(component, config?)`**
- Renders page with route params mocked

**`findElement<E>(fixture, selector, content?)`**
- Finds element matching selector and optional content

**`requireElement<E>(fixture, selector, content?)`**
- Same as findElement but throws if not found

**`mockTranslate(translations)`**
- Mock Translate service with specific translations

**`wait(time)`**
- Wait specified milliseconds

**`agnosticPath(unixPath)`**
- Convert Unix path to platform path

---

*Testing analysis: 2026-01-18*
