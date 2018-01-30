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

import {
    Component, Input, ViewChild, OnInit, OnChanges, DoCheck, ViewContainerRef, ComponentFactoryResolver,
    KeyValueDiffers, SimpleChange
} from '@angular/core';
import { CoreLoggerProvider } from '../../providers/logger';

/**
 * Component to create another component dynamically.
 *
 * You need to pass the class of the component to this component (the class, not the name), along with the input data.
 *
 * So you should do something like:
 *
 *     import { MyComponent } from './component';
 *
 *     ...
 *
 *         this.component = MyComponent;
 *
 * And in the template:
 *
 *     <core-dynamic-component [component]="component" [data]="data">
 *         <p>Cannot render the data.</p>
 *     </core-dynamic-component>
 *
 * Please notice that the component that you pass needs to be declared in entryComponents of the module to be created dynamically.
 *
 * The contents of this component will be displayed if no component is supplied or it cannot be created. In the example above,
 * if no component is supplied then the template will show the message "Cannot render the data.".
 */
@Component({
    selector: 'core-dynamic-component',
    templateUrl: 'dynamic-component.html'
})
export class CoreDynamicComponent implements OnInit, OnChanges, DoCheck {

    @Input() component: any;
    @Input() data: any;

    // Get the container where to put the dynamic component.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) set dynamicComponent(el: ViewContainerRef) {
        this.container = el;
        this.createComponent();
    }

    instance: any;
    container: ViewContainerRef;
    protected logger: any;
    protected differ: any; // To detect changes in the data input.

    constructor(logger: CoreLoggerProvider, private factoryResolver: ComponentFactoryResolver, differs: KeyValueDiffers) {
        this.logger = logger.getInstance('CoreDynamicComponent');
        this.differ = differs.find([]).create();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.createComponent();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (!this.instance && changes.component) {
            this.createComponent();
        }
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        if (this.instance) {
            // Check if there's any change in the data object.
            const changes = this.differ.diff(this.data);
            if (changes) {
                this.setInputData();
                if (this.instance.ngOnChanges) {
                    this.instance.ngOnChanges(this.createChangesForComponent(changes));
                }
            }
        }
    }

    /**
     * Create a component, add it to a container and set the input data.
     *
     * @return {boolean} Whether the component was successfully created.
     */
    protected createComponent(): boolean {
        if (!this.component || !this.container) {
            // No component to instantiate or container doesn't exist right now.
            return false;
        }

        if (this.instance) {
            // Component already instantiated.
            return true;
        }

        try {
            // Create the component and add it to the container.
            const factory = this.factoryResolver.resolveComponentFactory(this.component),
                componentRef = this.container.createComponent(factory);

            this.instance = componentRef.instance;

            this.setInputData();

            return true;
        } catch (ex) {
            this.logger.error('Error creating component', ex);

            return false;
        }
    }

    /**
     * Set the input data for the component.
     */
    protected setInputData(): void {
        for (const name in this.data) {
            this.instance[name] = this.data[name];
        }
    }

    /**
     * Given the changes on the data input, create the changes object for the component.
     *
     * @param {any} changes Changes in the data input (detected by KeyValueDiffer).
     * @return {{[name: string]: SimpleChange}} List of changes for the component.
     */
    protected createChangesForComponent(changes: any): { [name: string]: SimpleChange } {
        const newChanges: { [name: string]: SimpleChange } = {};

        // Added items are considered first change.
        changes.forEachAddedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, true);
        });

        // Changed or removed items aren't first change.
        changes.forEachChangedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, false);
        });
        changes.forEachRemovedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, true);
        });

        return newChanges;
    }
}
