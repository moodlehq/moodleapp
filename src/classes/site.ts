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

import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { SQLiteDB } from './sqlitedb';
import { CoreAppProvider } from '@providers/app';
import { CoreDbProvider } from '@providers/db';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreWSProvider, CoreWSPreSets, CoreWSFileUploadOptions, CoreWSAjaxPreSets } from '@providers/ws';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider, PromiseDefer } from '@providers/utils/utils';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../configconstants';
import { Md5 } from 'ts-md5/dist/md5';
import { InAppBrowserObject } from '@ionic-native/in-app-browser';

/**
 * PreSets accepted by the WS call.
 */
export interface CoreSiteWSPreSets {
    /**
     * Get the value from the cache if it's still valid.
     */
    getFromCache?: boolean;

    /**
     * Save the result to the cache.
     */
    saveToCache?: boolean;

    /**
     * Ignore cache expiration.
     */
    omitExpires?: boolean;

    /**
     * Use the cache when a request fails. Defaults to true.
     */
    emergencyCache?: boolean;

    /**
     * If true, the app won't call the WS. If the data isn't cached, the call will fail.
     */
    forceOffline?: boolean;

    /**
     * Extra key to add to the cache when storing this call, to identify the entry.
     */
    cacheKey?: string;

    /**
     * Whether it should use cache key to retrieve the cached data instead of the request params.
     */
    getCacheUsingCacheKey?: boolean;

    /**
     * Same as getCacheUsingCacheKey, but for emergency cache.
     */
    getEmergencyCacheUsingCacheKey?: boolean;

    /**
     * If true, the cache entry will be deleted if the WS call returns an exception.
     */
    deleteCacheIfWSError?: boolean;

    /**
     * Whether it should only be 1 entry for this cache key (all entries with same key will be deleted).
     */
    uniqueCacheKey?: boolean;

    /**
     * Whether to filter WS response (moodlewssettingfilter). Defaults to true.
     */
    filter?: boolean;

    /**
     * Whether to rewrite URLs (moodlewssettingfileurl). Defaults to true.
     */
    rewriteurls?: boolean;

    /**
     * Defaults to true. Set to false when the expected response is null.
     */
    responseExpected?: boolean;

    /**
     * Defaults to 'object'. Use it when you expect a type that's not an object|array.
     */
    typeExpected?: string;

    /**
     * Wehther a pending request in the queue matching the same function and arguments can be reused instead of adding
     * a new request to the queue. Defaults to true for read requests.
     */
    reusePending?: boolean;

    /**
     * Whether the request will be be sent immediately as a single request. Defaults to false.
     */
    skipQueue?: boolean;

    /**
     * Cache the response if it returns an errorcode present in this list.
     */
    cacheErrors?: string[];

    /**
     * Update frequency. This value determines how often the cached data will be updated. Possible values:
     * CoreSite.FREQUENCY_USUALLY, CoreSite.FREQUENCY_OFTEN, CoreSite.FREQUENCY_SOMETIMES, CoreSite.FREQUENCY_RARELY.
     * Defaults to CoreSite.FREQUENCY_USUALLY.
     */
    updateFrequency?: number;
}

/**
 * Response of checking local_mobile status.
 */
export interface LocalMobileResponse {
    /**
     * Code to identify the authentication method to use.
     */
    code: number;

    /**
     * Name of the service to use.
     */
    service?: string;

    /**
     * Code of the warning message.
     */
    warning?: string;

    /**
     * Whether core SSO is supported.
     */
    coreSupported?: boolean;
}

/**
 * Info of a request waiting in the queue.
 */
interface RequestQueueItem {
    cacheId: string;
    method: string;
    data: any;
    preSets: CoreSiteWSPreSets;
    wsPreSets: CoreWSPreSets;
    deferred: PromiseDefer;
}

/**
 * Class that represents a site (combination of site + user).
 * It will have all the site data and provide utility functions regarding a site.
 * To add tables to the site's database, please use CoreSitesProvider.createTablesFromSchema. This will make sure that
 * the tables are created in all the sites, not just the current one.
 */
export class CoreSite {
    static REQUEST_QUEUE_DELAY = 50; // Maximum number of miliseconds to wait before processing the queue.
    static REQUEST_QUEUE_LIMIT = 10; // Maximum number of requests allowed in the queue.
    static REQUEST_QUEUE_FORCE_WS = false; // Use "tool_mobile_call_external_functions" even for calling a single function.

    // Constants for cache update frequency.
    static FREQUENCY_USUALLY = 0;
    static FREQUENCY_OFTEN = 1;
    static FREQUENCY_SOMETIMES = 2;
    static FREQUENCY_RARELY = 3;

    // List of injected services. This class isn't injectable, so it cannot use DI.
    protected appProvider: CoreAppProvider;
    protected dbProvider: CoreDbProvider;
    protected domUtils: CoreDomUtilsProvider;
    protected eventsProvider: CoreEventsProvider;
    protected fileProvider: CoreFileProvider;
    protected http: HttpClient;
    protected textUtils: CoreTextUtilsProvider;
    protected timeUtils: CoreTimeUtilsProvider;
    protected translate: TranslateService;
    protected utils: CoreUtilsProvider;
    protected urlUtils: CoreUrlUtilsProvider;
    protected wsProvider: CoreWSProvider;

    // Variables for the database.
    static WS_CACHE_TABLE = 'wscache';
    static CONFIG_TABLE = 'core_site_config';

    // Versions of Moodle releases.
    protected MOODLE_RELEASES = {
        3.1: 2016052300,
        3.2: 2016120500,
        3.3: 2017051503,
        3.4: 2017111300,
        3.5: 2018051700,
        3.6: 2018120300,
        3.7: 2019052000
    };
    static MINIMUM_MOODLE_VERSION = '3.1';

    // Possible cache update frequencies.
    protected UPDATE_FREQUENCIES = [
        CoreConfigConstants.cache_update_frequency_usually || 420000,
        CoreConfigConstants.cache_update_frequency_often || 1200000,
        CoreConfigConstants.cache_update_frequency_sometimes || 3600000,
        CoreConfigConstants.cache_update_frequency_rarely || 43200000
    ];

    // Rest of variables.
    protected logger;
    protected db: SQLiteDB;
    protected cleanUnicode = false;
    protected lastAutoLogin = 0;
    protected offlineDisabled = false;
    protected ongoingRequests: { [cacheId: string]: Promise<any> } = {};
    protected requestQueue: RequestQueueItem[] = [];
    protected requestQueueTimeout = null;
    protected tokenPluginFileWorks: boolean;
    protected tokenPluginFileWorksPromise: Promise<boolean>;

