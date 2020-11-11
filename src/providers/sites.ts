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

import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider, CoreAppSchema, CoreStoreConfig } from './app';
import { CoreEventsProvider } from './events';
import { CoreLoggerProvider } from './logger';
import { CoreSitesFactoryProvider } from './sites-factory';
import { CoreDomUtilsProvider } from './utils/dom';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUrlUtilsProvider } from './utils/url';
import { CoreUtilsProvider } from './utils/utils';
import { CoreWSProvider } from './ws';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../configconstants';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { Md5 } from 'ts-md5/dist/md5';
import { WP_PROVIDER } from '@app/app.module';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Response of checking if a site exists and its configuration.
 */
export interface CoreSiteCheckResponse {
    /**
     * Code to identify the authentication method to use.
     */
    code: number;

    /**
     * Site url to use (might have changed during the process).
     */
    siteUrl: string;

    /**
     * Service used.
     */
    service: string;

    /**
     * Code of the warning message to show to the user.
     */
    warning?: string;

    /**
     * Site public config (if available).
     */
    config?: any;
}

/**
 * Response of getting user token.
 */
export interface CoreSiteUserTokenResponse {
    /**
     * User token.
     */
    token: string;

    /**
     * Site URL to use.
     */
    siteUrl: string;

    /**
     * User private token.
     */
    privateToken?: string;
}

/**
 * Site's basic info.
 */
export interface CoreSiteBasicInfo {
    /**
     * Site ID.
     */
    id: string;

    /**
     * Site URL.
     */
    siteUrl: string;

    /**
     * User's full name.
     */
    fullName: string;

    /**
     * Site's name.
     */
    siteName: string;

    /**
     * User's avatar.
     */
    avatar: string;

    /**
     * Badge to display in the site.
     */
    badge?: number;

    /**
     * Site home ID.
     */
    siteHomeId?: number;
}

/**
 * Site schema and migration function.
 */
export interface CoreSiteSchema {
    /**
     * Name of the schema.
     */
    name: string;

    /**
     * Latest version of the schema (integer greater than 0).
     */
    version: number;

    /**
     * Names of the tables of the site schema that can be cleared.
     */
    canBeCleared?: string[];

    /**
     * If true, the schema will only be applied to the current site. Otherwise it will be applied to all sites.
     * If you're implementing a site plugin, please set it to true.
     */
    onlyCurrentSite?: boolean;

    /**
     * Tables to create when installing or upgrading the schema.
     */
    tables?: SQLiteDBTableSchema[];

    /**
     * Migrates the schema in a site to the latest version.
     *
     * Called when installing and upgrading the schema, after creating the defined tables.
     *
     * @param db Site database.
     * @param oldVersion Old version of the schema or 0 if not installed.
     * @param siteId Site Id to migrate.
     * @return Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number, siteId: string): Promise<any> | void;
}

/**
 * Data about sites to be listed.
 */
export interface  CoreLoginSiteInfo {
    /**
     * Site name.
     */
    name: string;

    /**
     * Site alias.
     */
    alias?: string;

    /**
     * URL of the site.
     */
    url: string;

    /**
     * Image URL of the site.
     */
    imageurl?: string;

    /**
     * City of the site.
     */
    city?: string;

