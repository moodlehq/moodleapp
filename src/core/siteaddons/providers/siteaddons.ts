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
import { CoreAppProvider } from '../../../providers/app';
import { CoreLangProvider } from '../../../providers/lang';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite, CoreSiteWSPreSets } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreConfigConstants } from '../../../configconstants';

/**
 * Handler of a site addon.
 */
export interface CoreSiteAddonsHandler {
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

    /**
     * Result of executing the bootstrap JS.
     * @type {any}
     */
    bootstrapResult?: any;
}

export interface CoreSiteAddonsGetContentResult {
    /**
     * The content in HTML.
     * @type {string}
     */
    html: string;

    /**
     * The javascript for the content.
     * @type {string}
     */
    javascript: string;

    /**
     * The files for the content.
     * @type {any[]}
     */
    files?: any[];

    /**
     * Other data.
     * @type {any}
     */
    otherdata?: any;
}

/**
 * Service to provide functionalities regarding site addons.
 */
@Injectable()
export class CoreSiteAddonsProvider {
    protected ROOT_CACHE_KEY = 'CoreSiteAddons:';

    protected logger;
    protected siteAddons: {[name: string]: CoreSiteAddonsHandler} = {}; // Site addons registered.

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private langProvider: CoreLangProvider, private appProvider: CoreAppProvider, private platform: Platform) {
        this.logger = logger.getInstance('CoreUserProvider');
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
        return this.ROOT_CACHE_KEY + 'ws:' + method;
    }

    /**
     * Get a certain content for a site addon.
     *
     * @param {string} component Component where the class is. E.g. mod_assign.
     * @param {string} method Method to execute in the class.
     * @param {any} args The params for the method.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreSiteAddonsGetContentResult>} Promise resolved with the result.
     */
    getContent(component: string, method: string, args: any, preSets?: CoreSiteWSPreSets, siteId?: string)
            : Promise<CoreSiteAddonsGetContentResult> {
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

                return this.sitesProvider.getCurrentSite().read('tool_mobile_get_content', data, preSets);
            }).then((result) => {
                if (result.otherdata) {
                    try {
                        result.otherdata = JSON.parse(result.otherdata);
                    } catch (ex) {
                        // Ignore errors.
                    }
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
     * Get the unique name of a handler (addon + handler).
     *
     * @param {any} addon Data of the addon.
     * @param {string} handlerName Name of the handler inside the addon.
     * @return {string} Unique name.
     */
    getHandlerUniqueName(addon: any, handlerName: string): string {
        return addon.addon + '_' + handlerName;
    }

    /**
     * Get a site addon handler.
     *
     * @param {string} name Unique name of the handler.
     * @return {CoreSiteAddonsHandler} Handler.
     */
    getSiteAddonHandler(name: string): CoreSiteAddonsHandler {
        return this.siteAddons[name];
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
     * Load other data into args as determined by useOtherData list.
     * If useOtherData is undefined, it won't add any data.
     * If useOtherData is defined but empty (null, false or empty string) it will copy all the data from otherData to args.
     * If useOtherData is an array, it will only copy the properties whose names are in the array.
     *
     * @param {any} args The current args.
     * @param {any} otherData All the other data.
     * @param {any[]} useOtherData Names of the attributes to include.
     * @return {any} New args.
     */
    loadOtherDataInArgs(args: any, otherData: any, useOtherData: any[]): any {
        if (!args) {
            args = {};
        } else {
            args = this.utils.clone(args);
        }

        otherData = otherData || {};

        if (typeof useOtherData == 'undefined') {
            // No need to add other data, return args as they are.
            return args;
        } else if (!useOtherData) {
            // Use other data is defined but empty. Add all the data to args.
            for (const name in otherData) {
                args[name] = otherData[name];
            }
        } else {
            for (const i in useOtherData) {
                const name = useOtherData[i];
                args[name] = otherData[name];
            }
        }

        return args;
    }

    /**
     * Store a site addon handler.
     *
     * @param {string} name A unique name to identify the handler.
     * @param {CoreSiteAddonsHandler} handler Handler to set.
     */
    setSiteAddonHandler(name: string, handler: CoreSiteAddonsHandler): void {
        this.siteAddons[name] = handler;
    }
}
