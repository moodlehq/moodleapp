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
import { ModalController } from '@singletons';

/**
 * Modal that displays a list of sites to be able to enter or delete a site.
 */
@Component({
    selector: 'core-login-sites-modal',
    templateUrl: 'sites-modal.html',
    animations: [CoreAnimations.SLIDE_IN_OUT, CoreAnimations.SHOW_HIDE],
})
export class CoreLoginSitesModalComponent implements OnInit {

    accountsList: CoreAccountsList = {
        sameSite: [],
        otherSites: [],
        count: 0,
    };

    showDelete = false;
    currentSiteId: string;
    loaded = false;

    constructor() {
        this.currentSiteId = CoreSites.getRequiredCurrentSite().getId();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.accountsList = await CoreLoginHelper.getAccountsList();
        this.loaded = true;
    }

    /**
     * Go to the page to add a site.
     *
     * @param event Click event.
     */
    async add(event: Event): Promise<void> {
        await this.close(event, true);

        await CoreLoginHelper.goToAddSite(true, true);
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
        } catch {
            // User cancelled, stop.
            return;
        }

        try {
            await CoreLoginHelper.deleteAccountFromList(this.accountsList, site);

            this.showDelete = false;
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
        await this.close(undefined, true);

        // This navigation will logout and navigate to the site home.
        await CoreNavigator.navigateToSiteHome({ preferCurrentTab: false , siteId: site.id });
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Close modal.
     *
     * @param event Click event.
     */
    async close(event?: Event, closeAll = false): Promise<void> {
        event?.preventDefault();
        event?.stopPropagation();

        await ModalController.dismiss(closeAll);
    }

}
