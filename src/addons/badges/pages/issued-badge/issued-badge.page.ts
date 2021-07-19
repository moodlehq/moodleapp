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
import { IonRefresher } from '@ionic/angular';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { AddonBadges, AddonBadgesUserBadge } from '../../services/badges';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreNavigator } from '@services/navigator';
import { ActivatedRoute } from '@angular/router';

/**
 * Page that displays the list of calendar events.
 */
@Component({
    selector: 'page-addon-badges-issued-badge',
    templateUrl: 'issued-badge.html',
})
export class AddonBadgesIssuedBadgePage implements OnInit {

    protected badgeHash = '';
    protected userId!: number;

    courseId = 0;
    user?: CoreUserProfile;
    course?: CoreEnrolledCourseData;
    badge?: AddonBadgesUserBadge;
    badgeLoaded = false;
    currentTime = 0;

    constructor(
        protected route: ActivatedRoute,
    ) { }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || this.courseId; // Use 0 for site badges.
        this.userId = CoreNavigator.getRouteNumberParam('userId') || CoreSites.getCurrentSite()!.getUserId();
        this.badgeHash = CoreNavigator.getRouteParam('badgeHash') || '';

        this.fetchIssuedBadge().finally(() => {
            this.badgeLoaded = true;
        });
    }

    /**
     * Fetch the issued badge required for the view.
     *
     * @return Promise resolved when done.
     */
    async fetchIssuedBadge(): Promise<void> {
        this.currentTime = CoreTimeUtils.timestamp();

        this.user = await CoreUser.getProfile(this.userId, this.courseId, true);

        try {
            const badges = await AddonBadges.getUserBadges(this.courseId, this.userId);
            const badge = badges.find((badge) => this.badgeHash == badge.uniquehash);

            if (!badge) {
                return;
            }

            this.badge = badge;
            if (badge.courseid) {
                try {
                    this.course = await CoreCourses.getUserCourse(badge.courseid, true);
                } catch {
                    // Maybe an old deleted course.
                    this.course = undefined;
                }
            }
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'Error getting badge data.');
        }
    }

    /**
     * Refresh the badges.
     *
     * @param refresher Refresher.
     */
    async refreshBadges(refresher?: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(Promise.all([
            AddonBadges.invalidateUserBadges(this.courseId, this.userId),
        ]));

        await CoreUtils.ignoreErrors(Promise.all([
            this.fetchIssuedBadge(),
        ]));

        refresher?.complete();
    }

}
