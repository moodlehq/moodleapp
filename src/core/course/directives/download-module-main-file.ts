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
import { CoreCourseProvider } from '../providers/course';
import { CoreCourseHelperProvider } from '../providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Directive to allow downloading and open the main file of a module.
 * When the item with this directive is clicked, the module will be downloaded (if needed) and opened.
 * This is meant for modules like mod_resource.
 *
 * This directive must receive either a module or a moduleId. If no files are provided, it will use module.contents.
 */
@Directive({
    selector: '[core-course-download-module-main-file]'
})
export class CoreCourseDownloadModuleMainFileDirective implements OnInit {
    @Input() module: any; // The module.
    @Input() moduleId: string | number; // The module ID. Required if module is not supplied.
    @Input() courseId: string | number; // The course ID.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component. If not defined, use moduleId.
    @Input() files?: any[]; // List of files of the module. If not provided, use module.contents.

    protected element: HTMLElement;

    constructor(element: ElementRef, protected domUtils: CoreDomUtilsProvider, protected courseHelper: CoreCourseHelperProvider,
            protected courseProvider: CoreCourseProvider) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            if (!this.module && !this.moduleId) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const modal = this.domUtils.showModalLoading(),
                courseId = typeof this.courseId == 'string' ? parseInt(this.courseId, 10) : this.courseId;
            let promise;

            if (this.module) {
                // We already have the module.
                promise = Promise.resolve(this.module);
            } else {
                // Try to get the module from cache.
                this.moduleId = typeof this.moduleId == 'string' ? parseInt(this.moduleId, 10) : this.moduleId;
                promise = this.courseProvider.getModule(this.moduleId, courseId);
            }

            promise.then((module) => {
                const componentId = this.componentId || module.id;

                return this.courseHelper.downloadModuleAndOpenFile(module, courseId, this.component, componentId, this.files);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }).finally(() => {
                modal.dismiss();
            });
        });
    }
}
