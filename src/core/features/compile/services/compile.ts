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
    Injectable,
    Injector,
    Component,
    NgModule,
    Compiler,
    ComponentFactory,
    ComponentRef,
    NgModuleRef,
    NO_ERRORS_SCHEMA,
    Type,
} from '@angular/core';
import { JitCompilerFactory } from '@angular/platform-browser-dynamic';
import {
    ActionSheetController,
    AlertController,
    LoadingController,
    ModalController,
    PopoverController,
    ToastController,
} from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { CoreLogger } from '@singletons/logger';
import { CoreEvents } from '@singletons/events';
import { makeSingleton } from '@singletons';

// Import core services.
import { CORE_SERVICES } from '@/core/core.module';
import { CORE_BLOCK_SERVICES } from '@features/block/block.module';
import { CORE_COMMENTS_SERVICES } from '@features/comments/comments.module';
import { CORE_CONTENTLINKS_SERVICES } from '@features/contentlinks/contentlinks.module';
import { CORE_COURSE_SERVICES } from '@features/course/course.module';
import { CORE_COURSES_SERVICES } from '@features/courses/courses.module';
import { CORE_EDITOR_SERVICES } from '@features/editor/editor.module';
import { CORE_NATIVE_SERVICES } from '@features/native/native.module';
import { CORE_FILEUPLOADER_SERVICES } from '@features/fileuploader/fileuploader.module';
import { CORE_FILTER_SERVICES } from '@features/filter/filter.module';
import { CORE_GRADES_SERVICES } from '@features/grades/grades.module';
import { CORE_H5P_SERVICES } from '@features/h5p/h5p.module';
import { CORE_LOGIN_SERVICES } from '@features/login/login.module';
import { CORE_MAINMENU_SERVICES } from '@features/mainmenu/mainmenu.module';
import { CORE_PUSHNOTIFICATIONS_SERVICES } from '@features/pushnotifications/pushnotifications.module';
import { CORE_QUESTION_SERVICES } from '@features/question/question.module';
import { CORE_SHAREDFILES_SERVICES } from '@features/sharedfiles/sharedfiles.module';
import { CORE_RATING_SERVICES } from '@features/rating/rating.module';
import { CORE_SEARCH_SERVICES } from '@features/search/search.module';
import { CORE_SETTINGS_SERVICES } from '@features/settings/settings.module';
import { CORE_SITEHOME_SERVICES } from '@features/sitehome/sitehome.module';
import { CORE_TAG_SERVICES } from '@features/tag/tag.module';
import { CORE_STYLE_SERVICES } from '@features/styles/styles.module';
import { CORE_USER_SERVICES } from '@features/user/user.module';
import { CORE_XAPI_SERVICES } from '@features/xapi/xapi.module';
import { CoreSitePluginsProvider } from '@features/siteplugins/services/siteplugins';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CoreConstants } from '@/core/constants';
import moment from 'moment-timezone';
import { Md5 } from 'ts-md5/dist/md5';

// Import core classes that can be useful for site plugins.
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreArray } from '@singletons/array';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreForms } from '@singletons/form';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreUrl } from '@singletons/url';
import { CoreWindow } from '@singletons/window';
import { CoreCache } from '@classes/cache';
import { CoreDelegate } from '@classes/delegate';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksModuleGradeHandler } from '@features/contentlinks/classes/module-grade-handler';
import { CoreContentLinksModuleIndexHandler } from '@features/contentlinks/classes/module-index-handler';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseResourcePrefetchHandlerBase } from '@features/course/classes/resource-prefetch-handler';
import { CoreGeolocationError, CoreGeolocationErrorReason } from '@services/geolocation';
import { CORE_ERRORS_CLASSES } from '@classes/errors/errors';
import { CoreNetwork } from '@services/network';

// Import all core modules that define components, directives and pipes.
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { CoreCourseDirectivesModule } from '@features/course/directives/directives.module';
import { CoreCoursesComponentsModule } from '@features/courses/components/components.module';
import { CoreSitePluginsDirectivesModule } from '@features/siteplugins/directives/directives.module';
import { CoreUserComponentsModule } from '@features/user/components/components.module';
import { CoreQuestionComponentsModule } from '@features/question/components/components.module';
import { CoreBlockComponentsModule } from '@features/block/components/components.module';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';

