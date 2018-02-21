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

import { Injectable, Injector } from '@angular/core';
import {
    Platform, ActionSheetController, AlertController, LoadingController, ModalController, PopoverController, ToastController
} from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '../../../providers/logger';

// Import core providers.
import { CORE_PROVIDERS } from '../../../app/app.module';
import { CORE_CONTENTLINKS_PROVIDERS } from '../../contentlinks/contentlinks.module';
import { CORE_COURSE_PROVIDERS } from '../../course/course.module';
import { CORE_COURSES_PROVIDERS } from '../../courses/courses.module';
import { CORE_FILEUPLOADER_PROVIDERS } from '../../fileuploader/fileuploader.module';
import { CORE_GRADES_PROVIDERS } from '../../grades/grades.module';
import { CORE_LOGIN_PROVIDERS } from '../../login/login.module';
import { CORE_MAINMENU_PROVIDERS } from '../../mainmenu/mainmenu.module';
import { CORE_SHAREDFILES_PROVIDERS } from '../../sharedfiles/sharedfiles.module';
import { CORE_SITEHOME_PROVIDERS } from '../../sitehome/sitehome.module';
import { CORE_USER_PROVIDERS } from '../../user/user.module';
import { IONIC_NATIVE_PROVIDERS } from '../../emulator/emulator.module';

// Import only this provider to prevent circular dependencies.
import { CoreSiteAddonsProvider } from '../../siteaddons/providers/siteaddons';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreConstants } from '../../constants';
import * as moment from 'moment';
import { Md5 } from 'ts-md5/dist/md5';

// Import core classes that can be useful for site addons.
import { CoreSyncBaseProvider } from '../../../classes/base-sync';
import { CoreCache } from '../../../classes/cache';
import { CoreDelegate } from '../../../classes/delegate';
import { CoreContentLinksHandlerBase } from '../../contentlinks/classes/base-handler';
import { CoreContentLinksModuleGradeHandler } from '../../contentlinks/classes/module-grade-handler';
import { CoreContentLinksModuleIndexHandler } from '../../contentlinks/classes/module-index-handler';
import { CoreCourseModulePrefetchHandlerBase } from '../../course/classes/module-prefetch-handler';

/**
 * Service to provide functionalities regarding compiling dynamic HTML and Javascript.
 */
@Injectable()
export class CoreCompileProvider {

    protected logger;

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected OTHER_PROVIDERS = [
        TranslateService, Http, HttpClient, Platform, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder
    ];

    constructor(protected injector: Injector, logger: CoreLoggerProvider) {
        this.logger = logger.getInstance('CoreCompileProvider');
    }

    /**
     * Eval some javascript using the context of the function.
     *
     * @param {string} javascript The javascript to eval.
     * @return {any} Result of the eval.
     */
    protected evalInContext(javascript: string): any {
        // tslint:disable: no-eval
        return eval(javascript);
    }

    /**
     * Execute some javascript code, using a certain instance as the context.
     *
     * @param {any} instance Instance to use as the context. In the JS code, "this" will be this instance.
     * @param {string} javascript The javascript code to eval.
     * @return {any} Result of the javascript execution.
     */
    executeJavascript(instance: any, javascript: string): any {
        try {
            return this.evalInContext.call(instance, javascript);
        } catch (ex) {
            this.logger.error('Error evaluating javascript', ex);
        }
    }

    /**
     * Inject all the core libraries in a certain object.
     *
     * @param {any} instance The instance where to inject the libraries.
     */
    injectLibraries(instance: any): void {
        const providers = (<any[]> CORE_PROVIDERS).concat(CORE_CONTENTLINKS_PROVIDERS).concat(CORE_COURSE_PROVIDERS)
                .concat(CORE_COURSES_PROVIDERS).concat(CORE_FILEUPLOADER_PROVIDERS).concat(CORE_GRADES_PROVIDERS)
                .concat(CORE_LOGIN_PROVIDERS).concat(CORE_MAINMENU_PROVIDERS).concat(CORE_SHAREDFILES_PROVIDERS)
                .concat(CORE_SITEHOME_PROVIDERS).concat([CoreSiteAddonsProvider]).concat(CORE_USER_PROVIDERS)
                .concat(IONIC_NATIVE_PROVIDERS).concat(this.OTHER_PROVIDERS);

        // We cannot inject anything to this constructor. Use the Injector to inject all the providers into the instance.
        for (const i in providers) {
            const providerDef = providers[i];
            if (typeof providerDef == 'function' && providerDef.name) {
                try {
                    // Inject the provider to the instance. We use the class name as the property name.
                    instance[providerDef.name] = this.injector.get(providerDef);
                } catch (ex) {
                    this.logger.warn('Error injecting provider', providerDef.name, ex);
                }
            }
        }

        // Add some final classes.
        instance['injector'] = this.injector;
        instance['Validators'] = Validators;
        instance['CoreConfigConstants'] = CoreConfigConstants;
        instance['CoreConstants'] = CoreConstants;
        instance['moment'] = moment;
        instance['Md5'] = Md5;
        instance['CoreSyncBaseProvider'] = CoreSyncBaseProvider;
        instance['CoreCache'] = CoreCache;
        instance['CoreDelegate'] = CoreDelegate;
        instance['CoreContentLinksHandlerBase'] = CoreContentLinksHandlerBase;
        instance['CoreContentLinksModuleGradeHandler'] = CoreContentLinksModuleGradeHandler;
        instance['CoreContentLinksModuleIndexHandler'] = CoreContentLinksModuleIndexHandler;
        instance['CoreCourseModulePrefetchHandlerBase'] = CoreCourseModulePrefetchHandlerBase;
    }
}
