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
import { Router } from '@angular/router';

import { CoreApp } from '@services/app';
import { CoreInit } from '@services/init';
import { CoreConstants } from '@core/constants';
import { SplashScreen } from '@singletons/core.singletons';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@Component({
    selector: 'page-core-login-init',
    templateUrl: 'init.html',
    styleUrls: ['init.scss'],
})
export class CoreLoginInitPage implements OnInit {

    constructor(protected router: Router) {}

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        // Wait for the app to be ready.
        CoreInit.instance.ready().then(() => {
            // Check if there was a pending redirect.
            const redirectData = CoreApp.instance.getRedirect();
            if (redirectData.siteId) {
                // Unset redirect data.
                CoreApp.instance.storeRedirect('', '', '');

                // Only accept the redirect if it was stored less than 20 seconds ago.
                if (Date.now() - redirectData.timemodified < 20000) {
                    // if (redirectData.siteId != CoreConstants.NO_SITE_ID) {
                    //     // The redirect is pointing to a site, load it.
                    //     return this.sitesProvider.loadSite(redirectData.siteId, redirectData.page, redirectData.params)
                    //             .then((loggedIn) => {

                    //         if (loggedIn) {
                    //             return this.loginHelper.goToSiteInitialPage(this.navCtrl, redirectData.page, redirectData.params,
                    //                     { animate: false });
                    //         }
                    //     }).catch(() => {
                    //         // Site doesn't exist.
                    //         return this.loadPage();
                    //     });
                    // } else {
                    //     // No site to load, open the page.
                    //     return this.loginHelper.goToNoSitePage(this.navCtrl, redirectData.page, redirectData.params);
                    // }
                }
            }

            return this.loadPage();
        }).then(() => {
            // If we hide the splash screen now, the init view is still seen for an instant. Wait a bit to make sure it isn't seen.
            setTimeout(() => {
                SplashScreen.instance.hide();
            }, 100);
        });
    }

    /**
     * Load the right page.
     *
     * @return Promise resolved when done.
     */
    protected async loadPage(): Promise<void> {
        // if (this.sitesProvider.isLoggedIn()) {
        //     if (this.loginHelper.isSiteLoggedOut()) {
        //         return this.sitesProvider.logout().then(() => {
        //             return this.loadPage();
        //         });
        //     }

        //     return this.loginHelper.goToSiteInitialPage();
        // }

        await this.router.navigate(['/login/site']);
    }
}
