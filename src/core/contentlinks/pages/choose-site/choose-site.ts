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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksDelegate, CoreContentLinksAction } from '../../providers/delegate';
import { CoreContentLinksHelperProvider } from '../../providers/helper';

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

    constructor(private navCtrl: NavController, navParams: NavParams, private contentLinksDelegate: CoreContentLinksDelegate,
            private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider) {
        this.url = navParams.get('url');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.url) {
            return this.leaveView();
        }

        // Get the action to perform.
        this.contentLinksDelegate.getActionsFor(this.url).then((actions) => {
            this.action = this.contentLinksHelper.getFirstValidAction(actions);
            if (!this.action) {
                return Promise.reject(null);
            }

            // Get the sites that can perform the action.
            return this.sitesProvider.getSites(this.action.sites).then((sites) => {
                this.sites = sites;
            });
        }).catch(() => {
            this.domUtils.showErrorModal('core.contentlinks.errornosites', true);
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
     * @param {string} siteId Site ID.
     */
    siteClicked(siteId: string): void {
        this.action.action(siteId, this.navCtrl);
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
