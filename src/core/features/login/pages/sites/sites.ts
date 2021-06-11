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

import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Component, OnInit } from '@angular/core';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreLogger } from '@singletons/logger';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreNavigator } from '@services/navigator';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreAnimations } from '@components/animations';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@Component({
    selector: 'page-core-login-sites',
    templateUrl: 'sites.html',
    animations: [CoreAnimations.SLIDE_IN_OUT],
})
export class CoreLoginSitesPage implements OnInit {

    sites: CoreSiteBasicInfo[] = [];
    showDelete = false;

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreLoginSitesPage');
    }

    /**
     * Component being initialized.
     *
     * @return Promise resolved when done.
     */
    async ngOnInit(): Promise<void> {
        const sites = await CoreUtils.ignoreErrors(CoreSites.getSortedSites(), [] as CoreSiteBasicInfo[]);

        // Remove protocol from the url to show more url text.
        this.sites = await Promise.all(sites.map(async (site) => {
            site.siteUrl = site.siteUrl.replace(/^https?:\/\//, '');
            site.badge = await CoreUtils.ignoreErrors(CorePushNotifications.getSiteCounter(site.id)) || 0;

            return site;
        }));

        this.showDelete = false;
    }

    /**
     * Go to the page to add a site.
     */
    add(): void {
        CoreLoginHelper.goToAddSite(false, true);
    }

    /**
     * Delete a site.
     *
     * @param e Click event.
     * @param site Site to delete.
     * @return Promise resolved when done.
     */
    async deleteSite(e: Event, site: CoreSiteBasicInfo): Promise<void> {
        e.stopPropagation();

        let siteName = site.siteName || '';

        siteName = await CoreFilter.formatText(siteName, { clean: true, singleLine: true, filter: false }, [], site.id);

        try {
            await CoreDomUtils.showDeleteConfirm('core.login.confirmdeletesite', { sitename: siteName });
        } catch (error) {
            // User cancelled, stop.
            return;
        }

        try {
            await CoreSites.deleteSite(site.id);

            const index = this.sites.findIndex((listedSite) => listedSite.id == site.id);
            index >= 0 && this.sites.splice(index, 1);
            this.showDelete = false;

            // If there are no sites left, go to add site.
            const hasSites = await CoreSites.hasSites();

            if (!hasSites) {
                CoreLoginHelper.goToAddSite(true, true);
            }
        } catch (error) {
            this.logger.error('Error deleting site ' + site.id, error);
            CoreDomUtils.showErrorModalDefault(error, 'core.login.errordeletesite', true);
        }
    }

    /**
     * Login in a site.
     *
     * @param siteId The site ID.
     * @return Promise resolved when done.
     */
    async login(siteId: string): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const loggedIn = await CoreSites.loadSite(siteId);

            if (loggedIn) {
                await CoreNavigator.navigateToSiteHome();

                return;
            }
        } catch (error) {
            this.logger.error('Error loading site ' + siteId, error);
            CoreDomUtils.showErrorModalDefault(error, 'Error loading site.');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Open settings page.
     */
    openSettings(): void {
        CoreNavigator.navigate('/settings');
    }

}
