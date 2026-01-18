# Codebase Structure

**Analysis Date:** 2026-01-18

## Directory Layout

```
moodleapp/
├── src/                        # Main application source
│   ├── app/                    # App bootstrap and routing
│   ├── addons/                 # Optional Moodle plugin implementations
│   ├── assets/                 # Static assets (images, lang files)
│   ├── core/                   # Core framework and features
│   ├── testing/                # Test utilities and mocks
│   ├── theme/                  # SCSS theming system
│   ├── types/                  # TypeScript type definitions
│   ├── index.html              # App entry HTML
│   └── main.ts                 # Angular bootstrap
├── local_aspireparent/         # Moodle plugin: Parent functionality (server-side)
├── local_parentmanager/        # Moodle plugin: Parent sync tasks (server-side)
├── local_privacypolicy/        # Moodle plugin: Privacy policy (server-side)
├── cordova-plugin-moodleapp/   # Custom Cordova plugin
├── platforms/                  # Cordova platform builds (ios, android)
├── hooks/                      # Cordova build hooks
├── .planning/                  # Project planning documents
└── www/                        # Build output directory
```

## Directory Purposes

**src/app/:**
- Purpose: Application root module and routing configuration
- Contains: AppModule, AppComponent, AppRoutingModule
- Key files: `app.module.ts`, `app-routing.module.ts`, `app.component.ts`

**src/core/:**
- Purpose: Framework core - services, components, utilities, and all features
- Contains: Services, classes, singletons, components, directives, pipes, features
- Key files: `core.module.ts`, `constants.ts`, `shared.module.ts`

**src/core/features/:**
- Purpose: Feature modules for major app functionality
- Contains: 38+ feature modules (login, mainmenu, grades, course, financial, etc.)
- Key files: Each feature has `*.module.ts`, `*-lazy.module.ts`, `services/`, `pages/`

**src/core/services/:**
- Purpose: Global singleton services for app-wide functionality
- Contains: Sites, WS, File, Filepool, Config, Cron, Navigator, Lang, etc.
- Key files: `sites.ts`, `ws.ts`, `filepool.ts`, `navigator.ts`, `app.ts`

**src/core/classes/:**
- Purpose: Shared base classes and abstractions
- Contains: Site classes, SQLiteDB, delegates, error classes, database tables
- Key files: `sites/site.ts`, `sqlitedb.ts`, `delegate.ts`, `errors/`

**src/core/singletons/:**
- Purpose: Stateless utility singletons
- Contains: Events, Logger, URL, Text, DOM, Colors, Time utilities
- Key files: `events.ts`, `logger.ts`, `url.ts`, `text.ts`, `dom.ts`

**src/core/components/:**
- Purpose: Reusable UI components
- Contains: 44+ components (loading, file, tabs, user-avatar, split-view, etc.)
- Key files: `components.module.ts`, each component in own directory

**src/addons/:**
- Purpose: Moodle plugin implementations (optional features)
- Contains: Activity modules, blocks, filters, question types/behaviors
- Key files: `addons.module.ts`, `mod/`, `block/`, `qtype/`, `qbehaviour/`

**src/addons/mod/:**
- Purpose: Activity module handlers (assign, quiz, forum, etc.)
- Contains: 24+ activity module implementations
- Key files: Each module has `*.module.ts`, `services/`, `components/`, `pages/`

**src/theme/:**
- Purpose: Global SCSS theming and design system
- Contains: Variables, base styles, light/dark themes, Aspire customizations
- Key files: `theme.scss`, `theme.custom.scss`, `theme.light.scss`, `theme.dark.scss`

**local_aspireparent/:**
- Purpose: Moodle server plugin for parent/mentee functionality
- Contains: PHP external API functions for parent data access
- Key files: `lib.php`, `classes/external/*.php`, `db/services.php`

## Key File Locations

**Entry Points:**
- `src/main.ts`: Angular bootstrap
- `src/app/app.module.ts`: Root NgModule
- `src/app/app-routing.module.ts`: Dynamic route configuration
- `src/index.html`: App HTML shell

**Configuration:**
- `src/core/constants.ts`: App-wide constants and environment config
- `src/core/features/aspire-config.ts`: Aspire-specific feature configuration
- `src/assets/env.json`: Environment-specific settings
- `angular.json`: Angular build configuration
- `package.json`: Dependencies and scripts

