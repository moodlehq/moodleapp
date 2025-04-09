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

import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Md5 } from 'ts-md5/dist/md5';
import { timeout } from 'rxjs/operators';

import { CoreApp, CoreStoreConfig } from '@services/app';
import { CoreEvents } from '@singletons/events';
import { CoreWS } from '@services/ws';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CoreConstants, MINIMUM_MOODLE_VERSION, MOODLE_RELEASES } from '@/core/constants';
import {
    CoreSite,
    CoreSiteConfig,
} from '@classes/sites/site';
import { SQLiteDB, SQLiteDBRecordValues, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreError, CoreErrorDebug } from '@classes/errors/error';
import { CoreLoginError, CoreLoginErrorOptions } from '@classes/errors/loginerror';
import { makeSingleton, Translate, Http } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import {
    APP_SCHEMA,
    SCHEMA_VERSIONS_TABLE_SCHEMA,
    SITES_TABLE_NAME,
    SCHEMA_VERSIONS_TABLE_NAME,
    SiteDBEntry,
    SchemaVersionsDBEntry,
} from '@services/database/sites';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreNavigator, CoreRedirectPayload } from './navigator';
import { CoreSitesFactory } from './sites-factory';
import { CoreText } from '@singletons/text';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreErrorWithOptions } from '@classes/errors/errorwithoptions';
import { CoreAjaxError } from '@classes/errors/ajaxerror';
import { CoreAjaxWSError } from '@classes/errors/ajaxwserror';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreDatabaseConfiguration, CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { asyncInstance, AsyncInstance } from '../utils/async-instance';
import { CoreConfig } from './config';
import { CoreNetwork } from '@services/network';
import { CoreUserGuestSupportConfig } from '@features/user/classes/support/guest-support-config';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreNative } from '@features/native/services/native';
import { CoreAutoLogoutType, CoreAutoLogout } from '@features/autologout/services/autologout';
import { CoreCacheManager } from '@services/cache-manager';
import { CoreSiteInfo, CoreSiteInfoResponse, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { firstValueFrom } from 'rxjs';
import { CoreHTMLClasses } from '@singletons/html-classes';
import { CoreErrorHelper } from './error-helper';
import { CoreQueueRunner } from '@classes/queue-runner';
import { CoreAppDB } from './app-db';
import { CoreRedirects } from '@singletons/redirects';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreOpener } from '@singletons/opener';
import { CoreAlerts } from './overlays/alerts';
import { CoreErrorLogs } from '@singletons/error-logs';

export const CORE_SITE_SCHEMAS = new InjectionToken<CoreSiteSchema[]>('CORE_SITE_SCHEMAS');
export const CORE_SITE_CURRENT_SITE_ID_CONFIG = 'current_site_id';

/**
 * Sites DB Manager.
 */
class CoreSitesDB {

    protected static readonly NOVERSION = 0;

    protected logger = CoreLogger.getInstance('CoreSitesDB');
    protected siteSchemasMigration: { [siteId: string]: Promise<void> } = {};
    protected siteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected pluginsSiteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected schemasTables: Record<string, AsyncInstance<CoreDatabaseTable<SchemaVersionsDBEntry, 'name', never>>> = {};

    protected siteTables: Record<string, Record<string, CorePromisedValue<CoreDatabaseTable>>> = {};

    constructor(siteSchemas: CoreSiteSchema[][] | null) {
        this.siteSchemas = (siteSchemas ?? []).flat().reduce(
            (siteSchemas, schema) => {
                siteSchemas[schema.name] = schema;

                return siteSchemas;
            },
            this.siteSchemas,
        );
    }

    /**
     * Register a site schema in current site.
     * This function is meant for site plugins to create DB tables in current site. Tables created from within the app
     * should use the registerCoreSiteSchema method instead.
     *
     * @param schema The schema to register.
     * @param site Site to register the schema to.
     */
    async registerSiteSchema(schema: CoreSiteSchema, site: CoreSite): Promise<void> {
        try {
            // Site has already been created, apply the schema directly.
            const schemas: {[name: string]: CoreRegisteredSiteSchema} = {};
            schemas[schema.name] = schema;

            // Apply it to the specified site only.
            (schema as CoreRegisteredSiteSchema).siteId = site.getId();

            await this.applySiteSchemas(site, schemas);
        } finally {
            this.pluginsSiteSchemas[schema.name] = schema;
        }
    }

    /**
     * Install and upgrade all the registered schemas and tables.
     *
     * @param site Site.
     * @returns Promise resolved when done.
     */
    async migrateSiteSchemas(site: CoreSite): Promise<void> {
        if (!site.getId()) {
            return;
        }

        const siteId = site.id;

        if (this.siteSchemasMigration[siteId] !== undefined) {
            return this.siteSchemasMigration[siteId];
        }

        this.logger.debug(`Migrating all schemas of ${siteId}`);

        // First create tables not registerd with name/version.
        const promise = site.getDb().createTableFromSchema(SCHEMA_VERSIONS_TABLE_SCHEMA)
            .then(() => this.applySiteSchemas(site, this.siteSchemas));

        this.siteSchemasMigration[siteId] = promise;

        return promise.finally(() => {
            delete this.siteSchemasMigration[siteId];
        });
    }

    /**
     * Install and upgrade the supplied schemas for a certain site.
     *
     * @param site Site.
     * @param schemas Schemas to migrate.
     */
    protected async applySiteSchemas(site: CoreSite, schemas: {[name: string]: CoreRegisteredSiteSchema}): Promise<void> {
        // Fetch installed versions of the schema.
        const records = await this.getSiteSchemasTable(site).getMany();

        const versions: {[name: string]: number} = {};

        records.forEach((record) => {
            versions[record.name] = record.version;
        });

        const promises: Promise<void>[] = [];
        for (const name in schemas) {
            const schema = schemas[name];
            const oldVersion = versions[name] ?? CoreSitesDB.NOVERSION;
            if (oldVersion >= schema.version || (schema.siteId && site.getId() !== schema.siteId)) {
                // Version already applied or the schema shouldn't be registered to this site.
                continue;
            }

            this.logger.debug(`Migrating schema '${name}' of ${site.id} from version ${oldVersion} to ${schema.version}`);

            promises.push(this.applySiteSchema(site, schema, oldVersion));
        }

        await Promise.all(promises);
    }

    /**
     * Install and upgrade the supplied schema for a certain site.
     *
     * @param site Site.
     * @param schema Schema to migrate.
     * @param oldVersion Old version of the schema.
     */
    protected async applySiteSchema(site: CoreSite, schema: CoreRegisteredSiteSchema, oldVersion: number): Promise<void> {
        if (!site.id) {
            return;
        }

        const db = site.getDb();

        if (schema.tables) {
            await db.createTablesFromSchema(schema.tables);
        }
        if (schema.install && oldVersion === CoreSitesDB.NOVERSION) {
            await schema.install(db, site.id);
        }
        if (schema.migrate && oldVersion > CoreSitesDB.NOVERSION) {
            await schema.migrate(db, oldVersion, site.id);
        }

        // Set installed version.
        await this.getSiteSchemasTable(site).insert({ name: schema.name, version: schema.version });
    }

    /**
     * Get schemas table for the given site.
     *
     * @param site Site.
     * @returns Scehmas Table.
     */
    protected getSiteSchemasTable(site: CoreSite): AsyncInstance<CoreDatabaseTable<SchemaVersionsDBEntry, 'name'>> {
        const siteId = site.getId();

        this.schemasTables[siteId] = this.schemasTables[siteId] ?? asyncInstance(
            () => this.getSiteTable(SCHEMA_VERSIONS_TABLE_NAME, {
                siteId: siteId,
                database: site.getDb(),
                config: { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
                primaryKeyColumns: ['name'],
                rowIdColumn: null,
                onDestroy: () => delete this.schemasTables[siteId],
            }),
        );

        return this.schemasTables[siteId];
    }

    /**
     * Returns the Site Schema names that can be cleared on space storage.
     *
     * @param site The site that will be cleared.
     * @returns Name of the site schemas.
     */
    getSiteTableSchemasToClear(site: CoreSite): string[] {
        let reset: string[] = [];
        const schemas = Object.values(this.siteSchemas).concat(Object.values(this.pluginsSiteSchemas));

        schemas.forEach((schema) => {
            if (schema.canBeCleared && (!schema.siteId || site.getId() === schema.siteId)) {
                reset = reset.concat(schema.canBeCleared);
            }
        });

        return reset;
    }

    /**
     * Get site table.
     *
     * @param tableName Site table name.
     * @param options Options to configure table initialization.
     * @returns Site table.
     */
    async getSiteTable<
        DBRecord extends SQLiteDBRecordValues,
        PrimaryKeyColumn extends keyof DBRecord,
        RowIdColumn extends PrimaryKeyColumn,
    >(
        tableName: string,
        options: {
            siteId: string;
            config?: Partial<CoreDatabaseConfiguration>;
            database: SQLiteDB;
            primaryKeyColumns?: PrimaryKeyColumn[];
            rowIdColumn?: RowIdColumn | null;
            onDestroy?(): void;
        },
    ): Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn>> {
        const siteId = options.siteId;

        if (!(siteId in this.siteTables)) {
            this.siteTables[siteId] = {};
        }

        if (!(tableName in this.siteTables[siteId])) {
            const promisedTable = this.siteTables[siteId][tableName] = new CorePromisedValue();
            const table = new CoreDatabaseTableProxy<DBRecord, PrimaryKeyColumn, RowIdColumn>(
                options.config ?? {},
                options.database,
                tableName,
                options.primaryKeyColumns,
                options.rowIdColumn,
            );

            options.onDestroy && table.addListener({ onDestroy: options.onDestroy });

            await table.initialize();

            promisedTable.resolve(table as unknown as CoreDatabaseTable);
        }

        return this.siteTables[siteId][tableName] as unknown as Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn>>;
    }

    /**
     * Delete all tables of a site.
     *
     * @param siteId Site ID.
     */
    async deleteSiteTables(siteId: string): Promise<void> {
        if (!(siteId in this.siteTables)) {
            return;
        }

        await Promise.all(
            Object
                .values(this.siteTables[siteId])
                .map(promisedTable => promisedTable.then(table => table.destroy())),
        );

        delete this.siteTables[siteId];
    }

}

/**
 * Service to manage and interact with sites.
 * It allows creating tables in the databases of all sites. Each service or component should be responsible of creating
 * their own database tables calling the registerCoreSiteSchema method.
 */
@Injectable({ providedIn: 'root' })
export class CoreSitesProvider {

