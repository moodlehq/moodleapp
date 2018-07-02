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

import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { SQLiteDB } from './sqlitedb';
import { CoreAppProvider } from '@providers/app';
import { CoreDbProvider } from '@providers/db';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreWSProvider, CoreWSPreSets, CoreWSFileUploadOptions } from '@providers/ws';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
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
     * @type {boolean}
     */
    getFromCache?: boolean;

    /**
     * Save the result to the cache.
     * @type {boolean}
     */
    saveToCache?: boolean;

    /**
     * Ignore cache expiration.
     * @type {boolean}
     */
    omitExpires?: boolean;

    /**
     * Use the cache when a request fails. Defaults to true.
     * @type {boolean}
     */
    emergencyCache?: boolean;

    /**
     * Extra key to add to the cache when storing this call, to identify the entry.
     * @type {string}
     */
    cacheKey?: string;

    /**
     * Whether it should use cache key to retrieve the cached data instead of the request params.
     * @type {boolean}
     */
    getCacheUsingCacheKey?: boolean;

    /**
     * Same as getCacheUsingCacheKey, but for emergency cache.
     * @type {boolean}
     */
    getEmergencyCacheUsingCacheKey?: boolean;

    /**
     * If true, the cache entry will be deleted if the WS call returns an exception.
     * @type {boolean}
     */
    deleteCacheIfWSError?: boolean;

    /**
     * Whether it should only be 1 entry for this cache key (all entries with same key will be deleted).
     * @type {boolean}
     */
    uniqueCacheKey?: boolean;

    /**
     * Whether to filter WS response (moodlewssettingfilter). Defaults to true.
     * @type {boolean}
     */
    filter?: boolean;

    /**
     * Whether to rewrite URLs (moodlewssettingfileurl). Defaults to true.
     * @type {boolean}
     */
    rewriteurls?: boolean;

    /**
     * Defaults to true. Set to false when the expected response is null.
     * @type {boolean}
     */
    responseExpected?: boolean;

    /**
     * Defaults to 'object'. Use it when you expect a type that's not an object|array.
     * @type {string}
     */
    typeExpected?: string;
}

/**
 * Response of checking local_mobile status.
 */
export interface LocalMobileResponse {
    /**
     * Code to identify the authentication method to use.
     * @type {number}
     */
    code: number;

    /**
     * Name of the service to use.
     * @type {string}
     */
    service?: string;

    /**
     * Code of the warning message.
     * @type {string}
     */
    warning?: string;

    /**
     * Whether core SSO is supported.
     * @type {boolean}
     */
    coreSupported?: boolean;
}

/**
 * Class that represents a site (combination of site + user).
 * It will have all the site data and provide utility functions regarding a site.
 * To add tables to the site's database, please use CoreSitesProvider.createTablesFromSchema. This will make sure that
 * the tables are created in all the sites, not just the current one.
 */
export class CoreSite {
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
    protected WS_CACHE_TABLE = 'wscache';
    protected tableSchema = {
        name: this.WS_CACHE_TABLE,
        columns: [
            {
                name: 'id',
                type: 'TEXT',
                primaryKey: true
            },
            {
                name: 'data',
                type: 'TEXT'
            },
            {
                name: 'key',
                type: 'TEXT'
            },
            {
                name: 'expirationTime',
                type: 'INTEGER'
            }
        ]
    };

    // Versions of Moodle releases.
    protected MOODLE_RELEASES = {
        3.1: 2016052300,
        3.2: 2016120500,
        3.3: 2017051503,
        3.4: 2017111300
    };

    // Rest of variables.
    protected logger;
    protected db: SQLiteDB;
    protected cleanUnicode = false;
    protected lastAutoLogin = 0;
    protected offlineDisabled = false;

    /**
     * Create a site.
     *
     * @param {Injector} injector Angular injector to prevent having to pass all the required services.
     * @param {string} id Site ID.
     * @param {string} siteUrl Site URL.
     * @param {string} [token] Site's WS token.
     * @param {any} [info] Site info.
     * @param {string} [privateToken] Private token.
     * @param {any} [config] Site public config.
     * @param {boolean} [loggedOut] Whether user is logged out.
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
        this.db.createTableFromSchema(this.tableSchema);
    }

    /**
     * Get site ID.
     *
     * @return {string} Site ID.
     */
    getId(): string {
        return this.id;
    }

    /**
     * Get site URL.
     *
     * @return {string} Site URL.
     */
    getURL(): string {
        return this.siteUrl;
    }

