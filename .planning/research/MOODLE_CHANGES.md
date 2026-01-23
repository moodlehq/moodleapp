# Moodle App v4.5.x to v5.1.0 Migration Reference

**Researched:** 2026-01-23
**Source:** Git diff analysis between v4.5.0 and v5.1.0 tags
**Confidence:** HIGH (based on actual git history from upstream moodlehq/moodleapp)

## Executive Summary

The v5.0/v5.1 release introduces significant architectural changes:
1. **Service Reorganization**: CoreDomUtils split into multiple overlay services
2. **Constants Modularization**: CoreConstants values moved to domain-specific files
3. **New Singletons**: CoreDom, CoreAngular, CoreBootstrap extracted from CoreDomUtils
4. **API Signature Changes**: CoreUrl.addParamsToUrl now uses options object
5. **Network Service**: Simplified with signals, new connection type enum

---

## 1. Service Reorganization (MOBILE-4724)

### CoreDomUtils Split

CoreDomUtils (`@services/utils/dom`) has been split into multiple services. The class still exists but is **deprecated since 5.0** - all methods delegate to new services.

#### New Overlay Services Location

```
src/core/services/overlays/
  alerts.ts      -> CoreAlerts
  loadings.ts    -> CoreLoadings
  modals.ts      -> CoreModals
  popovers.ts    -> CorePopovers
  prompts.ts     -> CorePrompts
  toasts.ts      -> CoreToasts
```

### Import Mappings

| Old Import | New Import |
|------------|------------|
| `import { CoreDomUtils } from '@services/utils/dom'` | Keep for compatibility, but prefer new services |
| `import { CoreLoadings } from '@services/loadings'` | `import { CoreLoadings } from '@services/overlays/loadings'` |
| `import { CoreToasts } from '@services/toasts'` | `import { CoreToasts } from '@services/overlays/toasts'` |
| `import { CoreModals } from '@services/modals'` | `import { CoreModals } from '@services/overlays/modals'` |
| `import { CorePopovers } from '@services/popovers'` | `import { CorePopovers } from '@services/overlays/popovers'` |

### New Services: CoreAlerts and CorePrompts

```typescript
// NEW in v5.0
import { CoreAlerts } from '@services/overlays/alerts';
import { CorePrompts } from '@services/overlays/prompts';

// CoreAlerts methods (extracted from CoreDomUtils):
CoreAlerts.show(options)              // Show alert
CoreAlerts.confirm(message, options)  // Show confirm dialog
CoreAlerts.confirmDelete(message)     // Delete confirmation
CoreAlerts.confirmLeaveWithChanges()  // Leave page confirmation
CoreAlerts.confirmDownloadSize(size)  // Download size confirmation
CoreAlerts.showError(error)           // Show error alert
CoreAlerts.getErrorMessage(error)     // Get error message string

// CorePrompts methods:
CorePrompts.show(message, type, options)  // Show prompt dialog
CorePrompts.promptPassword(params)        // Password prompt modal
```

### Method Migration: CoreDomUtils to New Services

| Old Method | New Method |
|------------|------------|
| `CoreDomUtils.showLoading()` | `CoreLoadings.show()` |
| `CoreDomUtils.showConfirm()` | `CoreAlerts.confirm()` |
| `CoreDomUtils.showAlert()` | `CoreAlerts.show()` |
| `CoreDomUtils.showErrorModal()` | `CoreAlerts.showError()` |
| `CoreDomUtils.showErrorModalDefault()` | `CoreAlerts.showError()` |
| `CoreDomUtils.showPrompt()` | `CorePrompts.show()` |
| `CoreDomUtils.showToast()` | `CoreToasts.show()` |
| `CoreDomUtils.openModal()` | `CoreModals.openModal()` |
| `CoreDomUtils.openPopover()` | `CorePopovers.open()` |
| `CoreDomUtils.confirmDownloadSize()` | `CoreAlerts.confirmDownloadSize()` |
| `CoreDomUtils.getErrorMessage()` | `CoreAlerts.getErrorMessage()` |
| `CoreDomUtils.showOperationModals()` | `CoreLoadings.showOperationModals()` |

