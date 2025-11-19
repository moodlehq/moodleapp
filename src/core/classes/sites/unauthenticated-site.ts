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

import { CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CoreWS, CoreWSAjaxPreSets, CoreWSExternalWarning } from '@services/ws';
import { CorePath } from '@singletons/path';

/**
 * Class that represents a Moodle site where the user still hasn't authenticated.
 */
export class CoreUnauthenticatedSite {

    siteUrl: string;

    protected publicConfig?: CoreSitePublicConfigResponse;

    // List of regular expressions to convert the old nomenclature to new nomenclature for disabled features.
    protected static readonly DISABLED_FEATURES_COMPAT_REGEXPS: { old: RegExp; new: string }[] = [
        { old: /\$mmLoginEmailSignup/g, new: 'CoreLoginEmailSignup' },
        { old: /\$mmSideMenuDelegate/g, new: 'CoreMainMenuDelegate' },
        { old: /\$mmCoursesDelegate/g, new: 'CoreCourseOptionsDelegate' },
        { old: /\$mmUserDelegate/g, new: 'CoreUserDelegate' },
        { old: /\$mmCourseDelegate/g, new: 'CoreCourseModuleDelegate' },
        { old: /_mmCourses/g, new: '_CoreCourses' },
        { old: /_mmaFrontpage/g, new: '_CoreSiteHome' },
        { old: /_mmaGrades/g, new: '_CoreGrades' },
        { old: /_mmaCompetency/g, new: '_AddonCompetency' },
        { old: /_mmaNotifications/g, new: '_AddonNotifications' },
        { old: /_mmaMessages/g, new: '_AddonMessages' },
        { old: /_mmaCalendar/g, new: '_AddonCalendar' },
        { old: /_mmaFiles/g, new: '_AddonPrivateFiles' },
        { old: /_mmaParticipants/g, new: '_CoreUserParticipants' },
        { old: /_mmaCourseCompletion/g, new: '_AddonCourseCompletion' },
        { old: /_mmaNotes/g, new: '_AddonNotes' },
        { old: /_mmaBadges/g, new: '_AddonBadges' },
        { old: /files_privatefiles/g, new: 'AddonPrivateFilesPrivateFiles' },
        { old: /files_sitefiles/g, new: 'AddonPrivateFilesSiteFiles' },
        { old: /files_upload/g, new: 'AddonPrivateFilesUpload' },
        { old: /_mmaModAssign/g, new: '_AddonModAssign' },
        { old: /_mmaModBigbluebuttonbn/g, new: '_AddonModBBB' },
        { old: /_mmaModBook/g, new: '_AddonModBook' },
        { old: /_mmaModChat/g, new: '_AddonModChat' },
        { old: /_mmaModChoice/g, new: '_AddonModChoice' },
        { old: /_mmaModData/g, new: '_AddonModData' },
        { old: /_mmaModFeedback/g, new: '_AddonModFeedback' },
        { old: /_mmaModFolder/g, new: '_AddonModFolder' },
        { old: /_mmaModForum/g, new: '_AddonModForum' },
        { old: /_mmaModGlossary/g, new: '_AddonModGlossary' },
        { old: /_mmaModH5pactivity/g, new: '_AddonModH5PActivity' },
        { old: /_mmaModImscp/g, new: '_AddonModImscp' },
        { old: /_mmaModLabel/g, new: '_AddonModLabel' },
        { old: /_mmaModLesson/g, new: '_AddonModLesson' },
        { old: /_mmaModLti/g, new: '_AddonModLti' },
        { old: /_mmaModPage/g, new: '_AddonModPage' },
        { old: /_mmaModQuiz/g, new: '_AddonModQuiz' },
        { old: /_mmaModResource/g, new: '_AddonModResource' },
        { old: /_mmaModScorm/g, new: '_AddonModScorm' },
        { old: /_mmaModSurvey/g, new: '_AddonModSurvey' },
        { old: /_mmaModUrl/g, new: '_AddonModUrl' },
        { old: /_mmaModWiki/g, new: '_AddonModWiki' },
        { old: /_mmaModWorkshop/g, new: '_AddonModWorkshop' },
        { old: /remoteAddOn_/g, new: 'sitePlugin_' },
        { old: /AddonNotes:addNote/g, new: 'AddonNotes:notes' },
        { old: /CoreMainMenuDelegate_AddonCompetency/g, new: 'CoreUserDelegate_AddonCompetency' },
        { old: /CoreMainMenuDelegate_AddonPrivateFiles/g, new: 'CoreUserDelegate_AddonPrivateFiles' },
        { old: /CoreMainMenuDelegate_CoreGrades/g, new: 'CoreUserDelegate_CoreGrades' },
    ];

