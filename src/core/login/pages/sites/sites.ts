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
import { IonicPage } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteBasicInfo } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CoreLoginHelperProvider } from '../../providers/helper';

/**
 * Page that displays the list of stored sites.
 */
@IonicPage({ segment: 'core-login-sites' })
@Component({
    selector: 'page-core-login-sites',
    templateUrl: 'sites.html',
})
export class CoreLoginSitesPage {
    sites: CoreSiteBasicInfo[];
    showDelete: boolean;
    protected logger;

    constructor(private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
            private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider, logger: CoreLoggerProvider,
            private translate: TranslateService, private pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = logger.getInstance('CoreLoginSitesPage');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.sitesProvider.getSortedSites().then((sites) => {
            // Remove protocol from the url to show more url text.
            this.sites = sites.map((site) => {
                site.siteUrl = site.siteUrl.replace(/^https?:\/\//, '');
                site.badge = 0;
                this.pushNotificationsProvider.getSiteCounter(site.id).then((counter) => {
                    site.badge = counter;
                });

                return site;
            });

            this.showDelete = false;
        }).catch(() => {
            // Shouldn't happen.
        });
    }

    /**
     * Go to the page to add a site.
     */
    add(): void {
        this.loginHelper.goToAddSite(false, true);
    }

    /**
     * Delete a site.
     *
     * @param {Event} e Click event.
     * @param {number} index Position of the site.
     */
    deleteSite(e: Event, index: number): void {
        e.stopPropagation();

        const site = this.sites[index],
            siteName = site.siteName;

        this.textUtils.formatText(siteName).then((siteName) => {
            this.domUtils.showConfirm(this.translate.instant('core.login.confirmdeletesite', { sitename: siteName })).then(() => {
                this.sitesProvider.deleteSite(site.id).then(() => {
                    this.sites.splice(index, 1);
                    this.showDelete = false;

                    // If there are no sites left, go to add site.
                    this.sitesProvider.hasSites().then((hasSites) => {
                        if (!hasSites) {
                            this.loginHelper.goToAddSite(true, true);
                        }
                    });
                }).catch((error) => {
                    this.logger.error('Error deleting site ' + site.id, error);
                    this.domUtils.showErrorModalDefault(error, 'Delete site failed.');
                    this.domUtils.showErrorModal('core.login.errordeletesite', true);
                });
            }).catch(() => {
                // User cancelled, nothing to do.
            });
        });
    }

    /**
     * Login in a site.
     *
     * @param {string} siteId The site ID.
     */
    login(siteId: string): void {
        const modal = this.domUtils.showModalLoading();

        this.sitesProvider.loadSite(siteId).then((loggedIn) => {
            if (loggedIn) {
                return this.loginHelper.goToSiteInitialPage();
            }
        }).catch((error) => {
            this.logger.error('Error loading site ' + siteId, error);
            this.domUtils.showErrorModalDefault(error, 'Error loading site.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }
}
