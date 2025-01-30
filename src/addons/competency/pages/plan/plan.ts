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
import { AddonCompetencyDataForPlanPageCompetency, AddonCompetencyDataForPlanPageWSResponse } from '../../services/competency';
import { CoreNavigator } from '@services/navigator';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { AddonCompetencyPlansSource } from '@addons/competency/classes/competency-plans-source';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { AddonCompetencyPlanCompetenciesSource } from '@addons/competency/classes/competency-plan-competencies-source';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a learning plan.
 */
@Component({
    selector: 'page-addon-competency-plan',
    templateUrl: 'plan.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonCompetencyPlanPage implements OnInit, OnDestroy {

    plans!: CoreSwipeNavigationItemsManager;
    competencies!: CoreListItemsManager<AddonCompetencyDataForPlanPageCompetency, AddonCompetencyPlanCompetenciesSource>;

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(() => this.performLogView());

        try {
            const planId = CoreNavigator.getRequiredRouteNumberParam('planId');
            const userId = CoreNavigator.getRouteNumberParam('userId');
            const plansSource = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonCompetencyPlansSource,
                [userId],
            );
            const competenciesSource = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonCompetencyPlanCompetenciesSource,
                [planId],
            );

            this.competencies = new CoreListItemsManager(competenciesSource, AddonCompetencyPlanPage);
            this.plans = new CoreSwipeNavigationItemsManager(plansSource);
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }
    }

    get plan(): AddonCompetencyDataForPlanPageWSResponse | undefined {
        return this.competencies.getSource().plan;
    }

    get user(): CoreUserProfile | undefined {
        return this.competencies.getSource().user;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.fetchLearningPlan();
        await this.plans.start();
        await this.competencies.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.plans.destroy();
        this.competencies.destroy();
    }

    /**
     * Fetches the learning plan and updates the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchLearningPlan(): Promise<void> {
        try {
            await this.competencies.getSource().reload();

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting learning plan data.' });
        }
    }

    /**
     * Refreshes the learning plan.
     *
     * @param refresher Refresher.
     */
    async refreshLearningPlan(refresher: HTMLIonRefresherElement): Promise<void> {
        await this.competencies.getSource().invalidateCache();

        this.fetchLearningPlan().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Log view.
     */
    protected performLogView(): void {
        if (!this.plan) {
            return;
        }

        const planId = this.competencies.getSource().PLAN_ID;

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'tool_lp_data_for_plan_page',
            name: this.plan.plan.name,
            data: {
                category: 'competency',
                planid: planId,
            },
            url: `/admin/tool/lp/coursecompetencies.php?id=${planId}`,
        });
    }

}
