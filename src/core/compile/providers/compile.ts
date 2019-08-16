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

import { Injectable, Injector, Component, NgModule, Compiler, ComponentFactory, ComponentRef, NgModuleRef } from '@angular/core';
import { JitCompilerFactory } from '@angular/platform-browser-dynamic';
import {
    Platform, ActionSheetController, AlertController, LoadingController, ModalController, PopoverController, ToastController,
    IonicModule
} from 'ionic-angular';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CoreLoggerProvider } from '@providers/logger';

// Import core providers.
import { CORE_PROVIDERS } from '@app/app.module';
import { CORE_BLOCK_PROVIDERS } from '@core/block/block.module';
import { CORE_CONTENTLINKS_PROVIDERS } from '@core/contentlinks/contentlinks.module';
import { CORE_COURSE_PROVIDERS } from '@core/course/course.module';
import { CORE_COURSES_PROVIDERS } from '@core/courses/courses.module';
import { CORE_FILEUPLOADER_PROVIDERS } from '@core/fileuploader/fileuploader.module';
import { CORE_GRADES_PROVIDERS } from '@core/grades/grades.module';
import { CORE_LOGIN_PROVIDERS } from '@core/login/login.module';
import { CORE_MAINMENU_PROVIDERS } from '@core/mainmenu/mainmenu.module';
import { CORE_QUESTION_PROVIDERS } from '@core/question/question.module';
import { CORE_SHAREDFILES_PROVIDERS } from '@core/sharedfiles/sharedfiles.module';
import { CORE_SITEHOME_PROVIDERS } from '@core/sitehome/sitehome.module';
import { CORE_USER_PROVIDERS } from '@core/user/user.module';
import { CORE_PUSHNOTIFICATIONS_PROVIDERS } from '@core/pushnotifications/pushnotifications.module';
import { IONIC_NATIVE_PROVIDERS } from '@core/emulator/emulator.module';

// Import only this provider to prevent circular dependencies.
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreConstants } from '@core/constants';
import * as moment from 'moment';
import { Md5 } from 'ts-md5/dist/md5';

// Import core classes that can be useful for site plugins.
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCache } from '@classes/cache';
import { CoreDelegate } from '@classes/delegate';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksModuleGradeHandler } from '@core/contentlinks/classes/module-grade-handler';
import { CoreContentLinksModuleIndexHandler } from '@core/contentlinks/classes/module-index-handler';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreCourseResourcePrefetchHandlerBase } from '@core/course/classes/resource-prefetch-handler';

// Import all core modules that define components, directives and pipes.
import { CoreComponentsModule } from '@components/components.module';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CorePipesModule } from '@pipes/pipes.module';
import { CoreCourseComponentsModule } from '@core/course/components/components.module';
import { CoreCourseDirectivesModule } from '@core/course/directives/directives.module';
import { CoreCoursesComponentsModule } from '@core/courses/components/components.module';
import { CoreSitePluginsDirectivesModule } from '@core/siteplugins/directives/directives.module';
import { CoreSiteHomeComponentsModule } from '@core/sitehome/components/components.module';
import { CoreUserComponentsModule } from '@core/user/components/components.module';
import { CoreQuestionComponentsModule } from '@core/question/components/components.module';
import { CoreBlockComponentsModule } from '@core/block/components/components.module';

