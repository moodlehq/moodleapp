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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';
import { ActivatedRoute } from '@angular/router';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import { AddonBadges, AddonBadgesBadgeClass } from '../../services/badges';

/**
 * Page that displays a badge class.
 */
@Component({
    selector: 'page-addon-badges-badge-class',
    templateUrl: 'badge-class.html',
})
export class AddonBadgesBadgeClassPage implements OnInit {

    protected badgeId = 0;
    protected logView: (badge: AddonBadgesBadgeClass) => void;

    badge?: AddonBadgesBadgeClass;
    badgeLoaded = false;
    currentTime = 0;

    constructor(protected route: ActivatedRoute) {
        this.badgeId = CoreNavigator.getRequiredRouteNumberParam('badgeId');

        this.logView = CoreTime.once((badge) => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_badges_get_badge',
                name: badge.name,
                data: { id: this.badgeId, category: 'badges' },
                url: `/badges/badgeclass.php?id=${this.badgeId}`,
            });
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchBadgeClass().finally(() => {
            this.badgeLoaded = true;
        });
    }

    /**
     * Fetch the badge class required for the view.
     *
     * @returns Promise resolved when done.
     */
    async fetchBadgeClass(): Promise<void> {
        try {
            this.badge = await AddonBadges.getBadgeClass(this.badgeId);

            this.logView(this.badge);
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'Error getting badge data.');
        }
    }

    /**
     * Refresh the badge class.
     *
     * @param refresher Refresher.
     */
    async refreshBadgeClass(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CoreUtils.ignoreErrors(AddonBadges.invalidateBadgeClass(this.badgeId));

        await this.fetchBadgeClass();

        refresher?.complete();
    }

}
