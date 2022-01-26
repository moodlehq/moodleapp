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

import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

import { CoreCourseModuleData, CoreCourseSection } from '@features/course/services/course-helper';
import {
    CoreCourseModuleCompletionStatus,
    CoreCourseModuleCompletionTracking,
    CoreCourseProvider,
} from '@features/course/services/course';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreUtils } from '@services/utils/utils';
import { ModalController } from '@singletons';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { IonContent } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Component to display course index modal.
 */
@Component({
    selector: 'core-course-course-index',
    templateUrl: 'course-index.html',
    styleUrls: ['course-index.scss'],
})
export class CoreCourseCourseIndexComponent implements OnInit {

    @ViewChild(IonContent) content?: IonContent;

    @Input() sections?: CourseIndexSection[];
    @Input() selectedId?: number;
    @Input() course?: CoreCourseAnyCourseData;

    stealthModulesSectionId = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    allSectionId = CoreCourseProvider.ALL_SECTIONS_ID;
    highlighted?: string;

    constructor(
        protected elementRef: ElementRef,
    ) {
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {

        if (!this.course || !this.sections || !this.course.enablecompletion || !('courseformatoptions' in this.course) ||
                !this.course.courseformatoptions) {
            this.closeModal();

            return;
        }

        const formatOptions = CoreUtils.objectToKeyValueMap(this.course.courseformatoptions, 'name', 'value');

        if (!formatOptions || formatOptions.completionusertracked === false) {
            return;
        }
        const currentSection = await CoreCourseFormatDelegate.getCurrentSection(this.course, this.sections);
        currentSection.highlighted = true;
        if (this.selectedId === undefined) {
            currentSection.expanded = true;
            this.selectedId = currentSection.id;
        } else {
            const selectedSection = this.sections.find((section) => section.id == this.selectedId);
            if (selectedSection) {
                selectedSection.expanded = true;
            }
        }

        this.sections.forEach((section) => {
            section.modules.forEach((module) => {
                module.completionStatus = module.completiondata === undefined ||
                    module.completiondata.tracking == CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_NONE
                    ? undefined
                    : module.completiondata.state;
            });
        });

        this.highlighted = CoreCourseFormatDelegate.getSectionHightlightedName(this.course);

        setTimeout(() => {
            CoreDomUtils.scrollToElementBySelector(
                this.elementRef.nativeElement,
                this.content,
                '.item.item-current',
            );
        }, 200);
    }

    /**
     * Toggle expand status.
     *
     * @param event Event object.
     * @param section Section to expand / collapse.
     */
    toggleExpand(event: Event, section: CourseIndexSection): void {
        section.expanded = !section.expanded;
        event.stopPropagation();
        event.preventDefault();
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
     * @param event Event.
     * @param section Selected section object.
     */
    selectSection(event: Event, section: CoreCourseSection): void {
        if (section.uservisible !== false) {
            ModalController.dismiss({ event, section });
        }
    }

    /**
     * Select a section and open a module
     *
     * @param event Event.
     * @param section Selected section object.
     * @param module Selected module object.
     */
    selectModule(event: Event,section: CoreCourseSection, module: CoreCourseModuleData): void {
        if (module.uservisible !== false) {
            ModalController.dismiss({ event, section, module });
        }
    }

}

type CourseIndexSection = Omit<CoreCourseSection, 'modules'> & {
    highlighted?: boolean;
    expanded?: boolean;
    modules: (CoreCourseModuleData & {
        completionStatus?: CoreCourseModuleCompletionStatus;
    })[];
};

export type CoreCourseIndexSectionWithModule = {
    event: Event;
    section: CourseIndexSection;
    module?: CoreCourseModuleData;
};