### DOM Utility Methods Moved to CoreDom Singleton

```typescript
import { CoreDom } from '@singletons/dom';

// Methods moved from CoreDomUtils:
CoreDom.extractUrlsFromCSS(code)
CoreDom.fixHtml(html)
CoreDom.focusElement(element)
CoreDom.formatSizeUnits(size)  // was formatPixelsSize
CoreDom.getContentsOfElement(element, selector)
CoreDom.getHTMLElementAttribute(html, attribute)
CoreDom.getComputedStyleMeasure(style, measure)
```

### Angular Utilities Moved to CoreAngular Singleton

```typescript
import { CoreAngular } from '@singletons/angular';

// Methods moved from CoreDomUtils:
CoreAngular.createChangesFromKeyValueDiff(changes)
```

---

## 2. Constants Modularization (MOBILE-4974)

### CoreConstants Deprecations

All CoreConstants static properties are now **deprecated since 5.2**. They still work but delegate to new locations.

### Time Constants

```typescript
// OLD (deprecated)
import { CoreConstants } from '@/core/constants';
CoreConstants.SECONDS_DAY
CoreConstants.MILLISECONDS_HOUR

// NEW
import { CoreTimeConstants } from '@/core/constants';
CoreTimeConstants.SECONDS_DAY
CoreTimeConstants.MILLISECONDS_HOUR
```

| Old | New |
|-----|-----|
| `CoreConstants.SECONDS_YEAR` | `CoreTimeConstants.SECONDS_YEAR` |
| `CoreConstants.SECONDS_MONTH` | `CoreTimeConstants.SECONDS_MONTH` |
| `CoreConstants.SECONDS_WEEK` | `CoreTimeConstants.SECONDS_WEEK` |
| `CoreConstants.SECONDS_DAY` | `CoreTimeConstants.SECONDS_DAY` |
| `CoreConstants.SECONDS_HOUR` | `CoreTimeConstants.SECONDS_HOUR` |
| `CoreConstants.SECONDS_MINUTE` | `CoreTimeConstants.SECONDS_MINUTE` |
| `CoreConstants.MILLISECONDS_*` | `CoreTimeConstants.MILLISECONDS_*` |

### Bytes Constants

```typescript
// NEW
import { CoreBytesConstants } from '@/core/constants';
CoreBytesConstants.KILOBYTE
CoreBytesConstants.MEGABYTE
CoreBytesConstants.GIGABYTE
```

### Settings/Config Constants

```typescript
// OLD (deprecated)
CoreConstants.SETTINGS_NOTIFICATION_SOUND
CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI

// NEW
import { CoreConfigSettingKey } from '@/core/constants';
CoreConfigSettingKey.NOTIFICATION_SOUND
CoreConfigSettingKey.SYNC_ONLY_ON_WIFI
CoreConfigSettingKey.DEBUG_DISPLAY
CoreConfigSettingKey.SEND_ON_ENTER
CoreConfigSettingKey.ZOOM_LEVEL
CoreConfigSettingKey.COLOR_SCHEME
CoreConfigSettingKey.ANALYTICS_ENABLED
CoreConfigSettingKey.DONT_SHOW_EXTERNAL_LINK_WARN
CoreConfigSettingKey.PINCH_TO_ZOOM
CoreConfigSettingKey.EXACT_ALARMS_WARNING_DISPLAYED
CoreConfigSettingKey.DONT_SHOW_EXACT_ALARMS_WARNING
CoreConfigSettingKey.DONT_SHOW_NOTIFICATIONS_PERMISSION_WARNING
```

### Icon Constants

