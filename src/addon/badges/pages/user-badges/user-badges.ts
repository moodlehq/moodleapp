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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonBadgesProvider } from '../../providers/badges';
import { CoreTimeUtilsProvider } from '../../../../providers/utils/time';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreSplitViewComponent } from '../../../../components/split-view/split-view';

/**
 * Page that displays the list of calendar events.
 */
@IonicPage({ segment: 'addon-badges-user-badges' })
@Component({
    selector: 'page-addon-badges-user-badges',
    templateUrl: 'user-badges.html',
})
export class AddonBadgesUserBadgesPage {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    courseId: number;
    userId: number;

    badgesLoaded = false;
    badges = [];
    currentTime = 0;
    badgeHash = '';

    constructor(private translate: TranslateService, private badgesProvider: AddonBadgesProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            sitesProvider: CoreSitesProvider, private navCtrl: NavController) {

        this.courseId = navParams.get('courseId') || 0; // Use 0 for site badges.
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSite().getUserId();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {

        this.fetchBadges().finally(() => {
            this.badgesLoaded = true;
        });
    }

    /**
     * Fetch all the badges required for the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchBadges(): Promise<any> {
        this.currentTime = this.timeUtils.timestamp();

        return this.badgesProvider.getUserBadges(this.courseId, this.userId).then((badges) => {
            this.badges = badges;
        }).catch((message) => {
            if (message) {
                this.domUtils.showErrorModal(message);
            } else {
                this.domUtils.showErrorModal('Error getting badges data.');
            }

            return Promise.reject(null);
        });
    }

    /**
     * Refresh the badges.
     *
     * @param {any} refresher Refresher.
     */
    refreshBadges(refresher: any): void {
        this.badgesProvider.invalidateUserBadges(this.courseId, this.userId).finally(() => {
            this.fetchBadges().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to a particular badge.
     *
     * @param {string} badgeHash Badge to load.
     */
    loadIssuedBadge(badgeHash: string): void {
        this.badgeHash = badgeHash;
        //this.splitviewCtrl.push('', { id:  });
    }
}
