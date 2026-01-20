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
    ComponentRef,
    NO_ERRORS_SCHEMA,
    Type,
    Provider,
    ViewContainerRef,
    signal,
    computed,
    effect,
    untracked,
    inject,
} from '@angular/core';
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
import { effectWithInjectionContext } from '@/core/utils/signals';

// Import core services and exported directives/objects.
import { CoreSharedModule } from '@/core/shared.module';
import { getCoreDeprecatedComponents } from '@components/components.module';
import { getCoreExportedObjects, getCoreServices } from '@/core/core.module';
import { getBlockExportedDirectives, getBlockServices } from '@features/block/block.module';
import { getCommentsServices } from '@features/comments/comments.module';
import { getContentLinksExportedObjects, getContentLinksServices } from '@features/contentlinks/contentlinks.module';
import { getCourseExportedObjects, getCourseServices, getCourseExportedDirectives } from '@features/course/course.module';
import { getCoursesExportedDirectives, getCoursesExportedObjects, getCoursesServices } from '@features/courses/courses.module';
import { getEditorExportedDirectives, getEditorServices } from '@features/editor/editor.module';
import { getEnrolServices } from '@features/enrol/enrol.module';
import { getFileUploadedServices } from '@features/fileuploader/fileuploader.module';
import { getFilterServices } from '@features/filter/filter.module';
import { getGradesServices } from '@features/grades/grades.module';
import { getH5PServices } from '@features/h5p/h5p.module';
import { getLoginServices } from '@features/login/login.module';
import { getMainMenuExportedObjects, getMainMenuServices } from '@features/mainmenu/mainmenu.module';
import { getNativeServices } from '@features/native/native.module';
import { getPushNotificationsServices } from '@features/pushnotifications/pushnotifications.module';
import { getQuestionExportedDirectives, getQuestionServices } from '@features/question/question.module';
import { getRatingServices } from '@features/rating/rating.module';
import { getRemindersExportedDirectives, getRemindersServices } from '@features/reminders/reminders.module';
import { getSearchExportedDirectives, getSearchServices } from '@features/search/search.module';
import { getSettingsServices } from '@features/settings/settings.module';
import { getSharedFilesServices } from '@features/sharedfiles/sharedfiles.module';
import { getSiteHomeServices } from '@features/sitehome/sitehome.module';
import { getStyleServices } from '@features/styles/styles.module';
import { getTagServices } from '@features/tag/tag.module';
import { getUsersExportedDirectives, getUsersServices } from '@features/user/user.module';
import { getXAPIServices } from '@features/xapi/xapi.module';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { dayjs } from '@/core/utils/dayjs';
import { Md5 } from 'ts-md5/dist/md5';

// Import core classes that can be useful for site plugins.
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreArray } from '@singletons/array';
import { CoreColors } from '@singletons/colors';
import { CoreCountries } from '@singletons/countries';
import { CoreDelegate } from '@classes/delegate';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreForms } from '@singletons/form';
import { CoreGeolocationError, CoreGeolocationErrorReason } from '@services/geolocation';
import { CoreIframe } from '@singletons/iframe';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreMedia } from '@singletons/media';
import { CoreMimetype } from '@singletons/mimetype';
import { CoreNetwork } from '@services/network';
import { CoreObject } from '@singletons/object';
import { CoreOpener } from '@singletons/opener';
import { CorePath } from '@singletons/path';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreSSO } from '@singletons/sso';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { CoreWait } from '@singletons/wait';
import { CoreWindow } from '@singletons/window';
import { getCoreErrorsExportedObjects } from '@classes/errors/errors';

// Import addon providers. Do not import database module because it causes circular dependencies.
import { getBadgesServices } from '@addons/badges/badges.module';
import { getCalendarServices } from '@addons/calendar/calendar.module';
import { getCompetencyServices } from '@addons/competency/competency.module';
import { getCourseCompletionServices } from '@addons/coursecompletion/coursecompletion.module';
import { getMessageOutputServices } from '@addons/messageoutput/messageoutput.module';
import { getMessagesServices } from '@addons/messages/messages.module';
import { getModAssignServices } from '@addons/mod/assign/assign.module';
import { getModQuizServices } from '@addons/mod/quiz/quiz.module';
import { getModWorkshopServices } from '@addons/mod/workshop/workshop.module';
import { getNotesServices } from '@addons/notes/notes.module';
import { getNotificationsServices } from '@addons/notifications/notifications.module';
import { getPrivateFilesServices } from '@addons/privatefiles/privatefiles.module';

// Import some addon modules that define components, directives and pipes. Only import the important ones.
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';