// Import some components so they can be injected dynamically.
import { CoreCourseUnsupportedModuleComponent } from '@features/course/components/unsupported-module/unsupported-module';
import { CoreCourseFormatSingleActivityComponent } from '@features/course/format/singleactivity/components/singleactivity';
import { CoreSitePluginsModuleIndexComponent } from '@features/siteplugins/components/module-index/module-index';
import { CoreSitePluginsBlockComponent } from '@features/siteplugins/components/block/block';
import { CoreSitePluginsCourseFormatComponent } from '@features/siteplugins/components/course-format/course-format';
import { CoreSitePluginsQuestionComponent } from '@features/siteplugins/components/question/question';
import { CoreSitePluginsQuestionBehaviourComponent } from '@features/siteplugins/components/question-behaviour/question-behaviour';
import { CoreSitePluginsUserProfileFieldComponent } from '@features/siteplugins/components/user-profile-field/user-profile-field';
import { CoreSitePluginsQuizAccessRuleComponent } from '@features/siteplugins/components/quiz-access-rule/quiz-access-rule';
import { CoreSitePluginsAssignFeedbackComponent } from '@features/siteplugins/components/assign-feedback/assign-feedback';
import { CoreSitePluginsAssignSubmissionComponent } from '@features/siteplugins/components/assign-submission/assign-submission';

// Import addon providers. Do not import database module because it causes circular dependencies.
import { ADDON_BADGES_SERVICES } from '@addons/badges/badges.module';
import { ADDON_CALENDAR_SERVICES } from '@addons/calendar/calendar.module';
import { ADDON_COURSECOMPLETION_SERVICES } from '@addons/coursecompletion/coursecompletion.module';
import { ADDON_COMPETENCY_SERVICES } from '@addons/competency/competency.module';
import { ADDON_MESSAGEOUTPUT_SERVICES } from '@addons/messageoutput/messageoutput.module';
import { ADDON_MESSAGES_SERVICES } from '@addons/messages/messages.module';
import { ADDON_MOD_ASSIGN_SERVICES } from '@addons/mod/assign/assign.module';
import { ADDON_MOD_BOOK_SERVICES } from '@addons/mod/book/book.module';
import { ADDON_MOD_CHAT_SERVICES } from '@addons/mod/chat/chat.module';
import { ADDON_MOD_CHOICE_SERVICES } from '@addons/mod/choice/choice.module';
import { ADDON_MOD_FEEDBACK_SERVICES } from '@addons/mod/feedback/feedback.module';
import { ADDON_MOD_FOLDER_SERVICES } from '@addons/mod/folder/folder.module';
import { ADDON_MOD_FORUM_SERVICES } from '@addons/mod/forum/forum.module';
import { ADDON_MOD_GLOSSARY_SERVICES } from '@addons/mod/glossary/glossary.module';
import { ADDON_MOD_H5P_ACTIVITY_SERVICES } from '@addons/mod/h5pactivity/h5pactivity.module';
import { ADDON_MOD_IMSCP_SERVICES } from '@addons/mod/imscp/imscp.module';
import { ADDON_MOD_LESSON_SERVICES } from '@addons/mod/lesson/lesson.module';
import { ADDON_MOD_LTI_SERVICES } from '@addons/mod/lti/lti.module';
import { ADDON_MOD_PAGE_SERVICES } from '@addons/mod/page/page.module';
import { ADDON_MOD_QUIZ_SERVICES } from '@addons/mod/quiz/quiz.module';
import { ADDON_MOD_RESOURCE_SERVICES } from '@addons/mod/resource/resource.module';
import { ADDON_MOD_SCORM_SERVICES } from '@addons/mod/scorm/scorm.module';
import { ADDON_MOD_SURVEY_SERVICES } from '@addons/mod/survey/survey.module';
import { ADDON_MOD_URL_SERVICES } from '@addons/mod/url/url.module';
import { ADDON_MOD_WIKI_SERVICES } from '@addons/mod/wiki/wiki.module';
import { ADDON_MOD_WORKSHOP_SERVICES } from '@addons/mod/workshop/workshop.module';
import { ADDON_NOTES_SERVICES } from '@addons/notes/notes.module';
import { ADDON_NOTIFICATIONS_SERVICES } from '@addons/notifications/notifications.module';
import { ADDON_PRIVATEFILES_SERVICES } from '@addons/privatefiles/privatefiles.module';

