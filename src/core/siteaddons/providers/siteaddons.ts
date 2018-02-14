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

import { Injectable } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { CoreLangProvider } from '../../../providers/lang';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreMainMenuDelegate, CoreMainMenuHandler, CoreMainMenuHandlerData } from '../../../core/mainmenu/providers/delegate';
import {
    CoreCourseModuleDelegate, CoreCourseModuleHandler, CoreCourseModuleHandlerData
} from '../../../core/course/providers/module-delegate';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '../../../core/user/providers/user-delegate';
import { CoreDelegateHandler } from '../../../classes/delegate';
import { CoreConfigConstants } from '../../../configconstants';

/**
 * Service to provide functionalities regarding site addons.
 */
@Injectable()
export class CoreSiteAddonsProvider {
    protected ROOT_CACHE_KEY = 'CoreSiteAddons:';

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private mainMenuDelegate: CoreMainMenuDelegate, private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate, private langProvider: CoreLangProvider) {
        this.logger = logger.getInstance('CoreUserProvider');
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
     * Get a certain content for a site addon.
     *
     * @param {string} component Component where the class is. E.g. mod_assign.
     * @param {string} method Method to execute in the class.
     * @param {any} args The params for the method.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{html: string, javascript: string}>} Promise resolved with the content and the javascript.
     */
    getContent(component: string, method: string, args: any, siteId?: string): Promise<{html: string, javascript: string}> {
        this.logger.debug(`Get content for component '${component}' and method '${method}'`);

        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get current language to be added to params.
            return this.langProvider.getCurrentLanguage().then((lang) => {
                // Add some params that will always be sent. Clone the object so the original one isn't modified.
                const argsToSend = this.utils.clone(args);
                argsToSend.userid = args.userid || site.getUserId();
                argsToSend.appid = CoreConfigConstants.app_id;
                argsToSend.versionname = CoreConfigConstants.versionname;
                argsToSend.lang = lang;

                // Now call the WS.
                const data = {
                        component: component,
                        method: method,
                        args: this.utils.objectToArrayOfObjects(argsToSend, 'name', 'value', true)
                    }, preSets = {
                        cacheKey: this.getContentCacheKey(component, method, args)
                    };

                return this.sitesProvider.getCurrentSite().read('tool_mobile_get_content', data, preSets);
            });
        });
    }

    /**
     * Get cache key for get content WS calls.
     *
     * @param {string} component Component where the class is. E.g. mod_assign.
     * @param {string} method Method to execute in the class.
     * @param {any} args The params for the method.
     * @return {string} Cache key.
     */
    protected getContentCacheKey(component: string, method: string, args: any): string {
        return this.ROOT_CACHE_KEY + 'content:' + component + ':' + method + ':' + JSON.stringify(args);
    }

    /**
     * Given a handler's unique name and the key of a string, return the full string key (prefixed).
     *
     * @param {string} handlerName Handler's unique name (result of getHandlerUniqueName).
     * @param {string} key The key of the string.
     * @return {string} Full string key.
     */
    protected getHandlerPrefixedString(handlerName: string, key: string): string {
        if (name) {
            return 'addon.' + handlerName + '.' + key;
        }

        return '';
    }

    /**
     * Get the unique name of a handler (addon + handler).
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler inside the addon.
     * @return {string} Unique name.
     */
    protected getHandlerUniqueName(addon: any, handlerName: string): string {
        return addon.addon + '_' + handlerName;
    }

    /**
     * Invalidate a page content.
     *
     * @param {string} component Component where the class is. E.g. mod_assign.
     * @param {string} method Method to execute in the class.
     * @param {any} args The params for the method.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidatePageContent(component: string, callback: string, args: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getContentCacheKey(component, callback, args));
        });
    }

    /**
     * Check if the get content WS is available.
     *
     * @param {CoreSite} site The site to check. If not defined, current site.
     */
    isGetContentAvailable(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('tool_mobile_get_content');
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
     * Load a site addon.
     *
     * @param {any} addon Data of the addon.
     */
    loadSiteAddon(addon: any): void {
        try {
            if (!addon.parsedHandlers) {
                addon.parsedHandlers = JSON.parse(addon.handlers);
            }

            // Register all the handlers.
            for (const name in addon.parsedHandlers) {
                this.registerHandler(addon, name, addon.parsedHandlers[name]);
            }
        } catch (ex) {
            this.logger.warn('Error parsing site addon', ex);
        }
    }

    /**
     * Register a site addon handler in the right delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     */
    registerHandler(addon: any, handlerName: string, handlerSchema: any): void {
        switch (handlerSchema.delegate) {
            case 'CoreMainMenuDelegate':
                this.registerMainMenuHandler(addon, handlerName, handlerSchema);
                break;

            case 'CoreCourseModuleDelegate':
                this.registerModuleHandler(addon, handlerName, handlerSchema);
                break;

            case 'CoreUserDelegate':
                this.registerUserProfileHandler(addon, handlerName, handlerSchema);
                break;

            default:
                // Nothing to do.
        }
    }

    /**
     * Given a handler in an addon, register it in the main menu delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     */
    protected registerMainMenuHandler(addon: any, handlerName: string, handlerSchema: any): void {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const baseHandler = this.getBaseHandler(this.getHandlerUniqueName(addon, handlerName)),
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
                    }
                };
            }
        });

        this.mainMenuDelegate.registerHandler(mainMenuHandler);
    }

    /**
     * Given a handler in an addon, register it in the module delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     */
    protected registerModuleHandler(addon: any, handlerName: string, handlerSchema: any): void {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const baseHandler = this.getBaseHandler(addon.component.replace('mod_', ''));
        let moduleHandler: CoreCourseModuleHandler;

        // Extend the base handler, adding the properties required by the delegate.
        moduleHandler = Object.assign(baseHandler, {
            getData: (module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData => {
                return {
                    title: module.name,
                    icon: handlerSchema.displaydata.icon,
                    class: handlerSchema.displaydata.class,
                    showDownloadButton: handlerSchema.offlinefunctions && handlerSchema.offlinefunctions.length,
                    action: (event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void => {
                        event.preventDefault();
                        event.stopPropagation();

                        navCtrl.push('CoreSiteAddonsAddonPage', {
                            title: module.name,
                            component: addon.component,
                            method: handlerSchema.method,
                            args: {
                                courseid: courseId,
                                cmid: module.id
                            }
                        }, options);
                    }
                };
            },
            getMainComponent: (course: any, module: any): any => {
                // Singleactivity course format not supported with site addons.
            }
        });

        this.moduleDelegate.registerHandler(moduleHandler);
    }

    /**
     * Given a handler in an addon, register it in the user profile delegate.
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler in the addon.
     * @param {any} handlerSchema Data about the handler.
     */
    protected registerUserProfileHandler(addon: any, handlerName: string, handlerSchema: any): void {
        if (!handlerSchema || !handlerSchema.displaydata) {
            // Required data not provided, stop.
            return;
        }

        // Create the base handler.
        const baseHandler = this.getBaseHandler(this.getHandlerUniqueName(addon, handlerName)),
            prefixedTitle = this.getHandlerPrefixedString(baseHandler.name, handlerSchema.displaydata.title);
        let userHandler: CoreUserProfileHandler;

        // Extend the base handler, adding the properties required by the delegate.
        userHandler = Object.assign(baseHandler, {
            priority: handlerSchema.priority,
            type: handlerSchema.type,
            isEnabledForUser: (user: any, courseId: number, navOptions?: any, admOptions?: any): boolean => {
                if (handlerSchema.restricted == 'current' && user.id != this.sitesProvider.getCurrentSite().getUserId()) {
                    return false;
                }

                return true;
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
                            }
                        });
                    }
                };
            }
        });

        this.userDelegate.registerHandler(userHandler);
    }
}
