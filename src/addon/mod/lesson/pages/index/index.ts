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
import { IonicPage, NavParams } from 'ionic-angular';
import { AddonModLessonIndexComponent } from '../../components/index/index';

/**
 * Page that displays the lesson entry page.
 */
@IonicPage({ segment: 'addon-mod-lesson-index' })
@Component({
    selector: 'page-addon-mod-lesson-index',
    templateUrl: 'index.html',
})
export class AddonModLessonIndexPage {
    @ViewChild(AddonModLessonIndexComponent) lessonComponent: AddonModLessonIndexComponent;

    title: string;
    module: any;
    courseId: number;
    group: number; // The group to display.
    action: string; // The "action" to display first.

    constructor(navParams: NavParams) {
        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
        this.group = navParams.get('group');
        this.action = navParams.get('action');
        this.title = this.module.name;
    }

    /**
     * Update some data based on the lesson instance.
     *
     * @param {any} lesson Lesson instance.
     */
    updateData(lesson: any): void {
        this.title = lesson.name || this.title;
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.lessonComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.lessonComponent.ionViewDidLeave();
    }
}
