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
    Component, NgModule, Input, OnInit, OnChanges, OnDestroy, ViewContainerRef, Compiler, ViewChild, ComponentRef,
    SimpleChange, ChangeDetectorRef
} from '@angular/core';
import { IonicModule, NavController } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreCompileProvider } from '../../../compile/providers/compile';

// Import all modules that define components, directives and pipes.
import { CoreComponentsModule } from '../../../../components/components.module';
import { CoreDirectivesModule } from '../../../../directives/directives.module';
import { CorePipesModule } from '../../../../pipes/pipes.module';
import { CoreCourseComponentsModule } from '../../../course/components/components.module';
import { CoreCourseDirectivesModule } from '../../../course/directives/directives.module';
import { CoreCoursesComponentsModule } from '../../../courses/components/components.module';
import { CoreSiteAddonsDirectivesModule } from '../../../siteaddons/directives/directives.module';
import { CoreSiteHomeComponentsModule } from '../../../sitehome/components/components.module';
import { CoreUserComponentsModule } from '../../../user/components/components.module';

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
    template: '<ng-container #dynamicComponent></ng-container>'
})
export class CoreCompileHtmlComponent implements OnChanges, OnDestroy {
    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected IMPORTS = [
        IonicModule, TranslateModule.forChild(), CoreComponentsModule, CoreDirectivesModule, CorePipesModule,
        CoreCourseComponentsModule, CoreCoursesComponentsModule, CoreSiteHomeComponentsModule, CoreUserComponentsModule,
        CoreCourseDirectivesModule, CoreSiteAddonsDirectivesModule
    ];

    @Input() text: string; // The HTML text to display.
    @Input() javascript: string; // The Javascript to execute in the component.
    @Input() jsData; // Data to pass to the fake component.

    // Get the container where to put the content.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container: ViewContainerRef;

    protected componentRef: ComponentRef<any>;

    constructor(protected compileProvider: CoreCompileProvider, protected compiler: Compiler,
            protected cdr: ChangeDetectorRef, protected navCtrl: NavController) { }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if ((changes.text || changes.javascript) && this.text) {
            // Create a new component and a new module.
            const component = this.createComponent(),
                module = NgModule({imports: this.IMPORTS, declarations: [component]})(class {});

            // Compile the module and the component.
            this.compiler.compileModuleAndAllComponentsAsync(module).then((factories) => {
                // Search the factory of the component we just created.
                let componentFactory;
                for (const i in factories.componentFactories) {
                    const factory = factories.componentFactories[i];
                    if (factory.componentType == component) {
                        componentFactory = factory;
                        break;
                    }
                }

                // Destroy previous components.
                this.componentRef && this.componentRef.destroy();

                // Create the component.
                this.componentRef = this.container.createComponent(componentFactory);
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
     * Create a dynamic component to compile the HTML and run the javascript.
     *
     * @return {any} The component class.
     */
    protected createComponent(): any {
        // tslint:disable: no-this-assignment
        const compileInstance = this;

        // Create the component, using the text as the template.
        return Component({
            template: this.text
        })
        (class CoreCompileHtmlFakeComponent implements OnInit {

            constructor() {
                // If there is some javascript to run, prepare the instance.
                if (compileInstance.javascript) {
                    compileInstance.compileProvider.injectLibraries(this);

                    // Add some more components and classes.
                    this['ChangeDetectorRef'] = compileInstance.cdr;
                    this['NavController'] = compileInstance.navCtrl;
                    this['componentContainer'] = compileInstance.container;

                    // Add the data passed to the component.
                    for (const name in compileInstance.jsData) {
                        this[name] = compileInstance.jsData[name];
                    }
                }
            }

            ngOnInit(): void {
                // If there is some javascript to run, do it now.
                if (compileInstance.javascript) {
                    compileInstance.compileProvider.executeJavascript(this, compileInstance.javascript);
                }
            }
        });
    }
}