    // Constants to validate a site version.
    protected static readonly WORKPLACE_APP = 3;
    protected static readonly MOODLE_APP = 2;
    protected static readonly VALID_VERSION = 1;
    protected static readonly INVALID_VERSION = -1;

    protected logger = CoreLogger.getInstance('CoreSitesProvider');
    protected sessionRestored = false;
    protected currentSite?: CoreSite;
    protected sites: { [s: string]: CoreSite } = {};

    protected sitesTable = asyncInstance<CoreDatabaseTable<SiteDBEntry>>();
    protected sitesDB: CoreSitesDB; // To handle sites DB.

    // Variables to run code after login navigation.
    protected isLoginNavigationFinished = false;
    protected afterLoginNavigationQueue: CoreSitesAfterLoginNavigationProcess[] = [];
    protected afterLoginNavigationQueueRunner = new CoreQueueRunner(1, true);

    constructor(@Optional() @Inject(CORE_SITE_SCHEMAS) siteSchemas: CoreSiteSchema[][] | null) {
        this.sitesDB = new CoreSitesDB(siteSchemas);
    }

    /**
     * @inheritdoc
     */
    initialize(): void {
        // Initialize general site events.
        CoreEvents.on(CoreEvents.SITE_DELETED, async ({ siteId }) => {
            if (!siteId) {
                return;
            }

            await this.sitesDB.deleteSiteTables(siteId);
        });

        CoreEvents.on(CoreEvents.LOGOUT, async () => {
            // Unload lang custom strings.
            CoreLang.clearCustomStrings();

            // Remove version classes from body.
            CoreHTMLClasses.removeSiteClasses();
        });

        CoreEvents.on(CoreEvents.LOGIN, async (data) => {
            if (data.siteId) {
                const site = await CoreSites.getSite(data.siteId);
                const info = site.getInfo();
                if (info) {
                    CoreHTMLClasses.addSiteClasses(info);
                }
            }

            CoreLang.loadCustomStringsFromSite();
        });

        // Site config is checked in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_CHECKED, (data) => {
            CoreHTMLClasses.addSiteUrlClass(data.config.httpswwwroot);
        });

        // Unload temporary styles when site config is "unchecked" in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_UNCHECKED, ({ loginSuccessful }) => {
            if (loginSuccessful) {
                // The classes are already added in LOGIN_SITE_CHECKED.
                return;
            }

