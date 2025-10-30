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

import { Injectable } from '@angular/core';

import { CoreCacheUpdateFrequency, CoreConstants } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreFilepool } from '@services/filepool';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@singletons/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSitePluginsModuleHandler } from '../classes/handlers/module-handler';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { CoreEnrolAction, CoreEnrolInfoIcon } from '@features/enrol/services/enrol-delegate';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreUserProfileHandlerType } from '@features/user/services/user-delegate';
import { CORE_SITE_PLUGINS_COMPONENT, CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT } from '../constants';
import { CoreObject } from '@singletons/object';

/**
 * Service to provide functionalities regarding site plugins.
 */
@Injectable({ providedIn: 'root' })
export class CoreSitePluginsProvider {

    protected static readonly ROOT_CACHE_KEY = 'CoreSitePlugins:';
    /**
     * @deprecated since 4.5.0. Use CORE_SITE_PLUGINS_COMPONENT instead.
     */
    static readonly COMPONENT = CORE_SITE_PLUGINS_COMPONENT;
    /**
     * @deprecated since 4.5.0. Use CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT instead.
     */
    static readonly UPDATE_COURSE_CONTENT = CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT;

    protected logger: CoreLogger;
    protected sitePlugins: {[name: string]: CoreSitePluginsHandler} = {}; // Site plugins registered.
    protected sitePluginPromises: {[name: string]: Promise<void>} = {}; // Promises of loading plugins.
    protected fetchPluginsDeferred: CorePromisedValue<void>;
    protected moduleHandlerInstances: Record<string, CoreSitePluginsModuleHandler> = {};

    hasSitePluginsLoaded = false;
    sitePluginsFinishedLoading = false;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreSitePluginsProvider');

        const observer = CoreEvents.on(CoreEvents.SITE_PLUGINS_LOADED, () => {
            this.sitePluginsFinishedLoading = true;
            observer?.off();
        });

