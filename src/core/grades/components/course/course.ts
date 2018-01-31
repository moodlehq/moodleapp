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

import { Component, ViewChild, Input } from '@angular/core';
import { Content, NavParams, NavController } from 'ionic-angular';
import { CoreGradesProvider } from '../../providers/grades';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreGradesHelperProvider } from '../../providers/helper';

/**
 * Component that displays a course grades.
 */
@Component({
    selector: 'core-grades-course',
    templateUrl: 'course.html',
})
export class CoreGradesCourseComponent {
    @ViewChild(Content) content: Content;

    @Input() courseId: number;
    @Input() userId: number;

    errorMessage: string;
    gradesLoaded = false;
    gradesTable: any;

    constructor(private gradesProvider: CoreGradesProvider, private domUtils: CoreDomUtilsProvider, navParams: NavParams,
        private gradesHelper: CoreGradesHelperProvider, private sitesProvider: CoreSitesProvider, private navCtrl: NavController) {
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        // Get first participants.
        this.fetchData().then(() => {
            // Add log in Moodle.
            return this.gradesProvider.logCourseGradesView(this.courseId, this.userId);
        }).finally(() => {
            this.gradesLoaded = true;
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>}     Resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        return this.gradesProvider.getCourseGradesTable(this.courseId, this.userId).then((table) => {
            this.gradesTable = this.gradesHelper.formatGradesTable(table);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading grades');
            this.errorMessage = error;
        });
    }

    /**
     * Refresh data.
     *
     * @param {any} refresher Refresher.
     */
    refreshGrades(refresher: any): void {
        this.gradesProvider.invalidateCourseGradesData(this.courseId, this.userId).finally(() => {
            this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to the grades of the selected item.
     * @param {number} gradeId  Grade item ID where to navigate.
     */
    gotoGrade(gradeId: number): void {
        if (gradeId) {
            this.navCtrl.push('CoreGradesGradePage', {courseId: this.courseId, userId: this.userId, gradeId: gradeId});
        }
    }
}
