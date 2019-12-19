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
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { CoreCourseHelperProvider } from '../../providers/helper';
import { CoreCourseProvider } from '../../providers/course';

/**
 * Page that displays course section selector.
 */
@IonicPage({ segment: 'core-course-section-selector' })
@Component({
    selector: 'page-core-course-section-selector',
    templateUrl: 'section-selector.html',
})
export class CoreCourseSectionSelectorPage {

    stealthModulesSectionId = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    sections: any;
    selected: number;
    courseId: number;

    constructor(navParams: NavParams, courseHelper: CoreCourseHelperProvider, private viewCtrl: ViewController) {
        this.sections = navParams.get('sections');
        this.selected = navParams.get('selected');
        const course = navParams.get('course');

        this.courseId = course && course.id;

        if (course && course.enablecompletion && course.courseformatoptions && course.courseformatoptions.coursedisplay == 1 &&
                course.completionusertracked !== false) {
            this.sections.forEach((section) => {
                let complete = 0,
                    total = 0;
                section.modules && section.modules.forEach((module) => {
                    if (module.uservisible && typeof module.completiondata != 'undefined' &&
                            module.completiondata.tracking > CoreCourseProvider.COMPLETION_TRACKING_NONE) {
                        total++;
                        if (module.completiondata.state == CoreCourseProvider.COMPLETION_COMPLETE ||
                                module.completiondata.state == CoreCourseProvider.COMPLETION_COMPLETE_PASS) {
                            complete++;
                        }
                    }
                });

                if (total > 0) {
                    section.progress = complete / total * 100;
                }
            });
        }
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
     * @param section Selected section object.
     */
    selectSection(section: any): void {
        if (section.uservisible !== false) {
            this.viewCtrl.dismiss(section);
        }
    }
}
