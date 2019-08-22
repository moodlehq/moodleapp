// (C) Copyright 2015 Martin Dougiamas
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

/**
 * Static class to contain all the core constants.
 */
export class CoreConstants {
    static SECONDS_YEAR = 31536000;
    static SECONDS_WEEK = 604800;
    static SECONDS_DAY = 86400;
    static SECONDS_HOUR = 3600;
    static SECONDS_MINUTE = 60;
    static WIFI_DOWNLOAD_THRESHOLD = 104857600; // 100MB.
    static DOWNLOAD_THRESHOLD = 10485760; // 10MB.
    static MINIMUM_FREE_SPACE = 10485760; // 10MB.
    static IOS_FREE_SPACE_THRESHOLD = 524288000; // 500MB.
    static DONT_SHOW_ERROR = 'CoreDontShowError';
    static NO_SITE_ID = 'NoSite';

    // Settings constants.
    static SETTINGS_RICH_TEXT_EDITOR = 'CoreSettingsRichTextEditor';
    static SETTINGS_NOTIFICATION_SOUND = 'CoreSettingsNotificationSound';
    static SETTINGS_SYNC_ONLY_ON_WIFI = 'CoreSettingsSyncOnlyOnWifi';
    static SETTINGS_DEBUG_DISPLAY = 'CoreSettingsDebugDisplay';
    static SETTINGS_REPORT_IN_BACKGROUND = 'CoreSettingsReportInBackground'; // @deprecated since 3.5.0
    static SETTINGS_SEND_ON_ENTER = 'CoreSettingsSendOnEnter';
    static SETTINGS_FONT_SIZE = 'CoreSettingsFontSize';
    static SETTINGS_ANALYTICS_ENABLED = 'CoreSettingsAnalyticsEnabled';

    // WS constants.
    static WS_TIMEOUT = 30000; // Timeout when not in WiFi.
    static WS_TIMEOUT_WIFI = 30000; // Timeout when in WiFi.
    static WS_PREFIX = 'local_mobile_';

    // Login constants.
    static LOGIN_SSO_CODE = 2; // SSO in browser window is required.
    static LOGIN_SSO_INAPP_CODE = 3; // SSO in embedded browser is required.
    static LOGIN_LAUNCH_DATA = 'CoreLoginLaunchData';

    // Download status constants.
    static DOWNLOADED = 'downloaded';
    static DOWNLOADING = 'downloading';
    static NOT_DOWNLOADED = 'notdownloaded';
    static OUTDATED = 'outdated';
    static NOT_DOWNLOADABLE = 'notdownloadable';

    // Constants from Moodle's resourcelib.
    static RESOURCELIB_DISPLAY_AUTO = 0; // Try the best way.
    static RESOURCELIB_DISPLAY_EMBED = 1; // Display using object tag.
    static RESOURCELIB_DISPLAY_FRAME = 2; // Display inside frame.
    static RESOURCELIB_DISPLAY_NEW = 3; // Display normal link in new window.
    static RESOURCELIB_DISPLAY_DOWNLOAD = 4; // Force download of file instead of display.
    static RESOURCELIB_DISPLAY_OPEN = 5; // Open directly.
    static RESOURCELIB_DISPLAY_POPUP = 6; // Open in "emulated" pop-up without navigation.

    // Feature constants. Used to report features that are, or are not, supported by a module.
    static FEATURE_GRADE_HAS_GRADE = 'grade_has_grade'; // True if module can provide a grade.
    static FEATURE_GRADE_OUTCOMES = 'outcomes'; // True if module supports outcomes.
    static FEATURE_ADVANCED_GRADING = 'grade_advanced_grading'; // True if module supports advanced grading methods.
    static FEATURE_CONTROLS_GRADE_VISIBILITY = 'controlsgradevisbility'; // True if module controls grade visibility over gradebook.
    static FEATURE_PLAGIARISM = 'plagiarism'; // True if module supports plagiarism plugins.
    static FEATURE_COMPLETION_TRACKS_VIEWS = 'completion_tracks_views'; // True if module tracks whether somebody viewed it.
    static FEATURE_COMPLETION_HAS_RULES = 'completion_has_rules'; // True if module has custom completion rules.
    static FEATURE_NO_VIEW_LINK = 'viewlink'; // True if module has no 'view' page (like label).
    static FEATURE_IDNUMBER = 'idnumber'; // True if module wants support for setting the ID number for grade calculation purposes.
    static FEATURE_GROUPS = 'groups'; // True if module supports groups.
    static FEATURE_GROUPINGS = 'groupings'; // True if module supports groupings.
    static FEATURE_MOD_ARCHETYPE = 'mod_archetype'; // Type of module.
    static FEATURE_MOD_INTRO = 'mod_intro'; // True if module supports intro editor.
    static FEATURE_MODEDIT_DEFAULT_COMPLETION = 'modedit_default_completion'; // True if module has default completion.
    static FEATURE_COMMENT = 'comment';
    static FEATURE_RATE = 'rate';
    static FEATURE_BACKUP_MOODLE2 = 'backup_moodle2'; // True if module supports backup/restore of moodle2 format.
    static FEATURE_SHOW_DESCRIPTION = 'showdescription'; // True if module can show description on course main page.
    static FEATURE_USES_QUESTIONS = 'usesquestions'; // True if module uses the question bank.

    // Pssobile archetypes for modules.
    static MOD_ARCHETYPE_OTHER = 0; // Unspecified module archetype.
    static MOD_ARCHETYPE_RESOURCE = 1; // Resource-like type module.
    static MOD_ARCHETYPE_ASSIGNMENT = 2; // Assignment module archetype.
    static MOD_ARCHETYPE_SYSTEM = 3; // System (not user-addable) module archetype.
}
