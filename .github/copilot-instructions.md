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
Import from `@singletons` for platform APIs, never directly from `@angular/core` or Ionic.

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
- Key delegates: `CoreCourseModuleDelegate`, `CoreContentLinksDelegate`, `CoreCourseModulePrefetchDelegate`, `CoreMainMenuDelegate`

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
- Use `buildTabMainRoutes()` helper for consistent tab navigation

### Offline-First Data Layer
**SQLite Database**: Site-specific tables via `CORE_SITE_SCHEMAS` token:
```typescript
providers: [
    { provide: CORE_SITE_SCHEMAS, useValue: [MY_SCHEMA], multi: true }
]
```

**File Management**:
- `CoreFilepool` - Downloads/caches files with queue management
- `CoreCourseModulePrefetchDelegate` - Handles module prefetching for offline
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
- Each feature has `{name}.module.ts` (eager) and `{name}-lazy.module.ts` (lazy-loaded routes)
- Services in `services/`, components in `components/`, pages in `pages/`

### Handler Pattern
Handlers are singletons with `.instance` property:
```typescript
export class MyHandler extends CoreContentLinksHandler {
    name = 'AddonMyHandler';
    // ...implementation
    static readonly instance = new MyHandler();
}
```

### Shared Module Usage
Components import `CoreSharedModule` which re-exports:
- `CoreBaseModule` (CommonModule, FormsModule, IonicModule, TranslateModule)
- `CoreComponentsModule`, `CoreDirectivesModule`, `CorePipesModule`

### Database Schema Versioning
Define tables with columns, indexes in site schemas. Version increments trigger migrations.

### Environment Configuration
`moodle.config.json` (gitignored) extends `moodle.config.example.json`. Access via `CoreConfig` service. Test config overrides via `TestingBehatRuntime.init()`.

## Key Files

- `gulpfile.js` - Build tasks for lang, env, icons, behat
- `src/core/singletons/index.ts` - Singleton wrappers for Angular/Ionic/Cordova APIs
- `src/core/classes/delegate.ts` - Base delegate class
- `src/core/services/sites.ts` - Multi-site management
- `src/core/services/filepool.ts` - File download/cache system
- `src/testing/services/behat-runtime.ts` - E2E test runtime

## Common Pitfalls

1. **Don't** inject Angular services directly - use singletons via `@singletons`
2. **Don't** use `@NgModule({ declarations: [] })` for new modules - use standalone components
3. **Don't** forget to register handlers in `provideAppInitializer`
4. **Don't** import from barrel files that aren't configured in `tsconfig.json` paths
5. **Do** run `gulp` before testing to ensure lang files are built
6. **Do** use `CoreSitesReadingStrategy` when fetching data to control cache vs network behavior
