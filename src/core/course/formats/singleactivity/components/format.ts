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

import { Component, Input, OnChanges, ViewContainerRef, ComponentFactoryResolver, SimpleChange } from '@angular/core';
import { CoreLoggerProvider } from '../../../../../providers/logger';
import { CoreCourseModuleDelegate } from '../../../providers/module-delegate';
import { CoreCourseUnsupportedModuleComponent } from '../../../components/unsupported-module/unsupported-module';

/**
 * Component to display single activity format. It will determine the right component to use and instantiate it.
 *
 * The instantiated component will receive the course and the module as inputs.
 */
@Component({
    selector: 'core-course-format-single-activity',
    template: ''
})
export class CoreCourseFormatSingleActivityComponent implements OnChanges {
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.

    protected logger: any;
    protected module: any;
    protected componentInstance: any;

    constructor(logger: CoreLoggerProvider, private viewRef: ViewContainerRef, private factoryResolver: ComponentFactoryResolver,
            private moduleDelegate: CoreCourseModuleDelegate) {
        this.logger = logger.getInstance('CoreCourseFormatSingleActivityComponent');
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (this.course && this.sections && this.sections.length) {
            // In single activity the module should only have 1 section and 1 module. Get the module.
            const module = this.sections[0] && this.sections[0].modules && this.sections[0].modules[0];
            if (module && !this.componentInstance) {
                // We haven't created the component yet. Create it now.
                this.createComponent(module);
            }

            if (this.componentInstance && this.componentInstance.ngOnChanges) {
                // Call ngOnChanges of the component.
                const newChanges: { [name: string]: SimpleChange } = {};

                // Check if course has changed.
                if (changes.course) {
                    newChanges.course = changes.course;
                    this.componentInstance.course = this.course;
                }

                // Check if module has changed.
                if (changes.sections && module != this.module) {
                    newChanges.module = {
                        currentValue: module,
                        firstChange: changes.sections.firstChange,
                        previousValue: this.module,
                        isFirstChange: (): boolean => {
                            return newChanges.module.firstChange;
                        }
                    };
                    this.componentInstance.module = module;
                    this.module = module;
                }

                if (Object.keys(newChanges).length) {
                    this.componentInstance.ngOnChanges(newChanges);
                }
            }
        }
    }

    /**
     * Create the component, add it to the container and set the input data.
     *
     * @param {any} module The module.
     * @return {boolean} Whether the component was successfully created.
     */
    protected createComponent(module: any): boolean {
        const componentClass = this.moduleDelegate.getMainComponent(this.course, module) || CoreCourseUnsupportedModuleComponent;
        if (!componentClass) {
            // No component to instantiate.
            return false;
        }

        try {
            // Create the component and add it to the container.
            const factory = this.factoryResolver.resolveComponentFactory(componentClass),
                componentRef = this.viewRef.createComponent(factory);

            this.componentInstance = componentRef.instance;

            // Set the Input data.
            this.componentInstance.courseId = this.course.id;
            this.componentInstance.module = module;

            return true;
        } catch (ex) {
            this.logger.error('Error creating component', ex);

            return false;
        }
    }
}
