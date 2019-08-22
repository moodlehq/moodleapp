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
import { Platform } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLangProvider } from '@providers/lang';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider, PromiseDefer } from '@providers/utils/utils';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreEventsProvider } from '@providers/events';

/**
 * Handler of a site plugin.
 */
export interface CoreSitePluginsHandler {
    /**
     * The site plugin data.
     * @type {any}
     */
    plugin: any;

    /**
     * Name of the handler.
     * @type {string}
     */
    handlerName: string;

    /**
     * Data of the handler.
     * @type {any}
     */
    handlerSchema: any;

    /**
     * Result of the init WS call.
     * @type {any}
     */
    initResult?: any;
}

/**
 * Service to provide functionalities regarding site plugins.
 */
@Injectable()
export class CoreSitePluginsProvider {
    static COMPONENT = 'CoreSitePlugins';

    protected ROOT_CACHE_KEY = 'CoreSitePlugins:';

    protected logger;
    protected sitePlugins: {[name: string]: CoreSitePluginsHandler} = {}; // Site plugins registered.
    protected sitePluginPromises: {[name: string]: Promise<any>} = {}; // Promises of loading plugins.
    protected fetchPluginsDeferred: PromiseDefer;
    hasSitePluginsLoaded = false;
    sitePluginsFinishedLoading = false;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private langProvider: CoreLangProvider, private appProvider: CoreAppProvider, private platform: Platform,
            private filepoolProvider: CoreFilepoolProvider, private coursesProvider: CoreCoursesProvider,
            private textUtils: CoreTextUtilsProvider, private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreUserProvider');

        const observer = this.eventsProvider.on(CoreEventsProvider.SITE_PLUGINS_LOADED, () => {
            this.sitePluginsFinishedLoading = true;
            observer && observer.off();
        });

