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
import { SplashScreen } from '@ionic-native/splash-screen';
import { CoreAppProvider } from '@providers/app';
import { CoreInitDelegate } from '@providers/init';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConstants } from '../../../constants';
import { CoreLoginHelperProvider } from '../../providers/helper';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@IonicPage({ segment: 'core-login-init' })
@Component({
    selector: 'page-core-login-init',
    templateUrl: 'init.html',
})
export class CoreLoginInitPage {

    constructor(private navCtrl: NavController, private appProvider: CoreAppProvider, private initDelegate: CoreInitDelegate,
        private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
        private splashScreen: SplashScreen) { }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        // Wait for the app to be ready.
        this.initDelegate.ready().then(() => {
            // Check if there was a pending redirect.
            const redirectData = this.appProvider.getRedirect();
            if (redirectData.siteId) {
                // Unset redirect data.
                this.appProvider.storeRedirect('', '', '');

                // Only accept the redirect if it was stored less than 20 seconds ago.
                if (Date.now() - redirectData.timemodified < 20000) {
                    if (redirectData.siteId != CoreConstants.NO_SITE_ID) {
                        // The redirect is pointing to a site, load it.
                        return this.sitesProvider.loadSite(redirectData.siteId, redirectData.page, redirectData.params)
                                .then((loggedIn) => {

                            if (loggedIn) {
                                return this.loginHelper.goToSiteInitialPage(this.navCtrl, redirectData.page, redirectData.params,
                                        { animate: false });
                            }
                        }).catch(() => {
                            // Site doesn't exist.
                            return this.loadPage();
                        });
                    } else {
                        // No site to load, open the page.
                        return this.loginHelper.goToNoSitePage(this.navCtrl, redirectData.page, redirectData.params);
                    }
                }
            }

            return this.loadPage();
        }).then(() => {
            // If we hide the splash screen now, the init view is still seen for an instant. Wait a bit to make sure it isn't seen.
            setTimeout(() => {
                this.splashScreen.hide();
            }, 100);
        });
    }

    /**
     * Load the right page.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadPage(): Promise<any> {
        if (this.sitesProvider.isLoggedIn()) {
            if (!this.loginHelper.isSiteLoggedOut()) {
                // User is logged in, go to site initial page.
                return this.loginHelper.goToSiteInitialPage();
            } else {
                // The site is marked as logged out. Logout and try again.
                return this.sitesProvider.logout().then(() => {
                    return this.loadPage();
                });
            }
        } else {
            return this.sitesProvider.hasSites().then((hasSites) => {
                if (hasSites) {
                    return this.navCtrl.setRoot('CoreLoginSitesPage');
                } else {
                    return this.loginHelper.goToAddSite(true);
                }
            });
        }
    }
}
