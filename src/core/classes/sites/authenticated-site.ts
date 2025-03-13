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

import { CoreSSO } from '@singletons/sso';
import { CoreNetwork } from '@services/network';
import { CoreEventData, CoreEvents } from '@singletons/events';
import {
    CoreWS,
    CoreWSPreSets,
    CoreWSPreSetsSplitRequest,
    CoreWSTypeExpected,
} from '@services/ws';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@singletons/utils';
import { CoreCacheUpdateFrequency, CoreConstants, MINIMUM_MOODLE_VERSION, MOODLE_RELEASES } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreLogger } from '@singletons/logger';
import { Translate } from '@singletons';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSilentError } from '../errors/silenterror';
import { CorePromisedValue } from '@classes/promised-value';
import { Observable, ObservableInput, ObservedValueOf, OperatorFunction, Subject, firstValueFrom } from 'rxjs';
import { finalize, map, mergeMap } from 'rxjs/operators';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { CoreSiteInfo, CoreSiteInfoResponse, CoreSitePublicConfigResponse, CoreUnauthenticatedSite } from './unauthenticated-site';
import { Md5 } from 'ts-md5';
import { CoreSiteWSCacheRecord } from '@services/database/sites';
import { CoreErrorLogs } from '@singletons/error-logs';
import { CoreWait } from '@singletons/wait';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreObject } from '@singletons/object';
import { CoreArray } from '@singletons/array';

/**
 * Class that represents a site (combination of site + user) where the user has authenticated but the site hasn't been validated
 * yet, it might be a site not supported by the app.
 */
export class CoreAuthenticatedSite extends CoreUnauthenticatedSite {

    static readonly REQUEST_QUEUE_FORCE_WS = false; // Use "tool_mobile_call_external_functions" even for calling a single function.

    /**
     * @deprecated 5.0. Use CoreCacheUpdateFrequency.USUALLY instead.
     */
    static readonly FREQUENCY_USUALLY = CoreCacheUpdateFrequency.USUALLY;
    /**
     * @deprecated 5.0. Use CoreCacheUpdateFrequency.OFTEN instead.
     */
    static readonly FREQUENCY_OFTEN = CoreCacheUpdateFrequency.OFTEN;
    /**
     * @deprecated 5.0. Use CoreCacheUpdateFrequency.SOMETIMES instead.
     */
    static readonly FREQUENCY_SOMETIMES = CoreCacheUpdateFrequency.SOMETIMES;
    /**
     * @deprecated 5.0. Use CoreCacheUpdateFrequency.RARELY instead.
     */
    static readonly FREQUENCY_RARELY = CoreCacheUpdateFrequency.RARELY;

    /**
     * @deprecated 5.0. Use MINIMUM_MOODLE_VERSION from constants.ts.
     */
    static readonly MINIMUM_MOODLE_VERSION = MINIMUM_MOODLE_VERSION;

    /**
     * Versions of Moodle releases.
     *
     * @deprecated 5.0. Use MOODLE_RELEASES from constants.ts.
     */
    static readonly MOODLE_RELEASES = MOODLE_RELEASES;

    // Possible cache update frequencies.
    protected static readonly UPDATE_FREQUENCIES = [
        CoreConstants.CONFIG.cache_update_frequency_usually || 420000,
        CoreConstants.CONFIG.cache_update_frequency_often || 1200000,
        CoreConstants.CONFIG.cache_update_frequency_sometimes || 3600000,
        CoreConstants.CONFIG.cache_update_frequency_rarely || 43200000,
    ];

    // WS that we allow to call even if the site is logged out.
    protected static readonly ALLOWED_LOGGEDOUT_WS = [
        'core_user_remove_user_device',
    ];

    token: string;
    privateToken?: string;
    infos?: CoreSiteInfo;

    protected logger: CoreLogger;
    protected cleanUnicode = false;
    protected offlineDisabled = false;
    private memoryCache: Record<string, CoreSiteWSCacheRecord> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected ongoingRequests: Record<string, Record<OngoingRequestType, WSObservable<any> | undefined>> = {};
    protected requestQueue: RequestQueueItem[] = [];
    protected requestQueueTimeout: number | null = null;

    /**
     * Create a site.
     *
     * @param siteUrl Site URL.
     * @param token Site's WS token.
     * @param otherData Other data.
     */
    constructor(
        siteUrl: string,
        token: string,
        otherData: CoreAuthenticatedSiteOptionalData = {},
    ) {
        super(siteUrl, otherData.publicConfig);

        this.logger = CoreLogger.getInstance('CoreAuthenticaedSite');
        this.token = token;
        this.privateToken = otherData.privateToken;
    }

    /**
     * Get site token.
     *
     * @returns Site token.
     */
    getToken(): string {
        return this.token;
    }

    /**
     * @inheritdoc
     */
    getInfo(): CoreSiteInfo | undefined {
        return this.infos;
    }

    /**
     * Get site private token.
     *
     * @returns Site private token.
     */
    getPrivateToken(): string | undefined {
        return this.privateToken;
    }

    /**
     * Get site user's ID.
     *
     * @returns User's ID.
     */
    getUserId(): number {
        if (!this.infos) {
            // Shouldn't happen for authenticated sites.
            throw new CoreError('Site info could not be fetched.');
        }

        return this.infos.userid;
    }

    /**
     * Get site Course ID for frontpage course. If not declared it will return 1 as default.
     *
     * @returns Site Home ID.
     */
    getSiteHomeId(): number {
        return this.infos?.siteid || 1;
    }

    /**
     * Set site token.
     *
     * @param token New token.
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
     * @returns Whether is logged out.
     */
    isLoggedOut(): boolean {
        return false;
    }

    /**
     * Set site info.
     *
     * @param infos New info.
     */
    setInfo(infos?: CoreSiteInfo): void {
        this.infos = infos;

        // Index function by name to speed up wsAvailable method.
        if (infos?.functions) {
            infos.functionsByName = CoreArray.toObject(infos.functions, 'name');
        }
    }

    /**
     * Check if current user is Admin.
     * Works properly since v3.8. See more in: {@link https://tracker.moodle.org/browse/MDL-65550}
     *
     * @returns Whether the user is Admin.
     */
    isAdmin(): boolean {
        return this.getInfo()?.userissiteadmin ?? false;
    }

    /**
     * Can the user access their private files?
     *
     * @returns Whether can access my files.
     */
    canAccessMyFiles(): boolean {
        const info = this.getInfo();

        return !!(info && (info.usercanmanageownfiles === undefined || info.usercanmanageownfiles));
    }

