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
import { AddonCompetencyDataForPlanPageWSResponse, AddonCompetency } from '../../services/competency';
import { AddonCompetencyHelper } from '../../services/competency-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreUserProfile } from '@features/user/services/user';
import { IonRefresher } from '@ionic/angular';
import { AddonCompetencyMainMenuHandlerService } from '@addons/competency/services/handlers/mainmenu';

/**
 * Page that displays a learning plan.
 */
@Component({
    selector: 'page-addon-competency-plan',
    templateUrl: 'plan.html',
})
export class AddonCompetencyPlanPage implements OnInit {

    protected planId!: number;
    loaded = false;
    plan?: AddonCompetencyDataForPlanPageWSResponse;
    user?: CoreUserProfile;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.planId = CoreNavigator.getRouteNumberParam('planId')!;

        this.fetchLearningPlan().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetches the learning plan and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchLearningPlan(): Promise<void> {
        try {
            const plan = await AddonCompetency.getLearningPlan(this.planId);
            plan.plan.statusname = AddonCompetencyHelper.getPlanStatusName(plan.plan.status);

            // Get the user profile image.
            this.user = await AddonCompetencyHelper.getProfile(plan.plan.userid);

            this.plan = plan;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting learning plan data.');
        }
    }

    /**
     * Navigates to a particular competency.
     *
     * @param competencyId
     */
    openCompetency(competencyId: number): void {
        CoreNavigator.navigateToSitePath(
            '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/competencies/' + competencyId,
            { params: { planId: this.planId } },
        );
    }

    /**
     * Refreshes the learning plan.
     *
     * @param refresher Refresher.
     */
    refreshLearningPlan(refresher: IonRefresher): void {
        AddonCompetency.invalidateLearningPlan(this.planId).finally(() => {
            this.fetchLearningPlan().finally(() => {
                refresher?.complete();
            });
        });
    }

}
