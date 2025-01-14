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
import { AddonBadges, AddonBadgesUserBadge } from '../../services/badges';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreNavigator } from '@services/navigator';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { AddonBadgesUserBadgesSource } from '@addons/badges/classes/user-badges-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import { Translate } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays the list of calendar events.
 */
@Component({
    selector: 'page-addon-badges-user-badges',
    templateUrl: 'user-badges.html',
})
export class AddonBadgesUserBadgesPage implements AfterViewInit, OnDestroy {

    currentTime = 0;
    badges: CoreListItemsManager<AddonBadgesUserBadge, AddonBadgesUserBadgesSource>;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected logView: () => void;

    constructor() {
        let courseId = CoreNavigator.getRouteNumberParam('courseId') ?? 0; // Use 0 for site badges.
        const userId = CoreNavigator.getRouteNumberParam('userId') ?? CoreSites.getCurrentSiteUserId();

        if (courseId === CoreSites.getCurrentSiteHomeId()) {
            // Use courseId 0 for site home, otherwise the site doesn't return site badges.
            courseId = 0;
        }

        this.badges = new CoreListItemsManager(
            CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(AddonBadgesUserBadgesSource, [courseId, userId]),
            AddonBadgesUserBadgesPage,
        );

        this.logView = CoreTime.once(() => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_badges_view_user_badges',
                name: Translate.instant('addon.badges.badges'),
                data: { courseId: this.badges.getSource().COURSE_ID, category: 'badges' },
                url: '/badges/mybadges.php',
            });
        });
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
    async refreshBadges(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(
            AddonBadges.invalidateUserBadges(
                this.badges.getSource().COURSE_ID,
                this.badges.getSource().USER_ID,
            ),
        );
        await CorePromiseUtils.ignoreErrors(this.badges.reload());

        refresher?.complete();
    }

    /**
     * Obtain the initial list of badges.
     */
    private async fetchInitialBadges(): Promise<void> {
        this.currentTime = CoreTimeUtils.timestamp();

        try {
            await this.badges.reload();

            this.logView();
        } catch (message) {
            CoreAlerts.showError(message, { default: 'Error loading badges' });

            this.badges.reset();
        }
    }

}
