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
import { CoreSitePluginsProvider } from './siteplugins';
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
import { CoreSitePluginsCourseFormatHandler } from '../classes/course-format-handler';
import { CoreSitePluginsCourseOptionHandler } from '../classes/course-option-handler';
import { CoreSitePluginsModuleHandler } from '../classes/module-handler';
import { CoreSitePluginsModulePrefetchHandler } from '../classes/module-prefetch-handler';
import { CoreSitePluginsMainMenuHandler } from '../classes/main-menu-handler';
import { CoreSitePluginsUserProfileHandler } from '../classes/user-handler';
import { CoreSitePluginsUserProfileFieldHandler } from '../classes/user-profile-field-handler';

/**
 * Helper service to provide functionalities regarding site plugins. It basically has the features to load and register site
 * plugin.
 *
 * This code is split from CoreSitePluginsProvider to prevent circular dependencies.
 *
 * @todo: Support ViewChild and similar in site plugins. Possible solution: make components and directives inject the instance
 * inside the host DOM element?
 */
@Injectable()
export class CoreSitePluginsHelperProvider {
    protected logger;
    protected hasSitePluginsLoaded = false;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,  private injector: Injector,
            private mainMenuDelegate: CoreMainMenuDelegate, private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate, private langProvider: CoreLangProvider,
            private sitePluginsProvider: CoreSitePluginsProvider, private prefetchDelegate: CoreCourseModulePrefetchDelegate,
            private compileProvider: CoreCompileProvider, private utils: CoreUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, eventsProvider: CoreEventsProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private profileFieldDelegate: CoreUserProfileFieldDelegate) {
        this.logger = logger.getInstance('CoreSitePluginsHelperProvider');

        // Fetch the plugins on login.
        eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            const siteId = this.sitesProvider.getCurrentSiteId();
            this.fetchSitePlugins(siteId).then((plugins) => {
                // Plugins fetched, check that site hasn't changed.
                if (siteId == this.sitesProvider.getCurrentSiteId() && plugins.length) {
                    // Site is still the same. Load the plugins and trigger the event.
                    this.loadSitePlugins(plugins).then(() => {
                        eventsProvider.trigger(CoreEventsProvider.SITE_PLUGINS_LOADED, {}, siteId);
                    });

                }
            });
        });

        // Unload plugins on logout if any.
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            if (this.hasSitePluginsLoaded) {
                // Temporary fix. Reload the page to unload all plugins.
                window.location.reload();
            }
        });
    }

    /**
     * Bootstrap a handler if it has some bootstrap method.
     *
     * @param {any} plugin Data of the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @return {Promise<any>} Promise resolved when done. It returns the results of the getContent call and the data returned by
     *                        the bootstrap JS (if any).
     */
    protected bootstrapHandler(plugin: any, handlerSchema: any): Promise<any> {
        if (!handlerSchema.bootstrap) {
            return Promise.resolve({});
        }

        return this.executeMethodAndJS(plugin, handlerSchema.bootstrap);
    }

    /**
     * Execute a get_content method and run its javascript (if any).
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} method The method to call.
     * @return {Promise<any>} Promise resolved when done. It returns the results of the getContent call and the data returned by
     *                        the JS (if any).
     */
    protected executeMethodAndJS(plugin: any, method: string): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId(),
            preSets = {getFromCache: false}; // Try to ignore cache.

        return this.sitePluginsProvider.getContent(plugin.component, method, {}, preSets).then((result) => {
            if (!result.javascript || this.sitesProvider.getCurrentSiteId() != siteId) {
                // No javascript or site has changed, stop.
                return result;
            }

            // Create a "fake" instance to hold all the libraries.
            const instance = {};
            this.compileProvider.injectLibraries(instance);

            // Add some data of the WS call result.
            const jsData = this.sitePluginsProvider.createDataForJS(result);
            for (const name in jsData) {
                instance[name] = jsData[name];
            }

            // Now execute the javascript using this instance.
            result.jsResult = this.compileProvider.executeJavascript(instance, result.javascript);

            return result;
        });
    }

    /**
     * Fetch site plugins.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved when done. Returns the list of plugins to load.
     */
    fetchSitePlugins(siteId?: string): Promise<any[]> {
        const plugins = [];

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!this.sitePluginsProvider.isGetContentAvailable(site)) {
                // Cannot load site plugins, so there's no point to fetch them.
                return plugins;
            }

            // Get the list of plugins. Try not to use cache.
            return site.read('tool_mobile_get_plugins_supporting_mobile', {}, { getFromCache: false }).then((data) => {
                data.plugins.forEach((plugin: any) => {
                    // Check if it's a site plugin and it's enabled.
                    if (this.isSitePluginEnabled(plugin, site)) {
                        plugins.push(plugin);
                    }
                });

                return plugins;
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
            return 'plugin.' + handlerName + '.';
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
     * Check if a certain plugin is a site plugin and it's enabled in a certain site.
     *
     * @param {any} plugin Data of the plugin.
     * @param {CoreSite} site Site affected.
     * @return {boolean} Whether it's a site plugin and it's enabled.
     */
    isSitePluginEnabled(plugin: any, site: CoreSite): boolean {
        if (!site.isFeatureDisabled('sitePlugin_' + plugin.component + '_' + plugin.addon) && plugin.handlers) {
            // Site plugin not disabled. Check if it has handlers.
            try {
                if (!plugin.parsedHandlers) {
                    plugin.parsedHandlers = JSON.parse(plugin.handlers);
                }

                return !!(plugin.parsedHandlers && Object.keys(plugin.parsedHandlers).length);
            } catch (ex) {
                this.logger.warn('Error parsing site plugin', ex);
            }
        }

        return false;
    }

    /**
     * Load the lang strings for a handler.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     */
    loadHandlerLangStrings(plugin: any, handlerName: string, handlerSchema: any): void {
        if (!handlerSchema.lang) {
            return;
        }

        for (const lang in handlerSchema.lang) {
            const prefix = this.getHandlerPrefixForStrings(this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName));

            this.langProvider.addSitePluginsStrings(lang, handlerSchema.lang[lang], prefix);
        }
    }

    /**
     * Load a site plugin.
     *
     * @param {any} plugin Data of the plugin.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadSitePlugin(plugin: any): Promise<any> {
        const promises = [];

        this.logger.debug('Load site plugin:', plugin);

        try {
            if (!plugin.parsedHandlers) {
                plugin.parsedHandlers = JSON.parse(plugin.handlers);
            }

            this.hasSitePluginsLoaded = true;

            // Register all the handlers.
            for (const name in plugin.parsedHandlers) {
                promises.push(this.registerHandler(plugin, name, plugin.parsedHandlers[name]));
            }
        } catch (ex) {
            this.logger.warn('Error parsing site plugin', ex);
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Load site plugins.
     *
     * @param {any[]} plugins The plugins to load.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadSitePlugins(plugins: any[]): Promise<any> {
        const promises = [];

        plugins.forEach((plugin) => {
            promises.push(this.loadSitePlugin(plugin));
        });

        return this.utils.allPromises(promises);
    }

    /**
     * Register a site plugin handler in the right delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @return {Promise<any>} Promise resolved when done.
     */
    registerHandler(plugin: any, handlerName: string, handlerSchema: any): Promise<any> {
        this.loadHandlerLangStrings(plugin, handlerName, handlerSchema);

        // Wait for the bootstrap JS to be executed.
        return this.bootstrapHandler(plugin, handlerSchema).then((result) => {
            let promise;

            switch (handlerSchema.delegate) {
                case 'CoreMainMenuDelegate':
                    promise = Promise.resolve(this.registerMainMenuHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseModuleDelegate':
                    promise = Promise.resolve(this.registerModuleHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreUserDelegate':
                    promise = Promise.resolve(this.registerUserProfileHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseOptionsDelegate':
                    promise = Promise.resolve(this.registerCourseOptionHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseFormatDelegate':
                    promise = Promise.resolve(this.registerCourseFormatHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreUserProfileFieldDelegate':
                    promise = Promise.resolve(this.registerUserProfileFieldHandler(plugin, handlerName, handlerSchema, result));
                    break;

                default:
                    // Nothing to do.
                    promise = Promise.resolve();
            }

            return promise.then((uniqueName) => {
                if (uniqueName) {
                    // Store the handler data.
                    this.sitePluginsProvider.setSitePluginHandler(uniqueName, {
                        plugin: plugin,
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
     * Given a handler in a plugin, register it in the course format delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerCourseFormatHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        this.logger.debug('Register site plugin in course format delegate:', plugin, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const formatName = plugin.component.replace('format_', '');
        this.courseFormatDelegate.registerHandler(new CoreSitePluginsCourseFormatHandler(formatName, handlerSchema));

        return formatName;
    }

    /**
     * Given a handler in an plugin, register it in the course options delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerCourseOptionHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in course option delegate:', plugin, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.courseOptionsDelegate.registerHandler(new CoreSitePluginsCourseOptionHandler(uniqueName, prefixedTitle, plugin,
                handlerSchema, bootstrapResult, this.sitePluginsProvider));

        return uniqueName;
    }

    /**
     * Given a handler in an plugin, register it in the main menu delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerMainMenuHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in main menu delegate:', plugin, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.mainMenuDelegate.registerHandler(
                new CoreSitePluginsMainMenuHandler(uniqueName, prefixedTitle, plugin, handlerSchema, bootstrapResult));

        return uniqueName;
    }

    /**
     * Given a handler in an plugin, register it in the module delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerModuleHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in module delegate:', plugin, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const modName = plugin.component.replace('mod_', '');

        this.moduleDelegate.registerHandler(new CoreSitePluginsModuleHandler(modName, handlerSchema));

        if (handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length) {
            // Register the prefetch handler.
            this.prefetchDelegate.registerHandler(new CoreSitePluginsModulePrefetchHandler(
                this.injector, this.sitePluginsProvider, plugin.component, modName, handlerSchema));
        }

        return modName;
    }

    /**
     * Given a handler in an plugin, register it in the user profile delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string} A string to identify the handler.
     */
    protected registerUserProfileHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in user profile delegate:', plugin, handlerSchema, bootstrapResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getHandlerPrefixedString(uniqueName, handlerSchema.displaydata.title);

        this.userDelegate.registerHandler(new CoreSitePluginsUserProfileHandler(uniqueName, prefixedTitle, plugin, handlerSchema,
                bootstrapResult, this.sitePluginsProvider));

        return uniqueName;
    }

    /**
     * Given a handler in an plugin, register it in the user profile field delegate.
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler in the plugin.
     * @param {any} handlerSchema Data about the handler.
     * @param {any} bootstrapResult Result of the bootstrap WS call.
     * @return {string|Promise<string>} A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerUserProfileFieldHandler(plugin: any, handlerName: string, handlerSchema: any, bootstrapResult: any)
            : string | Promise<string> {
        if (!handlerSchema.method) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide method', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in user profile field delegate:', plugin, handlerSchema, bootstrapResult);

        // Execute the main method and its JS. The template returned will be used in the profile field component.
        return this.executeMethodAndJS(plugin, handlerSchema.method).then((result) => {
            // Create and register the handler.
            const fieldType = plugin.component.replace('profilefield_', ''),
                fieldHandler = new CoreSitePluginsUserProfileFieldHandler(fieldType);

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