            CoreHTMLClasses.removeSiteClasses();
        });

        CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            if (data.siteId !== CoreSites.getCurrentSiteId()) {
                return;
            }

            CoreLang.loadCustomStringsFromSite();
            CoreHTMLClasses.addSiteClasses(data);
        });

        CoreEvents.on(CoreEvents.SITE_ADDED, (data) => {
            if (data.siteId !== CoreSites.getCurrentSiteId()) {
                return;
            }

            CoreLang.loadCustomStringsFromSite();
            CoreHTMLClasses.addSiteClasses(data);
        });

        CoreCacheManager.registerInvalidateListener(() => this.invalidateCaches());
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        const sitesTable = new CoreDatabaseTableProxy<SiteDBEntry>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            CoreAppDB.getDB(),
            SITES_TABLE_NAME,
        );

        await sitesTable.initialize();

        this.sitesTable.setInstance(sitesTable);
    }

    /**
     * Get site table.
     *
     * @param tableName Site table name.
     * @param options Options to configure table initialization.
     * @returns Site table.
     */
    async getSiteTable<
        DBRecord extends SQLiteDBRecordValues,
        PrimaryKeyColumn extends keyof DBRecord,
        RowIdColumn extends PrimaryKeyColumn,
    >(
        tableName: string,
        options: Partial<{
            siteId: string;
            config: Partial<CoreDatabaseConfiguration>;
            database: SQLiteDB;
            primaryKeyColumns: PrimaryKeyColumn[];
            rowIdColumn: RowIdColumn | null;
            onDestroy(): void;
        }> = {},
    ): Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn>> {
        const siteId = options.siteId ?? this.getCurrentSiteId();

        const optionsWithMandatory = {
            ...options,
            siteId,
            database: options.database ?? await this.getSiteDb(siteId),
        };

        return this.sitesDB.getSiteTable(tableName, optionsWithMandatory);
    }

    /**
     * Get the demo data for a certain "name" if it is a demo site.
     *
     * @param name Name of the site to check.
     * @returns Site data if it's a demo site, undefined otherwise.
     */
    getDemoSiteData(name: string): CoreSitesDemoSiteData | undefined {
        const demoSites = CoreConstants.CONFIG.demo_sites;
        name = name.toLowerCase();

        if (demoSites !== undefined && demoSites[name] !== undefined) {
            return demoSites[name];
        }
    }

    /**
     * Check if a site is valid and if it has specifics settings for authentication (like force to log in using the browser).
     * It will test both protocols if the first one fails: http and https.
     *
     * @param siteUrl URL of the site to check.
     * @param protocol Protocol to use first.
     * @param origin Origin of this check site call.
     * @returns A promise resolved when the site is checked.
     */
    async checkSite(siteUrl: string, protocol: string = 'https://', origin = 'unknown'): Promise<CoreSiteCheckResponse> {
        // The formatURL function adds the protocol if is missing.
        siteUrl = CoreUrl.formatURL(siteUrl);

        if (!CoreUrl.isHttpURL(siteUrl)) {
            throw new CoreError(Translate.instant('core.login.invalidsite'), { debug: {
                code: 'invalidprotocol',
                details: `URL contains an invalid protocol when checking site.<br><br>Origin: ${origin}.<br><br>URL: ${siteUrl}.`,
            } });
        }

        if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        try {
            return await this.checkSiteWithProtocol(siteUrl, protocol);
        } catch (error) {
            // Do not continue checking if a critical error happened.
            if (error.critical) {
                throw error;
            }

            // Retry with the other protocol.
            protocol = protocol === 'https://' ? 'http://' : 'https://';

            try {
                return await this.checkSiteWithProtocol(siteUrl, protocol);
            } catch (secondError) {
                if (secondError.critical) {
                    throw secondError;
                }

                // Site doesn't exist. Return the error message.
                if (CoreErrorHelper.getErrorMessageFromError(error)) {
                    throw error;
                } else if (CoreErrorHelper.getErrorMessageFromError(secondError)) {
                    throw secondError;
                } else {
                    throw new CoreError(Translate.instant('core.sitenotfoundhelp'));
                }
            }
        }
    }

    /**
     * Helper function to check if a site is valid and if it has specifics settings for authentication.
     *
     * @param siteUrl URL of the site to check.
     * @param protocol Protocol to use.
     * @returns A promise resolved when the site is checked.
     */
    async checkSiteWithProtocol(siteUrl: string, protocol: string): Promise<CoreSiteCheckResponse> {
        // Now, replace the siteUrl with the protocol.
        siteUrl = siteUrl.replace(/^https?:\/\//i, protocol);

        // Create a temporary site to fetch site info.
        const temporarySite = CoreSitesFactory.makeUnauthenticatedSite(siteUrl);
        let config: CoreSitePublicConfigResponse | undefined;

        try {
            config = await temporarySite.getPublicConfig();
        } catch (error) {
            const treatedError = await this.treatGetPublicConfigError(temporarySite.getURL(), error);
            if (treatedError.critical) {
                throw treatedError; // App received a WS error, stop.
            }

            // Try to add or remove 'www'.
            temporarySite.setURL(CoreUrl.addOrRemoveWWW(temporarySite.getURL()));

            try {
                config = await temporarySite.getPublicConfig();
            } catch (secondError) {
                const treatedSecondError = await this.treatGetPublicConfigError(temporarySite.getURL(), secondError);
                if (treatedSecondError.critical) {
                    throw treatedSecondError; // App received a WS error, stop.
                }

                // App didn't receive a WS response, probably cannot connect. Prioritize first error if it's valid.
                if (CoreErrorHelper.getErrorMessageFromError(error)) {
                    throw error;
                } else {
                    throw secondError;
                }
            }
        }

        // Check that the user can authenticate.
        if (!config.enablewebservices) {
            throw this.createCannotConnectLoginError(config.httpswwwroot || config.wwwroot, {
                supportConfig: new CoreUserGuestSupportConfig(temporarySite, config),
                critical: true,
                debug: {
                    code: 'webservicesnotenabled',
                    details: Translate.instant('core.login.webservicesnotenabled'),
                },
            });
        }

        if (!config.enablemobilewebservice) {
            throw this.createCannotConnectLoginError(config.httpswwwroot || config.wwwroot, {
                supportConfig: new CoreUserGuestSupportConfig(temporarySite, config),
                critical: true,
                debug: {
                    code: 'mobileservicesnotenabled',
                    details: Translate.instant('core.login.mobileservicesnotenabled'),
                },
            });
        }

        if (config.maintenanceenabled) {
            let message = Translate.instant('core.sitemaintenance');
            if (config.maintenancemessage) {
                message += config.maintenancemessage;
            }

            throw new CoreLoginError({
                message,
                critical: true,
            });
        }

        siteUrl = temporarySite.getURL();

        return { siteUrl, code: config?.typeoflogin || 0, service: CoreConstants.CONFIG.wsservice, config };
    }

    /**
     * Create an error to be thrown when it isn't possible to login to a site.
     *
     * @param siteUrl Site Url.
     * @param options Error options.
     * @returns Cannot connect error.
     */
    protected createCannotConnectLoginError(siteUrl: string | null, options?: Partial<CoreLoginErrorOptions>): CoreLoginError {
        return new CoreLoginError({
            ...options,
            message: !this.isLoggedIn() && siteUrl === null
                ? Translate.instant('core.sitenotfoundhelp')
                : Translate.instant('core.siteunavailablehelp', { site: siteUrl ?? this.currentSite?.siteUrl }),
        });
    }

    /**
     * Treat an error returned by getPublicConfig in checkSiteWithProtocol. Converts the error to a CoreLoginError.
     *
     * @param siteUrl Site URL.
     * @param error Error returned.
     * @returns Promise resolved with the treated error.
     */
    protected async treatGetPublicConfigError(
        siteUrl: string,
        error: CoreError | CoreAjaxError | CoreAjaxWSError,
    ): Promise<CoreLoginError> {
        if (error instanceof CoreAjaxError || (!('debug' in error) && !('errorcode' in error))) {
            // The WS didn't return data, probably cannot connect.
            return new CoreLoginError({
                title: Translate.instant('core.cannotconnect'),
                message: Translate.instant('core.siteunavailablehelp', { site: siteUrl }),
                critical: false, // Allow fallback to http if siteUrl uses https.
                debug: {
                    code: 'publicconfigfailed',
                    details: error.message || 'Failed getting public config',
                },
            });
        }

        // Service supported but an error happened. Return error.
        const options: CoreLoginErrorOptions = {
            critical: true,
            title: Translate.instant('core.cannotconnect'),
            message: Translate.instant('core.siteunavailablehelp', { site: siteUrl }),
            supportConfig: 'supportConfig' in error ? error.supportConfig : undefined,
            debug: error.debug,
        };

        if (error.debug?.code === 'codingerror') {
            // This could be caused by a redirect. Check if it's the case.
            const redirect = await CoreRedirects.checkRedirect(siteUrl);

            options.message = Translate.instant('core.siteunavailablehelp', { site: siteUrl });

            if (redirect) {
                options.critical = false; // Keep checking fallback URLs.
                options.debug = {
                    code: 'sitehasredirect',
                    details: Translate.instant('core.login.sitehasredirect'),
                };
            }
        } else if (error.debug?.code === 'invalidrecord') {
            // WebService not found, site not supported.
            options.message = Translate.instant('core.siteunavailablehelp', { site: siteUrl });
            options.debug = {
                code: 'invalidmoodleversion',
                details: Translate.instant('core.login.invalidmoodleversion', { $a: MINIMUM_MOODLE_VERSION }),
            };
        } else if (error.debug?.code === 'redirecterrordetected') {
            options.critical = false; // Keep checking fallback URLs.
        }

        return new CoreLoginError(options);
    }

    /**
     * Gets a user token from the server.
     *
     * @param siteUrl The site url.
     * @param username User name.
     * @param password Password.
     * @param service Service to use. If not defined, it will be searched in memory.
     * @param retry Whether we are retrying with a prefixed URL.
     * @returns A promise resolved when the token is retrieved.
     */
    async getUserToken(
        siteUrl: string,
        username: string,
        password: string,
        service?: string,
        retry?: boolean,
    ): Promise<CoreSiteUserTokenResponse> {
        if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        service = service || CoreConstants.CONFIG.wsservice;
        const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);
        const params = {
            username,
            password,
            service,
        };
        const loginUrl = `${siteUrl}/login/token.php?lang=${lang}`;
        let data: CoreSitesLoginTokenResponse;

        try {
            data = await firstValueFrom(Http.post(loginUrl, params).pipe(timeout(CoreWS.getRequestTimeout())));
        } catch (error) {
            throw this.createCannotConnectLoginError(siteUrl, {
                debug: {
                    code: 'logintokenerror',
                    details: error.message,
                },
            });
        }

        if (data === undefined) {
            throw this.createCannotConnectLoginError(siteUrl, {
                debug: {
                    code: 'logintokenempty',
                    details: 'The request to /login/token.php returned an empty response',
                },
            });
        }

        if (data.token !== undefined) {
            return { token: data.token, siteUrl, privateToken: data.privatetoken };
        }

        if (data.error === undefined) {
            throw new CoreError(Translate.instant('core.login.invalidaccount'));
        }

        // We only allow one retry (to avoid loops).
        if (!retry && data.errorcode === 'requirecorrectaccess') {
            siteUrl = CoreUrl.addOrRemoveWWW(siteUrl);

            return this.getUserToken(siteUrl, username, password, service, true);
        }

        if (data.errorcode === 'missingparam') {
            // It seems the server didn't receive all required params, it could be due to a redirect.
            const redirect = await CoreRedirects.checkRedirect(loginUrl);

            if (redirect) {
                throw this.createCannotConnectLoginError(siteUrl, {
                    supportConfig: await CoreUserGuestSupportConfig.forSite(siteUrl),
                    debug: {
                        code: 'sitehasredirect',
                        details: Translate.instant('core.login.sitehasredirect'),
                    },
                });
            }
        }

        throw this.createCannotConnectLoginError(siteUrl, {
            supportConfig: await CoreUserGuestSupportConfig.forSite(siteUrl),
            debug: {
                code: data.errorcode ?? 'loginfailed',
                details: data.error ?? 'Could not get a user token in /login/token.php',
            },
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
     * @returns A promise resolved with siteId when the site is added and the user is authenticated.
     */
    async newSite(
        siteUrl: string,
        token: string,
        privateToken: string = '',
        login: boolean = true,
        oauthId?: number,
    ): Promise<string> {
        if (typeof login !== 'boolean') {
            login = true;
        }

        // Validate the site.
        const authSite = CoreSitesFactory.makeAuthenticatedSite(siteUrl, token, { privateToken });
        let isNewSite = true;

        try {
            const info = await authSite.fetchSiteInfo();

            const result = this.isValidMoodleVersion(info);
            if (result !== CoreSitesProvider.VALID_VERSION) {
                return this.treatInvalidAppVersion(result);
            }

            const siteId = this.createSiteID(info.siteurl, info.username);

            // Check if the site already exists.
            const storedSite = await CorePromiseUtils.ignoreErrors(this.getSite(siteId));
            let site: CoreSite;

            if (storedSite) {
                // Site already exists.
                isNewSite = false;
                site = storedSite;
                site.setToken(token);
                site.setPrivateToken(privateToken);
                site.setInfo(info);
                site.setOAuthId(oauthId);
                site.setLoggedOut(false);
            } else {
                // New site, set site ID and info.
                isNewSite = true;
                site = CoreSitesFactory.makeSite(siteId, siteUrl, token, { info, privateToken });
                site.setOAuthId(oauthId);

                // Create database tables before login and before any WS call.
                await this.sitesDB.migrateSiteSchemas(site);
            }

            // Try to get the site config.
            let config: CoreSiteConfig | undefined;

            try {
                config = await this.getSiteConfig(site);
            } catch (error) {
                // Ignore errors if it's not a new site, we'll use the config already stored.
                if (isNewSite) {
                    throw error;
                }
            }

            if (config !== undefined) {
                site.setConfig(config);
            }

            // Add site to sites list.
            await this.addSite(siteId, siteUrl, token, info, privateToken, config, oauthId);
            this.sites[siteId] = site;

            if (login) {
                this.currentSite = site;
                // Store session.
                await this.login(siteId);
            } else if (this.currentSite && this.currentSite.getId() === siteId) {
                // Current site has just been updated, trigger the event.
                CoreEvents.trigger(CoreEvents.SITE_UPDATED, info, siteId);
            }

            CoreEvents.trigger(CoreEvents.SITE_ADDED, info, siteId);

            return siteId;
        } catch (error) {
            // Error invaliddevice is returned by Workplace server meaning the same as connecttoworkplaceapp.
            if (error && error.errorcode === 'invaliddevice') {
                return this.treatInvalidAppVersion(CoreSitesProvider.WORKPLACE_APP);
            }

            throw error;
        }
    }

    /**
     * Having the result of isValidMoodleVersion, it treats the error message to be shown.
     *
     * @param result Result returned by isValidMoodleVersion function.
     * @param siteId If site is already added, it will invalidate the token.
     * @returns A promise rejected with the error info.
     */
    protected async treatInvalidAppVersion(result: number, siteId?: string): Promise<never> {
        let debug: CoreErrorDebug | undefined;
        let errorKey: string | undefined;
        let translateParams = {};

        switch (result) {
            case CoreSitesProvider.MOODLE_APP:
                errorKey = 'core.login.connecttomoodleapp';
                debug = {
                    code: 'connecttomoodleapp',
                    details: 'Cannot connect to app',
                };
                break;
            case CoreSitesProvider.WORKPLACE_APP:
                errorKey = 'core.login.connecttoworkplaceapp';
                debug = {
                    code: 'connecttoworkplaceapp',
                    details: 'Cannot connect to app',
                };
                break;
            default:
                errorKey = 'core.login.invalidmoodleversion';
                translateParams = { $a: MINIMUM_MOODLE_VERSION };
                debug = {
                    code: 'invalidmoodleversion',
                    details: 'Cannot connect to app',
                };
                break;
        }

        if (siteId) {
            await this.setSiteLoggedOut(siteId);
        }

        throw new CoreLoginError({
            debug,
            message: Translate.instant(errorKey, translateParams),
            loggedOut: true,
        });
    }

    /**
     * Create a site ID based on site URL and username.
     *
     * @param siteUrl The site url.
     * @param username Username.
     * @returns Site ID.
     */
    createSiteID(siteUrl: string, username: string): string {
        return Md5.hashAsciiStr(siteUrl + username);
    }

    /**
     * Visit a site link.
     *
     * @param url URL to handle.
     * @param options Behaviour options.
     * @param options.siteId Site Id.
     * @param options.username Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                 the username 'myuser'. Don't use it if you don't want to filter by username.
     * @param options.checkRoot Whether to check if the URL is the root URL of a site.
     * @param options.openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     * @deprecated since 5.0. Use CoreContentLinksHelper.visitLink instead.
     */
    async visitLink(
        url: string,
        options: {
            siteId?: string;
            username?: string;
            checkRoot?: boolean;
            openBrowserRoot?: boolean;
        } = {},
    ): Promise<void> {
        const { CoreContentLinksHelper } = await import('@features/contentlinks/services/contentlinks-helper');

        await CoreContentLinksHelper.visitLink(url, options);
    }

    /**
     * Check for the minimum required version.
     *
     * @param info Site info.
     * @returns Either VALID_VERSION, WORKPLACE_APP, MOODLE_APP or INVALID_VERSION.
     */
    protected isValidMoodleVersion(info: CoreSiteInfoResponse): number {
        if (!info) {
            return CoreSitesProvider.INVALID_VERSION;
        }

        // Try to validate by version.
        if (info.version) {
            const version = parseInt(info.version, 10);
            if (!isNaN(version)) {
                if (version >= MOODLE_RELEASES[MINIMUM_MOODLE_VERSION]) {
                    return this.validateWorkplaceVersion(info);
                }
            }
        }

        // We couldn't validate by version number. Let's try to validate by release number.
        const release = this.getReleaseNumber(info.release || '');
        if (release) {
            if (release >= MINIMUM_MOODLE_VERSION) {
                return this.validateWorkplaceVersion(info);
            }
        }

        // Couldn't validate it.
        return CoreSitesProvider.INVALID_VERSION;
    }

    /**
     * Check if needs to be redirected to specific Workplace App or general Moodle App.
     *
     * @param info Site info.
     * @returns Either VALID_VERSION, WORKPLACE_APP or MOODLE_APP.
     */
    protected validateWorkplaceVersion(info: CoreSiteInfoResponse): number {
        const isWorkplace = !!info.functions && info.functions.some((func) =>
            func.name === 'tool_program_get_user_programs' ||
            func.name === 'tool_catalogue_get_user_catalogue');

        const isWPEnabled = this.isWorkplaceEnabled();

        if (!isWPEnabled && isWorkplace) {
            return CoreSitesProvider.WORKPLACE_APP;
        }

        if (isWPEnabled && !isWorkplace) {
            return CoreSitesProvider.MOODLE_APP;
        }

        return CoreSitesProvider.VALID_VERSION;
    }

    /**
     * Check if the app is workplace enabled.
     *
     * @returns If the app is workplace enabled.
     */
    protected isWorkplaceEnabled(): boolean {
        return false;
    }

    /**
     * Returns the release number from site release info.
     *
     * @param rawRelease Raw release info text.
     * @returns Release number or empty.
     */
    getReleaseNumber(rawRelease: string): string {
        const matches = rawRelease.match(/^\d+(\.\d+(\.\d+)?)?/);
        if (matches) {
            return matches[0];
        }

        return '';
    }

    /**
     * Returns the major release number from site release info.
     *
     * @param rawRelease Raw release info text.
     * @returns Major release number or empty.
     */
    getMajorReleaseNumber(rawRelease: string): string {
        const matches = rawRelease.match(/^\d+(\.\d+)?/);
        if (matches) {
            return matches[0];
        }

        return '';
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
     */
    async addSite(
        id: string,
        siteUrl: string,
        token: string,
        info: CoreSiteInfoResponse,
        privateToken: string = '',
        config?: CoreSiteConfig,
        oauthId?: number,
    ): Promise<void> {
        const promises: Promise<unknown>[] = [];
        const site: SiteDBEntry = {
            id,
            siteUrl,
            token: '',
            info: info ? JSON.stringify(info) : undefined,
            privateToken: '',
            config: config ? JSON.stringify(config) : undefined,
            loggedOut: 0,
            oauthId,
        };

        promises.push(this.sitesTable.insert(site));
        promises.push(this.storeTokensInSecureStorage(id, token, privateToken));

        await Promise.all(promises);
    }

    /**
     * Check the app for a site and show a download dialogs if necessary.
     *
     * @param config Config object of the site.
     */
    async checkApplication(config?: CoreSitePublicConfigResponse): Promise<void> {
        await this.checkRequiredMinimumVersion(config);
    }

    /**
     * Check the required minimum version of the app for a site and shows a download dialog.
     *
     * @param config Config object of the site.
     * @returns Resolved if meets the requirements, rejected otherwise.
     */
    protected async checkRequiredMinimumVersion(config?: CoreSitePublicConfigResponse): Promise<void> {
        if (!config || !config.tool_mobile_minimumversion) {
            return;
        }

        const requiredVersion = this.convertVersionName(config.tool_mobile_minimumversion);
        const appVersion = this.convertVersionName(CoreConstants.CONFIG.versionname);

        if (requiredVersion > appVersion) {
            const storesConfig: CoreStoreConfig = {
                android: config.tool_mobile_androidappid,
                ios: config.tool_mobile_iosappid,
                mobile: config.tool_mobile_setuplink || 'https://download.moodle.org/mobile/',
                default: config.tool_mobile_setuplink,
            };

            const siteId = this.getCurrentSiteId();
            const downloadUrl = CoreApp.getAppStoreUrl(storesConfig);
            let promise: Promise<unknown>;

            if (downloadUrl) {
                // Do not block interface.
                promise = CoreAlerts.confirm(
                    Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                    {
                        header: Translate.instant('core.updaterequired'),
                        okText: Translate.instant('core.download'),
                        cancelText: Translate.instant(siteId ? 'core.mainmenu.logout' : 'core.cancel'),
                    },
                ).then(() => CoreOpener.openInBrowser(downloadUrl, { showBrowserWarning: false })).catch(() => {
                    // Do nothing.
                });
            } else {
                // Do not block interface.
                promise = CoreAlerts.show({
                    header: Translate.instant('core.updaterequired'),
                    message: Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                }).then((alert) => alert.onWillDismiss());
            }

            promise.finally(() => {
                if (siteId) {
                    // Logout the currentSite and expire the token.
                    this.internalLogout();
                    this.setSiteLoggedOut(siteId);
                }
            });

            throw new CoreError('Current app version is lower than required version.');
        }
    }

    /**
     * Convert version name to numbers.
     *
     * @param name Version name (dot separated).
     * @returns Version translated to a comparable number.
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
     * @param redirectData Data of the path/url to open once authenticated if logged out. If not defined, site initial page.
     * @returns Promise resolved with true if site is loaded, resolved with false if cannot login.
     */
    async loadSite(siteId: string, redirectData?: CoreRedirectPayload): Promise<boolean> {
        this.logger.debug(`Load site ${siteId}`);

        const site = await this.getSite(siteId);

        const siteUrlAllowed = await CoreLoginHelper.isSiteUrlAllowed(site.getURL(), false);
        if (!siteUrlAllowed) {
            throw new CoreErrorWithOptions(Translate.instant('core.login.sitenotallowed'));
        }

        this.currentSite = site;

        if (site.isLoggedOut()) {
            // Logged out, trigger session expired event and stop.
            CoreEvents.trigger(CoreEvents.SESSION_EXPIRED, redirectData || {}, site.getId());

            return false;
        }

        this.login(siteId);
        // Get some data in background, don't block the UI.
        this.getPublicConfigAndCheckApplication(site);
        this.updateSiteInfo(siteId);

        return true;
    }

    /**
     * Get site public config and check if app can access the site.
     *
     * @param site Site.
     */
    protected async getPublicConfigAndCheckApplication(site: CoreSite): Promise<void> {
        try {
            const config = await site.getPublicConfig({
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            });

            await this.checkApplication(config);
        } catch {
            // Ignore errors, maybe the user is offline.
        }
    }

    /**
     * Get current site or undefined if none.
     *
     * @returns Current site or undefined if none.
     */
    getCurrentSite(): CoreSite | undefined {
        return this.currentSite;
    }

    /**
     * Get current site or fail if none.
     *
     * @returns Current site.
     */
    getRequiredCurrentSite(): CoreSite {
        if (!this.currentSite) {
            throw new CoreError('You aren\'t authenticated in any site.');
        }

        return this.currentSite;
    }

    /**
     * Get the site home ID of the current site.
     *
     * @returns Current site home ID.
     */
    getCurrentSiteHomeId(): number {
        return this.currentSite?.getSiteHomeId() ?? 1;
    }

    /**
     * Get current site ID.
     *
     * @returns Current site ID.
     */
    getCurrentSiteId(): string {
        return this.currentSite?.getId() || '';
    }

    /**
     * Get current site User ID.
     *
     * @returns Current site User ID.
     */
    getCurrentSiteUserId(): number {
        return this.currentSite?.getUserId() || 0;
    }

    /**
     * Check if the user is logged in a site.
     *
     * @returns Whether the user is logged in a site.
     */
    isLoggedIn(): boolean {
        return this.currentSite !== undefined && this.currentSite.token !== undefined &&
            this.currentSite.token !== '';
    }

    /**
     * Delete a site from the sites list.
     *
     * @param siteId ID of the site to delete.
     */
    async deleteSite(siteId: string): Promise<void> {
        this.logger.debug(`Delete site ${siteId}`);

        if (this.currentSite !== undefined && this.currentSite.id === siteId) {
            this.internalLogout();
        }

        const site = await this.getSite(siteId);

        await site.deleteDB();

        // Site DB deleted, now delete the app from the list of sites.
        delete this.sites[siteId];

        // DB remove shouldn't fail, but we'll go ahead even if it does.
        await CorePromiseUtils.ignoreErrors(this.sitesTable.deleteByPrimaryKey({ id: siteId }));

        // Site deleted from sites list, now delete the folder.
        await site.deleteFolder();

        await CorePromiseUtils.ignoreErrors(CoreNative.plugin('secureStorage')?.deleteCollection(siteId));

        CoreEvents.trigger(CoreEvents.SITE_DELETED, site, siteId);
    }

    /**
     * Check if there are sites stored.
     *
     * @returns Promise resolved with true if there are sites and false if there aren't.
     */
    async hasSites(): Promise<boolean> {
        const isEmpty = await this.sitesTable.isEmpty();

        return !isEmpty;
    }

    /**
     * Returns a site object.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @returns Promise resolved with the site.
     */
    async getSite(siteId?: string): Promise<CoreSite> {
        if (!siteId) {
            if (this.currentSite) {
                return this.currentSite;
            }

            throw new CoreError('No current site found.');
        }

        if (this.currentSite?.getId() === siteId) {
            return this.currentSite;
        }

        if (this.sites[siteId] !== undefined) {
            return this.sites[siteId];
        }

        // Retrieve and create the site.
        let record: SiteDBEntry;
        try {
            record = await this.sitesTable.getOneByPrimaryKey({ id: siteId });
        } catch (error) {
            throw new CoreError(`SiteId not found in the app database: ${siteId}. ` +
                CoreErrorHelper.getErrorMessageFromError(error));
        }

        try {
            record = await this.loadSiteTokens(record);
        } catch (error) {
            // Error loading site tokens from secure storage. User will be asked to enter the password again.
            CoreErrorLogs.addErrorLog({
                message: `Error loading tokens for site: ${siteId}. Error: ` + CoreErrorHelper.getErrorMessageFromError(error)
                    + ' - ' + JSON.stringify(error),
                time: Date.now(),
                type: 'Error',
            });
        }

        try {
            return await this.addSiteFromSiteListEntry(record);
        } catch {
            throw new CoreError('Site database installation or update failed.');
        }
    }

    /**
     * Get a site directly from the database, without using any optimizations.
     * This function is used to read the site from DB during the app initialization, to avoid deadlocks.
     *
     * @param siteId Site id.
     * @returns Site.
     */
    protected async getSiteFromDB(siteId: string): Promise<CoreSite> {
        const db = CoreAppDB.getDB();

        try {
            // Do not use sitesTable.getOneByPrimaryKey in here, it can cause a deadlock
            // if this function is used during the app initialization.
            const record = await db.getRecord<SiteDBEntry>(SITES_TABLE_NAME, { id: siteId });

            return this.makeSiteFromSiteListEntry(record);
        } catch {
            throw new CoreError('SiteId not found');
        }
    }

    /**
     * Finds a site with a certain URL. It will return the first site found.
     *
     * @param siteUrl The site URL.
     * @returns Promise resolved with the site.
     */
    async getSiteByUrl(siteUrl: string): Promise<CoreSite> {
        const data = await this.loadSiteTokens(await this.sitesTable.getOne({ siteUrl }));

        return this.addSiteFromSiteListEntry(data);
    }

    /**
     * Gets the public type config for a site with the given url.
     *
     * @param siteUrl The site URL.
     * @returns Promise resolved with public config or null.
     */
    async getPublicSiteConfigByUrl(siteUrl: string): Promise<CoreSitePublicConfigResponse> {
        const site = await this.getSiteByUrl(siteUrl);

        return site.getPublicConfig({ readingStrategy: CoreSitesReadingStrategy.ONLY_CACHE });
    }

    /**
     * Create a site from an entry of the sites list DB. The new site is added to the list of "cached" sites: this.sites.
     *
     * @param entry Site list entry.
     * @returns Promised resolved with the created site.
     */
    protected async addSiteFromSiteListEntry(entry: SiteDBEntry): Promise<CoreSite> {
        if (this.sites[entry.id] !== undefined) {
            return this.sites[entry.id];
        }

        // Parse info and config.
        const site = this.makeSiteFromSiteListEntry(entry);

        await this.sitesDB.migrateSiteSchemas(site);

        // Set site after migrating schemas, or a call to getSite could get the site while tables are being created.
        this.sites[entry.id] = site;

        return site;
    }

    /**
     * Make a site instance from a database entry.
     *
     * @param entry Site database entry.
     * @returns Site.
     */
    protected makeSiteFromSiteListEntry(entry: SiteDBEntry): CoreSite {
        const info = entry.info ? CoreText.parseJSON<CoreSiteInfo>(entry.info) : undefined;
        const config = entry.config ? CoreText.parseJSON<CoreSiteConfig>(entry.config) : undefined;

        const site = CoreSitesFactory.makeSite(
            entry.id,
            entry.siteUrl,
            entry.token,
            {
                info,
                privateToken: entry.privateToken,
                config,
                loggedOut: entry.loggedOut === 1,
            },
        );
        site.setOAuthId(entry.oauthId || undefined);

        return site;
    }

    /**
     * Returns if the site is the current one.
     *
     * @param site Site object or siteId to be compared. If not defined, use current site.
     * @returns Whether site or siteId is the current one.
     */
    isCurrentSite(site?: string | CoreSite): boolean {
        if (!site || !this.currentSite) {
            return !!this.currentSite;
        }

        const siteId = typeof site === 'object' ? site.getId() : site;

        return this.currentSite.getId() === siteId;
    }

    /**
     * Returns the database object of a site.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @returns Promise resolved with the database.
     */
    async getSiteDb(siteId?: string): Promise<SQLiteDB> {
        const site = await this.getSite(siteId);

        return site.getDb();
    }

    /**
     * Returns the site home ID of a site.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @returns Promise resolved with site home ID.
     */
    async getSiteHomeId(siteId?: string): Promise<number> {
        const site = await this.getSite(siteId);

        return site.getSiteHomeId();
    }

    /**
     * Get the list of sites stored.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @returns Promise resolved when the sites are retrieved.
     */
    async getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = await this.sitesTable.getMany();

        return this.siteDBRecordsToBasicInfo(sites, ids);
    }

    /**
     * Convert sites DB records to site basic info.
     *
     * @param sites DB records.
     * @param ids IDs of sites to return, undefined to return them all.
     * @returns Sites basic info.
     */
    protected async siteDBRecordsToBasicInfo(sites: SiteDBEntry[], ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const formattedSites: CoreSiteBasicInfo[] = [];

        await Promise.all(sites.map(async (site) => {
            if (!ids || ids.indexOf(site.id) > -1) {
                const siteInfo = site.info ? <CoreSiteInfo> CoreText.parseJSON(site.info) : undefined;
                const siteInstance = CoreSitesFactory.makeSite(site.id, site.siteUrl, site.token, { info: siteInfo });

                const siteName = await siteInstance.getSiteName();

                const basicInfo: CoreSiteBasicInfo = {
                    id: site.id,
                    userId: siteInfo?.userid,
                    siteUrl: site.siteUrl,
                    siteUrlWithoutProtocol: site.siteUrl.replace(/^https?:\/\//, '').toLowerCase(),
                    fullname: siteInfo?.fullname,
                    firstname: siteInfo?.firstname,
                    lastname: siteInfo?.lastname,
                    siteName,
                    userpictureurl: siteInfo?.userpictureurl,
                    siteHomeId: siteInfo?.siteid || 1,
                    loggedOut: !!site.loggedOut,
                    info: siteInfo,
                };
                formattedSites.push(basicInfo);
            }
        }));

        return formattedSites;
    }

    /**
     * Get the list of sites stored, sorted by sitename, URL and fullname.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @returns Promise resolved when the sites are retrieved.
     */
    async getSortedSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = await this.getSites(ids);

        // Sort sites by site name, url and then fullname.
        sites.sort((a, b) => {
            // First compare by site name.
            let textA = CoreText.cleanTags(a.siteName).toLowerCase().trim();
            let textB = CoreText.cleanTags(b.siteName).toLowerCase().trim();

            let compare = textA.localeCompare(textB);
            if (compare !== 0) {
                return compare;
            }

            // If site name is the same, use site url without the protocol.
            compare = a.siteUrlWithoutProtocol.localeCompare(b.siteUrlWithoutProtocol);
            if (compare !== 0) {
                return compare;
            }

            // Finally use fullname.
            textA = a.fullname?.toLowerCase().trim() || '';
            textB = b.fullname?.toLowerCase().trim() || '';

            return textA.localeCompare(textB);
        });

        return sites;
    }

    /**
     * Get the list of IDs of sites stored and not logged out.
     *
     * @returns Promise resolved when the sites IDs are retrieved.
     */
    async getLoggedInSitesIds(): Promise<string[]> {
        const sites = await this.sitesTable.getMany({ loggedOut : 0 });

        return sites.map((site) => site.id);
    }

    /**
     * Get the list of IDs of sites stored.
     *
     * @returns Promise resolved when the sites IDs are retrieved.
     */
    async getSitesIds(): Promise<string[]> {
        const sites = await this.sitesTable.getMany();

        return sites.map((site) => site.id);
    }

    /**
     * Get instances of all stored sites.
     *
     * @returns Promise resolved when the sites are retrieved.
     */
    async getSitesInstances(): Promise<CoreSite[]> {
        const siteIds = await this.getSitesIds();

        return Promise.all(siteIds.map((siteId) => this.getSite(siteId)));
    }

    /**
     * Login the user in a site.
     *
     * @param siteId ID of the site the user is accessing.
     */
    async login(siteId: string): Promise<void> {
        await CoreConfig.set(CORE_SITE_CURRENT_SITE_ID_CONFIG, siteId);

        CoreEvents.trigger(CoreEvents.LOGIN, { siteId }, siteId);
    }

    /**
     * Logout the user.
     *
     * @param options Options.
     */
    async logout(options: CoreSitesLogoutOptions = {}): Promise<void> {
        await CoreNavigator.navigate('/logout', {
            params: { ...options },
            reset: true,
        });
    }

    /**
     * Logout the user.
     * This function is for internal usage, please use CoreSites.logout instead. The reason this function is public is because
     * it's called from the CoreLoginLogoutPage page.
     *
     * @param options Logout options.
     */
    async internalLogout(options: InternalLogoutOptions = {}): Promise<void> {
        if (!this.currentSite) {
            return;
        }

        const promises: Promise<unknown>[] = [];
        const siteConfig = this.currentSite.getStoredConfig();
        const siteId = this.currentSite.getId();

        this.currentSite = undefined;
        this.isLoginNavigationFinished = false;
        this.afterLoginNavigationQueue = [];

        if (options.forceLogout || (siteConfig && siteConfig.tool_mobile_forcelogout === '1')) {
            promises.push(this.setSiteLoggedOut(siteId));
        }

        promises.push(this.removeStoredCurrentSite());

        await CorePromiseUtils.ignoreErrors(Promise.all(promises));

        if (options.removeAccount) {
            await CoreSites.deleteSite(siteId);
        }

        CoreEvents.trigger(CoreEvents.LOGOUT, {}, siteId);
    }

    /**
     * Logout the user if authenticated to open a page/url in another site.
     *
     * @param siteId Site that will be opened after logout.
     * @param redirectData Page/url to open after logout.
     * @returns Promise resolved with boolean: true if app will be reloaded after logout.
     * @deprecated since 5.0. Use CoreSites.logout instead, it automatically handles redirects.
     */
    async logoutForRedirect(siteId: string, redirectData: CoreRedirectPayload): Promise<boolean> {
        if (!this.currentSite) {
            return false;
        }

        if (CoreSitePlugins.hasSitePluginsLoaded) {
            // The site has site plugins so the app will be restarted. Store the data and logout.
            CoreRedirects.storeRedirect(siteId, redirectData);
        }

        await this.internalLogout();

        return CoreSitePlugins.hasSitePluginsLoaded;
    }

    /**
     * Restores the session to the previous one so the user doesn't has to login everytime the app is started.
     */
    async restoreSession(): Promise<void> {
        await this.handleAutoLogout();

        if (this.sessionRestored) {
            throw new CoreError('Session already restored.');
        }

        this.sessionRestored = true;

        try {
            const siteId = await this.getStoredCurrentSiteId();
            this.logger.debug(`Restore session in site ${siteId}`);

            await this.loadSite(siteId);
        } catch {
            // No current session.
        }
    }

    /**
     * Handle auto logout by checking autologout type and time if its required.
     */
    async handleAutoLogout(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(( async () => {
            const siteId = await this.getStoredCurrentSiteId();
            const site = await this.getSite(siteId);
            const autoLogoutType = Number(site.getStoredConfig('tool_mobile_autologout'));
            const autoLogoutTime = Number(site.getStoredConfig('tool_mobile_autologouttime'));

            if (!autoLogoutType || autoLogoutType === CoreAutoLogoutType.NEVER || !site.id) {
                return;
            }

            if (autoLogoutType === CoreAutoLogoutType.CUSTOM) {
                await CoreAutoLogout.handleSessionClosed(autoLogoutTime, site);

                return;
            }

            await CoreAutoLogout.handleAppClosed(site);
        })());
    }

    /**
     * Mark a site as logged out so the user needs to authenticate again.
     *
     * @param siteId ID of the site.
     * @param isLoggedOut True if logged out and needs to authenticate again, false otherwise.
     */
    async setSiteLoggedOut(siteId: string, isLoggedOut: boolean = true): Promise<void> {
        const site = await this.getSite(siteId);

        site.setLoggedOut(isLoggedOut);

        await this.sitesTable.update({ loggedOut: isLoggedOut ? 1 : 0 }, { id: siteId });
    }

    /**
     * Updates a site's token.
     *
     * @param siteUrl Site's URL.
     * @param username Username.
     * @param token User's new token.
     * @param privateToken User's private token.
     */
    async updateSiteToken(siteUrl: string, username: string, token: string, privateToken: string = ''): Promise<void> {
        const siteId = this.createSiteID(siteUrl, username);

        await this.updateSiteTokenBySiteId(siteId, token, privateToken);

        await this.login(siteId);
    }

    /**
     * Updates a site's token using siteId.
     *
     * @param siteId Site Id.
     * @param token User's new token.
     * @param privateToken User's private token.
     */
    async updateSiteTokenBySiteId(siteId: string, token: string, privateToken: string = ''): Promise<void> {
        const site = await this.getSite(siteId);

        site.token = token;
        site.privateToken = privateToken;
        site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

        const promises: Promise<unknown>[] = [];
        const newData: Partial<SiteDBEntry> = {
            token: '',
            privateToken: '',
            loggedOut: 0,
        };

        promises.push(this.sitesTable.update(newData, { id: siteId }));
        promises.push(this.storeTokensInSecureStorage(siteId, token, privateToken));

        await Promise.all(promises);
    }

    /**
     * Removes the OAuth ID for a given site.
     *
     * @param siteId The ID of the site to update.
     */
    async removeSiteOauthId(siteId: string): Promise<void> {
        const site = await this.getSite(siteId);

        site.setOAuthId(undefined);

        const newData: Partial<SiteDBEntry> = {
            oauthId: null,
        };

        await this.sitesTable.update(newData, { id: siteId });
    }

    /**
     * Updates a site's info.
     *
     * @param siteId Site's ID.
     */
    async updateSiteInfo(siteId?: string): Promise<void> {
        const site = await this.getSite(siteId);

        try {
            const info = await site.fetchSiteInfo();
            site.setInfo(info);

            const versionCheck = this.isValidMoodleVersion(info);
            if (versionCheck !== CoreSitesProvider.VALID_VERSION) {
                // The Moodle version is not supported, reject.
                await this.treatInvalidAppVersion(versionCheck, site.getId());

                return;
            }

            // Try to get the site config.
            let config: CoreSiteConfig | undefined;

            try {
                config = await this.getSiteConfig(site);
            } catch {
                // Error getting config, keep the current one.
            }

            const newValues: Partial<SiteDBEntry> = {
                info: JSON.stringify(info),
                loggedOut: site.isLoggedOut() ? 1 : 0,
            };

            if (config !== undefined) {
                site.setConfig(config);
                newValues.config = JSON.stringify(config);
            }

            try {
                await this.sitesTable.update(newValues, { id: siteId });
            } finally {
                CoreEvents.trigger(CoreEvents.SITE_UPDATED, info, siteId);
            }
        } catch {
            // Ignore that we cannot fetch site info. Probably the auth token is invalid.
        }
    }

    /**
     * Updates a site's info.
     *
     * @param siteUrl Site's URL.
     * @param username Username.
     */
    async updateSiteInfoByUrl(siteUrl: string, username: string): Promise<void> {
        const siteId = this.createSiteID(siteUrl, username);

        await this.updateSiteInfo(siteId);
    }

    /**
     * Get the site IDs a URL belongs to.
     * Someone can have more than one account in the same site, that's why this function returns an array of IDs.
     *
     * @param url URL to check.
     * @param prioritize True if it should prioritize current site. If the URL belongs to current site then it won't
     *                   check any other site, it will only return current site.
     * @param username If set, it will return only the sites where the current user has this username.
     * @returns Promise resolved with the site IDs (array).
     */
    async getSiteIdsFromUrl(url: string, prioritize?: boolean, username?: string): Promise<string[]> {
        // If prioritize is true, check current site first.
        if (prioritize && this.currentSite && this.currentSite.containsUrl(url)) {
            if (!username || this.currentSite?.getInfo()?.username === username) {
                return [this.currentSite.getId()];
            }
        }

        // Check if URL has http(s) protocol.
        if (!url.match(/^https?:\/\//i)) {
            // URL doesn't have http(s) protocol. Check if it has any protocol.
            if (CoreUrl.isAbsoluteURL(url)) {
                // It has some protocol. Return empty array.
                return [];
            }

            // No protocol, probably a relative URL. Return current site.
            if (this.currentSite) {
                return [this.currentSite.getId()];
            }

            return [];
        }

        try {
            const siteEntries = await this.sitesTable.getMany();
            const ids: string[] = [];

            await Promise.all(siteEntries.map(async (site) => {
                site = await this.loadSiteTokens(site);

                await this.addSiteFromSiteListEntry(site);

                if (this.sites[site.id].containsUrl(url)) {
                    if (!username || this.sites[site.id].getInfo()?.username === username) {
                        ids.push(site.id);
                    }
                }
            }));

            return ids;
        } catch {
            // Shouldn't happen.
            return [];
        }
    }

    /**
     * Get the site ID stored in DB as current site.
     *
     * @returns Promise resolved with the site ID.
     */
    async getStoredCurrentSiteId(): Promise<string> {
        await this.migrateCurrentSiteLegacyTable();

        return CoreConfig.get(CORE_SITE_CURRENT_SITE_ID_CONFIG);
    }

    /**
     * Remove current site stored in DB.
     */
    async removeStoredCurrentSite(): Promise<void> {
        await CoreConfig.delete(CORE_SITE_CURRENT_SITE_ID_CONFIG);
    }

    /**
     * Get the public config of a certain site.
     *
     * @param siteUrl URL of the site.
     * @returns Promise resolved with the public config.
     */
    getSitePublicConfig(siteUrl: string): Promise<CoreSitePublicConfigResponse> {
        const temporarySite = CoreSitesFactory.makeUnauthenticatedSite(siteUrl);

        return temporarySite.getPublicConfig();
    }

    /**
     * Get site config.
     *
     * @param site The site to get the config.
     * @returns Promise resolved with config if available.
     */
    protected async getSiteConfig(site: CoreSite): Promise<CoreSiteConfig | undefined> {
        return site.getConfig(undefined, true);
    }

    /**
     * Check if a certain feature is disabled in a site.
     *
     * @param name Name of the feature to check.
     * @param siteId The site ID. If not defined, current site (if available).
     * @returns Promise resolved with true if disabled.
     */
    async isFeatureDisabled(name: string, siteId?: string): Promise<boolean> {
        const site = await this.getSite(siteId);

        return site.isFeatureDisabled(name);
    }

    /**
     * Check if a WS is available in the current site, if any.
     *
     * @param method WS name.
     * @returns Whether the WS is available.
     */
    wsAvailableInCurrentSite(method: string): boolean {
        const site = this.getCurrentSite();

        return site ? site.wsAvailable(method) : false;
    }

    /**
     * Register a site schema in current site.
     * This function is meant for site plugins to create DB tables in current site. Tables created from within the app
     * should use the registerCoreSiteSchema method instead.
     *
     * @param schema The schema to register.
     */
    async registerSiteSchema(schema: CoreSiteSchema): Promise<void> {
        if (!this.currentSite) {
            return;
        }

        await this.sitesDB.registerSiteSchema(schema, this.currentSite);
    }

    /**
     * Install and upgrade all the registered schemas and tables.
     *
     * @param site Site.
     * @returns Promise resolved when done.
     * @deprecated since 5.0. This function should not be used anymore outsite CoreSites.
     */
    async migrateSiteSchemas(site: CoreSite): Promise<void> {
        return this.sitesDB.migrateSiteSchemas(site);
    }

    /**
     * Check if a URL is the root URL of any of the stored sites.
     *
     * @param url URL to check.
     * @param username Username to check.
     * @returns Promise resolved with site to use and the list of sites that have
     *         the URL. Site will be undefined if it isn't the root URL of any stored site.
     */
    async isStoredRootURL(url: string, username?: string): Promise<{site?: CoreSite; siteIds: string[]}> {
        // Check if the site is stored.
        const siteIds = await this.getSiteIdsFromUrl(url, true, username);

        const result: {site?: CoreSite; siteIds: string[]} = {
            siteIds,
        };

        if (!siteIds.length) {
            return result;
        }

        // If more than one site is returned it usually means there are different users stored. Use any of them.
        const site = await this.getSite(siteIds[0]);

        const siteUrl = CoreText.removeEndingSlash(
            CoreUrl.removeUrlParts(site.getURL(), [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]),
        );
        const treatedUrl = CoreText.removeEndingSlash(
            CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]),
        );

        if (siteUrl === treatedUrl) {
            result.site = site;
        }

        return result;
    }

    /**
     * Returns the Site Schema names that can be cleared on space storage.
     *
     * @param site The site that will be cleared.
     * @returns Name of the site schemas.
     */
    getSiteTableSchemasToClear(site: CoreSite): string[] {
        return this.sitesDB.getSiteTableSchemasToClear(site);
    }

    /**
     * Get preSets to filter the text and rewrite URLs.
     *
     * @param filter If false, text won't be filtered and URLs won't be rewritten. Any other value means text will be filtered.
     * @returns PreSets.
     */
    getFilterPresets(filter?: boolean): CoreSiteWSPreSets {
        return {
            filter: filter !== false,
            rewriteurls: filter !== false,
        };
    }

    /**
     * Returns presets for a given reading strategy.
     *
     * @param strategy Reading strategy.
     * @returns PreSets options object.
     */
    getReadingStrategyPreSets(strategy?: CoreSitesReadingStrategy): CoreSiteWSPreSets {
        switch (strategy) {
            case CoreSitesReadingStrategy.PREFER_CACHE:
                return {
                    omitExpires: true,
                };
            case CoreSitesReadingStrategy.ONLY_CACHE:
                return {
                    omitExpires: true,
                    forceOffline: true,
                };
            case CoreSitesReadingStrategy.PREFER_NETWORK:
                return {
                    getFromCache: false,
                };
            case CoreSitesReadingStrategy.ONLY_NETWORK:
                return {
                    getFromCache: false,
                    emergencyCache: false,
                };
            case CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE:
                return {
                    updateInBackground: true,
                    getFromCache: true,
                    saveToCache: true,
                };
            default:
                return {};
        }
    }

    /**
     * Returns site info found on the backend.
     *
     * @param search Searched text.
     * @returns Site info list.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findSites(search: string): Promise<CoreLoginSiteInfo[]> {
        return [];
    }

    /**
     * Check whether a site is using a default image or not.
     *
     * @param site Site info.
     * @returns Whether the site is using a default image.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasDefaultImage(site: CoreLoginSiteInfo): boolean {
        return false;
    }

    /**
     * Migrate the legacy current_site table.
     */
    protected async migrateCurrentSiteLegacyTable(): Promise<void> {
        if (await CoreConfig.has('current_site_migrated')) {
            // Already migrated.
            return;
        }

        try {
            const db = CoreAppDB.getDB();

            const { siteId } = await db.getRecord<{ siteId: string }>('current_site');

            await CoreConfig.set(CORE_SITE_CURRENT_SITE_ID_CONFIG, siteId);
            await CoreAppDB.deleteTableSchema('current_site');
            await db.dropTable('current_site');
        } catch {
            // There was no current site, silence the error.
        } finally {
            await CoreConfig.set('current_site_migrated', 1);
        }
    }

    /**
     * Move all tokens stored in DB to a secure storage.
     */
    async moveTokensToSecureStorage(): Promise<void> {
        const sites = await this.sitesTable.getMany();

        await Promise.all(sites.map(async site => {
            if (!site.token && !site.privateToken) {
                return; // Tokens are empty, no need to treat them.
            }

            try {
                await this.storeTokensInSecureStorage(site.id, site.token, site.privateToken);
            } catch {
                this.logger.error(`Error storing tokens in secure storage for site ${site.id}`);
            }
        }));

        // Remove tokens from DB even if they couldn't be stored in secure storage.
        await this.sitesTable.update({ token: '', privateToken: '' });
    }

    /**
     * Get tokens from secure storage.
     *
     * @param siteId Site ID.
     * @returns Stored tokens.
     */
    protected async getTokensFromSecureStorage(siteId: string): Promise<{ token: string; privateToken?: string }> {
        const result = await CoreNative.plugin('secureStorage')?.get(['token', 'privateToken'], siteId);

        return {
            token: result?.token ?? '',
            privateToken: result?.privateToken ?? undefined,
        };
    }

    /**
     * Store tokens in secure storage.
     *
     * @param siteId Site ID.
     * @param token Site token.
     * @param privateToken Site private token.
     */
    protected async storeTokensInSecureStorage(
        siteId: string,
        token: string,
        privateToken?: string,
    ): Promise<void> {
        await CoreNative.plugin('secureStorage')?.store({
            token: token,
            privateToken: privateToken ?? '',
        }, siteId);
    }

    /**
     * Given a site, load its tokens if needed.
     *
     * @param site Site data.
     * @returns Site with tokens loaded.
     */
    protected async loadSiteTokens(site: SiteDBEntry): Promise<SiteDBEntry> {
        if (site.token) {
            return site;
        }

        const tokens = await this.getTokensFromSecureStorage(site.id);

        return {
            ...site,
            ...tokens,
        };
    }

    /**
     * Invalidate all sites cache.
     */
    protected async invalidateCaches(): Promise<void> {
        const sites = await this.getSites();

        await Promise.all(
            sites
                .map(site => CoreSitesFactory.makeSite(site.id, site.siteUrl, ''))
                .map(site => site.invalidateCaches()),
        );
    }

    /**
     * Run some code when the login navigation is finished. Login navigation finishes when the proper main menu page
     * has loaded.
     * If not logged in or the login navigation is already finished, the callback will run immediately (waiting for currently
     * running processes to finish).
     * Otherwise, the process will be added to a queue and will run once the login navigation is finished.
     *
     * @param data Process data.
     */
    runAfterLoginNavigation(data: CoreSitesAfterLoginNavigationProcess): void {
        if (!this.isLoggedIn() || this.isLoginNavigationFinished) {
            this.afterLoginNavigationQueueRunner.run(data.callback, { priority: data.priority });

            return;
        }

        this.afterLoginNavigationQueue.push(data);

        // Sort the list by priority. The queue runner also uses priority, but the first run is always executed immediately
        // so it's important to always pass the highest priority process first.
        this.afterLoginNavigationQueue.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Notify that the login navigation is finished. This function should only be used by main menu pages.
     */
    loginNavigationFinished(): void {
        if (this.isLoginNavigationFinished) {
            // Already finished, nothing else to do.
            return;
        }

        this.isLoginNavigationFinished = true;

        // Run the processes in the queue.
        this.afterLoginNavigationQueue.forEach(data => {
            this.afterLoginNavigationQueueRunner.run(data.callback, { priority: data.priority });
        });
        this.afterLoginNavigationQueue = [];
    }

    /**
     * Filter the list of site IDs based on a isEnabled function.
     *
     * @param siteIds Site IDs to filter.
     * @param isEnabledFn Function to call for each site. It receives a siteId param and all the params sent to this function
     *                    after 'checkAll'.
     * @param checkAll True if it should check all the sites, false if it should check only 1 and treat them all
     *                 depending on this result.
     * @returns Promise resolved with the list of enabled sites.
     */
    async filterEnabledSites<P extends unknown[]>(
        siteIds: string[],
        isEnabledFn: (siteId: string, ...args: P) => boolean | Promise<boolean>,
        checkAll?: boolean,
        ...args: P
    ): Promise<string[]> {
        const promises: Promise<false | number>[] = [];
        const enabledSites: string[] = [];

        for (const i in siteIds) {
            const siteId = siteIds[i];
            const pushIfEnabled = enabled => enabled && enabledSites.push(siteId);
            if (checkAll || !promises.length) {
                promises.push(
                    Promise
                        .resolve(isEnabledFn(siteId, ...args))
                        .then(pushIfEnabled),
                );
            }
        }

        await CorePromiseUtils.allPromisesIgnoringErrors(promises);

        if (!checkAll) {
            // Checking 1 was enough, so it will either return all the sites or none.
            return enabledSites.length ? siteIds : [];
        }

        return enabledSites;
    }

}

export const CoreSites = makeSingleton(CoreSitesProvider);

/**
 * Response of checking if a site exists and its configuration.
 */
export type CoreSiteCheckResponse = {
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
     * Site public config (if available).
     */
    config?: CoreSitePublicConfigResponse;
};

/**
 * Response of getting user token.
 */
export type CoreSiteUserTokenResponse = {
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
};

/**
 * Site's basic info.
 */
export type CoreSiteBasicInfo = {
    id: string; // Site ID.
    userId?: number; // User ID.
    siteUrl: string; // Site URL.
    siteUrlWithoutProtocol: string; // Site URL without protocol.
    fullname?: string; // User's full name.
    firstname?: string; // User's first name.
    lastname?: string; // User's last name.
    userpictureurl?: string; // User avatar.
    siteName?: string; // Site's name.
    badge?: number; // Badge to display in the site.
    siteHomeId?: number; // Site home ID.
    loggedOut: boolean; // If Site is logged out.
    info?: CoreSiteInfo; // Site info.
};

/**
 * Site schema and migration function.
 */
export type CoreSiteSchema = {
    /**
     * Name of the schema.
     */
    name: string;

    /**
     * Latest version of the schema (integer greater than 0).
     */
    version: number;

    /**
     * Names of the tables of the site schema that can be cleared when removing downloading data in space usage.
     */
    canBeCleared?: string[];

    /**
     * Tables to create when installing or upgrading the schema.
     */
    tables?: SQLiteDBTableSchema[];

    /**
     * Migrates the schema in a site to the latest version.
     *
     * Called when upgrading the schema, after creating the defined tables.
     *
     * @param db Site database.
     * @param oldVersion Old version of the schema or 0 if not installed.
     * @param siteId Site Id to migrate.
     * @returns Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number, siteId: string): Promise<void> | void;

    /**
     * Make changes to install the schema in a site.
     *
     * Called when installing the schema, after creating the defined tables.
     *
     * @param db Site database.
     * @param siteId Site Id to migrate.
     * @returns Promise resolved when done.
     */
    install?(db: SQLiteDB, siteId: string): Promise<void> | void;
};

/**
 * Data about sites to be listed.
 */
export type CoreLoginSiteInfo = {
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

    /**
     * Is staging site.
     */
    staging?: boolean;

    /**
     * Class to apply to site item.
     */
    className?: string;

    /**
     * Whether the site is for demo mode usage.
     */
    demoMode?: boolean;
};

/**
 * Registered site schema.
 */
export type CoreRegisteredSiteSchema = CoreSiteSchema & {
    /**
     * Site ID to apply the schema to. If not defined, all sites.
     */
    siteId?: string;
};

/**
 * Possible reading strategies (for cache).
 */
export const enum CoreSitesReadingStrategy {
    ONLY_CACHE,
    PREFER_CACHE,
    ONLY_NETWORK,
    PREFER_NETWORK,
    STALE_WHILE_REVALIDATE,
}

/**
 * Common options used when calling a WS through CoreSite.
 */
export type CoreSitesCommonWSOptions = {
    readingStrategy?: CoreSitesReadingStrategy; // Reading strategy.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Common options used when calling a WS through CoreSite, including an option to determine if text should be filtered.
 */
export type CoreSitesWSOptionsWithFilter = CoreSitesCommonWSOptions & {
    filter?: boolean; // Defaults to true. If false, text won't be filtered and URLs won't be rewritten.
};

/**
 * Data about a certain demo site.
 */
export type CoreSitesDemoSiteData = {
    url: string;
    username: string;
    password: string;
};

/**
 * Response of calls to login/token.php.
 */
export type CoreSitesLoginTokenResponse = {
    token?: string;
    privatetoken?: string;
    error?: string;
    errorcode?: string;
    stacktrace?: string;
    debuginfo?: string;
    reproductionlink?: string;
};

/**
 * Options for logout.
 */
export type CoreSitesLogoutOptions = CoreRedirectPayload & InternalLogoutOptions & {
    siteId?: string; // Site ID to load after logout.
};

/**
 * Options for internal logout.
 */
type InternalLogoutOptions = {
    forceLogout?: boolean; // If true, site will be marked as logged out, no matter the value tool_mobile_forcelogout.
    removeAccount?: boolean; // If true, site will be removed too after logout.
};

/**
 * Process to run after login navigation finishes.
 */
export type CoreSitesAfterLoginNavigationProcess = {
    priority: number;
    callback: () => Promise<void>;
};