    /**
     * Countrycode of the site.
     */
    countrycode?: string;
}

/**
 * Registered site schema.
 */
export interface CoreRegisteredSiteSchema extends CoreSiteSchema {
    /**
     * Site ID to apply the schema to. If not defined, all sites.
     */
    siteId?: string;
}

/**
 * Possible reading strategies (for cache).
 */
export const enum CoreSitesReadingStrategy {
    OnlyCache,
    PreferCache,
    OnlyNetwork,
    PreferNetwork,
}

/**
 * Common options used when calling a WS through CoreSite.
 */
export type CoreSitesCommonWSOptions = {
    readingStrategy?: CoreSitesReadingStrategy; // Reading strategy.
    siteId?: string; // Site ID. If not defined, current site.
};

/*
 * Service to manage and interact with sites.
 * It allows creating tables in the databases of all sites. Each service or component should be responsible of creating
 * their own database tables. Example:
 *
 * constructor(sitesProvider: CoreSitesProvider) {
 *     this.sitesProvider.registerSiteSchema(this.tableSchema);
 *
 * This provider will automatically create the tables in the databases of all the instantiated sites, and also to the
 * databases of sites instantiated from now on.
*/
@Injectable()
export class CoreSitesProvider {
    // Variables for the database.
    static SITES_TABLE = 'sites_2';
    static CURRENT_SITE_TABLE = 'current_site';
    static SCHEMA_VERSIONS_TABLE = 'schema_versions';
    protected appTablesSchema: CoreAppSchema = {
        name: 'CoreSitesProvider',
        version: 2,
        tables: [
            {
                name: CoreSitesProvider.SITES_TABLE,
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
                    },
                    {
                        name: 'oauthId',
                        type: 'INTEGER'
                    },
                ],
            },
            {
                name: CoreSitesProvider.CURRENT_SITE_TABLE,
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
                    },
                ],
            },
        ],
        async migrate(db: SQLiteDB, oldVersion: number): Promise<any> {
            if (oldVersion < 2) {
                const newTable = CoreSitesProvider.SITES_TABLE;
                const oldTable = 'sites';

                try {
                    // Check if V1 table exists.
                    await db.tableExists(oldTable);

                    // Move the records from the old table.
                    const sites = await db.getAllRecords(oldTable);
                    const promises = [];

                    sites.forEach((site) => {
                        promises.push(db.insertRecord(newTable, site));
                    });

                    await Promise.all(promises);

                    // Data moved, drop the old table.
                    await db.dropTable(oldTable);
                } catch (error) {
                    // Old table does not exist, ignore.
                }
            }
        },
    };

    // Constants to validate a site version.
    protected WORKPLACE_APP = 3;
    protected MOODLE_APP = 2;
    protected VALID_VERSION = 1;
    protected INVALID_VERSION = -1;

    protected isWPApp: boolean;

    protected logger;
    protected services = {};
    protected sessionRestored = false;
    protected currentSite: CoreSite;
    protected sites: { [s: string]: CoreSite } = {};
    protected appDB: SQLiteDB;
    protected dbReady: Promise<any>; // Promise resolved when the app DB is initialized.
    protected siteSchemasMigration: { [siteId: string]: Promise<any> } = {};

    // Schemas for site tables. Other providers can add schemas in here.
    protected siteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected siteTablesSchemas: SQLiteDBTableSchema[] = [
        {
            name: CoreSitesProvider.SCHEMA_VERSIONS_TABLE,
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
        version: 2,
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
                    },
                    {
                        name: 'component',
                        type: 'TEXT'
                    },
                    {
                        name: 'componentId',
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
        ],
        async migrate (db: SQLiteDB, oldVersion: number, siteId: string): Promise<any> {
            if (oldVersion && oldVersion < 2) {
                const newTable = CoreSite.WS_CACHE_TABLE;
                const oldTable = 'wscache';

                try {
                    await db.tableExists(oldTable);
                } catch (error) {
                    // Old table does not exist, ignore.
                    return;
                }
                // Cannot use insertRecordsFrom because there are extra fields, so manually code INSERT INTO.
                await db.execute(
                    'INSERT INTO ' + newTable + ' ' +
                    'SELECT id, data, key, expirationTime, NULL as component, NULL as componentId ' +
                    'FROM ' + oldTable);

                try {
                    await db.dropTable(oldTable);
                } catch (error) {
                    // Error deleting old table, ignore.
                }
            }
        }
    };

    constructor(logger: CoreLoggerProvider,
            protected http: HttpClient,
            protected sitesFactory: CoreSitesFactoryProvider,
            protected appProvider: CoreAppProvider,
            protected translate: TranslateService,
            protected urlUtils: CoreUrlUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected utils: CoreUtilsProvider,
            protected injector: Injector,
            protected wsProvider: CoreWSProvider,
            protected domUtils: CoreDomUtilsProvider) {
        this.logger = logger.getInstance('CoreSitesProvider');

        this.appDB = appProvider.getDB();
        this.dbReady = appProvider.createTablesFromSchema(this.appTablesSchema).catch(() => {
            // Ignore errors.
        });
        this.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get the demo data for a certain "name" if it is a demo site.
     *
     * @param name Name of the site to check.
     * @return Site data if it's a demo site, undefined otherwise.
     */
    getDemoSiteData(name: string): any {
        const demoSites = CoreConfigConstants.demo_sites;
        name = name.toLowerCase();

        if (typeof demoSites != 'undefined' && typeof demoSites[name] != 'undefined') {
            return demoSites[name];
        }
    }

    /**
     * Check if a site is valid and if it has specifics settings for authentication (like force to log in using the browser).
     * It will test both protocols if the first one fails: http and https.
     *
     * @param siteUrl URL of the site to check.
     * @param protocol Protocol to use first.
     * @return A promise resolved when the site is checked.
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
                        return this.translate.instant('core.cannotconnecttrouble');
                    }
                });
            });
        }
    }

    /**
     * Helper function to check if a site is valid and if it has specifics settings for authentication.
     *
     * @param siteUrl URL of the site to check.
     * @param protocol Protocol to use.
     * @return A promise resolved when the site is checked.
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

                            if (error.errorcode == 'codingerror') {
                                // This could be caused by a redirect. Check if it's the case.
                                return this.utils.checkRedirect(siteUrl).then((redirect) => {
                                    if (redirect) {
                                        error.error = this.translate.instant('core.login.sitehasredirect');
                                    } else {
                                        // We can't be sure if there is a redirect or not. Display cannot connect error.
                                        error.error = this.translate.instant('core.cannotconnecttrouble');
                                    }

                                    return Promise.reject(error);
                                });
                            }

                            return Promise.reject(error);
                        }

                        return data;
                    });
                }

                return data;
            }, (error) => {
                // Local mobile check returned an error. This only happens if the plugin is installed and it returns an error.
                return rejectWithCriticalError(error);
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
     * @param siteUrl URL of the site to check.
     * @return A promise to be resolved if the site exists.
     */
    siteExists(siteUrl: string): Promise<void> {
        return this.http.post(siteUrl + '/login/token.php', { appsitecheck: 1 }).
                timeout(this.wsProvider.getRequestTimeout()).toPromise()
                .catch(() => {
            // Default error messages are kinda bad, return our own message.
            return Promise.reject({error: this.translate.instant('core.cannotconnecttrouble')});
        }).then((data: any) => {

            if (data === null) {
                // Cannot connect.
                return Promise.reject({error: this.translate.instant('core.cannotconnect', {$a: CoreSite.MINIMUM_MOODLE_VERSION})});
            }

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
     * @param siteUrl The site url.
     * @param username User name.
     * @param password Password.
     * @param service Service to use. If not defined, it will be searched in memory.
     * @param retry Whether we are retrying with a prefixed URL.
     * @return A promise resolved when the token is retrieved.
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
            promise = this.http.post(loginUrl, params).timeout(this.wsProvider.getRequestTimeout()).toPromise();

        return promise.then((data: any): any => {
            if (typeof data == 'undefined') {
                return Promise.reject(this.translate.instant('core.cannotconnecttrouble'));
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
            return Promise.reject(this.translate.instant('core.cannotconnecttrouble'));
        });
    }

    /**
     * Add a new site to the site list and authenticate the user in this site.
     *
     * @param siteUrl The site url.
     * @param token User's token.
     * @param privateToken User's private token.
     * @param login Whether to login the user in the site. Defaults to true.
     * @param oauthId OAuth ID. Only if the authentication was using an OAuth method.
     * @return A promise resolved with siteId when the site is added and the user is authenticated.
     */
    newSite(siteUrl: string, token: string, privateToken: string = '', login: boolean = true, oauthId?: number): Promise<string> {
        if (typeof login != 'boolean') {
            login = true;
        }

        // Create a "candidate" site to fetch the site info.
        let candidateSite = this.sitesFactory.makeSite(undefined, siteUrl, token, undefined, privateToken, undefined, undefined);
        let isNewSite = true;

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
                        candidateSite.setOAuthId(oauthId);
                        candidateSite.setLoggedOut(false);

                    } else {
                        // New site, set site ID and info.
                        isNewSite = true;
                        candidateSite.setId(siteId);
                        candidateSite.setInfo(info);
                        candidateSite.setOAuthId(oauthId);

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
                        this.addSite(siteId, siteUrl, token, info, privateToken, config, oauthId);
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
        }).catch((error) => {
            // Error invaliddevice is returned by Workplace server meaning the same as connecttoworkplaceapp.
            if (error && error.errorcode == 'invaliddevice') {
                return this.treatInvalidAppVersion(this.WORKPLACE_APP, siteUrl);
            }

            return Promise.reject(error);
        });
    }

    /**
     * Having the result of isValidMoodleVersion, it treats the error message to be shown.
     *
     * @param result Result returned by isValidMoodleVersion function.
     * @param siteUrl The site url.
     * @param siteId If site is already added, it will invalidate the token.
     * @return A promise rejected with the error info.
     */
    protected treatInvalidAppVersion(result: number, siteUrl: string, siteId?: string): Promise<any> {
        let errorCode,
            errorKey,
            translateParams;

        switch (result) {
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
                translateParams = {$a: CoreSite.MINIMUM_MOODLE_VERSION};
        }

        let promise;

        if (siteId) {
            promise = this.setSiteLoggedOut(siteId, true);
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
           return Promise.reject({
                error: this.translate.instant(errorKey, translateParams),
                errorcode: errorCode,
                loggedout: true
            });
        });
    }

    /**
     * Create a site ID based on site URL and username.
     *
     * @param siteUrl The site url.
     * @param username Username.
     * @return Site ID.
     */
    createSiteID(siteUrl: string, username: string): string {
        return <string> Md5.hashAsciiStr(siteUrl + username);
    }

    /**
     * Function for determine which service we should use (default or extended plugin).
     *
     * @param siteUrl The site URL.
     * @return The service shortname.
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
     * @param info Site info.
     * @return Either VALID_VERSION, WORKPLACE_APP, MOODLE_APP or INVALID_VERSION.
     */
    protected isValidMoodleVersion(info: any): number {
        if (!info) {
            return this.INVALID_VERSION;
        }

        const version31 = 2016052300,
            release31 = CoreSite.MINIMUM_MOODLE_VERSION;

        // Try to validate by version.
        if (info.version) {
            const version = parseInt(info.version, 10);
            if (!isNaN(version)) {
                if (version >= version31) {
                    return this.validateWorkplaceVersion(info);
                }
            }
        }

        // We couldn't validate by version number. Let's try to validate by release number.
        const release = this.getReleaseNumber(info.release || '');
        if (release) {
            if (release >= release31) {
                return this.validateWorkplaceVersion(info);
            }
        }

        // Couldn't validate it.
        return this.INVALID_VERSION;
    }

    /**
     * Check if needs to be redirected to specific Workplace App or general Moodle App.
     *
     * @param info Site info.
     * @return Either VALID_VERSION, WORKPLACE_APP or MOODLE_APP.
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
     * @param rawRelease Raw release info text.
     * @return Release number or empty.
     */
    getReleaseNumber(rawRelease: string): string {
        const matches = rawRelease.match(/^\d+(\.\d+(\.\d+)?)?/);
        if (matches) {
            return matches[0];
        }

        return '';
    }

    /**
     * Check if site info is valid. If it's not, return error message.
     *
     * @param info Site info.
     * @return True if valid, object with error message to show and its params if not valid.
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
     * @param id Site ID.
     * @param siteUrl Site URL.
     * @param token User's token in the site.
     * @param info Site's info.
     * @param privateToken User's private token.
     * @param config Site config (from tool_mobile_get_config).
     * @param oauthId OAuth ID. Only if the authentication was using an OAuth method.
     * @return Promise resolved when done.
     */
    async addSite(id: string, siteUrl: string, token: string, info: any, privateToken: string = '', config?: any,
            oauthId?: number): Promise<any> {
        await this.dbReady;

        const entry = {
            id: id,
            siteUrl: siteUrl,
            token: token,
            info: info ? JSON.stringify(info) : info,
            privateToken: privateToken,
            config: config ? JSON.stringify(config) : config,
            loggedOut: 0,
            oauthId: oauthId,
        };

        return this.appDB.insertRecord(CoreSitesProvider.SITES_TABLE, entry);
    }

    /**
     * Check the app for a site and show a download dialogs if necessary.
     *
     * @param config Config object of the site.
     */
    async checkApplication(config: any): Promise<void> {
        await this.checkRequiredMinimumVersion(config);
    }

    /**
     * Check the required minimum version of the app for a site and shows a download dialog.
     *
     * @param config Config object of the site.
     * @return Resolved with  if meets the requirements, rejected otherwise.
     */
    protected checkRequiredMinimumVersion(config: any): Promise<void> {
        if (config && config.tool_mobile_minimumversion) {
            const requiredVersion = this.convertVersionName(config.tool_mobile_minimumversion),
                appVersion = this.convertVersionName(CoreConfigConstants.versionname);

            if (requiredVersion > appVersion) {
                const storesConfig: CoreStoreConfig = {
                    android: config.tool_mobile_androidappid || false,
                    ios: config.tool_mobile_iosappid || false,
                    desktop: config.tool_mobile_setuplink || 'https://download.moodle.org/desktop/',
                    mobile: config.tool_mobile_setuplink || 'https://download.moodle.org/mobile/',
                    default: config.tool_mobile_setuplink,
                };

                const downloadUrl = this.appProvider.getAppStoreUrl(storesConfig);
                const siteId = this.getCurrentSiteId();

                // Do not block interface.
                this.domUtils.showConfirm(
                    this.translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                    this.translate.instant('core.updaterequired'),
                    this.translate.instant('core.download'),
                    this.translate.instant(siteId ? 'core.mainmenu.logout' : 'core.cancel')).then(() => {

                    this.utils.openInBrowser(downloadUrl);
                }).catch(() => {
                    // Do nothing.
                });

                if (siteId) {
                    // Logout if it's the currentSite.
                    const promise = siteId == this.getCurrentSiteId() ? this.logout() : Promise.resolve();

                    return promise.then(() => {
                        // Always expire the token.
                        return this.setSiteLoggedOut(siteId, true);
                    }).then(() => {
                        return Promise.reject(null);
                    });
                }

                return Promise.reject(null);
            }
        }

        return Promise.resolve();
    }

    /**
     * Convert version name to numbers.
     *
     * @param  name Version name (dot separated).
     * @return Version translated to a comparable number.
     */
    protected convertVersionName(name: string): number {
        let version = 0;

        const parts = name.split('-')[0].split('.', 3);
        parts.forEach((num) => {
            version = (version * 100) + Number(num);
        });

        if (parts.length < 3) {
            version = version * Math.pow(100, 3 - parts.length);
        }

        return version;
    }

    /**
     * Login a user to a site from the list of sites.
     *
     * @param siteId ID of the site to load.
     * @param pageName Name of the page to go once authenticated if logged out. If not defined, site initial page.
     * @param params Params of the page to go once authenticated if logged out.
     * @return Promise resolved with true if site is loaded, resolved with false if cannot login.
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
                return site.getPublicConfig().catch(() => {
                    return {};
                }).then((config) => {
                    return this.checkApplication(config).then(() => {
                        this.login(siteId);

                        // Update site info. We don't block the UI.
                        this.updateSiteInfo(siteId);

                        return true;
                    }).catch(() => {
                        return false;
                    });
                });
            });
        });
    }

    /**
     * Get current site.
     *
     * @return Current site.
     */
    getCurrentSite(): CoreSite {
        return this.currentSite;
    }

    /**
     * Get the site home ID of the current site.
     *
     * @return Current site home ID.
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
     * @return Current site ID.
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
     * @return Current site User ID.
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
     * @return Whether the user is logged in a site.
     */
    isLoggedIn(): boolean {
        return typeof this.currentSite != 'undefined' && typeof this.currentSite.token != 'undefined' &&
            this.currentSite.token != '';
    }

    /**
     * Delete a site from the sites list.
     *
     * @param siteId ID of the site to delete.
     * @return Promise to be resolved when the site is deleted.
     */
    async deleteSite(siteId: string): Promise<void> {
        await this.dbReady;

        this.logger.debug(`Delete site ${siteId}`);

        if (typeof this.currentSite != 'undefined' && this.currentSite.id == siteId) {
            this.logout();
        }

        const site = await this.getSite(siteId);

        await site.deleteDB();

        // Site DB deleted, now delete the app from the list of sites.
        delete this.sites[siteId];

        try {
            await this.appDB.deleteRecords(CoreSitesProvider.SITES_TABLE, { id: siteId });
        } catch (err) {
            // DB remove shouldn't fail, but we'll go ahead even if it does.
        }

        // Site deleted from sites list, now delete the folder.
        await site.deleteFolder();

        this.eventsProvider.trigger(CoreEventsProvider.SITE_DELETED, site, siteId);
    }

    /**
     * Check if there are sites stored.
     *
     * @return Promise resolved with true if there are sites and false if there aren't.
     */
    async hasSites(): Promise<boolean> {
        await this.dbReady;

        const count = await this.appDB.countRecords(CoreSitesProvider.SITES_TABLE);

        return count > 0;
    }

    /**
     * Returns a site object.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with the site.
     */
    async getSite(siteId?: string): Promise<CoreSite> {
        await this.dbReady;

        if (!siteId) {
            if (this.currentSite) {
                return this.currentSite;
            }

            throw null;
        } else if (this.currentSite && this.currentSite.getId() == siteId) {
            return this.currentSite;
        } else if (typeof this.sites[siteId] != 'undefined') {
            return this.sites[siteId];
        } else {
            // Retrieve and create the site.
            const data = await this.appDB.getRecord(CoreSitesProvider.SITES_TABLE, { id: siteId });

            return this.makeSiteFromSiteListEntry(data);
        }
    }

    /**
     * Finds a site with a certain URL. It will return the first site found.
     *
     * @param siteUrl The site URL.
     * @return Promise resolved with the site.
     */
    async getSiteByUrl(siteUrl: string): Promise<CoreSite> {
        await this.dbReady;

        const data = await this.appDB.getRecord(CoreSitesProvider.SITES_TABLE, { siteUrl });

        if (typeof this.sites[data.id] != 'undefined') {
            return this.sites[data.id];
        }

        return this.makeSiteFromSiteListEntry(data);
    }

    /**
     * Create a site from an entry of the sites list DB. The new site is added to the list of "cached" sites: this.sites.
     *
     * @param entry Site list entry.
     * @return Promised resolved with the created site.
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
        site.setOAuthId(entry.oauthId);

        return this.migrateSiteSchemas(site).then(() => {
            // Set site after migrating schemas, or a call to getSite could get the site while tables are being created.
            this.sites[entry.id] = site;

            return site;
        });
    }

    /**
     * Returns if the site is the current one.
     *
     * @param site Site object or siteId to be compared. If not defined, use current site.
     * @return Whether site or siteId is the current one.
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
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with the database.
     */
    getSiteDb(siteId: string): Promise<SQLiteDB> {
        return this.getSite(siteId).then((site) => {
            return site.getDb();
        });
    }

    /**
     * Returns the site home ID of a site.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with site home ID.
     */
    getSiteHomeId(siteId?: string): Promise<number> {
        return this.getSite(siteId).then((site) => {
            return site.getSiteHomeId();
        });
    }

    /**
     * Get the list of sites stored.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
     */
    async getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        await this.dbReady;

        const sites = await this.appDB.getAllRecords(CoreSitesProvider.SITES_TABLE);

        const formattedSites = [];
        sites.forEach((site) => {
            if (!ids || ids.indexOf(site.id) > -1) {
                // Parse info.
                const siteInfo = site.info ? this.textUtils.parseJSON(site.info) : site.info;
                const basicInfo: CoreSiteBasicInfo = {
                        id: site.id,
                        siteUrl: site.siteUrl,
                        fullName: siteInfo && siteInfo.fullname,
                        siteName: CoreConfigConstants.sitename ? CoreConfigConstants.sitename : siteInfo && siteInfo.sitename,
                        avatar: siteInfo && siteInfo.userpictureurl,
                        siteHomeId: siteInfo && siteInfo.siteid || 1,
                    };
                formattedSites.push(basicInfo);
            }
        });

        return formattedSites;
    }

    /**
     * Get the list of sites stored, sorted by URL and full name.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
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
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getLoggedInSitesIds(): Promise<string[]> {
        await this.dbReady;

        const sites = await this.appDB.getRecords(CoreSitesProvider.SITES_TABLE, {loggedOut : 0});

        return sites.map((site) => {
            return site.id;
        });
    }

    /**
     * Get the list of IDs of sites stored.
     *
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getSitesIds(): Promise<string[]> {
        await this.dbReady;

        const sites = await this.appDB.getAllRecords(CoreSitesProvider.SITES_TABLE);

        return sites.map((site) => {
            return site.id;
        });
    }

    /**
     * Login the user in a site.
     *
     * @param siteid ID of the site the user is accessing.
     * @return Promise resolved when current site is stored.
     */
    async login(siteId: string): Promise<void> {
        await this.dbReady;

        const entry = {
            id: 1,
            siteId: siteId
        };

        await this.appDB.insertRecord(CoreSitesProvider.CURRENT_SITE_TABLE, entry);

        this.eventsProvider.trigger(CoreEventsProvider.LOGIN, {}, siteId);
    }

    /**
     * Logout the user.
     *
     * @return Promise resolved when the user is logged out.
     */
    async logout(): Promise<void> {
        await this.dbReady;

        let siteId;
        const promises = [];

        if (this.currentSite) {
            const siteConfig = this.currentSite.getStoredConfig();
            siteId = this.currentSite.getId();

            this.currentSite = undefined;

            if (siteConfig && siteConfig.tool_mobile_forcelogout == '1') {
                promises.push(this.setSiteLoggedOut(siteId, true));
            }

            promises.push(this.appDB.deleteRecords(CoreSitesProvider.CURRENT_SITE_TABLE, { id: 1 }));
        }

        try {
            await Promise.all(promises);
        } finally {
            this.eventsProvider.trigger(CoreEventsProvider.LOGOUT, {}, siteId);
        }
    }

    /**
     * Restores the session to the previous one so the user doesn't has to login everytime the app is started.
     *
     * @return Promise resolved if a session is restored.
     */
    async restoreSession(): Promise<any> {
        if (this.sessionRestored) {
            return Promise.reject(null);
        }

        await this.dbReady;

        this.sessionRestored = true;

        try {
            const currentSite = await this.appDB.getRecord(CoreSitesProvider.CURRENT_SITE_TABLE, { id: 1 });
            const siteId = currentSite.siteId;
            this.logger.debug(`Restore session in site ${siteId}`);

            return this.loadSite(siteId);
        } catch (err) {
            // No current session.
        }
    }

    /**
     * Mark or unmark a site as logged out so the user needs to authenticate again.
     *
     * @param siteId ID of the site.
     * @param loggedOut True to set the site as logged out, false otherwise.
     * @return Promise resolved when done.
     */
    async setSiteLoggedOut(siteId: string, loggedOut: boolean): Promise<any> {
        await this.dbReady;

        const site = await this.getSite(siteId);
        const newValues: any = {
            loggedOut: loggedOut ? 1 : 0
        };

        if (loggedOut) {
            // Erase the token for security.
            newValues.token = '';
            site.token = '';
        }

        site.setLoggedOut(loggedOut);

        return this.appDB.updateRecords(CoreSitesProvider.SITES_TABLE, newValues, { id: siteId });
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
     * @param siteUrl Site's URL.
     * @param username Username.
     * @param token User's new token.
     * @param privateToken User's private token.
     * @return A promise resolved when the site is updated.
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
     * @param siteId Site Id.
     * @param token User's new token.
     * @param privateToken User's private token.
     * @return A promise resolved when the site is updated.
     */
    async updateSiteTokenBySiteId(siteId: string, token: string, privateToken: string = ''): Promise<any> {
        await this.dbReady;

        const site = await this.getSite(siteId);
        const newValues = {
            token: token,
            privateToken: privateToken,
            loggedOut: 0,
        };

        site.token = token;
        site.privateToken = privateToken;
        site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

        return this.appDB.updateRecords(CoreSitesProvider.SITES_TABLE, newValues, { id: siteId });
    }

    /**
     * Updates a site's info.
     *
     * @param siteid Site's ID.
     * @return A promise resolved when the site is updated.
     */
    async updateSiteInfo(siteId: string): Promise<any> {
        await this.dbReady;

        const site = await this.getSite(siteId);

        try {

            const info = await site.fetchSiteInfo();
            site.setInfo(info);

            const versionCheck = this.isValidMoodleVersion(info);
            if (versionCheck != this.VALID_VERSION) {
                // The Moodle version is not supported, reject.
                return this.treatInvalidAppVersion(versionCheck, site.getURL(), site.getId());
            }

            // Try to get the site config.
            let config;

            try {
                config = await this.getSiteConfig(site);
            } catch (error) {
                // Error getting config, keep the current one.
            }

            const newValues: any = {
                info: JSON.stringify(info),
                loggedOut: site.isLoggedOut() ? 1 : 0,
            };

            if (typeof config != 'undefined') {
                site.setConfig(config);
                newValues.config = JSON.stringify(config);
            }

            try {
                await this.appDB.updateRecords(CoreSitesProvider.SITES_TABLE, newValues, { id: siteId });
            } finally {
                this.eventsProvider.trigger(CoreEventsProvider.SITE_UPDATED, info, siteId);
            }
        } catch (error) {
            // Ignore that we cannot fetch site info. Probably the auth token is invalid.
        }
    }

    /**
     * Updates a site's info.
     *
     * @param siteUrl Site's URL.
     * @param username Username.
     * @return A promise to be resolved when the site is updated.
     */
    updateSiteInfoByUrl(siteUrl: string, username: string): Promise<any> {
        const siteId = this.createSiteID(siteUrl, username);

        return this.updateSiteInfo(siteId);
    }

    /**
     * Get the site IDs a URL belongs to.
     * Someone can have more than one account in the same site, that's why this function returns an array of IDs.
     *
     * @param url URL to check.
     * @param prioritize True if it should prioritize current site. If the URL belongs to current site then it won't
     *                   check any other site, it will only return current site.
     * @param username If set, it will return only the sites where the current user has this username.
     * @return Promise resolved with the site IDs (array).
     */
    async getSiteIdsFromUrl(url: string, prioritize?: boolean, username?: string): Promise<string[]> {
        await this.dbReady;

        // If prioritize is true, check current site first.
        if (prioritize && this.currentSite && this.currentSite.containsUrl(url)) {
            if (!username || this.currentSite.getInfo().username == username) {
                return [this.currentSite.getId()];
            }
        }

        // Check if URL has http(s) protocol.
        if (!url.match(/^https?:\/\//i)) {
            // URL doesn't have http(s) protocol. Check if it has any protocol.
            if (this.urlUtils.isAbsoluteURL(url)) {
                // It has some protocol. Return empty array.
                return [];
            } else {
                // No protocol, probably a relative URL. Return current site.
                if (this.currentSite) {
                    return [this.currentSite.getId()];
                } else {
                    return [];
                }
            }
        }

        try {
            const siteEntries = await this.appDB.getAllRecords(CoreSitesProvider.SITES_TABLE);
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

            await Promise.all(promises);

            return ids;
        } catch (error) {
            // Shouldn't happen.
            return [];
        }
    }

    /**
     * Get the site ID stored in DB as current site.
     *
     * @return Promise resolved with the site ID.
     */
    async getStoredCurrentSiteId(): Promise<string> {
        await this.dbReady;

        const currentSite = await this.appDB.getRecord(CoreSitesProvider.CURRENT_SITE_TABLE, { id: 1 });

        return currentSite.siteId;
    }

    /**
     * Get the public config of a certain site.
     *
     * @param siteUrl URL of the site.
     * @return Promise resolved with the public config.
     */
    getSitePublicConfig(siteUrl: string): Promise<any> {
        const temporarySite = this.sitesFactory.makeSite(undefined, siteUrl);

        return temporarySite.getPublicConfig();
    }

    /**
     * Get site config.
     *
     * @param site The site to get the config.
     * @return Promise resolved with config if available.
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
     * @param name Name of the feature to check.
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with true if disabled.
     */
    isFeatureDisabled(name: string, siteId?: string): Promise<boolean> {
        return this.getSite(siteId).then((site) => {
            return site.isFeatureDisabled(name);
        });
    }

    /**
     * Create a table in all the sites databases.
     *
     * @param table Table schema.
     * @deprecated. Please use registerSiteSchema instead.
     */
    createTableFromSchema(table: SQLiteDBTableSchema): void {
        this.createTablesFromSchema([table]);
    }

    /**
     * Create several tables in all the sites databases.
     *
     * @param tables List of tables schema.
     * @deprecated. Please use registerSiteSchema instead.
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
     * @param method WS name.
     * @param checkPrefix When true also checks with the compatibility prefix.
     * @return Whether the WS is available.
     */
    wsAvailableInCurrentSite(method: string, checkPrefix: boolean = true): boolean {
        const site = this.getCurrentSite();

        return site && site.wsAvailable(method, checkPrefix);
    }

    /**
     * Check if a site is a legacy site by its info.
     *
     * @param info The site info.
     * @return Whether it's a legacy Moodle.
     * @deprecated since 3.7.1
     */
    isLegacyMoodleByInfo(info: any): boolean {
        return false;
    }

    /**
     * Register a site schema.
     *
     * @param schema The schema to register.
     * @return Promise resolved when done.
     */
    async registerSiteSchema(schema: CoreSiteSchema): Promise<void> {
        if (this.currentSite) {
            try {
                // Site has already been created, apply the schema directly.
                const schemas: {[name: string]: CoreRegisteredSiteSchema} = {};
                schemas[schema.name] = schema;

                if (!schema.onlyCurrentSite) {
                    // Apply it to all sites.
                    const siteIds = await this.getSitesIds();

                    await Promise.all(siteIds.map(async (siteId) => {
                        const site = await this.getSite(siteId);

                        return this.applySiteSchemas(site, schemas);
                    }));
                } else {
                    // Apply it to the specified site only.
                    (schema as CoreRegisteredSiteSchema).siteId = this.currentSite.getId();

                    await this.applySiteSchemas(this.currentSite, schemas);
                }
            } finally {
                // Add the schema to the list. It's done in the end to prevent a schema being applied twice.
                this.siteSchemas[schema.name] = schema;
            }

        } else if (!schema.onlyCurrentSite) {
            // Add the schema to the list, it will be applied when the sites are created.
            this.siteSchemas[schema.name] = schema;
        }
    }

    /**
     * Install and upgrade all the registered schemas and tables.
     *
     * @param site Site.
     * @return Promise resolved when done.
     */
    migrateSiteSchemas(site: CoreSite): Promise<any> {

        if (this.siteSchemasMigration[site.id]) {
            return this.siteSchemasMigration[site.id];
        }

        this.logger.debug(`Migrating all schemas of ${site.id}`);

        // First create tables not registerd with name/version.
        const promise = site.getDb().createTablesFromSchema(this.siteTablesSchemas).then(() => {
            return this.applySiteSchemas(site, this.siteSchemas);
        });

        this.siteSchemasMigration[site.id] = promise;

        return promise.finally(() => {
            delete this.siteSchemasMigration[site.id];
        });
    }

    /**
     * Install and upgrade the supplied schemas for a certain site.
     *
     * @param site Site.
     * @param schemas Schemas to migrate.
     * @return Promise resolved when done.
     */
    protected applySiteSchemas(site: CoreSite, schemas: {[name: string]: CoreRegisteredSiteSchema}): Promise<any> {
        const db = site.getDb();

        // Fetch installed versions of the schema.
        return db.getAllRecords(CoreSitesProvider.SCHEMA_VERSIONS_TABLE).then((records) => {
            const versions = {};
            records.forEach((record) => {
                versions[record.name] = record.version;
            });

            const promises = [];
            for (const name in schemas) {
                const schema = schemas[name];
                const oldVersion = versions[name] || 0;
                if (oldVersion >= schema.version || (schema.siteId && site.getId() != schema.siteId)) {
                    // Version already applied or the schema shouldn't be registered to this site.
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
                promise = promise.then(() => db.insertRecord(CoreSitesProvider.SCHEMA_VERSIONS_TABLE,
                        {name, version: schema.version}));

                promises.push(promise);
            }

            return Promise.all(promises);
        });
    }

    /**
     * Check if a URL is the root URL of any of the stored sites.
     *
     * @param url URL to check.
     * @param username Username to check.
     * @return Promise resolved with site to use and the list of sites that have
     *         the URL. Site will be undefined if it isn't the root URL of any stored site.
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
     * @param site The site that will be cleared.
     * @return Name of the site schemas.
     */
    getSiteTableSchemasToClear(site: CoreSite): string[] {
        let reset = [];
        for (const name in this.siteSchemas) {
            const schema = this.siteSchemas[name];

            if (schema.canBeCleared && (!schema.siteId || site.getId() == schema.siteId)) {
                reset = reset.concat(this.siteSchemas[name].canBeCleared);
            }
        }

        return reset;
    }

    /**
     * Returns presets for a given reading strategy.
     *
     * @param strategy Reading strategy.
     * @return PreSets options object.
     */
    getReadingStrategyPreSets(strategy: CoreSitesReadingStrategy): CoreSiteWSPreSets {
        switch (strategy) {
            case CoreSitesReadingStrategy.PreferCache:
                return {
                    omitExpires: true,
                };
            case CoreSitesReadingStrategy.OnlyCache:
                return {
                    omitExpires: true,
                    forceOffline: true,
                };
            case CoreSitesReadingStrategy.PreferNetwork:
                return {
                    getFromCache: false,
                };
            case CoreSitesReadingStrategy.OnlyNetwork:
                return {
                    getFromCache: false,
                    emergencyCache: false,
                };
            default:
                return {};
        }
    }

    /**
     * Returns site info found on the backend.
     *
     * @param search Searched text.
     * @return Site info list.
     */
    async findSites(search: string): Promise<CoreLoginSiteInfo[]> {
        return [];
    }
}

export class CoreSites extends makeSingleton(CoreSitesProvider) {}
