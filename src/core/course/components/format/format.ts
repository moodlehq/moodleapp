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

import { Component, Input, OnInit, OnChanges, ViewContainerRef, ComponentFactoryResolver, ViewChild, ChangeDetectorRef,
         SimpleChange } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '../../../../providers/logger';
import { CoreCourseProvider } from '../../../course/providers/course';
import { CoreCourseFormatDelegate } from '../../../course/providers/format-delegate';

/**
 * Component to display course contents using a certain format. If the format isn't found, use default one.
 *
 * The inputs of this component will be shared with the course format components. Please use CoreCourseFormatDelegate
 * to register your handler for course formats.
 *
 * Example usage:
 *
 * <core-course-format [course]="course" [sections]="sections"></core-course-format>
 */
@Component({
    selector: 'core-course-format',
    templateUrl: 'format.html'
})
export class CoreCourseFormatComponent implements OnInit, OnChanges {
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.

    // Get the containers where to inject dynamic components. We use a setter because they might be inside a *ngIf.
    @ViewChild('courseFormat', { read: ViewContainerRef }) set courseFormat(el: ViewContainerRef) {
        if (this.course) {
            this.createComponent('courseFormat', this.cfDelegate.getCourseFormatComponent(this.course), el);
        } else {
            // The component hasn't been initialized yet. Store the container.
            this.componentContainers['courseFormat'] = el;
        }
    };
    @ViewChild('courseSummary', { read: ViewContainerRef }) set courseSummary(el: ViewContainerRef) {
        this.createComponent('courseSummary', this.cfDelegate.getCourseSummaryComponent(this.course), el);
    };
    @ViewChild('sectionSelector', { read: ViewContainerRef }) set sectionSelector(el: ViewContainerRef) {
        this.createComponent('sectionSelector', this.cfDelegate.getSectionSelectorComponent(this.course), el);
    };
    @ViewChild('singleSection', { read: ViewContainerRef }) set singleSection(el: ViewContainerRef) {
        this.createComponent('singleSection', this.cfDelegate.getSingleSectionComponent(this.course), el);
    };
    @ViewChild('allSections', { read: ViewContainerRef }) set allSections(el: ViewContainerRef) {
        this.createComponent('allSections', this.cfDelegate.getAllSectionsComponent(this.course), el);
    };

    // Instances and containers of all the components that the handler could define.
    protected componentContainers: {[type: string]: ViewContainerRef} = {};
    componentInstances: {[type: string]: any} = {};

    displaySectionSelector: boolean;
    selectedSection: any;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    selectOptions: any = {};

    protected logger;

    constructor(logger: CoreLoggerProvider, private cfDelegate: CoreCourseFormatDelegate, translate: TranslateService,
            private factoryResolver: ComponentFactoryResolver, private cdr: ChangeDetectorRef) {
        this.logger = logger.getInstance('CoreCourseFormatComponent');
        this.selectOptions.title = translate.instant('core.course.sections');
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        this.displaySectionSelector = this.cfDelegate.displaySectionSelector(this.course);

        this.createComponent(
                'courseFormat', this.cfDelegate.getCourseFormatComponent(this.course), this.componentContainers['courseFormat']);
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}) {
        if (!this.selectedSection && changes.sections && this.sections) {
            this.sectionChanged(this.cfDelegate.getCurrentSection(this.course, this.sections));
        }

        if (!Object.keys(this.componentInstances).length) {
            // We haven't created any component dynamically, stop.
            return;
        }

        // Apply the changes to the components and call ngOnChanges if it exists.
        for (let type in this.componentInstances) {
            let instance = this.componentInstances[type];

            for (let name in changes) {
                instance[name] = changes[name].currentValue;
            }

            if (instance.ngOnChanges) {
                instance.ngOnChanges(changes);
            }
        }
    }

    /**
     * Create a component, add it to a container and set the input data.
     *
     * @param {string} type The "type" of the component.
     * @param {any} componentClass The class of the component to create.
     * @param {ViewContainerRef} container The container to add the component to.
     * @return {boolean} Whether the component was successfully created.
     */
    protected createComponent(type: string, componentClass: any, container: ViewContainerRef) : boolean {
        if (!componentClass || !container) {
            // No component to instantiate or container doesn't exist right now.
            return false;
        }

        if (this.componentInstances[type] && container === this.componentContainers[type]) {
            // Component already instantiated and the component hasn't been destroyed, nothing to do.
            return true;
        }

        try {
            // Create the component and add it to the container.
            const factory = this.factoryResolver.resolveComponentFactory(componentClass),
                componentRef = container.createComponent(factory);

            this.componentContainers[type] = container;
            this.componentInstances[type] = componentRef.instance;
            this.cdr.detectChanges(); // The instances are used in ngIf, tell Angular that something has changed.

            // Set the Input data.
            this.componentInstances[type].course = this.course;
            this.componentInstances[type].sections = this.sections;

            return true;
        } catch(ex) {
            this.logger.error('Error creating component', type, ex, componentClass);
            return false;
        }
    }

    /**
     * Function called when selected section changes.
     *
     * @param {any} newSection The new selected section.
     */
    sectionChanged(newSection: any) {
        let previousValue = this.selectedSection;
        this.selectedSection = newSection;

        // If there is a component to render the current section, update its section.
        if (this.componentInstances.singleSection) {
            this.componentInstances.singleSection.section = this.selectedSection;
            if (this.componentInstances.singleSection.ngOnChanges) {
                this.componentInstances.singleSection.ngOnChanges({
                    section: new SimpleChange(previousValue, newSection, typeof previousValue != 'undefined')
                });
            }
        }
    }

    /**
     * Compare if two sections are equal.
     *
     * @param {any} s1 First section.
     * @param {any} s2 Second section.
     * @return {boolean} Whether they're equal.
     */
    compareSections(s1: any, s2: any) : boolean {
        return s1 && s2 ? s1.id === s2.id : s1 === s2;
    }
}