**Core Services:**
- `src/core/services/sites.ts`: Site/session management
- `src/core/services/ws.ts`: Web service HTTP client
- `src/core/services/navigator.ts`: Navigation service
- `src/core/services/filepool.ts`: File download/cache management

**Core Classes:**
- `src/core/classes/sites/site.ts`: Site object implementation
- `src/core/classes/sqlitedb.ts`: SQLite database wrapper
- `src/core/classes/delegate.ts`: Delegate base class
- `src/core/singletons/events.ts`: Event emitter system

**Aspire Custom Features:**
- `src/core/features/financial/`: Financial/fees display
- `src/core/features/contactus/`: Contact form
- `src/core/features/news/`: School news
- `src/core/features/user/services/parent.ts`: Parent/mentee service

**Testing:**
- `src/testing/testing.module.ts`: Test module
- `src/core/*/tests/`: Feature-specific tests
- `jest.config.js`: Jest configuration

## Naming Conventions

**Files:**
- Feature modules: `feature-name.module.ts`, `feature-name-lazy.module.ts`
- Services: `service-name.ts` (e.g., `sites.ts`, `course.ts`)
- Components: `component-name.ts` in `component-name/` directory
- Pages: `page-name.ts`, `page-name.html`, `page-name.scss`
- Handlers: `handlers/handler-type.ts` (e.g., `handlers/mainmenu.ts`)
- Tests: `*.test.ts` pattern

**Directories:**
- Features: lowercase, hyphenated (e.g., `mainmenu`, `siteplugins`)
- Components: lowercase, hyphenated in own directory
- Services: flat `services/` directory per feature

**Classes/Types:**
- Prefix `Core` for core classes: `CoreSite`, `CoreWSProvider`, `CoreEvents`
- Prefix `Addon` for addon classes: `AddonModAssign`, `AddonBlockTimeline`
- Suffix `Provider` or `Service` for services: `CoreSitesProvider`, `CoreFinancialService`
- Suffix `Handler` for delegate handlers: `CoreMainMenuHomeHandler`

## Where to Add New Code

**New Feature:**
- Primary code: `src/core/features/feature-name/`
- Structure: Create `feature-name.module.ts`, `feature-name-lazy.module.ts`
- Add services in `services/` subdirectory
- Add pages in `pages/` subdirectory
- Register in `src/core/features/features.module.ts`

**New Main Menu Tab:**
- Handler: `src/core/features/feature-name/services/handlers/mainmenu.ts`
- Register handler in feature module's `APP_INITIALIZER` provider
- Implement `CoreMainMenuHandler` interface

**New Activity Module:**
- Location: `src/addons/mod/module-name/`
- Required: module handler, prefetch handler (optional), index component
- Register in `src/addons/mod/mod.module.ts`

**New Core Component:**
- Location: `src/core/components/component-name/`
- Files: `component-name.ts`, `component-name.html`, `component-name.scss`
- Export in `src/core/components/components.module.ts`

**New Service:**
- Core service: `src/core/services/service-name.ts`
- Feature service: `src/core/features/feature-name/services/service-name.ts`
- Use `@Injectable({ providedIn: 'root' })` for singletons

**New Moodle Web Service (Server):**
- Location: `local_aspireparent/classes/external/function_name.php`
- Register in `local_aspireparent/db/services.php`
- Bump version in `local_aspireparent/version.php`

**Utilities:**
- Shared helpers: `src/core/singletons/` (stateless utilities)
- Async utilities: `src/core/utils/` (async-instance, lazy-map, rxjs helpers)

## Special Directories

**platforms/:**
- Purpose: Cordova platform builds
- Generated: Yes (by `cordova prepare`)
- Committed: Partially (ios project files committed)

**www/:**
- Purpose: Angular build output for Cordova
- Generated: Yes (by `ionic build`)
- Committed: No

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**.planning/codebase/:**
- Purpose: Architecture and planning documentation
- Generated: No (manually maintained)
- Committed: Yes

**cordova-plugin-moodleapp/:**
- Purpose: Custom Cordova plugin with native code
- Generated: No
- Committed: Yes
- Contains: iOS/Android native code, TypeScript wrappers

---

*Structure analysis: 2026-01-18*
