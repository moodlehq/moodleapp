# Moodle Mobile App - AI Agent Guidelines

## Project Overview
This is the official Moodle Mobile App - an Ionic/Angular hybrid application that runs on Android and iOS via Cordova. The app provides offline-first access to Moodle LMS functionality.

## Architecture Patterns

### Singleton Services via `makeSingleton`
Services are NOT Angular-managed singletons. Use the `makeSingleton` pattern:
```typescript
@Injectable({ providedIn: 'root' })
export class MyService { }
export const My = makeSingleton(MyService);
```
Import from `@singletons` for platform APIs, only import directly from `@angular/core` or Ionic when necessary.

### Delegate Pattern for Extensibility
The codebase uses delegates extensively to allow addons to register handlers:
- **CoreDelegate** base class in `src/core/classes/delegate.ts`
- Handlers register in module providers using `provideAppInitializer`:
```typescript
@NgModule({
    providers: [
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModPageModuleHandler.instance);
        }),
    ],
})
```
- Delegate examples: `CoreCourseModuleDelegate`, `CoreContentLinksDelegate`, `CoreCourseModulePrefetchDelegate`, `CoreMainMenuDelegate`

### Path Aliases (TypeScript)
Use barrel exports for cleaner imports:
- `@/` - Project root
- `@singletons` / `@singletons/*` - Core singletons
- `@services/*` - Core services
- `@features/*` - Core features
- `@components/*`, `@directives/*`, `@pipes/*` - UI elements
- `@addons/*` - Addon modules
- `@classes/*` - Shared classes

### Lazy Loading with Dynamic Routes
Routes use Angular's `ROUTES` injection token with factory functions:
```typescript
@NgModule({
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
})
export default class MyLazyModule {}
```
Main routing modules:
- `CoreMainMenuRoutingModule` - Top-level tabs (calendar, messages, etc.)
- `CoreMainMenuTabRoutingModule` - Child routes within tabs
- `CoreCourseContentsRoutingModule` - Module used to register routes in the course contents page. These are routes that will only be used on single activity courses where the activity uses split-view navigation in tablets, such as forum or glossary.
- `CoreCourseIndexRoutingModule` - Course tab pages
- `CoreMainMenuHomeRoutingModule` - Home page tabs
- `CoreSitePreferencesRoutingModule` - Site preferences pages
- Use `buildTabMainRoutes()` helper for consistent tab navigation

### Cache Data Layer
**SQLite Database**: Site-specific tables via `CORE_SITE_SCHEMAS` token:
```typescript
providers: [
    { provide: CORE_SITE_SCHEMAS, useValue: [MY_SCHEMA], multi: true }
]
```

**File Management**:
- `CoreFilepool` - Downloads/caches files with queue management
- `CoreCourseModulePrefetchDelegate` - Handles module prefetching for offline
- `CoreCourseHelper` - Manages course and section downloads for offline access
- `CoreFileProvider` - Manages file operations (read, write, delete) across device storage
- Files stored in filepool with metadata tracking (stale detection, external file flags)

**Sync Pattern**:
- Offline actions stored in local DB tables
- Sync services (extend `CoreSyncBaseProvider`) process on connection
- Use `CoreSyncCronHandler` for background sync

## Development Workflows

### Build & Serve
```bash
npm start              # Dev server with SSL at localhost:8100
npm run build          # Development build
npm run build:prod     # Production build
npm run build:test     # Testing build with NODE_ENV=testing
```
Before serving, Gulp tasks auto-run: `lang`, `env`, `icons`, optionally `behat`

### Testing
**Unit Tests (Jest)**:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```
Test files: `**/*.test.ts` with setup in `src/testing/setup.ts`

**E2E Tests (Behat)**:
- Feature files in `src/**/tests/behat/*.feature`
- PHP-based Behat communicates with app via `window.behat` API
- Build plugin: `gulp behat` (requires `MOODLE_APP_BEHAT_PLUGIN_PATH` or `MOODLE_DOCKER_WWWROOT`)
- Behat runtime in `src/testing/services/behat-runtime.ts`

### Mobile Development
```bash
npm run dev:android    # Run on Android with livereload
npm run dev:ios        # Run on iOS
npm run prod:android   # Production Android build
npm run prod:ios       # Production iOS build
```
Custom Cordova plugin in `cordova-plugin-moodleapp/` with TypeScript source compiled to `www/index.js`

### Language Files
Distributed lang files compiled into `src/assets/lang/{lang}.json`:
```bash
npm run lang:update-langpacks  # Pull from Moodle language packs
npm run lang:create-langindex  # Generate language index
```
Watch for changes: `gulp watch`

## Project-Specific Conventions

### Module Structure
- Core modules: `src/core/features/{feature}/`
- Addon modules: `src/addons/{type}/{name}/`
- Each feature has `{name}.module.ts` (eager) and `{name}-lazy.module.ts` (lazy-loaded routes) when needed
- Avoid creating separate `-lazy.module.ts` files; instead use `loadComponent` with dynamic imports for lazy loading
- Services in `services/`, components in `components/`, pages in `pages/`

### Handler Pattern
Handlers are singletons with `.instance` property added by `makeSingleton`:
```typescript
@Injectable({ providedIn: 'root' })
export class MyHandler extends CoreContentLinksHandler {
    name = 'AddonMyHandler';
    // ...implementation
}
export const MyHandler = makeSingleton(MyHandler);
```

### Shared Module Usage
Components import `CoreSharedModule` which re-exports:
- `CoreBaseModule` (CommonModule, FormsModule, IonicModule, TranslateModule)
- `CoreComponentsModule`, `CoreDirectivesModule`, `CorePipesModule`

### Database Schema Versioning
Define tables with columns, indexes in site schemas. Version increments trigger migrations.

### Environment Configuration
`moodle.config.json` (gitignored) extends `moodle.config.example.json`. Access via `CoreConstants.CONFIG` service. Test config overrides via `TestingBehatRuntime.init()`.

## Common Pitfalls

1. Always use singletons via `@singletons` instead of injecting Angular services directly
2. Use standalone components for new modules instead of `@NgModule({ declarations: [] })`
3. Always register handlers in `provideAppInitializer`
4. Import only from barrel files that are configured in `tsconfig.json` paths
5. **Do** run `gulp` before testing to ensure lang files are built
6. **Do** use `CoreSitesReadingStrategy` when fetching data to control cache vs network behavior


## Code reviews
- When performing a code review, check that the language is in British English.
