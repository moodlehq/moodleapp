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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { AddonBadgesProvider, AddonBadgesUserBadge } from '../../providers/badges';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

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
    badges: AddonBadgesUserBadge[] = [];
    currentTime = 0;
    badgeHash: string;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, private badgesProvider: AddonBadgesProvider,
            private domUtils: CoreDomUtilsProvider, private timeUtils: CoreTimeUtilsProvider) {

        this.courseId = navParams.get('courseId') || 0; // Use 0 for site badges.
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSite().getUserId();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {

        this.fetchBadges().finally(() => {
            if (!this.badgeHash && this.splitviewCtrl.isOn() && this.badges.length > 0) {
                // Take first and load it.
                this.loadIssuedBadge(this.badges[0].uniquehash);
            }
            this.badgesLoaded = true;
        });
    }

    /**
     * Fetch all the badges required for the view.
     *
     * @return Promise resolved when done.
     */
    fetchBadges(): Promise<any> {
        this.currentTime = this.timeUtils.timestamp();

        return this.badgesProvider.getUserBadges(this.courseId, this.userId).then((badges) => {
            this.badges = badges;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting badges data.');
        });
    }

    /**
     * Refresh the badges.
     *
     * @param refresher Refresher.
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
     * @param badgeHash Badge to load.
     */
    loadIssuedBadge(badgeHash: string): void {
        this.badgeHash = badgeHash;
        const params = {courseId: this.courseId, userId: this.userId, badgeHash: badgeHash};
        this.splitviewCtrl.push('AddonBadgesIssuedBadgePage', params);
    }
}