// Import some addon modules that define components, directives and pipes. Only import the important ones.
import { AddonModAssignComponentsModule } from '@addons/mod/assign/components/components.module';
import { AddonModWorkshopComponentsModule } from '@addons/mod/workshop/components/components.module';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';

/**
 * Service to provide functionalities regarding compiling dynamic HTML and Javascript.
 */
@Injectable({ providedIn: 'root' })
export class CoreCompileProvider {

    protected logger: CoreLogger;
    protected compiler: Compiler;

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected readonly OTHER_SERVICES: unknown[] = [
        TranslateService, HttpClient, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder,
    ];

    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected readonly IMPORTS = [
        CoreSharedModule, CoreCourseComponentsModule, CoreCoursesComponentsModule, CoreUserComponentsModule,
        CoreCourseDirectivesModule, CoreQuestionComponentsModule, AddonModAssignComponentsModule,
        CoreBlockComponentsModule, CoreEditorComponentsModule, CoreSearchComponentsModule, CoreSitePluginsDirectivesModule,
        AddonModWorkshopComponentsModule,
    ];

    constructor(protected injector: Injector, compilerFactory: JitCompilerFactory) {
        this.logger = CoreLogger.getInstance('CoreCompileProvider');

        this.compiler = compilerFactory.createCompiler();
    }

    /**
     * Create and compile a dynamic component.
     *
     * @param template The template of the component.
     * @param componentClass The JS class of the component.
     * @param extraImports Extra imported modules if needed and not imported by this class.
     * @returns Promise resolved with the factory to instantiate the component.
     */
    async createAndCompileComponent<T = unknown>(
        template: string,
        componentClass: Type<T>,
        extraImports: any[] = [], // eslint-disable-line @typescript-eslint/no-explicit-any
    ): Promise<ComponentFactory<T> | undefined> {
        // Create the component using the template and the class.
        const component = Component({ template })(componentClass);

        const imports = [
            ...this.IMPORTS,
            ...extraImports,
        ];

        // Now create the module containing the component.
        const module = NgModule({ imports, declarations: [component], schemas: [NO_ERRORS_SCHEMA] })(class {});

        try {
            // Compile the module and the component.
            const factories = await this.compiler.compileModuleAndAllComponentsAsync(module);

            // Search and return the factory of the component we just created.
            return factories.componentFactories.find(factory => factory.componentType == component);
        } catch (error) {
            this.logger.error('Error compiling template', template);
            this.logger.error(error);
            error.message = 'Template has some errors and cannot be displayed.';

            throw error;
        }
    }

    /**
     * Eval some javascript using the context of the function.
     *
     * @param javascript The javascript to eval.
     * @returns Result of the eval.
     */
    protected evalInContext(javascript: string): unknown {
        // eslint-disable-next-line no-eval
        return eval(javascript);
    }

    /**
     * Execute some javascript code, using a certain instance as the context.
     *
     * @param instance Instance to use as the context. In the JS code, "this" will be this instance.
     * @param javascript The javascript code to eval.
     * @returns Result of the javascript execution.
     */
    executeJavascript(instance: unknown, javascript: string): unknown {
        try {
            return this.evalInContext.call(instance, javascript);
        } catch (ex) {
            this.logger.error('Error evaluating javascript', ex);
        }
    }