    /**
     * Create a site.
     *
     * @param siteUrl Site URL.
     * @param publicConfig Site public config.
     */
    constructor(siteUrl: string, publicConfig?: CoreSitePublicConfigResponse) {
        this.siteUrl = CoreUrl.removeUrlParts(
            siteUrl,
            [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment],
        ); // Make sure the URL doesn't have params.
        if (publicConfig) {
            this.setPublicConfig(publicConfig);
        }
    }

    /**
     * Get site URL.
     *
     * @returns Site URL.
     */
    getURL(): string {
        return this.siteUrl;
    }

    /**
     * Set site URL.
     *
     * @param url Site URL.
     */
    setURL(url: string): void {
        this.siteUrl = url;
    }

    /**
     * Get site info.
     *
     * @returns Site info.
     */
    getInfo(): CoreSiteInfo | undefined {
        // Cannot retrieve info for unauthenticated sites.
        return undefined;
    }

    /**
     * Check if the site has info with the given key and it doesn't contain an empty value.
     *
     * @param key Info key.
     * @returns Whether the key is filled within site info.
     */
    hasInfo(key: string): boolean {
        const info = this.getInfo()?.[key] ?? null;

        return info === false || info === 0 || !!info;
    }

    /**
     * Get site name.
     *
     * @returns Site name.
     */
    async getSiteName(): Promise<string> {
        if (this.isDemoModeSite()) {
            return CoreConstants.CONFIG.appname;
        }

        const siteName = this.getInfo()?.sitename || this.publicConfig?.sitename;
        if (siteName) {
            return siteName;
        }

        // Fallback.
        const isSingleFixedSite = await CoreLoginHelper.isSingleFixedSite();

        if (isSingleFixedSite) {
            const sites = await CoreLoginHelper.getAvailableSites();

            if (sites && sites.length > 0) {
                return sites[0].name;
            }
        }

        return '';
    }

    /**
     * Check whether the app should use the local logo instead or the remote one.
     *
     * @returns Whether local logo is forced.
     */
    forcesLocalLogo(): boolean {
        return CoreConstants.CONFIG.forceLoginLogo || this.isDemoModeSite();
    }

    /**
     * Get logo URL from a site public config.
     *
     * @param config Site public config.
     * @returns Logo URL.
     */
    getLogoUrl(config?: CoreSitePublicConfigResponse): string | undefined {
        config = config ?? this.publicConfig;
        if (!config || this.forcesLocalLogo()) {
            return;
        }

        return config.logourl || config.compactlogourl || undefined;
    }

    /**
     * Check show top logo mode.
     *
     * @returns The top logo mode.
     */
    getShowTopLogo(): 'online' | 'offline' | 'hidden' {
        return this.isDemoModeSite() ? 'hidden' : CoreConstants.CONFIG.showTopLogo;
    }

    /**
     * Get logo URL from a site public config.
     *
     * @param config Site public config.
     * @returns Logo URL.
     */
    getTopLogoUrl(config?: CoreSitePublicConfigResponse): string | undefined {
        config = config ?? this.publicConfig;
        if (!config || this.getShowTopLogo() !== 'online') {
            return;
        }

        return config.logourl || config.compactlogourl || undefined;
    }

    /**
     * Returns a url to link an specific page on the site.
     *
     * @param path Path of the url to go to.
     * @param params Object with the params to add.
     * @param anchor Anchor text if needed.
     * @returns URL with params.
     */
    createSiteUrl(path: string, params?: Record<string, unknown>, anchor?: string): string {
        return CoreUrl.addParamsToUrl(CorePath.concatenatePaths(this.siteUrl, path), params, { anchor });
    }

