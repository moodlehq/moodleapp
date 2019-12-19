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

import {
    Component, Input, OnInit, OnChanges, OnDestroy, ViewContainerRef, ViewChild, ComponentRef, SimpleChange, ChangeDetectorRef,
    ElementRef, Optional, Output, EventEmitter, DoCheck, KeyValueDiffers, AfterContentInit, AfterViewInit
} from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreCompileProvider } from '../../providers/compile';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * This component has a behaviour similar to $compile for AngularJS. Given an HTML code, it will compile it so all its
 * components and directives are instantiated.
 *
 * IMPORTANT: Use this component only if it is a must. It will create and compile a new component and module everytime this
 * component is used, so it can slow down the app.
 *
 * This component has its own module to prevent circular dependencies. If you want to use it,
 * you need to import CoreCompileHtmlComponentModule.
 *
 * You can provide some Javascript code (as text) to be executed inside the component. The context of the javascript code (this)
 * will be the component instance created to compile the template. This means your javascript code can interact with the template.
 * The component instance will have most of the providers so you can use them in the javascript code. E.g. if you want to use
 * CoreAppProvider, you can do it with "this.CoreAppProvider".
 */
@Component({
    selector: 'core-compile-html',
    template: '<core-loading [hideUntil]="loaded"><ng-container #dynamicComponent></ng-container></core-loading>'
})
export class CoreCompileHtmlComponent implements OnChanges, OnDestroy, DoCheck {
    @Input() text: string; // The HTML text to display.
    @Input() javascript: string; // The Javascript to execute in the component.
    @Input() jsData: any; // Data to pass to the fake component.
    @Input() extraImports: any[] = []; // Extra import modules.
    @Input() extraProviders: any[] = []; // Extra providers.
    @Input() forceCompile: string | boolean; // Set it to true to force compile even if the text/javascript hasn't changed.
    @Output() created: EventEmitter<any> = new EventEmitter(); // Will emit an event when the component is instantiated.
    @Output() compiling: EventEmitter<boolean> = new EventEmitter(); // Event that indicates whether the template is being compiled.

    // Get the container where to put the content.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container: ViewContainerRef;

    loaded: boolean;
    componentInstance: any;

    protected componentRef: ComponentRef<any>;
    protected element;
    protected differ: any; // To detect changes in the jsData input.
    protected creatingComponent = false;
    protected pendingCalls = {};

    constructor(protected compileProvider: CoreCompileProvider, protected cdr: ChangeDetectorRef, element: ElementRef,
            @Optional() protected navCtrl: NavController, differs: KeyValueDiffers, protected domUtils: CoreDomUtilsProvider,
            protected utils: CoreUtilsProvider) {
        this.element = element.nativeElement;
        this.differ = differs.find([]).create();
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        if (this.componentInstance && !this.creatingComponent) {
            // Check if there's any change in the jsData object.
            const changes = this.differ.diff(this.jsData);
            if (changes) {
                this.setInputData();
                if (this.componentInstance.ngOnChanges) {
                    this.componentInstance.ngOnChanges(this.domUtils.createChangesFromKeyValueDiff(changes));
                }
            }
        }
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // Only compile if text/javascript has changed or the forceCompile flag has been set to true.
        if ((changes.text || changes.javascript || (changes.forceCompile && this.utils.isTrueOrOne(this.forceCompile))) &&
                this.text) {

            // Create a new component and a new module.
            this.creatingComponent = true;
            this.compiling.emit(true);
            this.compileProvider.createAndCompileComponent(this.text, this.getComponentClass(), this.extraImports)
                    .then((factory) => {
                // Destroy previous components.
                this.componentRef && this.componentRef.destroy();

                if (factory) {
                    // Create the component.
                    this.componentRef = this.container.createComponent(factory);
                    this.created.emit(this.componentRef.instance);
                }

                this.loaded = true;
            }).catch((error) => {
                this.domUtils.showErrorModal(error);

                this.loaded = true;
            }).finally(() => {
                this.creatingComponent = false;
                this.compiling.emit(false);
            });
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.componentRef && this.componentRef.destroy();
    }

    /**
     * Get a class that defines the dynamic component.
     *
     * @return The component class.
     */
    protected getComponentClass(): any {
        // tslint:disable: no-this-assignment
        const compileInstance = this;

        // Create the component, using the text as the template.
        return class CoreCompileHtmlFakeComponent implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {

            constructor() {
                // Store this instance so it can be accessed by the outer component.
                compileInstance.componentInstance = this;

                // Create 2 empty properties that can be used by the template to store data.
                this['dataObject'] = {};
                this['dataArray'] = [];

                // Inject the libraries.
                compileInstance.compileProvider.injectLibraries(this, compileInstance.extraProviders);

                // Always add these elements, they could be needed on component init (componentObservable).
                this['ChangeDetectorRef'] = compileInstance.cdr;
                this['NavController'] = compileInstance.navCtrl;
                this['componentContainer'] = compileInstance.element;

                // Add the data passed to the component.
                compileInstance.setInputData();
            }

            /**
             * Component being initialized.
             */
            ngOnInit(): void {
                // If there is some javascript to run, do it now.
                if (compileInstance.javascript) {
                    compileInstance.compileProvider.executeJavascript(this, compileInstance.javascript);
                }

                // Call the pending functions.
                for (const name in compileInstance.pendingCalls) {
                    const pendingCall = compileInstance.pendingCalls[name];

                    if (typeof this[name] == 'function') {
                        // Call the function.
                        Promise.resolve(this[name].apply(this, pendingCall.params)).then(pendingCall.defer.resolve)
                                .catch(pendingCall.defer.reject);
                    } else {
                        // Function not defined, resolve the promise.
                        pendingCall.defer.resolve();
                    }
                }

                compileInstance.pendingCalls = {};
            }

            /**
             * Content has been initialized.
             */
            ngAfterContentInit(): void {
                // To be overridden.
            }

            /**
             * View has been initialized.
             */
            ngAfterViewInit(): void {
                // To be overridden.
            }

            /**
             * Component destroyed.
             */
            ngOnDestroy(): void {
                // To be overridden.
            }
        };
    }

    /**
     * Set the JS data as input data of the component instance.
     */
    protected setInputData(): void {
        if (this.componentInstance) {
            for (const name in this.jsData) {
                this.componentInstance[name] = this.jsData[name];
            }
        }
    }

    /**
     * Call a certain function on the component instance.
     *
     * @param name Name of the function to call.
     * @param params List of params to send to the function.
     * @param callWhenCreated If this param is true and the component hasn't been created yet, call the function
     *                        once the component has been created.
     * @return Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: any[], callWhenCreated: boolean = true): any {
        if (this.componentInstance) {
            if (typeof this.componentInstance[name] == 'function') {
                return this.componentInstance[name].apply(this.componentInstance, params);
            }
        } else if (callWhenCreated) {
            // Call it when the component is created.

            if (this.pendingCalls[name]) {
                // Call already pending, just update the params (allow only 1 call per function until it's initialized).
                this.pendingCalls[name].params = params;

                return this.pendingCalls[name].defer.promise;
            }

            const defer = this.utils.promiseDefer();

            this.pendingCalls[name] = {
                params: params,
                defer: defer
            };

            return defer.promise;
        }
    }
}
