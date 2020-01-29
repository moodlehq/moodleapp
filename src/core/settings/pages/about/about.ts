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

import { Component, Optional } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreConfigConstants } from '../../../../configconstants';

/**
 * Page that displays the about settings.
 */
@IonicPage({segment: 'core-settings-about'})
@Component({
    selector: 'page-core-settings-about',
    templateUrl: 'about.html',
})
export class CoreSettingsAboutPage {

    appName: string;
    versionName: string;
    privacyPolicy: string;

    constructor(appProvider: CoreAppProvider,
            sitesProvider: CoreSitesProvider,
            @Optional() private svComponent: CoreSplitViewComponent,
            protected navCtrl: NavController) {

        const currentSite = sitesProvider.getCurrentSite();

        this.appName = appProvider.isDesktop() ? CoreConfigConstants.desktopappname : CoreConfigConstants.appname;
        this.versionName = CoreConfigConstants.versionname;

        // Calculate the privacy policy to use.
        this.privacyPolicy = (currentSite && (currentSite.getStoredConfig('tool_mobile_apppolicy') ||
                currentSite.getStoredConfig('sitepolicy'))) || CoreConfigConstants.privacypolicy;
    }

    /**
     * Opens a page.
     *
     * @param page The component deeplink name you want to push onto the navigation stack.
     */
    openPage(page: string): void {
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push(page);
    }
}
