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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, ElementRef, HostBinding, Input, OnInit, inject } from '@angular/core';
import {
    CoreCourse,
    sectionContentIsModule,
} from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreCourseFormatCurrentSectionData, CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseCompletion } from '@features/course/services/course-completion';
import { CoreSites } from '@services/sites';
import { CoreWait } from '@singletons/wait';
import { ModalController } from '@singletons';
import { CoreDom } from '@singletons/dom';
import { CoreCourseModuleCompletionStatus, CORE_COURSE_ALL_SECTIONS_ID } from '@features/course/constants';

/**
 * Component to display course index modal.
 */
@Component({
    selector: 'core-course-course-index',
    templateUrl: 'course-index.html',
    styleUrl: 'course-index.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseCourseIndexComponent implements OnInit {

    @Input() sections: CoreCourseSection[] = [];
    @Input() selectedId?: number;
    @Input() course?: CoreCourseAnyCourseData;

    allSectionId = CORE_COURSE_ALL_SECTIONS_ID;
    highlighted?: string;
    sectionsToRender: CourseIndexSection[] = [];
    loaded = false;
    isModule = sectionContentIsModule;

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    @HostBinding('attr.data-course-id') protected get courseId(): number | null {
        return this.course?.id ?? null;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.course || !this.sections) {
            this.closeModal();

            return;
        }

        let completionEnabled = CoreCourseCompletion.isCompletionEnabledInCourse(this.course);
        if (completionEnabled && 'completionusertracked' in this.course && this.course.completionusertracked !== undefined) {
            completionEnabled = this.course.completionusertracked;
        }
        if (completionEnabled && 'showcompletionconditions' in this.course && this.course.showcompletionconditions !== undefined) {
            completionEnabled = this.course.showcompletionconditions;
        }

        const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, this.sections);

        if (this.selectedId === undefined) {
            // Highlight current section if none is selected.
            this.selectedId = currentSectionData.section.id;
        }

        // Clone sections to add information.
        const site = CoreSites.getRequiredCurrentSite();

        const enableIndentation = await CoreCourse.isCourseIndentationEnabled(site, this.course.id);

        this.sectionsToRender = this.sections
            .filter((section) => !CoreCourseHelper.isSectionStealth(section))
            .map((section) => this.mapSectionToRender(section, completionEnabled, enableIndentation, currentSectionData));

        this.highlighted = CoreCourseFormatDelegate.getSectionHightlightedName(this.course);

        // Wait a bit to render the data, otherwise the modal takes a while to appear in big courses or slow devices.
        await CoreWait.wait(400);

        this.loaded = true;

        await CoreWait.nextTick();

        CoreDom.scrollToElement(
            this.element,
            '.item.item-current',
            { addYAxis: -10 },
        );
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
        ModalController.dismiss(<CoreCourseIndexSectionWithModule> { event, sectionId, moduleId });
    }

    /**
     * Check whether a module should be rendered or not.
     *
     * @param section Section.
     * @param module Module
     * @returns Whether the module should be rendered or not.
     */
    protected renderModule(section: CoreCourseSection, module: CoreCourseModuleData): boolean {
        if (CoreCourseHelper.isModuleStealth(module, section)) {
            return false;
        }

        const site = CoreSites.getRequiredCurrentSite();

        if (site.isVersionGreaterEqualThan('4.2')) {
            return true;
        }

        return !module.noviewlink;
    }

    /**
     * Map a section to the format needed to render it.
     *
     * @param section Section to map.
     * @param completionEnabled Whether completion is enabled.
     * @param enableIndentation Whether indentation is enabled.
     * @param currentSectionData Current section data.
     * @returns Mapped section.
     */
    protected mapSectionToRender(
        section: CoreCourseSection,
        completionEnabled: boolean,
        enableIndentation: boolean,
        currentSectionData?: CoreCourseFormatCurrentSectionData<CoreCourseSection>,
    ): CourseIndexSection {
        const contents = section.contents
            .filter((modOrSubsection) =>
                !sectionContentIsModule(modOrSubsection) || this.renderModule(section, modOrSubsection))
            .map((modOrSubsection) => {
                if (!sectionContentIsModule(modOrSubsection)) {
                    return this.mapSectionToRender(modOrSubsection, completionEnabled, enableIndentation);
                }

                const completionStatus = completionEnabled
                    ? CoreCourseHelper.getCompletionStatus(modOrSubsection.completiondata)
                    : undefined;

                return {
                    id: modOrSubsection.id,
                    name: modOrSubsection.name,
                    modname: modOrSubsection.modname,
                    course: modOrSubsection.course,
                    visible: !!modOrSubsection.visible,
                    uservisible: CoreCourseHelper.canUserViewModule(modOrSubsection, section),
                    indented: enableIndentation && modOrSubsection.indent > 0,
                    completionStatus,
                };
            });

        return {
            id: section.id,
            name: section.name,
            availabilityinfo: !!section.availabilityinfo,
            visible: !!section.visible,
            uservisible: CoreCourseHelper.canUserViewSection(section),
            expanded: section.id === this.selectedId,
            highlighted: currentSectionData?.section.id === section.id,
            hasVisibleModules: contents.length > 0,
            contents,
        };
    }

}

type CourseIndexSection = {
    id: number;
    name: string;
    highlighted: boolean;
    expanded: boolean;
    hasVisibleModules: boolean;
    availabilityinfo: boolean;
    visible: boolean;
    uservisible: boolean;
    contents: (CourseIndexSection | CourseIndexModule)[];
};

type CourseIndexModule = {
    id: number;
    modname: string;
    course: number;
    visible: boolean;
    indented: boolean;
    uservisible: boolean;
    completionStatus?: CoreCourseModuleCompletionStatus;
};

export type CoreCourseIndexSectionWithModule = {
    event: Event;
    sectionId: number;
    moduleId?: number;
};
