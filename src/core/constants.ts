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
    static DONT_SHOW_ERROR = 'CoreDontShowError';
    static NO_SITE_ID = 'NoSite';

    // Settings constants.
    static SETTINGS_RICH_TEXT_EDITOR = 'CoreSettingsRichTextEditor';
    static SETTINGS_NOTIFICATION_SOUND = 'CoreSettingsNotificationSound';
    static SETTINGS_SYNC_ONLY_ON_WIFI = 'CoreSettingsSyncOnlyOnWifi';
    static SETTINGS_REPORT_IN_BACKGROUND = 'CoreSettingsReportInBackground';

    // WS constants.
    static WS_TIMEOUT = 30000;
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
}
