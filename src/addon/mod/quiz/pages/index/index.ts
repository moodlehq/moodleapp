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
import { IonicPage, NavParams } from 'ionic-angular';
import { AddonModQuizIndexComponent } from '../../components/index/index';

/**
 * Page that displays the quiz entry page.
 */
@IonicPage({ segment: 'addon-mod-quiz-index' })
@Component({
    selector: 'page-addon-mod-quiz-index',
    templateUrl: 'index.html',
})
export class AddonModQuizIndexPage {
    @ViewChild(AddonModQuizIndexComponent) quizComponent: AddonModQuizIndexComponent;

    title: string;
    module: any;
    courseId: number;

    constructor(navParams: NavParams) {
        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
        this.title = this.module.name;
    }

    /**
     * Update some data based on the quiz instance.
     *
     * @param quiz Quiz instance.
     */
    updateData(quiz: any): void {
        this.title = quiz.name || this.title;
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.quizComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.quizComponent.ionViewDidLeave();
    }
}
