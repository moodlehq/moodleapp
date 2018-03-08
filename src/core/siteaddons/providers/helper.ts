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
import { NavController, NavOptions } from 'ionic-angular';
import { CoreLangProvider } from '../../../providers/lang';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreMainMenuDelegate, CoreMainMenuHandler, CoreMainMenuHandlerData } from '../../mainmenu/providers/delegate';
import {
    CoreCourseModuleDelegate, CoreCourseModuleHandler, CoreCourseModuleHandlerData
} from '../../course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../course/providers/module-prefetch-delegate';
import {
    CoreCourseOptionsDelegate, CoreCourseOptionsHandler, CoreCourseOptionsHandlerData
} from '../../course/providers/options-delegate';
import { CoreCourseFormatDelegate, CoreCourseFormatHandler } from '../../course/providers/format-delegate';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '../../user/providers/user-delegate';
import {
    CoreUserProfileFieldDelegate, CoreUserProfileFieldHandler, CoreUserProfileFieldHandlerData
} from '../../user/providers/user-profile-field-delegate';
import { CoreDelegateHandler } from '../../../classes/delegate';
import { CoreSiteAddonsModuleIndexComponent } from '../components/module-index/module-index';
import { CoreSiteAddonsCourseOptionComponent } from '../components/course-option/course-option';
import { CoreSiteAddonsCourseFormatComponent } from '../components/course-format/course-format';
import { CoreSiteAddonsUserProfileFieldComponent } from '../components/user-profile-field/user-profile-field';
import { CoreSiteAddonsProvider } from './siteaddons';
import { CoreSiteAddonsModulePrefetchHandler } from '../classes/module-prefetch-handler';
import { CoreCompileProvider } from '../../compile/providers/compile';
import { CoreCoursesProvider } from '../../courses/providers/courses';

/**
 * Helper service to provide functionalities regarding site addons. It basically has the features to load and register site
 * addons.
 *
 * This code is split from CoreSiteAddonsProvider to prevent circular dependencies.
 *
 * @todo: Support ViewChild and similar in site addons. Possible solution: make components and directives inject the instance
 * inside the host DOM element?
 */
