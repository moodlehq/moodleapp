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
    LocalMobileResponse,
    CoreSiteInfo,
    CoreSiteConfig,
    CoreSitePublicConfigResponse,
    CoreSiteInfoResponse,
} from '@classes/site';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreError } from '@classes/errors/error';
import { CoreSiteError } from '@classes/errors/siteerror';
import { makeSingleton, Translate, Http } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import {
    APP_SCHEMA,
    SCHEMA_VERSIONS_TABLE_SCHEMA,
    SITES_TABLE_NAME,
    CURRENT_SITE_TABLE_NAME,
    SCHEMA_VERSIONS_TABLE_NAME,
    SiteDBEntry,
    CurrentSiteDBEntry,
    SchemaVersionsDBEntry,
} from '@services/database/sites';
import { CoreArray } from '../singletons/array';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreNavigationOptions } from './navigator';
import { CoreSitesFactory } from './sites-factory';
import { CoreText } from '@singletons/text';

export const CORE_SITE_SCHEMAS = new InjectionToken<CoreSiteSchema[]>('CORE_SITE_SCHEMAS');

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
    protected services = {};
    protected sessionRestored = false;
    protected currentSite?: CoreSite;
    protected sites: { [s: string]: CoreSite } = {};
    protected siteSchemasMigration: { [siteId: string]: Promise<void> } = {};
    protected siteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};
    protected pluginsSiteSchemas: { [name: string]: CoreRegisteredSiteSchema } = {};

    // Variables for DB.
    protected appDB: Promise<SQLiteDB>;
    protected resolveAppDB!: (appDB: SQLiteDB) => void;

    constructor(@Optional() @Inject(CORE_SITE_SCHEMAS) siteSchemas: CoreSiteSchema[][] = []) {
        this.appDB = new Promise(resolve => this.resolveAppDB = resolve);
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
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        this.resolveAppDB(CoreApp.getDB());
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
        let publicConfig: CoreSitePublicConfigResponse | undefined;

        // Now, replace the siteUrl with the protocol.
        siteUrl = siteUrl.replace(/^https?:\/\//i, protocol);

        try {
            await this.siteExists(siteUrl);
        } catch (error) {
            // Do not continue checking if WS are not enabled.
            if (error.errorcode == 'enablewsdescription') {
                error.critical = true;

                throw error;
            }

            // Site doesn't exist. Try to add or remove 'www'.
            const treatedUrl = CoreUrlUtils.addOrRemoveWWW(siteUrl);

            try {
                await this.siteExists(treatedUrl);

                // Success, use this new URL as site url.
                siteUrl = treatedUrl;
            } catch (secondError) {
                // Do not continue checking if WS are not enabled.
                if (secondError.errorcode == 'enablewsdescription') {
                    secondError.critical = true;

                    throw secondError;
                }

                // Return the error.
                if (CoreTextUtils.getErrorMessageFromError(error)) {
                    throw error;
                } else {
                    throw secondError;
                }
            }
        }

        // Site exists. Create a temporary site to check if local_mobile is installed.
        const temporarySite = CoreSitesFactory.makeSite(undefined, siteUrl);
        let data: LocalMobileResponse;

        try {
            data = await temporarySite.checkLocalMobilePlugin();
        } catch (error) {
            // Local mobile check returned an error. This only happens if the plugin is installed and it returns an error.
            throw new CoreSiteError({
                message: error.message,
                critical: true,
            });
        }

        data.service = data.service || CoreConstants.CONFIG.wsservice;
        this.services[siteUrl] = data.service; // No need to store it in DB.

        if (data.coreSupported || (data.code != CoreConstants.LOGIN_SSO_CODE && data.code != CoreConstants.LOGIN_SSO_INAPP_CODE)) {
            // SSO using local_mobile not needed, try to get the site public config.
            try {
                const config = await temporarySite.getPublicConfig();

                publicConfig = config;

                // Check that the user can authenticate.
                if (!config.enablewebservices) {
                    throw new CoreSiteError({
                        message: Translate.instant('core.login.webservicesnotenabled'),
                    });
                } else if (!config.enablemobilewebservice) {
                    throw new CoreSiteError({
                        message: Translate.instant('core.login.mobileservicesnotenabled'),
                    });
                } else if (config.maintenanceenabled) {
                    let message = Translate.instant('core.sitemaintenance');
                    if (config.maintenancemessage) {
                        message += config.maintenancemessage;
                    }

                    throw new CoreSiteError({
                        message,
                    });
                }

                // Everything ok.
                if (data.code === 0) {
                    data.code = config.typeoflogin;
                }
            } catch (error) {
                // Error, check if not supported.
                if (error.available === 1) {
                    // Service supported but an error happened. Return error.
                    if (error.errorcode == 'codingerror') {
                        // This could be caused by a redirect. Check if it's the case.
                        const redirect = await CoreUtils.checkRedirect(siteUrl);

                        if (redirect) {
                            error.error = Translate.instant('core.login.sitehasredirect');
                        } else {
                            // We can't be sure if there is a redirect or not. Display cannot connect error.
                            error.error = Translate.instant('core.cannotconnecttrouble');
                        }
                    }

                    throw new CoreSiteError({
                        message: error.error,
                        errorcode: error.errorcode,
                        critical: true,
                    });
                }
            }
        }

        siteUrl = temporarySite.getURL();

        return { siteUrl, code: data.code, warning: data.warning, service: data.service, config: publicConfig };
    }

    /**
     * Check if a site exists.
     *
     * @param siteUrl URL of the site to check.
     * @return A promise to be resolved if the site exists.
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
                message: data.error!,
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

        if (!service) {
            service = this.determineService(siteUrl);
        }

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

        if (typeof data == 'undefined') {
            throw new CoreError(Translate.instant('core.cannotconnecttrouble'));
        } else {
            if (typeof data.token != 'undefined') {
                return { token: data.token, siteUrl, privateToken: data.privatetoken };
            } else {
                if (typeof data.error != 'undefined') {
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
                return this.treatInvalidAppVersion(result, siteUrl);
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
            } else if (this.currentSite && this.currentSite.getId() == siteId) {
                // Current site has just been updated, trigger the event.
                CoreEvents.trigger(CoreEvents.SITE_UPDATED, info, siteId);
            }

            CoreEvents.trigger(CoreEvents.SITE_ADDED, info, siteId);

            return siteId;
        } catch (error) {
            // Error invaliddevice is returned by Workplace server meaning the same as connecttoworkplaceapp.
            if (error && error.errorcode == 'invaliddevice') {
                return this.treatInvalidAppVersion(CoreSitesProvider.WORKPLACE_APP, siteUrl);
            }

            throw error;
        }
    }

    /**
     * Having the result of isValidMoodleVersion, it treats the error message to be shown.
     *
     * @param result Result returned by isValidMoodleVersion function.
     * @param siteUrl The site url.
     * @param siteId If site is already added, it will invalidate the token.
     * @return A promise rejected with the error info.
     */
    protected async treatInvalidAppVersion(result: number, siteUrl: string, siteId?: string): Promise<never> {
        let errorCode: string | undefined;
        let errorKey: string | undefined;
        let translateParams;

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
            await this.setSiteLoggedOut(siteId, true);
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

        const version31 = 2016052300;
        const release31 = CoreSite.MINIMUM_MOODLE_VERSION;

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
        const db = await this.appDB;
        const entry: SiteDBEntry = {
            id,
            siteUrl,
            token,
            info: info ? JSON.stringify(info) : undefined,
            privateToken,
            config: config ? JSON.stringify(config) : undefined,
            loggedOut: 0,
            oauthId,
        };

        await db.insertRecord(SITES_TABLE_NAME, entry);
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

            if (downloadUrl != null) {
                // Do not block interface.
                CoreDomUtils.showConfirm(
                    Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                    Translate.instant('core.updaterequired'),
                    Translate.instant('core.download'),
                    Translate.instant(siteId ? 'core.mainmenu.logout' : 'core.cancel'),
                ).then(() => CoreUtils.openInBrowser(downloadUrl)).catch(() => {
                    // Do nothing.
                });
            } else {
                CoreDomUtils.showAlert(
                    Translate.instant('core.updaterequired'),
                    Translate.instant('core.updaterequireddesc', { $a: config.tool_mobile_minimumversion }),
                );
            }

            if (siteId) {
                // Logout the currentSite.
                await this.logout();

                // Always expire the token.
                await this.setSiteLoggedOut(siteId, true);
            }

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
     * @param pageName Name of the page to go once authenticated if logged out. If not defined, site initial page.
     * @param pageOptions Options of the navigation to pageName.
     * @return Promise resolved with true if site is loaded, resolved with false if cannot login.
     */
    async loadSite(siteId: string, pageName?: string, pageOptions?: CoreNavigationOptions): Promise<boolean> {
        this.logger.debug(`Load site ${siteId}`);

        const site = await this.getSite(siteId);

        this.currentSite = site;

        if (site.isLoggedOut()) {
            // Logged out, trigger session expired event and stop.
            CoreEvents.trigger(CoreEvents.SESSION_EXPIRED, {
                pageName,
                options: pageOptions,
            }, site.getId());

            return false;
        }

        // Check if local_mobile was installed to Moodle.
        try {
            await site.checkIfLocalMobileInstalledAndNotUsed();

            // Local mobile was added. Throw invalid session to force reconnect and create a new token.
            CoreEvents.trigger(CoreEvents.SESSION_EXPIRED, {
                pageName,
                options: pageOptions,
            }, siteId);

            return false;
        } catch (error) {
            let config: CoreSitePublicConfigResponse | undefined;

            try {
                config = await site.getPublicConfig();
            } catch (error) {
                // Error getting config, probably the site doesn't have the WS
            }

            try {
                await this.checkApplication(config);

                this.login(siteId);
                // Update site info. We don't block the UI.
                this.updateSiteInfo(siteId);

                return true;
            } catch (error) {
                return false;
            }
        }
    }

    /**
     * Get current site.
     *
     * @return Current site.
     */
    getCurrentSite(): CoreSite | undefined {
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
        this.logger.debug(`Delete site ${siteId}`);

        if (typeof this.currentSite != 'undefined' && this.currentSite.id == siteId) {
            this.logout();
        }

        const site = await this.getSite(siteId);

        await site.deleteDB();

        // Site DB deleted, now delete the app from the list of sites.
        delete this.sites[siteId];

        try {
            const db = await this.appDB;

            await db.deleteRecords(SITES_TABLE_NAME, { id: siteId });
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
        const db = await this.appDB;
        const count = await db.countRecords(SITES_TABLE_NAME);

        return count > 0;
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
        } else if (typeof this.sites[siteId] != 'undefined') {
            return this.sites[siteId];
        } else {
            // Retrieve and create the site.
            const db = await this.appDB;
            const data = await db.getRecord<SiteDBEntry>(SITES_TABLE_NAME, { id: siteId });

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
        const db = await this.appDB;
        const data = await db.getRecord<SiteDBEntry>(SITES_TABLE_NAME, { siteUrl });

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
    makeSiteFromSiteListEntry(entry: SiteDBEntry): Promise<CoreSite> {
        // Parse info and config.
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
    getSiteHomeId(siteId?: string): Promise<number> {
        return this.getSite(siteId).then((site) => site.getSiteHomeId());
    }

    /**
     * Get the list of sites stored.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
     */
    async getSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const db = await this.appDB;
        const sites = await db.getAllRecords<SiteDBEntry>(SITES_TABLE_NAME);

        const formattedSites: CoreSiteBasicInfo[] = [];
        sites.forEach((site) => {
            if (!ids || ids.indexOf(site.id) > -1) {
                // Parse info.
                const siteInfo = site.info ? <CoreSiteInfo> CoreTextUtils.parseJSON(site.info) : undefined;
                const basicInfo: CoreSiteBasicInfo = {
                    id: site.id,
                    siteUrl: site.siteUrl,
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
     * Get the list of sites stored, sorted by URL and full name.
     *
     * @param ids IDs of the sites to get. If not defined, return all sites.
     * @return Promise resolved when the sites are retrieved.
     */
    async getSortedSites(ids?: string[]): Promise<CoreSiteBasicInfo[]> {
        const sites = await this.getSites(ids);

        // Sort sites by url and ful lname.
        sites.sort((a, b) => {
            // First compare by site url without the protocol.
            const urlA = a.siteUrl.replace(/^https?:\/\//, '').toLowerCase();
            const urlB = b.siteUrl.replace(/^https?:\/\//, '').toLowerCase();
            const compare = urlA.localeCompare(urlB);

            if (compare !== 0) {
                return compare;
            }

            // If site url is the same, use fullname instead.
            const fullNameA = a.fullName?.toLowerCase().trim();
            const fullNameB = b.fullName?.toLowerCase().trim();

            if (!fullNameA || !fullNameB) {
                return 0;
            }

            return fullNameA.localeCompare(fullNameB);
        });

        return sites;
    }

    /**
     * Get the list of IDs of sites stored and not logged out.
     *
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getLoggedInSitesIds(): Promise<string[]> {
        const db = await this.appDB;
        const sites = await db.getRecords<SiteDBEntry>(SITES_TABLE_NAME, { loggedOut : 0 });

        return sites.map((site) => site.id);
    }

    /**
     * Get the list of IDs of sites stored.
     *
     * @return Promise resolved when the sites IDs are retrieved.
     */
    async getSitesIds(): Promise<string[]> {
        const db = await this.appDB;
        const sites = await db.getAllRecords<SiteDBEntry>(SITES_TABLE_NAME);

        return sites.map((site) => site.id);
    }

    /**
     * Login the user in a site.
     *
     * @param siteid ID of the site the user is accessing.
     * @return Promise resolved when current site is stored.
     */
    async login(siteId: string): Promise<void> {
        const db = await this.appDB;
        const entry = {
            id: 1,
            siteId,
        };

        await db.insertRecord(CURRENT_SITE_TABLE_NAME, entry);

        CoreEvents.trigger(CoreEvents.LOGIN, {}, siteId);
    }

    /**
     * Logout the user.
     *
     * @return Promise resolved when the user is logged out.
     */
    async logout(): Promise<void> {
        if (!this.currentSite) {
            return;
        }

        const db = await this.appDB;

        const promises: Promise<unknown>[] = [];
        const siteConfig = this.currentSite.getStoredConfig();
        const siteId = this.currentSite.getId();

        this.currentSite = undefined;

        if (siteConfig && siteConfig.tool_mobile_forcelogout == '1') {
            promises.push(this.setSiteLoggedOut(siteId, true));
        }

        promises.push(db.deleteRecords(CURRENT_SITE_TABLE_NAME, { id: 1 }));

        await CoreUtils.ignoreErrors(Promise.all(promises));

        CoreEvents.trigger(CoreEvents.LOGOUT, {}, siteId);
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

        const db = await this.appDB;

        this.sessionRestored = true;

        try {
            const currentSite = await db.getRecord<CurrentSiteDBEntry>(CURRENT_SITE_TABLE_NAME, { id: 1 });
            const siteId = currentSite.siteId;
            this.logger.debug(`Restore session in site ${siteId}`);

            await this.loadSite(siteId);
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
    async setSiteLoggedOut(siteId: string, loggedOut: boolean): Promise<void> {
        const db = await this.appDB;
        const site = await this.getSite(siteId);
        const newValues: Partial<SiteDBEntry> = {
            loggedOut: loggedOut ? 1 : 0,
        };

        if (loggedOut) {
            // Erase the token for security.
            newValues.token = '';
            site.token = '';
        }

        site.setLoggedOut(loggedOut);

        await db.updateRecords(SITES_TABLE_NAME, newValues, { id: siteId });
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
        const db = await this.appDB;
        const site = await this.getSite(siteId);
        const newValues: Partial<SiteDBEntry> = {
            token,
            privateToken,
            loggedOut: 0,
        };

        site.token = token;
        site.privateToken = privateToken;
        site.setLoggedOut(false); // Token updated means the user authenticated again, not logged out anymore.

        await db.updateRecords(SITES_TABLE_NAME, newValues, { id: siteId });
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
                return this.treatInvalidAppVersion(versionCheck, site.getURL(), site.getId());
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

            if (typeof config != 'undefined') {
                site.setConfig(config);
                newValues.config = JSON.stringify(config);
            }

            try {
                const db = await this.appDB;

                await db.updateRecords(SITES_TABLE_NAME, newValues, { id: siteId });
            } finally {
                CoreEvents.trigger(CoreEvents.SITE_UPDATED, info, siteId);
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
            if (!username || this.currentSite?.getInfo()?.username == username) {
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
            const db = await this.appDB;
            const siteEntries = await db.getAllRecords<SiteDBEntry>(SITES_TABLE_NAME);
            const ids: string[] = [];
            const promises: Promise<unknown>[] = [];

            siteEntries.forEach((site) => {
                if (!this.sites[site.id]) {
                    promises.push(this.makeSiteFromSiteListEntry(site));
                }

                if (this.sites[site.id].containsUrl(url)) {
                    if (!username || this.sites[site.id].getInfo()?.username == username) {
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
        const db = await this.appDB;
        const currentSite = await db.getRecord<CurrentSiteDBEntry>(CURRENT_SITE_TABLE_NAME, { id: 1 });

        return currentSite.siteId;
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
        if (!site.wsAvailable('tool_mobile_get_config')) {
            // WS not available, cannot get config.
            return;
        }

        return await site.getConfig(undefined, true);
    }

    /**
     * Check if a certain feature is disabled in a site.
     *
     * @param name Name of the feature to check.
     * @param siteId The site ID. If not defined, current site (if available).
     * @return Promise resolved with true if disabled.
     */
    isFeatureDisabled(name: string, siteId?: string): Promise<boolean> {
        return this.getSite(siteId).then((site) => site.isFeatureDisabled(name));
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

        return site ? site.wsAvailable(method, checkPrefix) : false;
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

        if (this.siteSchemasMigration[site.id]) {
            return this.siteSchemasMigration[site.id];
        }

        this.logger.debug(`Migrating all schemas of ${site.id}`);

        // First create tables not registerd with name/version.
        const promise = site.getDb().createTableFromSchema(SCHEMA_VERSIONS_TABLE_SCHEMA)
            .then(() => this.applySiteSchemas(site, this.siteSchemas));

        this.siteSchemasMigration[site.id] = promise;

        return promise.finally(() => {
            delete this.siteSchemasMigration[site.id!];
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
        const db = site.getDb();

        // Fetch installed versions of the schema.
        const records = await db.getAllRecords<SchemaVersionsDBEntry>(SCHEMA_VERSIONS_TABLE_NAME);

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
        await db.insertRecord(SCHEMA_VERSIONS_TABLE_NAME, { name: schema.name, version: schema.version });
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
     * Code of the warning message to show to the user.
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
    fullName?: string;

    /**
     * Site's name.
     */
    siteName?: string;

    /**
     * User's avatar.
     */
    avatar?: string;

    /**
     * Badge to display in the site.
     */
    badge?: number;

    /**
     * Site home ID.
     */
    siteHomeId?: number;
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
