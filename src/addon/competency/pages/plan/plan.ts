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

import { Component, Optional } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonCompetencyProvider } from '../../providers/competency';
import { AddonCompetencyHelperProvider } from '../../providers/helper';

/**
 * Page that displays a learning plan.
 */
@IonicPage({ segment: 'addon-competency-plan' })
@Component({
    selector: 'page-addon-competency-plan',
    templateUrl: 'plan.html',
})
export class AddonCompetencyPlanPage {
    protected planId: number;
    planLoaded = false;
    plan: any;
    user: any;

    constructor(private navCtrl: NavController, navParams: NavParams, private appProvider: CoreAppProvider,
            private domUtils: CoreDomUtilsProvider, @Optional() private svComponent: CoreSplitViewComponent,
            private competencyProvider: AddonCompetencyProvider, private competencyHelperProvider: AddonCompetencyHelperProvider) {
        this.planId = navParams.get('planId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchLearningPlan().finally(() => {
            this.planLoaded = true;
        });
    }

    /**
     * Fetches the learning plan and updates the view.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected fetchLearningPlan(): Promise<void> {
        return this.competencyProvider.getLearningPlan(this.planId).then((plan) => {
            plan.plan.statusname = this.competencyHelperProvider.getPlanStatusName(plan.plan.status);
            // Get the user profile image.
            this.competencyHelperProvider.getProfile(plan.plan.userid).then((user) => {
                this.user = user;
            });

            plan.competencies.forEach((competency) => {
                competency.usercompetency = competency.usercompetencyplan || competency.usercompetency;
            });
            this.plan = plan;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting learning plan data.');
        });
    }

    /**
     * Navigates to a particular competency.
     *
     * @param {number} competencyId
     */
    openCompetency(competencyId: number): void {
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        if (this.appProvider.isWide()) {
            navCtrl.push('AddonCompetencyCompetenciesPage', {competencyId, planId: this.planId});
        } else {
            navCtrl.push('AddonCompetencyCompetencyPage', {competencyId, planId: this.planId});
        }
    }

    /**
     * Refreshes the learning plan.
     *
     * @param {any} refresher Refresher.
     */
    refreshLearningPlan(refresher: any): void {
        this.competencyProvider.invalidateLearningPlan(this.planId).finally(() => {
            this.fetchLearningPlan().finally(() => {
                refresher.complete();
            });
        });
    }
}
