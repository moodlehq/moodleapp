# Architecture

**Analysis Date:** 2026-01-18

## Pattern Overview

**Overall:** Modular Feature-based Architecture with Ionic/Angular and Cordova hybrid mobile

**Key Characteristics:**
- Angular 17 with standalone components and lazy-loaded modules
- Ionic 8 for cross-platform mobile UI components
- Cordova plugins for native device capabilities (camera, file system, push notifications)
- Delegate pattern for extensible feature handlers
- Singleton services with Angular dependency injection
- RxJS observables for async data flow and event handling
- SQLite for local database storage per site
- WebService (WS) communication with Moodle backend

## Layers

**Presentation Layer:**
- Purpose: UI components, pages, templates, and styling
- Location: `src/core/components/`, `src/core/features/*/pages/`, `src/core/features/*/components/`
- Contains: Angular components, Ionic UI elements, SCSS styles
- Depends on: Services layer, Core singletons
- Used by: Angular router, user interactions

**Services Layer:**
- Purpose: Business logic, API communication, data management
- Location: `src/core/services/`, `src/core/features/*/services/`
- Contains: Injectable Angular services, WS call handlers, data providers
- Depends on: Core classes, Singletons, SQLite database
- Used by: Presentation layer, other services

**Core Classes Layer:**
- Purpose: Shared base classes, utilities, and abstractions
- Location: `src/core/classes/`
- Contains: Site class, database tables, error classes, delegates, SQLiteDB wrapper
- Depends on: Singletons, Cordova plugins
- Used by: Services, Features

**Singletons Layer:**
- Purpose: Stateless utility functions and global event system
- Location: `src/core/singletons/`
- Contains: CoreEvents, URL utilities, DOM helpers, Logger, Text utilities
- Depends on: Nothing (lowest level)
- Used by: All layers

**Addons Layer:**
- Purpose: Optional Moodle plugin implementations (blocks, activities, question types)
- Location: `src/addons/`
- Contains: Activity modules (quiz, assign, forum), block handlers, question types
- Depends on: Core features and services
- Used by: Dynamically loaded by delegates

**Backend Plugins Layer (Moodle Server):**
- Purpose: Custom web services for Aspire-specific functionality
- Location: `local_aspireparent/`, `local_parentmanager/`
- Contains: PHP external functions for parent/mentee data, financial info, grades
- Depends on: Moodle core APIs
- Used by: Mobile app via WS calls

## Data Flow

**Authentication Flow:**

1. User enters site URL and credentials at `src/core/features/login/pages/`
2. `CoreSitesProvider` (`src/core/services/sites.ts`) validates site and obtains token
3. `CoreSite` object created (`src/core/classes/sites/site.ts`) with auth token
4. Site stored in app database, current site set
5. Main menu loaded via `CoreMainMenuModule` (`src/core/features/mainmenu/`)

**API Request Flow:**

1. Feature service calls `site.read()` or `CoreWS.call()`
2. `CoreWSProvider` (`src/core/services/ws.ts`) prepares HTTP request with token
3. Request goes through `CoreInterceptor` (`src/core/classes/interceptor.ts`)
4. Response cached in site's SQLite database if caching enabled
5. Data returned to component via Observable or Promise

**Parent/Mentee Flow (Aspire Custom):**

1. `CoreUserParentService` (`src/core/features/user/services/parent.ts`) checks parent role
2. Calls `local_aspireparent_get_parent_info` WS to get mentees
3. Token switching mechanism allows parent to view as child
4. Child-specific data fetched via `local_aspireparent_get_mentee_*` web services

**State Management:**
- Site-specific SQLite database for persistent data
- In-memory caching via services and class properties
- `CoreEvents` for cross-component communication
- RxJS BehaviorSubjects for reactive state in some services

## Key Abstractions

**CoreSite:**
- Purpose: Represents authenticated connection to a Moodle site
- Examples: `src/core/classes/sites/site.ts`, `src/core/classes/sites/authenticated-site.ts`
- Pattern: Encapsulates site URL, user token, info, and provides WS call methods

**Delegates:**
- Purpose: Plugin system allowing features to register handlers
- Examples: `src/core/features/mainmenu/services/mainmenu-delegate.ts`, `src/core/features/course/services/module-delegate.ts`
- Pattern: Sorted delegate pattern - handlers register with priority, delegate iterates to find matches

**Feature Modules:**
- Purpose: Self-contained feature implementations with routing, services, components
- Examples: `src/core/features/grades/`, `src/core/features/financial/`, `src/core/features/contactus/`
- Pattern: NgModule with lazy-loaded pages, feature-specific services, main menu handler registration

**Activity Modules (Addons):**
- Purpose: Moodle activity plugin implementations
- Examples: `src/addons/mod/assign/`, `src/addons/mod/quiz/`, `src/addons/mod/forum/`
- Pattern: Module delegate handler, prefetch handler, component for display

## Entry Points

**Application Bootstrap:**
- Location: `src/main.ts`
- Triggers: App startup
- Responsibilities: Bootstrap Angular platform, load AppModule

**App Module:**
- Location: `src/app/app.module.ts`
- Triggers: Angular initialization
- Responsibilities: Import CoreModule, AddonsModule, set up routing, initialize services

**App Routing:**
- Location: `src/app/app-routing.module.ts`
- Triggers: URL changes
- Responsibilities: Dynamic route building from feature modules using APP_ROUTES token

**Main Menu:**
- Location: `src/core/features/mainmenu/mainmenu.module.ts`
- Triggers: After login, route to `/main`
- Responsibilities: Display tab-based navigation, load feature handlers via delegate

## Error Handling

**Strategy:** Layered error classes with user-friendly messages and debug info

**Patterns:**
- `CoreError` base class (`src/core/classes/errors/error.ts`)
- `CoreWSError` for web service errors (`src/core/classes/errors/wserror.ts`)
- `CoreNetworkError` for connectivity issues (`src/core/classes/errors/network-error.ts`)
- `CoreLoginError` for authentication failures (`src/core/classes/errors/loginerror.ts`)
- `CoreErrorHelper` service for error display (`src/core/services/error-helper.ts`)
- Toast and alert modals via `CoreDomUtils` (`src/core/services/utils/dom.ts`)

## Cross-Cutting Concerns

**Logging:** `CoreLogger` singleton (`src/core/singletons/logger.ts`) - per-class logger instances with console output

**Validation:** Form validation via Angular reactive forms, input components in `src/core/components/input-errors/`

**Authentication:** Token-based auth stored per site, `CoreSitesProvider` manages sessions, `authGuard` protects routes

**Offline Support:** `CoreFilepool` for file caching, `CoreNetwork` for connectivity detection, sync handlers via `CoreCronDelegate`

**Internationalization:** `@ngx-translate/core` with JSON lang files in `src/assets/lang/` and feature-specific `lang.json`

**Theming:** SCSS theming system in `src/theme/`, supports light/dark modes, Aspire customizations in `theme.custom.scss`

---

*Architecture analysis: 2026-01-18*
