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
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import {
    AddonCompetencyDataForPlanPageCompetency,
    AddonCompetencyDataForCourseCompetenciesPageCompetency,
} from '../../services/competency';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreError } from '@classes/errors/error';
import { AddonCompetencyPlanCompetenciesSource } from '@addons/competency/classes/competency-plan-competencies-source';
import { AddonCompetencyCourseCompetenciesSource } from '@addons/competency/classes/competency-course-competencies-source';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { ContextLevel } from '@/core/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the list of competencies of a learning plan.
 */
@Component({
    selector: 'page-addon-competency-competencies',
    templateUrl: 'competencies.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonCompetencyCompetenciesPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    competencies: CoreListItemsManager<
        AddonCompetencyDataForPlanPageCompetency | AddonCompetencyDataForCourseCompetenciesPageCompetency,
        AddonCompetencyPlanCompetenciesSource | AddonCompetencyCourseCompetenciesSource
    >;

    title = '';
    contextLevel?: ContextLevel;
    contextInstanceId?: number;

    protected logView: () => void;

    constructor() {
        const planId = CoreNavigator.getRouteNumberParam('planId');
        this.logView = CoreTime.once(() => this.performLogView());

        if (!planId) {
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const userId = CoreNavigator.getRouteNumberParam('userId');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonCompetencyCourseCompetenciesSource,
                [courseId, userId],
            );

            this.competencies = new CoreListItemsManager(source, AddonCompetencyCompetenciesPage);

            return;
        }

        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(AddonCompetencyPlanCompetenciesSource, [planId]);

        this.competencies = new CoreListItemsManager(source, AddonCompetencyCompetenciesPage);
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
     * @returns Promise resolved when done.
     */
    protected async fetchCompetencies(): Promise<void> {
        try {
            const source = this.competencies.getSource();

            await this.competencies.load();

            if (source instanceof AddonCompetencyPlanCompetenciesSource) {
                if (!source.plan || source.plan && source.plan.competencycount <= 0) {
                    throw new CoreError(Translate.instant('addon.competency.errornocompetenciesfound'));
                }

                this.title = source.plan.plan.name;
                this.contextLevel = ContextLevel.USER;
                this.contextInstanceId = source.user?.id || source.plan.plan.userid;
            } else {
                this.title = Translate.instant('addon.competency.coursecompetencies');
                this.contextLevel = ContextLevel.COURSE;
                this.contextInstanceId = source.courseId;
            }

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting competencies data.' });
        }
    }

    /**
     * Refreshes the competencies.
     *
     * @param refresher Refresher.
     */
    async refreshCompetencies(refresher?: HTMLIonRefresherElement): Promise<void> {
        await this.competencies.getSource().invalidateCache();

        this.competencies.getSource().setDirty(true);
        this.fetchCompetencies().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.competencies.destroy();
    }

    /**
     * Log view.
     */
    protected performLogView(): void {
        const source = this.competencies.getSource();

        if (source instanceof AddonCompetencyPlanCompetenciesSource) {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'tool_lp_data_for_plan_page',
                name: this.title,
                data: {
                    category: 'competency',
                    planid: source.planId,
                },
                url: `/admin/tool/lp/plan.php?id=${source.planId}`,
            });

            return;
        }

        if (source.userId && source.userId !== CoreSites.getCurrentSiteUserId()) {
            // Only log event when viewing own competencies. In LMS viewing students competencies uses a different view.
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'tool_lp_data_for_course_competencies_page',
            name: this.title,
            data: {
                category: 'competency',
                courseid: source.courseId,
            },
            url: `/admin/tool/lp/coursecompetencies.php?courseid=${source.courseId}`,
        });
    }

}
