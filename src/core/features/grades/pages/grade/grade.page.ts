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

import { Component, OnInit } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesFormattedRow, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays activity grade.
 */
@Component({
    selector: 'page-core-grades-grade',
    templateUrl: 'grade.html',
})
export class CoreGradesGradePage implements OnInit {

    courseId: number;
    userId: number;
    gradeId: number;
    grade?: CoreGradesFormattedRow | null;
    gradeLoaded = false;

    constructor() {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.gradeId = CoreNavigator.getRouteNumberParam('gradeId')!;
        this.userId = CoreNavigator.getRouteNumberParam('userId') ?? CoreSites.getCurrentSiteUserId();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.fetchGrade();
    }

    /**
     * Fetch all the data required for the view.
     */
    async fetchGrade(): Promise<void> {
        try {
            this.grade = await CoreGradesHelper.getGradeItem(this.courseId, this.gradeId, this.userId);
            this.gradeLoaded = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading grade item');
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    async refreshGrade(refresher: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreGrades.invalidateCourseGradesData(this.courseId, this.userId));
        await CoreUtils.ignoreErrors(this.fetchGrade());

        refresher.complete();
    }

}
