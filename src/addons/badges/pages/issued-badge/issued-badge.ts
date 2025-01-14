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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites } from '@services/sites';
import { CoreUser } from '@features/user/services/user';
import { AddonBadges, AddonBadgesUserBadge } from '../../services/badges';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreNavigator } from '@services/navigator';
import { ActivatedRoute } from '@angular/router';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { AddonBadgesUserBadgesSource } from '@addons/badges/classes/user-badges-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays an issued badge.
 */
@Component({
    selector: 'page-addon-badges-issued-badge',
    templateUrl: 'issued-badge.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonBadgesIssuedBadgePage implements OnInit, OnDestroy {

    protected badgeHash = '';
    protected userId!: number;
    protected logView: (badge: AddonBadgesUserBadge) => void;

    courseId = 0;
    badge?: AddonBadgesUserBadge;
    badges?: CoreSwipeNavigationItemsManager;
    badgeLoaded = false;
    currentTime = 0;

    constructor(protected route: ActivatedRoute) {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || this.courseId; // Use 0 for site badges.
        this.userId = CoreNavigator.getRouteNumberParam('userId') || CoreSites.getRequiredCurrentSite().getUserId();
        this.badgeHash = CoreNavigator.getRouteParam('badgeHash') || '';

        const routeData = CoreNavigator.getRouteData(this.route);
        if (routeData.usesSwipeNavigation) {
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonBadgesUserBadgesSource,
                [this.courseId, this.userId],
            );

            this.badges = new CoreSwipeNavigationItemsManager(source);
        }

        this.logView = CoreTime.once((badge) => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_badges_view_user_badges',
                name: badge.name,
                data: { id: badge.uniquehash, category: 'badges' },
                url: `/badges/badge.php?hash=${badge.uniquehash}`,
            });
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchIssuedBadge().finally(() => {
            this.badgeLoaded = true;
        });

        this.badges?.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.badges?.destroy();
    }

    /**
     * Fetch the issued badge required for the view.
     *
     * @returns Promise resolved when done.
     */
    async fetchIssuedBadge(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        this.currentTime = CoreTimeUtils.timestamp();

        try {
            // Search the badge in the user badges.
            const badges = await AddonBadges.getUserBadges(this.courseId, this.userId);
            let badge = badges.find((badge) => this.badgeHash == badge.uniquehash);

            if (badge) {
                if (!site.isVersionGreaterEqualThan('4.5')) {
                    // Web service does not return the name of the recipient.
                    const user = await CoreUser.getProfile(this.userId, this.courseId, true);
                    badge.recipientfullname = user.fullname;
                }
            } else {
                // The badge is awarded to another user, try to fetch the badge by hash.
                if (site.isVersionGreaterEqualThan('4.5')) {
                    badge = await AddonBadges.getUserBadgeByHash(this.badgeHash);
                }
                if (!badge) {
                    // Should never happen. The app opens the badge in the browser if it can't be fetched.
                    throw new Error('Error getting badge data.');
                }
            }

            // Try to get course full name if not returned by the WS.
            if (badge.courseid && !badge.coursefullname) {
                try {
                    const course = await CoreCourses.getUserCourse(badge.courseid, true);
                    badge.coursefullname = course.fullname;
                } catch {
                    // User is not enrolled in the course.
                }
            }

            this.badge = badge;

            this.logView(badge);
        } catch (message) {
            CoreAlerts.showError(message, { default: 'Error getting badge data.' });
        }
    }

    /**
     * Refresh the badges.
     *
     * @param refresher Refresher.
     */
    async refreshBadges(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.allPromisesIgnoringErrors([
            AddonBadges.invalidateUserBadges(this.courseId, this.userId),
            AddonBadges.invalidateUserBadgeByHash(this.badgeHash),
        ]);

        await CorePromiseUtils.ignoreErrors(Promise.all([
            this.fetchIssuedBadge(),
        ]));

        refresher?.complete();
    }

}