    /**
     * Check if a URL belongs to this site.
     *
     * @param url URL to check.
     * @returns Whether the URL belongs to this site.
     */
    containsUrl(url?: string): boolean {
        if (!url) {
            return false;
        }

        const siteUrl = CoreText.addEndingSlash(
            CoreUrl.removeUrlParts(this.siteUrl, [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]),
        );
        url = CoreText.addEndingSlash(CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]));

        return url.indexOf(siteUrl) == 0;
    }

    /**
     * Get the public config of this site.
     *
     * @param options Options.
     * @returns Promise resolved with public config. Rejected with an object if error, see CoreWS.callAjax.
     */
    async getPublicConfig(options: { readingStrategy?: CoreSitesReadingStrategy } = {}): Promise<CoreSitePublicConfigResponse> {
        const ignoreCache = options.readingStrategy === CoreSitesReadingStrategy.ONLY_NETWORK ||
            options.readingStrategy ===  CoreSitesReadingStrategy.PREFER_NETWORK;
        if (!ignoreCache && this.publicConfig) {
            return this.publicConfig;
        }

        if (options.readingStrategy === CoreSitesReadingStrategy.ONLY_CACHE) {
            throw new CoreError('Cache not available to read public config');
        }

        try {
            const config = await this.requestPublicConfig();

            this.setPublicConfig(config);

            return config;
        } catch (error) {
            if (options.readingStrategy === CoreSitesReadingStrategy.ONLY_NETWORK || !this.publicConfig) {
                throw error;
            }

            return this.publicConfig;
        }
    }

    /**
     * Set public config.
     *
     * @param publicConfig Public config.
     */
    setPublicConfig(publicConfig: CoreSitePublicConfigResponse): void {
        publicConfig.tool_mobile_disabledfeatures =
            this.treatDisabledFeatures(publicConfig.tool_mobile_disabledfeatures ?? '');
        this.publicConfig = publicConfig;
    }

    /**
     * Perform a request to the server to get the public config of this site.
     *
     * @returns Promise resolved with public config.
     */
    protected async requestPublicConfig(): Promise<CoreSitePublicConfigResponse> {
        const preSets: CoreWSAjaxPreSets = {
            siteUrl: this.siteUrl,
        };

        let config: CoreSitePublicConfigResponse;

        try {
            config = await CoreWS.callAjax<CoreSitePublicConfigResponse>('tool_mobile_get_public_config', {}, preSets);
        } catch (error) {
            if (!error || error.errorcode !== 'codingerror' || (this.getInfo() && !this.isAjaxGetSupported())) {
                throw error;
            }

            // This error probably means that there is a redirect in the site. Try to use a GET request.
            preSets.noLogin = true;
            preSets.useGet = true;

            try {
                config = await CoreWS.callAjax<CoreSitePublicConfigResponse>('tool_mobile_get_public_config', {}, preSets);
            } catch (error2) {
                if (this.isAjaxGetSupported()) {
                    // GET is supported, return the second error.
                    throw error2;
                } else {
                    // GET not supported or we don't know if it's supported. Return first error.
                    throw error;
                }
            }
        }

        // Use the wwwroot returned by the server.
        if (config.httpswwwroot) {
            this.siteUrl = CoreUrl.removeUrlParts(
                config.httpswwwroot,
                [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment],
            ); // Make sure the URL doesn't have params.
        }

        return config;
    }

    /**
     * Check if GET method is supported for AJAX calls.
     *
     * @returns Whether it's supported.
     * @since Moodle 3.8
     */
    protected isAjaxGetSupported(): boolean {
        // We don't know if it's supported, assume it's not.
        return false;
    }

    /**
     * Check if a URL to a file belongs to the site and uses the pluginfileurl or tokenpluginfileurl endpoints.
     *
     * @param url File URL to check.
     * @returns Whether it's a site file URL.
     */
    isSitePluginFileUrl(url: string): boolean {
        const isPluginFileUrl = CoreUrl.isPluginFileUrl(url) || CoreUrl.isTokenPluginFileUrl(url);
        if (!isPluginFileUrl) {
            return false;
        }

        return this.containsUrl(url);
    }

    /**
     * Check if a URL to a file belongs to the site and is a theme image file.
     *
     * @param url File URL to check.
     * @returns Whether it's a site theme image URL.
     */
    isSiteThemeImageUrl(url: string): boolean {
        if (!CoreUrl.isThemeImageUrl(url)) {
            return false;
        }

        return this.containsUrl(url);
    }

    /**
     * Check if the site is a demo mode site.
     *
     * @returns Whether the site is a demo mode site.
     */
    isDemoModeSite(): boolean {
        const demoSiteData = CoreLoginHelper.getDemoModeSiteInfo();

        return this.containsUrl(demoSiteData?.url);
    }

    /**
     * Check whether informative links should be displayed for this site.
     *
     * @returns Whether informative links should be displayed.
     */
    shouldDisplayInformativeLinks(): boolean {
        return !CoreConstants.CONFIG.hideInformativeLinks && !this.isDemoModeSite();
    }

    /**
     * Check if a certain feature is disabled in the site.
     *
     * @param name Name of the feature to check.
     * @returns Whether it's disabled.
     */
    isFeatureDisabled(name: string): boolean {
        const disabledFeatures = this.getDisabledFeatures();
        if (!disabledFeatures) {
            return false;
        }

        const regEx = new RegExp(`(,|^)${CoreText.escapeForRegex(name)}(,|$)`, 'g');

        return !!disabledFeatures.match(regEx);
    }

    /**
     * Get disabled features string.
     *
     * @returns Disabled features.
     */
    protected getDisabledFeatures(): string {
        const siteDisabledFeatures = this.getSiteDisabledFeatures() || undefined; // If empty string, use undefined.
        const appDisabledFeatures = CoreConstants.CONFIG.disabledFeatures;

        return [
            ...(siteDisabledFeatures?.split(',') || []),
            ...(appDisabledFeatures?.split(',') || []),
        ].join(',');
    }

    /**
     * Get disabled features string configured in the site.
     *
     * @returns Disabled features.
     */
    protected getSiteDisabledFeatures(): string | undefined {
        return this.publicConfig?.tool_mobile_disabledfeatures;
    }

    /**
     * Treat the list of disabled features, replacing old nomenclature with the new one.
     *
     * @param features List of disabled features.
     * @returns Treated list.
     */
    protected treatDisabledFeatures(features: string): string {
        if (!features) {
            return '';
        }

        for (let i = 0; i < CoreUnauthenticatedSite.DISABLED_FEATURES_COMPAT_REGEXPS.length; i++) {
            const entry = CoreUnauthenticatedSite.DISABLED_FEATURES_COMPAT_REGEXPS[i];

            features = features.replace(entry.old, entry.new);
        }

        return features;
    }

}

