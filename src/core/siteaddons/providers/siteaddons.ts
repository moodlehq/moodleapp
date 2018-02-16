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
import { CoreLangProvider } from '../../../providers/lang';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite, CoreSiteWSPreSets } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreConfigConstants } from '../../../configconstants';

/**
 * Handler of a site addon representing a module.
 */
export interface CoreSiteAddonsModuleHandler {
    /**
     * The site addon data.
     * @type {any}
     */
    addon: any;

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
}

/**
 * Service to provide functionalities regarding site addons.
 */
@Injectable()
export class CoreSiteAddonsProvider {
    protected ROOT_CACHE_KEY = 'CoreSiteAddons:';

    protected logger;
    protected moduleSiteAddons: {[modName: string]: CoreSiteAddonsModuleHandler} = {};

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private langProvider: CoreLangProvider) {
        this.logger = logger.getInstance('CoreUserProvider');
    }

    /**
     * Call a WS for a site addon.
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
        return this.ROOT_CACHE_KEY + method;
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
        return this.ROOT_CACHE_KEY + 'content:' + component + ':' + method + ':' + this.utils.sortAndStringify(args);
    }

    /**
     * Get the site addon handler for a certain module.
     *
     * @param {string} modName Name of the module.
     * @return {CoreSiteAddonsModuleHandler} Handler.
     */
    getModuleSiteAddonHandler(modName: string): CoreSiteAddonsModuleHandler {
        return this.moduleSiteAddons[modName];
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
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCallWS(method: string, data: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCallWSCacheKey(method, data));
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
     * Set the site addon handler for a certain module.
     *
     * @param {string} modName Name of the module.
     * @param {CoreSiteAddonsModuleHandler} handler Handler to set.
     */
    setModuleSiteAddonHandler(modName: string, handler: CoreSiteAddonsModuleHandler): void {
        this.moduleSiteAddons[modName] = handler;
    }
}