    /**
     * Can the user download files?
     *
     * @returns Whether can download files.
     */
    canDownloadFiles(): boolean {
        const info = this.getInfo();

        return !!info?.downloadfiles && info?.downloadfiles > 0;
    }

    /**
     * Can the user use an advanced feature?
     *
     * @param featureName The name of the feature.
     * @param whenUndefined The value to return when the parameter is undefined.
     * @returns Whether can use advanced feature.
     */
    canUseAdvancedFeature(featureName: string, whenUndefined: boolean = true): boolean {
        const info = this.getInfo();

        if (info?.advancedfeatures === undefined) {
            return whenUndefined;
        }

        const feature = info.advancedfeatures.find((item) => item.name === featureName);

        if (!feature) {
            return whenUndefined;
        }

        return feature.value !== 0;
    }

    /**
     * Can the user upload files?
     *
     * @returns Whether can upload files.
     */
    canUploadFiles(): boolean {
        const info = this.getInfo();

        return !!info?.uploadfiles && info?.uploadfiles > 0;
    }

    /**
     * Fetch site info from the Moodle site.
     *
     * @returns A promise to be resolved when the site info is retrieved.
     */
    fetchSiteInfo(): Promise<CoreSiteInfoResponse> {
        // The get_site_info WS call won't be cached.
        const preSets = {
            getFromCache: false,
            saveToCache: false,
            skipQueue: true,
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
     * @returns Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async read<T = unknown>(method: string, data: any, preSets?: CoreSiteWSPreSets): Promise<T> {
        return await firstValueFrom(this.readObservable<T>(method, data, preSets));
    }

    /**
     * Read some data from the Moodle site using WS. Requests are cached by default.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @returns Observable returning the WS data.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readObservable<T = unknown>(method: string, data: any, preSets?: CoreSiteWSPreSets): WSObservable<T> {
        preSets = preSets || {};
        preSets.getFromCache = preSets.getFromCache ?? true;
        preSets.saveToCache = preSets.saveToCache ?? true;
        preSets.reusePending = preSets.reusePending ?? true;

        return this.requestObservable<T>(method, data, preSets);
    }

    /**
     * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @returns Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async write<T = unknown>(method: string, data: any, preSets?: CoreSiteWSPreSets): Promise<T> {
        return await firstValueFrom(this.writeObservable<T>(method, data, preSets));
    }

    /**
     * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
     *
     * @param method WS method to use.
     * @param data Data to send to the WS.
     * @param preSets Extra options.
     * @returns Observable returning the WS data.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeObservable<T = unknown>(method: string, data: any, preSets?: CoreSiteWSPreSets): WSObservable<T> {
        preSets = preSets || {};
        preSets.getFromCache = preSets.getFromCache ?? false;
        preSets.saveToCache = preSets.saveToCache ?? false;
        preSets.emergencyCache = preSets.emergencyCache ?? false;

        return this.requestObservable<T>(method, data, preSets);
    }

    /**
     * WS request to the site.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @returns Promise resolved with the response, rejected with CoreWSError if it fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async request<T = unknown>(method: string, data: any, preSets: CoreSiteWSPreSets): Promise<T> {
        return await firstValueFrom(this.requestObservable<T>(method, data, preSets));
    }

    /**
     * WS request to the site.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @returns Observable returning the WS data.
     * @description
     *
     * Sends a webservice request to the site. This method will automatically add the
     * required parameters and pass it on to the low level API in CoreWSProvider.call().
     *
     * Caching is also implemented, when enabled this method will returned a cached version of the request if the
     * data hasn't expired.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestObservable<T = unknown>(method: string, data: any, preSets: CoreSiteWSPreSets): WSObservable<T> {
        if (this.isLoggedOut() && !CoreAuthenticatedSite.ALLOWED_LOGGEDOUT_WS.includes(method)) {
            // Site is logged out, it cannot call WebServices.
            this.triggerSiteEvent(CoreEvents.SESSION_EXPIRED, {});

            // Use a silent error, the SESSION_EXPIRED event will display a message if needed.
            throw new CoreSilentError(Translate.instant('core.lostconnection'));
        }

        data = data || {};

        if (!CoreNetwork.isOnline() && this.offlineDisabled) {
            throw new CoreError(Translate.instant('core.errorofflinedisabled'));
        }

        // Check if the method is available.
        // We ignore this check when we do not have the site info, as the list of functions is not loaded yet.
        if (this.getInfo() && !this.wsAvailable(method)) {
            this.logger.error(`WS function '${method}' is not available.`);

            throw new CoreError(Translate.instant('core.wsfunctionnotavailable'));
        }

        const wsPreSets: CoreWSPreSets = {
            wsToken: this.token || '',
            siteUrl: this.siteUrl,
            cleanUnicode: this.cleanUnicode,
            typeExpected: preSets.typeExpected,
            responseExpected: preSets.responseExpected,
            splitRequest: preSets.splitRequest,
        };

        if (wsPreSets.cleanUnicode && CoreText.hasUnicodeData(data)) {
            // Data will be cleaned, notify the user.
            CoreToasts.show({
                message: 'core.unicodenotsupported',
                translateMessage: true,
                duration: ToastDuration.LONG,
            });
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

        // Convert arguments to strings before starting the cache process.
        data = CoreWS.convertValuesToString(data, wsPreSets.cleanUnicode);
        if (data == null) {
            // Empty cleaned text found.
            throw new CoreError(Translate.instant('core.unicodenotsupportedcleanerror'));
        }

        const cacheId = this.getCacheId(method, data);

        // Check for an ongoing identical request.
        const ongoingRequest = this.getOngoingRequest<T>(cacheId, preSets);
        if (ongoingRequest) {
            return ongoingRequest;
        }

        const observable = this.performRequest<T>(method, data, preSets, wsPreSets).pipe(
            // Return a clone of the original object, this may prevent errors if in the callback the object is modified.
            map((data) => CoreUtils.clone(data)),
        );

        this.setOngoingRequest(cacheId, preSets, observable);

        return observable.pipe(
            finalize(() => {
                this.clearOngoingRequest(cacheId, preSets, observable);
            }),
        );
    }

    /**
     * Get an ongoing request if there's one already.
     *
     * @param cacheId Cache ID.
     * @param preSets Presets.
     * @returns Ongoing request if it exists.
     */
    protected getOngoingRequest<T = unknown>(cacheId: string, preSets: CoreSiteWSPreSets): WSObservable<T> | undefined {
        if (preSets.updateInBackground) {
            return this.ongoingRequests[cacheId]?.[OngoingRequestType.UPDATE_IN_BACKGROUND];
        } else if (preSets.getFromCache) { // Only reuse ongoing request when using cache.
            return this.ongoingRequests[cacheId]?.[OngoingRequestType.STANDARD];
        }
    }

    /**
     * Store an ongoing request in memory.
     *
     * @param cacheId Cache ID.
     * @param preSets Presets.
     * @param request Request to store.
     */
    protected setOngoingRequest<T = unknown>(cacheId: string, preSets: CoreSiteWSPreSets, request: WSObservable<T>): void {
        this.ongoingRequests[cacheId] = this.ongoingRequests[cacheId] ?? {};

        if (preSets.updateInBackground) {
            this.ongoingRequests[cacheId][OngoingRequestType.UPDATE_IN_BACKGROUND] = request;
        } else {
            this.ongoingRequests[cacheId][OngoingRequestType.STANDARD] = request;
        }
    }

    /**
     * Clear the ongoing request unless it has changed (e.g. a new request that ignores cache).
     *
     * @param cacheId Cache ID.
     * @param preSets Presets.
     * @param request Current request.
     */
    protected clearOngoingRequest<T = unknown>(cacheId: string, preSets: CoreSiteWSPreSets, request: WSObservable<T>): void {
        this.ongoingRequests[cacheId] = this.ongoingRequests[cacheId] ?? {};

        if (preSets.updateInBackground) {
            if (this.ongoingRequests[cacheId][OngoingRequestType.UPDATE_IN_BACKGROUND] === request) {
                delete this.ongoingRequests[cacheId][OngoingRequestType.UPDATE_IN_BACKGROUND];
            }
        } else {
            if (this.ongoingRequests[cacheId][OngoingRequestType.STANDARD] === request) {
                delete this.ongoingRequests[cacheId][OngoingRequestType.STANDARD];
            }
        }
    }

    /**
     * Perform a request, getting the response either from cache or WebService.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options related to the site.
     * @param wsPreSets Extra options related to the WS call.
     * @returns Observable returning the WS data.
     */
    protected performRequest<T = unknown>(
        method: string,
        data: unknown,
        preSets: CoreSiteWSPreSets,
        wsPreSets: CoreWSPreSets,
    ): WSObservable<T> {
        const subject = new Subject<T>();

        const run = async () => {
            try {
                let response: T | WSCachedError;
                let cachedData: WSCachedData<T> | undefined;

                try {
                    cachedData = await this.getFromCache<T>(method, data, preSets, false);
                    response = cachedData.response;
                } catch {
                    // Not found or expired, call WS.
                    response = await this.getFromWS<T>(method, data, preSets, wsPreSets);
                }

                if (
                    typeof response === 'object' && response !== null &&
                    (
                        ('exception' in response && response.exception !== undefined) ||
                        ('errorcode' in response && response.errorcode !== undefined)
                    )
                ) {
                    subject.error(new CoreWSError(response));
                } else {
                    subject.next(<T> response);
                }

                if (
                    preSets.updateInBackground &&
                    !CoreConstants.CONFIG.disableCallWSInBackground &&
                    cachedData &&
                    !cachedData.expirationIgnored &&
                    cachedData.expirationTime !== undefined &&
                    Date.now() > cachedData.expirationTime
                ) {
                    // Update the data in background.
                    setTimeout(async () => {
                        try {
                            preSets = {
                                ...preSets,
                                emergencyCache: false,
                            };

                            const newData = await this.getFromWS<T>(method, data, preSets, wsPreSets);

                            subject.next(newData);
                        } catch (error) {
                            // Ignore errors when updating in background.
                            this.logger.error('Error updating WS data in background', error);
                        } finally {
                            subject.complete();
                        }
                    });
                } else {
                    // No need to update in background, complete the observable.
                    subject.complete();
                }
            } catch (error) {
                subject.error(error);
            }
        };

        run();

        return subject;
    }

    /**
     * Get a request response from WS, if it fails it might try to get it from emergency cache.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options related to the site.
     * @param wsPreSets Extra options related to the WS call.
     * @returns Promise resolved with the response.
     */
    protected async getFromWS<T = unknown>(
        method: string,
        data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        preSets: CoreSiteWSPreSets,
        wsPreSets: CoreWSPreSets,
    ): Promise<T> {
        if (preSets.forceOffline) {
            // Don't call the WS, just fail.
            throw new CoreError(Translate.instant('core.cannotconnect'));
        }

        // Helper function to fetch original content if needed.
        const fetchOriginalIfNeeded = async (response: T) => {
            const fetchOriginalToo = typeof preSets.fetchOriginalToo === 'function' ?
                await preSets.fetchOriginalToo(response) :
                preSets.fetchOriginalToo;

            if (!fetchOriginalToo) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(this.getFromWS(
                method,
                {
                    ...data,
                    moodlewssettingfilter: 'false',
                    moodlewssettingfileurl: 'false',
                },
                {
                    ...preSets,
                    filter: false,
                    rewriteurls: false,
                },
                wsPreSets,
            ));
        };

        try {
            const response = await this.callOrEnqueueWS<T>(method, data, preSets, wsPreSets);

            if (preSets.filter !== false && preSets.saveToCache) {
                // Fetch original data if needed. Don't block the user for this.
                fetchOriginalIfNeeded(response);
            }

            if (preSets.saveToCache) {
                this.saveToCache(method, data, response, preSets);
            }

            return response;
        } catch (error) {
            let useSilentError = false;

            if (CoreWSError.isExpiredTokenError(error)) {
                // Session expired, trigger event.
                this.triggerSiteEvent(CoreEvents.SESSION_EXPIRED, {});
                // Change error message. Try to get data from cache, the event will handle the error.
                error.message = Translate.instant('core.lostconnection');
                useSilentError = true; // Use a silent error, the SESSION_EXPIRED event will display a message if needed.
            } else if (error.errorcode === 'userdeleted' || error.errorcode === 'wsaccessuserdeleted') {
                // User deleted, trigger event.
                this.triggerSiteEvent(CoreEvents.USER_DELETED, { params: data });
                error.message = Translate.instant('core.userdeleted');

                throw new CoreWSError(error);
            } else if (error.errorcode === 'wsaccessusersuspended') {
                // User suspended, trigger event.
                this.triggerSiteEvent(CoreEvents.USER_SUSPENDED, { params: data });
                error.message = Translate.instant('core.usersuspended');

                throw new CoreWSError(error);
            } else if (error.errorcode === 'wsaccessusernologin') {
                // User suspended, trigger event.
                this.triggerSiteEvent(CoreEvents.USER_NO_LOGIN, { params: data });
                error.message = Translate.instant('core.usernologin');

                throw new CoreWSError(error);
            } else if (error.errorcode === 'forcepasswordchangenotice') {
                // Password Change Forced, trigger event. Try to get data from cache, the event will handle the error.
                this.triggerSiteEvent(CoreEvents.PASSWORD_CHANGE_FORCED, {});
                error.message = Translate.instant('core.forcepasswordchangenotice');
                useSilentError = true; // Use a silent error, the change password page already displays the appropiate info.
            } else if (error.errorcode === 'usernotfullysetup') {
                // User not fully setup, trigger event. Try to get data from cache, the event will handle the error.
                this.triggerSiteEvent(CoreEvents.USER_NOT_FULLY_SETUP, {});
                error.message = Translate.instant('core.usernotfullysetup');
                useSilentError = true; // Use a silent error, the complete profile page already displays the appropiate info.
            } else if (error.errorcode === 'sitepolicynotagreed') {
                // Site policy not agreed, trigger event.
                this.triggerSiteEvent(CoreEvents.SITE_POLICY_NOT_AGREED, {});
                error.message = Translate.instant('core.policy.sitepolicynotagreederror');

                throw new CoreSilentError(error);
            } else if (error.errorcode === 'dmlwriteexception' && CoreText.hasUnicodeData(data)) {
                if (!this.cleanUnicode) {
                    // Try again cleaning unicode.
                    this.cleanUnicode = true;

                    return this.request<T>(method, data, preSets);
                }
                // This should not happen.
                error.message = Translate.instant('core.unicodenotsupported');

                throw new CoreWSError(error);
            } else if (error.exception === 'required_capability_exception' || error.errorcode === 'nopermission' ||
                    error.errorcode === 'notingroup') {
                // Translate error messages with missing strings.
                if (error.message === 'error/nopermission') {
                    error.message = Translate.instant('core.nopermissionerror');
                } else if (error.message === 'error/notingroup') {
                    error.message = Translate.instant('core.notingroup');
                }

                if (preSets.saveToCache) {
                    // Save the error instead of deleting the cache entry so the same content is displayed in offline.
                    this.saveToCache(method, data, error, preSets);
                }

                throw new CoreWSError(error);
            } else if (preSets.cacheErrors && preSets.cacheErrors.indexOf(error.errorcode) != -1) {
                // Save the error instead of deleting the cache entry so the same content is displayed in offline.
                this.saveToCache(method, data, error, preSets);

                throw new CoreWSError(error);
            } else if (preSets.emergencyCache === false) {
                this.logger.debug(`WS call '${method}' failed. Emergency cache is forbidden, rejecting.`);

                throw new CoreWSError(error);
            }

            if (preSets.deleteCacheIfWSError && CoreWSError.isWebServiceError(error)) {
                // Delete the cache entry and return the entry. Don't block the user with the delete.
                CorePromiseUtils.ignoreErrors(this.deleteFromCache(method, data, preSets));

                throw new CoreWSError(error);
            }

            this.logger.debug(`WS call '${method}' failed. Trying to use the emergency cache.`);
            preSets = {
                ...preSets,
                omitExpires: true,
                getFromCache: true,
            };

            try {
                const cachedData = await this.getFromCache<T>(method, data, preSets, true);

                if (
                    typeof cachedData.response === 'object' && cachedData.response !== null &&
                    (
                        ('exception' in cachedData.response && cachedData.response.exception !== undefined) ||
                        ('errorcode' in cachedData.response && cachedData.response.errorcode !== undefined)
                    )
                ) {
                    throw new CoreWSError(cachedData.response);
                }

                return <T> cachedData.response;
            } catch {
                if (useSilentError) {
                    throw new CoreSilentError(error.message);
                }

                throw new CoreWSError(error);
            }
        }
    }

    /**
     * Get a request response from WS.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options related to the site.
     * @param wsPreSets Extra options related to the WS call.
     * @returns Promise resolved with the response.
     */
    protected async callOrEnqueueWS<T = unknown>(
        method: string,
        data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        preSets: CoreSiteWSPreSets,
        wsPreSets: CoreWSPreSets,
    ): Promise<T> {
        // Call the WS.
        const initialToken = this.token ?? '';

        // Send the language to use. Do it after checking cache to prevent losing offline data when changing language.
        // Moodle uses underscore instead of dash.
        data = {
            ...data,
            moodlewssettinglang: CoreLang.formatLanguage(preSets.lang ?? await CoreLang.getCurrentLanguage(), CoreLangFormat.LMS),
        };

        try {
            return await this.callOrEnqueueRequest<T>(method, data, preSets, wsPreSets);
        } catch (error) {
            if (CoreWSError.isExpiredTokenError(error)) {
                if (initialToken !== this.token) {
                    // Token has changed, retry with the new token.
                    wsPreSets.wsToken = this.token ?? '';

                    return await this.callOrEnqueueRequest<T>(method, data, preSets, wsPreSets);
                } else if (CoreSSO.isSSOAuthenticationOngoing()) {
                    // There's an SSO authentication ongoing, wait for it to finish and try again.
                    await CoreSSO.waitForSSOAuthentication();

                    return await this.callOrEnqueueRequest<T>(method, data, preSets, wsPreSets);
                }
            }

            if (error?.errorcode === 'invalidparameter' && method === 'core_webservice_get_site_info') {
                // Retry without passing the lang, this parameter isn't supported in 3.4 or older sites
                // and we need this WS call to be able to determine if the site is supported or not.
                delete data.moodlewssettinglang;

                return await this.callOrEnqueueRequest<T>(method, data, preSets, wsPreSets);
            }

            throw error;
        }
    }

    /**
     * Adds a request to the queue or calls it immediately when not using the queue.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options related to the site.
     * @param wsPreSets Extra options related to the WS call.
     * @returns Promise resolved with the response when the WS is called.
     */
    protected callOrEnqueueRequest<T = unknown>(
        method: string,
        data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        preSets: CoreSiteWSPreSets,
        wsPreSets: CoreWSPreSets,
    ): Promise<T> {
        if (preSets.skipQueue || !this.wsAvailable('tool_mobile_call_external_functions')) {
            return CoreWS.call<T>(method, data, wsPreSets);
        }

        const cacheId = this.getCacheId(method, data);

        // Check if there is an identical request waiting in the queue (read requests only by default).
        if (preSets.reusePending) {
            const request = this.requestQueue.find((request) => request.cacheId == cacheId);
            if (request) {
                return request.deferred;
            }
        }

        const request: RequestQueueItem<T> = {
            cacheId,
            method,
            data,
            preSets,
            wsPreSets,
            deferred: new CorePromisedValue(),
        };

        return this.enqueueRequest(request);
    }

    /**
     * Adds a request to the queue.
     *
     * @param request The request to enqueue.
     * @returns Promise resolved with the response when the WS is called.
     */
    protected enqueueRequest<T>(request: RequestQueueItem<T>): Promise<T> {
        this.requestQueue.push(request);

        if (this.requestQueue.length >= CoreConstants.CONFIG.wsrequestqueuelimit) {
            this.processRequestQueue();
        } else if (!this.requestQueueTimeout) {
            this.requestQueueTimeout = window.setTimeout(
                () => this.processRequestQueue(),
                CoreConstants.CONFIG.wsrequestqueuedelay,
            );
        }

        return request.deferred;
    }

    /**
     * Call the enqueued web service requests.
     */
    protected async processRequestQueue(): Promise<void> {
        this.logger.debug(`Processing request queue (${this.requestQueue.length} requests)`);

        // Clear timeout if set.
        if (this.requestQueueTimeout) {
            clearTimeout(this.requestQueueTimeout);
            this.requestQueueTimeout = null;
        }

        // Extract all requests from the queue.
        const requests = this.requestQueue;
        this.requestQueue = [];

        if (requests.length == 1 && !CoreAuthenticatedSite.REQUEST_QUEUE_FORCE_WS) {
            // Only one request, do a regular web service call.
            try {
                const data = await CoreWS.call(requests[0].method, requests[0].data, requests[0].wsPreSets);

                requests[0].deferred.resolve(data);
            } catch (error) {
                requests[0].deferred.reject(error);
            }

            return;
        }

        let lang: string | undefined;
        const requestsData: Record<string, unknown> = {
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
                        } else if (match[1] == 'settinglang') {
                            // Use the lang globally to avoid exceptions with languages not installed.
                            lang = value;

                            return;
                        }
                        settings[match[1]] = value;
                    } else {
                        args[key] = value;
                    }
                });