        // Initialize deferred at start and on logout.
        this.fetchPluginsDeferred = this.utils.promiseDefer();
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            this.fetchPluginsDeferred = this.utils.promiseDefer();
        });
    }

    /**
     * Add some params that will always be sent for get content.
     *
     * @param {any} args Original params.
     * @param {CoreSite} [site] Site. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the new params.
     */
    protected addDefaultArgs(args: any, site?: CoreSite): Promise<any> {
        args = args || {};
        site = site || this.sitesProvider.getCurrentSite();

        return this.langProvider.getCurrentLanguage().then((lang) => {

            // Clone the object so the original one isn't modified.
            const argsToSend = this.utils.clone(args);

            argsToSend.userid = args.userid || site.getUserId();
            argsToSend.appid = CoreConfigConstants.app_id;
            argsToSend.appversioncode = CoreConfigConstants.versioncode;
            argsToSend.appversionname = CoreConfigConstants.versionname;
            argsToSend.applang = lang;
            argsToSend.appcustomurlscheme = CoreConfigConstants.customurlscheme;
            argsToSend.appisdesktop = this.appProvider.isDesktop();
            argsToSend.appismobile = this.appProvider.isMobile();
            argsToSend.appiswide = this.appProvider.isWide();

            if (argsToSend.appisdevice) {
                if (this.platform.is('ios')) {
                    argsToSend.appplatform = 'ios';
                } else {
                    argsToSend.appplatform = 'android';
                }
            } else if (argsToSend.appisdesktop) {
                if (this.appProvider.isMac()) {
                    argsToSend.appplatform = 'mac';
                } else if (this.appProvider.isLinux()) {
                    argsToSend.appplatform = 'linux';
                } else {
                    argsToSend.appplatform = 'windows';
                }
            } else {
                argsToSend.appplatform = 'browser';
            }

            return argsToSend;
        });
    }

    /**
     * Call a WS for a site plugin.
     *
     * @param {string} method WS method to use.
     * @param {any} data Data to send to the WS.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the response.
     */
    callWS(method: string, data: any, preSets?: CoreSiteWSPreSets, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            preSets = preSets || {};
            preSets.cacheKey = preSets.cacheKey || this.getCallWSCacheKey(method, data);

            return site.read(method, data, preSets);
        });
    }

    /**
     * Given the result of a init get_content and, optionally, the result of another get_content,
     * build an object with the data to pass to the JS of the get_content.
     *
     * @param {any} initResult Result of the init WS call.
     * @param {any} [contentResult] Result of the content WS call (if any).
     * @return {any} An object with the data to pass to the JS.
     */
    createDataForJS(initResult: any, contentResult?: any): any {
        let data;

        if (initResult) {
            // First of all, add the data returned by the init JS (if any).
            data = this.utils.clone(initResult.jsResult || {});
            if (typeof data == 'boolean') {
                data = {};
            }

            // Now add some data returned by the init WS call.
            data.INIT_TEMPLATES = this.utils.objectToKeyValueMap(initResult.templates, 'id', 'html');
            data.INIT_OTHERDATA = initResult.otherdata;
        }

        if (contentResult) {
            // Now add the data returned by the content WS call.
            data.CONTENT_TEMPLATES = this.utils.objectToKeyValueMap(contentResult.templates, 'id', 'html');
            data.CONTENT_OTHERDATA = contentResult.otherdata;
        }

        return data;
    }

    /**
     * Get cache key for a WS call.
     *
     * @param {string} method Name of the method.
     * @param {any} data Data to identify the WS call.
     * @return {string} Cache key.
     */
    getCallWSCacheKey(method: string, data: any): string {
        return this.getCallWSCommonCacheKey(method) + ':' + this.utils.sortAndStringify(data);
    }

    /**
     * Get common cache key for a WS call.
     *
     * @param {string} method Name of the method.
     * @return {string} Cache key.
     */
    protected getCallWSCommonCacheKey(method: string): string {
        return this.ROOT_CACHE_KEY + 'ws:' + method;
    }

    /**
     * Get a certain content for a site plugin.
     *
     * @param {string} component Component where the class is. E.g. mod_assign.
     * @param {string} method Method to execute in the class.
     * @param {any} args The params for the method.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the result.
     */
    getContent(component: string, method: string, args: any, preSets?: CoreSiteWSPreSets, siteId?: string): Promise<any> {
        this.logger.debug(`Get content for component '${component}' and method '${method}'`);

        return this.sitesProvider.getSite(siteId).then((site) => {

            // Add some params that will always be sent.
            return this.addDefaultArgs(args, site).then((argsToSend) => {
                // Now call the WS.
                const data = {
                        component: component,
                        method: method,
                        args: this.utils.objectToArrayOfObjects(argsToSend, 'name', 'value', true)
                    };

                preSets = preSets || {};
                preSets.cacheKey = this.getContentCacheKey(component, method, args);
                preSets.updateFrequency = typeof preSets.updateFrequency != 'undefined' ? preSets.updateFrequency :
                        CoreSite.FREQUENCY_OFTEN;

                return this.sitesProvider.getCurrentSite().read('tool_mobile_get_content', data, preSets);
            }).then((result) => {
                if (result.otherdata) {
                    result.otherdata = this.utils.objectToKeyValueMap(result.otherdata, 'name', 'value');

                    // Try to parse all properties that could be JSON encoded strings.
                    for (const name in result.otherdata) {
                        const value = result.otherdata[name];

                        if (typeof value == 'string' && (value[0] == '{' || value[0] == '[')) {
                            result.otherdata[name] = this.textUtils.parseJSON(value);
                        }
                    }
                } else {
                    result.otherdata = {};
                }

                return result;
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
        return this.ROOT_CACHE_KEY + 'content:' + component + ':' + method + ':' + this.utils.sortAndStringify(args);
    }

    /**
     * Get the value of a WS param for prefetch.
     *
     * @param {string} component The component of the handler.
     * @param {string} paramName Name of the param as defined by the handler.
     * @param {number} [courseId] Course ID (if prefetching a course).
     * @param {any} [module] The module object returned by WS (if prefetching a module).
     * @return {any} The value.
     */
    protected getDownloadParam(component: string, paramName: string, courseId?: number, module?: any): any {
        switch (paramName) {
            case 'courseids':
                // The WS needs the list of course IDs. Create the list.
                return [courseId];

            case component + 'id':
                // The WS needs the instance id.
                return module && module.instance;

            default:
                // No more params supported for now.
        }
    }

    /**
     * Get the unique name of a handler (plugin + handler).
     *
     * @param {any} plugin Data of the plugin.
     * @param {string} handlerName Name of the handler inside the plugin.
     * @return {string} Unique name.
     */
    getHandlerUniqueName(plugin: any, handlerName: string): string {
        return plugin.addon + '_' + handlerName;
    }

    /**
     * Get a site plugin handler.
     *
     * @param {string} name Unique name of the handler.
     * @return {CoreSitePluginsHandler} Handler.
     */
    getSitePluginHandler(name: string): CoreSitePluginsHandler {
        return this.sitePlugins[name];
    }

    /**
     * Invalidate all WS call to a certain method.
     *
     * @param {string} method WS method to use.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllCallWSForMethod(method: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getCallWSCommonCacheKey(method));
        });
    }

    /**
     * Invalidate a WS call.
     *
     * @param {string} method WS method to use.
     * @param {any} data Data to send to the WS.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCallWS(method: string, data: any, preSets?: CoreSiteWSPreSets, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(preSets.cacheKey || this.getCallWSCacheKey(method, data));
        });
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
    invalidateContent(component: string, callback: string, args: any, siteId?: string): Promise<any> {
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
     * Check if a handler is enabled for a certain course.
     *
     * @param {number} courseId Course ID to check.
     * @param {boolean} [restrictEnrolled] If true or undefined, handler is only enabled for courses the user is enrolled in.
     * @param {any} [restrict] Users and courses the handler is restricted to.
     * @return {boolean | Promise<boolean>} Whether the handler is enabled.
     */
    isHandlerEnabledForCourse(courseId: number, restrictEnrolled?: boolean, restrict?: any): boolean | Promise<boolean> {
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
    isHandlerEnabledForUser(userId: number, restrictCurrent?: boolean, restrict?: any): boolean {
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
     * Load other data into args as determined by useOtherData list.
     * If useOtherData is undefined, it won't add any data.
     * If useOtherData is an array, it will only copy the properties whose names are in the array.
     * If useOtherData is any other value, it will copy all the data from otherData to args.
     *
     * @param {any} args The current args.
     * @param {any} otherData All the other data.
     * @param {any} useOtherData Names of the attributes to include.
     * @return {any} New args.
     */
    loadOtherDataInArgs(args: any, otherData: any, useOtherData: any): any {
        if (!args) {
            args = {};
        } else {
            args = this.utils.clone(args);
        }

        otherData = otherData || {};

        if (typeof useOtherData == 'undefined') {
            // No need to add other data, return args as they are.
            return args;
        } else if (Array.isArray(useOtherData)) {
            // Include only the properties specified in the array.
            for (const i in useOtherData) {
                const name = useOtherData[i];

                if (typeof otherData[name] == 'object' && otherData[name] !== null) {
                    // Stringify objects.
                    args[name] = JSON.stringify(otherData[name]);
                } else {
                    args[name] = otherData[name];
                }
            }
        } else {
            // Add all the data to args.
            for (const name in otherData) {
                if (typeof otherData[name] == 'object' && otherData[name] !== null) {
                    // Stringify objects.
                    args[name] = JSON.stringify(otherData[name]);
                } else {
                    args[name] = otherData[name];
                }
            }
        }

        return args;
    }

    /**
     * Prefetch offline functions for a site plugin handler.
     *
     * @param {string} component The component of the handler.
     * @param {any} args Params to send to the get_content calls.
     * @param {any} handlerSchema The handler schema.
     * @param {number} [courseId] Course ID (if prefetching a course).
     * @param {any} [module] The module object returned by WS (if prefetching a module).
     * @param {boolean} [prefetch] True to prefetch, false to download right away.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @param {CoreSite} [site] Site. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetchFunctions(component: string, args: any, handlerSchema: any, courseId?: number, module?: any, prefetch?: boolean,
            dirPath?: string, site?: CoreSite): Promise<any> {
        site = site || this.sitesProvider.getCurrentSite();

        const promises = [];

        for (const method in handlerSchema.offlinefunctions) {
            if (site.wsAvailable(method)) {
                // The method is a WS.
                const paramsList = handlerSchema.offlinefunctions[method],
                    cacheKey = this.getCallWSCacheKey(method, args);
                let params = {};

                if (!paramsList.length) {
                    // No params defined, send the default ones.
                    params = args;
                } else {
                    for (const i in paramsList) {
                        const paramName = paramsList[i];

                        if (typeof args[paramName] != 'undefined') {
                            params[paramName] = args[paramName];
                        } else {
                            // The param is not one of the default ones. Try to calculate the param to use.
                            const value = this.getDownloadParam(component, paramName, courseId, module);
                            if (typeof value != 'undefined') {
                                params[paramName] = value;
                            }
                        }
                    }
                }

                promises.push(this.callWS(method, params, {cacheKey: cacheKey}));
            } else {
                // It's a method to get content.
                promises.push(this.getContent(component, method, args).then((result) => {
                    const subPromises = [];

                    // Prefetch the files in the content.
                    if (result.files && result.files.length) {
                        subPromises.push(this.filepoolProvider.downloadOrPrefetchFiles(site.id, result.files, prefetch, false,
                            component, module.id, dirPath));
                    }

                    return Promise.all(subPromises);
                }));
            }
        }

        return Promise.all(promises);
    }

    /**
     * Store a site plugin handler.
     *
     * @param {string} name A unique name to identify the handler.
     * @param {CoreSitePluginsHandler} handler Handler to set.
     */
    setSitePluginHandler(name: string, handler: CoreSitePluginsHandler): void {
        this.sitePlugins[name] = handler;
    }

    /**
     * Store the promise for a plugin that is being initialised.
     *
     * @param {String} component
     * @param {Promise<any>} promise
     */
    registerSitePluginPromise(component: string, promise: Promise<any>): void {
        this.sitePluginPromises[component] = promise;
    }

    /**
     * Set plugins fetched.
     */
    setPluginsFetched(): void {
        this.fetchPluginsDeferred.resolve();
    }

    /**
     * Is a plugin being initialised for the specified component?
     *
     * @param {String} component
     * @return {boolean}
     */
    sitePluginPromiseExists(component: string): boolean {
        return this.sitePluginPromises.hasOwnProperty(component);
    }

    /**
     * Get the promise for a plugin that is being initialised.
     *
     * @param {String} component
     * @return {Promise<any>}
     */
    sitePluginLoaded(component: string): Promise<any> {
        return this.sitePluginPromises[component];
    }

    /**
     * Wait for fetch plugins to be done.
     *
     * @return {Promise<any>} Promise resolved when site plugins have been fetched.
     */
    waitFetchPlugins(): Promise<any> {
        return this.fetchPluginsDeferred.promise;
    }
}
