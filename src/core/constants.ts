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
import { CoreBrowser } from '@singletons/browser';

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

export const enum ModPurpose {
    MOD_PURPOSE_COMMUNICATION = 'communication',
    MOD_PURPOSE_ASSESSMENT = 'assessment',
    MOD_PURPOSE_COLLABORATION = 'collaboration',
    MOD_PURPOSE_CONTENT = 'content',
    MOD_PURPOSE_ADMINISTRATION = 'administration',
    MOD_PURPOSE_INTERFACE = 'interface',
    MOD_PURPOSE_OTHER = 'other',
}

/**
 * Static class to contain all the core constants.
 */
export class CoreConstants {

    /* eslint-disable max-len */

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
    static readonly DONT_SHOW_ERROR = 'CoreDontShowError'; // @deprecated since 3.9.5. Use CoreSilentError instead.
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

    // WS constants.
    static readonly WS_TIMEOUT = 30000; // Timeout when not in WiFi.
    static readonly WS_TIMEOUT_WIFI = 30000; // Timeout when in WiFi.
    static readonly WS_PREFIX = 'local_mobile_'; // @deprecated since app 4.0.

    // Login constants.
    static readonly LOGIN_SSO_CODE = 2; // SSO in browser window is required.
    static readonly LOGIN_SSO_INAPP_CODE = 3; // SSO in embedded browser is required.
    static readonly LOGIN_LAUNCH_DATA = 'CoreLoginLaunchData';

    // Download status constants.
    static readonly DOWNLOADED = 'downloaded';
    static readonly DOWNLOADING = 'downloading';
    static readonly NOT_DOWNLOADED = 'notdownloaded';
    static readonly OUTDATED = 'outdated';
    static readonly NOT_DOWNLOADABLE = 'notdownloadable';

    // Download / prefetch status icon.
    static readonly ICON_DOWNLOADED = 'fam-cloud-done';
    static readonly ICON_DOWNLOADING = 'spinner';
    static readonly ICON_NOT_DOWNLOADED = 'fas-cloud-download-alt';
    static readonly ICON_OUTDATED = 'fam-cloud-refresh';
    static readonly ICON_NOT_DOWNLOADABLE = '';

    // General download and sync icons.
    static readonly ICON_LOADING = 'spinner';
    static readonly ICON_REFRESH = 'fas-redo-alt';
    static readonly ICON_SYNC = 'fas-sync-alt';

    // Constants from Moodle's resourcelib.
    static readonly RESOURCELIB_DISPLAY_AUTO = 0; // Try the best way.
    static readonly RESOURCELIB_DISPLAY_EMBED = 1; // Display using object tag.
    static readonly RESOURCELIB_DISPLAY_FRAME = 2; // Display inside frame.
    static readonly RESOURCELIB_DISPLAY_NEW = 3; // Display normal link in new window.
    static readonly RESOURCELIB_DISPLAY_DOWNLOAD = 4; // Force download of file instead of display.
    static readonly RESOURCELIB_DISPLAY_OPEN = 5; // Open directly.
    static readonly RESOURCELIB_DISPLAY_POPUP = 6; // Open in "emulated" pop-up without navigation.

    // Feature constants. Used to report features that are, or are not, supported by a module.
    static readonly FEATURE_GRADE_HAS_GRADE = 'grade_has_grade'; // True if module can provide a grade.
    static readonly FEATURE_GRADE_OUTCOMES = 'outcomes'; // True if module supports outcomes.
    static readonly FEATURE_ADVANCED_GRADING = 'grade_advanced_grading'; // True if module supports advanced grading methods.
    static readonly FEATURE_CONTROLS_GRADE_VISIBILITY = 'controlsgradevisbility'; // True if module controls grade visibility over gradebook.
    static readonly FEATURE_PLAGIARISM = 'plagiarism'; // True if module supports plagiarism plugins.
    static readonly FEATURE_COMPLETION_TRACKS_VIEWS = 'completion_tracks_views'; // True if module tracks whether somebody viewed it.
    static readonly FEATURE_COMPLETION_HAS_RULES = 'completion_has_rules'; // True if module has custom completion rules.
    static readonly FEATURE_NO_VIEW_LINK = 'viewlink'; // True if module has no 'view' page (like label).
    static readonly FEATURE_IDNUMBER = 'idnumber'; // True if module wants support for setting the ID number for grade calculation purposes.
    static readonly FEATURE_GROUPS = 'groups'; // True if module supports groups.
    static readonly FEATURE_GROUPINGS = 'groupings'; // True if module supports groupings.
    static readonly FEATURE_MOD_ARCHETYPE = 'mod_archetype'; // Type of module.
    static readonly FEATURE_MOD_INTRO = 'mod_intro'; // True if module supports intro editor.
    static readonly FEATURE_MODEDIT_DEFAULT_COMPLETION = 'modedit_default_completion'; // True if module has default completion.
    static readonly FEATURE_COMMENT = 'comment';
    static readonly FEATURE_MOD_PURPOSE = 'mod_purpose'; // Type of module.
    static readonly FEATURE_RATE = 'rate';
    static readonly FEATURE_BACKUP_MOODLE2 = 'backup_moodle2'; // True if module supports backup/restore of moodle2 format.
    static readonly FEATURE_SHOW_DESCRIPTION = 'showdescription'; // True if module can show description on course main page.
    static readonly FEATURE_USES_QUESTIONS = 'usesquestions'; // True if module uses the question bank.

    // Possible archetypes for modules.
    static readonly MOD_ARCHETYPE_OTHER = 0; // Unspecified module archetype.
    static readonly MOD_ARCHETYPE_RESOURCE = 1; // Resource-like type module.
    static readonly MOD_ARCHETYPE_ASSIGNMENT = 2; // Assignment module archetype.
    static readonly MOD_ARCHETYPE_SYSTEM = 3; // System (not user-addable) module archetype.

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
            || this.CONFIG.versionname.includes('-dev')
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