// Import some components listed in entryComponents so they can be injected dynamically.
import { CoreCourseUnsupportedModuleComponent } from '@core/course/components/unsupported-module/unsupported-module';
import { CoreCourseFormatSingleActivityComponent } from '@core/course/formats/singleactivity/components/singleactivity';
import { CoreSitePluginsModuleIndexComponent } from '@core/siteplugins/components/module-index/module-index';
import { CoreSitePluginsBlockComponent } from '@core/siteplugins/components/block/block';
import { CoreSitePluginsCourseOptionComponent } from '@core/siteplugins/components/course-option/course-option';
import { CoreSitePluginsCourseFormatComponent } from '@core/siteplugins/components/course-format/course-format';
import { CoreSitePluginsQuestionComponent } from '@core/siteplugins/components/question/question';
import { CoreSitePluginsQuestionBehaviourComponent } from '@core/siteplugins/components/question-behaviour/question-behaviour';
import { CoreSitePluginsUserProfileFieldComponent } from '@core/siteplugins/components/user-profile-field/user-profile-field';
import { CoreSitePluginsQuizAccessRuleComponent } from '@core/siteplugins/components/quiz-access-rule/quiz-access-rule';
import { CoreSitePluginsAssignFeedbackComponent } from '@core/siteplugins/components/assign-feedback/assign-feedback';
import { CoreSitePluginsAssignSubmissionComponent } from '@core/siteplugins/components/assign-submission/assign-submission';

// Import addon providers. Do not import database module because it causes circular dependencies.
import { ADDON_BADGES_PROVIDERS } from '@addon/badges/badges.module';
import { ADDON_CALENDAR_PROVIDERS } from '@addon/calendar/calendar.module';
import { ADDON_COMPETENCY_PROVIDERS } from '@addon/competency/competency.module';
import { ADDON_FILES_PROVIDERS } from '@addon/files/files.module';
import { ADDON_MESSAGEOUTPUT_PROVIDERS } from '@addon/messageoutput/messageoutput.module';
import { ADDON_MESSAGES_PROVIDERS } from '@addon/messages/messages.module';
import { ADDON_MOD_ASSIGN_PROVIDERS } from '@addon/mod/assign/assign.module';
import { ADDON_MOD_BOOK_PROVIDERS } from '@addon/mod/book/book.module';
import { ADDON_MOD_CHAT_PROVIDERS } from '@addon/mod/chat/chat.module';
import { ADDON_MOD_CHOICE_PROVIDERS } from '@addon/mod/choice/choice.module';
import { ADDON_MOD_FEEDBACK_PROVIDERS } from '@addon/mod/feedback/feedback.module';
import { ADDON_MOD_FOLDER_PROVIDERS } from '@addon/mod/folder/folder.module';
import { ADDON_MOD_FORUM_PROVIDERS } from '@addon/mod/forum/forum.module';
import { ADDON_MOD_GLOSSARY_PROVIDERS } from '@addon/mod/glossary/glossary.module';
import { ADDON_MOD_IMSCP_PROVIDERS } from '@addon/mod/imscp/imscp.module';
import { ADDON_MOD_LESSON_PROVIDERS } from '@addon/mod/lesson/lesson.module';
import { ADDON_MOD_LTI_PROVIDERS } from '@addon/mod/lti/lti.module';
import { ADDON_MOD_PAGE_PROVIDERS } from '@addon/mod/page/page.module';
import { ADDON_MOD_QUIZ_PROVIDERS } from '@addon/mod/quiz/quiz.module';
import { ADDON_MOD_RESOURCE_PROVIDERS } from '@addon/mod/resource/resource.module';
import { ADDON_MOD_SCORM_PROVIDERS } from '@addon/mod/scorm/scorm.module';
import { ADDON_MOD_SURVEY_PROVIDERS } from '@addon/mod/survey/survey.module';
import { ADDON_MOD_URL_PROVIDERS } from '@addon/mod/url/url.module';
import { ADDON_MOD_WIKI_PROVIDERS } from '@addon/mod/wiki/wiki.module';
import { ADDON_MOD_WORKSHOP_PROVIDERS } from '@addon/mod/workshop/workshop.module';
import { ADDON_NOTES_PROVIDERS } from '@addon/notes/notes.module';
import { ADDON_NOTIFICATIONS_PROVIDERS } from '@addon/notifications/notifications.module';
import { ADDON_REMOTETHEMES_PROVIDERS } from '@addon/remotethemes/remotethemes.module';

