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

import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

import { CoreApp, CoreRedirectData } from '@services/app';
import { CoreInit } from '@services/init';
import { SplashScreen } from '@singletons/core.singletons';
import { CoreConstants } from '@core/constants';
import { CoreSites } from '@/app/services/sites';
import { CoreLoginHelper } from '@/app/core/login/services/helper';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@Component({
    selector: 'page-core-login-init',
    templateUrl: 'init.html',
    styleUrls: ['init.scss'],
})
export class CoreLoginInitPage implements OnInit {

    constructor(protected navCtrl: NavController) {}

    /**
     * Initialize the component.
     */
    async ngOnInit(): Promise<void> {
        // Wait for the app to be ready.
        await CoreInit.instance.ready();

        // Check if there was a pending redirect.
        const redirectData = CoreApp.instance.getRedirect();

        if (redirectData.siteId) {
            await this.handleRedirect(redirectData);
        } else {
            await this.loadPage();
        }

        // If we hide the splash screen now, the init view is still seen for an instant. Wait a bit to make sure it isn't seen.
        setTimeout(() => {
            SplashScreen.instance.hide();
        }, 100);
    }

    /**
     * Treat redirect data.
     *
     * @param redirectData Redirect data.
     */
    protected async handleRedirect(redirectData: CoreRedirectData): Promise<void> {
        // Unset redirect data.
        CoreApp.instance.storeRedirect('', '', {});

        // Only accept the redirect if it was stored less than 20 seconds ago.
        if (redirectData.timemodified && Date.now() - redirectData.timemodified < 20000) {
            if (redirectData.siteId != CoreConstants.NO_SITE_ID) {
                // The redirect is pointing to a site, load it.
                try {
                    const loggedIn = await CoreSites.instance.loadSite(
                        redirectData.siteId!,
                        redirectData.page,
                        redirectData.params,
                    );

                    if (!loggedIn) {
                        return;
                    }

                    return CoreLoginHelper.instance.goToSiteInitialPage({
                        redirectPage: redirectData.page,
                        redirectParams: redirectData.params,
                    });
                } catch (error) {
                    // Site doesn't exist.
                    return this.loadPage();
                }
            } else {
                // No site to load, open the page.
                return CoreLoginHelper.instance.goToNoSitePage(redirectData.page, redirectData.params);
            }
        }

        return this.loadPage();
    }

    /**
     * Load the right page.
     *
     * @return Promise resolved when done.
     */
    protected async loadPage(): Promise<void> {
        if (CoreSites.instance.isLoggedIn()) {
            if (CoreLoginHelper.instance.isSiteLoggedOut()) {
                await CoreSites.instance.logout();

                return this.loadPage();
            }

            return CoreLoginHelper.instance.goToSiteInitialPage();
        }

        await this.navCtrl.navigateRoot('/login/sites');
    }

}
