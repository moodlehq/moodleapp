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

export const CORE_SETTINGS_PAGE_NAME = 'settings';
export const CORE_SETTINGS_PREFERENCES_PAGE_NAME = 'preferences';
export const CORE_SETTINGS_GENERAL_PAGE_NAME = 'general';
export const CORE_SETTINGS_SPACE_USAGE_PAGE_NAME = 'spaceusage';
export const CORE_SETTINGS_SYNC_PAGE_NAME = 'sync';
export const CORE_SETTINGS_ABOUT_PAGE_NAME = 'about';
export const CORE_SETTINGS_DEVICEINFO_PAGE_NAME = 'deviceinfo';
export const CORE_SETTINGS_DEV_PAGE_NAME = 'dev';
export const CORE_SETTINGS_ERROR_LOG_PAGE_NAME = 'error-log';
export const CORE_SETTINGS_LICENSES_PAGE_NAME = 'licenses';

// Path to allow creating routes for CoreSettingsHelper.getDevExtraPageItems using the common path.
export const CORE_SETTINGS_DEV_PAGE_PATH = `${CORE_SETTINGS_PAGE_NAME}/${CORE_SETTINGS_ABOUT_PAGE_NAME}/`
	+ `${CORE_SETTINGS_DEVICEINFO_PAGE_NAME}/${CORE_SETTINGS_DEV_PAGE_NAME}`;
