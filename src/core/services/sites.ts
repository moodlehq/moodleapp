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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import {
    CoreSite,
    CoreSiteWSPreSets,
    CoreSiteInfo,
    CoreSiteConfig,
    CoreSitePublicConfigResponse,
    CoreSiteInfoResponse,
} from '@classes/site';
import { SQLiteDB, SQLiteDBRecordValues, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreError } from '@classes/errors/error';
import { CoreSiteError } from '@classes/errors/siteerror';
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
import { CoreArray } from '../singletons/array';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreRedirectPayload } from './navigator';
import { CoreSitesFactory } from './sites-factory';
import { CoreText } from '@singletons/text';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreErrorWithTitle } from '@classes/errors/errorwithtitle';
import { CoreAjaxError } from '@classes/errors/ajaxerror';
import { CoreAjaxWSError } from '@classes/errors/ajaxwserror';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreDatabaseConfiguration, CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { asyncInstance, AsyncInstance } from '../utils/async-instance';
import { CoreConfig } from './config';

export const CORE_SITE_SCHEMAS = new InjectionToken<CoreSiteSchema[]>('CORE_SITE_SCHEMAS');
export const CORE_SITE_CURRENT_SITE_ID_CONFIG = 'current_site_id';

/*
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

    protected logger: CoreLogger;
    protected sessionRestored = false;
    protected currentSite?: CoreSite;
    protected sites: { [s: string]: CoreSite } = {};
    protected siteSchemasMigration: { [siteId: string]: Promise<void> } = {};
    protected siteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected pluginsSiteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected siteTables: Record<string, Record<string, CorePromisedValue<CoreDatabaseTable>>> = {};
    protected schemasTables: Record<string, AsyncInstance<CoreDatabaseTable<SchemaVersionsDBEntry, 'name'>>> = {};
    protected sitesTable = asyncInstance<CoreDatabaseTable<SiteDBEntry>>();

    constructor(@Optional() @Inject(CORE_SITE_SCHEMAS) siteSchemas: CoreSiteSchema[][] = []) {
        this.logger = CoreLogger.getInstance('CoreSitesProvider');
        this.siteSchemas = CoreArray.flatten(siteSchemas).reduce(
            (siteSchemas, schema) => {
                siteSchemas[schema.name] = schema;

                return siteSchemas;
            },
            this.siteSchemas,
        );
    }

    /**
     * Initialize.
     */
    initialize(): void {
        CoreEvents.on(CoreEvents.SITE_DELETED, async ({ siteId }) => {
            if (!siteId || !(siteId in this.siteTables)) {
                return;
            }

            await Promise.all(
                Object
                    .values(this.siteTables[siteId])
                    .map(promisedTable => promisedTable.then(table => table.destroy())),
            );

            delete this.siteTables[siteId];
        });
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        const sitesTable = new CoreDatabaseTableProxy<SiteDBEntry>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            CoreApp.getDB(),
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
        PrimaryKeyColumn extends keyof DBRecord
    >(
        tableName: string,
        options: Partial<{
            siteId: string;
            config: Partial<CoreDatabaseConfiguration>;
            database: SQLiteDB;
            primaryKeyColumns: PrimaryKeyColumn[];
            onDestroy(): void;
        }> = {},
    ): Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn>> {
        const siteId = options.siteId ?? this.getCurrentSiteId();

        if (!(siteId in this.siteTables)) {
            this.siteTables[siteId] = {};
        }

        if (!(tableName in this.siteTables[siteId])) {
            const promisedTable = this.siteTables[siteId][tableName] = new CorePromisedValue();
            const database = options.database ?? await this.getSiteDb(siteId);
            const table = new CoreDatabaseTableProxy<DBRecord, PrimaryKeyColumn>(
                options.config ?? {},
                database,
                tableName,
                options.primaryKeyColumns,
            );

            options.onDestroy && table.addListener({ onDestroy: options.onDestroy });

            await table.initialize();

            promisedTable.resolve(table as unknown as CoreDatabaseTable);
        }

        return this.siteTables[siteId][tableName] as unknown as Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn>>;
    }

    /**
     * Get the demo data for a certain "name" if it is a demo site.
     *
     * @param name Name of the site to check.
     * @return Site data if it's a demo site, undefined otherwise.
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
     * @return A promise resolved when the site is checked.
     */
    async checkSite(siteUrl: string, protocol: string = 'https://'): Promise<CoreSiteCheckResponse> {
        // The formatURL function adds the protocol if is missing.
        siteUrl = CoreUrlUtils.formatURL(siteUrl);

        if (!CoreUrlUtils.isHttpURL(siteUrl)) {
            throw new CoreError(Translate.instant('core.login.invalidsite'));
        } else if (!CoreApp.isOnline()) {
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
            protocol = protocol == 'https://' ? 'http://' : 'https://';

            try {
                return await this.checkSiteWithProtocol(siteUrl, protocol);
            } catch (secondError) {
                if (secondError.critical) {
                    throw secondError;
                }

                // Site doesn't exist. Return the error message.
                if (CoreTextUtils.getErrorMessageFromError(error)) {
                    throw error;
                } else if (CoreTextUtils.getErrorMessageFromError(secondError)) {
                    throw secondError;
                } else {
                    throw new CoreError(Translate.instant('core.cannotconnecttrouble'));
                }
            }
        }
    }

    /**
     * Helper function to check if a site is valid and if it has specifics settings for authentication.
     *
     * @param siteUrl URL of the site to check.
     * @param protocol Protocol to use.
     * @return A promise resolved when the site is checked.
     */
    async checkSiteWithProtocol(siteUrl: string, protocol: string): Promise<CoreSiteCheckResponse> {
        // Now, replace the siteUrl with the protocol.
        siteUrl = siteUrl.replace(/^https?:\/\//i, protocol);

        // Create a temporary site to fetch site info.
        let temporarySite = CoreSitesFactory.makeSite(undefined, siteUrl);
        let config: CoreSitePublicConfigResponse | undefined;

        try {
            config = await temporarySite.getPublicConfig();
        } catch (error) {
            const treatedError = await this.treatGetPublicConfigError(temporarySite.getURL(), error);
            if (treatedError.critical) {
                throw treatedError; // App received a WS error, stop.
            }

            // Try to add or remove 'www'.
            temporarySite = CoreSitesFactory.makeSite(undefined, CoreUrlUtils.addOrRemoveWWW(siteUrl));

            try {
                config = await temporarySite.getPublicConfig();
            } catch (secondError) {
                const treatedSecondError = await this.treatGetPublicConfigError(temporarySite.getURL(), secondError);
                if (treatedSecondError.critical) {
                    throw treatedSecondError; // App received a WS error, stop.
                }

                // App didn't receive a WS response, probably cannot connect. Prioritize first error if it's valid.
                if (CoreTextUtils.getErrorMessageFromError(error)) {
                    throw error;
                } else {
                    throw secondError;
                }
            }
        }

        // Check that the user can authenticate.
        if (!config.enablewebservices) {
            throw new CoreSiteError({
                message: Translate.instant('core.login.webservicesnotenabled'),
                critical: true,
            });
        } else if (!config.enablemobilewebservice) {
            throw new CoreSiteError({
                message: Translate.instant('core.login.mobileservicesnotenabled'),
                critical: true,
            });
        } else if (config.maintenanceenabled) {
            let message = Translate.instant('core.sitemaintenance');
            if (config.maintenancemessage) {
                message += config.maintenancemessage;
            }

            throw new CoreSiteError({
                message,
                critical: true,
            });
        }

        siteUrl = temporarySite.getURL();

        return { siteUrl, code: config?.typeoflogin || 0, service: CoreConstants.CONFIG.wsservice, config };
    }

    /**
     * Treat an error returned by getPublicConfig in checkSiteWithProtocol. Converts the error to a CoreSiteError.
     *
     * @param siteUrl Site URL.
     * @param error Error returned.
     * @return Promise resolved with the treated error.
     */
    protected async treatGetPublicConfigError(siteUrl: string, error: CoreAjaxError | CoreAjaxWSError): Promise<CoreSiteError> {
        if (!('errorcode' in error)) {
            // The WS didn't return data, probably cannot connect.
            return new CoreSiteError({
                message: error.message || '',
                critical: false, // Allow fallback to http if siteUrl uses https.
            });
        }

        // Service supported but an error happened. Return error.
        let critical = true;

        if (error.errorcode === 'codingerror') {
            // This could be caused by a redirect. Check if it's the case.
            const redirect = await CoreUtils.checkRedirect(siteUrl);

            if (redirect) {
                error.message = Translate.instant('core.login.sitehasredirect');
                critical = false; // Keep checking fallback URLs.
            } else {
                // We can't be sure if there is a redirect or not. Display cannot connect error.
                error.message = Translate.instant('core.cannotconnecttrouble');
            }
        } else if (error.errorcode === 'invalidrecord') {
            // WebService not found, site not supported.
            error.message = Translate.instant('core.login.invalidmoodleversion', { $a: CoreSite.MINIMUM_MOODLE_VERSION });
        } else if (error.errorcode === 'redirecterrordetected') {
            critical = false; // Keep checking fallback URLs.
        }

        return new CoreSiteError({
            message: error.message,
            errorcode: error.errorcode,
            critical,
        });
    }

    /**
     * Check if a site exists.
     *
     * @param siteUrl URL of the site to check.
     * @return A promise to be resolved if the site exists.
     * @deprecated since app 4.0. Now the app calls uses tool_mobile_get_public_config to check if site exists.
     */
    async siteExists(siteUrl: string): Promise<void> {
        let data: CoreSitesLoginTokenResponse;

        // Use a valid path first.
        siteUrl = CoreUrlUtils.removeUrlParams(siteUrl);

        try {
            data = await Http.post(siteUrl + '/login/token.php', { appsitecheck: 1 }).pipe(timeout(CoreWS.getRequestTimeout()))
                .toPromise();
        } catch (error) {
            // Default error messages are kinda bad, return our own message.
            throw new CoreSiteError({
                message: Translate.instant('core.cannotconnecttrouble'),
            });
        }

        if (data === null) {
            // Cannot connect.
            throw new CoreSiteError({
                message: Translate.instant('core.cannotconnect', { $a: CoreSite.MINIMUM_MOODLE_VERSION }),
            });
        }

        if (data.errorcode && (data.errorcode == 'enablewsdescription' || data.errorcode == 'requirecorrectaccess')) {
            throw new CoreSiteError({
                errorcode: data.errorcode,
                message: data.error ?? '',
            });
        }

        if (data.error && data.error == 'Web services must be enabled in Advanced features.') {
            throw new CoreSiteError({
                errorcode: 'enablewsdescription',
                message: data.error,
            });
        }

        // Other errors are not being checked because invalid login will be always raised and we cannot differ them.
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
    async getUserToken(
        siteUrl: string,
        username: string,
        password: string,
        service?: string,
        retry?: boolean,
    ): Promise<CoreSiteUserTokenResponse> {
        if (!CoreApp.isOnline()) {
            throw new CoreNetworkError();
        }

        service = service || CoreConstants.CONFIG.wsservice;
        const params = {
            username,
            password,
            service,
        };
        const loginUrl = siteUrl + '/login/token.php';
        let data: CoreSitesLoginTokenResponse;

        try {
            data = await Http.post(loginUrl, params).pipe(timeout(CoreWS.getRequestTimeout())).toPromise();
        } catch (error) {
            throw new CoreError(Translate.instant('core.cannotconnecttrouble'));
        }

        if (data === undefined) {
            throw new CoreError(Translate.instant('core.cannotconnecttrouble'));
        } else {
            if (data.token !== undefined) {
                return { token: data.token, siteUrl, privateToken: data.privatetoken };
            } else {
                if (data.error !== undefined) {
                    // We only allow one retry (to avoid loops).
                    if (!retry && data.errorcode == 'requirecorrectaccess') {
                        siteUrl = CoreUrlUtils.addOrRemoveWWW(siteUrl);

                        return this.getUserToken(siteUrl, username, password, service, true);
                    } else if (data.errorcode == 'missingparam') {
                        // It seems the server didn't receive all required params, it could be due to a redirect.
                        const redirect = await CoreUtils.checkRedirect(loginUrl);

                        if (redirect) {
                            throw new CoreSiteError({
                                message: Translate.instant('core.login.sitehasredirect'),
                            });
                        }
                    }

                    throw new CoreSiteError({
                        message: data.error,
                        errorcode: data.errorcode,
                    });
                }

                throw new CoreError(Translate.instant('core.login.invalidaccount'));
            }
        }
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
    async newSite(
        siteUrl: string,
        token: string,
        privateToken: string = '',
        login: boolean = true,
        oauthId?: number,
    ): Promise<string> {
        if (typeof login != 'boolean') {
            login = true;
        }

        // Create a "candidate" site to fetch the site info.
        let candidateSite = CoreSitesFactory.makeSite(undefined, siteUrl, token, undefined, privateToken, undefined, undefined);
        let isNewSite = true;

        try {
            const info = await candidateSite.fetchSiteInfo();

            const result = this.isValidMoodleVersion(info);
            if (result != CoreSitesProvider.VALID_VERSION) {
                return this.treatInvalidAppVersion(result);
            }

            const siteId = this.createSiteID(info.siteurl, info.username);

            // Check if the site already exists.
            const site = await CoreUtils.ignoreErrors<CoreSite>(this.getSite(siteId));

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
                await this.migrateSiteSchemas(candidateSite);
            }

            // Try to get the site config.
            let config: CoreSiteConfig | undefined;

            try {
                config = await this.getSiteConfig(candidateSite);
            } catch (error) {
                // Ignore errors if it's not a new site, we'll use the config already stored.
                if (isNewSite) {
                    throw error;
                }
            }

            if (config !== undefined) {
                candidateSite.setConfig(config);
            }

            // Add site to sites list.
            await this.addSite(siteId, siteUrl, token, info, privateToken, config, oauthId);
            this.sites[siteId] = candidateSite;

            if (login) {
                // Turn candidate site into current site.
                this.currentSite = candidateSite;
                // Store session.
                await this.login(siteId);
            } else if (this.currentSite && this.currentSite.getId() == siteId) {
                // Current site has just been updated, trigger the event.
                CoreEvents.trigger(CoreEvents.SITE_UPDATED, info, siteId);
            }

            CoreEvents.trigger(CoreEvents.SITE_ADDED, info, siteId);

            return siteId;
        } catch (error) {
            // Error invaliddevice is returned by Workplace server meaning the same as connecttoworkplaceapp.
            if (error && error.errorcode == 'invaliddevice') {
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
     * @return A promise rejected with the error info.
     */
    protected async treatInvalidAppVersion(result: number, siteId?: string): Promise<never> {
        let errorCode: string | undefined;
        let errorKey: string | undefined;
        let translateParams = {};

        switch (result) {
            case CoreSitesProvider.MOODLE_APP:
                errorKey = 'core.login.connecttomoodleapp';
                errorCode = 'connecttomoodleapp';
                break;
            case CoreSitesProvider.WORKPLACE_APP:
                errorKey = 'core.login.connecttoworkplaceapp';
                errorCode = 'connecttoworkplaceapp';
                break;
            default:
                errorCode = 'invalidmoodleversion';
                errorKey = 'core.login.invalidmoodleversion';
                translateParams = { $a: CoreSite.MINIMUM_MOODLE_VERSION };
        }

        if (siteId) {
            await this.setSiteLoggedOut(siteId);
        }

        throw new CoreSiteError({
            message: Translate.instant(errorKey, translateParams),
            errorcode: errorCode,
            loggedOut: true,
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
     * @return The service shortname.
     * @deprecated since app 4.0
     */
    determineService(): string {
        return CoreConstants.CONFIG.wsservice;
    }

    /**
     * Check for the minimum required version.
     *
     * @param info Site info.
     * @return Either VALID_VERSION, WORKPLACE_APP, MOODLE_APP or INVALID_VERSION.
     */
    protected isValidMoodleVersion(info: CoreSiteInfoResponse): number {
        if (!info) {
            return CoreSitesProvider.INVALID_VERSION;
        }

        // Try to validate by version.
        if (info.version) {
            const version = parseInt(info.version, 10);
            if (!isNaN(version)) {
                if (version >= CoreSite.MOODLE_RELEASES[CoreSite.MINIMUM_MOODLE_VERSION]) {
                    return this.validateWorkplaceVersion(info);
                }
            }
        }

        // We couldn't validate by version number. Let's try to validate by release number.
        const release = this.getReleaseNumber(info.release || '');
        if (release) {
            if (release >= CoreSite.MINIMUM_MOODLE_VERSION) {
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
     * @return Either VALID_VERSION, WORKPLACE_APP or MOODLE_APP.
     */
    protected validateWorkplaceVersion(info: CoreSiteInfoResponse): number {
        const isWorkplace = !!info.functions && info.functions.some((func) => func.name == 'tool_program_get_user_programs');

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
     * @return If the app is workplace enabled.
     */
    protected isWorkplaceEnabled(): boolean {
        return false;
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
     * Returns the major release number from site release info.
     *
     * @param rawRelease Raw release info text.
     * @return Major release number or empty.
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
     * @return Promise resolved when done.
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
        await this.sitesTable.insert({
            id,
            siteUrl,
            token,
            info: info ? JSON.stringify(info) : undefined,
            privateToken,
            config: config ? JSON.stringify(config) : undefined,
            loggedOut: 0,
            oauthId,
        });
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
     * @return Resolved with if meets the requirements, rejected otherwise.
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

            if (downloadUrl != null) {
                // Do not block interface.
                promise = CoreDomUtils.showConfirm(
                    Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                    Translate.instant('core.updaterequired'),
                    Translate.instant('core.download'),
                    Translate.instant(siteId ? 'core.mainmenu.logout' : 'core.cancel'),
                ).then(() => CoreUtils.openInBrowser(downloadUrl, { showBrowserWarning: false })).catch(() => {
                    // Do nothing.
                });
            } else {
                // Do not block interface.
                promise = CoreDomUtils.showAlert(
                    Translate.instant('core.updaterequired'),
                    Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                ).then((alert) => alert.onWillDismiss());
            }

            promise.finally(() => {
                if (siteId) {
                    // Logout the currentSite and expire the token.
                    this.logout();
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
     * @param redirectData Data of the path/url to open once authenticated if logged out. If not defined, site initial page.
     * @return Promise resolved with true if site is loaded, resolved with false if cannot login.
     */
    async loadSite(siteId: string, redirectData?: CoreRedirectPayload): Promise<boolean> {
        this.logger.debug(`Load site ${siteId}`);

        const site = await this.getSite(siteId);

        const siteUrlAllowed = await CoreLoginHelper.isSiteUrlAllowed(site.getURL(), false);
        if (!siteUrlAllowed) {
            throw new CoreErrorWithTitle(Translate.instant('core.login.sitenotallowed'));
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
     * @return Promise resolved when done.
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
     * @return Current site or undefined if none.
     */
    getCurrentSite(): CoreSite | undefined {
        return this.currentSite;
    }

    /**
     * Get current site or fail if none.
     *
     * @return Current site.
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
        return this.currentSite?.getUserId() || 0;
    }

    /**
     * Check if the user is logged in a site.
     *
     * @return Whether the user is logged in a site.
     */
    isLoggedIn(): boolean {
        return this.currentSite !== undefined && this.currentSite.token !== undefined &&
            this.currentSite.token != '';
    }

    /**
     * Delete a site from the sites list.
     *
     * @param siteId ID of the site to delete.
     * @return Promise to be resolved when the site is deleted.
     */
    async deleteSite(siteId: string): Promise<void> {
        this.logger.debug(`Delete site ${siteId}`);

        if (this.currentSite !== undefined && this.currentSite.id == siteId) {
            this.logout();
        }

        const site = await this.getSite(siteId);

        await site.deleteDB();

        // Site DB deleted, now delete the app from the list of sites.
        delete this.sites[siteId];

        try {
            await this.sitesTable.deleteByPrimaryKey({ id: siteId });
        } catch (err) {
            // DB remove shouldn't fail, but we'll go ahead even if it does.
        }

        // Site deleted from sites list, now delete the folder.
        await site.deleteFolder();

        CoreEvents.trigger(CoreEvents.SITE_DELETED, site, siteId);
    }

    /**
     * Check if there are sites stored.
     *
     * @return Promise resolved with true if there are sites and false if there aren't.
     */
    async hasSites(): Promise<boolean> {
        const isEmpty = await this.sitesTable.isEmpty();

        return !isEmpty;
    }

    /**
     * Returns a site object.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with the site.
     */
    async getSite(siteId?: string): Promise<CoreSite> {
        if (!siteId) {
            if (this.currentSite) {
                return this.currentSite;
            }

            throw new CoreError('No current site found.');
        } else if (this.currentSite && this.currentSite.getId() == siteId) {
            return this.currentSite;
        } else if (this.sites[siteId] !== undefined) {
            return this.sites[siteId];
        } else {
            // Retrieve and create the site.
            try {
                const data = await this.sitesTable.getOneByPrimaryKey({ id: siteId });

                return this.addSiteFromSiteListEntry(data);
            } catch {
                throw new CoreError('SiteId not found');
            }
        }
    }

    /**
     * Get a site directly from the database, without using any optimizations.
     *
     * @param siteId Site id.
     * @return Site.
     */
    async getSiteFromDB(siteId: string): Promise<CoreSite> {
        const db = CoreApp.getDB();

        try {
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
     * @return Promise resolved with the site.
     */
    async getSiteByUrl(siteUrl: string): Promise<CoreSite> {
        const data = await this.sitesTable.getOne({ siteUrl });

        if (this.sites[data.id] !== undefined) {
            return this.sites[data.id];
        }

        return this.addSiteFromSiteListEntry(data);
    }

    /**
     * Create a site from an entry of the sites list DB. The new site is added to the list of "cached" sites: this.sites.
     *
     * @param entry Site list entry.
     * @return Promised resolved with the created site.
     */
    addSiteFromSiteListEntry(entry: SiteDBEntry): Promise<CoreSite> {
        // Parse info and config.
        const site = this.makeSiteFromSiteListEntry(entry);

        return this.migrateSiteSchemas(site).then(() => {
            // Set site after migrating schemas, or a call to getSite could get the site while tables are being created.
            this.sites[entry.id] = site;

            return site;
        });
    }

    /**
     * Make a site instance from a database entry.
     *
     * @param entry Site database entry.
     * @return Site.
     */
    makeSiteFromSiteListEntry(entry: SiteDBEntry): CoreSite {
        const info = entry.info ? <CoreSiteInfo> CoreTextUtils.parseJSON(entry.info) : undefined;
        const config = entry.config ? <CoreSiteConfig> CoreTextUtils.parseJSON(entry.config) : undefined;

        const site = CoreSitesFactory.makeSite(
            entry.id,
            entry.siteUrl,
            entry.token,
            info,
            entry.privateToken,
            config,
            entry.loggedOut == 1,
        );
        site.setOAuthId(entry.oauthId || undefined);

        return site;
    }

    /**
     * Returns if the site is the current one.
     *
     * @param site Site object or siteId to be compared. If not defined, use current site.
     * @return Whether site or siteId is the current one.
     */
    isCurrentSite(site?: string | CoreSite): boolean {
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
    async getSiteDb(siteId?: string): Promise<SQLiteDB> {
        const site = await this.getSite(siteId);

        return site.getDb();
    }

    /**
     * Returns the site home ID of a site.
     *
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with site home ID.
     */
    async getSiteHomeId(siteId?: string): Promise<number> {
        const site = await this.getSite(siteId);

        return site.getSiteHomeId();
    }

    /**
     * Get the list of sites stored.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
     */
    async getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = await this.sitesTable.getMany();

        const formattedSites: CoreSiteBasicInfo[] = [];
        sites.forEach((site) => {
            if (!ids || ids.indexOf(site.id) > -1) {
                // Parse info.
                const siteInfo = site.info ? <CoreSiteInfo> CoreTextUtils.parseJSON(site.info) : undefined;
                const basicInfo: CoreSiteBasicInfo = {
                    id: site.id,
                    siteUrl: site.siteUrl,
                    siteUrlWithoutProtocol: site.siteUrl.replace(/^https?:\/\//, '').toLowerCase(),
                    fullName: siteInfo?.fullname,
                    siteName: CoreConstants.CONFIG.sitename == '' ? siteInfo?.sitename: CoreConstants.CONFIG.sitename,
                    avatar: siteInfo?.userpictureurl,
                    siteHomeId: siteInfo?.siteid || 1,
                };
                formattedSites.push(basicInfo);
            }
        });

        return formattedSites;
    }

    /**
     * Get the list of sites stored, sorted by sitename, URL and fullname.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
     */
    async getSortedSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = await this.getSites(ids);

        // Sort sites by site name, url and then fullname.
        sites.sort((a, b) => {
            // First compare by site name.
            let textA = CoreTextUtils.cleanTags(a.siteName).toLowerCase().trim();
            let textB = CoreTextUtils.cleanTags(b.siteName).toLowerCase().trim();

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
            textA = a.fullName?.toLowerCase().trim() || '';
            textB = b.fullName?.toLowerCase().trim() || '';

            return textA.localeCompare(textB);
        });

        return sites;
    }

    /**
     * Get the list of IDs of sites stored and not logged out.
     *
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getLoggedInSitesIds(): Promise<string[]> {
        const sites = await this.sitesTable.getMany({ loggedOut : 0 });

        return sites.map((site) => site.id);
    }

    /**
     * Get the list of IDs of sites stored.
     *
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getSitesIds(): Promise<string[]> {
        const sites = await this.sitesTable.getMany();

        return sites.map((site) => site.id);
    }

    /**
     * Get instances of all stored sites.
     *
     * @return Promise resolved when the sites are retrieved.
     */
    async getSitesInstances(): Promise<CoreSite[]> {
        const siteIds = await this.getSitesIds();

        return await Promise.all(siteIds.map(async (siteId) => await this.getSite(siteId)));
    }

    /**
     * Login the user in a site.
     *
     * @param siteid ID of the site the user is accessing.
     * @return Promise resolved when current site is stored.
     */
    async login(siteId: string): Promise<void> {
        await CoreConfig.set(CORE_SITE_CURRENT_SITE_ID_CONFIG, siteId);

        CoreEvents.trigger(CoreEvents.LOGIN, {}, siteId);
    }

    /**
     * Logout the user.
     *
     * @param forceLogout If true, site will be marked as logged out, no matter the value tool_mobile_forcelogout.
     * @return Promise resolved when the user is logged out.
     */
    async logout(options: CoreSitesLogoutOptions = {}): Promise<void> {
        if (!this.currentSite) {
            return;
        }

        const promises: Promise<unknown>[] = [];
        const siteConfig = this.currentSite.getStoredConfig();
        const siteId = this.currentSite.getId();

        this.currentSite = undefined;

        if (options.forceLogout || (siteConfig && siteConfig.tool_mobile_forcelogout == '1')) {
            promises.push(this.setSiteLoggedOut(siteId));
        }

        promises.push(this.removeStoredCurrentSite());

        await CoreUtils.ignoreErrors(Promise.all(promises));

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
     * @return Promise resolved with boolean: true if app will be reloaded after logout.
     */
    async logoutForRedirect(siteId: string, redirectData: CoreRedirectPayload): Promise<boolean> {
        if (!this.currentSite) {
            return false;
        }

        if (CoreSitePlugins.hasSitePluginsLoaded) {
            // The site has site plugins so the app will be restarted. Store the data and logout.
            CoreApp.storeRedirect(siteId, redirectData);
        }

        await this.logout();

        return CoreSitePlugins.hasSitePluginsLoaded;
    }

    /**
     * Restores the session to the previous one so the user doesn't has to login everytime the app is started.
     *
     * @return Promise resolved if a session is restored.
     */
    async restoreSession(): Promise<void> {
        if (this.sessionRestored) {
            return Promise.reject(new CoreError('Session already restored.'));
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
     * Mark a site as logged out so the user needs to authenticate again.
     *
     * @param siteId ID of the site.
     * @return Promise resolved when done.
     */
    protected async setSiteLoggedOut(siteId: string): Promise<void> {
        const site = await this.getSite(siteId);

        site.setLoggedOut(true);

        await this.sitesTable.update({ loggedOut: 1 }, { id: siteId });
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
     * @return A promise resolved when the site is updated.
     */
    async updateSiteTokenBySiteId(siteId: string, token: string, privateToken: string = ''): Promise<void> {
        const site = await this.getSite(siteId);

        site.token = token;
        site.privateToken = privateToken;
        site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

        await this.sitesTable.update(
            {
                token,
                privateToken,
                loggedOut: 0,
            },
            { id: siteId },
        );
    }

    /**
     * Updates a site's info.
     *
     * @param siteid Site's ID.
     * @return A promise resolved when the site is updated.
     */
    async updateSiteInfo(siteId?: string): Promise<void> {
        const site = await this.getSite(siteId);

        try {
            const info = await site.fetchSiteInfo();
            site.setInfo(info);

            const versionCheck = this.isValidMoodleVersion(info);
            if (versionCheck != CoreSitesProvider.VALID_VERSION) {
                // The Moodle version is not supported, reject.
                return this.treatInvalidAppVersion(versionCheck, site.getId());
            }

            // Try to get the site config.
            let config: CoreSiteConfig | undefined;

            try {
                config = await this.getSiteConfig(site);
            } catch (error) {
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
     * @return A promise to be resolved when the site is updated.
     */
    updateSiteInfoByUrl(siteUrl: string, username: string): Promise<void> {
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
        // If prioritize is true, check current site first.
        if (prioritize && this.currentSite && this.currentSite.containsUrl(url)) {
            if (!username || this.currentSite?.getInfo()?.username === username) {
                return [this.currentSite.getId()];
            }
        }

        // Check if URL has http(s) protocol.
        if (!url.match(/^https?:\/\//i)) {
            // URL doesn't have http(s) protocol. Check if it has any protocol.
            if (CoreUrlUtils.isAbsoluteURL(url)) {
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
            const siteEntries = await this.sitesTable.getMany();
            const ids: string[] = [];

            await Promise.all(siteEntries.map(async (site) => {
                if (!this.sites[site.id]) {
                    await this.addSiteFromSiteListEntry(site);
                }

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
     * @return Promise resolved with the site ID.
     */
    async getStoredCurrentSiteId(): Promise<string> {
        await this.migrateCurrentSiteLegacyTable();

        return CoreConfig.get(CORE_SITE_CURRENT_SITE_ID_CONFIG);
    }

    /**
     * Remove current site stored in DB.
     *
     * @return Promise resolved when done.
     */
    async removeStoredCurrentSite(): Promise<void> {
        await CoreConfig.delete(CORE_SITE_CURRENT_SITE_ID_CONFIG);
    }

    /**
     * Get the public config of a certain site.
     *
     * @param siteUrl URL of the site.
     * @return Promise resolved with the public config.
     */
    getSitePublicConfig(siteUrl: string): Promise<CoreSitePublicConfigResponse> {
        const temporarySite = CoreSitesFactory.makeSite(undefined, siteUrl);

        return temporarySite.getPublicConfig();
    }

    /**
     * Get site config.
     *
     * @param site The site to get the config.
     * @return Promise resolved with config if available.
     */
    protected async getSiteConfig(site: CoreSite): Promise<CoreSiteConfig | undefined> {
        return await site.getConfig(undefined, true);
    }

    /**
     * Check if a certain feature is disabled in a site.
     *
     * @param name Name of the feature to check.
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with true if disabled.
     */
    async isFeatureDisabled(name: string, siteId?: string): Promise<boolean> {
        const site = await this.getSite(siteId);

        return site.isFeatureDisabled(name);
    }

    /**
     * Check if a WS is available in the current site, if any.
     *
     * @param method WS name.
     * @return Whether the WS is available.
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
     * @return Promise resolved when done.
     */
    async registerSiteSchema(schema: CoreSiteSchema): Promise<void> {
        if (!this.currentSite) {
            return;
        }

        try {
            // Site has already been created, apply the schema directly.
            const schemas: {[name: string]: CoreRegisteredSiteSchema} = {};
            schemas[schema.name] = schema;

            // Apply it to the specified site only.
            (schema as CoreRegisteredSiteSchema).siteId = this.currentSite.getId();

            await this.applySiteSchemas(this.currentSite, schemas);
        } finally {
            this.pluginsSiteSchemas[schema.name] = schema;
        }
    }

    /**
     * Install and upgrade all the registered schemas and tables.
     *
     * @param site Site.
     * @return Promise resolved when done.
     */
    migrateSiteSchemas(site: CoreSite): Promise<void> {
        if (!site.id) {
            return Promise.resolve();
        }

        const siteId = site.id;

        if (this.siteSchemasMigration[site.id] !== undefined) {
            return this.siteSchemasMigration[site.id];
        }

        this.logger.debug(`Migrating all schemas of ${site.id}`);

        // First create tables not registerd with name/version.
        const promise = site.getDb().createTableFromSchema(SCHEMA_VERSIONS_TABLE_SCHEMA)
            .then(() => this.applySiteSchemas(site, this.siteSchemas));

        this.siteSchemasMigration[site.id] = promise;

        return promise.finally(() => {
            delete this.siteSchemasMigration[siteId];
        });
    }

    /**
     * Install and upgrade the supplied schemas for a certain site.
     *
     * @param site Site.
     * @param schemas Schemas to migrate.
     * @return Promise resolved when done.
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
            const oldVersion = versions[name] || 0;
            if (oldVersion >= schema.version || (schema.siteId && site.getId() != schema.siteId)) {
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
     * @return Promise resolved when done.
     */
    protected async applySiteSchema(site: CoreSite, schema: CoreRegisteredSiteSchema, oldVersion: number): Promise<void> {
        if (!site.id) {
            return;
        }

        const db = site.getDb();

        if (schema.tables) {
            await db.createTablesFromSchema(schema.tables);
        }
        if (schema.migrate && oldVersion > 0) {
            await schema.migrate(db, oldVersion, site.id);
        }

        // Set installed version.
        await this.getSiteSchemasTable(site).insert({ name: schema.name, version: schema.version });
    }

    /**
     * Check if a URL is the root URL of any of the stored sites.
     *
     * @param url URL to check.
     * @param username Username to check.
     * @return Promise resolved with site to use and the list of sites that have
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
            CoreUrlUtils.removeProtocolAndWWW(site.getURL()),
        );
        const treatedUrl = CoreText.removeEndingSlash(CoreUrlUtils.removeProtocolAndWWW(url));

        if (siteUrl == treatedUrl) {
            result.site = site;
        }

        return result;
    }

    /**
     * Returns the Site Schema names that can be cleared on space storage.
     *
     * @param site The site that will be cleared.
     * @return Name of the site schemas.
     */
    getSiteTableSchemasToClear(site: CoreSite): string[] {
        let reset: string[] = [];
        const schemas = Object.values(this.siteSchemas).concat(Object.values(this.pluginsSiteSchemas));

        schemas.forEach((schema) => {
            if (schema.canBeCleared && (!schema.siteId || site.getId() == schema.siteId)) {
                reset = reset.concat(schema.canBeCleared);
            }
        });

        return reset;
    }

    /**
     * Returns presets for a given reading strategy.
     *
     * @param strategy Reading strategy.
     * @return PreSets options object.
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findSites(search: string): Promise<CoreLoginSiteInfo[]> {
        return [];
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
            const db = CoreApp.getDB();

            const { siteId } = await db.getRecord<{ siteId: string }>('current_site');

            await CoreConfig.set(CORE_SITE_CURRENT_SITE_ID_CONFIG, siteId);
            await CoreApp.deleteTableSchema('current_site');
            await db.dropTable('current_site');
        } catch {
            // There was no current site, silence the error.
        } finally {
            await CoreConfig.set('current_site_migrated', 1);
        }
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
                onDestroy: () => delete this.schemasTables[siteId],
            }),
        );

        return this.schemasTables[siteId];
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
     * Code of the warning message to show to the user. @deprecated since app 4.0
     */
    warning?: string;

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
    siteUrl: string; // Site URL.
    siteUrlWithoutProtocol: string; // Site URL without protocol.
    fullName?: string; // User's full name.
    siteName?: string; // Site's name.
    avatar?: string; // User's avatar.
    badge?: number; // Badge to display in the site.
    siteHomeId?: number; // Site home ID.
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
     * Names of the tables of the site schema that can be cleared.
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
     * @param db Site database.
     * @param oldVersion Old version of the schema or 0 if not installed.
     * @param siteId Site Id to migrate.
     * @return Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number, siteId: string): Promise<void> | void;
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
}

/**
 * Common options used when calling a WS through CoreSite.
 */
export type CoreSitesCommonWSOptions = {
    readingStrategy?: CoreSitesReadingStrategy; // Reading strategy.
    siteId?: string; // Site ID. If not defined, current site.
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
export type CoreSitesLogoutOptions = {
    forceLogout?: boolean; // If true, site will be marked as logged out, no matter the value tool_mobile_forcelogout.
    removeAccount?: boolean; // If true, site will be removed too after logout.
};
