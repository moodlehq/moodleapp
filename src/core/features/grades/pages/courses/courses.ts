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
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGradesCoursesSource } from '@features/grades/classes/grades-courses-source';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreGradesGradeOverviewWithCourseData } from '@features/grades/services/grades-helper';

/**
 * Page that displays courses grades (main menu option).
 */
@Component({
    selector: 'page-core-grades-courses',
    templateUrl: 'courses.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreGradesCoursesPage implements OnDestroy, AfterViewInit {

    courses: CoreGradesCoursesManager;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);

        this.courses = new CoreGradesCoursesManager(source, CoreGradesCoursesPage);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchInitialCourses();

        this.courses.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.courses.destroy();
    }

    /**
     * Refresh courses.
     *
     * @param refresher Refresher.
     */
    async refreshCourses(refresher: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreGrades.invalidateCoursesGradesData());
        await CorePromiseUtils.ignoreErrors(this.courses.reload());

        refresher?.complete();
    }

    /**
     * Obtain the initial list of courses.
     */
    private async fetchInitialCourses(): Promise<void> {
        try {
            await this.courses.load();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading courses' });
        }
    }

}

/**
 * Helper class to manage courses.
 */
class CoreGradesCoursesManager extends CoreListItemsManager<CoreGradesGradeOverviewWithCourseData> {

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreGrades.logCoursesGradesView();

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'gradereport_overview_view_grade_report',
            name: Translate.instant('core.grades.grades'),
            data: { courseId: CoreSites.getCurrentSiteHomeId(), category: 'grades' },
            url: '/grade/report/overview/index.php',
        });
    }

}
