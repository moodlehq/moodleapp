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
    Component, Input, ViewChild, OnInit, OnChanges, DoCheck, ViewContainerRef, ComponentFactoryResolver, ComponentRef,
    KeyValueDiffers, SimpleChange, ChangeDetectorRef, Optional, ElementRef
} from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

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
 * Alternatively, you can also supply a ComponentRef instead of the class of the component. In this case, the component won't
 * be instantiated because it already is, it will be attached to the view and the right data will be passed to it.
 * Passing ComponentRef is meant for site plugins, so we'll inject a NavController instance to the component.
 *
 * The contents of this component will be displayed if no component is supplied or it cannot be created. In the example above,
 * if no component is supplied then the template will show the message "Cannot render the data.".
 */
@Component({
    selector: 'core-dynamic-component',
    templateUrl: 'core-dynamic-component.html'
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
    protected lastComponent: any;

    constructor(logger: CoreLoggerProvider, protected factoryResolver: ComponentFactoryResolver, differs: KeyValueDiffers,
            @Optional() protected navCtrl: NavController, protected cdr: ChangeDetectorRef, protected element: ElementRef,
            protected domUtils: CoreDomUtilsProvider) {

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

        if (changes.component && !this.component) {
            // Component not set, destroy the instance if any.
            this.lastComponent = undefined;
            this.instance = undefined;
            this.container && this.container.clear();
        } else if (changes.component && (!this.instance || this.component != this.lastComponent)) {
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
                    this.instance.ngOnChanges(this.domUtils.createChangesFromKeyValueDiff(changes));
                }
            }
        }
    }

    /**
     * Call a certain function on the component.
     *
     * @param {string} name Name of the function to call.
     * @param {any[]} params List of params to send to the function.
     * @return {any} Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: any[]): any {
        if (this.instance && typeof this.instance[name] == 'function') {
            return this.instance[name].apply(this.instance, params);
        }
    }

    /**
     * Create a component, add it to a container and set the input data.
     *
     * @return {boolean} Whether the component was successfully created.
     */
    protected createComponent(): boolean {
        this.lastComponent = this.component;

        if (!this.component || !this.container) {
            // No component to instantiate or container doesn't exist right now.
            return false;
        }

        if (this.instance) {
            // Component already instantiated.
            return true;
        }

        if (this.component instanceof ComponentRef) {
            // A ComponentRef was supplied instead of the component class. Add it to the view.
            this.container.insert(this.component.hostView);
            this.instance = this.component.instance;

            // This feature is usually meant for site plugins. Inject some properties.
            this.instance['ChangeDetectorRef'] = this.cdr;
            this.instance['NavController'] = this.navCtrl;
            this.instance['componentContainer'] = this.element.nativeElement;
        } else {
            try {
                // Create the component and add it to the container.
                const factory = this.factoryResolver.resolveComponentFactory(this.component),
                    componentRef = this.container.createComponent(factory);

                this.instance = componentRef.instance;
            } catch (ex) {
                this.logger.error('Error creating component', ex);

                return false;
            }
        }

        this.setInputData();

        return true;
    }

    /**
     * Set the input data for the component.
     */
    protected setInputData(): void {
        for (const name in this.data) {
            this.instance[name] = this.data[name];
        }
    }
}