        // Initialize deferred at start and on logout.
        this.fetchPluginsDeferred = new CorePromisedValue();
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.fetchPluginsDeferred = new CorePromisedValue();
        });
    }

    /**
     * Add some params that will always be sent for get content.
     *
     * @param args Original params.
     * @param site Site. If not defined, current site.
     * @returns Promise resolved with the new params.
     */
    protected async addDefaultArgs<T extends Record<string, unknown> = Record<string, unknown>>(
        args: T,
        site?: CoreSite,
    ): Promise<T & CoreSitePluginsDefaultArgs> {
        args = args || {};
        site = site || CoreSites.getCurrentSite();

        const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);

        const defaultArgs: CoreSitePluginsDefaultArgs = {
            userid: <number> args.userid ?? site?.getUserId(),
            appid: CoreConstants.CONFIG.app_id,
            appversioncode: CoreConstants.CONFIG.versioncode,
            appversionname: CoreConstants.CONFIG.versionname,
            applang: lang,
            appcustomurlscheme: CoreConstants.CONFIG.customurlscheme,
            appisdesktop: false,
            appismobile: CorePlatform.isMobile(),
            appiswide: CorePlatform.isWide(),
            appplatform: 'browser',
        };

        if (args.appismobile) {
            defaultArgs.appplatform = CorePlatform.isIOS() ? 'ios' : 'android';
        }

        return {
            ...args,
            ...defaultArgs,
        };
    }

    /**
     * Call a WS for a site plugin.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the response.
     */
    async callWS<T = unknown>(
        method: string,
        data: Record<string, unknown>,
        preSets?: CoreSiteWSPreSets,
        siteId?: string,
    ): Promise<T> {
        const site = await CoreSites.getSite(siteId);

        preSets = preSets || {};
        preSets.cacheKey = preSets.cacheKey || this.getCallWSCacheKey(method, data);

        return site.read<T>(method, data, preSets);
    }

    /**
     * Given the result of a init get_content and, optionally, the result of another get_content,
     * build an object with the data to pass to the JS of the get_content.
     *
     * @param initResult Result of the init WS call.
     * @param contentResult Result of the content WS call (if any).
     * @returns An object with the data to pass to the JS.
     */
    createDataForJS(
        initResult?: CoreSitePluginsContent | null,
        contentResult?: CoreSitePluginsContent | null,
    ): Record<string, unknown> {
        let data: Record<string, unknown> = {};

        if (initResult) {
            // First of all, add the data returned by the init JS (if any).
            data = Object.assign(data, initResult.jsResult || {});

            // Now add some data returned by the init WS call.
            data.INIT_TEMPLATES = CoreObject.toKeyValueMap(initResult.templates, 'id', 'html');
            data.INIT_OTHERDATA = initResult.otherdata;
        }

        if (contentResult) {
            // Now add the data returned by the content WS call.
            data.CONTENT_TEMPLATES = CoreObject.toKeyValueMap(contentResult.templates, 'id', 'html');
            data.CONTENT_OTHERDATA = contentResult.otherdata;
        }

        return data;
    }

    /**
     * Get cache key for a WS call.
     *
     * @param method Name of the method.
     * @param data Data to identify the WS call.
     * @returns Cache key.
     */
    getCallWSCacheKey(method: string, data: Record<string, unknown>): string {
        return `${this.getCallWSCommonCacheKey(method)}:${CoreObject.sortAndStringify(data)}`;
    }

    /**
     * Get common cache key for a WS call.
     *
     * @param method Name of the method.
     * @returns Cache key.
     */
    protected getCallWSCommonCacheKey(method: string): string {
        return `${CoreSitePluginsProvider.ROOT_CACHE_KEY}ws:${method}`;
    }

    /**
     * Get a certain content for a site plugin.
     *
     * @param component Component where the class is. E.g. mod_assign.
     * @param method Method to execute in the class.
     * @param args The params for the method.
     * @param preSets Extra options.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the result.
     */
    async getContent(
        component: string,
        method: string,
        args?: Record<string, unknown>,
        preSets?: CoreSiteWSPreSets,
        siteId?: string,
    ): Promise<CoreSitePluginsContentParsed> {
        this.logger.debug(`Get content for component '${component}' and method '${method}'`);

        const site = await CoreSites.getSite(siteId);

        // Add some params that will always be sent.
        args = args || {};
        const argsToSend = await this.addDefaultArgs(args, site);

        // Now call the WS.
        const data: CoreSitePluginsGetContentWSParams = {
            component,
            method,
            args: CoreObject.toArrayOfObjects(argsToSend, 'name', 'value', true),
        };

        preSets = preSets || {};
        preSets.cacheKey = this.getContentCacheKey(component, method, args);
        preSets.updateFrequency = preSets.updateFrequency ?? CoreCacheUpdateFrequency.OFTEN;

        const result = await site.read<CoreSitePluginsGetContentWSResponse>('tool_mobile_get_content', data, preSets);

        let otherData: Record<string, unknown> = {};
        if (result.otherdata) {
            otherData = <Record<string, unknown>> CoreObject.toKeyValueMap(result.otherdata, 'name', 'value');

            // Try to parse all properties that could be JSON encoded strings.
            for (const name in otherData) {
                const value = otherData[name];

                if (typeof value == 'string' && (value[0] == '{' || value[0] == '[')) {
                    otherData[name] = CoreText.parseJSON(value);
                }
            }
        }

        return Object.assign(result, { otherdata: otherData });
    }

    /**
     * Get cache key for get content WS calls.
     *
     * @param component Component where the class is. E.g. mod_assign.
     * @param method Method to execute in the class.
     * @param args The params for the method.
     * @returns Cache key.
     */
    protected getContentCacheKey(component: string, method: string, args: Record<string, unknown>): string {
        return `${CoreSitePluginsProvider.ROOT_CACHE_KEY}content:${component}:${method}:${CoreObject.sortAndStringify(args)}`;
    }

    /**
     * Get the value of a WS param for prefetch.
     *
     * @param component The component of the handler.
     * @param paramName Name of the param as defined by the handler.
     * @param courseId Course ID (if prefetching a course).
     * @param module The module object returned by WS (if prefetching a module).
     * @returns The value.
     */
    protected getDownloadParam(
        component: string,
        paramName: string,
        courseId?: number,
        module?: CoreCourseAnyModuleData,
    ): [number] | number | undefined {
        switch (paramName) {
            case 'courseids':
                // The WS needs the list of course IDs. Create the list.
                return [courseId || 0];

            case `${component}id`:
                // The WS needs the instance id.
                return module && module.instance;

            default:
                // No more params supported for now.
        }
    }

    /**
     * Get the unique name of a handler (plugin + handler).
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler inside the plugin.
     * @returns Unique name.
     */
    getHandlerUniqueName(plugin: CoreSitePluginsPlugin, handlerName: string): string {
        return `${plugin.addon}_${handlerName}`;
    }

    /**
     * Get site plugins for site.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with the plugins.
     */
    async getPlugins(siteId?: string): Promise<CoreSitePluginsPlugin[]> {
        const site = await CoreSites.getSite(siteId);

        // Get the list of plugins. Try not to use cache.
        const data = await site.read<CoreSitePluginsGetPluginsSupportingMobileWSResponse>(
            'tool_mobile_get_plugins_supporting_mobile',
            {},
            {
                getFromCache: false,
                cacheKey: this.getPluginsCacheKey(),
            },
        );

        // Return enabled plugins.
        return data.plugins.filter((plugin) => this.isSitePluginEnabled(plugin, site));
    }

    /**
     * Get cache key for get plugins WS call.
     *
     * @returns Cache key.
     */
    protected getPluginsCacheKey(): string {
        return `${CoreSitePluginsProvider.ROOT_CACHE_KEY}plugins`;
    }

    /**
     * Get a site plugin handler.
     *
     * @param name Unique name of the handler.
     * @returns Handler.
     */
    getSitePluginHandler(name: string): CoreSitePluginsHandler | undefined {
        return this.sitePlugins[name];
    }

    /**
     * Get the current site plugin list.
     *
     * @returns Plugin list ws info.
     */
    getCurrentSitePluginList(): CoreSitePluginsWSPlugin[] {
        return CoreObject.toArray(this.sitePlugins).map((plugin) => plugin.plugin);
    }

    /**
     * Invalidate all WS call to a certain method.
     *
     * @param method WS method to use.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAllCallWSForMethod(method: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getCallWSCommonCacheKey(method));
    }

    /**
     * Invalidate a WS call.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCallWS(
        method: string,
        data: Record<string, unknown>,
        preSets?: CoreSiteWSPreSets,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        preSets = preSets || {};

        await site.invalidateWsCacheForKey(preSets.cacheKey || this.getCallWSCacheKey(method, data));
    }

    /**
     * Invalidate a page content.
     *
     * @param component Component where the class is. E.g. mod_assign.
     * @param callback Method to execute in the class.
     * @param args The params for the method.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContent(component: string, callback: string, args?: Record<string, unknown>, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getContentCacheKey(component, callback, args || {}));
    }

    /**
     * Check if a handler is enabled for a certain course.
     *
     * @param courseId Course ID to check.
     * @param restrictEnrolled If true or undefined, handler is only enabled for courses the user is enrolled in.
     * @param restrict Users and courses the handler is restricted to.
     * @returns Whether the handler is enabled.
     */
    async isHandlerEnabledForCourse(
        courseId: number,
        restrictEnrolled?: boolean,
        restrict?: CoreSitePluginsContentRestrict,
    ): Promise<boolean> {
        if (restrict?.courses?.indexOf(courseId) == -1) {
            // Course is not in the list of restricted courses.
            return false;
        }

        if (restrictEnrolled || restrictEnrolled === undefined) {
            // Only enabled for courses the user is enrolled to. Check if the user is enrolled in the course.
            try {
                await CoreCourses.getUserCourse(courseId, true);
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a handler is enabled for a certain user.
     *
     * @param userId User ID to check.
     * @param restrictCurrent Whether handler is only enabled for current user.
     * @param restrict Users and courses the handler is restricted to.
     * @returns Whether the handler is enabled.
     */
    isHandlerEnabledForUser(userId: number, restrictCurrent?: boolean, restrict?: CoreSitePluginsContentRestrict): boolean {
        if (restrictCurrent && userId != CoreSites.getCurrentSite()?.getUserId()) {
            // Only enabled for current user.
            return false;
        }

        if (restrict?.users?.indexOf(userId) == -1) {
            // User is not in the list of restricted users.
            return false;
        }

        return true;
    }

    /**
     * Check if a certain plugin is a site plugin and it's enabled in a certain site.
     *
     * @param plugin Data of the plugin.
     * @param site Site affected.
     * @returns Whether it's a site plugin and it's enabled.
     */
    isSitePluginEnabled(plugin: CoreSitePluginsPlugin, site: CoreSite): boolean {
        if (site.isFeatureDisabled(`sitePlugin_${plugin.component}_${plugin.addon}`) || !plugin.handlers) {
            return false;
        }

        // Site plugin not disabled. Check if it has handlers.
        if (!plugin.parsedHandlers) {
            plugin.parsedHandlers = CoreText.parseJSON(
                plugin.handlers,
                null,
                error => this.logger.error('Error parsing site plugin handlers', error),
            );
        }

        return !!(plugin.parsedHandlers && Object.keys(plugin.parsedHandlers).length);
    }

    /**
     * Load other data into args as determined by useOtherData list.
     * If useOtherData is undefined, it won't add any data.
     * If useOtherData is an array, it will only copy the properties whose names are in the array.
     * If useOtherData is any other value, it will copy all the data from otherData to args.
     *
     * @param args The current args.
     * @param otherData All the other data.
     * @param useOtherData Names of the attributes to include.
     * @returns New args.
     */
    loadOtherDataInArgs(
        args: Record<string, unknown> | undefined,
        otherData?: Record<string, unknown>,
        useOtherData?: string[] | unknown,
    ): Record<string, unknown> {
        if (!args) {
            args = {};
        } else {
            args = CoreUtils.clone(args);
        }

        otherData = otherData || {};

        if (useOtherData === undefined) {
            // No need to add other data, return args as they are.
            return args;
        } else if (Array.isArray(useOtherData)) {
            // Include only the properties specified in the array.
            for (const i in useOtherData) {
                const name = useOtherData[i];

                if (typeof otherData[name] === 'object' && otherData[name] !== null) {
                    // Stringify objects.
                    args[name] = JSON.stringify(otherData[name]);
                } else {
                    args[name] = otherData[name];
                }
            }
        } else {
            // Add all the data to args.
            for (const name in otherData) {
                if (typeof otherData[name] === 'object' && otherData[name] !== null) {
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
     * @param component The component of the handler.
     * @param args Params to send to the get_content calls.
     * @param handlerSchema The handler schema.
     * @param courseId Course ID (if prefetching a course).
     * @param module The module object returned by WS (if prefetching a module).
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files.
     * @param site Site. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async prefetchFunctions(
        component: string,
        args: Record<string, unknown>,
        handlerSchema: CoreSitePluginsCourseModuleHandlerData,
        courseId?: number,
        module?: CoreCourseAnyModuleData,
        prefetch?: boolean,
        dirPath?: string,
        site?: CoreSite,
    ): Promise<void> {
        site = site || CoreSites.getCurrentSite();
        if (!site || !handlerSchema.offlinefunctions) {
            return;
        }

        const siteInstance = site;
        const offlineFunctions = handlerSchema.offlinefunctions;

        await Promise.all(Object.keys(handlerSchema.offlinefunctions).map(async(method) => {
            if (siteInstance.wsAvailable(method)) {
                // The method is a WS.
                const paramsList = offlineFunctions[method];
                const cacheKey = this.getCallWSCacheKey(method, args);
                let params: Record<string, unknown> = {};

                if (!paramsList.length) {
                    // No params defined, send the default ones.
                    params = args;
                } else {
                    for (const i in paramsList) {
                        const paramName = paramsList[i];

                        if (args[paramName] !== undefined) {
                            params[paramName] = args[paramName];
                        } else {
                            // The param is not one of the default ones. Try to calculate the param to use.
                            const value = this.getDownloadParam(component, paramName, courseId, module);
                            if (value !== undefined) {
                                params[paramName] = value;
                            }
                        }
                    }
                }

                await this.callWS(method, params, { cacheKey });

                return;
            }

            // It's a method to get content.
            const preSets: CoreSiteWSPreSets = {
                component: component,
            };
            if (module) {
                preSets.componentId = module.id;
            }

            const result = await this.getContent(component, method, args, preSets);

            // Prefetch the files in the content.
            if (result.files.length) {
                await CoreFilepool.downloadOrPrefetchFiles(
                    siteInstance.getId(),
                    result.files,
                    !!prefetch,
                    false,
                    component,
                    module?.id,
                    dirPath,
                );
            }
        }));
    }

    /**
     * Store a site plugin handler.
     *
     * @param name A unique name to identify the handler.
     * @param handler Handler to set.
     */
    setSitePluginHandler(name: string, handler: CoreSitePluginsHandler): void {
        this.sitePlugins[name] = handler;
    }

    /**
     * Store the promise for a plugin that is being initialised.
     *
     * @param component Component name.
     * @param promise Promise to register.
     */
    registerSitePluginPromise(component: string, promise: Promise<void>): void {
        this.sitePluginPromises[component] = promise;
    }

    /**
     * Set plugins fetched.
     */
    setPluginsFetched(): void {
        this.fetchPluginsDeferred.resolve();
    }

    /**
     * Set plugins fetched.
     */
    setPluginsLoaded(loaded?: boolean): void {
        this.hasSitePluginsLoaded = !!loaded;
    }

    /**
     * Is a plugin being initialised for the specified component?
     *
     * @param component Component name.
     * @returns If site plugin promise has been set.
     */
    sitePluginPromiseExists(component: string): boolean {
        return !!this.sitePluginPromises[component];
    }

    /**
     * Get the promise for a plugin that is being initialised.
     *
     * @param component Component name.
     * @returns Plugin loaded promise.
     */
    sitePluginLoaded(component: string): Promise<void> | undefined {
        return this.sitePluginPromises[component];
    }

    /**
     * Wait for fetch plugins to be done.
     *
     * @returns Promise resolved when site plugins have been fetched.
     */
    async waitFetchPlugins(): Promise<void> {
        await this.fetchPluginsDeferred;
    }

    /**
     * Get a module hander instance, if present.
     *
     * @param modName Mod name without "mod_".
     * @returns Handler instance, undefined if not found.
     */
    getModuleHandlerInstance(modName: string): CoreSitePluginsModuleHandler | undefined {
        return this.moduleHandlerInstances[modName];
    }

    /**
     * Set a module hander instance.
     *
     * @param modName Mod name.
     * @param handler Handler instance.
     */
    setModuleHandlerInstance(modName: string, handler: CoreSitePluginsModuleHandler): void {
        this.moduleHandlerInstances[modName] = handler;
    }

}

export const CoreSitePlugins = makeSingleton(CoreSitePluginsProvider);

/**
 * Handler of a site plugin.
 */
export type CoreSitePluginsHandler = {
    plugin: CoreSitePluginsPlugin; // Site plugin data.
    handlerName: string; // Name of the handler.
    handlerSchema: CoreSitePluginsHandlerData; // Handler's data.
    initResult?: CoreSitePluginsContent | null; // Result of the init WS call (if any).
};

/**
 * Default args added to site plugins calls.
 */
export type CoreSitePluginsDefaultArgs = {
    userid?: number;
    appid: string;
    appversioncode: number;
    appversionname: string;
    applang: string;
    appcustomurlscheme: string;
    appisdesktop: boolean;
    appismobile: boolean;
    appiswide: boolean;
    appplatform: string;
};

/**
 * Params of tool_mobile_get_content WS.
 */
export type CoreSitePluginsGetContentWSParams = {
    component: string; // Component where the class is e.g. mod_assign.
    method: string; // Method to execute in class \$component\output\mobile.
    args?: { // Args for the method are optional.
        name: string; // Param name.
        value: string; // Param value.
    }[];
};

/**
 * Data returned by tool_mobile_get_content WS.
 */
export type CoreSitePluginsGetContentWSResponse = {
    templates: CoreSitePluginsContentTemplate[]; // Templates required by the generated content.
    javascript: string; // JavaScript code.
    otherdata: { // Other data that can be used or manipulated by the template via 2-way data-binding.
        name: string; // Field name.
        value: string; // Field value.
    }[];
    files: CoreWSExternalFile[];
    restrict: CoreSitePluginsContentRestrict; // Restrict this content to certain users or courses.
    disabled?: boolean; // Whether we consider this disabled or not.
};

/**
 * Template data returned by tool_mobile_get_content WS.
 */
export type CoreSitePluginsContentTemplate = {
    id: string; // ID of the template.
    html: string; // HTML code.
};

/**
 * Template data returned by tool_mobile_get_content WS.
 */
export type CoreSitePluginsContentRestrict = {
    users?: number[]; // List of allowed users.
    courses?: number[]; // List of allowed courses.
};

/**
 * Data returned by tool_mobile_get_content WS with calculated data.
 */
export type CoreSitePluginsContentParsed = Omit<CoreSitePluginsGetContentWSResponse, 'otherdata'> & {
    otherdata: Record<string, unknown>; // Other data that can be used or manipulated by the template via 2-way data-binding.
};

/**
 * Data returned by tool_mobile_get_content WS with calculated data.
 */
export type CoreSitePluginsContent = CoreSitePluginsContentParsed & {
    disabled?: boolean;
    jsResult?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * Data returned by tool_mobile_get_plugins_supporting_mobile WS.
 */
export type CoreSitePluginsGetPluginsSupportingMobileWSResponse = {
    plugins: CoreSitePluginsWSPlugin[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Plugin data returned by tool_mobile_get_plugins_supporting_mobile WS.
 */
export type CoreSitePluginsWSPlugin = {
    component: string; // The plugin component name.
    version: string; // The plugin version number.
    addon: string; // The Mobile addon (package) name.
    dependencies: string[]; // The list of Mobile addons this addon depends on.
    fileurl: string; // The addon package url for download or empty if it doesn't exist.
    filehash: string; // The addon package hash or empty if it doesn't exist.
    filesize: number; // The addon package size or empty if it doesn't exist.
    handlers?: string; // Handlers definition (JSON).
    lang?: string; // Language strings used by the handlers (JSON).
};

/**
 * Plugin data with some calculated data.
 */
export type CoreSitePluginsPlugin = CoreSitePluginsWSPlugin & {
    parsedHandlers?: Record<string, CoreSitePluginsHandlerData> | null;
    parsedLang?: Record<string, string[]> | null;
};

/**
 * Plugin handler data.
 */
export type CoreSitePluginsHandlerData = CoreSitePluginsInitHandlerData | CoreSitePluginsCourseOptionHandlerData |
CoreSitePluginsMainMenuHandlerData | CoreSitePluginsCourseModuleHandlerData | CoreSitePluginsCourseFormatHandlerData |
CoreSitePluginsUserHandlerData | CoreSitePluginsSettingsHandlerData | CoreSitePluginsMessageOutputHandlerData |
CoreSitePluginsBlockHandlerData | CoreSitePluginsMainMenuHomeHandlerData | CoreSitePluginsEnrolHandlerData;

/**
 * Plugin handler data common to all delegates.
 */
export type CoreSitePluginsHandlerCommonData = {
    delegate?: string;
    method?: string;
    init?: string;
    restricttocurrentuser?: boolean;
    restricttoenrolledcourses?: boolean;
    styles?: {
        url?: string;
        version?: number;
    };
    moodlecomponent?: string;
};

/**
 * Course option handler specific data.
 */
export type CoreSitePluginsCourseOptionHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        class?: string;
        icon?: string;
    };
    priority?: number;
    ismenuhandler?: boolean;
    ptrenabled?: boolean;
};

/**
 * Main menu handler specific data.
 */
export type CoreSitePluginsMainMenuHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        icon?: string;
        class?: string;
    };
    priority?: number;
    ptrenabled?: boolean;
    displayinline?: boolean;
};

/**
 * Course module handler specific data.
 */
export type CoreSitePluginsCourseModuleHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        icon?: string;
        class?: string;
    };
    method?: string;
    offlinefunctions?: Record<string, string[]>;
    downloadbutton?: boolean;
    isresource?: boolean;
    updatesnames?: string;
    displayopeninbrowser?: boolean;
    displaydescription?: boolean;
    displayrefresh?: boolean;
    displayprefetch?: boolean;
    displaysize?: boolean;
    displaygrades?: boolean;
    coursepagemethod?: string;
    ptrenabled?: boolean;
    supportedfeatures?: Record<string, unknown>;
    manualcompletionalwaysshown?: boolean;
    nolinkhandlers?: boolean;
    hascustomcmlistitem?: boolean;
};

/**
 * Course format handler specific data.
 */
export type CoreSitePluginsCourseFormatHandlerData = CoreSitePluginsHandlerCommonData & {
    canviewallsections?: boolean;
    displayenabledownload?: boolean;
    displaycourseindex?: boolean;
};

/**
 * User handler specific data.
 */
export type CoreSitePluginsUserHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        icon?: string;
        class?: string;
    };
    type?: CoreUserProfileHandlerType;
    priority?: number;
    ptrenabled?: boolean;
    displayinusermenu?: CoreSitePluginsDisplayInUserMenu;
    displayinline?: boolean;
};

/**
 * Options to configure whether to show a user profile handler in the user menu.
 */
export const enum CoreSitePluginsDisplayInUserMenu {
    NO = 'no', // Don't display in user menu, but it can be displayed in other places.
    YES = 'yes', // Display in user menu, but it can also be displayed in other places.
    ONLY = 'only', // Display only in user menu, not in other places.
};

/**
 * Settings handler specific data.
 */
export type CoreSitePluginsSettingsHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        icon?: string;
        class?: string;
    };
    priority?: number;
    ptrenabled?: boolean;
};