```typescript
// OLD (deprecated)
CoreConstants.ICON_LOADING
CoreConstants.ICON_REFRESH
CoreConstants.ICON_SYNC
CoreConstants.ICON_DOWNLOADED
CoreConstants.ICON_DOWNLOADING

// NEW - General icons
import { LOADING_ICON, CoreRefreshIcon, CoreSyncIcon } from '@/core/constants';
LOADING_ICON
CoreRefreshIcon.LOADING
CoreRefreshIcon.REFRESH
CoreSyncIcon.LOADING
CoreSyncIcon.SYNC

// NEW - Course download icons
import { CoreCourseDownloadStatusIcon } from '@features/course/constants';
CoreCourseDownloadStatusIcon.DOWNLOADED
CoreCourseDownloadStatusIcon.DOWNLOADING
CoreCourseDownloadStatusIcon.NOT_DOWNLOADED
CoreCourseDownloadStatusIcon.OUTDATED
CoreCourseDownloadStatusIcon.NOT_DOWNLOADABLE
```

### Login Constants

```typescript
// OLD (deprecated)
CoreConstants.LOGIN_LAUNCH_DATA
CoreConstants.NO_SITE_ID

// NEW
import { LOGIN_SSO_LAUNCH_DATA, NO_SITE_ID } from '@features/login/constants';
```

### User Constants

```typescript
// OLD (deprecated)
CoreConstants.CALENDAR_DEFAULT_STARTING_WEEKDAY

// NEW - User constants moved to user feature
import {
    CORE_USER_PROFILE_REFRESHED,
    CORE_USER_PROFILE_PICTURE_UPDATED,
    CORE_USER_PROFILE_SERVER_TIMEZONE,
    CORE_USER_NOREPLY_USER,
    CORE_USER_PARTICIPANTS_LIST_LIMIT,
    CORE_USER_CALENDAR_DEFAULT_STARTING_WEEKDAY,
    CORE_USER_TF_24,
    CORE_USER_TF_12,
} from '@features/user/constants';
```

**Critical for your fork**: The `USER_PROFILE_REFRESHED` constant:

```typescript
// OLD (v4.5.x) - exported from user.ts service
import { USER_PROFILE_REFRESHED } from '@features/user/services/user';

// NEW (v5.1.0) - exported from constants file
import { CORE_USER_PROFILE_REFRESHED } from '@features/user/constants';
```

### Reminders Constants (NEW)

```typescript
// NEW file: @features/reminders/constants
import {
    CoreRemindersUnits,
    REMINDERS_UNITS_LABELS,
    REMINDERS_DEFAULT_REMINDER_TIMEBEFORE,
    REMINDERS_DISABLED,
    REMINDERS_DEFAULT_NOTIFICATION_TIME_SETTING,
    REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED,
} from '@features/reminders/constants';
```

---

## 3. CoreUrl API Changes (MOBILE-4741)

### addParamsToUrl Signature Change

```typescript
// OLD (v4.5.x)
CoreUrl.addParamsToUrl(url: string, params?: Record<string, unknown>, anchor?: string, boolToNumber?: boolean): string

// NEW (v5.1.0)
CoreUrl.addParamsToUrl(url: string, params?: Record<string, unknown>, options?: CoreUrlAddParamsOptions): string

interface CoreUrlAddParamsOptions {
    anchor?: string;
    boolToNumber?: boolean;
    checkAutoLoginUrl?: boolean;  // NEW option
}
```

**Migration Example:**

```typescript
// OLD
const url = CoreUrl.addParamsToUrl(baseUrl, params, '#section', true);

// NEW
const url = CoreUrl.addParamsToUrl(baseUrl, params, { anchor: 'section', boolToNumber: true });
```

### New CoreUrl Methods

```typescript
// NEW method for maps URLs
CoreUrl.buildMapsURL(options?: CoreUrlMapsUrlOptions): string

interface CoreUrlMapsUrlOptions {
    coordinates?: { latitude?: number; longitude?: number };
    query?: string;
}

// buildAddressURL is now deprecated, use buildMapsURL instead
// OLD
CoreUrl.buildAddressURL(address)  // returns SafeUrl

// NEW
CoreUrl.buildMapsURL({ query: address })  // returns string
// Use DomSanitizer.bypassSecurityTrustUrl() if SafeUrl needed

// NEW method to detect YouTube URLs
CoreUrl.isYoutubeURL(url: string): boolean
```

