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
import { TranslateService } from '@ngx-translate/core';
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

    constructor(private navCtrl: NavController, navParams: NavParams, private translate: TranslateService,
            private appProvider: CoreAppProvider, private domUtils: CoreDomUtilsProvider,
            @Optional() private svComponent: CoreSplitViewComponent, private competencyProvider: AddonCompetencyProvider,
            private competencyHelperProvider: AddonCompetencyHelperProvider) {
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
            plan.plan.statusname = this.getStatusName(plan.plan.status);
            // Get the user profile image.
            this.competencyHelperProvider.getProfile(plan.plan.userid).then((user) => {
                this.user = user;
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
     * Convenience function to get the status name translated.
     *
     * @param {number} status
     * @return {string}
     */
    protected getStatusName(status: number): string {
        let statusTranslateName;
        switch (status) {
            case AddonCompetencyProvider.STATUS_DRAFT:
                statusTranslateName = 'draft';
                break;
            case AddonCompetencyProvider.REVIEW_STATUS_IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            case AddonCompetencyProvider.REVIEW_STATUS_WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            case AddonCompetencyProvider.STATUS_ACTIVE:
                statusTranslateName = 'active';
                break;
            case AddonCompetencyProvider.STATUS_COMPLETE:
                statusTranslateName = 'complete';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }

        return this.translate.instant('addon.competency.planstatus' + statusTranslateName);
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