    /**
     * Create a site.
     *
     * @param injector Angular injector to prevent having to pass all the required services.
     * @param id Site ID.
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param info Site info.
     * @param privateToken Private token.
     * @param config Site public config.
     * @param loggedOut Whether user is logged out.
     */
    constructor(injector: Injector, public id: string, public siteUrl: string, public token?: string, public infos?: any,
            public privateToken?: string, public config?: any, public loggedOut?: boolean) {
        // Inject the required services.
        const logger = injector.get(CoreLoggerProvider);
        this.appProvider = injector.get(CoreAppProvider);
        this.dbProvider = injector.get(CoreDbProvider);
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.eventsProvider = injector.get(CoreEventsProvider);
        this.fileProvider = injector.get(CoreFileProvider);
        this.http = injector.get(HttpClient);
        this.textUtils = injector.get(CoreTextUtilsProvider);
        this.timeUtils = injector.get(CoreTimeUtilsProvider);
        this.translate = injector.get(TranslateService);
        this.utils = injector.get(CoreUtilsProvider);
        this.urlUtils = injector.get(CoreUrlUtilsProvider);
        this.wsProvider = injector.get(CoreWSProvider);

        this.logger = logger.getInstance('CoreWSProvider');
        this.setInfo(infos);
        this.calculateOfflineDisabled();

        if (this.id) {
            this.initDB();
        }
    }

    /**
     * Initialize the database.
     */
    initDB(): void {
        this.db = this.dbProvider.getDB('Site-' + this.id);
    }

    /**
     * Get site ID.
     *
     * @return Site ID.
     */
    getId(): string {
        return this.id;
    }

    /**
     * Get site URL.
     *
     * @return Site URL.
     */
    getURL(): string {
        return this.siteUrl;
    }

    /**
     * Get site token.
     *
     * @return Site token.
     */
    getToken(): string {
        return this.token;
    }

    /**
     * Get site info.
     *
     * @return Site info.
     */
    getInfo(): any {
        return this.infos;
    }

    /**
     * Get site private token.
     *
     * @return Site private token.
     */
    getPrivateToken(): string {
        return this.privateToken;
    }

    /**
     * Get site DB.
     *
     * @return Site DB.
     */
    getDb(): SQLiteDB {
        return this.db;
    }

    /**
     * Get site user's ID.
     *
     * @return User's ID.
     */
    getUserId(): number {
        if (typeof this.infos != 'undefined' && typeof this.infos.userid != 'undefined') {
            return this.infos.userid;
        }
    }

    /**
     * Get site Course ID for frontpage course. If not declared it will return 1 as default.
     *
     * @return Site Home ID.
     */
    getSiteHomeId(): number {
        return this.infos && this.infos.siteid || 1;
    }

    /**
     * Get site name.
     *
     * @return Site name.
     */
    getSiteName(): string {
        if (CoreConfigConstants.sitename) {
            // Overridden by config.
            return CoreConfigConstants.sitename;
        } else {
            return this.infos && this.infos.sitename || '';
        }
    }

    /**
     * Set site ID.
     *
     * @param New ID.
     */
    setId(id: string): void {
        this.id = id;
        this.initDB();
    }

    /**
     * Set site token.
     *
     * @param New token.
     */
    setToken(token: string): void {
        this.token = token;
    }

    /**
     * Set site private token.
     *
     * @param privateToken New private token.
     */
    setPrivateToken(privateToken: string): void {
        this.privateToken = privateToken;
    }

    /**
     * Check if user logged out from the site and needs to authenticate again.
     *
     * @return Whether is logged out.
     */
    isLoggedOut(): boolean {
        return !!this.loggedOut;
    }

    /**
     * Set site info.
     *
     * @param New info.
     */
    setInfo(infos: any): void {
        this.infos = infos;

        // Index function by name to speed up wsAvailable method.
        if (infos && infos.functions) {
            infos.functionsByName = {};
            infos.functions.forEach((func) => {
                infos.functionsByName[func.name] = func;
            });
        }
    }

    /**
     * Set site config.
     *
     * @param Config.
     */
    setConfig(config: any): void {
        if (config) {
            config.tool_mobile_disabledfeatures = this.textUtils.treatDisabledFeatures(config.tool_mobile_disabledfeatures);
        }

        this.config = config;
        this.calculateOfflineDisabled();
    }

    /**
     * Set site logged out.
     *
     * @param loggedOut True if logged out and needs to authenticate again, false otherwise.
     */
    setLoggedOut(loggedOut: boolean): void {
        this.loggedOut = !!loggedOut;
    }

    /**
     * Can the user access their private files?
     *
     * @return Whether can access my files.
     */
    canAccessMyFiles(): boolean {
        const infos = this.getInfo();

        return infos && (typeof infos.usercanmanageownfiles === 'undefined' || infos.usercanmanageownfiles);
    }

    /**
     * Can the user download files?
     *
     * @return Whether can download files.
     */
    canDownloadFiles(): boolean {
        const infos = this.getInfo();

        return infos && infos.downloadfiles;
    }

    /**
     * Can the user use an advanced feature?
     *
     * @param feature The name of the feature.
     * @param whenUndefined The value to return when the parameter is undefined.
     * @return Whether can use advanced feature.
     */
    canUseAdvancedFeature(feature: string, whenUndefined: boolean = true): boolean {
        const infos = this.getInfo();
        let canUse = true;

        if (typeof infos.advancedfeatures === 'undefined') {
            canUse = whenUndefined;
        } else {
            for (const i in infos.advancedfeatures) {
                const item = infos.advancedfeatures[i];
                if (item.name === feature && parseInt(item.value, 10) === 0) {
                    canUse = false;
                }
            }

        }

        return canUse;
    }

    /**
     * Can the user upload files?
     *
     * @return Whether can upload files.
     */
    canUploadFiles(): boolean {
        const infos = this.getInfo();

        return infos && infos.uploadfiles;
    }

    /**
     * Fetch site info from the Moodle site.
     *
     * @return A promise to be resolved when the site info is retrieved.
     */
    fetchSiteInfo(): Promise<any> {
        // The get_site_info WS call won't be cached.
        const preSets = {
            getFromCache: false,
            saveToCache: false,
            skipQueue: true
        };

        // Reset clean Unicode to check if it's supported again.
        this.cleanUnicode = false;

        return this.read('core_webservice_get_site_info', {}, preSets);
    }

