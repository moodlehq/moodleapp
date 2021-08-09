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
import { CoreMainMenuLocalizedCustomItem } from '@features/mainmenu/services/mainmenu';
import { CoreSitesDemoSiteData } from '@services/sites';
import { OpenFileAction } from '@services/utils/utils';
import { CoreLoginSiteSelectorListMethod } from '@features/login/services/login-helper';

/* eslint-disable @typescript-eslint/naming-convention */

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
    wsservice: string;
    wsextservice: string;
    demo_sites: Record<string, CoreSitesDemoSiteData>;
    zoomlevels: Record<CoreZoomLevel, number>;
    customurlscheme: string;
    siteurl: string;
    sitename: string;
    multisitesdisplay: CoreLoginSiteSelectorListMethod;
    sitefindersettings: Record<string, unknown>;
    onlyallowlistedsites: boolean;
    skipssoconfirmation: boolean;
    forcedefaultlanguage: boolean;
    privacypolicy: string;
    notificoncolor: string;
    enableanalytics: boolean;
    enableonboarding: boolean;
    forceColorScheme: CoreColorScheme;
    forceLoginLogo: boolean;
    ioswebviewscheme: string;
    appstores: Record<string, string>;
    displayqroncredentialscreen?: boolean;
    displayqronsitescreen?: boolean;
    forceOpenLinksIn: 'app' | 'browser';
    iOSDefaultOpenFileAction?: OpenFileAction;
    customMainMenuItems?: CoreMainMenuLocalizedCustomItem[];
    feedbackFormUrl?: string | false;
}
