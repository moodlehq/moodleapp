// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CoreColorScheme, CoreZoomLevel } from '@features/settings/services/settings-helper';
import { CoreMainMenuOverrideItem } from '@features/mainmenu/services/mainmenu';
import { CoreCustomMenuLocalizedCustomItem } from '@features/mainmenu/services/custommenu';
import { CoreLoginSiteInfo, CoreSitesDemoSiteData } from '@services/sites';
import { OpenFileAction } from '@singletons/opener';
import { CoreLoginSiteFinderSettings, CoreLoginSiteSelectorListMethod } from '@features/login/services/login-helper';
import { CoreDatabaseConfiguration } from '@classes/database/database-table';
import { ToastDuration } from '@services/overlays/toasts';
import { CoreWSOverride } from '@classes/sites/unauthenticated-site';

/* eslint-disable @typescript-eslint/naming-convention */
// It's important to keep EnvironmentConfig as an interface so it can be extended using "declare module".
export interface EnvironmentConfig {
    app_id: string;
    appname: string;
    versioncode: number;
    versionname: string; // @todo This could be removed and use build variables instead.
    cache_update_frequency_usually: number;
    cache_update_frequency_often: number;
    cache_update_frequency_sometimes: number;
    cache_update_frequency_rarely: number;
    default_lang: string;
    languages: Record<string, string>;
    databaseOptimizations?: Partial<CoreDatabaseConfiguration>;
    databaseTableOptimizations?: Record<string, Partial<CoreDatabaseConfiguration>>;
    disableUserTours?: boolean;
    disabledUserTours?: string[];
    wsservice: string;
    demo_sites: Record<string, CoreSitesDemoSiteData>;
    zoomlevels: Record<CoreZoomLevel, number>;
    defaultZoomLevel?: CoreZoomLevel; // Set the default zoom level of the app.
    customurlscheme: string;
    sites: CoreLoginSiteInfo[];
    multisitesdisplay: CoreLoginSiteSelectorListMethod;
    sitefindersettings: Partial<CoreLoginSiteFinderSettings>;
    onlyallowlistedsites: boolean;
    skipssoconfirmation: boolean;
    forcedefaultlanguage: boolean;
    privacypolicy: string;
    notificoncolor: string;
    enableonboarding: boolean;
    forceColorScheme: CoreColorScheme;
    forceLoginLogo: boolean;
    showTopLogo: 'online' | 'offline' | 'hidden';
    ioswebviewscheme: string;
    appstores: Record<string, string>;
    displayqroncredentialscreen?: boolean;
    displayqronsitescreen?: boolean;
    forceOpenLinksIn?: 'app' | 'browser';
    iOSDefaultOpenFileAction?: OpenFileAction;
    customMainMenuItems?: CoreCustomMenuLocalizedCustomItem[];
    customUserMenuItems?: CoreCustomMenuLocalizedCustomItem[];
    feedbackFormUrl?: string | false;
    a11yStatement?: string | false;
    legalDisclaimer?: string | false;
    iabToolbarColors?: 'auto' | { background: string; text?: string } | null;
    wsrequestqueuelimit: number; // Maximum number of requests allowed in the queue.
    wsrequestqueuedelay: number; // Maximum number of miliseconds to wait before processing the queue.
    calendarreminderdefaultvalue: number; // Initial value for default reminders (in seconds). User can change it later.
    removeaccountonlogout?: boolean; // True to remove the account when the user clicks logout. Doesn't affect switch account.
    uselegacycompletion?: boolean; // Whether to use legacy completion by default in all course formats.
    toastDurations: Record<ToastDuration, number>;
    disableCallWSInBackground?: boolean; // If true, disable calling WS in background.
    callWSInBackgroundExpirationTime?: number; // Ms to consider an entry expired when calling WS in background. Default: 1 week.
    disableTokenFile: boolean; // Disable the use of tokenpluginfile.php for downloading files (so it fallbacks to pluginfile.php)
    demoMode?: boolean; // Whether to run the app in "demo mode".
    hideInformativeLinks?: boolean; // Whether to hide informative links.
    iconsPrefixes?: Record<string, Record<string, string[]>>; // Prefixes for custom font icons (located in src/assets/fonts).
    clearIABSessionWhenAutoLogin?: 'android' | 'ios' | 'all'; // Clear the session every time a new IAB is opened with auto-login.
    disabledFeatures?: string; // Disabled features for the whole app, using the same format as tool_mobile_disabledfeatures.
    collapsibleItemsExpanded: boolean; // Expand or collapse the collapsible items by default.
    wsOverrides: Record<string, CoreWSOverride[]>; // Overrides to apply to WS calls.
    overrideMainMenuButtons: CoreMainMenuOverrideItem[]; // Override main menu items.
}
