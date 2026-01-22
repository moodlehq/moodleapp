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

import { InstanceMethodParams, InstanceMethodReturn } from '@/core/utils/inference';
import {
    Component,
    Input,
    ViewChild,
    OnChanges,
    DoCheck,
    ViewContainerRef,
    ComponentRef,
    KeyValueDiffers,
    SimpleChange,
    ChangeDetectorRef,
    ElementRef,
    KeyValueDiffer,
    Type,
    inject,
    EventEmitter,
    OutputEmitterRef,
} from '@angular/core';
import type { AsyncDirective } from '@coretypes/async-directive';
import { CorePromisedValue } from '@classes/promised-value';

import { CoreAngular } from '@singletons/angular';
import { CoreLogger } from '@singletons/logger';

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
 * Alternatively, you can also supply a ComponentRef instead of the class of the component. In this case, the component won't
 * be instantiated because it already is, it will be attached to the view and the right data will be passed to it.
 * Passing ComponentRef is meant for site plugins.
 *
 * The contents of this component will be displayed if no component is supplied or it cannot be created. In the example above,
 * if no component is supplied then the template will show the message "Cannot render the data.".
 */
@Component({
    selector: 'core-dynamic-component',
    templateUrl: 'core-dynamic-component.html',
    styles: [':host { display: contents; }'],
})
export class CoreDynamicComponent<ComponentClass> implements OnChanges, DoCheck, AsyncDirective {

    @Input() component?: Type<ComponentClass>;
    @Input() data?: Record<string | number, unknown>;

    // Get the container where to put the dynamic component.
    @ViewChild('dynamicComponent', { read: ViewContainerRef })
    set dynamicComponent(el: ViewContainerRef) {
        this.container = el;

        // Use a timeout to avoid ExpressionChangedAfterItHasBeenCheckedError.
        setTimeout(() => this.createComponent());
    }

    protected promisedInstance = new CorePromisedValue<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

    container?: ViewContainerRef;

    protected logger: CoreLogger;
    protected differ: KeyValueDiffer<unknown, unknown>; // To detect changes in the data input.
    protected lastComponent?: Type<unknown>;
    protected cdr = inject(ChangeDetectorRef);
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected componentRef?: ComponentRef<ComponentClass>;

    get instance(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
        return this.promisedInstance.value;
    }

    constructor() {
        const differs = inject(KeyValueDiffers);

        this.logger = CoreLogger.getInstance('CoreDynamicComponent');
        this.differ = differs.find([]).create();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.component && !this.component) {
            // Component not set, destroy the instance if any.
            this.lastComponent = undefined;
            this.promisedInstance.reset();
            this.container?.clear();
        } else if (changes.component && (!this.instance || this.component != this.lastComponent)) {
            this.createComponent();
        }
    }

    /**
     * @inheritdoc
     */
    ngDoCheck(): void {
        if (!this.instance) {
            return;
        }

        // Check if there's any change in the data object.
        const changes = this.differ.diff(this.data || {});
        if (changes) {
            this.setInputData();
            if (this.instance.ngOnChanges) {
                this.instance.ngOnChanges(CoreAngular.createChangesFromKeyValueDiff(changes));
            }
        }
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        const instance = await this.promisedInstance;

        if (instance && typeof instance['ready'] === 'function') {
            await instance.ready();
        }
    }

    /**
     * Call a certain method on the component.
     *
     * @param method Name of the method to call.
     * @param params List of params to send to the method.
     * @returns Result of the call. Undefined if the component instance is not ready.
     */
    callComponentMethod<Method extends keyof ComponentClass>(
        method: Method,
        ...params: InstanceMethodParams<ComponentClass, Method>
    ): InstanceMethodReturn<ComponentClass, Method> | undefined {
        const instance = this.instance;
        if (typeof instance?.[method] !== 'function') {
            return;
        }

        return instance[method].apply(instance, params);
    }

    /**
     * Create a component, add it to a container and set the input data.
     *
     * @returns Whether the component was successfully created.
     */
    protected createComponent(): boolean {
        this.lastComponent = this.component;

        if (!this.component || !this.container) {
            // No component to instantiate or container doesn't exist right now.
            return false;
        }

        if (this.promisedInstance.isSettled()) {
            // Component already instantiated.
            return true;
        }

        if (this.component instanceof ComponentRef) {
            // A ComponentRef was supplied instead of the component class. Add it to the view.
            this.container.insert(this.component.hostView);
            this.componentRef = this.component;

            // This feature is usually meant for site plugins. Inject some properties.
            this.component.instance['ChangeDetectorRef'] = this.cdr;
            this.component.instance['componentContainer'] = this.element;

            this.promisedInstance.resolve(this.component.instance);
        } else {
            try {
                // Create the component and add it to the container.
                this.componentRef = this.container.createComponent(this.component);

                this.promisedInstance.resolve(this.componentRef.instance);
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
        if (!this.componentRef) {
            return;
        }

        const instance = this.componentRef.instance;
        for (const name in this.data) {
            if (this.isOutput(instance[name]) || (instance[name] === undefined && this.isOutput(this.data[name]))) {
                instance[name] = this.data[name];
            } else {
                this.componentRef.setInput(name, this.data[name]);
            }
        }
    }

    /**
     * Check if a value is an output.
     *
     * @param value Value to check.
     * @returns Whether the value is an output.
     */
    protected isOutput(value: unknown): boolean {
        return value instanceof EventEmitter || value instanceof OutputEmitterRef;
    }

}