/**
 * Message output handler specific data.
 */
export type CoreSitePluginsMessageOutputHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        icon?: string;
    };
    priority?: number;
    ptrenabled?: boolean;
};

/**
 * Block handler specific data.
 */
export type CoreSitePluginsBlockHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        class?: string;
        type?: string;
    };
    fallback?: string;
};

/**
 * Enrol handler specific data.
 */
export type CoreSitePluginsEnrolHandlerData = CoreSitePluginsHandlerCommonData & {
    enrolmentAction?: CoreEnrolAction;
    infoIcons?: CoreEnrolInfoIcon[];
};

/**
 * Common handler data with some data from the init method.
 */
export type CoreSitePluginsInitHandlerData = CoreSitePluginsHandlerCommonData & {
    methodTemplates?: CoreSitePluginsContentTemplate[];
    methodJSResult?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    methodOtherdata?: Record<string, unknown>;
};

/**
 * Main menu home handler specific data.
 */
export type CoreSitePluginsMainMenuHomeHandlerData = CoreSitePluginsHandlerCommonData & {
    displaydata?: {
        title?: string;
        class?: string;
    };
    priority?: number;
    ptrenabled?: boolean;
};

/**
 * Event to update course content data for plugins using coursepagemethod.
 */
export type CoreSitePluginsUpdateCourseContentEvent = {
    cmId: number; // Module ID to update.
    alreadyFetched?: boolean; // Whether course data has already been fetched (no need to fetch it again).
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_SITE_PLUGINS_UPDATE_COURSE_CONTENT]: CoreSitePluginsUpdateCourseContentEvent;
    }

}
