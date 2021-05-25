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

import { Directive, Input, OnInit, ElementRef } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse, CoreCourseModuleContentFile, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUtilsOpenFileOptions } from '@services/utils/utils';

/**
 * Directive to allow downloading and open the main file of a module.
 * When the item with this directive is clicked, the module will be downloaded (if needed) and opened.
 * This is meant for modules like mod_resource.
 *
 * This directive must receive either a module or a moduleId. If no files are provided, it will use module.contents.
 */
@Directive({
    selector: '[core-course-download-module-main-file]',
})
export class CoreCourseDownloadModuleMainFileDirective implements OnInit {

    @Input() module?: CoreCourseWSModule; // The module.
    @Input() moduleId?: string | number; // The module ID. Required if module is not supplied.
    @Input() courseId?: string | number; // The course ID.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component. If not defined, use moduleId.
    @Input() files?: CoreCourseModuleContentFile[]; // List of files of the module. If not provided, use module.contents.
    @Input() options?: CoreUtilsOpenFileOptions = {};

    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', async (ev: Event) => {
            if (!this.module && !this.moduleId) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const modal = await CoreDomUtils.showModalLoading();
            const courseId = typeof this.courseId == 'string' ? parseInt(this.courseId, 10) : this.courseId;

            try {
                if (!this.module) {
                    // Try to get the module from cache.
                    this.moduleId = typeof this.moduleId == 'string' ? parseInt(this.moduleId, 10) : this.moduleId;
                    this.module = await CoreCourse.getModule(this.moduleId!, courseId);
                }

                const componentId = this.componentId || module.id;

                await CoreCourseHelper.downloadModuleAndOpenFile(
                    this.module,
                    courseId ?? this.module.course!,
                    this.component,
                    componentId,
                    this.files,
                    undefined,
                    this.options,
                );
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            } finally {
                modal.dismiss();
            }
        });
    }

}
