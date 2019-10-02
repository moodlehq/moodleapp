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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Page that displays a course grades.
 */
@IonicPage({ segment: 'core-grades-course-split' })
@Component({
    selector: 'page-core-grades-course-split',
    templateUrl: 'coursesplit.html',
})
export class CoreGradesCourseSplitPage {

    courseId: number;
    userId: number;
    gradeId: number;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider) {
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSiteUserId();
        this.gradeId = navParams.get('gradeId');
    }
}