import { CoreAutoLogoutService } from '@features/autologout/services/autologout';
import {
    getSitePluginsExportedDirectives,
    getSitePluginsExportedObjects,
    getSitePluginsServices,
} from '@features/siteplugins/siteplugins.module';
import { CoreError } from '@classes/errors/error';

/**
 * Service to provide functionalities regarding compiling dynamic HTML and Javascript.
 */
@Injectable({ providedIn: 'root' })
export class CoreCompileProvider {

    protected injector = inject(Injector);

    protected logger = CoreLogger.getInstance('CoreCompileProvider');

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected static readonly OTHER_SERVICES: unknown[] = [
        TranslateService, HttpClient, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder,
    ];

    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected static readonly IMPORTS = [
        CoreSharedModule,
    ];

    protected static readonly LAZY_IMPORTS = [
        getBlockExportedDirectives,
        getCoreDeprecatedComponents,
        getCourseExportedDirectives,
        getCoursesExportedDirectives,
        getEditorExportedDirectives,
        getQuestionExportedDirectives,
        getRemindersExportedDirectives,
        getSearchExportedDirectives,
        getSitePluginsExportedDirectives,
        getUsersExportedDirectives,
    ];

    protected componentId = 0;
    protected libraries?: unknown[];
    protected exportedObjects?: Record<string, unknown>;

