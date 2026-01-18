# Technology Stack

**Analysis Date:** 2026-01-18

## Languages

**Primary:**
- TypeScript 5.3.3 - All application code in `src/`
- SCSS - Styling in `src/theme/` and component-level `.scss` files

**Secondary:**
- Java/Kotlin - Android native code via Cordova plugins in `platforms/android/`
- Swift/Objective-C - iOS native code via Cordova plugins in `platforms/ios/`
- JavaScript - Gulp build tasks in `gulp/`, webpack config

## Runtime

**Environment:**
- Node.js 18.18.2 (strictly `>=18.18.2 <19` per `package.json`)
- `.nvmrc` specifies v18.18.2

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- Cordova plugin dependencies managed separately in `cordova-plugin-moodleapp/`

## Frameworks

**Core:**
- Angular 17.3.12 - Main application framework
- Ionic 8.3.1 (`@ionic/angular`) - UI components and mobile framework
- Cordova 12.0.0 - Native mobile wrapper
- RxJS 7.8.1 - Reactive programming

**Platforms:**
- cordova-android ^13.0.0 - Android platform
- cordova-ios ^7.1.1 - iOS platform
- cordova-plugin-ionic 5.5.3 - Live updates via Ionic AppFlow

**Testing:**
- Jest 29.7.0 - Unit testing framework
- jest-preset-angular 13.1.6 - Angular testing integration
- Faker 5.5.3 - Test data generation

**Build/Dev:**
- Angular CLI 17.3.10 - Build orchestration
- Ionic CLI 7.2.0 - Mobile development CLI
- Gulp 5.0.0 - Build tasks (lang files, env, icons)
- Webpack (via `@angular-builders/custom-webpack`) - Custom bundling
- TerserPlugin - JS minification in `webpack.config.js`

## Key Dependencies

**Critical:**
- `@ngx-translate/core` 15.0.0 - Internationalization (multi-language support)
- `@awesome-cordova-plugins/*` 6.9.0 - Native plugin wrappers (camera, file, push, etc.)
- `@moodlehq/phonegap-plugin-push` 4.0.0-moodle.10 - Push notifications via FCM
- `cordova-sqlite-storage` 6.1.0 - Local SQLite database
- `@sqlite.org/sqlite-wasm` 3.45.0-build1 - WebAssembly SQLite for browser

**Infrastructure:**
- `moment` 2.30.1 / `moment-timezone` 0.5.45 - Date/time handling
- `ts-md5` 1.3.1 - MD5 hashing for caching keys
- `jszip` 3.10.1 - ZIP file handling for offline content
- `swiper` 11.1.14 - Touch slider/carousel

**Media:**
- `video.js` 7.21.6 - Video playback
- `ogv` 1.9.0 - Ogg/WebM codec support
- `chart.js` 2.9.4 - Charts and graphs
- `mathjax` 2.7.9 - Mathematical notation rendering

**Cordova Plugins (critical subset):**
- `@moodlehq/cordova-plugin-advanced-http` - Native HTTP requests (bypasses CORS)
- `@moodlehq/cordova-plugin-inappbrowser` - In-app browser for SSO
- `cordova-plugin-file` 8.1.0 - File system access
- `cordova-plugin-device` 2.1.0 - Device information

## Configuration

**Environment:**
- Config loaded from `src/assets/env.json` at runtime
- Built by `gulp env` task from `gulp/task-build-env.js`
- Key configs in `src/types/config.d.ts` (`EnvironmentConfig` interface)

**Build Configurations:**
```
angular.json configurations:
├── production  - Optimized build, replaces emulator/testing modules
├── development - Source maps, no optimization, vendor chunks
├── testing     - Style optimization only
└── ci          - No progress output
```

**Key Environment Variables:**
- `NODE_ENV` - `production`, `testing`, or development
- `MOODLE_APP_BROWSER` - Browser for `ionic serve`
- `MOODLE_APP_COVERAGE` - Enable Istanbul coverage
- `MOODLE_APP_CIRCULAR_DEPENDENCIES` - Detect circular deps

**App Configuration (env.json):**
- `app_id`: `org.capriolegroup.aspire` (Android package / iOS bundle)
- `appname`: `Aspire School`
- `siteurl`: Default Moodle site URL
- `sites[]`: Pre-configured site list for quick login
- `wsservice`: `moodle_mobile_app` (Moodle web service)

## Build System

**Build Commands:**
```bash
npm run build        # Development build (ionic build)
npm run build:prod   # Production build
npm run build:test   # Testing build
npm run dev:android  # Run on Android device with livereload
npm run dev:ios      # Run on iOS device
npm run prod:android # Production Android build
npm run prod:ios     # Production iOS build
```

**Gulp Tasks:**
- `gulp` - Default: builds lang, env, icons
- `gulp lang` - Compile language files to `src/assets/lang/`
- `gulp env` - Generate `src/assets/env.json`
- `gulp icons` - Build icon metadata

## Platform Requirements

**Development:**
- Node.js 18.18.2
- npm 9+
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)
- Java 17+ (for Android)

**Production:**
- Android: minSdkVersion defined in Cordova config
- iOS: Deployment target defined in Xcode project
- Moodle LMS 4.0+ on server side (for full feature support)

## TypeScript Configuration

**Key Settings (`tsconfig.json`):**
- `target`: ES2022
- `module`: ESNext
- `strictNullChecks`: true
- `strictPropertyInitialization`: true

**Path Aliases:**
```typescript
@addons/*     → ./src/addons/*
@classes/*    → ./src/core/classes/*
@components/* → ./src/core/components/*
@features/*   → ./src/core/features/*
@services/*   → ./src/core/services/*
@singletons   → ./src/core/singletons/index
```

---

*Stack analysis: 2026-01-18*
