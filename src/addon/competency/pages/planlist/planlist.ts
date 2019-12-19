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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonCompetencyProvider, AddonCompetencyPlan } from '../../providers/competency';
import { AddonCompetencyHelperProvider } from '../../providers/helper';

/**
 * Page that displays the list of learning plans.
 */
@IonicPage({ segment: 'addon-competency-planlist' })
@Component({
    selector: 'page-addon-competency-planlist',
    templateUrl: 'planlist.html',
})
export class AddonCompetencyPlanListPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    protected userId: number;
    protected planId: number;
    plansLoaded = false;
    plans: AddonCompetencyPlan[] = [];

    constructor(navParams: NavParams, private domUtils: CoreDomUtilsProvider, private competencyProvider: AddonCompetencyProvider,
            private competencyHelperProvider: AddonCompetencyHelperProvider) {
        this.userId = navParams.get('userId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.planId) {
            // There is a learning plan to load.
            this.openPlan(this.planId);
        }

        this.fetchLearningPlans().then(() => {
            if (!this.planId && this.splitviewCtrl.isOn() && this.plans.length > 0) {
                // Take first and load it.
                this.openPlan(this.plans[0].id);
            }
        }).finally(() => {
            this.plansLoaded = true;
        });
    }

    /**
     * Fetches the learning plans and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected fetchLearningPlans(): Promise<void> {
        return this.competencyProvider.getLearningPlans(this.userId).then((plans) => {
            plans.forEach((plan: AddonCompetencyPlanFormatted) => {
                plan.statusname = this.competencyHelperProvider.getPlanStatusName(plan.status);
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
            this.plans = plans;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting learning plans data.');
        });
    }

    /**
     * Refreshes the learning plans.
     *
     * @param refresher Refresher.
     */
    refreshLearningPlans(refresher: any): void {
        this.competencyProvider.invalidateLearningPlans(this.userId).finally(() => {
            this.fetchLearningPlans().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Opens a learning plan.
     *
     * @param planId Learning plan to load.
     */
    openPlan(planId: number): void {
        this.planId = planId;
        this.splitviewCtrl.push('AddonCompetencyPlanPage', { planId });
    }
}

/**
 * Competency plan with some calculated data.
 */
type AddonCompetencyPlanFormatted = AddonCompetencyPlan & {
    statuscolor?: string; // Calculated in the app. Color of the plan's status.
};
