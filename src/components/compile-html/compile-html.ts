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
    Component, NgModule, Input, OnInit, OnChanges, OnDestroy, ViewContainerRef, Compiler, ViewChild, ComponentRef, Injector,
    SimpleChange, ChangeDetectorRef
} from '@angular/core';
import {
    IonicModule, NavController, Platform, ActionSheetController, AlertController, LoadingController, ModalController,
    PopoverController, ToastController
} from 'ionic-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '../../providers/logger';

// Import all modules that define components, directives and pipes.
import { CoreComponentsModule } from '../components.module';
import { CoreDirectivesModule } from '../../directives/directives.module';
import { CorePipesModule } from '../../pipes/pipes.module';
import { CoreCourseComponentsModule } from '../../core/course/components/components.module';
import { CoreCourseDirectivesModule } from '../../core/course/directives/directives.module';
import { CoreCoursesComponentsModule } from '../../core/courses/components/components.module';
import { CoreSiteHomeComponentsModule } from '../../core/sitehome/components/components.module';
import { CoreUserComponentsModule } from '../../core/user/components/components.module';

// Import core providers.
import { CORE_PROVIDERS } from '../../app/app.module';
import { CORE_CONTENTLINKS_PROVIDERS } from '../../core/contentlinks/contentlinks.module';
import { CORE_COURSE_PROVIDERS } from '../../core/course/course.module';
import { CORE_COURSES_PROVIDERS } from '../../core/courses/courses.module';
import { CORE_FILEUPLOADER_PROVIDERS } from '../../core/fileuploader/fileuploader.module';
import { CORE_GRADES_PROVIDERS } from '../../core/grades/grades.module';
import { CORE_LOGIN_PROVIDERS } from '../../core/login/login.module';
import { CORE_MAINMENU_PROVIDERS } from '../../core/mainmenu/mainmenu.module';
import { CORE_SHAREDFILES_PROVIDERS } from '../../core/sharedfiles/sharedfiles.module';
import { CORE_SITEADDONS_PROVIDERS } from '../../core/siteaddons/siteaddons.module';
import { CORE_SITEHOME_PROVIDERS } from '../../core/sitehome/sitehome.module';
import { CORE_USER_PROVIDERS } from '../../core/user/user.module';
import { IONIC_NATIVE_PROVIDERS } from '../../core/emulator/emulator.module';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';
import { CoreConfigConstants } from '../../configconstants';
import { CoreConstants } from '../../core/constants';
import * as moment from 'moment';
import { Md5 } from 'ts-md5/dist/md5';

/**
 * This component has a behaviour similar to $compile for AngularJS. Given an HTML code, it will compile it so all its
 * components and directives are instantiated.
 *
 * IMPORTANT: Use this component only if it is a must. It will create and compile a new component and module everytime this
 * component is used, so it can slow down the app.
 *
 * This component isn't part of CoreComponentsModule to prevent circular dependencies. If you want to use it,
 * you need to import CoreCompileHtmlComponentsModule.
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
        CoreCourseDirectivesModule
    ];

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected OTHER_PROVIDERS = [
        TranslateService, Http, HttpClient, Platform, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder
    ];

    @Input() text: string; // The HTML text to display.
    @Input() javascript: string; // The javascript to execute in the component.

    // Get the container where to put the content.
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container: ViewContainerRef;

    protected componentRef: ComponentRef<any>;
    protected logger;

    constructor(logger: CoreLoggerProvider, protected compiler: Compiler, protected injector: Injector,
            protected cdr: ChangeDetectorRef, protected navCtrl: NavController) {
        this.logger = logger.getInstance('CoreCompileHtmlComponent');
    }

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
        const compileInstance = this,
            providers = (<any[]> CORE_PROVIDERS).concat(CORE_CONTENTLINKS_PROVIDERS).concat(CORE_COURSE_PROVIDERS)
                .concat(CORE_COURSES_PROVIDERS).concat(CORE_FILEUPLOADER_PROVIDERS).concat(CORE_GRADES_PROVIDERS)
                .concat(CORE_LOGIN_PROVIDERS).concat(CORE_MAINMENU_PROVIDERS).concat(CORE_SHAREDFILES_PROVIDERS)
                .concat(CORE_SITEHOME_PROVIDERS).concat(CORE_SITEADDONS_PROVIDERS).concat(CORE_USER_PROVIDERS)
                .concat(IONIC_NATIVE_PROVIDERS).concat(this.OTHER_PROVIDERS);

        // Create the component, using the text as the template.
        return Component({
            template: this.text
        })
        (class CoreCompileHtmlFakeComponent implements OnInit {

            constructor() {
                // We cannot inject anything to this constructor. Use the Injector to inject all the providers into the instance.
                for (const i in providers) {
                    const providerDef = providers[i];
                    if (typeof providerDef == 'function' && providerDef.name) {
                        try {
                            // Inject the provider to the instance. We use the class name as the property name.
                            this[providerDef.name] = compileInstance.injector.get(providerDef);
                        } catch (ex) {
                            compileInstance.logger.warn('Error injecting provider', providerDef.name, ex);
                        }
                    }
                }

                // Add some final components and providers.
                this['ChangeDetectorRef'] = compileInstance.cdr;
                this['NavController'] = compileInstance.navCtrl;
                this['Validators'] = Validators;
                this['CoreConfigConstants'] = CoreConfigConstants;
                this['CoreConstants'] = CoreConstants;
                this['moment'] = moment;
                this['Md5'] = Md5;
                this['componentContainer'] = compileInstance.container;
            }

            ngOnInit(): void {
                // If there is some javascript to run, do it now.
                if (compileInstance.javascript) {
                    // tslint:disable: no-eval
                    eval(compileInstance.javascript);
                }
            }
        });
    }
}