    /**
     * Read some data from the Moodle site using WS. Requests are cached by default.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @return Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    read(method: string, data: any, preSets?: CoreSiteWSPreSets): Promise<any> {
        preSets = preSets || {};
        if (typeof preSets.getFromCache == 'undefined') {
            preSets.getFromCache = true;
        }
        if (typeof preSets.saveToCache == 'undefined') {
            preSets.saveToCache = true;
        }
        if (typeof preSets.reusePending == 'undefined') {
            preSets.reusePending = true;
        }

        return this.request(method, data, preSets);
    }

    /**
     * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @return Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    write(method: string, data: any, preSets?: CoreSiteWSPreSets): Promise<any> {
        preSets = preSets || {};
        if (typeof preSets.getFromCache == 'undefined') {
            preSets.getFromCache = false;
        }
        if (typeof preSets.saveToCache == 'undefined') {
            preSets.saveToCache = false;
        }
        if (typeof preSets.emergencyCache == 'undefined') {
            preSets.emergencyCache = false;
        }

        return this.request(method, data, preSets);
    }

    /**
     * WS request to the site.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @param retrying True if we're retrying the call for some reason. This is to prevent infinite loops.
     * @return Promise resolved with the response, rejected with CoreWSError if it fails.
     * @description
     *
     * Sends a webservice request to the site. This method will automatically add the
     * required parameters and pass it on to the low level API in CoreWSProvider.call().
     *
     * Caching is also implemented, when enabled this method will returned a cached version of the request if the
     * data hasn't expired.
     *
     * This method is smart which means that it will try to map the method to a compatibility one if need be, usually this
     * means that it will fallback on the 'local_mobile_' prefixed function if it is available and the non-prefixed is not.
     */
    request(method: string, data: any, preSets: CoreSiteWSPreSets, retrying?: boolean): Promise<any> {
        const initialToken = this.token;
        data = data || {};

        if (!this.appProvider.isOnline() && this.offlineDisabled) {
            return Promise.reject(this.wsProvider.createFakeWSError('core.errorofflinedisabled', true));
        }

        // Check if the method is available, use a prefixed version if possible.
        // We ignore this check when we do not have the site info, as the list of functions is not loaded yet.
        if (this.getInfo() && !this.wsAvailable(method, false)) {
            const compatibilityMethod = CoreConstants.WS_PREFIX + method;
            if (this.wsAvailable(compatibilityMethod, false)) {
                this.logger.info(`Using compatibility WS method '${compatibilityMethod}'`);
                method = compatibilityMethod;
            } else {
                this.logger.error(`WS function '${method}' is not available, even in compatibility mode.`);

                return Promise.reject(this.utils.createFakeWSError('core.wsfunctionnotavailable', true));
            }
        }

        const wsPreSets: CoreWSPreSets = {
            wsToken: this.token,
            siteUrl: this.siteUrl,
            cleanUnicode: this.cleanUnicode,
            typeExpected: preSets.typeExpected,
            responseExpected: preSets.responseExpected
        };

        if (wsPreSets.cleanUnicode && this.textUtils.hasUnicodeData(data)) {
            // Data will be cleaned, notify the user.
            this.domUtils.showToast('core.unicodenotsupported', true, 3000);
        } else {
            // No need to clean data in this call.
            wsPreSets.cleanUnicode = false;
        }

        if (this.offlineDisabled) {
            // Offline is disabled, don't use cache.
            preSets.getFromCache = false;
            preSets.saveToCache = false;
            preSets.emergencyCache = false;
        }

        // Enable text filtering by default.
        data.moodlewssettingfilter = preSets.filter === false ? false : true;
        data.moodlewssettingfileurl = preSets.rewriteurls === false ? false : true;

        const originalData = data;

        // Convert arguments to strings before starting the cache process.
        data = this.wsProvider.convertValuesToString(data, wsPreSets.cleanUnicode);
        if (data == null) {
            // Empty cleaned text found.
            return Promise.reject(this.utils.createFakeWSError('core.unicodenotsupportedcleanerror', true));
        }

        const cacheId = this.getCacheId(method, data);

        // Check for an ongoing identical request if we're not ignoring cache.
        if (preSets.getFromCache && this.ongoingRequests[cacheId]) {
            return this.ongoingRequests[cacheId].then((response) => {
                // Clone the data, this may prevent errors if in the callback the object is modified.
                return this.utils.clone(response);
            });
        }

        const promise = this.getFromCache(method, data, preSets, false, originalData).catch(() => {
            if (preSets.forceOffline) {
                // Don't call the WS, just fail.
                return Promise.reject(this.wsProvider.createFakeWSError('core.cannotconnect', true,
                    {$a: CoreSite.MINIMUM_MOODLE_VERSION}));
            }

            // Call the WS.
            return this.callOrEnqueueRequest(method, data, preSets, wsPreSets).then((response) => {
                if (preSets.saveToCache) {
                    this.saveToCache(method, data, response, preSets);
                }

                return response;
            }).catch((error) => {
                if (error.errorcode == 'invalidtoken' ||
                    (error.errorcode == 'accessexception' && error.message.indexOf('Invalid token - token expired') > -1)) {
                    if (initialToken !== this.token && !retrying) {
                        // Token has changed, retry with the new token.
                        preSets.getFromCache = false; // Don't check cache now. Also, it will skip ongoingRequests.

                        return this.request(method, data, preSets, true);
                    } else if (this.appProvider.isSSOAuthenticationOngoing()) {
                        // There's an SSO authentication ongoing, wait for it to finish and try again.
                        return this.appProvider.waitForSSOAuthentication().then(() => {
                            return this.request(method, data, preSets, true);
                        });
                    }

                    // Session expired, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {}, this.id);
                    // Change error message. Try to get data from cache, the event will handle the error.
                    error.message = this.translate.instant('core.lostconnection');
                } else if (error.errorcode === 'userdeleted') {
                    // User deleted, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.USER_DELETED, { params: data }, this.id);
                    error.message = this.translate.instant('core.userdeleted');

                    return Promise.reject(error);
                } else if (error.errorcode === 'forcepasswordchangenotice') {
                    // Password Change Forced, trigger event. Try to get data from cache, the event will handle the error.
                    this.eventsProvider.trigger(CoreEventsProvider.PASSWORD_CHANGE_FORCED, {}, this.id);
                    error.message = this.translate.instant('core.forcepasswordchangenotice');

                } else if (error.errorcode === 'usernotfullysetup') {
                    // User not fully setup, trigger event. Try to get data from cache, the event will handle the error.
                    this.eventsProvider.trigger(CoreEventsProvider.USER_NOT_FULLY_SETUP, {}, this.id);
                    error.message = this.translate.instant('core.usernotfullysetup');

                } else if (error.errorcode === 'sitepolicynotagreed') {
                    // Site policy not agreed, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.SITE_POLICY_NOT_AGREED, {}, this.id);
                    error.message = this.translate.instant('core.login.sitepolicynotagreederror');

                    return Promise.reject(error);
                } else if (error.errorcode === 'dmlwriteexception' && this.textUtils.hasUnicodeData(data)) {
                    if (!this.cleanUnicode) {
                        // Try again cleaning unicode.
                        this.cleanUnicode = true;

                        return this.request(method, data, preSets);
                    }
                    // This should not happen.
                    error.message = this.translate.instant('core.unicodenotsupported');

                    return Promise.reject(error);
                } else if (error.exception === 'required_capability_exception' || error.errorcode === 'nopermission' ||
                        error.errorcode === 'notingroup') {
                    // Translate error messages with missing strings.
                    if (error.message === 'error/nopermission') {
                        error.message = this.translate.instant('core.nopermissionerror');
                    } else if (error.message === 'error/notingroup') {
                        error.message = this.translate.instant('core.notingroup');
                    }

                    // Save the error instead of deleting the cache entry so the same content is displayed in offline.
                    this.saveToCache(method, data, error, preSets);

                    return Promise.reject(error);
                } else if (preSets.cacheErrors && preSets.cacheErrors.indexOf(error.errorcode) != -1) {
                    // Save the error instead of deleting the cache entry so the same content is displayed in offline.
                    this.saveToCache(method, data, error, preSets);

                    return Promise.reject(error);
                } else if (typeof preSets.emergencyCache !== 'undefined' && !preSets.emergencyCache) {
                    this.logger.debug(`WS call '${method}' failed. Emergency cache is forbidden, rejecting.`);

                    return Promise.reject(error);
                }

                if (preSets.deleteCacheIfWSError && this.utils.isWebServiceError(error)) {
                    // Delete the cache entry and return the entry. Don't block the user with the delete.
                    this.deleteFromCache(method, data, preSets).catch(() => {
                        // Ignore errors.
                    });

                    return Promise.reject(error);
                }

                this.logger.debug(`WS call '${method}' failed. Trying to use the emergency cache.`);
                preSets.omitExpires = true;
                preSets.getFromCache = true;

                return this.getFromCache(method, data, preSets, true, originalData).catch(() => {
                    return Promise.reject(error);
                });
            });
        }).then((response) => {
            // Check if the response is an error, this happens if the error was stored in the cache.
            if (response && (typeof response.exception != 'undefined' || typeof response.errorcode != 'undefined')) {
                return Promise.reject(response);
            }

            return response;
        });

        this.ongoingRequests[cacheId] = promise;

        // Clear ongoing request after setting the promise (just in case it's already resolved).
        return promise.finally(() => {
            // Make sure we don't clear the promise of a newer request that ignores the cache.
            if (this.ongoingRequests[cacheId] === promise) {
                delete this.ongoingRequests[cacheId];
            }
        }).then((response) => {
            // We pass back a clone of the original object, this may prevent errors if in the callback the object is modified.
            return this.utils.clone(response);
        });
    }

