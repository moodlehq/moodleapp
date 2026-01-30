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

import { Component, OnInit, inject, signal } from '@angular/core';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreNavigator } from '@services/navigator';
import { ActivatedRoute } from '@angular/router';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@static/time';
import { AddonBadges, AddonBadgesBadgeClass } from '../../services/badges';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a badge class.
 */
@Component({
    selector: 'page-addon-badges-badge-class',
    templateUrl: 'badge-class.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonBadgesBadgeClassPage implements OnInit {

    protected route = inject(ActivatedRoute);
    protected badgeId = 0;
    protected logView: (badge: AddonBadgesBadgeClass) => void;

    readonly badge = signal<AddonBadgesBadgeClass | undefined>(undefined);
    readonly loaded = signal(false);

    constructor() {
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
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.fetchBadgeClass();

        this.loaded.set(true);
    }

    /**
     * Fetch the badge class required for the view.
     */
    async fetchBadgeClass(): Promise<void> {
        try {
            const badge = await AddonBadges.getBadgeClass(this.badgeId);
            this.badge.set(badge);
            this.logView(badge);
        } catch (message) {
            CoreAlerts.showError(message, { default: 'Error getting badge data.' });
        }
    }

    /**
     * Refresh the badge class.
     *
     * @param refresher Refresher.
     */
    async refreshBadgeClass(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonBadges.invalidateBadgeClass(this.badgeId));

        await this.fetchBadgeClass();

        refresher?.complete();
    }

}
