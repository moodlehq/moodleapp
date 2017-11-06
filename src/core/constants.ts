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
    public static secondsYear = 31536000;
    public static secondsDay = 86400;
    public static secondsHour = 3600;
    public static secondsMinute = 60;
    public static wifiDownloadThreshold = 104857600; // 100MB.
    public static downloadThreshold = 10485760; // 10MB.
    public static dontShowError = 'CoreDontShowError';
    public static settingsRichTextEditor = 'CoreSettingsRichTextEditor';
}
