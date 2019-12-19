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
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksDelegate, CoreContentLinksAction } from '../../providers/delegate';
import { CoreContentLinksHelperProvider } from '../../providers/helper';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';

/**
 * Page to display the list of sites to choose one to perform a content link action.
 */
@IonicPage({ segment: 'core-content-links-choose-site' })
@Component({
    selector: 'page-core-content-links-choose-site',
    templateUrl: 'choose-site.html',
})
export class CoreContentLinksChooseSitePage implements OnInit {

    url: string;
    sites: any[];
    loaded: boolean;
    protected action: CoreContentLinksAction;
    protected isRootURL: boolean;

    constructor(private navCtrl: NavController, navParams: NavParams, private contentLinksDelegate: CoreContentLinksDelegate,
            private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider, private translate: TranslateService,
            private contentLinksHelper: CoreContentLinksHelperProvider, private loginHelper: CoreLoginHelperProvider) {
        this.url = navParams.get('url');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.url) {
            return this.leaveView();
        }

        // Check if it's the root URL.
        this.sitesProvider.isStoredRootURL(this.url).then((data): any => {
            if (data.site) {
                // It's the root URL.
                this.isRootURL = true;

                return data.siteIds;
            } else if (data.siteIds.length) {
                // Not root URL, but the URL belongs to at least 1 site. Check if there is any action to treat the link.
                return this.contentLinksDelegate.getActionsFor(this.url).then((actions): any => {
                    this.action = this.contentLinksHelper.getFirstValidAction(actions);
                    if (!this.action) {
                        return Promise.reject(this.translate.instant('core.contentlinks.errornoactions'));
                    }

                    return this.action.sites;
                });
            } else {
                // No sites to treat the URL.
                return Promise.reject(this.translate.instant('core.contentlinks.errornosites'));
            }
        }).then((siteIds) => {
            // Get the sites that can perform the action.
            return this.sitesProvider.getSites(siteIds);
        }).then((sites) => {
            this.sites = sites;

        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.contentlinks.errornosites', true);
            this.leaveView();
        }).finally(() => {
            this.loaded = true;
        });
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
            this.loginHelper.redirect('', {}, siteId);
        } else {
            this.action.action(siteId, this.navCtrl);
        }
    }

    /**
     * Cancel and leave the view.
     */
    protected leaveView(): void {
        this.sitesProvider.logout().finally(() => {
            this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    }
}
