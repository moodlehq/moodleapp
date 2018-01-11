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

import { Component } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreAppProvider } from '../../../../providers/app';
import { CoreInitDelegate } from '../../../../providers/init';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreConstants } from '../../../constants';
import { CoreLoginHelperProvider } from '../../providers/helper';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@IonicPage()
@Component({
    selector: 'page-core-login-init',
    templateUrl: 'init.html',
})
export class CoreLoginInitPage {

    constructor(private navCtrl: NavController, private appProvider: CoreAppProvider, private initDelegate: CoreInitDelegate,
            private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider) {}

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        // Wait for the app to be ready.
        this.initDelegate.ready().then(() => {
            // Check if there was a pending redirect.
            const redirectData = this.appProvider.getRedirect();
            if (redirectData.siteId && redirectData.page) {
                // Unset redirect data.
                this.appProvider.storeRedirect('', '', '');

                // Only accept the redirect if it was stored less than 20 seconds ago.
                if (Date.now() - redirectData.timemodified < 20000) {
                    if (redirectData.siteId != CoreConstants.noSiteId) {
                        // The redirect is pointing to a site, load it.
                        return this.sitesProvider.loadSite(redirectData.siteId).then(() => {
                            if (!this.loginHelper.isSiteLoggedOut(redirectData.page, redirectData.params)) {
                                this.navCtrl.setRoot(redirectData.page, redirectData.params, {animate: false});
                            }
                        }).catch(() => {
                            // Site doesn't exist.
                            this.loadPage();
                        });
                    } else {
                        // No site to load, just open the state.
                        return this.navCtrl.setRoot(redirectData.page, redirectData.params, {animate: false});
                    }
                }
            }

            this.loadPage();
        });
    }

    /**
     * Load the right page.
     */
    protected loadPage() : void {
        if (this.sitesProvider.isLoggedIn()) {
            if (!this.loginHelper.isSiteLoggedOut()) {
                this.loginHelper.goToSiteInitialPage();
            }
        } else {
            this.sitesProvider.hasSites().then(() => {
                this.navCtrl.setRoot('CoreLoginSitesPage');
            }, () => {
                this.loginHelper.goToAddSite(true);
            });
        }
    }
}
