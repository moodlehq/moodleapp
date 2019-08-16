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
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { AddonBadgesProvider } from '../../providers/badges';

/**
 * Page that displays the list of calendar events.
 */
@IonicPage({ segment: 'addon-badges-issued-badge' })
@Component({
    selector: 'page-addon-badges-issued-badge',
    templateUrl: 'issued-badge.html',
})
export class AddonBadgesIssuedBadgePage {
    @ViewChild(Content) content: Content;

    protected badgeHash: string;
    protected userId: number;
    protected courseId: number;

    user: any = {};
    course: any = {};
    badge: any = {};

    badgeLoaded = false;
    currentTime = 0;

    constructor(private badgesProvider: AddonBadgesProvider, navParams: NavParams, sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            private userProvider: CoreUserProvider, private coursesProvider: CoreCoursesProvider) {

        this.courseId = navParams.get('courseId') || 0; // Use 0 for site badges.
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSite().getUserId();
        this.badgeHash = navParams.get('badgeHash');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {

        this.fetchIssuedBadge().finally(() => {
            this.badgeLoaded = true;
        });
    }

    /**
     * Fetch the issued badge required for the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchIssuedBadge(): Promise<any> {
        const promises = [];

        this.currentTime = this.timeUtils.timestamp();
        promises.push(this.userProvider.getProfile(this.userId, this.courseId, true).then((user) => {
            this.user = user;
        }));

        promises.push(this.badgesProvider.getUserBadges(this.courseId, this.userId).then((badges) => {
            const badge = badges.find((badge) => {
                return this.badgeHash == badge.uniquehash;
            });

            if (badge) {
                this.badge = badge;
                if (badge.courseid) {
                    return this.coursesProvider.getUserCourse(badge.courseid, true).then((course) => {
                        this.course = course;
                    }).catch(() => {
                        // Maybe an old deleted course.
                        this.course = null;
                    });
                }
            }
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting badge data.');
        }));

        return Promise.all(promises);
    }

    /**
     * Refresh the badges.
     *
     * @param {any} refresher Refresher.
     */
    refreshBadges(refresher: any): void {
        this.badgesProvider.invalidateUserBadges(this.courseId, this.userId).finally(() => {
            this.fetchIssuedBadge().finally(() => {
                refresher.complete();
            });
        });
    }
}
