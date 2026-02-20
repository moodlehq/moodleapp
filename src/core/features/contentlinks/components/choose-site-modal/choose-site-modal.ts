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

import { Component, OnInit, computed, input, signal } from '@angular/core';
import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { ModalController, Translate } from '@singletons';
import { CoreContentLinksAction } from '../../services/contentlinks-delegate';
import { CoreContentLinksHelper } from '../../services/contentlinks-helper';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreAlerts } from '@services/overlays/alerts';
import { NO_SITE_ID } from '@features/login/constants';

/**
 * Page to display the list of sites to choose one to perform a content link action.
 */
@Component({
    selector: 'core-content-links-choose-site-modal',
    templateUrl: 'choose-site-modal.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreContentLinksChooseSiteModalComponent implements OnInit {

    readonly url = input.required<string>();

    readonly sites = signal<CoreSiteBasicInfo[]>([]);
    readonly loaded = signal(false);
    readonly siteUrl = computed(() => {
        if (!this.sites().length) {
            return false;
        }
        const displayUrl = CoreSitesFactory.makeUnauthenticatedSite(this.sites()[0].siteUrl).shouldDisplayInformativeLinks();

        // All sites have the same URL, use the first one.
        return displayUrl
            ? this.sites()[0].siteUrl.replace(/^https?:\/\//, '').toLowerCase()
            : false;
    });

    readonly siteName = computed(() => {
        if (!this.sites().length) {
            return false;
        }

        // All sites have the same name, use the first one.
        return this.sites()[0].siteName;
    });

    protected action?: CoreContentLinksAction;
    protected isRootURL = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const url = this.url();
        let siteIds: string[] | undefined = [];

        try {
            // Check if it's the root URL.
            const data = await CoreSites.isStoredRootURL(url);
            if (data.site) {
                // It's the root URL.
                this.isRootURL = true;

                siteIds = data.siteIds;
            } else if (data.siteIds.length) {
                // Not root URL, but the URL belongs to at least 1 site. Check if there is any action to treat the link.
                this.action = await CoreContentLinksHelper.getFirstValidActionFor(url);
                if (!this.action) {
                    throw new CoreError(Translate.instant('core.contentlinks.errornoactions'));
                }

                siteIds = this.action.sites;
            } else {
                // No sites to treat the URL.
                throw new CoreError(Translate.instant('core.contentlinks.errornosites'));
            }

            // Get the sites that can perform the action.
            const sites = await CoreSites.getSites(siteIds);
            this.sites.set(sites);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.contentlinks.errornosites') });
            this.closeModal();
        }

        this.loaded.set(true);
    }

    /**
     * Perform the action on a certain site.
     *
     * @param siteId Site ID.
     */
    async siteClicked(siteId: string): Promise<void> {
        await ModalController.dismiss();

        if (this.isRootURL) {
            CoreNavigator.navigateToSiteHome({ siteId });
        } else if (this.action) {
            this.action.action(siteId);
        }
    }

    /**
     * Handler for adding a new site.
     */
    async addNewSite(): Promise<void> {
        if (!this.sites().length) {
            return;
        }

        const siteUrl = this.sites()[0].siteUrl;

        const pageParams = {
            siteUrl,
            urlToOpen: this.url(),
        };

        if (CoreSites.isLoggedIn()) {
            // Ask the user before changing site.
            try {
                await CoreAlerts.confirm(Translate.instant('core.contentlinks.confirmurlothersite'));
            } catch {
                return; // User canceled.
            }

            this.closeModal();

            await CoreSites.logout({
                siteId: NO_SITE_ID,
                redirectPath: '/login/credentials',
                redirectOptions: { params: pageParams },
            });

            return;
        }

        this.closeModal();

        await CoreNavigator.navigateToLoginCredentials(pageParams);
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
