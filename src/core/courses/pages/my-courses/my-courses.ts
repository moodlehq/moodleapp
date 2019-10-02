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
import { IonicPage, NavController } from 'ionic-angular';
import { CoreCoursesMyCoursesComponent } from '../../components/my-courses/my-courses';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@IonicPage({ segment: 'core-courses-my-courses' })
@Component({
    selector: 'page-core-courses-my-courses',
    templateUrl: 'my-courses.html',
})
export class CoreCoursesMyCoursesPage {
    @ViewChild(CoreCoursesMyCoursesComponent) mcComponent: CoreCoursesMyCoursesComponent;

    constructor(private navCtrl: NavController) { }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.push('CoreCoursesSearchPage');
    }
}
