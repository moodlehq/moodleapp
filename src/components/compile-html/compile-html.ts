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

import { Component, NgModule, Input, OnInit, OnDestroy, ViewContainerRef, Compiler, ViewChild, ComponentRef } from '@angular/core';
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreComponentsModule } from '../components.module';
import { CoreDirectivesModule } from '../../directives/directives.module';
import { CorePipesModule } from '../../pipes/pipes.module';
import { CoreCourseComponentsModule } from '../../core/course/components/components.module';
import { CoreCoursesComponentsModule } from '../../core/courses/components/components.module';
import { CoreSiteHomeComponentsModule } from '../../core/sitehome/components/components.module';
import { CoreUserComponentsModule } from '../../core/user/components/components.module';

/**
 * This component has a behaviour similar to $compile for AngularJS. Given an HTML code, it will compile it so all its
 * components and directives are instantiated.
 *
 * IMPORTANT Use this component only if it is a must. It will create and compile a new component and module everytime this
 * component is used, so it can slow down the app.
 *
 * This component isn't part of CoreComponentsModule to prevent circular dependencies. If you want to use it,
 * you need to import CoreCompileHtmlComponentsModule.
 */
@Component({
    selector: 'core-compile-html',
    template: '<ng-container #dynamicComponent></ng-container>'
})
export class CoreCompileHtmlComponent implements OnInit, OnDestroy {
    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected IMPORTS = [
        IonicModule, TranslateModule.forChild(), CoreComponentsModule, CoreDirectivesModule, CorePipesModule,
        CoreCourseComponentsModule, CoreCoursesComponentsModule, CoreSiteHomeComponentsModule, CoreUserComponentsModule
    ];

    @Input() text: string; // The HTML text to display.

    // Get the container where to put the content.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container: ViewContainerRef;

    protected componentRef: ComponentRef<any>;

    constructor(protected compiler: Compiler) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.text) {
            // Create a new component and a new module.
            const component = Component({template: this.text})(class {}),
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
}
