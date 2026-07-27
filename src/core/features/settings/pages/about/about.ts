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

import { Component } from '@angular/core';

import { CoreConstants } from '@/core/constants';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';
import { CORE_SETTINGS_DEVICEINFO_PAGE_NAME, CORE_SETTINGS_LICENSES_PAGE_NAME } from '@features/settings/constants';

/**
 * App settings about menu page.
 */
@Component({
    selector: 'page-core-app-settings-about',
    templateUrl: 'about.html',
    styleUrl: 'about.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreSettingsAboutPage {

    readonly appName = CoreConstants.CONFIG.appname;
    readonly versionName = CoreConstants.CONFIG.versionname;
    readonly versionCode = CoreConstants.CONFIG.versioncode;

    readonly privacyPolicy: string;
    readonly a11yStatement = CoreConstants.CONFIG.a11yStatement ?? 'https://apps.moodle.com/admin/tool/policy/view.php?policyid=5';
    readonly showSurvey: boolean;
    readonly feedbackFormUrl = CoreConstants.CONFIG.feedbackFormUrl ?? 'https://feedback.moodle.org/mobileapp';
    readonly legalDisclaimer = CoreConstants.CONFIG.legalDisclaimer;

    constructor() {
        const site = CoreSites.getCurrentSite();

        // Calculate the privacy policy to use.
        this.privacyPolicy = (site && (site.getStoredConfig('tool_mobile_apppolicy') || site.getStoredConfig('sitepolicy'))) ||
            CoreConstants.CONFIG.privacypolicy;
        this.showSurvey = !!site?.isAdmin();
    }

    /**
     * Opens licenses page.
     */
    openLicensesPage(): void {
        CoreNavigator.navigate(CORE_SETTINGS_LICENSES_PAGE_NAME);
    }

    /**
     * Opens device info page.
     */
    openDeviceInfoPage(): void {
        CoreNavigator.navigate(CORE_SETTINGS_DEVICEINFO_PAGE_NAME);
    }

}
