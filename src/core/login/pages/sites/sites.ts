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
import { CoreLoggerProvider } from '../../../../providers/logger';
import { CoreSitesProvider, CoreSiteBasicInfo } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../../providers/utils/text';
import { CoreLoginHelperProvider } from '../../providers/helper';

/**
 * Page that displays the list of stored sites.
 */
@IonicPage()
@Component({
    selector: 'page-core-login-sites',
    templateUrl: 'sites.html',
})
export class CoreLoginSitesPage {
    sites: CoreSiteBasicInfo[];
    showDelete: boolean;
    protected logger;

    constructor(private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
            private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
            private translate: TranslateService, logger: CoreLoggerProvider) {
        this.logger = logger.getInstance('CoreLoginSitesPage');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        this.sitesProvider.getSites().then((sites) => {
            // Remove protocol from the url to show more url text.
            sites = sites.map((site) => {
                site.siteUrl = site.siteUrl.replace(/^https?:\/\//, '');
                site.badge = 10;
                // @todo: Implement it once push notifications addon is implemented.
                // if ($mmaPushNotifications) {
                //     $mmaPushNotifications.getSiteCounter(site.id).then(function(number) {
                //         site.badge = number;
                //     });
                // }
                return site;
            });

            // Sort sites by url and fullname.
            this.sites = sites.sort((a, b) => {
                // First compare by site url without the protocol.
                let compareA = a.siteUrl.toLowerCase(),
                    compareB = b.siteUrl.toLowerCase(),
                    compare = compareA.localeCompare(compareB);

                if (compare !== 0) {
                    return compare;
                }

                // If site url is the same, use fullname instead.
                compareA = a.fullName.toLowerCase().trim();
                compareB = b.fullName.toLowerCase().trim();
                return compareA.localeCompare(compareB);
            });

            this.showDelete = false;
        }).catch(() => {
            // Shouldn't happen.
        });
    }

    /**
     * Go to the page to add a site.
     */
    add() : void {
        this.loginHelper.goToAddSite(false);
    }

    /**
     * Delete a site.
     *
     * @param {Event} e Click event.
     * @param {number} index Position of the site.
     */
    deleteSite(e: Event, index: number) : void {
        e.stopPropagation();

        let site = this.sites[index],
            siteName = site.siteName;

        this.textUtils.formatText(siteName).then((siteName) => {
            this.domUtils.showConfirm(this.translate.instant('core.login.confirmdeletesite', {sitename: siteName})).then(() => {
                this.sitesProvider.deleteSite(site.id).then(() => {
                    this.sites.splice(index, 1);
                    this.showDelete = false;

                    // If there are no sites left, go to add site.
                    this.sitesProvider.hasNoSites().then(() => {
                        this.loginHelper.goToAddSite(true);
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
    login(siteId: string) : void {
        let modal = this.domUtils.showModalLoading();

        this.sitesProvider.loadSite(siteId).then(() => {
            if (!this.loginHelper.isSiteLoggedOut()) {
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
    toggleDelete() : void {
        this.showDelete = !this.showDelete;
    }
}
