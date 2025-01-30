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
import { ContextLevel } from '@/core/constants';
import { AddonCompetencySummary, AddonCompetency } from '@addons/competency/services/competency';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_COMPETENCY_SUMMARY_PAGE } from '@addons/competency/constants';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the competency summary.
 */
@Component({
    selector: 'page-addon-competency-competency-summary',
    templateUrl: 'competencysummary.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonCompetencyCompetencySummaryPage implements OnInit {

    competencyLoaded = false;
    competencyId!: number;
    competency?: AddonCompetencySummary;
    contextLevel?: ContextLevel;
    contextInstanceId?: number;

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            if (!this.competency) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(
                AddonCompetency.logCompetencyView(this.competencyId, this.competency.competency.shortname),
            );

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_competency_competency_viewed',
                name: this.competency.competency.shortname,
                data: {
                    competencyId: this.competencyId,
                    category: 'competency',
                },
                url: `/admin/tool/lp/user_competency.php?id=${this.competencyId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.competencyId = CoreNavigator.getRequiredRouteNumberParam('competencyId');
            this.contextLevel = CoreNavigator.getRouteParam<ContextLevel>('contextLevel');
            this.contextInstanceId = CoreNavigator.getRouteNumberParam('contextInstanceId');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        try {
            await this.fetchCompetency();
        } finally {
            this.competencyLoaded = true;
        }
    }

    /**
     * Fetches the competency summary and updates the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchCompetency(): Promise<void> {
        try {
            const result = await AddonCompetency.getCompetencySummary(this.competencyId);
            if (!this.contextLevel || this.contextInstanceId === undefined) {
                // Context not specified, use user context.
                this.contextLevel = ContextLevel.USER;
                this.contextInstanceId = result.usercompetency?.userid;
            }

            this.competency = result.competency;

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting competency summary data.' });
        }
    }

    /**
     * Refreshes the competency summary.
     *
     * @param refresher Refresher.
     */
    refreshCompetency(refresher: HTMLIonRefresherElement): void {
        AddonCompetency.invalidateCompetencySummary(this.competencyId).finally(() => {
            this.fetchCompetency().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId Competency Id.
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigate(
            `../../${competencyId}/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
            {
                params: { contextLevel: this.contextLevel, contextInstanceId: this.contextInstanceId },
            },
        );
    }

}
