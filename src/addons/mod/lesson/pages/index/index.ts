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

import { Component, OnInit, ViewChild } from '@angular/core';

import { CoreCourseWSModule } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { AddonModLessonIndexComponent } from '../../components/index/index';
import { AddonModLessonLessonWSData } from '../../services/lesson';

/**
 * Page that displays the lesson entry page.
 */
@Component({
    selector: 'page-addon-mod-lesson-index',
    templateUrl: 'index.html',
})
export class AddonModLessonIndexPage implements OnInit {

    @ViewChild(AddonModLessonIndexComponent) lessonComponent?: AddonModLessonIndexComponent;

    title?: string;
    module?: CoreCourseWSModule;
    courseId?: number;
    group?: number; // The group to display.
    action?: string; // The "action" to display first.

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.module = CoreNavigator.instance.getRouteParam('module');
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId');
        this.group = CoreNavigator.instance.getRouteNumberParam('group');
        this.action = CoreNavigator.instance.getRouteParam('action');
        this.title = this.module?.name;
    }

    /**
     * Update some data based on the lesson instance.
     *
     * @param lesson Lesson instance.
     */
    updateData(lesson: AddonModLessonLessonWSData): void {
        this.title = lesson.name || this.title;
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.lessonComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.lessonComponent?.ionViewDidLeave();
    }

}
