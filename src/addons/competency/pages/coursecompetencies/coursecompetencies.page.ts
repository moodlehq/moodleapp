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

import { Component, OnDestroy, OnInit } from '@angular/core';
import {
    AddonCompetencyDataForCourseCompetenciesPageWSResponse,
    AddonCompetencyDataForCourseCompetenciesPageCompetency,
} from '@addons/competency/services/competency';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { ContextLevel } from '@/core/constants';
import { ADDON_COMPETENCY_SUMMARY_PAGE } from '@addons/competency/competency.module';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { AddonCompetencyCourseCompetenciesSource } from '@addons/competency/classes/competency-course-competencies-source';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';

/**
 * Page that displays the list of competencies of a course.
 */
@Component({
    selector: 'page-addon-competency-coursecompetencies',
    templateUrl: 'coursecompetencies.html',
})
export class AddonCompetencyCourseCompetenciesPage implements OnInit, OnDestroy {

    competencies!: CoreListItemsManager<
        AddonCompetencyDataForCourseCompetenciesPageCompetency,
        AddonCompetencyCourseCompetenciesSource
    >;

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(() => this.performLogView());

        try {
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const userId = CoreNavigator.getRouteNumberParam('userId');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonCompetencyCourseCompetenciesSource,
                [courseId, userId],
            );

            this.competencies = new CoreListItemsManager(source, AddonCompetencyCourseCompetenciesPage);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            CoreNavigator.back();

            return;
        }
    }

    get courseCompetencies(): AddonCompetencyDataForCourseCompetenciesPageWSResponse | undefined {
        return this.competencies.getSource().courseCompetencies;
    }

    get courseId(): number {
        return this.competencies.getSource().COURSE_ID;
    }

    get user(): CoreUserProfile | undefined {
        return this.competencies.getSource().user;
    }

    get showLeastProficientCompetencies(): boolean {
        return !!this.courseCompetencies?.statistics.canmanagecoursecompetencies
            && this.courseCompetencies?.statistics.leastproficientcount > 0;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.fetchCourseCompetencies();
        await this.competencies.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.competencies.destroy();
    }

    /**
     * Get competency framework url.
     *
     * @param competency Competency.
     * @returns Competency framework url.
     */
    getCompetencyFrameworkUrl(competency: AddonCompetencyDataForCourseCompetenciesPageCompetency): string {
        const { pluginbaseurl, framework, pagecontextid } = competency.comppath;

        return `${pluginbaseurl}/competencies.php?competencyframeworkid=${framework.id}&pagecontextid=${pagecontextid}`;
    }

    /**
     * Fetches the competencies and updates the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchCourseCompetencies(): Promise<void> {
        try {
            await this.competencies.getSource().reload();

            this.logView();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting course competencies data.');
        }
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId Competency Id.
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigate(
            `./${competencyId}/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
            {
                params: {
                    contextLevel: ContextLevel.COURSE,
                    contextInstanceId: this.courseId,
                },
            },
        );
    }

    /**
     * Refreshes the competencies.
     *
     * @param refresher Refresher.
     */
    async refreshCourseCompetencies(refresher?: HTMLIonRefresherElement): Promise<void> {
        await this.competencies.getSource().invalidateCache();

        this.fetchCourseCompetencies().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Log view.
     */
    protected performLogView(): void {
        const source = this.competencies.getSource();
        if (source.USER_ID && source.USER_ID !== CoreSites.getCurrentSiteUserId()) {
            // Only log event when viewing own competencies. In LMS viewing students competencies uses a different view.
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'tool_lp_data_for_course_competencies_page',
            name: Translate.instant('addon.competency.coursecompetencies'),
            data: {
                category: 'competency',
                courseid: source.COURSE_ID,
            },
            url: `/admin/tool/lp/coursecompetencies.php?courseid=${source.COURSE_ID}`,
        });
    }

}
