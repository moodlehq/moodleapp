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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonCompetencyProvider, AddonCompetencyPlan, AddonCompetency } from '../../services/competency';
import { AddonCompetencyHelper } from '../../services/competency-helper';
import { CoreNavigator } from '@services/navigator';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';

/**
 * Page that displays the list of learning plans.
 */
@Component({
    selector: 'page-addon-competency-planlist',
    templateUrl: 'planlist.html',
})
export class AddonCompetencyPlanListPage implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected userId?: number;
    plans: AddonCompetencyPlanListManager;

    constructor() {
        this.plans = new AddonCompetencyPlanListManager(AddonCompetencyPlanListPage);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.userId = CoreNavigator.getRouteNumberParam('userId');
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchLearningPlans();

        this.plans.start(this.splitView);
    }

    /**
     * Fetches the learning plans and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchLearningPlans(): Promise<void> {
        try {
            const plans = await AddonCompetency.getLearningPlans(this.userId);
            plans.forEach((plan: AddonCompetencyPlanFormatted) => {
                plan.statusname = AddonCompetencyHelper.getPlanStatusName(plan.status);
                switch (plan.status) {
                    case AddonCompetencyProvider.STATUS_ACTIVE:
                        plan.statuscolor = 'success';
                        break;
                    case AddonCompetencyProvider.STATUS_COMPLETE:
                        plan.statuscolor = 'danger';
                        break;
                    default:
                        plan.statuscolor = 'warning';
                        break;
                }
            });
            this.plans.setItems(plans);

        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting learning plans data.');
        }
    }

    /**
     * Refreshes the learning plans.
     *
     * @param refresher Refresher.
     */
    refreshLearningPlans(refresher: IonRefresher): void {
        AddonCompetency.invalidateLearningPlans(this.userId).finally(() => {
            this.fetchLearningPlans().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.plans.destroy();
    }

}

/**
 * Competency plan with some calculated data.
 */
type AddonCompetencyPlanFormatted = AddonCompetencyPlan & {
    statuscolor?: string; // Calculated in the app. Color of the plan's status.
};

/**
 * Helper class to manage plan list.
 */
class AddonCompetencyPlanListManager extends CorePageItemsListManager<AddonCompetencyPlanFormatted> {

    constructor(pageComponent: unknown) {
        super(pageComponent);
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(plan: AddonCompetencyPlanFormatted): string {
        return String(plan.id);
    }

}
