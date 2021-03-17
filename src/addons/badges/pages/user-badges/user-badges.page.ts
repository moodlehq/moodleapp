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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { AddonBadges, AddonBadgesUserBadge } from '../../services/badges';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { Params } from '@angular/router';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the list of calendar events.
 */
@Component({
    selector: 'page-addon-badges-user-badges',
    templateUrl: 'user-badges.html',
})
export class AddonBadgesUserBadgesPage implements AfterViewInit, OnDestroy {

    currentTime = 0;
    badges: AddonBadgesUserBadgesManager;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const courseId = CoreNavigator.getRouteNumberParam('courseId') ?? 0; // Use 0 for site badges.
        const userId = CoreNavigator.getRouteNumberParam('userId') ?? CoreSites.getCurrentSiteUserId();

        this.badges = new AddonBadgesUserBadgesManager(AddonBadgesUserBadgesPage, courseId, userId);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchInitialBadges();

        this.badges.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.badges.destroy();
    }

    /**
     * Refresh the badges.
     *
     * @param refresher Refresher.
     */
    async refreshBadges(refresher?: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(AddonBadges.invalidateUserBadges(this.badges.courseId, this.badges.userId));
        await CoreUtils.ignoreErrors(this.fetchBadges());

        refresher?.complete();
    }

    /**
     * Obtain the initial list of badges.
     */
    private async fetchInitialBadges(): Promise<void> {
        this.currentTime = CoreTimeUtils.timestamp();

        try {
            await this.fetchBadges();
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'Error loading badges');

            this.badges.setItems([]);
        }
    }

    /**
     * Update the list of badges.
     */
    private async fetchBadges(): Promise<void> {
        const badges = await AddonBadges.getUserBadges(this.badges.courseId, this.badges.userId);

        this.badges.setItems(badges);
    }

}

/**
 * Helper class to manage badges.
 */
class AddonBadgesUserBadgesManager extends CorePageItemsListManager<AddonBadgesUserBadge> {

    courseId: number;
    userId: number;

    constructor(pageComponent: unknown, courseId: number, userId: number) {
        super(pageComponent);

        this.courseId = courseId;
        this.userId = userId;
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(badge: AddonBadgesUserBadge): string {
        return badge.uniquehash;
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(): Params {
        return {
            courseId: this.courseId,
            userId: this.userId,
        };
    }

}
