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
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from './app';
import { CoreEventsProvider } from './events';
import { CoreLoggerProvider } from './logger';
import { CoreSitesFactoryProvider } from './sites-factory';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUrlUtilsProvider } from './utils/url';
import { CoreUtilsProvider } from './utils/utils';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../configconstants';
import { CoreSite } from '@classes/site';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { Md5 } from 'ts-md5/dist/md5';
import { Location } from '@angular/common';
import { WP_PROVIDER } from '@app/app.module';

/**
 * Response of checking if a site exists and its configuration.
 */
export interface CoreSiteCheckResponse {
    /**
     * Code to identify the authentication method to use.
     * @type {number}
     */
    code: number;

    /**
     * Site url to use (might have changed during the process).
     * @type {string}
     */
    siteUrl: string;

    /**
     * Service used.
     * @type {string}
     */
    service: string;

    /**
     * Code of the warning message to show to the user.
     * @type {string}
     */
    warning?: string;

    /**
     * Site public config (if available).
     * @type {any}
     */
    config?: any;
}

/**
 * Response of getting user token.
 */
export interface CoreSiteUserTokenResponse {
    /**
     * User token.
     * @type {string}
     */
    token: string;

    /**
     * Site URL to use.
     * @type {string}
     */
    siteUrl: string;

    /**
     * User private token.
     * @type {string}
     */
    privateToken?: string;
}

/**
 * Site's basic info.
 */
export interface CoreSiteBasicInfo {
    /**
     * Site ID.
     * @type {string}
     */
    id: string;

    /**
     * Site URL.
     * @type {string}
     */
    siteUrl: string;

    /**
     * User's full name.
     * @type {string}
     */
    fullName: string;

    /**
     * Site's name.
     * @type {string}
     */
    siteName: string;

    /**
     * User's avatar.
     * @type {string}
     */
    avatar: string;

    /**
     * Badge to display in the site.
     * @type {number}
     */
    badge?: number;
}

/**
 * Site schema and migration function.
 */
export interface CoreSiteSchema {
    /**
     * Name of the schema.
     *
     * @type {string}
     */
    name: string;

    /**
     * Latest version of the schema (integer greater than 0).
     *
     * @type {number}
     */
    version: number;

    /**
     * Names of the tables of the site schema that can be cleared.
     *
     * @type {string[]}
     */
    canBeCleared?: string[];

    /**
     * Tables to create when installing or upgrading the schema.
     */
    tables?: SQLiteDBTableSchema[];