/**
 * Result of WS core_webservice_get_site_info.
 */
export type CoreSiteInfoResponse = {
    sitename: string; // Site name.
    username: string; // Username.
    firstname: string; // First name.
    lastname: string; // Last name.
    fullname: string; // User full name.
    lang: string; // Current language.
    userid: number; // User id.
    siteurl: string; // Site url.
    userpictureurl: string; // The user profile picture.
    functions: {
        name: string; // Function name.
        version: string; // The version number of the component to which the function belongs.
    }[];
    downloadfiles?: number; // 1 if users are allowed to download files, 0 if not.
    uploadfiles?: number; // 1 if users are allowed to upload files, 0 if not.
    release?: string; // Moodle release number.
    version?: string; // Moodle version number.
    mobilecssurl?: string; // Mobile custom CSS theme.
    advancedfeatures?: { // Advanced features availability.
        name: string; // Feature name.
        value: number; // Feature value. Usually 1 means enabled.
    }[];
    usercanmanageownfiles?: boolean; // True if the user can manage his own files.
    userquota?: number; // User quota (bytes). 0 means user can ignore the quota.
    usermaxuploadfilesize?: number; // User max upload file size (bytes). -1 means the user can ignore the upload file size.
    userhomepage?: CoreSiteInfoUserHomepage; // The default home page for the user.
    userhomepageurl?: string; // @since 4.5. The URL of the custom user home page when using HOMEPAGE_URL.
    userprivateaccesskey?: string; // Private user access key for fetching files.
    siteid?: number; // Site course ID.
    sitecalendartype?: string; // Calendar type set in the site.
    usercalendartype?: string; // Calendar typed used by the user.
    userissiteadmin?: boolean; // Whether the user is a site admin or not.
    theme?: string; // Current theme for the user.
    limitconcurrentlogins?: number; // @since 4.0. Number of concurrent sessions allowed.
    usersessionscount?: number; // @since 4.0. Number of active sessions for current user. Only if limitconcurrentlogins is used.
    policyagreed?: number; // @since 4.4. Whether user accepted all the policies.
};

