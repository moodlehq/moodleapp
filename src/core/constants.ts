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

import envJson from '@/assets/env.json';
import { EnvironmentConfig } from '@/types/config';
import {
    ModArchetype,
    ModFeature,
    ModResourceDisplay,
} from '@addons/mod/constants';
import { InjectionToken } from '@angular/core';
import { CoreBrowser } from '@singletons/browser';

/**
 * Injection token used for dependencies marked as optional that will never
 * be resolved by Angular injectors.
 */
export const NULL_INJECTION_TOKEN = new InjectionToken('null');

/**
 * Context levels enumeration.
 */
export const enum ContextLevel {
    SYSTEM = 'system',
    USER = 'user',
    COURSECAT = 'coursecat',
    COURSE = 'course',
    MODULE = 'module',
    BLOCK = 'block',
}

/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-redeclare */
/**
 * Possible statuses for downloaded modules/files.
 */
export const DownloadedStatus = {
    DOWNLOADED: 'downloaded',
    DOWNLOADING: 'downloading',
    OUTDATED: 'outdated',
} as const;
export type DownloadedStatus = typeof DownloadedStatus[keyof typeof DownloadedStatus];

/**
 * Possible statuses for not downloaded modules/files.
 */
export const NotDownloadedStatus = {
    DOWNLOADABLE_NOT_DOWNLOADED: 'notdownloaded',
    NOT_DOWNLOADABLE: 'notdownloadable',
} as const;
export type NotDownloadedStatus = typeof NotDownloadedStatus[keyof typeof NotDownloadedStatus];

/**
 * Possible statuses for modules regarding download.
 */
export const DownloadStatus = {
    ...DownloadedStatus,
    ...NotDownloadedStatus,
} as const;
export type DownloadStatus = typeof DownloadStatus[keyof typeof DownloadStatus];
/* eslint-enable @typescript-eslint/naming-convention, @typescript-eslint/no-redeclare */