---

## 4. Network Service Changes (MOBILE-4842)

### Connection Type Enum Change

```typescript
// OLD
import { CoreNetworkConnection } from '@services/network';
CoreNetworkConnection.WIFI
CoreNetworkConnection.CELL_4G
CoreNetworkConnection.NONE

// NEW - Simplified enum
import { CoreNetworkConnectionType } from '@services/network';
CoreNetworkConnectionType.UNKNOWN
CoreNetworkConnectionType.WIFI      // Non-metered
CoreNetworkConnectionType.CELL      // Metered (combines all cellular types)
CoreNetworkConnectionType.OFFLINE
```

### New Signal-Based API

```typescript
// NEW - Signal-based reactive API
CoreNetwork.onlineSignal           // Signal<boolean>
CoreNetwork.connectionTypeSignal   // Signal<CoreNetworkConnectionType>
CoreNetwork.isCellularSignal       // Signal<boolean>
CoreNetwork.isWifiSignal           // Signal<boolean>

// NEW methods
CoreNetwork.isCellular(): boolean

// DEPRECATED
CoreNetwork.isNetworkAccessLimited()  // Use isCellular() instead
```

---

## 5. Removed Deprecations (4.4 Deprecations Removed)

These methods/properties were deprecated in 4.4 and have been **completely removed** in 5.0:

### CoreUtils Removals

```typescript
// REMOVED - no longer exists
CoreUtils.copyProperties()
CoreUtils.emptyArray()
CoreUtils.emptyObject()
CoreUtils.filterByRegexp()      // Use CoreArray.filterByRegexp()
CoreUtils.indexOfRegexp()       // Use CoreArray.indexOfRegexp()
CoreUtils.uniqueArray()         // Use CoreArray.unique()
```

### CoreLoginHelper Removals

```typescript
// REMOVED - no longer exists
CoreLoginHelper.acceptSitePolicy()        // Use CorePolicy.acceptMandatorySitePolicies()
CoreLoginHelper.getDisabledFeatures()     // Use site.isFeatureDisabled()
CoreLoginHelper.getLogoUrl()              // Use site.getLogoUrl()
CoreLoginHelper.getSitePolicy()           // Use CorePolicy.getSitePoliciesURL()
CoreLoginHelper.getValidIdentityProviders()  // Use getValidIdentityProvidersForSite()
CoreLoginHelper.isEmailSignupDisabled()   // Use site.isFeatureDisabled()
CoreLoginHelper.isFeatureDisabled()       // Use site.isFeatureDisabled()
CoreLoginHelper.isForgottenPasswordDisabled()  // Use site.isFeatureDisabled()
CoreLoginHelper.sitePolicyNotAgreed()     // Use CorePolicy.goToAcceptSitePolicies()
```

### CoreUserProvider Removals

```typescript
// DEPRECATED (still works but will be removed)
CoreUserProvider.PARTICIPANTS_LIST_LIMIT  // Use CORE_USER_PARTICIPANTS_LIST_LIMIT
```

### CoreConstants Removals

```typescript
// REMOVED
CoreConstants.IOS_FREE_SPACE_THRESHOLD  // No longer needed
```

---

## 6. Other Notable Changes

### New Bootstrap Singleton

```typescript
import { CoreBootstrap } from '@singletons/bootstrap';

// Handles Bootstrap 4 and 5 JS elements in formatted text
CoreBootstrap.handleJS(rootElement, formatTextOptions)
```

### CoreUserOffline Removed from Service

```typescript
// v4.5.x
import { CoreUserOffline } from '@features/user/services/user-offline';

// v5.1.0 - still exists but CoreUser no longer uses it directly
// Most offline operations now handled internally
```

### CoreCountries Usage

```typescript
// NEW - CoreCountries now used in CoreUser
import { CoreCountries } from '@singletons/countries';
```

### CorePromiseUtils