    /**
     * Create and compile a dynamic component.
     *
     * @param template The template of the component.
     * @param componentClass The JS class of the component.
     * @param viewContainerRef View container reference to inject the component.
     * @param extraImports Extra imported modules if needed and not imported by this class.
     * @param styles CSS code to apply to the component.
     * @returns Promise resolved with the component reference.
     */
    async createAndCompileComponent<T = unknown>(
        template: string,
        componentClass: Type<T>,
        viewContainerRef: ViewContainerRef,
        extraImports: any[] = [], // eslint-disable-line @typescript-eslint/no-explicit-any
        styles?: string,
    ): Promise<ComponentRef<T> | undefined> {
        // Import the Angular compiler to be able to compile components in runtime.
        await import('@angular/compiler');

        const lazyImports = await Promise.all(CoreCompileProvider.LAZY_IMPORTS.map(getModules => getModules()));
        const imports = [
            ...lazyImports.flat(),
            ...CoreCompileProvider.IMPORTS,
            ...extraImports,
        ];

        // Create the component using the template and the class.
        const component = Component({
            template,
            host: { 'compiled-component-id': String(this.componentId++) },
            styles,
            imports,
            schemas: [NO_ERRORS_SCHEMA],
        })(componentClass);

        try {
            viewContainerRef.clear();

            return viewContainerRef.createComponent(
                component,
            );
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
     * @param options Options.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    injectLibraries(instance: any, options: InjectLibrariesOptions = {}): void {
        if (!this.libraries || !this.exportedObjects) {
            throw new CoreError('Libraries not loaded. You need to call loadLibraries before calling injectLibraries.');
        }

        const libraries = [
            ...this.libraries,
            ...options.extraLibraries ?? [],
        ];
        const injector = options.injector ?? this.injector;

        // We cannot inject anything to this constructor. Use the Injector to inject all the providers into the instance.
        for (const i in libraries) {
            const libraryDef = libraries[i];
            if (typeof libraryDef === 'function' && libraryDef.name) {
                try {
                    // Inject the provider to the instance. We use the class name as the property name.
                    instance[libraryDef.name.replace(/DelegateService$/, 'Delegate')] = injector.get<Provider>(libraryDef);
                } catch (ex) {
                    this.logger.error('Error injecting provider', libraryDef.name, ex);
                }
            }
        }

        // Inject current service.
        instance['CoreCompileProvider'] = this;

        // Add some final classes.
        instance['injector'] = injector;
        instance['Validators'] = Validators;
        instance['CoreEventsProvider'] = CoreEvents;
        instance['CoreLoggerProvider'] = CoreLogger;
        /**
         * @deprecated since 5.0, plugins should use native Date parsing functions instead.
         * Also now it uses dayjs.
         */
        instance['moment'] = dayjs;
        instance['Md5'] = Md5;
        instance['signal'] = signal;
        instance['computed'] = computed;
        instance['untracked'] = untracked;
        instance['effect'] = options.effectWrapper ?? effectWithInjectionContext(injector);

        /**
         * @deprecated since 4.1, plugins should use CoreNetwork instead.
         * Keeping this a bit more to avoid plugins breaking.
         */
        instance['Network'] = CoreNetwork.instance;
        instance['CoreNetwork'] = CoreNetwork.instance;
        instance['CoreArray'] = CoreArray;
        instance['CoreColors'] = CoreColors;
        instance['CoreCountries'] = CoreCountries;
        instance['CoreDirectivesRegistry'] = CoreDirectivesRegistry;
        instance['CoreDom'] = CoreDom;
        instance['CoreFileUtils'] = CoreFileUtils;
        instance['CoreForms'] = CoreForms;
        instance['CoreIframe'] = CoreIframe;
        instance['CoreKeyboard'] = CoreKeyboard;
        instance['CoreMedia'] = CoreMedia;
        instance['CoreMimetype'] = CoreMimetype;
        instance['CoreObject'] = CoreObject;
        instance['CoreOpener'] = CoreOpener;
        instance['CorePath'] = CorePath;
        instance['CorePlatform'] = CorePlatform.instance;
        instance['CorePromiseUtils'] = CorePromiseUtils;
        instance['CoreSSO'] = CoreSSO;
        instance['CoreSyncBaseProvider'] = CoreSyncBaseProvider;
        instance['CoreText'] = CoreText;
        instance['CoreTime'] = CoreTime;
        instance['CoreUrl'] = CoreUrl;
        instance['CoreUtils'] = CoreUtils;
        instance['CoreWait'] = CoreWait;
        instance['CoreWindow'] = CoreWindow;
        instance['CoreDelegate'] = CoreDelegate;
        instance['CorePromisedValue'] = CorePromisedValue;

        /**
         * @deprecated since 5.0, geolocation is deprecated and will be removed in future versions.
         */
        instance['CoreGeolocationError'] = CoreGeolocationError; // eslint-disable-line @typescript-eslint/no-deprecated
        instance['CoreGeolocationErrorReason'] = CoreGeolocationErrorReason; // eslint-disable-line @typescript-eslint/no-deprecated

        // Inject exported objects.
        for (const name in this.exportedObjects) {
            instance[name] = this.exportedObjects[name];
        }
    }

    /**
     * Load all the libraries needed for the compile service.
     */
    async loadLibraries(): Promise<void> {
        if (!this.libraries) {
            this.libraries = await this.getLibraries();
        }

        if (!this.exportedObjects) {
            this.exportedObjects = await this.getExportedObjects();
        }
    }

    /**
     * Get lazy libraries to inject.
     *
     * @returns Lazy libraries.
     */
    protected async getLibraries(): Promise<unknown[]> {
        const services = await Promise.all([
            getCoreServices(),
            getBlockServices(),
            getCommentsServices(),
            getContentLinksServices(),
            getCourseServices(),
            getCoursesServices(),
            getEditorServices(),
            getEnrolServices(),
            getFileUploadedServices(),
            getFilterServices(),
            getGradesServices(),
            getH5PServices(),
            getLoginServices(),
            getMainMenuServices(),
            getNativeServices(),
            getPushNotificationsServices(),
            getQuestionServices(),
            getRatingServices(),
            getSearchServices(),
            getSettingsServices(),
            getSharedFilesServices(),
            getSiteHomeServices(),
            getStyleServices(),
            getTagServices(),
            getUsersServices(),
            getXAPIServices(),
            getBadgesServices(),
            getCalendarServices(),
            getCompetencyServices(),
            getCourseCompletionServices(),
            getMessageOutputServices(),
            getMessagesServices(),
            getModAssignServices(),
            getModQuizServices(),
            getModWorkshopServices(),
            getNotesServices(),
            getNotificationsServices(),
            getPrivateFilesServices(),
            getRemindersServices(),
            getSitePluginsServices(),
        ]);

        const lazyLibraries = services.flat();

        return [
            ...lazyLibraries,
            CoreAutoLogoutService,
            ...CoreCompileProvider.OTHER_SERVICES,
        ];
    }

    /**
     * Get lazy exported objects to inject.
     *
     * @returns Lazy exported objects.
     */
    protected async getExportedObjects(): Promise<Record<string, unknown>> {
        const objects = await Promise.all([
            getCoreExportedObjects(),
            getCoreErrorsExportedObjects(),
            getCourseExportedObjects(),
            getCoursesExportedObjects(),
            getMainMenuExportedObjects(),
            getContentLinksExportedObjects(),
            getSitePluginsExportedObjects(),
        ]);

        return Object.assign({}, ...objects);
    }

}

export const CoreCompile = makeSingleton(CoreCompileProvider);

/**
 * Options for injectLibraries.
 */
type InjectLibrariesOptions = {
    extraLibraries?: Type<unknown>[]; // Extra imported providers if needed and not imported by this class.
    injector?: Injector; // Injector of the injection context. E.g. for a component, use the component's injector.
    effectWrapper?: typeof effect; // Wrapper function to create an effect. If not provided, a wrapper will be created using the
                                   // injector. Use this wrapper if you want to capture the created EffectRefs.
};
