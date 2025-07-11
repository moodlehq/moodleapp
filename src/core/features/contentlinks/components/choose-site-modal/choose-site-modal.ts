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

import { Component, Input, OnInit } from '@angular/core';
import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { ModalController, Translate } from '@singletons';
import { CoreContentLinksAction } from '../../services/contentlinks-delegate';
import { CoreContentLinksHelper } from '../../services/contentlinks-helper';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreAlerts } from '@services/overlays/alerts';

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

    @Input({ required: true }) url!: string;

    sites: CoreSiteBasicInfo[] = [];
    loaded = false;
    displaySiteUrl = false;
    protected action?: CoreContentLinksAction;
    protected isRootURL = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.url) {
            return this.closeModal();
        }

        let siteIds: string[] | undefined = [];

        try {
            // Check if it's the root URL.
            const data = await CoreSites.isStoredRootURL(this.url);
            if (data.site) {
                // It's the root URL.
                this.isRootURL = true;

                siteIds = data.siteIds;
            } else if (data.siteIds.length) {
                // Not root URL, but the URL belongs to at least 1 site. Check if there is any action to treat the link.
                this.action = await CoreContentLinksHelper.getFirstValidActionFor(this.url);
                if (!this.action) {
                    throw new CoreError(Translate.instant('core.contentlinks.errornoactions'));
                }

                siteIds = this.action.sites;
            } else {
                // No sites to treat the URL.
                throw new CoreError(Translate.instant('core.contentlinks.errornosites'));
            }

            // Get the sites that can perform the action.
            this.sites = await CoreSites.getSites(siteIds);

            // All sites have the same URL, use the first one.
            this.displaySiteUrl = CoreSitesFactory.makeUnauthenticatedSite(this.sites[0].siteUrl).shouldDisplayInformativeLinks();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.contentlinks.errornosites') });
            this.closeModal();
        }

        this.loaded = true;
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
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