```typescript
// NEW singleton for promise utilities
import { CorePromiseUtils } from '@singletons/promise-utils';
```

### CoreTextFormat

```typescript
// NEW - Text formatting utilities extracted
import { CoreTextFormat } from '@singletons/text';
```

---

## 7. Quick Reference: Common Migration Patterns

### Pattern 1: Loading Modal

```typescript
// OLD
const modal = await CoreDomUtils.showLoading('Loading...');
// ... do work
modal.dismiss();

// NEW (same API, different import path)
import { CoreLoadings } from '@services/overlays/loadings';
const modal = await CoreLoadings.show('Loading...');
modal.dismiss();
```

### Pattern 2: Error Display

```typescript
// OLD
CoreDomUtils.showErrorModalDefault(error);

// NEW
import { CoreAlerts } from '@services/overlays/alerts';
CoreAlerts.showError(error);
```

### Pattern 3: Confirm Dialog

```typescript
// OLD
await CoreDomUtils.showConfirm('Are you sure?', 'Confirm');

// NEW
import { CoreAlerts } from '@services/overlays/alerts';
await CoreAlerts.confirm('Are you sure?', { header: 'Confirm' });
```

### Pattern 4: User Profile Events

```typescript
// OLD
import { USER_PROFILE_REFRESHED } from '@features/user/services/user';
CoreEvents.trigger(USER_PROFILE_REFRESHED, data);

// NEW
import { CORE_USER_PROFILE_REFRESHED } from '@features/user/constants';
CoreEvents.trigger(CORE_USER_PROFILE_REFRESHED, data);
```

### Pattern 5: Time Constants

```typescript
// OLD
if (timeDiff > CoreConstants.SECONDS_DAY) { ... }

// NEW
import { CoreTimeConstants } from '@/core/constants';
if (timeDiff > CoreTimeConstants.SECONDS_DAY) { ... }
```

### Pattern 6: Download Thresholds

```typescript
// OLD
CoreConstants.WIFI_DOWNLOAD_THRESHOLD
CoreConstants.DOWNLOAD_THRESHOLD

// NEW - Use CoreFileProvider constants
import { CoreFile } from '@services/file';
CoreFile.WIFI_DOWNLOAD_DEFAULT_CONFIRMATION_THRESHOLD
CoreFile.DOWNLOAD_DEFAULT_CONFIRMATION_THRESHOLD
```

### Pattern 7: Network Check

```typescript
// OLD
if (CoreNetwork.isNetworkAccessLimited()) { ... }

// NEW
if (CoreNetwork.isCellular()) { ... }
```

---

## 8. Files to Check in Custom Fork

Based on your fork's modifications, check these files for compatibility:

1. **`src/core/singletons/url.ts`** - You have local modifications; check `addParamsToUrl` usage
2. **Any file using `CoreLoadings`** - Import path changed from `@services/loadings` to `@services/overlays/loadings`
3. **Any file using `USER_PROFILE_REFRESHED`** - Now exported from `@features/user/constants`
4. **Any file using `CoreConstants.*`** - Check for deprecated constant usage
5. **Any file using `CoreDomUtils`** - Consider migrating to new services

---

## Summary of Breaking Changes

| Category | Change | Migration Required |
|----------|--------|-------------------|
| Import Paths | `@services/loadings` -> `@services/overlays/loadings` | YES |
| Import Paths | `@services/toasts` -> `@services/overlays/toasts` | YES |
| Import Paths | `@services/modals` -> `@services/overlays/modals` | YES |
| Import Paths | `@services/popovers` -> `@services/overlays/popovers` | YES |
| New Services | `CoreAlerts`, `CorePrompts` | For new features |
| Constants | `USER_PROFILE_REFRESHED` moved | YES |
| API Change | `CoreUrl.addParamsToUrl` signature | YES if using 3rd/4th params |
| Enum | `CoreNetworkConnection` -> `CoreNetworkConnectionType` | If using directly |
| Removed | Various 4.4 deprecated methods | If using any |
