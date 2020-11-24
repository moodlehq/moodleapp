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
import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreContentLinksAction } from '../../services/contentlinks-delegate';
import { CoreContentLinksHelper } from '../../services/contentlinks-helper';
import { ActivatedRoute } from '@angular/router';
import { CoreError } from '@classes/errors/error';

/**
 * Page to display the list of sites to choose one to perform a content link action.
 *
 * @todo Include routing and testing.
 */
@Component({
    selector: 'page-core-content-links-choose-site',
    templateUrl: 'choose-site.html',
})
export class CoreContentLinksChooseSitePage implements OnInit {

    url: string;
    sites: CoreSiteBasicInfo[] = [];
    loaded = false;
    protected action?: CoreContentLinksAction;
    protected isRootURL = false;

    constructor(
        route: ActivatedRoute,
        protected navCtrl: NavController,
    ) {
        this.url = route.snapshot.queryParamMap.get('url')!;
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (!this.url) {
            return this.leaveView();
        }

        let siteIds: string[] | undefined = [];

        try {
            // Check if it's the root URL.
            const data = await CoreSites.instance.isStoredRootURL(this.url);
            if (data.site) {
                // It's the root URL.
                this.isRootURL = true;

                siteIds = data.siteIds;
            } else if (data.siteIds.length) {
                // Not root URL, but the URL belongs to at least 1 site. Check if there is any action to treat the link.
                this.action = await CoreContentLinksHelper.instance.getFirstValidActionFor(this.url);
                if (!this.action) {
                    throw new CoreError(Translate.instance.instant('core.contentlinks.errornoactions'));
                }

                siteIds = this.action.sites;
            } else {
                // No sites to treat the URL.
                throw new CoreError(Translate.instance.instant('core.contentlinks.errornosites'));
            }

            // Get the sites that can perform the action.
            this.sites = await CoreSites.instance.getSites(siteIds);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.contentlinks.errornosites', true);
            this.leaveView();
        }

        this.loaded = true;
    }

    /**
     * Cancel.
     */
    cancel(): void {
        this.leaveView();
    }

    /**
     * Perform the action on a certain site.
     *
     * @param siteId Site ID.
     */
    siteClicked(siteId: string): void {
        if (this.isRootURL) {
            CoreLoginHelper.instance.redirect('', {}, siteId);
        } else if (this.action) {
            this.action.action(siteId);
        }
    }

    /**
     * Cancel and leave the view.
     */
    protected async leaveView(): Promise<void> {
        try {
            await CoreSites.instance.logout();
        } finally {
            await this.navCtrl.navigateRoot('/login/sites');
        }
    }

}
