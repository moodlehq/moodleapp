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
import { CoreSites } from '@services/sites';
import { CoreConstants } from '@/core/constants';
import { CoreNavigationOptions, CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CoreRedirects } from '@singletons/redirects';
import { NO_SITE_ID } from '@features/login/constants';

/**
 * Page that logs the user out.
 */
@Component({
    selector: 'page-core-login-logout',
    templateUrl: 'logout.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreLoginLogoutPage implements OnInit {

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const siteId = CoreNavigator.getRouteParam('siteId') ?? NO_SITE_ID;
        const logoutOptions = {
            forceLogout: CoreNavigator.getRouteBooleanParam('forceLogout'),
            removeAccount: CoreNavigator.getRouteBooleanParam('removeAccount') ?? !!CoreConstants.CONFIG.removeaccountonlogout,
        };
        const redirectData = {
            redirectPath: CoreNavigator.getRouteParam('redirectPath'),
            redirectOptions: CoreNavigator.getRouteParam<CoreNavigationOptions>('redirectOptions'),
            urlToOpen: CoreNavigator.getRouteParam('urlToOpen'),
        };

        if (!CoreSites.getCurrentSite()) {
            // This page shouldn't open if user isn't logged in, but if that happens just navigate to the right page.
            await this.navigateAfterLogout(siteId, redirectData);

            return;
        }

        const shouldReload = CoreSitePlugins.hasSitePluginsLoaded;
        if (shouldReload && (siteId !== NO_SITE_ID || redirectData.redirectPath || redirectData.urlToOpen)) {
            // The app will reload and we need to open a page that isn't the default page. Store the redirect first.
            CoreRedirects.storeRedirect(siteId, redirectData);
        }

        await CoreSites.internalLogout(logoutOptions);

        if (shouldReload) {
            // We need to reload the app to unload all the plugins. Leave the logout page first.
            await CoreNavigator.navigate('/login', { reset: true });

            // The ionViewWillLeave callback will also be called in this case because of the navigation, but we call
            // finishLogoutProcess before the reload just in case, to make sure the promise is resolved before reloading.
            CoreSites.finishLogoutProcess();

            window.location.reload();

            return;
        }

        await this.navigateAfterLogout(siteId, redirectData);
    }

    /**
     * Navigate to the right page after logout is done.
     *
     * @param siteId Site ID to load.
     * @param redirectData Redirect data.
     */
    protected async navigateAfterLogout(siteId: string, redirectData: CoreRedirectPayload): Promise<void> {
        if (siteId === NO_SITE_ID) {
            // No site to load now, just navigate.
            await CoreNavigator.navigate(redirectData.redirectPath ?? '/login/sites', {
                ...redirectData.redirectOptions,
                reset: true,
            });

            return;
        }

        // Load the site and navigate.
        const loggedIn = await CoreSites.loadSite(siteId, redirectData);
        if (!loggedIn) {
            return; // Session expired.
        }

        await CoreNavigator.navigateToSiteHome({ params: redirectData, preferCurrentTab: false, siteId });
    }

    /**
     * The page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        CoreSites.finishLogoutProcess();
    }

}
