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

/**
 * Page that displays the list of competencies of a course.
 */
@IonicPage({ segment: 'addon-competency-coursecompetencies' })
@Component({
    selector: 'page-addon-competency-coursecompetencies',
    templateUrl: 'coursecompetencies.html',
})
export class AddonCompetencyCourseCompetenciesPage {

    protected courseId: number;
    protected userId: number;

    constructor(navParams: NavParams) {
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId');
    }
}
