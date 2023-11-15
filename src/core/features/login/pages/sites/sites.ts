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
import { Component, OnInit } from '@angular/core';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreAccountsList, CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreAnimations } from '@components/animations';

/**
 * Page that displays the list of sites stored in the device.
 */
@Component({
    selector: 'page-core-login-sites',
    templateUrl: 'sites.html',
    animations: [CoreAnimations.SLIDE_IN_OUT, CoreAnimations.SHOW_HIDE],
})
export class CoreLoginSitesPage implements OnInit {

    accountsList: CoreAccountsList = {
        sameSite: [],
        otherSites: [],
        count: 0,
    };

    showDelete = false;
    loaded = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (CoreNavigator.getRouteBooleanParam('openAddSite')) {
            this.add();
        }

        this.accountsList = await CoreLoginHelper.getAccountsList();
        this.loaded = true;

        if (this.accountsList.count == 0 && !CoreNavigator.getRouteBooleanParam('openAddSite')) {
            this.add();
        }
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
     * @param event Click event.
     * @param site Site to delete.
     * @returns Promise resolved when done.
     */
    async deleteSite(event: Event, site: CoreSiteBasicInfo): Promise<void> {
        event.stopPropagation();

        let siteName = site.siteName || '';

        siteName = await CoreFilter.formatText(siteName, { clean: true, singleLine: true, filter: false }, [], site.id);

        try {
            await CoreDomUtils.showDeleteConfirm('core.login.confirmdeletesite', { sitename: siteName });
        } catch (error) {
            // User cancelled, stop.
            return;
        }

        try {
            await CoreLoginHelper.deleteAccountFromList(this.accountsList, site);

            this.showDelete = false;

            // If there are no sites left, go to add site.
            if (this.accountsList.count == 0) {
                CoreLoginHelper.goToAddSite(true, true);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.login.errordeletesite', true);
        }
    }

    /**
     * Login in a site.
     *
     * @param site The site.
     * @returns Promise resolved when done.
     */
    async login(site: CoreSiteBasicInfo): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const loggedIn = await CoreSites.loadSite(site.id);

            if (loggedIn) {
                await CoreNavigator.navigateToSiteHome();

                return;
            }
        } catch (error) {
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
