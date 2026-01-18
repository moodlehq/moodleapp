# External Integrations

**Analysis Date:** 2026-01-18

## APIs & External Services

**Moodle LMS (Primary Backend):**
- Primary data source for all educational content
- Connection via: Moodle Web Services REST API
- Client: `src/core/services/ws.ts` (`CoreWSProvider`)
- Auth: Token-based (`wstoken` parameter)
- Endpoint: `{siteUrl}/webservice/rest/server.php?moodlewsrestformat=json`
- Service: `moodle_mobile_app` (configured in `env.json`)

**Key Moodle Web Services Used:**
- `core_webservice_get_site_info` - Site information and user data
- `tool_mobile_get_public_config` - Public site configuration
- `tool_mobile_get_content` - Site plugin content
- `tool_mobile_get_plugins_supporting_mobile` - Mobile plugin discovery
- `mod_forum_get_forum_discussions` - Forum/news content
- `core_user_get_users_by_field` - User profiles

**Aspire Custom Web Services (`local_aspireparent` plugin):**
- Custom Moodle plugin for parent/guardian features
- Location: Server-side Moodle plugin (not in this repo)
- Endpoints used:
  - `local_aspireparent_get_parent_info` - Check if user is a parent
  - `local_aspireparent_get_mentees` - Get list of children/mentees
  - `local_aspireparent_get_mentee_token` - Get auth token for viewing as child
  - `local_aspireparent_get_mentee_courses` - Child's enrolled courses
  - `local_aspireparent_get_mentee_course_contents` - Course content for child
  - `local_aspireparent_get_mentee_grades_table` - Child's grades
  - `local_aspireparent_get_mentee_course_grades` - Course-specific grades
  - `local_aspireparent_get_all_course_grades` - All grades across courses
  - `local_aspireparent_get_mentee_news` - News/announcements for child
  - `local_aspireparent_get_site_forums` - Site-wide announcement forums
  - `local_aspireparent_get_mentee_activity_info` - Activity completion info
  - `local_aspireparent_send_message_to_teacher` - Parent-teacher messaging
  - `local_aspireparent_get_mentee_forums` - Child's forum access

**Odoo ERP (Financial API):**
- Financial/billing data for students
- Endpoint: `https://aspire-school.odoo.com`
- Client: `src/core/features/financial/services/financial-api.ts`
- Auth: Public API (no authentication required)
- Methods:
  - `GET /api/parent/financial/{parentSequence}` - Parent's financial overview
  - `GET /api/student/financial/{studentSequence}` - Student-specific financials
- Uses Native HTTP on mobile to bypass CORS

## Data Storage

**Local SQLite Database:**
- Provider: `cordova-sqlite-storage` 6.1.0
- WebAssembly fallback: `@sqlite.org/sqlite-wasm` 3.45.0
- Client: `src/core/services/db.ts`
- Schema management: `src/core/services/database/*.ts`
- Tables per site (site-specific databases)
- App-level tables: `core_config`

**Key Database Tables:**
- `core_config` - App settings (`src/core/services/database/config.ts`)
- Site-specific schemas registered via `CORE_SITE_SCHEMAS` injection token
- Push notification tables: `badge`, `pending_unregister`, `registered_devices`

**File Storage:**
- Provider: `cordova-plugin-file` 8.1.0
- Client: `src/core/services/file.ts`
- Filepool: `src/core/services/filepool.ts` (caches downloaded files)

**Caching:**
- Web service response caching in SQLite
- Configurable cache durations in `env.json`:
  - `cache_update_frequency_usually`: 7 minutes
  - `cache_update_frequency_often`: 20 minutes
  - `cache_update_frequency_sometimes`: 1 hour
  - `cache_update_frequency_rarely`: 12 hours

## Authentication & Identity

**Auth Provider:** Moodle token-based authentication

**Authentication Flow:**
1. User enters Moodle site URL
2. App fetches `tool_mobile_get_public_config`
3. User authenticates via:
   - Direct login (username/password)
   - SSO in browser (TypeOfLogin.BROWSER)
   - SSO in embedded browser (TypeOfLogin.EMBEDDED)
4. Token received and stored in site database
5. Token used for all subsequent WS calls

**Implementation:**
- Site management: `src/core/services/sites.ts`
- Login helper: `src/core/features/login/services/login-helper.ts`
- Site class: `src/core/classes/sites/site.ts`

**Parent Viewing (Token Switching):**
- Parents can view app as their children
- Service: `src/core/features/user/services/parent.ts`
- Original token stored, child token used for requests
- `setSelectedMentee()` / `clearSelectedMentee()` manage switching

## Push Notifications

**Provider:** Firebase Cloud Messaging (FCM)
- Plugin: `@moodlehq/phonegap-plugin-push` 4.0.0-moodle.10
- FCM Version: 23.+
- iOS Firebase Messaging: ~> 10.23.0

**Implementation:**
- Service: `src/core/features/pushnotifications/services/pushnotifications.ts`
- Delegate: `src/core/features/pushnotifications/services/push-delegate.ts`
- Registration stored in site database
- Badge management via `cordova-plugin-badge`

**Configuration:**
- `google-services.json` - Android FCM config (placeholder in repo)
- Package: `org.aspireschool.aspire`

## Live Updates

**Provider:** Ionic AppFlow
- Plugin: `cordova-plugin-ionic` 5.5.3
- App ID: `f9e94571`
- Channel: `Production`
- Update method: `background`
- API: `https://api.ionicjs.com`

## Monitoring & Observability

**Error Tracking:** None detected (no Sentry, Bugsnag, etc.)

**Analytics:**
- Built-in analytics service: `src/core/services/analytics.ts`
- Can be enabled via `CoreConstants.SETTINGS_ANALYTICS_ENABLED`
- Currently disabled (`enableanalytics: false` in env.json)

**Logs:**
- Console logging throughout codebase
- Logger singleton: `src/core/singletons/logger.ts`
- Verbose debug logging in custom services (parent, news, financial)

## CI/CD & Deployment

**Hosting:**
- Android: Google Play Store (`org.capriolegroup.aspire`)
- iOS: Apple App Store (`id633359593`)

**CI Pipeline:** Not detected in repository

**Build Artifacts:**
- `www/` - Web assets (built by Angular)
- `platforms/android/` - Android project
- `platforms/ios/` - iOS project

## Environment Configuration

**Required Environment Variables:**
- `NODE_ENV` - Build environment (production/testing/development)

**Runtime Configuration (`env.json`):**
- `app_id` - Application identifier
- `siteurl` - Default Moodle site
- `sites[]` - Pre-configured site list
- `wsservice` - Web service name
- `customurlscheme` - Deep link scheme (`moodlemobile`)

**Sensitive Configuration:**
- Firebase config in `google-services.json` (values redacted in repo)
- Moodle tokens stored in local SQLite (not in code)
- Odoo API is public (no secrets)

## Webhooks & Callbacks

**Incoming (Deep Links):**
- URL Scheme: `moodlemobile://`
- Plugin: `cordova-plugin-customurlscheme`
- Handler: `src/core/services/urlschemes.ts`

**Outgoing:** None detected

## Network Layer

**HTTP Clients:**
- Angular `HttpClient` - Browser/web requests
- `@moodlehq/cordova-plugin-advanced-http` - Native HTTP (mobile)
- Native HTTP used to bypass CORS on mobile devices

**Native HTTP Service:**
- Singleton: `NativeHttp` in `src/singletons/index.ts`
- Used by: Financial API, file downloads, WS calls on mobile

---

*Integration audit: 2026-01-18*
