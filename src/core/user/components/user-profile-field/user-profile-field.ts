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

import { Component, Input, ViewChild, ViewContainerRef, ComponentFactoryResolver, ComponentRef, OnInit } from '@angular/core';
import { CoreLoggerProvider } from '../../../../providers/logger';
import { CoreUserProfileFieldDelegate } from '../../providers/user-profile-field-delegate';

/**
 * Directive to render user profile field.
 */
@Component({
    selector: 'core-user-profile-field',
    templateUrl: 'user-profile-field.html'
})
export class CoreUserProfileFieldComponent implements OnInit {
    @Input() field: any; // The profile field to be rendered.
    @Input() signup?: boolean = false; // True if editing the field in signup. Defaults to false.
    @Input() edit?: boolean = false; // True if editing the field. Defaults to false.
    @Input() model?: any; // Model where to store the data. Required if edit=true or signup=true.
    @Input() registerAuth?: string; // Register auth method. E.g. 'email'.

    // Get the containers where to inject dynamic components. We use a setter because they might be inside a *ngIf.
    @ViewChild('userProfileField', { read: ViewContainerRef }) set userProfileField (el: ViewContainerRef) {
        if (this.field) {
            this.createComponent(this.ufDelegate.getComponent(this.field, this.signup, this.registerAuth), el);
        } else {
            // The component hasn't been initialized yet. Store the container.
            this.fieldContainer = el;
        }
    };

    protected logger;

    // Instances and containers of all the components that the handler could define.
    protected fieldContainer: ViewContainerRef;
    protected fieldInstance: any;

    constructor(logger: CoreLoggerProvider, private factoryResolver: ComponentFactoryResolver,
            private ufDelegate: CoreUserProfileFieldDelegate) {
        this.logger = logger.getInstance('CoreUserProfileFieldComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        this.createComponent(this.ufDelegate.getComponent(this.field, this.signup, this.registerAuth), this.fieldContainer);
    }

    /**
     * Create a component, add it to a container and set the input data.
     *
     * @param {any} componentClass The class of the component to create.
     * @param {ViewContainerRef} container The container to add the component to.
     * @return {boolean} Whether the component was successfully created.
     */
    protected createComponent(componentClass: any, container: ViewContainerRef) : boolean {
        if (!componentClass || !container) {
            // No component to instantiate or container doesn't exist right now.
            return false;
        }

        if (this.fieldInstance && container === this.fieldContainer) {
            // Component already instantiated and the component hasn't been destroyed, nothing to do.
            return true;
        }

        try {
            // Create the component and add it to the container.
            const factory = this.factoryResolver.resolveComponentFactory(componentClass),
                componentRef = container.createComponent(factory);

            this.fieldContainer = container;
            this.fieldInstance = componentRef.instance;

            // Set the Input data.
            this.fieldInstance.field = this.field;
            this.fieldInstance.edit = this.edit;
            this.fieldInstance.model = this.model;

            return true;
        } catch(ex) {
            this.logger.error('Error creating user field component', ex, componentClass);
            return false;
        }
    }
}