/**
 * Site info, including some calculated data.
 */
export type CoreSiteInfo = CoreSiteInfoResponse & {
    functionsByName?: {
        [name: string]: {
            name: string; // Function name.
            version: string; // The version number of the component to which the function belongs.
        };
    };
};

/**
 * Enum constants that define default user home page.
 */
export enum CoreSiteInfoUserHomepage {
    HOMEPAGE_SITE = 0, // Site home.
    HOMEPAGE_MY = 1, // Dashboard.
    HOMEPAGE_MYCOURSES = 3, // My courses.
    HOMEPAGE_URL = 4, // A custom URL.
}

/**
 * Possible values for 'supportavailability' config.
 */
export const enum CoreSiteConfigSupportAvailability {
    Disabled = 0,
    Authenticated = 1,
    Anyone = 2,
}

/**
 * Result of WS tool_mobile_get_public_config.
 */
export type CoreSitePublicConfigResponse = {
    wwwroot: string; // Site URL.
    httpswwwroot: string; // Site https URL (if httpslogin is enabled).
    sitename: string; // Site name.
    guestlogin: number; // Whether guest login is enabled.
    rememberusername: number; // Values: 0 for No, 1 for Yes, 2 for optional.
    authloginviaemail: number; // Whether log in via email is enabled.
    registerauth: string; // Authentication method for user registration.
    forgottenpasswordurl: string; // Forgotten password URL.
    authinstructions: string; // Authentication instructions.
    authnoneenabled: number; // Whether auth none is enabled.
    enablewebservices: number; // Whether Web Services are enabled.
    enablemobilewebservice: number; // Whether the Mobile service is enabled.
    maintenanceenabled: number; // Whether site maintenance is enabled.
    maintenancemessage: string; // Maintenance message.
    logourl?: string; // The site logo URL.
    compactlogourl?: string; // The site compact logo URL.
    typeoflogin: TypeOfLogin; // The type of login. 1 for app, 2 for browser, 3 for embedded.
    launchurl?: string; // SSO login launch URL.
    mobilecssurl?: string; // Mobile custom CSS theme.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tool_mobile_disabledfeatures?: string; // Disabled features in the app.
    identityproviders?: CoreSiteIdentityProvider[]; // Identity providers.
    country?: string; // Default site country.
    agedigitalconsentverification?: boolean; // Whether age digital consent verification is enabled.
    supportname?: string; // Site support contact name (only if age verification is enabled).
    supportemail?: string; // Site support contact email (only if age verification is enabled).
    supportavailability?: CoreSiteConfigSupportAvailability;
    supportpage?: string; // Site support contact url.
    autolang?: number; // Whether to detect default language from browser setting.
    lang?: string; // Default language for the site.
    langmenu?: number; // Whether the language menu should be displayed.
    langlist?: string; // Languages on language menu.
    locale?: string; // Sitewide locale.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tool_mobile_minimumversion?: string; // Minimum required version to access.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tool_mobile_iosappid?: string; // IOS app's unique identifier.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tool_mobile_androidappid?: string; // Android app's unique identifier.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tool_mobile_setuplink?: string; // App download page.
    tool_mobile_qrcodetype?: CoreSiteQRCodeType; // eslint-disable-line @typescript-eslint/naming-convention
    warnings?: CoreWSExternalWarning[];
    showloginform?: number; // @since 4.5. Display default login form.
};

/**
 * QR Code type enumeration.
 */
export enum CoreSiteQRCodeType {
    QR_CODE_DISABLED = 0, // QR code disabled value
    QR_CODE_URL = 1, // QR code type URL value
    QR_CODE_LOGIN = 2, // QR code type login value
}

/**
 * Identity provider.
 */
export type CoreSiteIdentityProvider = {
    name: string; // The identity provider name.
    iconurl: string; // The icon URL for the provider.
    url: string; // The URL of the provider.
};

/**
 * The type of login. 1 for app, 2 for browser, 3 for embedded.
 */
export enum TypeOfLogin {
    APP = 1,
    BROWSER = 2, // SSO in browser window is required.
    EMBEDDED = 3, // SSO in embedded browser is required.
}
