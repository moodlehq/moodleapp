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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content } from 'ionic-angular';
import { CoreGradesProvider } from '../../providers/grades';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGradesHelperProvider } from '../../providers/helper';

/**
 * Page that displays courses grades (main menu option).
 */
@IonicPage({ segment: 'core-grades-courses' })
@Component({
    selector: 'page-core-grades-courses',
    templateUrl: 'courses.html',
})
export class CoreGradesCoursesPage {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    grades = [];
    courseId: number;
    userId: number;
    gradesLoaded = false;

    constructor(private gradesProvider: CoreGradesProvider, private domUtils: CoreDomUtilsProvider,
        private gradesHelper: CoreGradesHelperProvider) {
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.courseId) {
            // There is the course to load, open the course in a new state.
            this.gotoCourseGrades(this.courseId);
        }

        this.fetchData().then(() => {
            if (!this.courseId && this.splitviewCtrl.isOn() && this.grades.length > 0) {
                this.gotoCourseGrades(this.grades[0].courseid);
            }

            // Add log in Moodle.
            return this.gradesProvider.logCoursesGradesView().catch(() => {
                // Ignore errors.
            });
        }).finally(() => {
            this.gradesLoaded = true;
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return {Promise<any>}     Resolved when done.
     */
    fetchData(): Promise<any> {
        return this.gradesProvider.getCoursesGrades().then((grades) => {
            return this.gradesHelper.getGradesCourseData(grades).then((grades) => {
               this.grades = grades;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading grades');
        });
    }

    /**
     * Refresh data.
     *
     * @param {any} refresher Refresher.
     */
    refreshGrades(refresher: any): void {
        this.gradesProvider.invalidateCoursesGradesData().finally(() => {
            this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to the grades of the selected course.
     * @param {number} courseId  Course Id where to navigate.
     */
    gotoCourseGrades(courseId: number): void {
        this.courseId = courseId;
        this.splitviewCtrl.push('CoreGradesCoursePage', {courseId: courseId, userId: this.userId});
    }
}