// Import some addon modules that define components, directives and pipes. Only import the important ones.
import { AddonModAssignComponentsModule } from '@addon/mod/assign/components/components.module';
import { AddonModWorkshopComponentsModule } from '@addon/mod/workshop/components/components.module';

/**
 * Service to provide functionalities regarding compiling dynamic HTML and Javascript.
 */
@Injectable()
export class CoreCompileProvider {

    protected logger;
    protected compiler: Compiler;

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected OTHER_PROVIDERS = [
        TranslateService, Http, HttpClient, Platform, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder
    ];

    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected IMPORTS = [
        IonicModule, TranslateModule.forChild(), CoreComponentsModule, CoreDirectivesModule, CorePipesModule,
        CoreCourseComponentsModule, CoreCoursesComponentsModule, CoreSiteHomeComponentsModule, CoreUserComponentsModule,
        CoreCourseDirectivesModule, CoreSitePluginsDirectivesModule, CoreQuestionComponentsModule, AddonModAssignComponentsModule,
        AddonModWorkshopComponentsModule, CoreBlockComponentsModule
    ];

    constructor(protected injector: Injector, logger: CoreLoggerProvider, compilerFactory: JitCompilerFactory) {
        this.logger = logger.getInstance('CoreCompileProvider');

        this.compiler = compilerFactory.createCompiler();
    }

