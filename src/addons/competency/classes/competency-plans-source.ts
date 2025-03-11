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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { ADDON_COMPETENCY_COMPETENCIES_PAGE, AddonCompetencyLearningPlanStatus } from '../constants';
import { AddonCompetency, AddonCompetencyPlan } from '../services/competency';
import { AddonCompetencyHelper } from '../services/competency-helper';
import { CoreIonicColorNames } from '@singletons/colors';

/**
 * Provides a collection of learning plans.
 */
export class AddonCompetencyPlansSource extends CoreRoutedItemsManagerSource<AddonCompetencyPlanFormatted> {

    /**
     * @inheritdoc
     */
    static getSourceId(userId?: number): string {
        return userId ? String(userId) : 'current-user';
    }

    readonly USER_ID?: number;

    constructor(userId?: number) {
        super();

        this.USER_ID = userId;
    }

    /**
     * @inheritdoc
     */
    getItemPath(plan: AddonCompetencyPlanFormatted): string {
        return `${plan.id}/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        if (this.USER_ID) {
            return { userId: this.USER_ID };
        }

        return {};
    }

    /**
     * Invalidate learning plans cache.
     */
    async invalidateCache(): Promise<void> {
        await AddonCompetency.invalidateLearningPlans(this.USER_ID);
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: AddonCompetencyPlanFormatted[] }> {
        const plans = await AddonCompetency.getLearningPlans(this.USER_ID);

        plans.forEach((plan: AddonCompetencyPlanFormatted) => {
            plan.statusname = AddonCompetencyHelper.getPlanStatusName(plan.status);
            switch (plan.status) {
                case AddonCompetencyLearningPlanStatus.ACTIVE:
                    plan.statuscolor = CoreIonicColorNames.SUCCESS;
                    break;
                case AddonCompetencyLearningPlanStatus.COMPLETE:
                    plan.statuscolor = CoreIonicColorNames.DANGER;
                    break;
                default:
                    plan.statuscolor = CoreIonicColorNames.WARNING;
                    break;
            }
        });

        return { items: plans };
    }

}

/**
 * Competency plan with some calculated data.
 */
export type AddonCompetencyPlanFormatted = AddonCompetencyPlan & {
    statuscolor?: string; // Calculated in the app. Color of the plan's status.
};
