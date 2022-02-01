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
import {
    CoreCourseModuleCompletionStatus,
    CoreCourseModuleCompletionTracking,
    CoreCourseProvider,
} from '@features/course/services/course';
import { CoreCourseSection } from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { IonContent } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
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

    @ViewChild(IonContent) content?: IonContent;

    @Input() sections: CoreCourseSection[] = [];
    @Input() selectedId?: number;
    @Input() course?: CoreCourseAnyCourseData;

    allSectionId = CoreCourseProvider.ALL_SECTIONS_ID;
    highlighted?: string;
    sectionsToRender: CourseIndexSection[] = [];

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

        if (this.selectedId === undefined) {
            // Highlight current section if none is selected.
            this.selectedId = currentSection.id;
        }

        // Clone sections to add information.
        this.sectionsToRender = this.sections
            .filter((section) => !section.hiddenbynumsections &&
                section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID &&
                section.uservisible !== false)
            .map((section) => {
                const modules = section.modules
                    .filter((module) => module.visibleoncoursepage !== 0 && !module.noviewlink)
                    .map((module) => {
                        const completionStatus = module.completiondata === undefined ||
                        module.completiondata.tracking == CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_NONE
                            ? undefined
                            : module.completiondata.state;

                        return {
                            id: module.id,
                            name: module.name,
                            course: module.course,
                            visible: !!module.visible,
                            uservisible: !!module.uservisible,
                            completionStatus,
                        };
                    });

                return {
                    id: section.id,
                    name: section.name,
                    availabilityinfo: !!section.availabilityinfo,
                    expanded: section.id === this.selectedId,
                    highlighted: currentSection?.id === section.id,
                    hasVisibleModules: modules.length > 0,
                    modules: modules,
                };
            });

        this.highlighted = CoreCourseFormatDelegate.getSectionHightlightedName(this.course);

        setTimeout(() => {
            CoreDomUtils.scrollToElementBySelector(
                this.elementRef.nativeElement,
                this.content,
                '.item.item-current',
            );
        }, 300);
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
     * @param sectionId Selected section id.
     * @param moduleId Selected module id, if any.
     */
    selectSectionOrModule(event: Event, sectionId: number, moduleId?: number): void {
        ModalController.dismiss({ event, sectionId, moduleId });
    }

}

type CourseIndexSection = {
    id: number;
    name: string;
    highlighted: boolean;
    expanded: boolean;
    hasVisibleModules: boolean;
    availabilityinfo: boolean;
    modules: {
        id: number;
        course: number;
        visible: boolean;
        uservisible: boolean;
        completionStatus?: CoreCourseModuleCompletionStatus;
    }[];
};

export type CoreCourseIndexSectionWithModule = {
    event: Event;
    sectionId: number;
    moduleId?: number;
};