    /**
     * Migrates the schema in a site to the latest version.
     *
     * Called when installing and upgrading the schema, after creating the defined tables.
     *
     * @param {SQLiteDB} db Site database.
     * @param {number} oldVersion Old version of the schema or 0 if not installed.
     * @param {string} siteId Site Id to migrate.
     * @return {Promise<any> | void} Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number, siteId: string): Promise<any> | void;
}

/*
 * Service to manage and interact with sites.
 * It allows creating tables in the databases of all sites. Each service or component should be responsible of creating
 * their own database tables. Example:
 *
 * constructor(sitesProvider: CoreSitesProvider) {
 *     this.sitesProvider.createTableFromSchema(this.tableSchema);
 *
 * This provider will automatically create the tables in the databases of all the instantiated sites, and also to the
 * databases of sites instantiated from now on.
*/
@Injectable()
export class CoreSitesProvider {
    // Variables for the database.
    protected SITES_TABLE = 'sites';
    protected CURRENT_SITE_TABLE = 'current_site';
    protected SCHEMA_VERSIONS_TABLE = 'schema_versions';
    protected appTablesSchema: SQLiteDBTableSchema[] = [
        {
            name: this.SITES_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true
                },
                {
                    name: 'siteUrl',
                    type: 'TEXT',
                    notNull: true
                },
                {
                    name: 'token',
                    type: 'TEXT'
                },
                {
                    name: 'info',
                    type: 'TEXT'
                },
                {
                    name: 'privateToken',
                    type: 'TEXT'
                },
                {
                    name: 'config',
                    type: 'TEXT'
                },
                {
                    name: 'loggedOut',
                    type: 'INTEGER'
                }
            ]
        },
        {
            name: this.CURRENT_SITE_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true
                },
                {
                    name: 'siteId',
                    type: 'TEXT',
                    notNull: true,
                    unique: true
                }
            ]
        }
    ];

    // Constants to validate a site version.
    protected WORKPLACE_APP = 3;
    protected MOODLE_APP = 2;
    protected VALID_VERSION = 1;
    protected LEGACY_APP_VERSION = 0;
    protected INVALID_VERSION = -1;

    protected isWPApp: boolean;

    protected logger;
    protected services = {};
    protected sessionRestored = false;
    protected currentSite: CoreSite;
    protected sites: { [s: string]: CoreSite } = {};
    protected appDB: SQLiteDB;
    protected siteSchemasMigration: { [siteId: string]: Promise<any> } = {};

    // Schemas for site tables. Other providers can add schemas in here.
    protected siteSchemas: { [name: string]: CoreSiteSchema } = {};
    protected siteTablesSchemas: SQLiteDBTableSchema[] = [
        {
            name: this.SCHEMA_VERSIONS_TABLE,
            columns: [
                {
                    name: 'name',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'version',
                    type: 'INTEGER'
                }
            ]
        }
    ];

    // Site schema for this provider.
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreSitesProvider',
        version: 1,
        canBeCleared: [ CoreSite.WS_CACHE_TABLE ],
        tables: [
            {
                name: CoreSite.WS_CACHE_TABLE,
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
            },
            {
                name: CoreSite.CONFIG_TABLE,
                columns: [
                    {
                        name: 'name',
                        type: 'TEXT',
                        unique: true,
                        notNull: true
                    },
                    {
                        name: 'value'
                    }
                ]
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private http: HttpClient, private sitesFactory: CoreSitesFactoryProvider,
            private appProvider: CoreAppProvider, private translate: TranslateService, private urlUtils: CoreUrlUtilsProvider,
            private eventsProvider: CoreEventsProvider,  private textUtils: CoreTextUtilsProvider, private location: Location,
            private utils: CoreUtilsProvider, private injector: Injector) {
        this.logger = logger.getInstance('CoreSitesProvider');

        this.appDB = appProvider.getDB();
        this.appDB.createTablesFromSchema(this.appTablesSchema);
        this.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get the demo data for a certain "name" if it is a demo site.
     *
     * @param {string} name Name of the site to check.
     * @return {any} Site data if it's a demo site, undefined otherwise.
     */
    getDemoSiteData(name: string): any {
        const demoSites = CoreConfigConstants.demo_sites;
        if (typeof demoSites != 'undefined' && typeof demoSites[name] != 'undefined') {
            return demoSites[name];
        }
    }

    /**
     * Check if a site is valid and if it has specifics settings for authentication (like force to log in using the browser).
     * It will test both protocols if the first one fails: http and https.
     *
     * @param {string} siteUrl URL of the site to check.
     * @param {string} [protocol=https://] Protocol to use first.
     * @return {Promise<CoreSiteCheckResponse>} A promise resolved when the site is checked.
     */
    checkSite(siteUrl: string, protocol: string = 'https://'): Promise<CoreSiteCheckResponse> {
        // The formatURL function adds the protocol if is missing.
        siteUrl = this.urlUtils.formatURL(siteUrl);

        if (!this.urlUtils.isHttpURL(siteUrl)) {
            return Promise.reject(this.translate.instant('core.login.invalidsite'));
        } else if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        } else {
            return this.checkSiteWithProtocol(siteUrl, protocol).catch((error) => {
                // Do not continue checking if a critical error happened.
                if (error.critical) {
                    return Promise.reject(error);
                }

                // Retry with the other protocol.
                protocol = protocol == 'https://' ? 'http://' : 'https://';

                return this.checkSiteWithProtocol(siteUrl, protocol).catch((secondError) => {
                    if (secondError.critical) {
                        return Promise.reject(secondError);
                    }

                    // Site doesn't exist. Return the error message.
                    if (this.textUtils.getErrorMessageFromError(error)) {
                        return Promise.reject(error);
                    } else if (this.textUtils.getErrorMessageFromError(secondError)) {
                        return Promise.reject(secondError);
                    } else {
                        return this.translate.instant('core.cannotconnect');
                    }
                });
            });
        }
    }

    /**
     * Helper function to check if a site is valid and if it has specifics settings for authentication.
     *
     * @param {string} siteUrl URL of the site to check.
     * @param {string} protocol Protocol to use.
     * @return {Promise<CoreSiteCheckResponse>} A promise resolved when the site is checked.
     */
    checkSiteWithProtocol(siteUrl: string, protocol: string): Promise<CoreSiteCheckResponse> {
        let publicConfig;

        // Now, replace the siteUrl with the protocol.
        siteUrl = siteUrl.replace(/^http(s)?\:\/\//i, protocol);

        return this.siteExists(siteUrl).catch((error) => {
            // Do not continue checking if WS are not enabled.
            if (error.errorcode == 'enablewsdescription') {
                return rejectWithCriticalError(error.error, error.errorcode);
            }

            // Site doesn't exist. Try to add or remove 'www'.
            const treatedUrl = this.urlUtils.addOrRemoveWWW(siteUrl);

            return this.siteExists(treatedUrl).then(() => {
                // Success, use this new URL as site url.
                siteUrl = treatedUrl;
            }).catch((secondError) => {
                // Do not continue checking if WS are not enabled.
                if (secondError.errorcode == 'enablewsdescription') {
                    return rejectWithCriticalError(secondError.error, secondError.errorcode);
                }

                // Return the error message.
                if (this.textUtils.getErrorMessageFromError(error)) {
                    return Promise.reject(error);
                } else {
                    return Promise.reject(secondError);
                }
            });
        }).then(() => {
            // Create a temporary site to check if local_mobile is installed.
            const temporarySite = this.sitesFactory.makeSite(undefined, siteUrl);

            return temporarySite.checkLocalMobilePlugin().then((data) => {
                data.service = data.service || CoreConfigConstants.wsservice;
                this.services[siteUrl] = data.service; // No need to store it in DB.

                if (data.coreSupported ||
                    (data.code != CoreConstants.LOGIN_SSO_CODE && data.code != CoreConstants.LOGIN_SSO_INAPP_CODE)) {
                    // SSO using local_mobile not needed, try to get the site public config.
                    return temporarySite.getPublicConfig().then((config): any => {
                        publicConfig = config;

                        // Check that the user can authenticate.
                        if (!config.enablewebservices) {
                            return rejectWithCriticalError(this.translate.instant('core.login.webservicesnotenabled'));
                        } else if (!config.enablemobilewebservice) {
                            return rejectWithCriticalError(this.translate.instant('core.login.mobileservicesnotenabled'));
                        } else if (config.maintenanceenabled) {
                            let message = this.translate.instant('core.sitemaintenance');
                            if (config.maintenancemessage) {
                                message += config.maintenancemessage;
                            }

                            return rejectWithCriticalError(message);
                        }

                        // Everything ok.
                        if (data.code === 0) {
                            data.code = config.typeoflogin;
                        }

                        return data;
                    }, (error): any => {
                        // Error, check if not supported.
                        if (error.available === 1) {
                            // Service supported but an error happened. Return error.
                            error.critical = true;

                            return Promise.reject(error);
                        }

                        return data;
                    });
                }

                return data;
            }).then((data) => {
                siteUrl = temporarySite.getURL();

                return { siteUrl: siteUrl, code: data.code, warning: data.warning, service: data.service, config: publicConfig };
            });
        });

        // Return a rejected promise with a "critical" error.
        function rejectWithCriticalError(message: string, errorCode?: string): Promise<never> {
            return Promise.reject({
                error: message,
                errorcode: errorCode,
                critical: true
            });
        }
    }

    /**
     * Check if a site exists.
     *
     * @param  {string} siteUrl URL of the site to check.
     * @return {Promise} A promise to be resolved if the site exists.
     */
    siteExists(siteUrl: string): Promise<void> {
        return this.http.post(siteUrl + '/login/token.php', {}).timeout(CoreConstants.WS_TIMEOUT).toPromise().catch(() => {
            // Default error messages are kinda bad, return our own message.
            return Promise.reject({error: this.translate.instant('core.cannotconnect')});
        }).then((data: any) => {

            if (data.errorcode && (data.errorcode == 'enablewsdescription' || data.errorcode == 'requirecorrectaccess')) {
                return Promise.reject({ errorcode: data.errorcode, error: data.error });
            } else if (data.error && data.error == 'Web services must be enabled in Advanced features.') {
                return Promise.reject({ errorcode: 'enablewsdescription', error: data.error });
            }
            // Other errors are not being checked because invalid login will be always raised and we cannot differ them.
        });
    }

    /**
     * Gets a user token from the server.
     *
     * @param {string} siteUrl The site url.
     * @param {string} username User name.
     * @param {string} password Password.
     * @param {string} [service] Service to use. If not defined, it will be searched in memory.
     * @param {boolean} [retry] Whether we are retrying with a prefixed URL.
     * @return {Promise<CoreSiteUserTokenResponse>} A promise resolved when the token is retrieved.
     */
    getUserToken(siteUrl: string, username: string, password: string, service?: string, retry?: boolean)
            : Promise<CoreSiteUserTokenResponse> {
        if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        }

        if (!service) {
            service = this.determineService(siteUrl);
        }

        const params = {
                username: username,
                password: password,
                service: service
            },
            loginUrl = siteUrl + '/login/token.php',
            promise = this.http.post(loginUrl, params).timeout(CoreConstants.WS_TIMEOUT).toPromise();

        return promise.then((data: any): any => {
            if (typeof data == 'undefined') {
                return Promise.reject(this.translate.instant('core.cannotconnect'));
            } else {
                if (typeof data.token != 'undefined') {
                    return { token: data.token, siteUrl: siteUrl, privateToken: data.privatetoken };
                } else {

                    if (typeof data.error != 'undefined') {
                        // We only allow one retry (to avoid loops).
                        if (!retry && data.errorcode == 'requirecorrectaccess') {
                            siteUrl = this.urlUtils.addOrRemoveWWW(siteUrl);

                            return this.getUserToken(siteUrl, username, password, service, true);
                        } else if (data.errorcode == 'missingparam') {
                            // It seems the server didn't receive all required params, it could be due to a redirect.
                            return this.utils.checkRedirect(loginUrl).then((redirect) => {
                                if (redirect) {
                                    return Promise.reject({ error: this.translate.instant('core.login.sitehasredirect') });
                                } else {
                                    return Promise.reject({ error: data.error, errorcode: data.errorcode });
                                }
                            });
                        } else if (typeof data.errorcode != 'undefined') {
                            return Promise.reject({ error: data.error, errorcode: data.errorcode });
                        } else {
                            return Promise.reject(data.error);
                        }
                    } else {
                        return Promise.reject(this.translate.instant('core.login.invalidaccount'));
                    }
                }
            }
        }, () => {
            return Promise.reject(this.translate.instant('core.cannotconnect'));
        });
    }

    /**
     * Add a new site to the site list and authenticate the user in this site.
     *
     * @param {string} siteUrl The site url.
     * @param {string} token User's token.
     * @param {string} [privateToken=''] User's private token.
     * @param {boolean} [login=true] Whether to login the user in the site. Defaults to true.
     * @return {Promise<string>} A promise resolved with siteId when the site is added and the user is authenticated.
     */
    newSite(siteUrl: string, token: string, privateToken: string = '', login: boolean = true): Promise<string> {
        if (typeof login != 'boolean') {
            login = true;
        }

        // Create a "candidate" site to fetch the site info.
        let candidateSite = this.sitesFactory.makeSite(undefined, siteUrl, token, undefined, privateToken),
            isNewSite = true;

        return candidateSite.fetchSiteInfo().then((info) => {
            const result = this.isValidMoodleVersion(info);
            if (result == this.VALID_VERSION) {
                const siteId = this.createSiteID(info.siteurl, info.username);

                // Check if the site already exists.
                return this.getSite(siteId).catch(() => {
                    // Not exists.
                }).then((site) => {
                    if (site) {
                        // Site already exists, update its data and use it.
                        isNewSite = false;
                        candidateSite = site;
                        candidateSite.setToken(token);
                        candidateSite.setPrivateToken(privateToken);
                        candidateSite.setInfo(info);

                    } else {
                        // New site, set site ID and info.
                        isNewSite = true;
                        candidateSite.setId(siteId);
                        candidateSite.setInfo(info);

                        // Create database tables before login and before any WS call.
                        return this.migrateSiteSchemas(candidateSite);
                    }

                }).then(() => {

                    // Try to get the site config.
                    return this.getSiteConfig(candidateSite).catch((error) => {
                        // Ignore errors if it's not a new site, we'll use the config already stored.
                        if (isNewSite) {
                            return Promise.reject(error);
                        }
                    }).then((config) => {
                        if (typeof config != 'undefined') {
                            candidateSite.setConfig(config);
                        }

                        // Add site to sites list.
                        this.addSite(siteId, siteUrl, token, info, privateToken, config);
                        this.sites[siteId] = candidateSite;

                        if (login) {
                            // Turn candidate site into current site.
                            this.currentSite = candidateSite;
                            // Store session.
                            this.login(siteId);
                        }

                        this.eventsProvider.trigger(CoreEventsProvider.SITE_ADDED, info, siteId);

                        return siteId;
                    });
                });
            }

            return this.treatInvalidAppVersion(result, siteUrl);
        });
    }

    /**
     * Having the result of isValidMoodleVersion, it treats the error message to be shown.
     *
     * @param {number} result Result returned by isValidMoodleVersion function.
     * @param {string} siteUrl The site url.
     * @param  {string} siteId If site is already added, it will invalidate the token.
     * @return {Promise<any>} A promise rejected with the error info.
     */
    protected treatInvalidAppVersion(result: number, siteUrl: string, siteId?: string): Promise<any> {
        let errorCode,
            errorKey,
            errorExtra = '',
            errorKeyParams;

        switch (result) {
            case this.LEGACY_APP_VERSION:
                errorKey = 'core.login.legacymoodleversion';
                errorCode = 'legacymoodleversion';

                if (this.appProvider.isDesktop()) {
                    errorKey += 'desktop';
                    errorKeyParams = {$a: siteUrl};
                }

                if (this.appProvider.isWindows() || this.appProvider.isLinux()) {
                    errorExtra = this.translate.instant('core.login.legacymoodleversiondesktopdownloadold');
                }

                break;
            case this.MOODLE_APP:
                errorKey = 'core.login.connecttomoodleapp';
                errorCode = 'connecttomoodleapp';
                break;
            case this.WORKPLACE_APP:
                errorKey = 'core.login.connecttoworkplaceapp';
                errorCode = 'connecttoworkplaceapp';
                break;
            default:
                errorCode = 'invalidmoodleversion';
                errorKey = 'core.login.invalidmoodleversion';
        }

        let promise;

        if (siteId) {
            promise = this.setSiteLoggedOut(siteId, true);
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
           return Promise.reject({
                error: this.translate.instant(errorKey, errorKeyParams) + errorExtra,
                errorcode: errorCode
            });
        });
    }

    /**
     * Create a site ID based on site URL and username.
     *
     * @param {string} siteUrl The site url.
     * @param {string} username Username.
     * @return {string} Site ID.
     */
    createSiteID(siteUrl: string, username: string): string {
        return <string> Md5.hashAsciiStr(siteUrl + username);
    }

    /**
     * Function for determine which service we should use (default or extended plugin).
     *
     * @param {string} siteUrl The site URL.
     * @return {string} The service shortname.
     */
    determineService(siteUrl: string): string {
        // We need to try siteUrl in both https or http (due to loginhttps setting).

        // First http://
        siteUrl = siteUrl.replace('https://', 'http://');
        if (this.services[siteUrl]) {
            return this.services[siteUrl];
        }

        // Now https://
        siteUrl = siteUrl.replace('http://', 'https://');
        if (this.services[siteUrl]) {
            return this.services[siteUrl];
        }

        // Return default service.
        return CoreConfigConstants.wsservice;
    }

    /**
     * Check for the minimum required version.
     *
     * @param {any} info Site info.
     * @return {number} Either VALID_VERSION, LEGACY_APP_VERSION, WORKPLACE_APP, MOODLE_APP or INVALID_VERSION.
     */
    protected isValidMoodleVersion(info: any): number {
        if (!info) {
            return this.INVALID_VERSION;
        }

        const version24 = 2012120300, // Moodle 2.4 version.
            release24 = '2.4',
            version31 = 2016052300,
            release31 = '3.1';

        // Try to validate by version.
        if (info.version) {
            const version = parseInt(info.version, 10);
            if (!isNaN(version)) {
                if (version >= version31) {
                    return this.validateWorkplaceVersion(info);
                } else if (version >= version24) {
                    return this.LEGACY_APP_VERSION;
                }
            }
        }

        // We couldn't validate by version number. Let's try to validate by release number.
        const release = this.getReleaseNumber(info.release || '');
        if (release) {
            if (release >= release31) {
                return this.validateWorkplaceVersion(info);
            }
            if (release >= release24) {
                return this.LEGACY_APP_VERSION;
            }
        }

        // Couldn't validate it.
        return this.INVALID_VERSION;
    }

    /**
     * Check if needs to be redirected to specific Workplace App or general Moodle App.
     *
     * @param {any} info Site info.
     * @return {number} Either VALID_VERSION, WORKPLACE_APP or MOODLE_APP.
     */
    protected validateWorkplaceVersion(info: any): number {
        const isWorkplace = !!info.functions && info.functions.some((func) => {
            return func.name == 'tool_program_get_user_programs';
        });

        if (typeof this.isWPApp == 'undefined') {
            this.isWPApp = !!WP_PROVIDER && WP_PROVIDER.name == 'AddonBlockProgramsOverviewModule' &&
                !!this.injector.get(WP_PROVIDER, false);
        }

        if (!this.isWPApp && isWorkplace) {
            return this.WORKPLACE_APP;
        }

        if (this.isWPApp && !isWorkplace) {
            return this.MOODLE_APP;
        }

        return this.VALID_VERSION;
    }

    /**
     * Returns the release number from site release info.
     *
     * @param  {string}  rawRelease Raw release info text.
     * @return {string}   Release number or empty.
     */
    getReleaseNumber(rawRelease: string): string {
        const matches = rawRelease.match(/^\d(\.\d(\.\d+)?)?/);
        if (matches) {
            return matches[0];
        }

        return '';
    }

    /**
     * Check if site info is valid. If it's not, return error message.
     *
     * @param {any} info Site info.
     * @return {any} True if valid, object with error message to show and its params if not valid.
     */
    protected validateSiteInfo(info: any): any {
        if (!info.firstname || !info.lastname) {
            const moodleLink = `<a core-link href="${info.siteurl}">${info.siteurl}</a>`;

            return { error: 'core.requireduserdatamissing', params: { $a: moodleLink } };
        }

        return true;
    }

    /**
     * Saves a site in local DB.
     *
     * @param {string} id Site ID.
     * @param {string} siteUrl Site URL.
     * @param {string} token User's token in the site.
     * @param {any} info Site's info.
     * @param {string} [privateToken=''] User's private token.
     * @param {any} [config] Site config (from tool_mobile_get_config).
     * @return {Promise<any>} Promise resolved when done.
     */
    addSite(id: string, siteUrl: string, token: string, info: any, privateToken: string = '', config?: any): Promise<any> {
        const entry = {
            id: id,
            siteUrl: siteUrl,
            token: token,
            info: info ? JSON.stringify(info) : info,
            privateToken: privateToken,
            config: config ? JSON.stringify(config) : config,
            loggedOut: 0
        };

        return this.appDB.insertRecord(this.SITES_TABLE, entry);
    }

    /**
     * Login a user to a site from the list of sites.
     *
     * @param {string} siteId ID of the site to load.
     * @param {string} [pageName] Name of the page to go once authenticated if logged out. If not defined, site initial page.
     * @param {any} [params] Params of the page to go once authenticated if logged out.
     * @return {Promise<boolean>} Promise resolved with true if site is loaded, resolved with false if cannot login.
     */
    loadSite(siteId: string, pageName?: string, params?: any): Promise<boolean> {
        this.logger.debug(`Load site ${siteId}`);

        return this.getSite(siteId).then((site) => {
            this.currentSite = site;

            if (site.isLoggedOut()) {
                // Logged out, trigger session expired event and stop.
                this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {
                    pageName: pageName,
                    params: params
                }, site.getId());

                return false;
            }

            // Check if local_mobile was installed to Moodle.
            return site.checkIfLocalMobileInstalledAndNotUsed().then(() => {
                // Local mobile was added. Throw invalid session to force reconnect and create a new token.
                this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {
                    pageName: pageName,
                    params: params
                }, siteId);

                return false;
            }, () => {
                this.login(siteId);

                // Update site info. We don't block the UI.
                this.updateSiteInfo(siteId);

                return true;
            });
        });
    }

    /**
     * Get current site.
     *
     * @return {CoreSite} Current site.
     */
    getCurrentSite(): CoreSite {
        return this.currentSite;
    }

    /**
     * Get the site home ID of the current site.
     *
     * @return {number} Current site home ID.
     */
    getCurrentSiteHomeId(): number {
        if (this.currentSite) {
            return this.currentSite.getSiteHomeId();
        } else {
            return 1;
        }
    }

    /**
     * Get current site ID.
     *
     * @return {string} Current site ID.
     */
    getCurrentSiteId(): string {
        if (this.currentSite) {
            return this.currentSite.getId();
        } else {
            return '';
        }
    }

    /**
     * Get current site User ID.
     *
     * @return {number} Current site User ID.
     */
    getCurrentSiteUserId(): number {
        if (this.currentSite) {
            return this.currentSite.getUserId();
        } else {
            return 0;
        }
    }

    /**
     * Check if the user is logged in a site.
     *
     * @return {boolean} Whether the user is logged in a site.
     */
    isLoggedIn(): boolean {
        return typeof this.currentSite != 'undefined' && typeof this.currentSite.token != 'undefined' &&
            this.currentSite.token != '';
    }

    /**
     * Delete a site from the sites list.
     *
     * @param {string} siteId ID of the site to delete.
     * @return {Promise<any>} Promise to be resolved when the site is deleted.
     */
    deleteSite(siteId: string): Promise<any> {
        this.logger.debug(`Delete site ${siteId}`);

        if (typeof this.currentSite != 'undefined' && this.currentSite.id == siteId) {
            this.logout();
        }

        return this.getSite(siteId).then((site: CoreSite) => {
            return site.deleteDB().then(() => {
                // Site DB deleted, now delete the app from the list of sites.
                delete this.sites[siteId];

                return this.appDB.deleteRecords(this.SITES_TABLE, { id: siteId }).then(() => {
                    // Site deleted from sites list, now delete the folder.
                    return site.deleteFolder();
                }, () => {
                    // DB remove shouldn't fail, but we'll go ahead even if it does.
                    return site.deleteFolder();
                }).then(() => {
                    this.eventsProvider.trigger(CoreEventsProvider.SITE_DELETED, site, siteId);
                });
            });
        });
    }

    /**
     * Check if there are sites stored.
     *
     * @return {Promise<boolean>} Promise resolved with true if there are sites and false if there aren't.
     */
    hasSites(): Promise<boolean> {
        return this.appDB.countRecords(this.SITES_TABLE).then((count) => {
            return count > 0;
        });
    }

    /**
     * Returns a site object.
     *
     * @param {string} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise<CoreSite>} Promise resolved with the site.
     */
    getSite(siteId?: string): Promise<CoreSite> {
        if (!siteId) {
            return this.currentSite ? Promise.resolve(this.currentSite) : Promise.reject(null);
        } else if (this.currentSite && this.currentSite.getId() == siteId) {
            return Promise.resolve(this.currentSite);
        } else if (typeof this.sites[siteId] != 'undefined') {
            return Promise.resolve(this.sites[siteId]);
        } else {
            // Retrieve and create the site.
            return this.appDB.getRecord(this.SITES_TABLE, { id: siteId }).then((data) => {
                return this.makeSiteFromSiteListEntry(data);
            });
        }
    }

    /**
     * Create a site from an entry of the sites list DB. The new site is added to the list of "cached" sites: this.sites.
     *
     * @param {any} entry Site list entry.
     * @return {Promise<CoreSite>} Promised resolved with the created site.
     */
    makeSiteFromSiteListEntry(entry: any): Promise<CoreSite> {
        let site: CoreSite,
            info = entry.info,
            config = entry.config;

        // Parse info and config.
        info = info ? this.textUtils.parseJSON(info) : info;
        config = config ? this.textUtils.parseJSON(config) : config;

        site = this.sitesFactory.makeSite(entry.id, entry.siteUrl, entry.token,
            info, entry.privateToken, config, entry.loggedOut == 1);

        return this.migrateSiteSchemas(site).then(() => {
            // Set site after migrating schemas, or a call to getSite could get the site while tables are being created.
            this.sites[entry.id] = site;

            return site;
        });
    }

    /**
     * Returns if the site is the current one.
     *
     * @param {string|CoreSite} [site] Site object or siteId to be compared. If not defined, use current site.
     * @return {boolean} Whether site or siteId is the current one.
     */
    isCurrentSite(site: string | CoreSite): boolean {
        if (!site || !this.currentSite) {
            return !!this.currentSite;
        }

        const siteId = typeof site == 'object' ? site.getId() : site;

        return this.currentSite.getId() === siteId;
    }

    /**
     * Returns the database object of a site.
     *
     * @param {string} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise<SQLiteDB>} Promise resolved with the database.
     */
    getSiteDb(siteId: string): Promise<SQLiteDB> {
        return this.getSite(siteId).then((site) => {
            return site.getDb();
        });
    }

    /**
     * Returns the site home ID of a site.
     *
     * @param  {number} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise}         Promise resolved with site home ID.
     */
    getSiteHomeId(siteId?: string): Promise<number> {
        return this.getSite(siteId).then((site) => {
            return site.getSiteHomeId();
        });
    }

    /**
     * Get the list of sites stored.
     *
     * @param {String[]} [ids] IDs of the sites to get. If not defined, return all sites.
     * @return {Promise<CoreSiteBasicInfo[]>} Promise resolved when the sites are retrieved.
     */
    getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        return this.appDB.getAllRecords(this.SITES_TABLE).then((sites) => {
            const formattedSites = [];
            sites.forEach((site) => {
                if (!ids || ids.indexOf(site.id) > -1) {
                    // Parse info.
                    const siteInfo = site.info ? this.textUtils.parseJSON(site.info) : site.info,
                        basicInfo: CoreSiteBasicInfo = {
                            id: site.id,
                            siteUrl: site.siteUrl,
                            fullName: siteInfo && siteInfo.fullname,
                            siteName: CoreConfigConstants.sitename ? CoreConfigConstants.sitename : siteInfo && siteInfo.sitename,
                            avatar: siteInfo && siteInfo.userpictureurl
                        };
                    formattedSites.push(basicInfo);
                }
            });

            return formattedSites;
        });
    }

    /**
     * Get the list of sites stored, sorted by URL and full name.
     *
     * @param {String[]} [ids] IDs of the sites to get. If not defined, return all sites.
     * @return {Promise<CoreSiteBasicInfo[]>} Promise resolved when the sites are retrieved.
     */
    getSortedSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        return this.getSites(ids).then((sites) => {
            // Sort sites by url and ful lname.
            sites.sort((a, b) => {
                // First compare by site url without the protocol.
                let compareA = a.siteUrl.replace(/^https?:\/\//, '').toLowerCase(),
                    compareB = b.siteUrl.replace(/^https?:\/\//, '').toLowerCase();
                const compare = compareA.localeCompare(compareB);

                if (compare !== 0) {
                    return compare;
                }

                // If site url is the same, use fullname instead.
                compareA = a.fullName.toLowerCase().trim();
                compareB = b.fullName.toLowerCase().trim();

                return compareA.localeCompare(compareB);
            });

            return sites;
        });
    }

    /**
     * Get the list of IDs of sites stored and not logged out.
     *
     * @return {Promise<string[]>} Promise resolved when the sites IDs are retrieved.
     */
    getLoggedInSitesIds(): Promise<string[]> {
        return this.appDB.getRecords(this.SITES_TABLE, {loggedOut : 0}).then((sites) => {
            return sites.map((site) => {
                return site.id;
            });
        });
    }

    /**
     * Get the list of IDs of sites stored.
     *
     * @return {Promise<string[]>} Promise resolved when the sites IDs are retrieved.
     */
    getSitesIds(): Promise<string[]> {
        return this.appDB.getAllRecords(this.SITES_TABLE).then((sites) => {
            return sites.map((site) => {
                return site.id;
            });
        });
    }

    /**
     * Login the user in a site.
     *
     * @param {string} siteid ID of the site the user is accessing.
     * @return {Promise<void>} Promise resolved when current site is stored.
     */
    login(siteId: string): Promise<void> {
        const entry = {
            id: 1,
            siteId: siteId
        };

        return this.appDB.insertRecord(this.CURRENT_SITE_TABLE, entry).then(() => {
            this.eventsProvider.trigger(CoreEventsProvider.LOGIN, {}, siteId);
        });
    }

    /**
     * Logout the user.
     *
     * @return {Promise<any>} Promise resolved when the user is logged out.
     */
    logout(): Promise<any> {
        if (!this.currentSite) {
            // Already logged out.
            return Promise.resolve();
        }

        const siteId = this.currentSite.getId(),
            siteConfig = this.currentSite.getStoredConfig(),
            promises = [];

        this.currentSite = undefined;

        if (siteConfig && siteConfig.tool_mobile_forcelogout == '1') {
            promises.push(this.setSiteLoggedOut(siteId, true));
        }

        promises.push(this.appDB.deleteRecords(this.CURRENT_SITE_TABLE, { id: 1 }));

        return Promise.all(promises).finally(() => {
            // Due to DeepLinker, we need to remove the path from the URL, otherwise some pages are re-created when they shouldn't.
            this.location.replaceState('');

            this.eventsProvider.trigger(CoreEventsProvider.LOGOUT, {}, siteId);
        });
    }

    /**
     * Restores the session to the previous one so the user doesn't has to login everytime the app is started.
     *
     * @return {Promise<any>} Promise resolved if a session is restored.
     */
    restoreSession(): Promise<any> {
        if (this.sessionRestored) {
            return Promise.reject(null);
        }

        this.sessionRestored = true;

        return this.appDB.getRecord(this.CURRENT_SITE_TABLE, { id: 1 }).then((currentSite) => {
            const siteId = currentSite.siteId;
            this.logger.debug(`Restore session in site ${siteId}`);

            return this.loadSite(siteId);
        }).catch(() => {
            // No current session.
        });
    }

    /**
     * Mark or unmark a site as logged out so the user needs to authenticate again.
     *
     * @param {string} siteId ID of the site.
     * @param {boolean} loggedOut True to set the site as logged out, false otherwise.
     * @return {Promise<any>} Promise resolved when done.
     */
    setSiteLoggedOut(siteId: string, loggedOut: boolean): Promise<any> {
        return this.getSite(siteId).then((site) => {
            const newValues = {
                token: '', // Erase the token for security.
                loggedOut: loggedOut ? 1 : 0
            };

            site.setLoggedOut(loggedOut);

            return this.appDB.updateRecords(this.SITES_TABLE, newValues, { id: siteId });
        });
    }

    /**
     * Unset current site.
     */
    unsetCurrentSite(): void {
        this.currentSite = undefined;
    }

    /**
     * Updates a site's token.
     *
     * @param {string} siteUrl Site's URL.
     * @param {string} username Username.
     * @param {string} token User's new token.
     * @param {string} [privateToken=''] User's private token.
     * @return {Promise<any>} A promise resolved when the site is updated.
     */
    updateSiteToken(siteUrl: string, username: string, token: string, privateToken: string = ''): Promise<any> {
        const siteId = this.createSiteID(siteUrl, username);

        return this.updateSiteTokenBySiteId(siteId, token, privateToken).then(() => {
            return this.login(siteId);
        });
    }

    /**
     * Updates a site's token using siteId.
     *
     * @param {string} siteId Site Id.
     * @param {string} token User's new token.
     * @param {string} [privateToken=''] User's private token.
     * @return {Promise<any>} A promise resolved when the site is updated.
     */
    updateSiteTokenBySiteId(siteId: string, token: string, privateToken: string = ''): Promise<any> {
        return this.getSite(siteId).then((site) => {
            const newValues = {
                token: token,
                privateToken: privateToken,
                loggedOut: 0
            };

            site.token = token;
            site.privateToken = privateToken;
            site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

            return this.appDB.updateRecords(this.SITES_TABLE, newValues, { id: siteId });
        });
    }

    /**
     * Updates a site's info.
     *
     * @param {string} siteid Site's ID.
     * @return {Promise<any>} A promise resolved when the site is updated.
     */
    updateSiteInfo(siteId: string): Promise<any> {
        return this.getSite(siteId).then((site) => {
            return site.fetchSiteInfo().then((info) => {
                site.setInfo(info);

                const versionCheck = this.isValidMoodleVersion(info);
                if (versionCheck != this.VALID_VERSION) {
                    // The Moodle version is not supported, reject.
                    return this.treatInvalidAppVersion(versionCheck, site.getURL(), site.getId());
                }

                // Try to get the site config.
                return this.getSiteConfig(site).catch(() => {
                    // Error getting config, keep the current one.
                }).then((config) => {
                    const newValues: any = {
                        info: JSON.stringify(info),
                        loggedOut: site.isLoggedOut() ? 1 : 0
                    };

                    if (typeof config != 'undefined') {
                        site.setConfig(config);
                        newValues.config = JSON.stringify(config);
                    }

                    return this.appDB.updateRecords(this.SITES_TABLE, newValues, { id: siteId }).finally(() => {
                        this.eventsProvider.trigger(CoreEventsProvider.SITE_UPDATED, info, siteId);
                    });
                });
            });
        });
    }

    /**
     * Updates a site's info.
     *
     * @param {string} siteUrl  Site's URL.
     * @param {string} username Username.
     * @return {Promise<any>} A promise to be resolved when the site is updated.
     */
    updateSiteInfoByUrl(siteUrl: string, username: string): Promise<any> {
        const siteId = this.createSiteID(siteUrl, username);

        return this.updateSiteInfo(siteId);
    }

    /**
     * Get the site IDs a URL belongs to.
     * Someone can have more than one account in the same site, that's why this function returns an array of IDs.
     *
     * @param {string} url URL to check.
     * @param {boolean} [prioritize] True if it should prioritize current site. If the URL belongs to current site then it won't
     *                               check any other site, it will only return current site.
     * @param {string} [username] If set, it will return only the sites where the current user has this username.
     * @return {Promise<string[]>} Promise resolved with the site IDs (array).
     */
    getSiteIdsFromUrl(url: string, prioritize?: boolean, username?: string): Promise<string[]> {
        // If prioritize is true, check current site first.
        if (prioritize && this.currentSite && this.currentSite.containsUrl(url)) {
            if (!username || this.currentSite.getInfo().username == username) {
                return Promise.resolve([this.currentSite.getId()]);
            }
        }

        // Check if URL has http(s) protocol.
        if (!url.match(/^https?:\/\//i)) {
            // URL doesn't have http(s) protocol. Check if it has any protocol.
            if (this.urlUtils.isAbsoluteURL(url)) {
                // It has some protocol. Return empty array.
                return Promise.resolve([]);
            } else {
                // No protocol, probably a relative URL. Return current site.
                if (this.currentSite) {
                    return Promise.resolve([this.currentSite.getId()]);
                } else {
                    return Promise.resolve([]);
                }
            }
        }

        return this.appDB.getAllRecords(this.SITES_TABLE).then((siteEntries) => {
            const ids = [];
            const promises = [];

            siteEntries.forEach((site) => {
                if (!this.sites[site.id]) {
                    promises.push(this.makeSiteFromSiteListEntry(site));
                }

                if (this.sites[site.id].containsUrl(url)) {
                    if (!username || this.sites[site.id].getInfo().username == username) {
                        ids.push(site.id);
                    }
                }
            });

            return Promise.all(promises).then(() => {
                return ids;
            });
        }).catch(() => {
            // Shouldn't happen.
            return [];
        });
    }

    /**
     * Get the site ID stored in DB as current site.
     *
     * @return {Promise<string>} Promise resolved with the site ID.
     */
    getStoredCurrentSiteId(): Promise<string> {
        return this.appDB.getRecord(this.CURRENT_SITE_TABLE, { id: 1 }).then((currentSite) => {
            return currentSite.siteId;
        });
    }

    /**
     * Get the public config of a certain site.
     *
     * @param {string} siteUrl URL of the site.
     * @return {Promise<any>} Promise resolved with the public config.
     */
    getSitePublicConfig(siteUrl: string): Promise<any> {
        const temporarySite = this.sitesFactory.makeSite(undefined, siteUrl);

        return temporarySite.getPublicConfig();
    }

    /**
     * Get site config.
     *
     * @param {any} site The site to get the config.
     * @return {Promise<any>} Promise resolved with config if available.
     */
    protected getSiteConfig(site: CoreSite): Promise<any> {
        if (!site.wsAvailable('tool_mobile_get_config')) {
            // WS not available, cannot get config.
            return Promise.resolve();
        }

        return site.getConfig(undefined, true);
    }

    /**
     * Check if a certain feature is disabled in a site.
     *
     * @param {string} name Name of the feature to check.
     * @param {string} [siteId] The site ID. If not defined, current site (if available).
     * @return {Promise<boolean>} Promise resolved with true if disabled.
     */
    isFeatureDisabled(name: string, siteId?: string): Promise<boolean> {
        return this.getSite(siteId).then((site) => {
            return site.isFeatureDisabled(name);
        });
    }

    /**
     * Create a table in all the sites databases.
     *
     * @param {SQLiteDBTamableSchema} table Table schema.
     */
    createTableFromSchema(table: SQLiteDBTableSchema): void {
        this.createTablesFromSchema([table]);
    }

    /**
     * Create several tables in all the sites databases.
     *
     * @param {SQLiteDBTamableSchema[]} tables List of tables schema.
     */
    createTablesFromSchema(tables: SQLiteDBTableSchema[]): void {
        // Add the tables to the list of schemas. This list is to create all the tables in new sites.
        this.siteTablesSchemas = this.siteTablesSchemas.concat(tables);

        // Now create these tables in current sites.
        for (const id in this.sites) {
            this.sites[id].getDb().createTablesFromSchema(tables);
        }
    }

    /**
     * Check if a WS is available in the current site, if any.
     *
     * @param {string} method WS name.
     * @param {boolean} [checkPrefix=true] When true also checks with the compatibility prefix.
     * @return {boolean} Whether the WS is available.
     */
    wsAvailableInCurrentSite(method: string, checkPrefix: boolean = true): boolean {
        const site = this.getCurrentSite();

        return site && site.wsAvailable(method, checkPrefix);
    }

    /**
     * Check if a site is a legacy site by its info.
     *
     * @param {any} info The site info.
     * @return {boolean} Whether it's a legacy Moodle.
     */
    isLegacyMoodleByInfo(info: any): boolean {
        return this.isValidMoodleVersion(info) == this.LEGACY_APP_VERSION;
    }

    /**
     * Register a site schema.
     */
    registerSiteSchema(schema: CoreSiteSchema): void {
        this.siteSchemas[schema.name] = schema;
    }

    /**
     * Install and upgrade all the registered schemas and tables.
     *
     * @param {CoreSite} site Site.
     * @return {Promise<any>} Promise resolved when done.
     */
    migrateSiteSchemas(site: CoreSite): Promise<any> {
        const db = site.getDb();

        if (this.siteSchemasMigration[site.id]) {
            return this.siteSchemasMigration[site.id];
        }

        this.logger.debug(`Migrating all schemas of ${site.id}`);

        // First create tables not registerd with name/version.
        const promise = db.createTablesFromSchema(this.siteTablesSchemas).then(() => {
            // Fetch installed versions of the schema.
            return db.getAllRecords(this.SCHEMA_VERSIONS_TABLE).then((records) => {
                const versions = {};
                records.forEach((record) => {
                    versions[record.name] = record.version;
                });

                const promises = [];
                for (const name in this.siteSchemas) {
                    const schema = this.siteSchemas[name];
                    const oldVersion = versions[name] || 0;
                    if (oldVersion >= schema.version) {
                        continue;
                    }

                    this.logger.debug(`Migrating schema '${name}' of ${site.id} from version ${oldVersion} to ${schema.version}`);

                    let promise: Promise<any> = Promise.resolve();
                    if (schema.tables) {
                        promise = promise.then(() => db.createTablesFromSchema(schema.tables));
                    }
                    if (schema.migrate) {
                        promise = promise.then(() => schema.migrate(db, oldVersion, site.id));
                    }

                    // Set installed version.
                    promise = promise.then(() => db.insertRecord(this.SCHEMA_VERSIONS_TABLE, {name, version: schema.version}));

                    promises.push(promise);
                }

                return Promise.all(promises);
            });
        });

        this.siteSchemasMigration[site.id] = promise;

        return promise.finally(() => {
            delete this.siteSchemasMigration[site.id];
        });
    }

    /**
     * Check if a URL is the root URL of any of the stored sites.
     *
     * @param {string} url URL to check.
     * @param {string} [username] Username to check.
     * @return {Promise<{site: CoreSite, siteIds: string[]}>} Promise resolved with site to use and the list of sites that have
     *                                   the URL. Site will be undefined if it isn't the root URL of any stored site.
     */
    isStoredRootURL(url: string, username?: string): Promise<{site: CoreSite, siteIds: string[]}> {
        // Check if the site is stored.
        return this.getSiteIdsFromUrl(url, true, username).then((siteIds) => {
            const result = {
                siteIds: siteIds,
                site: undefined
            };

            if (siteIds.length > 0) {
                // If more than one site is returned it usually means there are different users stored. Use any of them.
                return this.getSite(siteIds[0]).then((site) => {
                    const siteUrl = this.textUtils.removeEndingSlash(this.urlUtils.removeProtocolAndWWW(site.getURL())),
                        treatedUrl = this.textUtils.removeEndingSlash(this.urlUtils.removeProtocolAndWWW(url));

                    if (siteUrl == treatedUrl) {
                        result.site = site;
                    }

                    return result;
                });
            }

            return result;
        });
    }

    /**
     * Returns the Site Schema names that can be cleared on space storage.
     *
     * @return {string[]} Name of the site schemas.
     */
    getSiteTableSchemasToClear(): string[] {
        let reset = [];
        for (const name in this.siteSchemas) {
            if (this.siteSchemas[name].canBeCleared) {
                reset = reset.concat(this.siteSchemas[name].canBeCleared);
            }
        }

        return reset;
    }
}
