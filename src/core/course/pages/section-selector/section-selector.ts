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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { CoreCourseHelperProvider } from '../../providers/helper';

/**
 * Page that displays course section selector.
 */
@IonicPage({ segment: 'core-course-section-selector' })
@Component({
    selector: 'page-core-course-section-selector',
    templateUrl: 'section-selector.html',
})
export class CoreCourseSectionSelectorPage {

    sections: any;
    selected: number;
    sectionHasContent: any;

    constructor(navParams: NavParams, courseHelper: CoreCourseHelperProvider, private viewCtrl: ViewController) {
        this.sections = navParams.get('sections');
        this.selected = navParams.get('selected');

        this.sectionHasContent = courseHelper.sectionHasContent;
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Select a section.
     *
     * @param {any} section Selected section object.
     */
    selectSection(section: any): void {
        if (!(section.visible === 0 || section.uservisible === false)) {
            this.viewCtrl.dismiss(section);
        }
    }
}