    /**
     * Inject all the core libraries in a certain object.
     *
     * @param instance The instance where to inject the libraries.
     * @param extraProviders Extra imported providers if needed and not imported by this class.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    injectLibraries(instance: any, extraProviders: Type<unknown>[] = []): void {
        const providers = [
            ...CORE_SERVICES,
            ...CORE_BLOCK_SERVICES,
            ...CORE_COMMENTS_SERVICES,
            ...CORE_CONTENTLINKS_SERVICES,
            ...CORE_COURSE_SERVICES,
            ...CORE_COURSES_SERVICES,
            ...CORE_EDITOR_SERVICES,
            ...CORE_FILEUPLOADER_SERVICES,
            ...CORE_FILTER_SERVICES,
            ...CORE_GRADES_SERVICES,
            ...CORE_H5P_SERVICES,
            ...CORE_MAINMENU_SERVICES,
            ...CORE_LOGIN_SERVICES,
            ...CORE_QUESTION_SERVICES,
            ...CORE_PUSHNOTIFICATIONS_SERVICES,
            ...CORE_RATING_SERVICES,
            ...CORE_SEARCH_SERVICES,
            ...CORE_SETTINGS_SERVICES,
            ...CORE_SHAREDFILES_SERVICES,
            ...CORE_SITEHOME_SERVICES,
            CoreSitePluginsProvider,
            ...CORE_TAG_SERVICES,
            ...CORE_STYLE_SERVICES,
            ...CORE_USER_SERVICES,
            ...CORE_XAPI_SERVICES,
            ...CORE_NATIVE_SERVICES,
            ...this.OTHER_SERVICES,
            ...extraProviders,
            ...ADDON_BADGES_SERVICES,
            ...ADDON_CALENDAR_SERVICES,
            ...ADDON_COURSECOMPLETION_SERVICES,
            ...ADDON_COMPETENCY_SERVICES,
            ...ADDON_MESSAGEOUTPUT_SERVICES,
            ...ADDON_MESSAGES_SERVICES,
            ...ADDON_MOD_ASSIGN_SERVICES,
            ...ADDON_MOD_BOOK_SERVICES,
            ...ADDON_MOD_CHAT_SERVICES,
            ...ADDON_MOD_CHOICE_SERVICES,
            ...ADDON_MOD_FEEDBACK_SERVICES,
            ...ADDON_MOD_FOLDER_SERVICES,
            ...ADDON_MOD_FORUM_SERVICES,
            ...ADDON_MOD_GLOSSARY_SERVICES,
            ...ADDON_MOD_H5P_ACTIVITY_SERVICES,
            ...ADDON_MOD_IMSCP_SERVICES,
            ...ADDON_MOD_LESSON_SERVICES,
            ...ADDON_MOD_LTI_SERVICES,
            ...ADDON_MOD_PAGE_SERVICES,
            ...ADDON_MOD_QUIZ_SERVICES,
            ...ADDON_MOD_RESOURCE_SERVICES,
            ...ADDON_MOD_SCORM_SERVICES,
            ...ADDON_MOD_SURVEY_SERVICES,
            ...ADDON_MOD_URL_SERVICES,
            ...ADDON_MOD_WIKI_SERVICES,
            ...ADDON_MOD_WORKSHOP_SERVICES,
            ...ADDON_NOTES_SERVICES,
            ...ADDON_NOTIFICATIONS_SERVICES,
            ...ADDON_PRIVATEFILES_SERVICES,
        ];

        // We cannot inject anything to this constructor. Use the Injector to inject all the providers into the instance.
        for (const i in providers) {
            const providerDef = providers[i];
            if (typeof providerDef == 'function' && providerDef.name) {
                try {
                    // Inject the provider to the instance. We use the class name as the property name.
                    instance[providerDef.name.replace(/DelegateService$/, 'Delegate')] = this.injector.get(providerDef);
                } catch (ex) {
                    this.logger.error('Error injecting provider', providerDef.name, ex);
                }
            }
        }

        // Inject current service.
        instance['CoreCompileProvider'] = this;

        // Add some final classes.
        instance['injector'] = this.injector;
        instance['Validators'] = Validators;
        instance['CoreConstants'] = CoreConstants;
        instance['CoreConfigConstants'] = CoreConstants.CONFIG;
        instance['CoreEventsProvider'] = CoreEvents;
        instance['CoreLoggerProvider'] = CoreLogger;
        instance['moment'] = moment;
        instance['Md5'] = Md5;
        instance['Network'] = CoreNetwork.instance; // @deprecated on 4.1, plugins should use CoreNetwork instead.
        instance['Platform'] = CorePlatform.instance; // @deprecated on 4.1, plugins should use CorePlatform instead.
        instance['CoreSyncBaseProvider'] = CoreSyncBaseProvider;
        instance['CoreArray'] = CoreArray;
        instance['CoreComponentsRegistry'] = CoreComponentsRegistry;
        instance['CoreDirectivesRegistry'] = CoreDirectivesRegistry;
        instance['CoreNetwork'] = CoreNetwork.instance;
        instance['CorePlatform'] = CorePlatform.instance;
        instance['CoreDom'] = CoreDom;
        instance['CoreForms'] = CoreForms;
        instance['CoreText'] = CoreText;
        instance['CoreTime'] = CoreTime;
        instance['CoreUrl'] = CoreUrl;
        instance['CoreWindow'] = CoreWindow;
        instance['CoreCache'] = CoreCache;
        instance['CoreDelegate'] = CoreDelegate;
        instance['CorePromisedValue'] = CorePromisedValue;
        instance['CoreContentLinksHandlerBase'] = CoreContentLinksHandlerBase;
        instance['CoreContentLinksModuleGradeHandler'] = CoreContentLinksModuleGradeHandler;
        instance['CoreContentLinksModuleIndexHandler'] = CoreContentLinksModuleIndexHandler;
        instance['CoreCourseActivityPrefetchHandlerBase'] = CoreCourseActivityPrefetchHandlerBase;
        instance['CoreCourseResourcePrefetchHandlerBase'] = CoreCourseResourcePrefetchHandlerBase;
        instance['CoreCourseUnsupportedModuleComponent'] = CoreCourseUnsupportedModuleComponent;
        instance['CoreCourseFormatSingleActivityComponent'] = CoreCourseFormatSingleActivityComponent;
        instance['CoreSitePluginsModuleIndexComponent'] = CoreSitePluginsModuleIndexComponent;
        instance['CoreSitePluginsBlockComponent'] = CoreSitePluginsBlockComponent;
        instance['CoreSitePluginsCourseFormatComponent'] = CoreSitePluginsCourseFormatComponent;
        instance['CoreSitePluginsQuestionComponent'] = CoreSitePluginsQuestionComponent;
        instance['CoreSitePluginsQuestionBehaviourComponent'] = CoreSitePluginsQuestionBehaviourComponent;
        instance['CoreSitePluginsUserProfileFieldComponent'] = CoreSitePluginsUserProfileFieldComponent;
        instance['CoreSitePluginsQuizAccessRuleComponent'] = CoreSitePluginsQuizAccessRuleComponent;
        instance['CoreSitePluginsAssignFeedbackComponent'] = CoreSitePluginsAssignFeedbackComponent;
        instance['CoreSitePluginsAssignSubmissionComponent'] = CoreSitePluginsAssignSubmissionComponent;
        instance['CoreGeolocationError'] = CoreGeolocationError;
        instance['CoreGeolocationErrorReason'] = CoreGeolocationErrorReason;
        CORE_ERRORS_CLASSES.forEach((classDef) => {
            instance[classDef.name] = classDef;
        });
    }

    /**
     * Instantiate a dynamic component.
     *
     * @param template The template of the component.
     * @param componentClass The JS class of the component.
     * @param injector The injector to use. It's recommended to pass it so NavController and similar can be injected.
     * @returns Promise resolved with the component instance.
     */
    async instantiateDynamicComponent<T = unknown>(
        template: string,
        componentClass: Type<T>,
        injector?: Injector,
    ): Promise<ComponentRef<T> | undefined> {
        injector = injector || this.injector;

        const factory = await this.createAndCompileComponent(template, componentClass);

        if (factory) {
            // Create and return the component.
            return factory.create(injector, undefined, undefined, injector.get(NgModuleRef));
        }
    }

}

export const CoreCompile = makeSingleton(CoreCompileProvider);
