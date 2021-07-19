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
import { CorePageItemsListManager } from '@classes/page-items-list-manager';

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesGradeOverviewWithCourseData, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { IonRefresher } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page that displays courses grades (main menu option).
 */
@Component({
    selector: 'page-core-grades-courses',
    templateUrl: 'courses.html',
})
export class CoreGradesCoursesPage implements OnDestroy, AfterViewInit {

    courses: CoreGradesCoursesManager = new CoreGradesCoursesManager(CoreGradesCoursesPage);

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

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
    async refreshCourses(refresher: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreGrades.invalidateCoursesGradesData());
        await CoreUtils.ignoreErrors(this.fetchCourses());

        refresher?.complete();
    }

    /**
     * Obtain the initial list of courses.
     */
    private async fetchInitialCourses(): Promise<void> {
        try {
            await this.fetchCourses();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading courses');

            this.courses.setItems([]);
        }
    }

    /**
     * Update the list of courses.
     */
    private async fetchCourses(): Promise<void> {
        const grades = await CoreGrades.getCoursesGrades();
        const courses = await CoreGradesHelper.getGradesCourseData(grades);

        this.courses.setItems(courses);
    }

}

/**
 * Helper class to manage courses.
 */
class CoreGradesCoursesManager extends CorePageItemsListManager<CoreGradesGradeOverviewWithCourseData> {

    /**
     * @inheritdoc
     */
    protected getItemPath(courseGrade: CoreGradesGradeOverviewWithCourseData): string {
        return courseGrade.courseid.toString();
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreGrades.logCoursesGradesView();
    }

}
