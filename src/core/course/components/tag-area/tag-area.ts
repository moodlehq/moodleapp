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

import { Component, Input, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * Component that renders the course tag area.
 */
@Component({
    selector: 'core-course-tag-area',
    templateUrl: 'core-course-tag-area.html'
})
export class CoreCourseTagAreaComponent {
    @Input() items: any[]; // Area items to render.

    constructor(private navCtrl: NavController,  @Optional() private splitviewCtrl: CoreSplitViewComponent,
            private courseHelper: CoreCourseHelperProvider) {}

    /**
     * Open a course.
     *
     * @param courseId The course to open.
     */
    openCourse(courseId: number): void {
        // If this component is inside a split view, use the master nav to open it.
        const navCtrl = this.splitviewCtrl ? this.splitviewCtrl.getMasterNav() : this.navCtrl;
        this.courseHelper.getAndOpenCourse(navCtrl, courseId);
    }
}
