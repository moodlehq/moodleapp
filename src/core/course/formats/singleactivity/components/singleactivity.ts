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

import { Component, Input, OnChanges, SimpleChange, ViewChild, Injector, Output, EventEmitter } from '@angular/core';
import { CoreCourseModuleDelegate } from '../../../providers/module-delegate';
import { CoreCourseUnsupportedModuleComponent } from '../../../components/unsupported-module/unsupported-module';
import { CoreDynamicComponent } from '../../../../../components/dynamic-component/dynamic-component';

/**
 * Component to display single activity format. It will determine the right component to use and instantiate it.
 *
 * The instantiated component will receive the course and the module as inputs.
 */
@Component({
    selector: 'core-course-format-single-activity',
    templateUrl: 'core-course-format-single-activity.html'
})
export class CoreCourseFormatSingleActivityComponent implements OnChanges {
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged?: EventEmitter<void>; // Will emit an event when any module completion changes.

    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    componentClass: any; // The class of the component to render.
    data: any = {}; // Data to pass to the component.

    constructor(private moduleDelegate: CoreCourseModuleDelegate, private injector: Injector) { }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (this.course && this.sections && this.sections.length) {
            // In single activity the module should only have 1 section and 1 module. Get the module.
            const module = this.sections[0] && this.sections[0].modules && this.sections[0].modules[0];
            if (module && !this.componentClass) {
                // We haven't obtained the class yet. Get it now.
                this.moduleDelegate.getMainComponent(this.injector, this.course, module).then((component) => {
                    this.componentClass = component || CoreCourseUnsupportedModuleComponent;
                });
            }

            this.data.courseId = this.course.id;
            this.data.module = module;
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @param {boolean} [afterCompletionChange] Whether the refresh is due to a completion change.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, afterCompletionChange?: boolean): Promise<any> {
        if (afterCompletionChange) {
            // Don't refresh the view after a completion change since completion isn't displayed.
            return Promise.resolve();
        }

        return Promise.resolve(this.dynamicComponent.callComponentFunction('doRefresh', [refresher, done]));
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponent.callComponentFunction('ionViewDidEnter');
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponent.callComponentFunction('ionViewDidLeave');
    }
}