// Constants for cache update frequency.
export const CoreCacheUpdateFrequency = {
    USUALLY: 0, // eslint-disable-line @typescript-eslint/naming-convention
    OFTEN: 1, // eslint-disable-line @typescript-eslint/naming-convention
    SOMETIMES: 2, // eslint-disable-line @typescript-eslint/naming-convention
    RARELY: 3, // eslint-disable-line @typescript-eslint/naming-convention
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CoreCacheUpdateFrequency = typeof CoreCacheUpdateFrequency[keyof typeof CoreCacheUpdateFrequency];

export const MINIMUM_MOODLE_VERSION = '3.5';

// Versions of Moodle releases.
export const MOODLE_RELEASES = {
    '3.5': 2018051700,
    '3.6': 2018120300,
    '3.7': 2019052000,
    '3.8': 2019111800,
    '3.9': 2020061500,
    '3.10': 2020110900,
    '3.11': 2021051700,
    '4.0': 2022041900,
    '4.1': 2022112800,
    '4.2': 2023042400,
    '4.3': 2023100900,
    '4.4': 2024042200,
    '4.5': 2024100700,
    '5.0': 2025041400,
};

/**
 * Priority of the different back button actions in the app.
 */
export const enum BackButtonPriority {
    IFRAME_FULLSCREEN = 150,
    USER_TOURS = 100,
    CORE_TABS = 40,
    MAIN_MENU = -10, // Use a priority lower than 0 (navigation).
    QUIT_APP = -100, // This should always be the lowest priority.
}

/**
 * Static class to contain all the core constants.
 */
export class CoreConstants {

    static readonly SECONDS_YEAR = 31536000;
    static readonly SECONDS_MONTH = 2592000;
    static readonly SECONDS_WEEK = 604800;
    static readonly SECONDS_DAY = 86400;
    static readonly SECONDS_HOUR = 3600;
    static readonly SECONDS_MINUTE = 60;
    static readonly MILLISECONDS_YEAR = 31536000000;
    static readonly MILLISECONDS_MONTH = 2592000000;
    static readonly MILLISECONDS_WEEK = 604800000;
    static readonly MILLISECONDS_DAY = 86400000;
    static readonly MILLISECONDS_HOUR = 3600000;
    static readonly MILLISECONDS_MINUTE = 60000;
    static readonly MILLISECONDS_SECOND = 1000;
    static readonly WIFI_DOWNLOAD_THRESHOLD = 104857600; // 100MB.
    static readonly DOWNLOAD_THRESHOLD = 10485760; // 10MB.
    static readonly MINIMUM_FREE_SPACE = 10485760; // 10MB.
    static readonly IOS_FREE_SPACE_THRESHOLD = 524288000; // 500MB.
    static readonly NO_SITE_ID = 'NoSite';

    // Settings constants.
    static readonly SETTINGS_RICH_TEXT_EDITOR = 'CoreSettingsRichTextEditor';
    static readonly SETTINGS_NOTIFICATION_SOUND = 'CoreSettingsNotificationSound';
    static readonly SETTINGS_SYNC_ONLY_ON_WIFI = 'CoreSettingsSyncOnlyOnWifi';
    static readonly SETTINGS_DEBUG_DISPLAY = 'CoreSettingsDebugDisplay';
    static readonly SETTINGS_SEND_ON_ENTER = 'CoreSettingsSendOnEnter';
    static readonly SETTINGS_ZOOM_LEVEL = 'CoreSettingsZoomLevel';
    static readonly SETTINGS_COLOR_SCHEME = 'CoreSettingsColorScheme';
    static readonly SETTINGS_ANALYTICS_ENABLED = 'CoreSettingsAnalyticsEnabled';
    static readonly SETTINGS_DONT_SHOW_EXTERNAL_LINK_WARN = 'CoreSettingsDontShowExtLinkWarn';
    static readonly SETTINGS_PINCH_TO_ZOOM = 'CoreSettingsPinchToZoom';

    // WS constants.
    static readonly WS_TIMEOUT = 30000; // Timeout when not in WiFi.
    static readonly WS_TIMEOUT_WIFI = 30000; // Timeout when in WiFi.

    // Login constants.
    /**
     * @deprecated since 4.3 Use TypeOfLogin.BROWSER instead.
     */
    static readonly LOGIN_SSO_CODE = 2; // SSO in browser window is required.
    /**
     * @deprecated since 4.3 Use TypeOfLogin.EMBEDDED instead.
     */
    static readonly LOGIN_SSO_INAPP_CODE = 3; // SSO in embedded browser is required.
    static readonly LOGIN_LAUNCH_DATA = 'CoreLoginLaunchData';

    // Download status constants.
    /**
     * @deprecated since 4.4. Use DownloadStatus.DOWNLOADED instead.
     */
    static readonly DOWNLOADED = DownloadStatus.DOWNLOADED;
    /**
     * @deprecated since 4.4. Use DownloadStatus.DOWNLOADING instead.
     */
    static readonly DOWNLOADING = DownloadStatus.DOWNLOADING;
    /**
     * @deprecated since 4.4. Use DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED instead.
     */
    static readonly NOT_DOWNLOADED = DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    /**
     * @deprecated since 4.4. Use DownloadStatus.OUTDATED instead.
     */
    static readonly OUTDATED = DownloadStatus.OUTDATED;
    /**
     * @deprecated since 4.4. Use DownloadStatus.NOT_DOWNLOADABLE instead.
     */
    static readonly NOT_DOWNLOADABLE = DownloadStatus.NOT_DOWNLOADABLE;

    // Download / prefetch status icon.
    static readonly ICON_DOWNLOADED = 'fam-cloud-done';
    static readonly ICON_DOWNLOADING = 'spinner';
    static readonly ICON_NOT_DOWNLOADED = 'fas-cloud-arrow-down';
    static readonly ICON_OUTDATED = 'fam-cloud-refresh';
    static readonly ICON_NOT_DOWNLOADABLE = '';

    // General download and sync icons.
    static readonly ICON_LOADING = 'spinner';
    static readonly ICON_REFRESH = 'fas-rotate-right';
    static readonly ICON_SYNC = 'fas-rotate';

    /**
     * @deprecated since 5.0. Use ModResourceDisplay.AUTO instead.
     */
    static readonly RESOURCELIB_DISPLAY_AUTO = ModResourceDisplay.AUTO;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.EMBED instead.
     */
    static readonly RESOURCELIB_DISPLAY_EMBED = ModResourceDisplay.EMBED;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.FRAME instead.
     */
    static readonly RESOURCELIB_DISPLAY_FRAME = ModResourceDisplay.FRAME;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.NEW instead.
     */
    static readonly RESOURCELIB_DISPLAY_NEW = ModResourceDisplay.NEW;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.DOWNLOAD instead.
     */
    static readonly RESOURCELIB_DISPLAY_DOWNLOAD = ModResourceDisplay.DOWNLOAD;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.OPEN instead.
     */
    static readonly RESOURCELIB_DISPLAY_OPEN = ModResourceDisplay.OPEN;
    /**
     * @deprecated since 5.0. Use ModResourceDisplay.POPUP instead.
     */
    static readonly RESOURCELIB_DISPLAY_POPUP = ModResourceDisplay.POPUP;

    /**
     * @deprecated since 5.0. Use ModFeature.GRADE_HAS_GRADE instead.
     */
    static readonly FEATURE_GRADE_HAS_GRADE = ModFeature.GRADE_HAS_GRADE;
    /**
     * @deprecated since 5.0. Use ModFeature.GRADE_OUTCOMES instead.
     */
    static readonly FEATURE_GRADE_OUTCOMES = ModFeature.GRADE_OUTCOMES;
    /**
     * @deprecated since 5.0. Use ModFeature.ADVANCED_GRADING instead.
     */
    static readonly FEATURE_ADVANCED_GRADING = ModFeature.ADVANCED_GRADING;
    /**
     * @deprecated since 5.0. Use ModFeature.CONTROLS_GRADE_VISIBILITY instead.
     */
    static readonly FEATURE_CONTROLS_GRADE_VISIBILITY = ModFeature.CONTROLS_GRADE_VISIBILITY;
    /**
     * @deprecated since 5.0. Use ModFeature.PLAGIARISM instead.
     */
    static readonly FEATURE_PLAGIARISM = ModFeature.PLAGIARISM;
    /**
     * @deprecated since 5.0. Use ModFeature.COMPLETION_TRACKS_VIEWS instead.
     */
    static readonly FEATURE_COMPLETION_TRACKS_VIEWS = ModFeature.COMPLETION_TRACKS_VIEWS;
    /**
     * @deprecated since 5.0. Use ModFeature.COMPLETION_HAS_RULES instead.
     */
    static readonly FEATURE_COMPLETION_HAS_RULES = ModFeature.COMPLETION_HAS_RULES;
    /**
     * @deprecated since 5.0. Use ModFeature.NO_VIEW_LINK instead.
     */
    static readonly FEATURE_NO_VIEW_LINK = ModFeature.NO_VIEW_LINK;
    /**
     * @deprecated since 5.0. Use ModFeature.IDNUMBER instead.
     */
    static readonly FEATURE_IDNUMBER = ModFeature.IDNUMBER;
    /**
     * @deprecated since 5.0. Use ModFeature.GROUPS instead.
     */
    static readonly FEATURE_GROUPS = ModFeature.GROUPS;
    /**
     * @deprecated since 5.0. Use ModFeature.GROUPINGS instead.
     */
    static readonly FEATURE_GROUPINGS = ModFeature.GROUPINGS;
    /**
     * @deprecated since 5.0. Use ModFeature.MOD_ARCHETYPE instead.
     */
    static readonly FEATURE_MOD_ARCHETYPE = ModFeature.MOD_ARCHETYPE;
    /**
     * @deprecated since 5.0. Use ModFeature.MOD_INTRO instead.
     */
    static readonly FEATURE_MOD_INTRO = ModFeature.MOD_INTRO;
    /**
     * @deprecated since 5.0. Use ModFeature.MODEDIT_DEFAULT_COMPLETION instead.
     */
    static readonly FEATURE_MODEDIT_DEFAULT_COMPLETION = ModFeature.MODEDIT_DEFAULT_COMPLETION;
    /**
     * @deprecated since 5.0. Use ModFeature.COMMENT instead.
     */
    static readonly FEATURE_COMMENT = ModFeature.COMMENT;
    /**
     * @deprecated since 5.0. Use ModFeature.MOD_PURPOSE instead.
     */
    static readonly FEATURE_MOD_PURPOSE = ModFeature.MOD_PURPOSE;
    /**
     * @deprecated since 5.0. Use ModFeature.RATE instead.
     */
    static readonly FEATURE_RATE = ModFeature.RATE;
    /**
     * @deprecated since 5.0. Use ModFeature.BACKUP_MOODLE2 instead.
     */
    static readonly FEATURE_BACKUP_MOODLE2 = ModFeature.BACKUP_MOODLE2;
    /**
     * @deprecated since 5.0. Use ModFeature.SHOW_DESCRIPTION instead.
     */
    static readonly FEATURE_SHOW_DESCRIPTION = ModFeature.SHOW_DESCRIPTION;
    /**
     * @deprecated since 5.0. Use ModFeature.USES_QUESTIONS instead.
     */
    static readonly FEATURE_USES_QUESTIONS = ModFeature.USES_QUESTIONS;

    /**
     * @deprecated since 5.0. Use ModArchetype.OTHER instead.
     */
    static readonly MOD_ARCHETYPE_OTHER = ModArchetype.OTHER;
    /**
     * @deprecated since 5.0. Use ModArchetype.RESOURCE instead.
     */
    static readonly MOD_ARCHETYPE_RESOURCE = ModArchetype.RESOURCE;
    /**
     * @deprecated since 5.0. Use ModArchetype.ASSIGNMENT instead.
     */
    static readonly MOD_ARCHETYPE_ASSIGNMENT = ModArchetype.ASSIGNMENT;
    /**
     * @deprecated since 5.0. Use ModArchetype.SYSTEM instead.
     */
    static readonly MOD_ARCHETYPE_SYSTEM = ModArchetype.SYSTEM;

    // Other constants.
    static readonly CALENDAR_DEFAULT_STARTING_WEEKDAY = 1;
    static readonly DONT_SHOW_NOTIFICATIONS_PERMISSION_WARNING = 'CoreDontShowNotificationsPermissionWarning';
    static readonly DONT_SHOW_EXACT_ALARMS_WARNING = 'CoreDontShowScheduleExactWarning';
    static readonly EXACT_ALARMS_WARNING_DISPLAYED = 'CoreScheduleExactWarningModalDisplayed';

    // Config & environment constants.
    static readonly CONFIG = { ...envJson.config } as unknown as EnvironmentConfig; // Data parsed from config.json files.
    static readonly BUILD = envJson.build as unknown as EnvironmentBuild; // Build info.

    /**
     * Check whether devtools should be enabled.
     *
     * @returns Whether devtools should be enabled.
     */
    static enableDevTools(): boolean {
        // @todo [4.0] This is not the proper way to check for development tools, we should rely only on the BUILD variable.
        return this.BUILD.isDevelopment
            || this.BUILD.isTesting
            || CoreBrowser.hasDevelopmentSetting('DevTools');
    }

}

interface EnvironmentBuild {
    version: string;
    isProduction: boolean;
    isTesting: boolean;
    isDevelopment: boolean;
    lastCommitHash: string;
    compilationTime: number;
}
