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

/**
 * App settings about menu page.
 */
@Component({
    selector: 'page-core-app-settings-about',
    templateUrl: 'about.html',
})
export class CoreSettingsAboutPage {

    appName: string;
    versionName: string;
    privacyPolicy: string;
    feedbackFormUrl = CoreConstants.CONFIG.feedbackFormUrl ?? 'https://feedback.moodle.org/mobileapp';

    constructor() {
        const currentSite = CoreSites.getCurrentSite();

        this.appName = CoreConstants.CONFIG.appname;
        this.versionName = CoreConstants.CONFIG.versionname;

        // Calculate the privacy policy to use.
        this.privacyPolicy = (currentSite && (currentSite.getStoredConfig('tool_mobile_apppolicy') ||
        currentSite.getStoredConfig('sitepolicy'))) || CoreConstants.CONFIG.privacypolicy;
    }

    /**
     * Opens a page.
     *
     * @param page The component deeplink name you want to push onto the navigation stack.
     */
    openPage(page: string): void {
        // const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        // navCtrl.push(page);
        CoreNavigator.navigate(page);
    }

}
