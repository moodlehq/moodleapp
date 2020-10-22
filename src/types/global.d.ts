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

/* eslint-disable @typescript-eslint/naming-convention */

import { CoreSitesDemoSiteData } from '@/app/services/sites';

declare global {

    interface Window {
        __Zone_disable_customElements: boolean;
    }

    type MoodleAppWindow = {
        MoodleApp: {
            CONFIG: {
                app_id: string;
                appname: string;
                desktopappname: string;
                versioncode: number;
                versionname: string;
                cache_update_frequency_usually: number;
                cache_update_frequency_often: number;
                cache_update_frequency_sometimes: number;
                cache_update_frequency_rarely: number;
                default_lang: string;
                languages: Record<string, string>;
                wsservice: string;
                wsextservice: string;
                demo_sites: Record<string, CoreSitesDemoSiteData>;
                font_sizes: number[];
                customurlscheme: string;
                siteurl: string;
                sitename: string;
                multisitesdisplay: string;
                sitefindersettings: Record<string, unknown>;
                onlyallowlistedsites: boolean;
                skipssoconfirmation: boolean;
                forcedefaultlanguage: boolean;
                privacypolicy: string;
                notificoncolor: string;
                statusbarbg: boolean;
                statusbarlighttext: boolean;
                statusbarbgios: string;
                statusbarlighttextios: boolean;
                statusbarbgandroid: string;
                statusbarlighttextandroid: boolean;
                statusbarbgremotetheme: string;
                statusbarlighttextremotetheme: boolean;
                enableanalytics: boolean;
                enableonboarding: boolean;
                forceColorScheme: string;
                forceLoginLogo: boolean;
                ioswebviewscheme: string;
                appstores: Record<string, string>;
                displayqroncredentialscreen?: boolean;
                displayqronsitescreen?: boolean;
            };

            BUILD: {
                environment: string;
                isProduction: boolean;
                lastCommitHash: string;
                compilationTime: number;
            };
        };
    };

}

/**
 * Course base definition.
 */
export type CoreCourseBase = {
    id: number; // Course Id.
};
