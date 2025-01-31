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
import { CoreSite } from '@classes/sites/site';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * App settings about menu page.
 */
@Component({
    selector: 'page-core-app-settings-about',
    templateUrl: 'about.html',
    styleUrl: 'about.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreSettingsAboutPage {

    appName: string;
    versionName: string;
    privacyPolicy: string;
    feedbackFormUrl = CoreConstants.CONFIG.feedbackFormUrl ?? 'https://feedback.moodle.org/mobileapp';
    a11yStatement = CoreConstants.CONFIG.a11yStatement ?? 'https://apps.moodle.com/admin/tool/policy/view.php?versionid=5';
    currentSite?: CoreSite;
    showSurvey: boolean | undefined = false;
    legalDisclaimer = CoreConstants.CONFIG.legalDisclaimer;

    constructor() {
        this.currentSite = CoreSites.getCurrentSite();

        this.appName = CoreConstants.CONFIG.appname;
        this.versionName = CoreConstants.CONFIG.versionname;

        // Calculate the privacy policy to use.
        this.privacyPolicy = (this.currentSite && (this.currentSite.getStoredConfig('tool_mobile_apppolicy') ||
        this.currentSite.getStoredConfig('sitepolicy'))) || CoreConstants.CONFIG.privacypolicy;
        this.showSurvey = this.currentSite?.isAdmin();
    }

    /**
     * Opens a page.
     *
     * @param page The component deeplink name you want to push onto the navigation stack.
     */
    openPage(page: string): void {
        CoreNavigator.navigate(page);
    }

}
