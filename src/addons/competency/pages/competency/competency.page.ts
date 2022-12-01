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
import { Component, OnDestroy, OnInit } from '@angular/core';
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
    AddonCompetencyDataForPlanPageCompetency,
    AddonCompetencyDataForCourseCompetenciesPageCompetency,
} from '@addons/competency/services/competency';
import { CoreNavigator } from '@services/navigator';
import { IonRefresher } from '@ionic/angular';
import { ContextLevel } from '@/core/constants';
import { CoreUtils } from '@services/utils/utils';
import { ADDON_COMPETENCY_SUMMARY_PAGE } from '@addons/competency/competency.module';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { AddonCompetencyPlanCompetenciesSource } from '@addons/competency/classes/competency-plan-competencies-source';
import { ActivatedRouteSnapshot } from '@angular/router';
import { AddonCompetencyCourseCompetenciesSource } from '@addons/competency/classes/competency-course-competencies-source';

/**
 * Page that displays the competency information.
 */
@Component({
    selector: 'page-addon-competency-competency',
    templateUrl: 'competency.html',
})
export class AddonCompetencyCompetencyPage implements OnInit, OnDestroy {

    competencyLoaded = false;
    competencies!: AddonCompetencyCompetenciesSwipeManager;
    planStatus?: number;
    coursemodules?: CoreCourseModuleSummary[];
    user?: CoreUserSummary;
    competency?: AddonCompetencyDataForUserCompetencySummaryWSResponse;
    userCompetency?: AddonCompetencyUserCompetencyPlan | AddonCompetencyUserCompetency | AddonCompetencyUserCompetencyCourse;
    contextLevel?: string;
    contextInstanceId?: number;

    protected fetchSuccess = false;

    constructor() {
        try {
            const planId = CoreNavigator.getRouteNumberParam('planId');

            if (!planId) {
                const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
                const userId = CoreNavigator.getRouteNumberParam('userId');
                const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                    AddonCompetencyCourseCompetenciesSource,
                    [courseId, userId],
                );

                this.competencies = new AddonCompetencyCompetenciesSwipeManager(source);

                return;
            }

            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(AddonCompetencyPlanCompetenciesSource, [planId]);

            this.competencies = new AddonCompetencyCompetenciesSwipeManager(source);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }
    }

    get competencyFrameworkUrl(): string | undefined {
        if (!this.competency) {
            return;
        }

        const { pluginbaseurl, framework, pagecontextid } = this.competency.competency.comppath;

        return `${pluginbaseurl}/competencies.php?competencyframeworkid=${framework.id}&pagecontextid=${pagecontextid}`;
    }

    get courseId(): number | undefined {
        const source = this.competencies.getSource();

        if (!(source instanceof AddonCompetencyCourseCompetenciesSource)) {
            return;
        }

        return source.COURSE_ID;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const source = this.competencies.getSource();

            await source.reload();
            await this.competencies.start();
            await this.fetchCompetency();
        } finally {
            this.competencyLoaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.competencies.destroy();
    }

    /**
     * Fetches the competency and updates the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchCompetency(): Promise<void> {
        try {
            const source = this.competencies.getSource();

            this.competency = source instanceof AddonCompetencyPlanCompetenciesSource
                ? await this.fetchCompetencySummaryFromPlan(source)
                : await this.fetchCompetencySummaryFromCourse(source);

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

            if (!this.fetchSuccess) {
                this.fetchSuccess = true;
                const name = this.competency.competency.competency.shortname;

                if (source instanceof AddonCompetencyPlanCompetenciesSource) {
                    this.planStatus && await CoreUtils.ignoreErrors(
                        AddonCompetency.logCompetencyInPlanView(
                            source.PLAN_ID,
                            this.requireCompetencyId(),
                            this.planStatus,
                            name,
                            source.user?.id,
                        ),
                    );
                } else {
                    await CoreUtils.ignoreErrors(
                        AddonCompetency.logCompetencyInCourseView(
                            source.COURSE_ID,
                            this.requireCompetencyId(),
                            name,
                            source.USER_ID,
                        ),
                    );
                }
            }
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
        const source = this.competencies.getSource();

        await CoreUtils.ignoreErrors(
            source instanceof AddonCompetencyPlanCompetenciesSource
                ? AddonCompetency.invalidateCompetencyInPlan(source.PLAN_ID, this.requireCompetencyId())
                : AddonCompetency.invalidateCompetencyInCourse(source.COURSE_ID, this.requireCompetencyId(), source.USER_ID),
        );

        this.fetchCompetency().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId Competency Id.
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigate(
            `../${competencyId}/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
            {
                params: { contextLevel: this.contextLevel, contextInstanceId: this.contextInstanceId },
            },
        );
    }

    /**
     * Get competency id or fail.
     *
     * @returns Competency id.
     */
    private requireCompetencyId(): number {
        const selectedItem = this.competencies.getSelectedItem();

        if (!selectedItem) {
            throw new Error('Failed to get competency id from selected item');
        }

        return selectedItem.competency.id;
    }

    /**
     * Fetch competency summary from a plan source.
     *
     * @param source Plan competencies source.
     * @returns Competency summary.
     */
    private async fetchCompetencySummaryFromPlan(
        source: AddonCompetencyPlanCompetenciesSource,
    ): Promise<AddonCompetencyDataForUserCompetencySummaryWSResponse> {
        const competency = await AddonCompetency.getCompetencyInPlan(
            source.PLAN_ID,
            this.requireCompetencyId(),
        );

        this.planStatus = competency.plan.status;

        if (competency.usercompetencysummary.usercompetency) {
            competency.usercompetencysummary.usercompetency.statusname =
                AddonCompetencyHelper.getCompetencyStatusName(competency.usercompetencysummary.usercompetency.status);
        }

        this.contextLevel = ContextLevel.USER;
        this.contextInstanceId = source.user?.id || competency.usercompetencysummary.user.id;
        this.userCompetency = competency.usercompetencysummary.usercompetencyplan
            || competency.usercompetencysummary.usercompetency;

        return competency.usercompetencysummary;
    }

    /**
     * Fetch competency summary from a course source.
     *
     * @param source Course competencies source.
     * @returns Competency summary.
     */
    private async fetchCompetencySummaryFromCourse(
        source: AddonCompetencyCourseCompetenciesSource,
    ): Promise<AddonCompetencyDataForUserCompetencySummaryWSResponse> {
        const competency = await AddonCompetency.getCompetencyInCourse(
            source.COURSE_ID,
            this.requireCompetencyId(),
            source.USER_ID,
        );

        this.coursemodules = competency.coursemodules;

        this.contextLevel = ContextLevel.COURSE;
        this.contextInstanceId = source.COURSE_ID;
        this.userCompetency = competency.usercompetencysummary.usercompetencycourse
            || competency.usercompetencysummary.usercompetency;

        return competency.usercompetencysummary;
    }

}

/**
 * Helper to manage swiping within a collection of competencies.
 */
class AddonCompetencyCompetenciesSwipeManager
    extends CoreSwipeNavigationItemsManager<
    AddonCompetencyDataForPlanPageCompetency | AddonCompetencyDataForCourseCompetenciesPageCompetency,
    AddonCompetencyPlanCompetenciesSource | AddonCompetencyCourseCompetenciesSource
    > {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot): string | null {
        return route.params.competencyId;
    }

}