    /**
     * Adds a request to the queue or calls it immediately when not using the queue.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options related to the site.
     * @param wsPreSets Extra options related to the WS call.
     * @return Promise resolved with the response when the WS is called.
     */
    protected callOrEnqueueRequest(method: string, data: any, preSets: CoreSiteWSPreSets, wsPreSets: CoreWSPreSets): Promise<any> {
        if (preSets.skipQueue || !this.wsAvailable('tool_mobile_call_external_functions')) {
            return this.wsProvider.call(method, data, wsPreSets);
        }

        const cacheId = this.getCacheId(method, data);

        // Check if there is an identical request waiting in the queue (read requests only by default).
        if (preSets.reusePending) {
            const request = this.requestQueue.find((request) => request.cacheId == cacheId);
            if (request) {
                return request.deferred.promise;
            }
        }

        const request: RequestQueueItem = {
            cacheId,
            method,
            data,
            preSets,
            wsPreSets,
            deferred: {}
        };

        request.deferred.promise = new Promise((resolve, reject): void => {
            request.deferred.resolve = resolve;
            request.deferred.reject = reject;
        });

        return this.enqueueRequest(request);
    }

    /**
     * Adds a request to the queue.
     *
     * @param request The request to enqueue.
     * @return Promise resolved with the response when the WS is called.
     */
    protected enqueueRequest(request: RequestQueueItem): Promise<any> {

        this.requestQueue.push(request);

        if (this.requestQueue.length >= CoreSite.REQUEST_QUEUE_LIMIT) {
            this.processRequestQueue();
        } else if (!this.requestQueueTimeout) {
            this.requestQueueTimeout = setTimeout(this.processRequestQueue.bind(this), CoreSite.REQUEST_QUEUE_DELAY);
        }

        return request.deferred.promise;
    }

    /**
     * Call the enqueued web service requests.
     */
    protected processRequestQueue(): void {
        this.logger.debug(`Processing request queue (${this.requestQueue.length} requests)`);

        // Clear timeout if set.
        if (this.requestQueueTimeout) {
            clearTimeout(this.requestQueueTimeout);
            this.requestQueueTimeout = null;
        }

        // Extract all requests from the queue.
        const requests = this.requestQueue;
        this.requestQueue = [];

        if (requests.length == 1 && !CoreSite.REQUEST_QUEUE_FORCE_WS) {
            // Only one request, do a regular web service call.
            this.wsProvider.call(requests[0].method, requests[0].data, requests[0].wsPreSets).then((data) => {
                requests[0].deferred.resolve(data);
            }).catch((error) => {
                requests[0].deferred.reject(error);
            });

            return;
        }

        const data = {
            requests: requests.map((request) => {
                const args = {};
                const settings = {};

                // Separate WS settings from function arguments.
                Object.keys(request.data).forEach((key) => {
                    let value = request.data[key];
                    const match = /^moodlews(setting.*)$/.exec(key);
                    if (match) {
                        if (match[1] == 'settingfilter' || match[1] == 'settingfileurl') {
                            // Undo special treatment of these settings in CoreWSProvider.convertValuesToString.
                            value = (value == 'true' ? '1' : '0');
                        }
                        settings[match[1]] = value;
                    } else {
                        args[key] = value;
                    }
                });

                return {
                    function: request.method,
                    arguments: JSON.stringify(args),
                    ...settings
                };
            })
        };

        const wsPresets: CoreWSPreSets = {
            siteUrl: this.siteUrl,
            wsToken: this.token,
        };

        this.wsProvider.call('tool_mobile_call_external_functions', data, wsPresets).then((data) => {
            if (!data || !data.responses) {
                return Promise.reject(null);
            }

            requests.forEach((request, i) => {
                const response = data.responses[i];

                if (!response) {
                    // Request not executed, enqueue again.
                    this.enqueueRequest(request);
                } else if (response.error) {
                    request.deferred.reject(this.textUtils.parseJSON(response.exception));
                } else {
                    let responseData = this.textUtils.parseJSON(response.data);
                    // Match the behaviour of CoreWSProvider.call when no response is expected.
                    const responseExpected = typeof wsPresets.responseExpected == 'undefined' || wsPresets.responseExpected;
                    if (!responseExpected && (responseData == null || responseData === '')) {
                        responseData = {};
                    }
                    request.deferred.resolve(responseData);
                }
            });

        }).catch((error) => {
            // Error not specific to a single request, reject all promises.
            requests.forEach((request) => {
                request.deferred.reject(error);
            });
        });
    }

    /**
     * Check if a WS is available in this site.
     *
     * @param method WS name.
     * @param checkPrefix When true also checks with the compatibility prefix.
     * @return Whether the WS is available.
     */
    wsAvailable(method: string, checkPrefix: boolean = true): boolean {
        if (typeof this.infos == 'undefined') {
            return false;
        }

        if (this.infos.functionsByName[method]) {
            return true;
        }

        // Let's try again with the compatibility prefix.
        if (checkPrefix) {
            return this.wsAvailable(CoreConstants.WS_PREFIX + method, false);
        }

        return false;
    }

    /**
     * Get cache ID.
     *
     * @param method The WebService method.
     * @param data Arguments to pass to the method.
     * @return Cache ID.
     */
    protected getCacheId(method: string, data: any): string {
        return <string> Md5.hashAsciiStr(method + ':' + this.utils.sortAndStringify(data));
    }

    /**
     * Get the cache ID used in Ionic 1 version of the app.
     *
     * @param method The WebService method.
     * @param data Arguments to pass to the method.
     * @return Cache ID.
     */
    protected getCacheOldId(method: string, data: any): string {
        return <string> Md5.hashAsciiStr(method + ':' +  JSON.stringify(data));
    }

