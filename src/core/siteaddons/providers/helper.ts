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
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLangProvider } from '../../../providers/lang';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreSiteAddonsProvider } from './siteaddons';
import { CoreCompileProvider } from '../../compile/providers/compile';

// Delegates
import { CoreMainMenuDelegate } from '../../mainmenu/providers/delegate';
import { CoreCourseModuleDelegate } from '../../course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../course/providers/module-prefetch-delegate';
import { CoreCourseOptionsDelegate } from '../../course/providers/options-delegate';
import { CoreCourseFormatDelegate } from '../../course/providers/format-delegate';
import { CoreUserDelegate } from '../../user/providers/user-delegate';
import { CoreUserProfileFieldDelegate } from '../../user/providers/user-profile-field-delegate';

// Handler classes.
import { CoreSiteAddonsCourseFormatHandler } from '../classes/course-format-handler';
import { CoreSiteAddonsCourseOptionHandler } from '../classes/course-option-handler';
import { CoreSiteAddonsModuleHandler } from '../classes/module-handler';
import { CoreSiteAddonsModulePrefetchHandler } from '../classes/module-prefetch-handler';
import { CoreSiteAddonsMainMenuHandler } from '../classes/main-menu-handler';
import { CoreSiteAddonsUserProfileHandler } from '../classes/user-handler';
import { CoreSiteAddonsUserProfileFieldHandler } from '../classes/user-profile-field-handler';

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
    protected hasSiteAddonsLoaded = false;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,  private injector: Injector,
            private mainMenuDelegate: CoreMainMenuDelegate, private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate, private langProvider: CoreLangProvider,
            private siteAddonsProvider: CoreSiteAddonsProvider, private prefetchDelegate: CoreCourseModulePrefetchDelegate,
            private compileProvider: CoreCompileProvider, private utils: CoreUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, eventsProvider: CoreEventsProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private profileFieldDelegate: CoreUserProfileFieldDelegate) {
        this.logger = logger.getInstance('CoreSiteAddonsHelperProvider');

        // Fetch the addons on login.
        eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            const siteId = this.sitesProvider.getCurrentSiteId();
            this.fetchSiteAddons(siteId).then((addons) => {
                // Addons fetched, check that site hasn't changed.
                if (siteId == this.sitesProvider.getCurrentSiteId() && addons.length) {
                    // Site is still the same. Load the addons and trigger the event.
                    this.loadSiteAddons(addons).then(() => {
                        eventsProvider.trigger(CoreEventsProvider.SITE_ADDONS_LOADED, {}, siteId);
                    });

                }
            });
        });

        // Unload addons on logout if any.
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            if (this.hasSiteAddonsLoaded) {
                // Temporary fix. Reload the page to unload all plugins.
                window.location.reload();
            }
        });
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
     * Fetch site addons.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved when done. Returns the list of addons to load.
     */
    fetchSiteAddons(siteId?: string): Promise<any[]> {
        const addons = [];

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!this.siteAddonsProvider.isGetContentAvailable(site)) {
                // Cannot load site addons, so there's no point to fetch them.
                return addons;
            }

            // Get the list of addons. Try not to use cache.
            return site.read('tool_mobile_get_plugins_supporting_mobile', {}, { getFromCache: false }).then((data) => {
                data.plugins.forEach((addon: any) => {
                    // Check if it's a site addon and it's enabled.
                    if (this.isSiteAddonEnabled(addon, site)) {
                        addons.push(addon);
                    }
                });

                return addons;
            });
        });
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

        this.logger.debug('Load site addon:', addon);

        try {
            if (!addon.parsedHandlers) {
                addon.parsedHandlers = JSON.parse(addon.handlers);
            }

            this.hasSiteAddonsLoaded = true;

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
     * Load site addons.
     *
     * @param {any[]} addons The addons to load.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadSiteAddons(addons: any[]): Promise<any> {
        const promises = [];

        addons.forEach((addon) => {
            promises.push(this.loadSiteAddon(addon));
        });

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
        this.logger.debug('Register site addon in course format delegate:', addon, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const formatName = addon.component.replace('format_', '');
        this.courseFormatDelegate.registerHandler(new CoreSiteAddonsCourseFormatHandler(formatName, handlerSchema));

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
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site addon because it doesn\'t provide displaydata', addon, handlerSchema);

            return;
        }

        this.logger.debug('Register site addon in course option delegate:', addon, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.courseOptionsDelegate.registerHandler(new CoreSiteAddonsCourseOptionHandler(uniqueName, prefixedTitle, addon,
                handlerSchema, bootstrapResult, this.siteAddonsProvider));

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
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site addon because it doesn\'t provide displaydata', addon, handlerSchema);

            return;
        }

        this.logger.debug('Register site addon in main menu delegate:', addon, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.mainMenuDelegate.registerHandler(
                new CoreSiteAddonsMainMenuHandler(uniqueName, prefixedTitle, addon, handlerSchema, bootstrapResult));

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
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site addon because it doesn\'t provide displaydata', addon, handlerSchema);

            return;
        }

        this.logger.debug('Register site addon in module delegate:', addon, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const modName = addon.component.replace('mod_', '');

        this.moduleDelegate.registerHandler(new CoreSiteAddonsModuleHandler(modName, handlerSchema));

        if (handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length) {
            // Register the prefetch handler.
            this.prefetchDelegate.registerHandler(new CoreSiteAddonsModulePrefetchHandler(
                this.injector, this.siteAddonsProvider, addon.component, modName, handlerSchema));
        }

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
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site addon because it doesn\'t provide displaydata', addon, handlerSchema);

            return;
        }

        this.logger.debug('Register site addon in user profile delegate:', addon, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.siteAddonsProvider.getHandlerUniqueName(addon, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.userDelegate.registerHandler(new CoreSiteAddonsUserProfileHandler(uniqueName, prefixedTitle, addon, handlerSchema,
                bootstrapResult, this.siteAddonsProvider));

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
        if (!handlerSchema.method) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site addon because it doesn\'t provide method', addon, handlerSchema);

            return;
        }

        this.logger.debug('Register site addon in user profile field delegate:', addon, handlerSchema, bootstrapResult);

        // Execute the main method and its JS. The template returned will be used in the profile field component.
        return this.executeMethodAndJS(addon, handlerSchema.method).then((result) => {
            // Create and register the handler.
            const fieldType = addon.component.replace('profilefield_', ''),
                fieldHandler = new CoreSiteAddonsUserProfileFieldHandler(fieldType);

            // Store in handlerSchema some data required by the component.
            handlerSchema.methodTemplates = result.templates;
            handlerSchema.methodJSResult = result.jsResult;

            if (result && result.jsResult) {
                // Override default handler functions with the result of the method JS.
                for (const property in fieldHandler) {
                    if (property != 'constructor' && typeof fieldHandler[property] == 'function' &&
                            typeof result.jsResult[property] == 'function') {
                        fieldHandler[property] = result.jsResult[property].bind(fieldHandler);
                    }
                }
            }

            this.profileFieldDelegate.registerHandler(fieldHandler);

            return fieldType;
        }).catch((err) => {
            this.logger.error('Error executing main method', handlerSchema.method, err);
        });
    }
}
