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
    Component, Input, OnInit, OnChanges, OnDestroy, ViewContainerRef, ViewChild, ComponentRef, SimpleChange, ChangeDetectorRef,
    ElementRef, Optional, Output, EventEmitter, DoCheck, KeyValueDiffers
} from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreCompileProvider } from '../../providers/compile';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

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
    @Output() created: EventEmitter<any> = new EventEmitter(); // Will emit an event when the component is instantiated.

    // Get the container where to put the content.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container: ViewContainerRef;

    loaded: boolean;

    protected componentRef: ComponentRef<any>;
    protected componentInstance: any;
    protected element;
    protected differ: any; // To detect changes in the jsData input.

    constructor(protected compileProvider: CoreCompileProvider, protected cdr: ChangeDetectorRef, element: ElementRef,
            @Optional() protected navCtrl: NavController, differs: KeyValueDiffers, protected domUtils: CoreDomUtilsProvider) {
        this.element = element.nativeElement;
        this.differ = differs.find([]).create();
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        if (this.componentInstance) {
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
        if ((changes.text || changes.javascript) && this.text) {
            // Create a new component and a new module.
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
     * @return {any} The component class.
     */
    protected getComponentClass(): any {
        // tslint:disable: no-this-assignment
        const compileInstance = this;

        // Create the component, using the text as the template.
        return class CoreCompileHtmlFakeComponent implements OnInit {
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

            ngOnInit(): void {
                // If there is some javascript to run, do it now.
                if (compileInstance.javascript) {
                    compileInstance.compileProvider.executeJavascript(this, compileInstance.javascript);
                }
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
}