    /**
     * Get a WS response from cache.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @param emergency Whether it's an "emergency" cache call (WS call failed).
     * @param originalData Arguments to pass to the method before being converted to strings.
     * @return Promise resolved with the WS response.
     */
    protected getFromCache(method: string, data: any, preSets: CoreSiteWSPreSets, emergency?: boolean, originalData?: any)
            : Promise<any> {
        if (!this.db || !preSets.getFromCache) {
            return Promise.reject(null);
        }

        const id = this.getCacheId(method, data);
        let promise;

        if (preSets.getCacheUsingCacheKey || (emergency && preSets.getEmergencyCacheUsingCacheKey)) {
            promise = this.db.getRecords(CoreSite.WS_CACHE_TABLE, { key: preSets.cacheKey }).then((entries) => {
                if (!entries.length) {
                    // Cache key not found, get by params sent.
                    return this.db.getRecord(CoreSite.WS_CACHE_TABLE, { id: id });
                } else if (entries.length > 1) {
                    // More than one entry found. Search the one with same ID as this call.
                    for (let i = 0, len = entries.length; i < len; i++) {
                        const entry = entries[i];
                        if (entry.id == id) {
                            return entry;
                        }
                    }
                }

                return entries[0];
            });
        } else {
            promise = this.db.getRecord(CoreSite.WS_CACHE_TABLE, { id: id }).catch(() => {
                // Entry not found, try to get it using the old ID.
                const oldId = this.getCacheOldId(method, originalData || {});

                return this.db.getRecord(CoreSite.WS_CACHE_TABLE, { id: oldId }).then((entry) => {
                    // Update the entry ID to use the new one.
                    this.db.updateRecords(CoreSite.WS_CACHE_TABLE, {id: id}, {id: oldId});

                    return entry;
                });
            });
        }

        return promise.then((entry) => {
            const now = Date.now();
            let expirationTime;

            preSets.omitExpires = preSets.omitExpires || preSets.forceOffline || !this.appProvider.isOnline();

            if (!preSets.omitExpires) {
                expirationTime = entry.expirationTime + this.getExpirationDelay(preSets.updateFrequency);

                if (now > expirationTime) {
                    this.logger.debug('Cached element found, but it is expired');

                    return Promise.reject(null);
                }
            }

            if (typeof entry != 'undefined' && typeof entry.data != 'undefined') {
                if (!expirationTime) {
                    this.logger.info(`Cached element found, id: ${id}. Expiration time ignored.`);
                } else {
                    const expires = (expirationTime - now) / 1000;
                    this.logger.info(`Cached element found, id: ${id}. Expires in expires in ${expires} seconds`);
                }

                return this.textUtils.parseJSON(entry.data, {});
            }

            return Promise.reject(null);
        });
    }