    /**
     * Create and compile a dynamic component.
     *
     * @param {string} template The template of the component.
     * @param {any} componentClass The JS class of the component.
     * @param {any[]} [extraImports] Extra imported modules if needed and not imported by this class.
     * @return {Promise<ComponentFactory<any>>} Promise resolved with the factory to instantiate the component.
     */
    createAndCompileComponent(template: string, componentClass: any, extraImports: any[] = []): Promise<ComponentFactory<any>> {
        // Create the component using the template and the class.
        const component = Component({
            template: template
        })
        (componentClass);

        const imports = this.IMPORTS.concat(extraImports);

        // Now create the module containing the component.
        const module = NgModule({imports: imports, declarations: [component]})(class {});

        try {
            // Compile the module and the component.
            return this.compiler.compileModuleAndAllComponentsAsync(module).then((factories) => {
                // Search and return the factory of the component we just created.
                for (const i in factories.componentFactories) {
                    const factory = factories.componentFactories[i];
                    if (factory.componentType == component) {
                        return factory;
                    }
                }
            });
        } catch (ex) {
            return Promise.reject({message: 'Template has some errors and cannot be displayed.', debuginfo: ex});
        }
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
     * @param {any[]} [extraProviders] Extra imported providers if needed and not imported by this class.
     */
    injectLibraries(instance: any, extraProviders: any[] = []): void {
        const providers = (<any[]> CORE_PROVIDERS).concat(CORE_CONTENTLINKS_PROVIDERS).concat(CORE_COURSE_PROVIDERS)
                .concat(CORE_COURSES_PROVIDERS).concat(CORE_FILEUPLOADER_PROVIDERS).concat(CORE_GRADES_PROVIDERS)
                .concat(CORE_LOGIN_PROVIDERS).concat(CORE_MAINMENU_PROVIDERS).concat(CORE_SHAREDFILES_PROVIDERS)
                .concat(CORE_SITEHOME_PROVIDERS).concat([CoreSitePluginsProvider]).concat(CORE_USER_PROVIDERS)
                .concat(CORE_QUESTION_PROVIDERS).concat(IONIC_NATIVE_PROVIDERS).concat(this.OTHER_PROVIDERS).concat(extraProviders)
                .concat(ADDON_BADGES_PROVIDERS).concat(ADDON_CALENDAR_PROVIDERS).concat(ADDON_COMPETENCY_PROVIDERS)
                .concat(ADDON_FILES_PROVIDERS).concat(ADDON_MESSAGEOUTPUT_PROVIDERS).concat(ADDON_MESSAGES_PROVIDERS)
                .concat(ADDON_MOD_ASSIGN_PROVIDERS).concat(ADDON_MOD_BOOK_PROVIDERS).concat(ADDON_MOD_CHAT_PROVIDERS)
                .concat(ADDON_MOD_CHOICE_PROVIDERS).concat(ADDON_MOD_FEEDBACK_PROVIDERS).concat(ADDON_MOD_FOLDER_PROVIDERS)
                .concat(ADDON_MOD_FORUM_PROVIDERS).concat(ADDON_MOD_GLOSSARY_PROVIDERS).concat(ADDON_MOD_IMSCP_PROVIDERS)
                .concat(ADDON_MOD_LESSON_PROVIDERS).concat(ADDON_MOD_LTI_PROVIDERS).concat(ADDON_MOD_PAGE_PROVIDERS)
                .concat(ADDON_MOD_QUIZ_PROVIDERS).concat(ADDON_MOD_RESOURCE_PROVIDERS).concat(ADDON_MOD_SCORM_PROVIDERS)
                .concat(ADDON_MOD_SURVEY_PROVIDERS).concat(ADDON_MOD_URL_PROVIDERS).concat(ADDON_MOD_WIKI_PROVIDERS)
                .concat(ADDON_MOD_WORKSHOP_PROVIDERS).concat(ADDON_NOTES_PROVIDERS).concat(ADDON_NOTIFICATIONS_PROVIDERS)
                .concat(CORE_PUSHNOTIFICATIONS_PROVIDERS).concat(ADDON_REMOTETHEMES_PROVIDERS).concat(CORE_BLOCK_PROVIDERS);

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

        // Inject current service.
        instance['CoreCompileProvider'] = this;

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
        instance['CoreCourseActivityPrefetchHandlerBase'] = CoreCourseActivityPrefetchHandlerBase;
        instance['CoreCourseResourcePrefetchHandlerBase'] = CoreCourseResourcePrefetchHandlerBase;
        instance['CoreCourseUnsupportedModuleComponent'] = CoreCourseUnsupportedModuleComponent;
        instance['CoreCourseFormatSingleActivityComponent'] = CoreCourseFormatSingleActivityComponent;
        instance['CoreSitePluginsModuleIndexComponent'] = CoreSitePluginsModuleIndexComponent;
        instance['CoreSitePluginsBlockComponent'] = CoreSitePluginsBlockComponent;
        instance['CoreSitePluginsCourseOptionComponent'] = CoreSitePluginsCourseOptionComponent;
        instance['CoreSitePluginsCourseFormatComponent'] = CoreSitePluginsCourseFormatComponent;
        instance['CoreSitePluginsQuestionComponent'] = CoreSitePluginsQuestionComponent;
        instance['CoreSitePluginsQuestionBehaviourComponent'] = CoreSitePluginsQuestionBehaviourComponent;
        instance['CoreSitePluginsUserProfileFieldComponent'] = CoreSitePluginsUserProfileFieldComponent;
        instance['CoreSitePluginsQuizAccessRuleComponent'] = CoreSitePluginsQuizAccessRuleComponent;
        instance['CoreSitePluginsAssignFeedbackComponent'] = CoreSitePluginsAssignFeedbackComponent;
        instance['CoreSitePluginsAssignSubmissionComponent'] = CoreSitePluginsAssignSubmissionComponent;
    }

    /**
     * Instantiate a dynamic component.
     *
     * @param {string} template The template of the component.
     * @param {any} componentClass The JS class of the component.
     * @param {Injector} [injector] The injector to use. It's recommended to pass it so NavController and similar can be injected.
     * @return {Promise<ComponentRef<any>>} Promise resolved with the component instance.
     */
    instantiateDynamicComponent(template: string, componentClass: any, injector?: Injector): Promise<ComponentRef<any>> {
        injector = injector || this.injector;

        return this.createAndCompileComponent(template, componentClass).then((factory) => {
            if (factory) {
                // Create and return the component.
                return factory.create(injector, undefined, undefined, injector.get(NgModuleRef));
            }
        });
    }
}