    /**
     * Get site token.
     *
     * @return {string} Site token.
     */
    getToken(): string {
        return this.token;
    }

    /**
     * Get site info.
     *
     * @return {any} Site info.
     */
    getInfo(): any {
        return this.infos;
    }

    /**
     * Get site private token.
     *
     * @return {string} Site private token.
     */
    getPrivateToken(): string {
        return this.privateToken;
    }

    /**
     * Get site DB.
     *
     * @return {SQLiteDB} Site DB.
     */
    getDb(): SQLiteDB {
        return this.db;
    }

    /**
     * Get site user's ID.
     *
     * @return {number} User's ID.
     */
    getUserId(): number {
        if (typeof this.infos != 'undefined' && typeof this.infos.userid != 'undefined') {
            return this.infos.userid;
        }
    }

    /**
     * Get site Course ID for frontpage course. If not declared it will return 1 as default.
     *
     * @return {number} Site Home ID.
     */
    getSiteHomeId(): number {
        return this.infos && this.infos.siteid || 1;
    }

    /**
     * Set site ID.
     *
     * @param {string} New ID.
     */
    setId(id: string): void {
        this.id = id;
        this.initDB();
    }

    /**
     * Set site token.
     *
     * @param {string} New token.
     */
    setToken(token: string): void {
        this.token = token;
    }

    /**
     * Set site private token.
     *
     * @param {string} privateToken New private token.
     */
    setPrivateToken(privateToken: string): void {
        this.privateToken = privateToken;
    }

    /**
     * Check if user logged out from the site and needs to authenticate again.
     *
     * @return {boolean} Whether is logged out.
     */
    isLoggedOut(): boolean {
        return !!this.loggedOut;
    }

    /**
     * Set site info.
     *
     * @param {any} New info.
     */
    setInfo(infos: any): void {
        this.infos = infos;
    }

    /**
     * Set site config.
     *
     * @param {any} Config.
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
     * @param {boolean} loggedOut True if logged out and needs to authenticate again, false otherwise.
     */
    setLoggedOut(loggedOut: boolean): void {
        this.loggedOut = !!loggedOut;
    }

    /**
     * Can the user access their private files?
     *
     * @return {boolean} Whether can access my files.
     */
    canAccessMyFiles(): boolean {
        const infos = this.getInfo();

        return infos && (typeof infos.usercanmanageownfiles === 'undefined' || infos.usercanmanageownfiles);
    }

    /**
     * Can the user download files?
     *
     * @return {boolean} Whether can download files.
     */
    canDownloadFiles(): boolean {
        const infos = this.getInfo();

        return infos && infos.downloadfiles;
    }

    /**
     * Can the user use an advanced feature?
     *
     * @param {string} feature The name of the feature.
     * @param {boolean} [whenUndefined=true] The value to return when the parameter is undefined.
     * @return {boolean} Whether can use advanced feature.
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
     * @return {boolean} Whether can upload files.
     */
    canUploadFiles(): boolean {
        const infos = this.getInfo();

        return infos && infos.uploadfiles;
    }

    /**
     * Fetch site info from the Moodle site.
     *
     * @return {Promise<any>} A promise to be resolved when the site info is retrieved.
     */
    fetchSiteInfo(): Promise<any> {
        // The get_site_info WS call won't be cached.
        const preSets = {
            getFromCache: false,
            saveToCache: false
        };

        // Reset clean Unicode to check if it's supported again.
        this.cleanUnicode = false;

        return this.read('core_webservice_get_site_info', {}, preSets);
    }