    /**
     * Save a WS response to cache.
     *
     * @param method The WebService method.
     * @param data Arguments to pass to the method.
     * @param response The WS response.
     * @param preSets Extra options.
     * @return Promise resolved when the response is saved.
     */
    protected saveToCache(method: string, data: any, response: any, preSets: CoreSiteWSPreSets): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }

        let promise;

        if (preSets.uniqueCacheKey) {
            // Cache key must be unique, delete all entries with same cache key.
            promise = this.deleteFromCache(method, data, preSets, true).catch(() => {
                // Ignore errors.
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Since 3.7, the expiration time contains the time the entry is modified instead of the expiration time.
            // We decided to reuse this field to prevent modifying the database table.
            const id = this.getCacheId(method, data),
                entry: any = {
                    id: id,
                    data: JSON.stringify(response),
                    expirationTime: Date.now()
                };

            if (preSets.cacheKey) {
                entry.key = preSets.cacheKey;
            }

            return this.db.insertRecord(CoreSite.WS_CACHE_TABLE, entry);
        });
    }

    /**
     * Delete a WS cache entry or entries.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @param allCacheKey True to delete all entries with the cache key, false to delete only by ID.
     * @return Promise resolved when the entries are deleted.
     */
    protected deleteFromCache(method: string, data: any, preSets: CoreSiteWSPreSets, allCacheKey?: boolean): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }

        const id = this.getCacheId(method, data);

        if (allCacheKey) {
            return this.db.deleteRecords(CoreSite.WS_CACHE_TABLE, { key: preSets.cacheKey });
        }

        return this.db.deleteRecords(CoreSite.WS_CACHE_TABLE, { id: id });
    }

    /*
     * Uploads a file using Cordova File API.
     *
     * @param filePath File path.
     * @param options File upload options.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when uploaded.
     */
    uploadFile(filePath: string, options: CoreWSFileUploadOptions, onProgress?: (event: ProgressEvent) => any): Promise<any> {
        if (!options.fileArea) {
            options.fileArea = 'draft';
        }

        return this.wsProvider.uploadFile(filePath, options, {
            siteUrl: this.siteUrl,
            wsToken: this.token
        }, onProgress);
    }

    /**
     * Invalidates all the cache entries.
     *
     * @return Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCache(): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }

        this.logger.debug('Invalidate all the cache for site: ' + this.id);

        return this.db.updateRecords(CoreSite.WS_CACHE_TABLE, { expirationTime: 0 }).finally(() => {
            this.eventsProvider.trigger(CoreEventsProvider.WS_CACHE_INVALIDATED, {}, this.getId());
        });
    }

    /**
     * Invalidates all the cache entries with a certain key.
     *
     * @param key Key to search.
     * @return Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCacheForKey(key: string): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }
        if (!key) {
            return Promise.resolve();
        }

        this.logger.debug('Invalidate cache for key: ' + key);

        return this.db.updateRecords(CoreSite.WS_CACHE_TABLE, { expirationTime: 0 }, { key: key });
    }

    /**
     * Invalidates all the cache entries in an array of keys.
     *
     * @param keys Keys to search.
     * @return Promise resolved when the cache entries are invalidated.
     */
    invalidateMultipleWsCacheForKey(keys: string[]): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }
        if (!keys || !keys.length) {
            return Promise.resolve();
        }

        const promises = [];

        this.logger.debug('Invalidating multiple cache keys');
        keys.forEach((key) => {
            promises.push(this.invalidateWsCacheForKey(key));
        });

        return Promise.all(promises);
    }

    /**
     * Invalidates all the cache entries whose key starts with a certain value.
     *
     * @param key Key to search.
     * @return Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCacheForKeyStartingWith(key: string): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }
        if (!key) {
            return Promise.resolve();
        }

        this.logger.debug('Invalidate cache for key starting with: ' + key);

        const sql = 'UPDATE ' + CoreSite.WS_CACHE_TABLE + ' SET expirationTime=0 WHERE key LIKE ?';

        return this.db.execute(sql, [key + '%']);
    }

    /**
     * Check if tokenpluginfile can be used, and fix the URL afterwards.
     *
     * @param url The url to be fixed.
     * @return Promise resolved with the fixed URL.
     */
    checkAndFixPluginfileURL(url: string): Promise<string> {
        return this.checkTokenPluginFile(url).then(() => {
            return this.fixPluginfileURL(url);
        });
    }

    /**
     * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
     * Uses CoreUtilsProvider.fixPluginfileURL, passing site's token.
     *
     * @param url The url to be fixed.
     * @return Fixed URL.
     */
    fixPluginfileURL(url: string): string {
        const accessKey = this.tokenPluginFileWorks || typeof this.tokenPluginFileWorks == 'undefined' ?
                this.infos && this.infos.userprivateaccesskey : undefined;

        return this.urlUtils.fixPluginfileURL(url, this.token, this.siteUrl, accessKey);
    }

    /**
     * Deletes site's DB.
     *
     * @return Promise to be resolved when the DB is deleted.
     */
    deleteDB(): Promise<any> {
        return this.dbProvider.deleteDB('Site-' + this.id);
    }

    /**
     * Deletes site's folder.
     *
     * @return Promise to be resolved when the DB is deleted.
     */
    deleteFolder(): Promise<any> {
        if (this.fileProvider.isAvailable()) {
            const siteFolder = this.fileProvider.getSiteFolder(this.id);

            return this.fileProvider.removeDir(siteFolder).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Get space usage of the site.
     *
     * @return Promise resolved with the site space usage (size).
     */
    getSpaceUsage(): Promise<number> {
        if (this.fileProvider.isAvailable()) {
            const siteFolderPath = this.fileProvider.getSiteFolder(this.id);

            return this.fileProvider.getDirectorySize(siteFolderPath).catch(() => {
                return 0;
            });
        } else {
            return Promise.resolve(0);
        }
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * @param page Docs page to go to.
     * @return Promise resolved with the Moodle docs URL.
     */
    getDocsUrl(page?: string): Promise<string> {
        const release = this.infos.release ? this.infos.release : undefined;

        return this.urlUtils.getDocsUrl(release, page);
    }

    /**
     * Returns a url to link an specific page on the site.
     *
     * @param path Path of the url to go to.
     * @param params Object with the params to add.
     * @param anchor Anchor text if needed.
     * @return URL with params.
     */
    createSiteUrl(path: string, params?: {[key: string]: any}, anchor?: string): string {
        return this.urlUtils.addParamsToUrl(this.siteUrl + path, params, anchor);
    }

    /**
     * Check if the local_mobile plugin is installed in the Moodle site.
     *
     * @param retrying True if we're retrying the check.
     * @return Promise resolved when the check is done.
     */
    checkLocalMobilePlugin(retrying?: boolean): Promise<LocalMobileResponse> {
        const checkUrl = this.siteUrl + '/local/mobile/check.php',
            service = CoreConfigConstants.wsextservice;

        if (!service) {
            // External service not defined.
            return Promise.resolve({ code: 0 });
        }

        const promise = this.http.post(checkUrl, { service: service }).timeout(this.wsProvider.getRequestTimeout()).toPromise();

        return promise.then((data: any) => {
            if (typeof data != 'undefined' && data.errorcode === 'requirecorrectaccess') {
                if (!retrying) {
                    this.siteUrl = this.urlUtils.addOrRemoveWWW(this.siteUrl);

                    return this.checkLocalMobilePlugin(true);
                } else {
                    return Promise.reject(data.error);
                }
            } else if (typeof data == 'undefined' || typeof data.code == 'undefined') {
                // The local_mobile returned something we didn't expect. Let's assume it's not installed.
                return { code: 0, warning: 'core.login.localmobileunexpectedresponse' };
            }

            const code = parseInt(data.code, 10);
            if (data.error) {
                switch (code) {
                    case 1:
                        // Site in maintenance mode.
                        return Promise.reject(this.translate.instant('core.login.siteinmaintenance'));
                    case 2:
                        // Web services not enabled.
                        return Promise.reject(this.translate.instant('core.login.webservicesnotenabled'));
                    case 3:
                        // Extended service not enabled, but the official is enabled.
                        return { code: 0 };
                    case 4:
                        // Neither extended or official services enabled.
                        return Promise.reject(this.translate.instant('core.login.mobileservicesnotenabled'));
                    default:
                        return Promise.reject(this.translate.instant('core.unexpectederror'));
                }
            } else {
                return { code: code, service: service, coreSupported: !!data.coresupported };
            }
        }, () => {
            return { code: 0 };
        });
    }

    /**
     * Check if local_mobile has been installed in Moodle.
     *
     * @return Whether the App is able to use local_mobile plugin for this site.
     */
    checkIfAppUsesLocalMobile(): boolean {
        let appUsesLocalMobile = false;

        if (!this.infos || !this.infos.functions) {
            return appUsesLocalMobile;
        }

        this.infos.functions.forEach((func) => {
            if (func.name.indexOf(CoreConstants.WS_PREFIX) != -1) {
                appUsesLocalMobile = true;
            }
        });

        return appUsesLocalMobile;
    }

    /**
     * Check if local_mobile has been installed in Moodle but the app is not using it.
     *
     * @return Promise resolved it local_mobile was added, rejected otherwise.
     */
    checkIfLocalMobileInstalledAndNotUsed(): Promise<any> {
        const appUsesLocalMobile = this.checkIfAppUsesLocalMobile();

        if (appUsesLocalMobile) {
            // App already uses local_mobile, it wasn't added.
            return Promise.reject(null);
        }

        return this.checkLocalMobilePlugin().then((data: LocalMobileResponse): any => {
            if (typeof data.service == 'undefined') {
                // The local_mobile NOT installed. Reject.
                return Promise.reject(null);
            }

            return data;
        });
    }

    /**
     * Check if a URL belongs to this site.
     *
     * @param url URL to check.
     * @return Whether the URL belongs to this site.
     */
    containsUrl(url: string): boolean {
        if (!url) {
            return false;
        }

        const siteUrl = this.textUtils.addEndingSlash(this.urlUtils.removeProtocolAndWWW(this.siteUrl));
        url = this.textUtils.addEndingSlash(this.urlUtils.removeProtocolAndWWW(url));

        return url.indexOf(siteUrl) == 0;
    }

    /**
     * Get the public config of this site.
     *
     * @return Promise resolved with public config. Rejected with an object if error, see CoreWSProvider.callAjax.
     */
    getPublicConfig(): Promise<any> {
        const preSets: CoreWSAjaxPreSets = {
            siteUrl: this.siteUrl
        };

        return this.wsProvider.callAjax('tool_mobile_get_public_config', {}, preSets).catch((error) => {

            if ((!this.getInfo() || this.isVersionGreaterEqualThan('3.8')) && error && error.errorcode == 'codingerror') {
                // This error probably means that there is a redirect in the site. Try to use a GET request.
                preSets.noLogin = true;
                preSets.useGet = true;

                return this.wsProvider.callAjax('tool_mobile_get_public_config', {}, preSets).catch((error2) => {
                    if (this.getInfo() && this.isVersionGreaterEqualThan('3.8')) {
                        // GET is supported, return the second error.
                        return Promise.reject(error2);
                    } else {
                        // GET not supported or we don't know if it's supported. Return first error.
                        return Promise.reject(error);
                    }
                });
            }

            return Promise.reject(error);
        }).then((config) => {
            // Use the wwwroot returned by the server.
            if (config.httpswwwroot) {
                this.siteUrl = config.httpswwwroot;
            }

            return config;
        });
    }

    /**
     * Open a URL in browser using auto-login in the Moodle site if available.
     *
     * @param url The URL to open.
     * @param alertMessage If defined, an alert will be shown before opening the browser.
     * @return Promise resolved when done, rejected otherwise.
     */
    openInBrowserWithAutoLogin(url: string, alertMessage?: string): Promise<any> {
        return this.openWithAutoLogin(false, url, undefined, alertMessage);
    }

    /**
     * Open a URL in browser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param url The URL to open.
     * @param alertMessage If defined, an alert will be shown before opening the browser.
     * @return Promise resolved when done, rejected otherwise.
     */
    openInBrowserWithAutoLoginIfSameSite(url: string, alertMessage?: string): Promise<any> {
        return this.openWithAutoLoginIfSameSite(false, url, undefined, alertMessage);
    }

    /**
     * Open a URL in inappbrowser using auto-login in the Moodle site if available.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @param alertMessage If defined, an alert will be shown before opening the inappbrowser.
     * @return Promise resolved when done.
     */
    openInAppWithAutoLogin(url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        return this.openWithAutoLogin(true, url, options, alertMessage);
    }

    /**
     * Open a URL in inappbrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param url The URL to open.
     * @param options Override default options passed to inappbrowser.
     * @param alertMessage If defined, an alert will be shown before opening the inappbrowser.
     * @return Promise resolved when done.
     */
    openInAppWithAutoLoginIfSameSite(url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        return this.openWithAutoLoginIfSameSite(true, url, options, alertMessage);
    }

    /**
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available.
     *
     * @param inApp True to open it in InAppBrowser, false to open in browser.
     * @param url The URL to open.
     * @param options Override default options passed to $cordovaInAppBrowser#open.
     * @param alertMessage If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return Promise resolved when done. Resolve param is returned only if inApp=true.
     */
    openWithAutoLogin(inApp: boolean, url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        // Get the URL to open.
        return this.getAutoLoginUrl(url).then((url) => {
            if (!alertMessage) {
                // Just open the URL.
                if (inApp) {
                    return this.utils.openInApp(url, options);
                } else {
                    return this.utils.openInBrowser(url);
                }
            }

            // Show an alert first.
            return this.domUtils.showAlert(this.translate.instant('core.notice'), alertMessage, undefined, 3000).then((alert) => {

                return new Promise<InAppBrowserObject | void>((resolve, reject): void => {
                    const subscription = alert.didDismiss.subscribe(() => {
                        subscription && subscription.unsubscribe();

                        if (inApp) {
                            resolve(this.utils.openInApp(url, options));
                        } else {
                            resolve(this.utils.openInBrowser(url));
                        }
                    });
                });
            });
        });
    }

    /**
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param inApp True to open it in InAppBrowser, false to open in browser.
     * @param url The URL to open.
     * @param options Override default options passed to inappbrowser.
     * @param alertMessage If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return Promise resolved when done. Resolve param is returned only if inApp=true.
     */
    openWithAutoLoginIfSameSite(inApp: boolean, url: string, options?: any, alertMessage?: string)
            : Promise<InAppBrowserObject | void> {
        if (this.containsUrl(url)) {
            return this.openWithAutoLogin(inApp, url, options, alertMessage);
        } else {
            if (inApp) {
                this.utils.openInApp(url, options);
            } else {
                this.utils.openInBrowser(url);
            }

            return Promise.resolve(null);
        }
    }

    /**
     * Get the config of this site.
     * It is recommended to use getStoredConfig instead since it's faster and doesn't use network.
     *
     * @param name Name of the setting to get. If not set or false, all settings will be returned.
     * @param ignoreCache True if it should ignore cached data.
     * @return Promise resolved with site config.
     */
    getConfig(name?: string, ignoreCache?: boolean): Promise<any> {
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getConfigCacheKey()
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        return this.read('tool_mobile_get_config', {}, preSets).then((config) => {
            if (name) {
                // Return the requested setting.
                for (const x in config.settings) {
                    if (config.settings[x].name == name) {
                        return config.settings[x].value;
                    }
                }

                return Promise.reject(null);
            } else {
                // Return all settings in the same array.
                const settings = {};
                config.settings.forEach((setting) => {
                    settings[setting.name] = setting.value;
                });

                return settings;
            }
        });
    }

    /**
     * Invalidates config WS call.
     *
     * @return Promise resolved when the data is invalidated.
     */
    invalidateConfig(): Promise<any> {
        return this.invalidateWsCacheForKey(this.getConfigCacheKey());
    }

    /**
     * Get cache key for getConfig WS calls.
     *
     * @return Cache key.
     */
    protected getConfigCacheKey(): string {
        return 'tool_mobile_get_config';
    }

    /**
     * Get the stored config of this site.
     *
     * @param name Name of the setting to get. If not set, all settings will be returned.
     * @return Site config or a specific setting.
     */
    getStoredConfig(name?: string): any {
        if (!this.config) {
            return;
        }

        if (name) {
            return this.config[name];
        } else {
            return this.config;
        }
    }

    /**
     * Check if a certain feature is disabled in the site.
     *
     * @param name Name of the feature to check.
     * @return Whether it's disabled.
     */
    isFeatureDisabled(name: string): boolean {
        const disabledFeatures = this.getStoredConfig('tool_mobile_disabledfeatures');
        if (!disabledFeatures) {
            return false;
        }

        const regEx = new RegExp('(,|^)' + this.textUtils.escapeForRegex(name) + '(,|$)', 'g');

        return !!disabledFeatures.match(regEx);
    }

    /**
     * Calculate if offline is disabled in the site.
     */
    calculateOfflineDisabled(): void {
        this.offlineDisabled = this.isFeatureDisabled('NoDelegate_CoreOffline');
    }

    /**
     * Get whether offline is disabled in the site.
     *
     * @return Whether it's disabled.
     */
    isOfflineDisabled(): boolean {
        return this.offlineDisabled;
    }

    /**
     * Check if the site version is greater than one or several versions.
     * This function accepts a string or an array of strings. If array, the last version must be the highest.
     *
     * @param versions Version or list of versions to check.
     * @return Whether it's greater or equal, false otherwise.
     * @description
     * If a string is supplied (e.g. '3.2.1'), it will check if the site version is greater or equal than this version.
     *
     * If an array of versions is supplied, it will check if the site version is greater or equal than the last version,
     * or if it's higher or equal than any of the other releases supplied but lower than the next major release. The last
     * version of the array must be the highest version.
     * For example, if the values supplied are ['3.0.5', '3.2.3', '3.3.1'] the function will return true if the site version
     * is either:
     *     - Greater or equal than 3.3.1.
     *     - Greater or equal than 3.2.3 but lower than 3.3.
     *     - Greater or equal than 3.0.5 but lower than 3.1.
     *
     * This function only accepts versions from 2.4.0 and above. If any of the versions supplied isn't found, it will assume
     * it's the last released major version.
     */
    isVersionGreaterEqualThan(versions: string | string[]): boolean {
        const siteVersion = parseInt(this.getInfo().version, 10);

        if (Array.isArray(versions)) {
            if (!versions.length) {
                return false;
            }

            for (let i = 0; i < versions.length; i++) {
                const versionNumber = this.getVersionNumber(versions[i]);
                if (i == versions.length - 1) {
                    // It's the last version, check only if site version is greater than this one.
                    return siteVersion >= versionNumber;
                } else {
                    // Check if site version if bigger than this number but lesser than next major.
                    if (siteVersion >= versionNumber && siteVersion < this.getNextMajorVersionNumber(versions[i])) {
                        return true;
                    }
                }
            }
        } else if (typeof versions == 'string') {
            // Compare with this version.
            return siteVersion >= this.getVersionNumber(versions);
        }

        return false;
    }

    /**
     * Given a URL, convert it to a URL that will auto-login if supported.
     *
     * @param url The URL to convert.
     * @param showModal Whether to show a loading modal.
     * @return Promise resolved with the converted URL.
     */
    getAutoLoginUrl(url: string, showModal: boolean = true): Promise<string> {

        if (!this.privateToken || !this.wsAvailable('tool_mobile_get_autologin_key') ||
                (this.lastAutoLogin && this.timeUtils.timestamp() - this.lastAutoLogin < CoreConstants.SECONDS_MINUTE * 6)) {
            // No private token, WS not available or last auto-login was less than 6 minutes ago. Don't change the URL.

            return Promise.resolve(url);
        }

        const userId = this.getUserId(),
            params = {
                privatetoken: this.privateToken
            };
        let modal;

        if (showModal) {
            modal = this.domUtils.showModalLoading();
        }

        // Use write to not use cache.
        return this.write('tool_mobile_get_autologin_key', params).then((data) => {

            if (!data.autologinurl || !data.key) {
                // Not valid data, return the same URL.
                return url;
            }

            this.lastAutoLogin = this.timeUtils.timestamp();

            return data.autologinurl + '?userid=' + userId + '&key=' + data.key + '&urltogo=' + url;
        }).catch(() => {

            // Couldn't get autologin key, return the same URL.
            return url;
        }).finally(() => {
            modal && modal.dismiss();
        });
    }

    /**
     * Get a version number from a release version.
     * If release version is valid but not found in the list of Moodle releases, it will use the last released major version.
     *
     * @param version Release version to convert to version number.
     * @return Version number, 0 if invalid.
     */
    protected getVersionNumber(version: string): number {
        const data = this.getMajorAndMinor(version);

        if (!data) {
            // Invalid version.
            return 0;
        }

        if (typeof this.MOODLE_RELEASES[data.major] == 'undefined') {
            // Major version not found. Use the last one.
            data.major = Object.keys(this.MOODLE_RELEASES).slice(-1);
        }

        return this.MOODLE_RELEASES[data.major] + data.minor;
    }

    /**
     * Given a release version, return the major and minor versions.
     *
     * @param version Release version (e.g. '3.1.0').
     * @return Object with major and minor. Returns false if invalid version.
     */
    protected getMajorAndMinor(version: string): any {
        const match = version.match(/(\d)+(?:\.(\d)+)?(?:\.(\d)+)?/);
        if (!match || !match[1]) {
            // Invalid version.
            return false;
        }

        return {
            major: match[1] + '.' + (match[2] || '0'),
            minor: parseInt(match[3], 10) || 0
        };
    }

    /**
     * Given a release version, return the next major version number.
     *
     * @param version Release version (e.g. '3.1.0').
     * @return Next major version number.
     */
    protected getNextMajorVersionNumber(version: string): number {
        const data = this.getMajorAndMinor(version),
            releases = Object.keys(this.MOODLE_RELEASES);
        let position;

        if (!data) {
            // Invalid version.
            return 0;
        }

        position = releases.indexOf(data.major);

        if (position == -1 || position == releases.length - 1) {
            // Major version not found or it's the last one. Use the last one.
            return this.MOODLE_RELEASES[releases[position]];
        }

        return this.MOODLE_RELEASES[releases[position + 1]];
    }

    /**
     * Deletes a site setting.
     *
     * @param name The config name.
     * @return Promise resolved when done.
     */
    deleteSiteConfig(name: string): Promise<any> {
        return this.db.deleteRecords(CoreSite.CONFIG_TABLE, { name: name });
    }

    /**
     * Get a site setting on local device.
     *
     * @param name The config name.
     * @param defaultValue Default value to use if the entry is not found.
     * @return Resolves upon success along with the config data. Reject on failure.
     */
    getLocalSiteConfig(name: string, defaultValue?: any): Promise<any> {
        return this.db.getRecord(CoreSite.CONFIG_TABLE, { name: name }).then((entry) => {
            return entry.value;
        }).catch((error) => {
            if (typeof defaultValue != 'undefined') {
                return defaultValue;
            }

            return Promise.reject(error);
        });
    }

    /**
     * Set a site setting on local device.
     *
     * @param name The config name.
     * @param value The config value. Can only store number or strings.
     * @return Promise resolved when done.
     */
    setLocalSiteConfig(name: string, value: number | string): Promise<any> {
        return this.db.insertRecord(CoreSite.CONFIG_TABLE, { name: name, value: value });
    }

    /**
     * Get a certain cache expiration delay.
     *
     * @param updateFrequency The update frequency of the entry.
     * @return Expiration delay.
     */
    getExpirationDelay(updateFrequency?: number): number {
        let expirationDelay = this.UPDATE_FREQUENCIES[updateFrequency] || this.UPDATE_FREQUENCIES[CoreSite.FREQUENCY_USUALLY];

        if (this.appProvider.isNetworkAccessLimited()) {
            // Not WiFi, increase the expiration delay a 50% to decrease the data usage in this case.
            expirationDelay *= 1.5;
        }

        return expirationDelay;
    }

    /*
     * Check if tokenpluginfile script works in the site.
     *
     * @param url URL to check.
     * @return Promise resolved with boolean: whether it works or not.
     */
    checkTokenPluginFile(url: string): Promise<boolean> {
        if (!this.urlUtils.canUseTokenPluginFile(url, this.siteUrl, this.infos && this.infos.userprivateaccesskey)) {
            // Cannot use tokenpluginfile.
            return Promise.resolve(false);
        } else if (typeof this.tokenPluginFileWorks != 'undefined') {
            // Already checked.
            return Promise.resolve(this.tokenPluginFileWorks);
        } else if (this.tokenPluginFileWorksPromise) {
            // Check ongoing, use the same promise.
            return this.tokenPluginFileWorksPromise;
        } else if (!this.appProvider.isOnline()) {
            // Not online, cannot check it. Assume it's working, but don't save the result.
            return Promise.resolve(true);
        }

        url = this.fixPluginfileURL(url);

        this.tokenPluginFileWorksPromise = this.wsProvider.performHead(url).then((result) => {
            return result.ok;
        }).catch((error) => {
            // Error performing head request.
            return false;
        }).then((result) => {
            this.tokenPluginFileWorks = result;

            return result;
        });

        return this.tokenPluginFileWorksPromise;
    }
}
