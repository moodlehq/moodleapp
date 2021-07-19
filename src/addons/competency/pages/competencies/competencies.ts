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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import {
    AddonCompetencyDataForPlanPageCompetency, AddonCompetencyDataForCourseCompetenciesPageCompetency, AddonCompetency,
} from '../../services/competency';
import { Params, ActivatedRoute } from '@angular/router';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreError } from '@classes/errors/error';

/**
 * Page that displays the list of competencies of a learning plan.
 */
@Component({
    selector: 'page-addon-competency-competencies',
    templateUrl: 'competencies.html',
})
export class AddonCompetencyCompetenciesPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected planId?: number;
    protected courseId?: number;
    protected userId?: number;

    competenciesLoaded = false;
    competencies: AddonCompetencyListManager;
    title = '';

    constructor(protected route: ActivatedRoute) {
        this.planId = CoreNavigator.getRouteNumberParam('planId', { route });
        if (!this.planId) {
            this.courseId = CoreNavigator.getRouteNumberParam('courseId', { route });
            this.userId = CoreNavigator.getRouteNumberParam('userId', { route });
        }

        this.competencies =
            new AddonCompetencyListManager(AddonCompetencyCompetenciesPage, this.planId, this.courseId, this.userId);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchCompetencies();

        this.competencies.start(this.splitView);
    }

    /**
     * Fetches the competencies and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchCompetencies(): Promise<void> {
        try {
            if (this.planId) {

                const response = await AddonCompetency.getLearningPlan(this.planId);

                if (response.competencycount <= 0) {
                    throw new CoreError(Translate.instant('addon.competency.errornocompetenciesfound'));
                }

                this.title = response.plan.name;
                this.userId = response.plan.userid;

                this.competencies.setItems(response.competencies);
            } else if (this.courseId) {
                const response = await AddonCompetency.getCourseCompetencies(this.courseId, this.userId);
                this.title = Translate.instant('addon.competency.coursecompetencies');

                this.competencies.setItems(response.competencies);
            } else {
                throw null;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting competencies data.');
        }
    }

    /**
     * Refreshes the competencies.
     *
     * @param refresher Refresher.
     */
    async refreshCompetencies(refresher?: IonRefresher): Promise<void> {
        try {
            if (this.planId) {
                await AddonCompetency.invalidateLearningPlan(this.planId);
            } else {
                await AddonCompetency.invalidateCourseCompetencies(this.courseId!, this.userId);
            }

        } finally {
            this.fetchCompetencies().finally(() => {
                refresher?.complete();
            });
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.competencies.destroy();
    }

}

type AddonCompetencyDataForPlanPageCompetencyFormatted =
    AddonCompetencyDataForPlanPageCompetency | AddonCompetencyDataForCourseCompetenciesPageCompetency;

/**
 * Helper class to manage competencies list.
 */
class AddonCompetencyListManager extends CorePageItemsListManager<AddonCompetencyDataForPlanPageCompetencyFormatted> {

    planId?: number;
    courseId?: number;
    userId?: number;

    constructor(pageComponent: unknown, planId?: number, courseId?: number, userId?: number) {
        super(pageComponent);
        this.planId = planId;
        this.courseId = courseId;
        this.userId = userId;
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(competency: AddonCompetencyDataForPlanPageCompetencyFormatted): string {
        return String(competency.competency.id);
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(): Params {
        if (this.planId) {
            return { planId: this.planId };
        } else {
            return { courseId: this.courseId, userId: this.userId };
        }
    }

}
