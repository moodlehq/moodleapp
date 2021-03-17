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

import { AddonCompetencyHelper } from '@addons/competency/services/competency-helper';
import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleSummary } from '@features/course/services/course';
import { CoreUserSummary } from '@features/user/services/user';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import {
    AddonCompetencyDataForUserCompetencySummaryWSResponse,
    AddonCompetencyUserCompetencyPlan,
    AddonCompetencyUserCompetency,
    AddonCompetencyUserCompetencyCourse,
    AddonCompetency,
    AddonCompetencyDataForUserCompetencySummaryInPlanWSResponse,
    AddonCompetencyDataForUserCompetencySummaryInCourseWSResponse,
} from '@addons/competency/services/competency';
import { CoreNavigator } from '@services/navigator';
import { IonRefresher } from '@ionic/angular';
import { ContextLevel } from '@/core/constants';
import { CoreUtils } from '@services/utils/utils';
import { AddonCompetencyMainMenuHandlerService } from '@addons/competency/services/handlers/mainmenu';

/**
 * Page that displays the competency information.
 */
@Component({
    selector: 'page-addon-competency-competency',
    templateUrl: 'competency.html',
})
export class AddonCompetencyCompetencyPage implements OnInit {

    competencyLoaded = false;
    competencyId!: number;
    planId?: number;
    courseId?: number;
    userId?: number;
    planStatus?: number;
    coursemodules?: CoreCourseModuleSummary[];
    user?: CoreUserSummary;
    competency?: AddonCompetencyDataForUserCompetencySummaryWSResponse;
    userCompetency?: AddonCompetencyUserCompetencyPlan | AddonCompetencyUserCompetency | AddonCompetencyUserCompetencyCourse;
    contextLevel?: string;
    contextInstanceId?: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.competencyId = CoreNavigator.getRouteNumberParam('competencyId')!;
        this.planId = CoreNavigator.getRouteNumberParam('planId');
        if (!this.planId) {
            this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
            this.userId = CoreNavigator.getRouteNumberParam('userId');
        }

        try {
            await this.fetchCompetency();

            const name = this.competency && this.competency.competency && this.competency.competency.competency &&
                    this.competency.competency.competency.shortname;

            if (this.planId) {
                CoreUtils.ignoreErrors(AddonCompetency.logCompetencyInPlanView(
                    this.planId,
                    this.competencyId,
                    this.planStatus!,
                    name,
                    this.userId,
                ));
            } else {
                CoreUtils.ignoreErrors(
                    AddonCompetency.logCompetencyInCourseView(this.courseId!, this.competencyId, name, this.userId),
                );
            }
        } finally {
            this.competencyLoaded = true;
        }
    }

    /**
     * Fetches the competency and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchCompetency(): Promise<void> {

        try {
            let competency: AddonCompetencyDataForUserCompetencySummaryInPlanWSResponse |
            AddonCompetencyDataForUserCompetencySummaryInCourseWSResponse;

            if (this.planId) {
                this.planStatus = undefined;

                competency = await AddonCompetency.getCompetencyInPlan(this.planId, this.competencyId);
            } else if (this.courseId) {
                competency = await AddonCompetency.getCompetencyInCourse(this.courseId, this.competencyId, this.userId);
            } else {
                throw null;
            }

            // Calculate the context.
            if (this.courseId) {
                this.contextLevel = ContextLevel.COURSE;
                this.contextInstanceId = this.courseId;
            } else {
                this.contextLevel = ContextLevel.USER;
                this.contextInstanceId = this.userId || competency.usercompetencysummary.user.id;
            }

            this.competency = competency.usercompetencysummary;
            this.userCompetency = this.competency.usercompetencyplan || this.competency.usercompetency;

            if ('plan' in competency) {
                this.planStatus = competency.plan.status;
                this.competency.usercompetency!.statusname =
                    AddonCompetencyHelper.getCompetencyStatusName(this.competency.usercompetency!.status);
            } else {
                this.userCompetency = this.competency.usercompetencycourse;
                this.coursemodules = competency.coursemodules;
            }

            if (this.competency.user.id != CoreSites.getCurrentSiteUserId()) {
                // Get the user profile from the returned object.
                this.user = this.competency.user;
            }

            this.competency.evidence.forEach((evidence) => {
                if (evidence.descidentifier) {
                    const key = 'addon.competency.' + evidence.descidentifier;
                    evidence.description = Translate.instant(key, { $a: evidence.desca });
                }
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting competency data.');
        }
    }

    /**
     * Refreshes the competency.
     *
     * @param refresher Refresher.
     */
    async refreshCompetency(refresher: IonRefresher): Promise<void> {
        try {
            if (this.planId) {
                await AddonCompetency.invalidateCompetencyInPlan(this.planId, this.competencyId);
            } else {
                await AddonCompetency.invalidateCompetencyInCourse(this.courseId!, this.competencyId);
            }

        } finally {
            this.fetchCompetency().finally(() => {
                refresher?.complete();
            });
        }
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigateToSitePath(
            '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/summary/' + competencyId,
            {
                params: { contextLevel: this.contextLevel, contextInstanceId: this.contextInstanceId },
            },
        );
    }

}