    /**
     * Read some data from the Moodle site using WS. Requests are cached by default.
     *
     * @param {string} method WS method to use.
     * @param {any} data Data to send to the WS.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @return {Promise<any>} Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    read(method: string, data: any, preSets?: CoreSiteWSPreSets): Promise<any> {
        preSets = preSets || {};
        if (typeof preSets.getFromCache == 'undefined') {
            preSets.getFromCache = true;
        }
        if (typeof preSets.saveToCache == 'undefined') {
            preSets.saveToCache = true;
        }

        return this.request(method, data, preSets);
    }

    /**
     * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
     *
     * @param {string} method  WS method to use.
     * @param {any} data Data to send to the WS.
     * @param {CoreSiteWSPreSets} [preSets] Extra options.
     * @return {Promise<any>} Promise resolved with the response, rejected with CoreWSError if it fails.
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
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method.
     * @param {CoreSiteWSPreSets} preSets Extra options.
     * @param {boolean} [retrying] True if we're retrying the call for some reason. This is to prevent infinite loops.
     * @return {Promise<any>} Promise resolved with the response, rejected with CoreWSError if it fails.
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

        // Convert the values to string before starting the cache process.
        try {
            data = this.wsProvider.convertValuesToString(data, wsPreSets.cleanUnicode);
        } catch (e) {
            // Empty cleaned text found.
            return Promise.reject(this.utils.createFakeWSError('core.unicodenotsupportedcleanerror', true));
        }

        return this.getFromCache(method, data, preSets, false, originalData).catch(() => {
            // Do not pass those options to the core WS factory.
            return this.wsProvider.call(method, data, wsPreSets).then((response) => {
                if (preSets.saveToCache) {
                    this.saveToCache(method, data, response, preSets);
                }

                // We pass back a clone of the original object, this may prevent errors if in the callback the object is modified.
                return this.utils.clone(response);
            }).catch((error) => {
                if (error.errorcode == 'invalidtoken' ||
                    (error.errorcode == 'accessexception' && error.message.indexOf('Invalid token - token expired') > -1)) {
                    if (initialToken !== this.token && !retrying) {
                        // Token has changed, retry with the new token.
                        return this.request(method, data, preSets, true);
                    } else if (this.appProvider.isSSOAuthenticationOngoing()) {
                        // There's an SSO authentication ongoing, wait for it to finish and try again.
                        return this.appProvider.waitForSSOAuthentication().then(() => {
                            return this.request(method, data, preSets, true);
                        });
                    }

                    // Session expired, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {}, this.id);
                    // Change error message. We'll try to get data from cache.
                    error.message = this.translate.instant('core.lostconnection');
                } else if (error.errorcode === 'userdeleted') {
                    // User deleted, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.USER_DELETED, { params: data }, this.id);
                    error.message = this.translate.instant('core.userdeleted');

                    return Promise.reject(error);
                } else if (error.errorcode === 'forcepasswordchangenotice') {
                    // Password Change Forced, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.PASSWORD_CHANGE_FORCED, {}, this.id);
                    error.message = this.translate.instant('core.forcepasswordchangenotice');

                    return Promise.reject(error);
                } else if (error.errorcode === 'usernotfullysetup') {
                    // User not fully setup, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.USER_NOT_FULLY_SETUP, {}, this.id);
                    error.message = this.translate.instant('core.usernotfullysetup');

                    return Promise.reject(error);
                } else if (error.errorcode === 'sitepolicynotagreed') {
                    // Site policy not agreed, trigger event.
                    this.eventsProvider.trigger(CoreEventsProvider.SITE_POLICY_NOT_AGREED, {}, this.id);
                    error.message = this.translate.instant('core.sitepolicynotagreederror');

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
        });
    }

    /**
     * Check if a WS is available in this site.
     *
     * @param {string} method WS name.
     * @param {boolean} [checkPrefix=true] When true also checks with the compatibility prefix.
     * @return {boolean} Whether the WS is available.
     */
    wsAvailable(method: string, checkPrefix: boolean = true): boolean {
        if (typeof this.infos == 'undefined') {
            return false;
        }

        for (let i = 0; i < this.infos.functions.length; i++) {
            const func = this.infos.functions[i];
            if (func.name == method) {
                return true;
            }
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
     * @param {string} method The WebService method.
     * @param {any} data Arguments to pass to the method.
     * @return {string} Cache ID.
     */
    protected getCacheId(method: string, data: any): string {
        return <string> Md5.hashAsciiStr(method + ':' + this.utils.sortAndStringify(data));
    }

    /**
     * Get the cache ID used in Ionic 1 version of the app.
     *
     * @param {string} method The WebService method.
     * @param {any} data Arguments to pass to the method.
     * @return {string} Cache ID.
     */
    protected getCacheOldId(method: string, data: any): string {
        return <string> Md5.hashAsciiStr(method + ':' +  JSON.stringify(data));
    }

    /**
     * Get a WS response from cache.
     *
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method.
     * @param {CoreSiteWSPreSets} preSets Extra options.
     * @param {boolean} [emergency] Whether it's an "emergency" cache call (WS call failed).
     * @param {any} [originalData] Arguments to pass to the method before being converted to strings.
     * @return {Promise<any>} Promise resolved with the WS response.
     */
    protected getFromCache(method: string, data: any, preSets: CoreSiteWSPreSets, emergency?: boolean, originalData?: any)
            : Promise<any> {
        if (!this.db || !preSets.getFromCache) {
            return Promise.reject(null);
        }

        const id = this.getCacheId(method, data);
        let promise;

        if (preSets.getCacheUsingCacheKey || (emergency && preSets.getEmergencyCacheUsingCacheKey)) {
            promise = this.db.getRecords(this.WS_CACHE_TABLE, { key: preSets.cacheKey }).then((entries) => {
                if (!entries.length) {
                    // Cache key not found, get by params sent.
                    return this.db.getRecord(this.WS_CACHE_TABLE, { id: id });
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
            promise = this.db.getRecord(this.WS_CACHE_TABLE, { id: id }).catch(() => {
                // Entry not found, try to get it using the old ID.
                const oldId = this.getCacheOldId(method, originalData || {});

                return this.db.getRecord(this.WS_CACHE_TABLE, { id: oldId }).then((entry) => {
                    // Update the entry ID to use the new one.
                    this.db.updateRecords(this.WS_CACHE_TABLE, {id: id}, {id: oldId});

                    return entry;
                });
            });
        }

        return promise.then((entry) => {
            const now = Date.now();

            preSets.omitExpires = preSets.omitExpires || !this.appProvider.isOnline();

            if (!preSets.omitExpires) {
                if (now > entry.expirationTime) {
                    this.logger.debug('Cached element found, but it is expired');

                    return Promise.reject(null);
                }
            }

            if (typeof entry != 'undefined' && typeof entry.data != 'undefined') {
                const expires = (entry.expirationTime - now) / 1000;
                this.logger.info(`Cached element found, id: ${id} expires in ${expires} seconds`);

                return this.textUtils.parseJSON(entry.data, {});
            }

            return Promise.reject(null);
        });
    }

    /**
     * Save a WS response to cache.
     *
     * @param {string} method The WebService method.
     * @param {any} data Arguments to pass to the method.
     * @param {any} response The WS response.
     * @param {CoreSiteWSPreSets} preSets Extra options.
     * @return {Promise<any>} Promise resolved when the response is saved.
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
            const id = this.getCacheId(method, data),
                entry: any = {
                    id: id,
                    data: JSON.stringify(response)
                };
            let cacheExpirationTime = CoreConfigConstants.cache_expiration_time;

            cacheExpirationTime = isNaN(cacheExpirationTime) ? 300000 : cacheExpirationTime;
            entry.expirationTime = new Date().getTime() + cacheExpirationTime;
            if (preSets.cacheKey) {
                entry.key = preSets.cacheKey;
            }

            return this.db.insertRecord(this.WS_CACHE_TABLE, entry);
        });
    }

    /**
     * Delete a WS cache entry or entries.
     *
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method.
     * @param {CoreSiteWSPreSets} preSets Extra options.
     * @param {boolean} [allCacheKey] True to delete all entries with the cache key, false to delete only by ID.
     * @return {Promise<any>} Promise resolved when the entries are deleted.
     */
    protected deleteFromCache(method: string, data: any, preSets: CoreSiteWSPreSets, allCacheKey?: boolean): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }

        const id = this.getCacheId(method, data);

        if (allCacheKey) {
            return this.db.deleteRecords(this.WS_CACHE_TABLE, { key: preSets.cacheKey });
        }

        return this.db.deleteRecords(this.WS_CACHE_TABLE, { id: id });
    }

    /*
     * Uploads a file using Cordova File API.
     *
     * @param {string} filePath File path.
     * @param {CoreWSFileUploadOptions} options File upload options.
     * @param {Function} [onProgress] Function to call on progress.
     * @return {Promise<any>} Promise resolved when uploaded.
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
     * @return {Promise<any>} Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCache(): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }

        this.logger.debug('Invalidate all the cache for site: ' + this.id);

        return this.db.updateRecords(this.WS_CACHE_TABLE, { expirationTime: 0 });
    }

    /**
     * Invalidates all the cache entries with a certain key.
     *
     * @param {string} key Key to search.
     * @return {Promise<any>} Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCacheForKey(key: string): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }
        if (!key) {
            return Promise.resolve();
        }

        this.logger.debug('Invalidate cache for key: ' + key);

        return this.db.updateRecords(this.WS_CACHE_TABLE, { expirationTime: 0 }, { key: key });
    }

    /**
     * Invalidates all the cache entries in an array of keys.
     *
     * @param {string[]} keys Keys to search.
     * @return {Promise<any>} Promise resolved when the cache entries are invalidated.
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
     * @param {string} key Key to search.
     * @return {Promise}    Promise resolved when the cache entries are invalidated.
     */
    invalidateWsCacheForKeyStartingWith(key: string): Promise<any> {
        if (!this.db) {
            return Promise.reject(null);
        }
        if (!key) {
            return Promise.resolve();
        }

        this.logger.debug('Invalidate cache for key starting with: ' + key);

        const sql = 'UPDATE ' + this.WS_CACHE_TABLE + ' SET expirationTime=0 WHERE key LIKE ?';

        return this.db.execute(sql, [key + '%']);
    }

    /**
     * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
     * Uses CoreUtilsProvider.fixPluginfileURL, passing site's token.
     *
     * @param {string} url The url to be fixed.
     * @return {string} Fixed URL.
     */
    fixPluginfileURL(url: string): string {
        return this.urlUtils.fixPluginfileURL(url, this.token, this.siteUrl);
    }

    /**
     * Deletes site's DB.
     *
     * @return {Promise<any>} Promise to be resolved when the DB is deleted.
     */
    deleteDB(): Promise<any> {
        return this.dbProvider.deleteDB('Site-' + this.id);
    }

    /**
     * Deletes site's folder.
     *
     * @return {Promise<any>} Promise to be resolved when the DB is deleted.
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
     * @return {Promise<number>} Promise resolved with the site space usage (size).
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
     * @param {string} [page] Docs page to go to.
     * @return {Promise<string>} Promise resolved with the Moodle docs URL.
     */
    getDocsUrl(page?: string): Promise<string> {
        const release = this.infos.release ? this.infos.release : undefined;

        return this.urlUtils.getDocsUrl(release, page);
    }

    /**
     * Check if the local_mobile plugin is installed in the Moodle site.
     *
     * @param {boolean} [retrying] True if we're retrying the check.
     * @return {Promise<LocalMobileResponse>} Promise resolved when the check is done.
     */
    checkLocalMobilePlugin(retrying?: boolean): Promise<LocalMobileResponse> {
        const checkUrl = this.siteUrl + '/local/mobile/check.php',
            service = CoreConfigConstants.wsextservice;

        if (!service) {
            // External service not defined.
            return Promise.resolve({ code: 0 });
        }

        const promise = this.http.post(checkUrl, { service: service }).timeout(CoreConstants.WS_TIMEOUT).toPromise();

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
     * @return {boolean} Whether the App is able to use local_mobile plugin for this site.
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
     * @return {Promise<any>} Promise resolved it local_mobile was added, rejected otherwise.
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
     * @param {string} url URL to check.
     * @return {boolean} Whether the URL belongs to this site.
     */
    containsUrl(url: string): boolean {
        if (!url) {
            return false;
        }

        const siteUrl = this.urlUtils.removeProtocolAndWWW(this.siteUrl);
        url = this.urlUtils.removeProtocolAndWWW(url);

        return url.indexOf(siteUrl) == 0;
    }

    /**
     * Get the public config of this site.
     *
     * @return {Promise<any>} Promise resolved with public config. Rejected with an object if error, see CoreWSProvider.callAjax.
     */
    getPublicConfig(): Promise<any> {
        return this.wsProvider.callAjax('tool_mobile_get_public_config', {}, { siteUrl: this.siteUrl }).then((config) => {
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
     * @param {string} url The URL to open.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the browser.
     * @return {Promise<any>} Promise resolved when done, rejected otherwise.
     */
    openInBrowserWithAutoLogin(url: string, alertMessage?: string): Promise<any> {
        return this.openWithAutoLogin(false, url, undefined, alertMessage);
    }

    /**
     * Open a URL in browser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param {string} url The URL to open.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the browser.
     * @return {Promise<any>} Promise resolved when done, rejected otherwise.
     */
    openInBrowserWithAutoLoginIfSameSite(url: string, alertMessage?: string): Promise<any> {
        return this.openWithAutoLoginIfSameSite(false, url, undefined, alertMessage);
    }

    /**
     * Open a URL in inappbrowser using auto-login in the Moodle site if available.
     *
     * @param {string} url The URL to open.
     * @param {any} [options] Override default options passed to InAppBrowser.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
     * @return {Promise<InAppBrowserObject|void>} Promise resolved when done.
     */
    openInAppWithAutoLogin(url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        return this.openWithAutoLogin(true, url, options, alertMessage);
    }

    /**
     * Open a URL in inappbrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param {string} url The URL to open.
     * @param {object} [options] Override default options passed to inappbrowser.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
     * @return {Promise<InAppBrowserObject|void>} Promise resolved when done.
     */
    openInAppWithAutoLoginIfSameSite(url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        return this.openWithAutoLoginIfSameSite(true, url, options, alertMessage);
    }

    /**
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available.
     *
     * @param {boolean} inApp True to open it in InAppBrowser, false to open in browser.
     * @param {string} url The URL to open.
     * @param {object} [options] Override default options passed to $cordovaInAppBrowser#open.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return {Promise<InAppBrowserObject|void>} Promise resolved when done. Resolve param is returned only if inApp=true.
     */
    openWithAutoLogin(inApp: boolean, url: string, options?: any, alertMessage?: string): Promise<InAppBrowserObject | void> {
        // Convenience function to open the URL.
        const open = (url): Promise<any> => {
            return new Promise<InAppBrowserObject | void>((resolve, reject): void => {
                if (modal) {
                    modal.dismiss();
                }

                if (alertMessage) {
                    this.domUtils.showAlert(this.translate.instant('core.notice'), alertMessage, undefined, 3000).then((alert) => {
                        alert.onDidDismiss(() => {
                            if (inApp) {
                                resolve(this.utils.openInApp(url, options));
                            } else {
                                resolve(this.utils.openInBrowser(url));
                            }
                        });
                    });
                } else {
                    if (inApp) {
                        resolve(this.utils.openInApp(url, options));
                    } else {
                        resolve(this.utils.openInBrowser(url));
                    }
                }
            });
        };

        if (!this.privateToken || !this.wsAvailable('tool_mobile_get_autologin_key') ||
                (this.lastAutoLogin && this.timeUtils.timestamp() - this.lastAutoLogin < CoreConstants.SECONDS_MINUTE * 6)) {
            // No private token, WS not available or last auto-login was less than 6 minutes ago.
            // Open the final URL without auto-login.
            return Promise.resolve(open(url));
        }

        const userId = this.getUserId(),
            params = {
                privatetoken: this.privateToken
            },
            modal = this.domUtils.showModalLoading();

        // Use write to not use cache.
        return this.write('tool_mobile_get_autologin_key', params).then((data) => {
            if (!data.autologinurl || !data.key) {
                // Not valid data, open the final URL without auto-login.
                return open(url);
            }

            this.lastAutoLogin = this.timeUtils.timestamp();

            return open(data.autologinurl + '?userid=' + userId + '&key=' + data.key + '&urltogo=' + url);
        }).catch(() => {
            // Couldn't get autologin key, open the final URL without auto-login.
            return open(url);
        });
    }

    /**
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     *
     * @param {boolean} inApp True to open it in InAppBrowser, false to open in browser.
     * @param {string} url The URL to open.
     * @param {object} [options] Override default options passed to inappbrowser.
     * @param {string} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return {Promise<InAppBrowserObject|void>} Promise resolved when done. Resolve param is returned only if inApp=true.
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
     * @param {string} [name] Name of the setting to get. If not set or false, all settings will be returned.
     * @param {boolean} [ignoreCache] True if it should ignore cached data.
     * @return {Promise<any>} Promise resolved with site config.
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
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateConfig(): Promise<any> {
        return this.invalidateWsCacheForKey(this.getConfigCacheKey());
    }

    /**
     * Get cache key for getConfig WS calls.
     *
     * @return {string} Cache key.
     */
    protected getConfigCacheKey(): string {
        return 'tool_mobile_get_config';
    }

    /**
     * Get the stored config of this site.
     *
     * @param {string} [name] Name of the setting to get. If not set, all settings will be returned.
     * @return {any} Site config or a specific setting.
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
     * @param {string} name Name of the feature to check.
     * @return {boolean} Whether it's disabled.
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
     * @return {boolean} Whether it's disabled.
     */
    isOfflineDisabled(): boolean {
        return this.offlineDisabled;
    }

    /**
     * Check if the site version is greater than one or several versions.
     * This function accepts a string or an array of strings. If array, the last version must be the highest.
     *
     * @param {string | string[]} versions Version or list of versions to check.
     * @return {boolean} Whether it's greater or equal, false otherwise.
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
     * Get a version number from a release version.
     * If release version is valid but not found in the list of Moodle releases, it will use the last released major version.
     *
     * @param {string} version Release version to convert to version number.
     * @return {number} Version number, 0 if invalid.
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
     * @param {string} version Release version (e.g. '3.1.0').
     * @return {object} Object with major and minor. Returns false if invalid version.
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
     * @param {string} version Release version (e.g. '3.1.0').
     * @return {number} Next major version number.
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
}