                return {
                    function: request.method,
                    arguments: JSON.stringify(args),
                    ...settings,
                };
            }),
        };
        requestsData.moodlewssettinglang = lang;

        const wsPresets: CoreWSPreSets = {
            siteUrl: this.siteUrl,
            wsToken: this.token || '',
        };

        try {
            const data = await CoreWS.call<CoreSiteCallExternalFunctionsResult>(
                'tool_mobile_call_external_functions',
                requestsData,
                wsPresets,
            );

            if (!data || !data.responses) {
                throw new CoreSiteError({
                    supportConfig: new CoreUserAuthenticatedSupportConfig(this),
                    message: Translate.instant('core.siteunavailablehelp', { site: this.siteUrl }),
                    debug: {
                        code: 'invalidresponse',
                        details: Translate.instant('core.errorinvalidresponse', { method: 'tool_mobile_call_external_functions' }),
                    },
                });
            }

            requests.forEach((request, i) => {
                const response = data.responses[i];

                if (!response) {
                    // Request not executed, enqueue again.
                    this.enqueueRequest(request);
                } else if (response.error) {
                    const rejectReason = CoreText.parseJSON(response.exception || '') as Error | undefined;
                    request.deferred.reject(rejectReason);
                    CoreErrorLogs.addErrorLog({
                        method: request.method,
                        type: 'CoreSiteError',
                        message: response.exception ?? '',
                        time: new Date().getTime(),
                        data: request.data,
                    });
                } else {
                    let responseData = response.data ? CoreText.parseJSON(response.data) : {};
                    // Match the behaviour of CoreWSProvider.call when no response is expected.
                    const responseExpected = wsPresets.responseExpected === undefined || wsPresets.responseExpected;
                    if (!responseExpected && (responseData == null || responseData === '')) {
                        responseData = {};
                    }
                    request.deferred.resolve(responseData);
                }
            });
        } catch (error) {
            // Error not specific to a single request, reject all promises.
            requests.forEach((request) => {
                CoreErrorLogs.addErrorLog({
                    method: request.method,
                    type: 'CoreSiteError',
                    message: String(error) ?? '',
                    time: new Date().getTime(),
                    data: request.data,
                });
                request.deferred.reject(error);
            });
        }
    }

    /**
     * Check if a WS is available in this site.
     *
     * @param method WS name.
     * @returns Whether the WS is available.
     */
    wsAvailable(method: string): boolean {
        return !!this.infos?.functionsByName?.[method];
    }

    /**
     * Get cache ID.
     *
     * @param method The WebService method.
     * @param data Arguments to pass to the method.
     * @returns Cache ID.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected getCacheId(method: string, data: any): string {
        return Md5.hashAsciiStr(`${method}:${CoreObject.sortAndStringify(data)}`);
    }

    /**
     * Get a WS response from cache.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @param emergency Whether it's an "emergency" cache call (WS call failed).
     * @returns Cached data.
     */
    protected async getFromCache<T = unknown>(
        method: string,
        data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        preSets: CoreSiteWSPreSets,
        emergency?: boolean,
    ): Promise<WSCachedData<T>> {
        if (!preSets.getFromCache) {
            throw new CoreError('Get from cache is disabled.');
        }

        const id = this.getCacheId(method, data);
        let entry: CoreSiteWSCacheRecord | undefined;

        if (preSets.getCacheUsingCacheKey || (emergency && preSets.getEmergencyCacheUsingCacheKey)) {
            const entries = await this.getCacheEntriesByKey(preSets.cacheKey ?? '');

            if (!entries.length) {
                // Cache key not found, get by params sent.
                entry = await this.getCacheEntryById(id);
            } else {
                if (entries.length > 1) {
                    // More than one entry found. Search the one with same ID as this call.
                    entry = entries.find((entry) => entry.id == id);
                }

                if (!entry) {
                    entry = entries[0];
                }
            }
        } else {
            entry = await this.getCacheEntryById(id);
        }

        if (entry === undefined) {
            throw new CoreError('Cache entry not valid.');
        }

        const now = Date.now();
        let expirationTime: number | undefined;

        const forceCache = preSets.omitExpires || preSets.forceOffline || !CoreNetwork.isOnline();

        if (!forceCache) {
            expirationTime = entry.expirationTime + this.getExpirationDelay(preSets.updateFrequency);

            if (preSets.updateInBackground && !CoreConstants.CONFIG.disableCallWSInBackground) {
                // Use a extended expiration time.
                const extendedTime = entry.expirationTime +
                    (CoreConstants.CONFIG.callWSInBackgroundExpirationTime ?? CoreConstants.SECONDS_WEEK * 1000);

                if (now > extendedTime) {
                    this.logger.debug('Cached element found, but it is expired even for call WS in background.');

                    throw new CoreError('Cache entry is expired.');
                }
            } else if (now > expirationTime) {
                this.logger.debug('Cached element found, but it is expired');

                throw new CoreError('Cache entry is expired.');
            }
        }

        if (entry.data !== undefined) {
            if (!expirationTime) {
                this.logger.info(`Cached element found, id: ${id}. Expiration time ignored.`);
            } else {
                const expires = (expirationTime - now) / 1000;
                this.logger.info(`Cached element found, id: ${id}. Expires in expires in ${expires} seconds`);
            }

            return {
                response: <T> CoreText.parseJSON(entry.data, {}),
                expirationIgnored: forceCache,
                expirationTime,
            };
        }

        throw new CoreError('Cache entry not valid.');
    }

    /**
     * Get cache entry by ID.
     *
     * @param id Cache ID.
     * @returns Cache entry.
     */
    protected async getCacheEntryById(id: string): Promise<CoreSiteWSCacheRecord> {
        if (!this.memoryCache[id]) {
            throw new CoreError('Cache entry not found.');
        }

        return this.memoryCache[id];
    }

    /**
     * Get cache entries by key.
     *
     * @param key Cache key.
     * @returns Cache entries.
     */
    protected async getCacheEntriesByKey(key: string): Promise<CoreSiteWSCacheRecord[]> {
        return Object.values(this.memoryCache).filter(entry => entry.key === key);
    }

    /**
     * Save a WS response to cache.
     *
     * @param method The WebService method.
     * @param data Arguments to pass to the method.
     * @param response The WS response.
     * @param preSets Extra options.
     * @returns Promise resolved when the response is saved.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async saveToCache(method: string, data: any, response: any, preSets: CoreSiteWSPreSets): Promise<void> {
        if (preSets.uniqueCacheKey) {
            // Cache key must be unique, delete all entries with same cache key.
            await CorePromiseUtils.ignoreErrors(this.deleteFromCache(method, data, preSets, true));
        }

        // Since 3.7, the expiration time contains the time the entry is modified instead of the expiration time.
        // We decided to reuse this field to prevent modifying the database table.
        const id = this.getCacheId(method, data);
        const entry: CoreSiteWSCacheRecord = {
            id,
            data: JSON.stringify(response),
            expirationTime: Date.now(),
        };

        if (preSets.cacheKey) {
            entry.key = preSets.cacheKey;
        }

        if (preSets.component) {
            entry.component = preSets.component;
            if (preSets.componentId) {
                entry.componentId = preSets.componentId;
            }
        }

        await this.storeCacheEntry(entry);
    }

    /**
     * Store a cache entry.
     *
     * @param entry Entry to store.
     */
    protected async storeCacheEntry(entry: CoreSiteWSCacheRecord): Promise<void> {
        this.memoryCache[entry.id] = entry;
    }

    /**
     * Delete a WS cache entry or entries.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra options.
     * @param allCacheKey True to delete all entries with the cache key, false to delete only by ID.
     * @returns Promise resolved when the entries are deleted.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async deleteFromCache(method: string, data: any, preSets: CoreSiteWSPreSets, allCacheKey?: boolean): Promise<void> {
        if (allCacheKey) {
            const entriesToDelete = await this.getCacheEntriesByKey(preSets.cacheKey ?? '');

            entriesToDelete.forEach(entry => {
                delete this.memoryCache[entry.id];
            });
        } else {
            delete this.memoryCache[this.getCacheId(method, data)];
        }
    }

    /**
     * Invalidates all the cache entries.
     *
     * @returns Promise resolved when the cache entries are invalidated.
     */
    async invalidateWsCache(): Promise<void> {
        try {
            for (const id in this.memoryCache) {
                this.memoryCache[id].expirationTime = 0;
            }
        } finally {
            this.triggerSiteEvent(CoreEvents.WS_CACHE_INVALIDATED, {});
        }
    }

    /**
     * Invalidates all the cache entries with a certain key.
     *
     * @param key Key to search.
     * @returns Promise resolved when the cache entries are invalidated.
     */
    async invalidateWsCacheForKey(key: string): Promise<void> {
        if (!key) {
            return;
        }

        this.logger.debug(`Invalidate cache for key: ${key}`);

        const entries = await this.getCacheEntriesByKey(key);
        entries.forEach(entry => {
            entry.expirationTime = 0;
        });
    }

    /**
     * Invalidates all the cache entries in an array of keys.
     *
     * @param keys Keys to search.
     * @returns Promise resolved when the cache entries are invalidated.
     */
    async invalidateMultipleWsCacheForKey(keys: string[]): Promise<void> {
        if (!keys || !keys.length) {
            return;
        }

        this.logger.debug('Invalidating multiple cache keys');
        await Promise.all(keys.map((key) => this.invalidateWsCacheForKey(key)));
    }

    /**
     * Invalidates all the cache entries whose key starts with a certain value.
     *
     * @param key Key to search.
     * @returns Promise resolved when the cache entries are invalidated.
     */
    async invalidateWsCacheForKeyStartingWith(key: string): Promise<void> {
        if (!key) {
            return;
        }

        this.logger.debug(`Invalidate cache for key starting with: ${key}`);
        Object.values(this.memoryCache).filter(entry => entry.key?.startsWith(key)).forEach(entry => {
            entry.expirationTime = 0;
        });
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * @param page Docs page to go to.
     * @returns Promise resolved with the Moodle docs URL.
     *
     * @deprecated since 4.5. Not needed anymore.
     */
    async getDocsUrl(page?: string): Promise<string> {
        const release = this.infos?.release ? this.infos.release : undefined;
        let docsUrl = `https://docs.moodle.org/en/${page}`;

        if (release !== undefined) {
            // Remove this part of the function if this file only uses CoreSites here.
            const version = CoreSites.getMajorReleaseNumber(release).replace('.', '');

            // Check is a valid number.
            if (Number(version) >= 24) {
                // Append release number.
                docsUrl = docsUrl.replace('https://docs.moodle.org/', `https://docs.moodle.org/${version}/`);
            }
        }

        try {
            // Remove this part of the function if this file only uses CoreLang here.
            let lang = CoreLang.getCurrentLanguageSync(CoreLangFormat.LMS);
            lang = CoreLang.getParentLanguage() || lang;

            return docsUrl.replace('/en/', `/${lang}/`);
        } catch {
            return docsUrl;
        }
    }

    /**
     * @inheritdoc
     */
    async getPublicConfig(options: { readingStrategy?: CoreSitesReadingStrategy } = {}): Promise<CoreSitePublicConfigResponse> {
        const ignoreCache = CoreSitesReadingStrategy.ONLY_NETWORK || CoreSitesReadingStrategy.PREFER_NETWORK;
        if (!ignoreCache && this.publicConfig) {
            return this.publicConfig;
        }

        const method = 'tool_mobile_get_public_config';
        const cacheId = this.getCacheId(method, {});
        const cachePreSets: CoreSiteWSPreSets = {
            getFromCache: true,
            saveToCache: true,
            emergencyCache: true,
            cacheKey: this.getPublicConfigCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        if (this.offlineDisabled) {
            // Offline is disabled, don't use cache.
            cachePreSets.getFromCache = false;
            cachePreSets.saveToCache = false;
            cachePreSets.emergencyCache = false;
        }

        // Check for an ongoing identical request if we're not ignoring cache.

        // Check for an ongoing identical request.
        const ongoingRequest = this.getOngoingRequest<CoreSitePublicConfigResponse>(cacheId, cachePreSets);
        if (ongoingRequest) {
            return await firstValueFrom(ongoingRequest);
        }

        const subject = new Subject<CoreSitePublicConfigResponse>();
        const observable = subject.pipe(
            // Return a clone of the original object, this may prevent errors if in the callback the object is modified.
            map((data) => CoreUtils.clone(data)),
            finalize(() => {
                this.clearOngoingRequest(cacheId, cachePreSets, observable);
            }),
        );

        this.setOngoingRequest(cacheId, cachePreSets, observable);

        this.getFromCache<CoreSitePublicConfigResponse>(method, {}, cachePreSets, false)
            .then(cachedData => cachedData.response)
            .catch(async () => {
                if (cachePreSets.forceOffline) {
                    // Don't call the WS, just fail.
                    throw new CoreError(Translate.instant('core.cannotconnect'));
                }

                // Call the WS.
                try {
                    const config = await this.requestPublicConfig();

                    if (cachePreSets.saveToCache) {
                        this.saveToCache(method, {}, config, cachePreSets);
                    }

                    return config;
                } catch (error) {
                    if (cachePreSets.emergencyCache === false) {
                        throw error;
                    }

                    cachePreSets.omitExpires = true;
                    cachePreSets.getFromCache = true;

                    try {
                        const cachedData = await this.getFromCache<CoreSitePublicConfigResponse>(method, {}, cachePreSets, true);

                        return cachedData.response;
                    } catch {
                        throw error;
                    }
                }
            }).then((response) => {
                // The app doesn't store exceptions for this call, it's safe to assume type CoreSitePublicConfigResponse.
                response = <CoreSitePublicConfigResponse> response;

                this.setPublicConfig(response);
                subject.next(response);
                subject.complete();

                return;
            }).catch((error) => {
                subject.error(error);
            });

        return await firstValueFrom(observable);
    }

    /**
     * Get cache key for getPublicConfig WS calls.
     *
     * @returns Cache key.
     */
    protected getPublicConfigCacheKey(): string {
        return 'tool_mobile_get_public_config';
    }

    /**
     * Check if GET method is supported for AJAX calls.
     *
     * @returns Whether it's supported.
     */
    protected isAjaxGetSupported(): boolean {
        return !!this.getInfo() && this.isVersionGreaterEqualThan('3.8');
    }

    /**
     * Check if the site version is greater than one or several versions.
     * This function accepts a string or an array of strings. If array, the last version must be the highest.
     *
     * @param versions Version or list of versions to check.
     * @returns Whether it's greater or equal, false otherwise.
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
        const info = this.getInfo();

        if (!info || !info.version) {
            return false;
        }

        const siteVersion = Number(info.version);

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
        } else if (typeof versions === 'string') {
            // Compare with this version.
            return siteVersion >= this.getVersionNumber(versions);
        }

        return false;
    }

    /**
     * Get a version number from a release version.
     * If release version is valid but not found in the list of Moodle releases, it will use the last released major version.
     *
     * @param version Release version to convert to version number.
     * @returns Version number, 0 if invalid.
     */
    protected getVersionNumber(version: string): number {
        const data = this.getMajorAndMinor(version);

        if (!data) {
            // Invalid version.
            return 0;
        }

        if (MOODLE_RELEASES[data.major] === undefined) {
            // Major version not found. Use the last one.
            const major = Object.keys(MOODLE_RELEASES).pop();
            if (!major) {
                return 0;
            }

            data.major = major;
        }

        return MOODLE_RELEASES[data.major] + data.minor;
    }

    /**
     * Given a release version, return the major and minor versions.
     *
     * @param version Release version (e.g. '3.1.0').
     * @returns Object with major and minor. Returns false if invalid version.
     */
    protected getMajorAndMinor(version: string): {major: string; minor: number} | false {
        const match = version.match(/^(\d+)(\.(\d+)(\.\d+)?)?/);
        if (!match || !match[1]) {
            // Invalid version.
            return false;
        }

        return {
            major: `${match[1]}.${match[3] || '0'}`,
            minor: parseInt(match[5], 10) || 0,
        };
    }

    /**
     * Given a release version, return the next major version number.
     *
     * @param version Release version (e.g. '3.1.0').
     * @returns Next major version number.
     */
    protected getNextMajorVersionNumber(version: string): number {
        const data = this.getMajorAndMinor(version);
        const releases = Object.keys(MOODLE_RELEASES);

        if (!data) {
            // Invalid version.
            return 0;
        }

        const position = releases.indexOf(data.major);

        if (position == -1 || position == releases.length - 1) {
            // Major version not found or it's the last one. Use the last one.
            return MOODLE_RELEASES[releases[position]];
        }

        return MOODLE_RELEASES[releases[position + 1]];
    }

    /**
     * Get a certain cache expiration delay.
     *
     * @param updateFrequency The update frequency of the entry.
     * @returns Expiration delay.
     */
    getExpirationDelay(updateFrequency?: CoreCacheUpdateFrequency): number {
        updateFrequency = updateFrequency ?? CoreCacheUpdateFrequency.USUALLY;
        let expirationDelay = CoreAuthenticatedSite.UPDATE_FREQUENCIES[updateFrequency] ||
        CoreAuthenticatedSite.UPDATE_FREQUENCIES[CoreCacheUpdateFrequency.USUALLY];

        if (CoreNetwork.isNetworkAccessLimited()) {
            // Not WiFi, increase the expiration delay a 50% to decrease the data usage in this case.
            expirationDelay *= 1.5;
        }

        return expirationDelay;
    }

    /**
     * Trigger an event.
     *
     * @param eventName Event name.
     * @param data Event data.
     */
    protected triggerSiteEvent<Fallback = unknown, Event extends string = string>(
        eventName: Event,
        data?: CoreEventData<Event, Fallback>,
    ): void {
        CoreEvents.trigger(eventName, data);
    }

}

/**
 * Operator to chain requests when using observables.
 *
 * @param readingStrategy Reading strategy used for the current request.
 * @param callback Callback called with the result of current request and the reading strategy to use in next requests.
 * @returns Operator.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chainRequests<T, O extends ObservableInput<any>>(
    readingStrategy: CoreSitesReadingStrategy | undefined,
    callback: (data: T, readingStrategy?: CoreSitesReadingStrategy) => O,
): OperatorFunction<T, ObservedValueOf<O>> {
    return (source: WSObservable<T>) => new Observable<{ data: T; readingStrategy?: CoreSitesReadingStrategy }>(subscriber => {
        let firstValue = true;
        let isCompleted = false;

        return source.subscribe({
            next: async (value) => {
                if (readingStrategy !== CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE) {
                    // Just use same strategy.
                    subscriber.next({ data: value, readingStrategy });

                    return;
                }

                if (!firstValue) {
                    // Second (last) value. Chained requests should have used cached data already, just return 1 value now.
                    subscriber.next({
                        data: value,
                    });

                    return;
                }

                firstValue = false;

                // Wait to see if the observable is completed (no more values).
                await CoreWait.nextTick();

                if (isCompleted) {
                    // Current request only returns cached data. Let chained requests update in background.
                    subscriber.next({ data: value, readingStrategy });
                } else {
                    // Current request will update in background. Prefer cached data in the chained requests.
                    subscriber.next({
                        data: value,
                        readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                    });
                }
            },
            error: (error) => subscriber.error(error),
            complete: async () => {
                isCompleted = true;

                await CoreWait.nextTick();

                subscriber.complete();
            },
        });
    }).pipe(
        mergeMap(({ data, readingStrategy }) => callback(data, readingStrategy)),
    );
}

/**
 * Optional data to create an authenticated site.
 */
export type CoreAuthenticatedSiteOptionalData = {
    privateToken?: string;
    publicConfig?: CoreSitePublicConfigResponse;
};

/**
 * PreSets accepted by the WS call.
 */
export type CoreSiteWSPreSets = {
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
     * Language to send to the WebService (moodlewssettinglang). Defaults to app's language.
     */
    lang?: string;

    /**
     * Defaults to true. Set to false when the expected response is null.
     */
    responseExpected?: boolean;

    /**
     * Defaults to 'object'. Use it when you expect a type that's not an object|array.
     */
    typeExpected?: CoreWSTypeExpected;

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
     * USUALLY, OFTEN, SOMETIMES, RARELY.
     * Defaults to USUALLY.
     */
    updateFrequency?: CoreCacheUpdateFrequency;

    /**
     * Component name. Optionally included if this request is being made on behalf of a specific
     * component (e.g. activity).
     */
    component?: string;

    /**
     * Component id. Optionally included when 'component' is set.
     */
    componentId?: number;

    /**
     * Whether to split a request if it has too many parameters. Sending too many parameters to the site
     * can cause the request to fail (see PHP's max_input_vars).
     */
    splitRequest?: CoreWSPreSetsSplitRequest;

    /**
     * If true, the app will return cached data even if it's expired and then it'll call the WS in the background.
     * Only enabled if CoreConstants.CONFIG.disableCallWSInBackground isn't true.
     */
    updateInBackground?: boolean;

    /**
     * Whether to also fetch in background the original content (unfiltered and without rewriting URLs).
     * Ignored if filter=false or data is not saved to cache.
     */
    fetchOriginalToo?: boolean | ((response: unknown) => boolean | Promise<boolean>);
};

/**
 * Info of a request waiting in the queue.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestQueueItem<T = any> = {
    cacheId: string;
    method: string;
    data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    preSets: CoreSiteWSPreSets;
    wsPreSets: CoreWSPreSets;
    deferred: CorePromisedValue<T>;
};

/**
 * Result of WS tool_mobile_call_external_functions.
 */
export type CoreSiteCallExternalFunctionsResult = {
    responses: {
        error: boolean; // Whether an exception was thrown.
        data?: string; // JSON-encoded response data.
        exception?: string; // JSON-encoed exception info.
    }[];
};

/**
 * Info about cached data.
 */
type WSCachedData<T> = {
    response: T | WSCachedError; // The WS response data, or an error if the WS returned an error and it was cached.
    expirationIgnored: boolean; // Whether the expiration time was ignored.
    expirationTime?: number; // Entry expiration time (only if not ignored).
};

/**
 * Error data stored in cache.
 */
type WSCachedError = {
    exception?: string;
    errorcode?: string;
};

/**
 * Observable returned when calling WebServices.
 * If the request uses the "update in background" feature, it will return 2 values: first the cached one, and then the one
 * coming from the server. After this, it will complete.
 * Otherwise, it will only return 1 value, either coming from cache or from the server. After this, it will complete.
 */
export type WSObservable<T> = Observable<T>;

/**
 * Type of ongoing requests stored in memory to avoid duplicating them.
 */
enum OngoingRequestType {
    STANDARD = 0,
    UPDATE_IN_BACKGROUND = 1,
}
