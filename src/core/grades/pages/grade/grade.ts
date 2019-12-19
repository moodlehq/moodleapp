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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { CoreGradesProvider } from '../../providers/grades';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreGradesHelperProvider } from '../../providers/helper';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Page that displays activity grade.
 */
@IonicPage({ segment: 'core-grades-grade' })
@Component({
    selector: 'page-core-grades-grade',
    templateUrl: 'grade.html',
})
export class CoreGradesGradePage {
    @ViewChild(Content) content: Content;

    grade: any;
    courseId: number;
    userId: number;
    gradeId: number;
    gradeLoaded = false;

    constructor(private gradesProvider: CoreGradesProvider, private domUtils: CoreDomUtilsProvider,
            private gradesHelper: CoreGradesHelperProvider, navParams: NavParams, sitesProvider: CoreSitesProvider) {

        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSiteUserId();
        this.gradeId = navParams.get('gradeId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.gradeLoaded = true;
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Resolved when done.
     */
    fetchData(): Promise<any> {
        return this.gradesHelper.getGradeItem(this.courseId, this.gradeId, this.userId).then((grade) => {
            this.grade = grade;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading grade item');
        });
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshGrade(refresher: any): void {
        this.gradesProvider.invalidateCourseGradesData(this.courseId, this.userId).finally(() => {
            this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }
}
