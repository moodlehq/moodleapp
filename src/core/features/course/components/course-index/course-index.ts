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

import { Component, Input, OnInit } from '@angular/core';

import { CoreCourseModuleData, CoreCourseSection, CoreCourseSectionWithStatus } from '@features/course/services/course-helper';
import {
    CoreCourseModuleCompletionStatus,
    CoreCourseModuleCompletionTracking,
    CoreCourseProvider,
} from '@features/course/services/course';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreUtils } from '@services/utils/utils';
import { ModalController } from '@singletons';

/**
 * Component to display course index modal.
 */
@Component({
    selector: 'core-course-course-index',
    templateUrl: 'course-index.html',
    styleUrls: ['course-index.scss'],
})
export class CoreCourseCourseIndexComponent implements OnInit {

    @Input() sections?: SectionWithProgress[];
    @Input() selected?: CoreCourseSection;
    @Input() course?: CoreCourseAnyCourseData;

    stealthModulesSectionId = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {

        if (!this.course || !this.sections || !this.course.enablecompletion || !('courseformatoptions' in this.course) ||
                !this.course.courseformatoptions) {
            return;
        }

        const formatOptions = CoreUtils.objectToKeyValueMap(this.course.courseformatoptions, 'name', 'value');

        if (!formatOptions || formatOptions.completionusertracked === false) {
            return;
        }

        this.sections.forEach((section) => {
            let complete = 0;
            let total = 0;
            section.modules.forEach((module) => {
                console.error(module);
                if (!module.uservisible || module.completiondata === undefined ||
                        module.completiondata.tracking == CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_NONE) {
                    module.completionStatus = undefined;

                    return;
                }

                module.completionStatus = module.completiondata.state;

                total++;
                if (module.completiondata.state == CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE ||
                        module.completiondata.state == CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_PASS) {
                    complete++;
                }
            });

            if (total > 0) {
                section.progress = complete / total * 100;
            }
        });
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Select a section.
     *
     * @param section Selected section object.
     */
    selectSection(section: SectionWithProgress): void {
        if (section.uservisible !== false) {
            ModalController.dismiss(section);
        }
    }

}

type SectionWithProgress = Omit<CoreCourseSectionWithStatus, 'modules'> & {
    progress?: number;
    modules: (CoreCourseModuleData & {
        completionStatus?: CoreCourseModuleCompletionStatus;
    })[];
};