@Injectable()
export class CoreSiteAddonsHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,  private injector: Injector,
            private mainMenuDelegate: CoreMainMenuDelegate, private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate, private langProvider: CoreLangProvider,
            private siteAddonsProvider: CoreSiteAddonsProvider, private prefetchDelegate: CoreCourseModulePrefetchDelegate,
            private compileProvider: CoreCompileProvider, private utils: CoreUtilsProvider,
            private coursesProvider: CoreCoursesProvider, private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private courseFormatDelegate: CoreCourseFormatDelegate, private profileFieldDelegate: CoreUserProfileFieldDelegate) {
        this.logger = logger.getInstance('CoreSiteAddonsHelperProvider');
    }

    /**
     * Bootstrap a handler if it has some bootstrap method.
     *
     * @param {any} addon Data of the addon.
     * @param {any} handlerSchema Data about the handler.
     * @return {Promise<any>} Promise resolved when done. It returns the results of the getContent call and the data returned by
     *                        the bootstrap JS (if any).
     */
    protected bootstrapHandler(addon: any, handlerSchema: any): Promise<any> {
        if (!handlerSchema.bootstrap) {
            return Promise.resolve({});
        }

        return this.executeMethodAndJS(addon, handlerSchema.bootstrap);
    }

    /**
     * Execute a get_content method and run its javascript (if any).
     *
     * @param {any} addon Data of the addon.
     * @param {string} method The method to call.
     * @return {Promise<any>} Promise resolved when done. It returns the results of the getContent call and the data returned by
     *                        the JS (if any).
     */
    protected executeMethodAndJS(addon: any, method: string): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId(),
            preSets = {getFromCache: false}; // Try to ignore cache.

        return this.siteAddonsProvider.getContent(addon.component, method, {}, preSets).then((result) => {
            if (!result.javascript || this.sitesProvider.getCurrentSiteId() != siteId) {
                // No javascript or site has changed, stop.
                return result;
            }

            // Create a "fake" instance to hold all the libraries.
            const instance = {};
            this.compileProvider.injectLibraries(instance);

            // Add some data of the WS call result.
            const jsData = this.siteAddonsProvider.createDataForJS(result);
            for (const name in jsData) {
                instance[name] = jsData[name];
            }

            // Now execute the javascript using this instance.
            result.jsResult = this.compileProvider.executeJavascript(instance, result.javascript);

            return result;
        });
    }

    /**
     * Create a base handler for a site addon.
     *
     * @param {string} name Name of the handler.
     * @return {CoreDelegateHandler} The base handler.
     */
    protected getBaseHandler(name: string): CoreDelegateHandler {
        return {
            name: name,
            isEnabled: (): boolean => {
                return true;
            }
        };
    }

    /**
     * Given a handler's unique name, return the prefix to add to its string keys.
     *
     * @param {string} handlerName Handler's unique name (result of getHandlerUniqueName).
     * @return {string} Prefix.
     */
    protected getHandlerPrefixForStrings(handlerName: string): string {
        if (handlerName) {
            return 'addon.' + handlerName + '.';
        }

        return '';
    }

    /**
     * Given a handler's unique name and the key of a string, return the full string key (prefixed).
     *
     * @param {string} handlerName Handler's unique name (result of getHandlerUniqueName).
     * @param {string} key The key of the string.
     * @return {string} Full string key.
     */
    protected getHandlerPrefixedString(handlerName: string, key: string): string {
        return this.getHandlerPrefixForStrings(handlerName) + key;
    }

    /**
     * Check if a handler is enabled for a certain course.
     *
     * @param {number} courseId Course ID to check.
     * @param {boolean} [restrictEnrolled] If true or undefined, handler is only enabled for courses the user is enrolled in.
     * @param {any} [restrict] Users and courses the handler is restricted to.
     * @return {boolean | Promise<boolean>} Whether the handler is enabled.
     */
    protected isHandlerEnabledForCourse(courseId: number, restrictEnrolled?: boolean, restrict?: any): boolean | Promise<boolean> {
        if (restrict && restrict.courses && restrict.courses.indexOf(courseId) == -1) {
            // Course is not in the list of restricted courses.
            return false;
        }

        if (restrictEnrolled || typeof restrictEnrolled == 'undefined') {
            // Only enabled for courses the user is enrolled to. Check if the user is enrolled in the course.
            return this.coursesProvider.getUserCourse(courseId, true).then(() => {
                return true;
            }).catch(() => {
                return false;
            });
        }

        return true;
    }

    /**
     * Check if a handler is enabled for a certain user.
     *
     * @param {number} userId User ID to check.
     * @param {boolean} [restrictCurrent] Whether handler is only enabled for current user.
     * @param {any} [restrict] Users and courses the handler is restricted to.
     * @return {boolean} Whether the handler is enabled.
     */
    protected isHandlerEnabledForUser(userId: number, restrictCurrent?: boolean, restrict?: any): boolean {
        if (restrictCurrent && userId != this.sitesProvider.getCurrentSite().getUserId()) {
            // Only enabled for current user.
            return false;
        }

        if (restrict && restrict.users && restrict.users.indexOf(userId) == -1) {
            // User is not in the list of restricted users.
            return false;
        }

        return true;
    }

    /**
     * Check if a certain addon is a site addon and it's enabled in a certain site.
     *
     * @param {any} addon Data of the addon.
     * @param {CoreSite} site Site affected.
     * @return {boolean} Whether it's a site addon and it's enabled.
     */
    isSiteAddonEnabled(addon: any, site: CoreSite): boolean {
        if (!site.isFeatureDisabled('siteAddOn_' + addon.component + '_' + addon.addon) && addon.handlers) {
            // Site addon not disabled. Check if it has handlers.
            try {
                if (!addon.parsedHandlers) {
                    addon.parsedHandlers = JSON.parse(addon.handlers);
                }

                return !!(addon.parsedHandlers && Object.keys(addon.parsedHandlers).length);
            } catch (ex) {
                this.logger.warn('Error parsing site addon', ex);
            }
        }

        return false;
    }

    /**
     * Load the lang strings for a handler.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     */
    loadHandlerLangStrings(addon: any, handlerName: string, handlerSchema: any): void {
        if (!handlerSchema.lang) {
            return;
        }

        for (const lang in handlerSchema.lang) {
            const prefix = this.getHandlerPrefixForStrings(this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName));

            this.langProvider.addSiteAddonsStrings(lang, handlerSchema.lang[lang], prefix);
        }
    }

    /**
     * Load a site addon.
     *
     * @param {any} addon Data of the addon.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadSiteAddon(addon: any): Promise<any> {
        const promises = [];

        try {
            if (!addon.parsedHandlers) {
                addon.parsedHandlers = JSON.parse(addon.handlers);
            }

            // Register all the handlers.
            for (const name in addon.parsedHandlers) {
                promises.push(this.registerHandler(addon, name, addon.parsedHandlers[name]));
            }
        } catch (ex) {
            this.logger.warn('Error parsing site addon', ex);
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Register a site addon handler in the right delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @return {Promise<any>} Promise resolved when done.
     */
    registerHandler(addon: any, handlerName: string, handlerSchema: any): Promise<any> {
        this.loadHandlerLangStrings(addon, handlerName, handlerSchema);

        // Wait for the bootstrap JS to be executed.
        return this.bootstrapHandler(addon, handlerSchema).then((result) => {
            let promise;

            switch (handlerSchema.delegate) {
                case 'CoreMainMenuDelegate':
                    promise = Promise.resolve(this.registerMainMenuHandler(addon, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseModuleDelegate':
                    promise = Promise.resolve(this.registerModuleHandler(addon, handlerName, handlerSchema, result));
                    break;

                case 'CoreUserDelegate':
                    promise = Promise.resolve(this.registerUserProfileHandler(addon, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseOptionsDelegate':
                    promise = Promise.resolve(this.registerCourseOptionHandler(addon, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseFormatDelegate':
                    promise = Promise.resolve(this.registerCourseFormatHandler(addon, handlerName, handlerSchema, result));
                    break;

                case 'CoreUserProfileFieldDelegate':
                    promise = Promise.resolve(this.registerUserProfileFieldHandler(addon, handlerName, handlerSchema, result));
                    break;

                default:
                    // Nothing to do.
                    promise = Promise.resolve();
            }

            return promise.then((uniqueName) => {
                if (uniqueName) {
                    // Store the handler data.
                    this.siteAddonsProvider.setSiteAddonHandler(uniqueName, {
                        addon: addon,
                        handlerName: handlerName,
                        handlerSchema: handlerSchema,
                        bootstrapResult: result
                    });
                }
            });
        }).catch((err) => {
            this.logger.error('Error executing bootstrap method', handlerSchema.bootstrap, err);
        });
    }

    /**
     * Given a handler in an addon, register it in the course format delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerCourseFormatHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const formatName = addon.component.replace('format_', ''),
            baseHandler = this.getBaseHandler(formatName);
        let handler: CoreCourseFormatHandler;

        // Extend the base handler, adding the properties required by the delegate.
        handler = Object.assign(baseHandler, {
            canViewAllSections: (course: any): boolean => {
                return typeof handlerSchema.canviewallsections != 'undefined' ? handlerSchema.canviewallsections : true;
            },
            displayEnableDownload: (course: any): boolean => {
                return typeof handlerSchema.displayenabledownload != 'undefined' ? handlerSchema.displayenabledownload : true;
            },
            displaySectionSelector: (course: any): boolean => {
                return typeof handlerSchema.displaysectionselector != 'undefined' ? handlerSchema.displaysectionselector : true;
            },
            getCourseFormatComponent: (injector: Injector, course: any): any | Promise<any> => {
                if (handlerSchema.method) {
                    return CoreSiteAddonsCourseFormatComponent;
                }
            }
        });

        this.courseFormatDelegate.registerHandler(handler);

        return formatName;
    }

    /**
     * Given a handler in an addon, register it in the course options delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerCourseOptionHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            baseHandler = this.getBaseHandler(uniqueName),
            prefixedTitle = this.getHandlerPrefixedString(baseHandler.name, handlerSchema.displaydata.title);
        let handler: CoreCourseOptionsHandler;

        // Extend the base handler, adding the properties required by the delegate.
        handler = Object.assign(baseHandler, {
            priority: handlerSchema.priority,
            isEnabledForCourse: (courseId: number, accessData: any, navOptions?: any, admOptions?: any)
                    : boolean | Promise<boolean> => {
                return this.isHandlerEnabledForCourse(courseId, handlerSchema.restricttoenrolledcourses, bootstrapResult.restrict);
            },
            getDisplayData: (injector: Injector, courseId: number):
                    CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> => {
                return {
                    title: prefixedTitle,
                    class: handlerSchema.displaydata.class,
                    component: CoreSiteAddonsCourseOptionComponent,
                    componentData: {
                        handlerUniqueName: uniqueName
                    }
                };
            },
            prefetch: (course: any): Promise<any> => {
                const args = {
                    courseid: course.id,
                };

                return this.siteAddonsProvider.prefetchFunctions(addon.component, args, handlerSchema, course.id, undefined, true);
            }
        });

        this.courseOptionsDelegate.registerHandler(handler);

        return uniqueName;
    }

    /**
     * Given a handler in an addon, register it in the main menu delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerMainMenuHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            baseHandler = this.getBaseHandler(uniqueName),
            prefixedTitle = this.getHandlerPrefixedString(baseHandler.name, handlerSchema.displaydata.title);
        let mainMenuHandler: CoreMainMenuHandler;

        // Extend the base handler, adding the properties required by the delegate.
        mainMenuHandler = Object.assign(baseHandler, {
            priority: handlerSchema.priority,
            getDisplayData: (): CoreMainMenuHandlerData => {
                return {
                    title: prefixedTitle,
                    icon: handlerSchema.displaydata.icon,
                    class: handlerSchema.displaydata.class,
                    page: 'CoreSiteAddonsAddonPage',
                    pageParams: {
                        title: prefixedTitle,
                        component: addon.component,
                        method: handlerSchema.method,
                        bootstrapResult: bootstrapResult
                    }
                };
            }
        });

        this.mainMenuDelegate.registerHandler(mainMenuHandler);

        return uniqueName;
    }

    /**
     * Given a handler in an addon, register it in the module delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerModuleHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const modName = addon.component.replace('mod_', ''),
            baseHandler = this.getBaseHandler(modName),
            hasOfflineFunctions = !!(handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length),
            showDowloadButton = handlerSchema.downloadbutton;
        let moduleHandler: CoreCourseModuleHandler;

        // Extend the base handler, adding the properties required by the delegate.
        moduleHandler = Object.assign(baseHandler, {
            getData: (module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData => {
                return {
                    title: module.name,
                    icon: handlerSchema.displaydata.icon,
                    class: handlerSchema.displaydata.class,
                    showDownloadButton: typeof showDowloadButton != 'undefined' ? showDowloadButton : hasOfflineFunctions,
                    action: (event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void => {
                        event.preventDefault();
                        event.stopPropagation();

                        navCtrl.push('CoreSiteAddonsModuleIndexPage', {
                            title: module.name,
                            module: module,
                            courseId: courseId
                        }, options);
                    }
                };
            },
            getMainComponent: (injector: Injector, course: any, module: any): any | Promise<any> => {
                return CoreSiteAddonsModuleIndexComponent;
            }
        });

        if (hasOfflineFunctions) {
            // Register the prefetch handler.
            this.prefetchDelegate.registerHandler(new CoreSiteAddonsModulePrefetchHandler(
                this.injector, this.siteAddonsProvider, addon.component, modName, handlerSchema));
        }

        this.moduleDelegate.registerHandler(moduleHandler);

        return modName;
    }

    /**
     * Given a handler in an addon, register it in the user profile delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerUserProfileHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            baseHandler = this.getBaseHandler(uniqueName),
            prefixedTitle = this.getHandlerPrefixedString(baseHandler.name, handlerSchema.displaydata.title);
        let userHandler: CoreUserProfileHandler,
            type = handlerSchema.type;

        // Only support TYPE_COMMUNICATION and TYPE_NEW_PAGE.
        if (type != CoreUserDelegate.TYPE_COMMUNICATION) {
            type = CoreUserDelegate.TYPE_NEW_PAGE;
        }

        // Extend the base handler, adding the properties required by the delegate.
        userHandler = Object.assign(baseHandler, {
            priority: handlerSchema.priority,
            type: type,
            isEnabledForUser: (user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> => {
                // First check if it's enabled for the user.
                const enabledForUser = this.isHandlerEnabledForUser(user.id, handlerSchema.restricttocurrentuser,
                        bootstrapResult.restrict);
                if (!enabledForUser) {
                    return false;
                }

                // Enabled for user, check if it's enabled for the course.
                return this.isHandlerEnabledForCourse(courseId, handlerSchema.restricttoenrolledcourses, bootstrapResult.restrict);
            },
            getDisplayData: (user: any, courseId: number): CoreUserProfileHandlerData => {
                return {
                    title: prefixedTitle,
                    icon: handlerSchema.displaydata.icon,
                    class: handlerSchema.displaydata.class,
                    action: (event: Event, navCtrl: NavController, user: any, courseId?: number): void => {
                        event.preventDefault();
                        event.stopPropagation();

                        navCtrl.push('CoreSiteAddonsAddonPage', {
                            title: prefixedTitle,
                            component: addon.component,
                            method: handlerSchema.method,
                            args: {
                                courseid: courseId,
                                userid: user.id
                            },
                            bootstrapResult: bootstrapResult
                        });
                    }
                };
            }
        });

        this.userDelegate.registerHandler(userHandler);

        return uniqueName;
    }

    /**
     * Given a handler in an addon, register it in the user profile field delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string|Promise<string>} A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerUserProfileFieldHandler(addon: any, handlerName: string, handlerSchema: any, bootstrapResult: any)
            : string | Promise<string> {
        if (!handlerSchema || !handlerSchema.method) {
            // Required data not provided, stop.
            return;
        }

        // Execute the main method and its JS. The template returned will be used in the profile field component.
        return this.executeMethodAndJS(addon, handlerSchema.method).then((result) => {
            // Create the base handler.
            const fieldType = addon.component.replace('profilefield_', ''),
                baseHandler = this.getBaseHandler(fieldType);
            let fieldHandler: CoreUserProfileFieldHandler;

            // Store in handlerSchema some data required by the component.
            handlerSchema.methodTemplates = result.templates;
            handlerSchema.methodJSResult = result.jsResult;

            // Extend the base handler, adding the properties required by the delegate.
            fieldHandler = Object.assign(baseHandler, {
                getData: (field: any, signup: boolean, registerAuth: string, formValues: any):
                        Promise<CoreUserProfileFieldHandlerData> | CoreUserProfileFieldHandlerData => {
                    if (result && result.jsResult && result.jsResult.getData) {
                        // The JS of the main method implements the getData function, use it.
                        return result.jsResult.getData();
                    }

                    // No getData function implemented, use a default behaviour.
                    const name = 'profile_field_' + field.shortname;

                    return {
                        type: field.type || field.datatype,
                        name: name,
                        value: formValues[name]
                    };
                },
                getComponent: (injector: Injector): any | Promise<any> => {
                    return CoreSiteAddonsUserProfileFieldComponent;
                }
            });

            this.profileFieldDelegate.registerHandler(fieldHandler);

            return fieldType;
        }).catch((err) => {
            this.logger.error('Error executing main method', handlerSchema.method, err);
        });
    }
}
