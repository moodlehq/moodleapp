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
import { CoreMainMenuDelegate, CoreMainMenuHandler, CoreMainMenuHandlerData } from '../../../core/mainmenu/providers/delegate';
import {
    CoreCourseModuleDelegate, CoreCourseModuleHandler, CoreCourseModuleHandlerData
} from '../../../core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../../core/course/providers/module-prefetch-delegate';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '../../../core/user/providers/user-delegate';
import { CoreDelegateHandler } from '../../../classes/delegate';
import { CoreSiteAddonsModuleIndexComponent } from '../components/module-index/module-index';
import { CoreSiteAddonsProvider } from './siteaddons';
import { CoreSiteAddonsModulePrefetchHandler } from '../classes/module-prefetch-handler';

/**
 * Helper service to provide functionalities regarding site addons. It basically has the features to load and register site
 * addons.
 *
 * This code is split from CoreSiteAddonsProvider to prevent circular dependencies.
 */
@Injectable()
export class CoreSiteAddonsHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,  private injector: Injector,
            private mainMenuDelegate: CoreMainMenuDelegate, private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate, private langProvider: CoreLangProvider,
            private siteAddonsProvider: CoreSiteAddonsProvider, private prefetchDelegate: CoreCourseModulePrefetchDelegate) {
        this.logger = logger.getInstance('CoreSiteAddonsHelperProvider');
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
            const prefix = this.getHandlerPrefixForStrings(this.getHandlerUniqueName(addon, handlerName));

            this.langProvider.addSiteAddonsStrings(lang, handlerSchema.lang[lang], prefix);
        }
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
        this.loadHandlerLangStrings(addon, handlerName, handlerSchema);

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
        const modName = addon.component.replace('mod_', ''),
            baseHandler = this.getBaseHandler(modName),
            hasOfflineFunctions = !!(handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length);
        let moduleHandler: CoreCourseModuleHandler;

        // Store the handler data.
        this.siteAddonsProvider.setModuleSiteAddonHandler(modName, {
            addon: addon,
            handlerName: handlerName,
            handlerSchema: handlerSchema
        });

        // Extend the base handler, adding the properties required by the delegate.
        moduleHandler = Object.assign(baseHandler, {
            getData: (module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData => {
                return {
                    title: module.name,
                    icon: handlerSchema.displaydata.icon,
                    class: handlerSchema.displaydata.class,
                    showDownloadButton: hasOfflineFunctions,
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
            getMainComponent: (course: any, module: any): any => {
                return CoreSiteAddonsModuleIndexComponent;
            }
        });

        if (hasOfflineFunctions) {
            // Register the prefetch handler.
            this.prefetchDelegate.registerHandler(new CoreSiteAddonsModulePrefetchHandler(
                this.injector, this.siteAddonsProvider, addon.component, modName, handlerSchema));
        }

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
