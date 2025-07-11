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

import { Injectable } from '@angular/core';
import { HttpResponse, HttpParams, HttpErrorResponse } from '@angular/common/http';

import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { HTTPResponse as NativeHttpResponse } from '@awesome-cordova-plugins/http';
import { Md5 } from 'ts-md5/dist/md5';
import { Observable, firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { CoreNativeToAngularHttpResponse } from '@classes/native-to-angular-http';
import { CoreNetwork } from '@services/network';
import { CoreFile, CoreFileFormat } from '@services/file';
import { CoreMimetype } from '@singletons/mimetype';
import { CoreText } from '@singletons/text';
import { CoreConstants, MINIMUM_MOODLE_VERSION } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreInterceptor } from '@classes/interceptor';
import { makeSingleton, Translate, Http, NativeHttp } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreAjaxError } from '@classes/errors/ajaxerror';
import { CoreAjaxWSError } from '@classes/errors/ajaxwserror';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreHttpError } from '@classes/errors/httperror';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { CoreSiteError, CoreSiteErrorOptions } from '@classes/errors/siteerror';
import { CoreUserGuestSupportConfig } from '@features/user/classes/support/guest-support-config';
import { CoreSites } from '@services/sites';
import { CoreLang, CoreLangFormat } from './lang';
import { CoreErrorLogs } from '@singletons/error-logs';
import { CoreErrorHelper, CoreErrorObject } from './error-helper';
import { CoreDom } from '@singletons/dom';

/**
 * This service allows performing WS calls and download/upload files.
 */
@Injectable({ providedIn: 'root' })
export class CoreWSProvider {

    protected logger: CoreLogger;
    protected mimeTypeCache: {[url: string]: string | null} = {}; // A "cache" to store file mimetypes to decrease HEAD requests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected ongoingCalls: {[queueItemId: string]: Promise<any>} = {};
    protected retryCalls: RetryCall[] = [];
    protected retryTimeout = 0;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreWSProvider');
    }

    /**
     * Adds the call data to an special queue to be processed when retrying.
     *
     * @param method The WebService method to be called.
     * @param siteUrl Complete site url to perform the call.
     * @param data Arguments to pass to the method.
     * @param preSets Extra settings and information.
     * @returns Deferred promise resolved with the response data in success and rejected with the error if it fails.
     */
    protected addToRetryQueue<T = unknown>(
        method: string,
        siteUrl: string,
        data: Record<string, unknown>,
        preSets: CoreWSPreSets,
    ): Promise<T> {
        const call = {
            method,
            siteUrl,
            data,
            preSets,
            deferred: new CorePromisedValue<T>(),
        };

        this.retryCalls.push(call);

        return call.deferred;
    }

    /**
     * A wrapper function for a moodle WebService call.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method. It's recommended to call convertValuesToString before passing the data.
     * @param preSets Extra settings and information.
     * @returns Promise resolved with the response data in success and rejected if it fails.
     */
    call<T = unknown>(method: string, data: Record<string, unknown>, preSets: CoreWSPreSets): Promise<T> {
        if (!preSets) {
            throw new CoreError(Translate.instant('core.unexpectederror'));
        } else if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (preSets.responseExpected === undefined) {
            preSets.responseExpected = true;
        }

        const dataToSend = Object.assign({}, data); // Create a new object so the changes don't affect the original data.
        dataToSend['wsfunction'] = method;
        dataToSend['wstoken'] = preSets.wsToken;
        const siteUrl = `${preSets.siteUrl}/webservice/rest/server.php?moodlewsrestformat=json`;

        // There are some ongoing retry calls, wait for timeout.
        if (this.retryCalls.length > 0) {
            this.logger.warn('Calls locked, trying later...');

            return this.addToRetryQueue<T>(method, siteUrl, dataToSend, preSets);
        } else {
            return this.performPost<T>(method, siteUrl, dataToSend, preSets);
        }
    }

    /**
     * Call a Moodle WS using the AJAX API. Please use it if the WS layer is not an option.
     * It uses a cache to prevent duplicate requests.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra settings and information. Only some
     * @returns Promise resolved with the response data in success and rejected with CoreAjaxError.
     */
    callAjax<T = unknown>(method: string, data: Record<string, unknown>, preSets: CoreWSAjaxPreSets): Promise<T> {
        const cacheParams = {
            methodname: method,
            args: data,
        };

        let promise = this.getPromiseHttp<T>('ajax', preSets.siteUrl, cacheParams);

        if (!promise) {
            promise = this.performAjax<T>(method, data, preSets);
            promise = this.setPromiseHttp<T>(promise, 'ajax', preSets.siteUrl, cacheParams);
        }

        return promise;
    }

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained, null values will be removed.
     *
     * @param data The data that needs all the non-object values set to strings.
     * @param stripUnicode If Unicode long chars need to be stripped.
     * @returns The cleaned object or null if some strings becomes empty after stripping Unicode.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convertValuesToString(data: any, stripUnicode?: boolean): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = Array.isArray(data) ? [] : {};

        for (const key in data) {
            let value = data[key];

            if (value == null) {
                // Skip null or undefined value.
                continue;
            } else if (typeof value === 'object') {
                // Object or array.
                value = this.convertValuesToString(value, stripUnicode);
                if (value == null) {
                    return null;
                }
            } else if (typeof value === 'string') {
                if (stripUnicode) {
                    const stripped = CoreText.stripUnicode(value);
                    if (stripped != value && stripped.trim().length == 0) {
                        return null;
                    }
                    value = stripped;
                }
            } else if (typeof value == 'boolean') {
                /* Moodle does not allow "true" or "false" in WS parameters, only in POST parameters.
                   We've been using "true" and "false" for WS settings "filter" and "fileurl",
                   we keep it this way to avoid changing cache keys. */
                if (key == 'moodlewssettingfilter' || key == 'moodlewssettingfileurl') {
                    value = value ? 'true' : 'false';
                } else {
                    value = value ? '1' : '0';
                }
            } else if (typeof value == 'number') {
                value = String(value);
            } else {
                // Unknown type.
                continue;
            }

            if (Array.isArray(result)) {
                result.push(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * It will check if response has failed and throw the propper error.
     *
     * @param response WS response.
     * @param defaultMessage Message to be used in case warnings is empty.
     */
    throwOnFailedStatus(response: CoreStatusWithWarningsWSResponse, defaultMessage: string): void {
        if (!response.status) {
            if (response.warnings && response.warnings.length) {
                throw new CoreWSError(response.warnings[0]);
            }

            throw new CoreError(defaultMessage);
        }
    }

    /**
     * Downloads a file from Moodle using Cordova File API.
     *
     * @param url Download url.
     * @param path Local path to store the file.
     * @param addExtension True if extension need to be added to the final path.
     * @param onProgress Function to call on progress.
     * @returns Promise resolved with the downloaded file.
     */
    async downloadFile(
        url: string,
        path: string,
        addExtension?: boolean,
        onProgress?: (event: ProgressEvent) => void,
    ): Promise<CoreWSDownloadedFileEntry> {
        this.logger.debug('Downloading file', url, path, addExtension);

        if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        // Use a tmp path to download the file and then move it to final location.
        // This is because if the download fails, the local file is deleted.
        const tmpPath = `${path}.tmp`;

        try {
            // Create the tmp file as an empty file.
            const fileEntry = await CoreFile.createFile(tmpPath);

            let fileDownloaded: { entry: globalThis.FileEntry; headers: Record<string, string> | undefined};
            let redirectUrl: string | undefined;
            let maxRedirects = 5;
            do {
                const transfer = new window.FileTransfer();
                if (onProgress) {
                    transfer.onprogress = onProgress;
                }

                // Download the file in the tmp file.
                fileDownloaded = await new Promise((resolve, reject) => {
                    transfer.download(
                        redirectUrl ?? url,
                        CoreFile.getFileEntryURL(fileEntry),
                        (result) => resolve(result),
                        (error: FileTransferError) => reject(error),
                        true,
                        { headers: { 'User-Agent': navigator.userAgent } },
                    );
                });

                // Redirections should have been handled by the platform,
                // but Android does not follow redirections between HTTP and HTTPS.
                // See: https://developer.android.com/reference/java/net/HttpURLConnection#response-handling
                redirectUrl = fileDownloaded.headers?.['location'];
                maxRedirects--;
            } while (redirectUrl && maxRedirects >= 0);

            let extension = '';

            if (addExtension) {
                extension = CoreMimetype.getFileExtension(path) || '';

                // Google Drive extensions will be considered invalid since Moodle usually converts them.
                if (!extension || ['gdoc', 'gsheet', 'gslides', 'gdraw', 'php'].includes(extension)) {

                    // Not valid, get the file's mimetype.
                    const requestContentType = fileDownloaded.headers?.['Content-Type']?.split(';')[0];
                    const mimetype = requestContentType ?? await this.getRemoteFileMimeType(url);

                    if (mimetype) {
                        const remoteExtension = CoreMimetype.getExtension(mimetype, url);
                        // If the file is from Google Drive, ignore mimetype application/json.
                        if (remoteExtension && (!extension || mimetype != 'application/json')) {
                            if (extension) {
                                // Remove existing extension since we will use another one.
                                path = CoreMimetype.removeExtension(path);
                            }
                            path += `.${remoteExtension}`;

                            extension = remoteExtension;
                        }
                    }
                }
            }

            // Move the file to the final location.
            const movedEntry = await CoreFile.moveFile(tmpPath, path);

            this.logger.debug(`Success downloading file ${url} to ${path} with extension ${extension}`);

            // Also return the extension and path.
            return <CoreWSDownloadedFileEntry> Object.assign(movedEntry, {
                extension: extension,
                path: path,
            });
        } catch (error) {
            this.logger.error(`Error downloading ${url} to ${path}`, error);

            throw error;
        }
    }

    /**
     * Get a promise from the cache.
     *
     * @param method Method of the HTTP request.
     * @param url Base URL of the HTTP request.
     * @param params Params of the HTTP request.
     * @returns the on going call if any.
     */
    protected getPromiseHttp<T = unknown>(method: string, url: string, params?: Record<string, unknown>): Promise<T> | undefined {
        const queueItemId = this.getQueueItemId(method, url, params);
        if (this.ongoingCalls[queueItemId] !== undefined) {
            return this.ongoingCalls[queueItemId];
        }
    }

    /**
     * Perform a HEAD request to get the mimetype of a remote file.
     *
     * @param url File URL.
     * @param ignoreCache True to ignore cache, false otherwise.
     * @returns Promise resolved with the mimetype or '' if failure.
     */
    async getRemoteFileMimeType(url: string, ignoreCache?: boolean): Promise<string> {
        const cachedMimeType = this.mimeTypeCache[url];
        if (cachedMimeType && !ignoreCache) {
            return cachedMimeType;
        }

        try {
            const response = await this.performHead(url);

            let mimeType = response.headers.get('Content-Type');
            if (mimeType) {
                // Remove "parameters" like charset.
                mimeType = mimeType.split(';')[0];
            }
            this.mimeTypeCache[url] = mimeType;

            return mimeType || '';
        } catch {
            // Error, resolve with empty mimetype.
            return '';
        }
    }

    /**
     * Perform a HEAD request to get the size of a remote file.
     *
     * @param url File URL.
     * @returns Promise resolved with the size or -1 if failure.
     */
    getRemoteFileSize(url: string): Promise<number> {
        return this.performHead(url).then((response) => {
            const contentLength = response.headers.get('Content-Length');
            const size = contentLength ? parseInt(contentLength, 10) : 0;

            if (size) {
                return size;
            }

            return -1;
        }).catch(() => -1);
    }

    /**
     * Get a request timeout based on the network connection.
     *
     * @returns Timeout in ms.
     */
    getRequestTimeout(): number {
        return CoreNetwork.isNetworkAccessLimited() ? CoreConstants.WS_TIMEOUT : CoreConstants.WS_TIMEOUT_WIFI;
    }

    /**
     * Get the unique queue item id of the cache for a HTTP request.
     *
     * @param method Method of the HTTP request.
     * @param url Base URL of the HTTP request.
     * @param params Params of the HTTP request.
     * @returns Queue item ID.
     */
    protected getQueueItemId(method: string, url: string, params?: Record<string, unknown>): string {
        if (params) {
            url += `###${CoreInterceptor.serialize(params)}`;
        }

        return `${method}#${Md5.hashAsciiStr(url)}`;
    }

    /**
     * Call a Moodle WS using the AJAX API.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra settings and information. Only some
     * @returns Promise resolved with the response data in success and rejected with CoreAjaxError.
     */
    protected async performAjax<T = unknown> (
        method: string,
        data: Record<string, unknown>,
        preSets: CoreWSAjaxPreSets,
    ): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let promise: Promise<HttpResponse<any>>;

        if (preSets.siteUrl === undefined) {
            const unexpectedError = new CoreAjaxError(Translate.instant('core.unexpectederror'));
            CoreErrorLogs.addErrorLog({
                method,
                type: 'CoreAjaxError',
                message: Translate.instant('core.unexpectederror'),
                time: new Date().getTime(),
                data,
            });
            throw unexpectedError;
        } else if (!CoreNetwork.isOnline()) {
            const networkError = new CoreAjaxError(Translate.instant('core.networkerrormsg'));
            CoreErrorLogs.addErrorLog({
                method,
                type: 'CoreAjaxError',
                message: Translate.instant('core.networkerrormsg'),
                time: new Date().getTime(),
                data,
            });
            throw networkError;
        }

        if (preSets.responseExpected === undefined) {
            preSets.responseExpected = true;
        }

        const script = preSets.noLogin ? 'service-nologin.php' : 'service.php';
        const ajaxData = [{
            index: 0,
            methodname: method,
            args: this.convertValuesToString(data),
        }];

        const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);

        // The info= parameter has no function. It is just to help with debugging.
        // We call it info to match the parameter name use by Moodle's AMD ajax module.
        let siteUrl = `${preSets.siteUrl}/lib/ajax/${script}?info=${method}&lang=${lang}`;

        if (preSets.noLogin && preSets.useGet) {
            // Send params using GET.
            siteUrl += `&args=${encodeURIComponent(JSON.stringify(ajaxData))}`;

            promise = this.sendHTTPRequest<T>(siteUrl, {
                method: 'get',
            });
        } else {
            promise = this.sendHTTPRequest<T>(siteUrl, {
                method: 'post',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: <any> ajaxData,
                serializer: 'json',
            });
        }

        return promise.then(async (response) => {
            let data = response.body;

            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data is returned, we create a blank object.
            if (!data && !preSets.responseExpected) {
                data = [{}];
            }

            // Check if error. Ajax layer should always return an object (if error) or an array (if success).
            if (!data || typeof data !== 'object') {
                const message = CoreSites.isLoggedIn()
                    ? Translate.instant('core.siteunavailablehelp', { site: CoreSites.getCurrentSite()?.siteUrl })
                    : Translate.instant('core.sitenotfoundhelp');

                throw new CoreAjaxError({
                    message,
                    supportConfig: await CoreUserGuestSupportConfig.forSite(preSets.siteUrl),
                    debug: {
                        code: 'invalidresponse',
                        details: Translate.instant('core.serverconnection', {
                            details: Translate.instant('core.errorinvalidresponse', { method }),
                        }),
                    },
                });
            } else if (data.error) {
                throw new CoreAjaxWSError(data);
            }

            // Get the first response since only one request was done.
            data = data[0];

            if (data.error) {
                throw new CoreAjaxWSError(data.exception);
            }

            return data.data;
        }, async (data: HttpErrorResponse) => {
            const message = CoreSites.isLoggedIn()
                ? Translate.instant('core.siteunavailablehelp', { site: CoreSites.getCurrentSite()?.siteUrl })
                : Translate.instant('core.sitenotfoundhelp');

            const options: CoreSiteErrorOptions = {
                message,
                supportConfig: await CoreUserGuestSupportConfig.forSite(preSets.siteUrl),
            };

            if (CorePlatform.isMobile()) {
                switch (data.status) {
                    case NativeHttp.ErrorCode.SSL_EXCEPTION:
                        options.debug = {
                            code: 'invalidcertificate',
                            details: Translate.instant('core.certificaterror', {
                                details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Invalid certificate',
                            }),
                        };
                        break;
                    case NativeHttp.ErrorCode.SERVER_NOT_FOUND:
                        options.debug = {
                            code: 'servernotfound',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Server could not be found',
                        };
                        break;
                    case NativeHttp.ErrorCode.TIMEOUT:
                        options.debug = {
                            code: 'requesttimeout',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Request timed out',
                        };
                        break;
                    case NativeHttp.ErrorCode.UNSUPPORTED_URL:
                        options.debug = {
                            code: 'unsupportedurl',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Url not supported',
                        };
                        break;
                    case NativeHttp.ErrorCode.NOT_CONNECTED:
                        options.debug = {
                            code: 'connectionerror',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error)
                                ?? 'Connection error, is network available?',
                        };
                        break;
                    case NativeHttp.ErrorCode.ABORTED:
                        options.debug = {
                            code: 'requestaborted',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Request aborted',
                        };
                        break;
                    case NativeHttp.ErrorCode.POST_PROCESSING_FAILED:
                        options.debug = {
                            code: 'requestprocessingfailed',
                            details: CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Request processing failed',
                        };
                        break;
                }
            }

            if (!options.debug) {
                switch (data.status) {
                    case 404:
                        options.debug = {
                            code: 'endpointnotfound',
                            details: Translate.instant('core.ajaxendpointnotfound', {
                                $a: MINIMUM_MOODLE_VERSION,
                            }),
                        };
                        break;
                    default: {
                        const details = CoreErrorHelper.getErrorMessageFromError(data.error) ?? 'Unknown error';

                        options.debug = {
                            code: 'serverconnectionajax',
                            details: Translate.instant('core.serverconnection', {
                                details: `[Response status code: ${data.status}] ${details}`,
                            }),
                        };
                    }
                        break;
                }
            }

            throw new CoreAjaxError(options, 1, data.status);
        }).catch(error => {
            const type = `CoreAjaxError - ${error.errorcode}`;
            CoreErrorLogs.addErrorLog({ method, type, message: error, time: new Date().getTime(), data });
            throw error;
        });
    }

    /**
     * Perform a HEAD request and save the promise while waiting to be resolved.
     *
     * @param url URL to perform the request.
     * @returns Promise resolved with the response.
     */
    performHead<T = unknown>(url: string): Promise<HttpResponse<T>> {
        let promise = this.getPromiseHttp<HttpResponse<T>>('head', url);

        if (!promise) {
            promise = this.sendHTTPRequest<T>(url, {
                method: 'head',
                responseType: 'text',
            });

            promise = this.setPromiseHttp<HttpResponse<T>>(promise, 'head', url);
        }

        return promise;
    }

    /**
     * Perform the post call. It can be split into several requests.
     *
     * @param method The WebService method to be called.
     * @param siteUrl Complete site url to perform the call.
     * @param ajaxData Arguments to pass to the method.
     * @param preSets Extra settings and information.
     * @returns Promise resolved with the response data in success and rejected with CoreWSError if it fails.
     */
    async performPost<T = unknown>(
        method: string,
        siteUrl: string,
        ajaxData: Record<string, unknown>,
        preSets: CoreWSPreSets,
    ): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: any = {};

        // This is done because some returned values like 0 are treated as null if responseType is json.
        if (preSets.typeExpected == 'number' || preSets.typeExpected == 'boolean' || preSets.typeExpected == 'string') {
            options.responseType = 'text';
        }

        if (!preSets.splitRequest || !ajaxData[preSets.splitRequest.param]) {
            return this.performSinglePost(method, siteUrl, ajaxData, preSets, options);
        }

        // Split the request into several requests if needed.
        const promises: Promise<T>[] = [];
        const splitParam = <unknown[]> ajaxData[preSets.splitRequest.param];

        for (let i = 0; i < splitParam.length; i += preSets.splitRequest.maxLength) {
            // Limit the array sent.
            const limitedData = Object.assign({}, ajaxData);
            limitedData[preSets.splitRequest.param] = splitParam.slice(i, i + preSets.splitRequest.maxLength);

            promises.push(this.performSinglePost(method, siteUrl, limitedData, preSets, options));
        }

        const results = await Promise.all(promises);

        // Combine the results.
        const firstResult = results.shift();

        if (preSets.splitRequest.combineCallback) {
            return <T> results.reduce(preSets.splitRequest.combineCallback, firstResult);
        }

        return <T> results.reduce((previous: T, current: T) => this.combineObjectsArrays<T>(previous, current), firstResult);
    }

    /**
     * Combine the arrays of two objects, adding them to the first object.
     *
     * @param object1 First object.
     * @param object2 Second object.
     * @returns First object with items added.
     */
    protected combineObjectsArrays<T>(object1: T, object2: T): T {
        for (const name in object2) {
            const value = object2[name];

            if (Array.isArray(value)) {
                (object1 as Record<string, unknown>)[name] = (object1[name] as typeof value).concat(value);
            }
        }

        return object1;
    }

    /**
     * Perform a single post request.
     *
     * @param method The WebService method to be called.
     * @param siteUrl Complete site url to perform the call.
     * @param ajaxData Arguments to pass to the method.
     * @param preSets Extra settings and information.
     * @param options Request options.
     * @returns Promise resolved with the response data in success and rejected with CoreWSError if it fails.
     */
    protected performSinglePost<T>(
        method: string,
        siteUrl: string,
        ajaxData: Record<string, unknown>,
        preSets: CoreWSPreSets,
        options: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ): Promise<T> {

        // We add the method name to the URL purely to help with debugging.
        // This duplicates what is in the ajaxData, but that does no harm.
        // POST variables take precedence over GET.
        const requestUrl = `${siteUrl}&wsfunction=${method}`;

        // Perform the post request.
        const promise = firstValueFrom(Http.post(requestUrl, ajaxData, options).pipe(timeout(this.getRequestTimeout())));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return promise.then(async (data: any) => {
            // Some moodle web services always return null, and some others can return a primitive type or null.
            if (data === null && (!preSets.responseExpected || preSets.typeExpected !== 'object')) {
                return null;
            }

            const typeExpected = preSets.typeExpected === 'jsonstring' ? 'string' : preSets.typeExpected;

            if (!data) {
                throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                    debug: {
                        code: 'serverconnectionpost',
                        details: Translate.instant('core.serverconnection', {
                            details: Translate.instant('core.errorinvalidresponse', { method }),
                        }),
                    },
                });
            } else if (typeof data !== typeExpected) {
                // If responseType is text an string will be returned, parse before returning.
                if (typeof data == 'string') {
                    if (typeExpected === 'number') {
                        data = Number(data);
                        if (isNaN(data)) {
                            this.logger.warn(`Response expected type "${typeExpected}" cannot be parsed to number`);

                            throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                                debug: {
                                    code: 'invalidresponse',
                                    details: Translate.instant('core.errorinvalidresponse', { method }),
                                },
                            });
                        }
                    } else if (typeExpected === 'boolean') {
                        if (data === 'true') {
                            data = true;
                        } else if (data === 'false') {
                            data = false;
                        } else {
                            this.logger.warn(`Response expected type "${typeExpected}" is not true or false`);

                            throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                                debug: {
                                    code: 'invalidresponse',
                                    details: Translate.instant('core.errorinvalidresponse', { method }),
                                },
                            });
                        }
                    } else {
                        this.logger.warn(`Response of type "${typeof data}" received, expecting "${typeExpected}"`);

                        throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                            debug: {
                                code: 'invalidresponse',
                                details: Translate.instant('core.errorinvalidresponse', { method }),
                            },
                        });
                    }
                } else {
                    this.logger.warn(`Response of type "${typeof data}" received, expecting "${typeExpected}"`);

                    throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                        debug: {
                            code: 'invalidresponse',
                            details: Translate.instant('core.errorinvalidresponse', { method }),
                        },
                    });
                }
            }

            if (data.exception !== undefined) {
                // Special debugging for site plugins, otherwise it's hard to debug errors if the data is cached.
                if (method == 'tool_mobile_get_content') {
                    this.logger.error('Error calling WS', method, data);
                }

                throw new CoreWSError(data);
            }

            if (data.debuginfo !== undefined) {
                throw new CoreError(`Error. ${data.message}`);
            }

            return data;
        }, async (error) => {
            // If server has heavy load, retry after some seconds.
            if (error.status == 429) {
                const retryPromise = this.addToRetryQueue<T>(method, siteUrl, ajaxData, preSets);

                // Only process the queue one time.
                if (this.retryTimeout == 0) {
                    this.retryTimeout = parseInt(error.headers.get('Retry-After'), 10) || 5;
                    this.logger.warn(`${error.statusText}. Retrying in ${this.retryTimeout} seconds. ` +
                        `${this.retryCalls.length} calls left.`);

                    setTimeout(() => {
                        this.logger.warn(`Retrying now with ${this.retryCalls.length} calls to process.`);
                        // Finish timeout.
                        this.retryTimeout = 0;
                        this.processRetryQueue();
                    }, this.retryTimeout * 1000);
                } else {
                    this.logger.warn('Calls locked, trying later...');
                }

                return retryPromise;
            } else if (error.status === -2) {
                throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                    debug: {
                        code: 'invalidcertificate',
                        details: Translate.instant('core.certificaterror', {
                            details: CoreErrorHelper.getErrorMessageFromError(error) ?? 'Unknown error',
                        }),
                    },
                });
            } else if (error.status > 0) {
                throw this.createHttpError(error, error.status);
            }

            throw new CoreError(Translate.instant('core.serverconnection', {
                details: CoreErrorHelper.getErrorMessageFromError(error) ?? 'Unknown error',
            }));
        }).catch(err => {
            CoreErrorLogs.addErrorLog({
                method,
                type: String(err),
                message: String(err.exception),
                time: new Date().getTime(),
                data: ajaxData,
            });
            throw err;
        });
    }

    /**
     * Retry all requests in the queue.
     * This function uses recursion in order to add a delay between requests to reduce stress.
     */
    protected processRetryQueue(): void {
        if (this.retryCalls.length > 0 && this.retryTimeout == 0) {
            const call = this.retryCalls[0];
            this.retryCalls.shift();

            // Add a delay between calls.
            setTimeout(() => {
                call.deferred.resolve(this.performPost(call.method, call.siteUrl, call.data, call.preSets));
                this.processRetryQueue();
            }, 200);
        } else {
            this.logger.warn(`Retry queue has stopped with ${this.retryCalls.length} calls and ${this.retryTimeout} timeout secs.`);
        }
    }

    /**
     * Save promise on the cache.
     *
     * @param promise Promise to be saved.
     * @param method Method of the HTTP request.
     * @param url Base URL of the HTTP request.
     * @param params Params of the HTTP request.
     * @returns The promise saved.
     */
    protected setPromiseHttp<T = unknown>(
        promise: Promise<T>,
        method: string,
        url: string,
        params?: Record<string, unknown>,
    ): Promise<T> {
        const queueItemId = this.getQueueItemId(method, url, params);

        this.ongoingCalls[queueItemId] = promise;

        // HTTP not finished, but we should delete the promise after timeout.
        const timeout = setTimeout(() => {
            delete this.ongoingCalls[queueItemId];
        }, this.getRequestTimeout());

        // HTTP finished, delete from ongoing.
        return promise.finally(() => {
            delete this.ongoingCalls[queueItemId];

            clearTimeout(timeout);
        });
    }

    /**
     * A wrapper function for a synchronous Moodle WebService call.
     * Warning: This function should only be used if synchronous is a must. It's recommended to use call.
     *
     * @param method The WebService method to be called.
     * @param data Arguments to pass to the method.
     * @param preSets Extra settings and information.
     * @returns Promise resolved with the response data in success and rejected with the error message if it fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    syncCall<T = unknown>(method: string, data: any, preSets: CoreWSPreSets): T {
        try {
            if (!preSets) {
                throw new CoreError(Translate.instant('core.unexpectederror'));
            } else if (!CoreNetwork.isOnline()) {
                throw new CoreNetworkError();
            }

            preSets.typeExpected = preSets.typeExpected || 'object';
            if (preSets.responseExpected === undefined) {
                preSets.responseExpected = true;
            }

            data = this.convertValuesToString(data || {}, preSets.cleanUnicode);
            if (data == null) {
                // Empty cleaned text found.
                throw new CoreError(Translate.instant('core.unicodenotsupportedcleanerror'));
            }

            data.wsfunction = method;
            data.wstoken = preSets.wsToken;
            const siteUrl = `${preSets.siteUrl}/webservice/rest/server.php?moodlewsrestformat=json`;

            // Serialize data.
            data = CoreInterceptor.serialize(data);

            // Perform sync request using XMLHttpRequest.
            const xhr = new XMLHttpRequest();
            xhr.open('post', siteUrl, false);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');

            xhr.send(data);

            // Get response.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = ('response' in xhr) ? xhr.response : (<any> xhr).responseText;

            // Check status.
            const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
            if (status < 200 || status >= 300) {
                // Request failed.
                throw new CoreError(data);
            }

            // Treat response.
            data = CoreText.parseJSON(data);

            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data is returned, we create a blank object.
            if ((!data || !data.data) && !preSets.responseExpected) {
                data = {};
            }

            if (!data) {
                throw new CoreError(Translate.instant('core.serverconnection', {
                    details: Translate.instant('core.errorinvalidresponse', { method }),
                }));
            } else if (typeof data != preSets.typeExpected) {
                this.logger.warn(`Response of type "${typeof data}" received, expecting "${preSets.typeExpected}"`);
                throw new CoreError(Translate.instant('core.errorinvalidresponse', { method }));
            }

            if (data.exception !== undefined || data.debuginfo !== undefined) {
                throw new CoreWSError(data);
            }

            return data;
        } catch (err) {
            let errorType = '';

            if (err instanceof CoreError) {
                errorType = 'CoreError';
            } else if (err instanceof CoreWSError) {
                errorType = 'CoreWSError';
            }

            CoreErrorLogs.addErrorLog({ method, type: errorType, message: String(err), time: new Date().getTime(), data });
            throw err;
        }
    }

    /*
     * Uploads a file.
     *
     * @param filePath File path.
     * @param options File upload options.
     * @param preSets Must contain siteUrl and wsToken.
     * @param onProgress Function to call on progress.
     * @returns Promise resolved when uploaded.
     */
    async uploadFile(
        filePath: string,
        options: CoreWSFileUploadOptions,
        preSets: CoreWSPreSets,
        onProgress?: (event: ProgressEvent) => void,
    ): Promise<CoreWSUploadFileResult> {
        this.logger.debug(`Trying to upload file: ${filePath}`);

        if (!filePath || !options || !preSets) {
            throw new CoreError('Invalid options passed to upload file.');
        }

        if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        const uploadUrl = `${preSets.siteUrl}/webservice/upload.php`;
        const transfer = new window.FileTransfer();

        if (onProgress) {
            transfer.onprogress = onProgress;
        }

        options.httpMethod = 'POST';
        options.params = {
            token: preSets.wsToken,
            filearea: options.fileArea || 'draft',
            itemid: options.itemId || 0,
        };
        options.chunkedMode = false;
        options.headers = {
            'User-Agent': navigator.userAgent,
        };
        options['Connection'] = 'close';

        let success: FileUploadResult;

        try {
            success = await new Promise((resolve, reject) =>
                transfer.upload( filePath, uploadUrl, (result) => resolve(result), (error) => reject(error), options, true));
        } catch (error) {
            this.logger.error('Error while uploading file', filePath, error);

            throw this.createHttpError(error, error.http_status ?? 0);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = CoreText.parseJSON<any>(
            success.response,
            null,
            error => this.logger.error('Error parsing response from upload', success.response, error),
        );

        if (data === null) {
            throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                debug: {
                    code: 'invalidresponse',
                    details: Translate.instant('core.errorinvalidresponse', { method: 'upload.php' }),
                },
            });
        }

        if (!data) {
            throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                debug: {
                    code: 'serverconnectionupload',
                    details: Translate.instant('core.serverconnection', {
                        details: Translate.instant('core.errorinvalidresponse', { method: 'upload.php' }),
                    }),
                },
            });
        } else if (typeof data !== 'object') {
            this.logger.warn(`Upload file: Response of type "${typeof data}" received, expecting "object"`);

            throw await this.createCannotConnectSiteError(preSets.siteUrl, {
                debug: {
                    code: 'invalidresponse',
                    details: Translate.instant('core.errorinvalidresponse', { method: 'upload.php' }),
                },
            });
        }

        if (data.exception !== undefined) {
            throw new CoreWSError(data);
        } else if (data.error !== undefined) {
            throw new CoreWSError({
                errorcode: data.errortype,
                message: data.error,
            });
        } else if (data[0] && data[0].error !== undefined) {
            throw new CoreWSError({
                errorcode: data[0].errortype,
                message: data[0].error,
            });
        }

        // We uploaded only 1 file, so we only return the first file returned.
        this.logger.debug('Successfully uploaded file', filePath);

        return data[0];
    }

    /**
     * Create a CoreHttpError based on a certain error.
     *
     * @param error Original error.
     * @param status Status code (if any).
     * @returns CoreHttpError.
     */
    protected createHttpError(error: CoreErrorObject, status: number): CoreHttpError {
        const message = CoreErrorHelper.buildSeveralParagraphsMessage([
            CoreSites.isLoggedIn()
                ? Translate.instant('core.siteunavailablehelp', { site: CoreSites.getCurrentSite()?.siteUrl })
                : Translate.instant('core.sitenotfoundhelp'),
            CoreDom.getHTMLBodyContent(CoreErrorHelper.getErrorMessageFromError(error) || ''),
        ]);

        return new CoreHttpError(message, status);
    }

    /**
     * Perform an HTTP request requesting for a text response.
     *
     * @param url Url to get.
     * @returns Resolved with the text when done.
     */
    async getText(url: string): Promise<string> {
        // Fetch the URL content.
        const options: HttpRequestOptions = {
            method: 'get',
            responseType: 'text',
        };

        const response = await this.sendHTTPRequest<string>(url, options);

        const content = response.body;

        if (typeof content !== 'string') {
            throw new Error('Error reading content');
        }

        return content;
    }

    /**
     * Send an HTTP request. In mobile devices it will use the cordova plugin.
     *
     * @param url URL of the request.
     * @param options Options for the request.
     * @returns Promise resolved with the response.
     */
    async sendHTTPRequest<T = unknown>(url: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
        // Set default values.
        options.responseType = options.responseType || 'json';
        options.timeout = options.timeout === undefined ? this.getRequestTimeout() : options.timeout;

        if (CorePlatform.isMobile()) {
            // Use the cordova plugin.
            if (url.indexOf('file://') === 0) {
                // We cannot load local files using the http native plugin. Use file provider instead.
                const content = options.responseType == 'json' ?
                    await CoreFile.readFile<T>(url, CoreFileFormat.FORMATJSON) :
                    await CoreFile.readFile(url, CoreFileFormat.FORMATTEXT);

                return new HttpResponse<T>({
                    body: <T> content,
                    headers: undefined,
                    status: 200,
                    statusText: 'OK',
                    url,
                });
            }

            let response: NativeHttpResponse;
            let redirectUrl: string | undefined;
            let maxRedirects = 5;
            do {
                try {
                    response = await NativeHttp.sendRequest(redirectUrl ?? url, options);
                    redirectUrl = undefined;
                } catch (error) {
                    // Error is a response object.
                    response = error as NativeHttpResponse;

                    // Redirections should have been handled by the platform,
                    // but Android does not follow redirections between HTTP and HTTPS.
                    // See: https://developer.android.com/reference/java/net/HttpURLConnection#response-handling
                    redirectUrl = response.headers['location'];
                    maxRedirects--;
                    if (!redirectUrl || maxRedirects < 0) {
                        throw error;
                    }
                }
            } while (redirectUrl);

            return new CoreNativeToAngularHttpResponse(response);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let observable: Observable<HttpResponse<any>>;
            const angularOptions = <AngularHttpRequestOptions> options;

            // Use Angular's library.
            switch (angularOptions.method) {
                case 'get':
                    observable = Http.get(url, {
                        headers: angularOptions.headers,
                        params: angularOptions.params,
                        observe: 'response',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        responseType: <any> angularOptions.responseType,
                    });
                    break;

                case 'post':
                    if (angularOptions.serializer == 'json') {
                        angularOptions.data = JSON.stringify(angularOptions.data);
                    }

                    observable = Http.post(url, angularOptions.data, {
                        headers: angularOptions.headers,
                        observe: 'response',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        responseType: <any> angularOptions.responseType,
                    });
                    break;

                case 'head':
                    observable = Http.head(url, {
                        headers: angularOptions.headers,
                        observe: 'response',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        responseType: <any> angularOptions.responseType,
                    });
                    break;

                default:
                    throw new CoreError('Method not implemented yet.');
            }

            if (angularOptions.timeout) {
                observable = observable.pipe(timeout(angularOptions.timeout));
            }

            return await firstValueFrom(observable);
        }
    }

    /**
     * Check if a URL works (it returns a 2XX status).
     *
     * @param url URL to check.
     * @returns Promise resolved with boolean: whether it works.
     */
    async urlWorks(url: string): Promise<boolean> {
        try {
            const result = await this.performHead(url);

            return result.status >= 200 && result.status < 300;
        } catch {
            return false;
        }
    }

    /**
     * Create an error to be thrown when it isn't possible to connect to a site.
     *
     * @param siteUrl Site url.
     * @param options Error options.
     * @returns Cannot connect error.
     */
    protected async createCannotConnectSiteError(
        siteUrl: string,
        options?: Partial<CoreSiteErrorOptions>,
    ): Promise<CoreSiteError> {
        return new CoreSiteError({
            ...options,
            supportConfig: await CoreUserGuestSupportConfig.forSite(siteUrl),
            message: CoreSites.isLoggedIn()
                ? Translate.instant('core.siteunavailablehelp', { site: CoreSites.getCurrentSite()?.siteUrl })
                : Translate.instant('core.sitenotfoundhelp'),
        });
    }

}

export const CoreWS = makeSingleton(CoreWSProvider);

/**
 * File upload options.
 */
export interface CoreWSFileUploadOptions extends FileUploadOptions {
    /**
     * The file area where to put the file. By default, 'draft'.
     */
    fileArea?: string;

    /**
     * Item ID of the area where to put the file. By default, 0.
     */
    itemId?: number;
}

/**
 * Structure of warnings returned by WS.
 */
export type CoreWSExternalWarning = {
    /**
     * Item.
     */
    item?: string;

    /**
     * Item id.
     */
    itemid?: number;

    /**
     * The warning code can be used by the client app to implement specific behaviour.
     */
    warningcode: string;

    /**
     * Untranslated english message to explain the warning.
     */
    message: string;

};

/**
 * Special response structure of many webservices that contains success status and warnings.
 */
export type CoreStatusWithWarningsWSResponse = {
    status: boolean; // Status: true if success.
    offline?: boolean; // True if information has been stored in offline for future use.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Special response structure of many webservices that contains only warnings.
 */
export type CoreWarningsWSResponse = {
    warnings?: CoreWSExternalWarning[];
};

/**
 * Structure of files returned by WS.
 */
export type CoreWSExternalFile = {
    filename?: string; // File name.
    filepath?: string; // File path.
    filesize?: number; // File size.
    fileurl: string; // Downloadable file url.
    timemodified?: number; // Time modified.
    mimetype?: string; // File mime type.
    isexternalfile?: boolean; // Whether is an external file.
    repositorytype?: string; // The repository type for the external files.
    icon?: string; // @since 4.4. Relative path to the relevant file type icon based on the file's mime type.
};

/**
 * Structure of files returned by stored_file_exporter.
 */
export type CoreWSStoredFile = {
    contextid: number; // Contextid.
    component: string; // Component.
    filearea: string; // Filearea.
    itemid: number; // Itemid.
    filepath: string; // Filepath.
    filename: string; // Filename.
    isdir: boolean; // Isdir.
    isimage: boolean; // Isimage.
    timemodified: number; // Timemodified.
    timecreated: number; // Timecreated.
    filesize: number; // Filesize.
    author: string; // Author.
    license: string; // License.
    filenameshort: string; // Filenameshort.
    filesizeformatted: string; // Filesizeformatted.
    icon: string; // Icon.
    timecreatedformatted: string; // Timecreatedformatted.
    timemodifiedformatted: string; // Timemodifiedformatted.
    url: string; // Url.
    urls: {
        export?: string; // The URL used to export the attachment.
    };
    html: {
        plagiarism?: string; // The HTML source for the Plagiarism Response.
    };
    mimetype: undefined; // File mimetype. @todo Not implemented yet in Moodle, see MDL-71354.
};

/**
 * Common file structures returned by WS.
 */
export type CoreWSFile = CoreWSExternalFile | CoreWSStoredFile;

/**
 * Data returned by date_exporter.
 */
export type CoreWSDate = {
    seconds: number; // Seconds.
    minutes: number; // Minutes.
    hours: number; // Hours.
    mday: number; // Mday.
    wday: number; // Wday.
    mon: number; // Mon.
    year: number; // Year.
    yday: number; // Yday.
    weekday: string; // Weekday.
    month: string; // Month.
    timestamp: number; // Timestamp.
};

/**
 * PreSets accepted by the WS call.
 */
export type CoreWSPreSets = {
    /**
     * The site URL.
     */
    siteUrl: string;

    /**
     * The Webservice token.
     */
    wsToken: string;

    /**
     * Defaults to true. Set to false when the expected response is null.
     */
    responseExpected?: boolean;

    /**
     * Defaults to 'object'. Use it when you expect a type that's not an object|array.
     */
    typeExpected?: CoreWSTypeExpected;

    /**
     * Defaults to false. Clean multibyte Unicode chars from data.
     */
    cleanUnicode?: boolean;

    /**
     * Whether to split a request if it has too many parameters. Sending too many parameters to the site
     * can cause the request to fail (see PHP's max_input_vars).
     */
    splitRequest?: CoreWSPreSetsSplitRequest;
};

export type CoreWSTypeExpected = 'boolean'|'number'|'string'|'jsonstring'|'object';

/**
 * Options to split a request.
 */
export type CoreWSPreSetsSplitRequest = {
    /**
     * Name of the parameter used to split the request if too big. Must be an array parameter.
     */
    param: string;

    /**
     * Max number of entries sent per request.
     */
    maxLength: number;

    /**
     * Callback to combine the results. If not supplied, arrays in the result will be concatenated.
     */
    combineCallback?: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown;
};

/**
 * PreSets accepted by AJAX WS calls.
 */
export type CoreWSAjaxPreSets = {
    /**
     * The site URL.
     */
    siteUrl: string;

    /**
     * Defaults to true. Set to false when the expected response is null.
     */
    responseExpected?: boolean;

    /**
     * Whether to use the no-login endpoint instead of the normal one. Use it for requests that don't require authentication.
     */
    noLogin?: boolean;

    /**
     * Whether to send the parameters via GET. Only if noLogin is true.
     */
    useGet?: boolean;
};

/**
 * Options for HTTP requests.
 */
export type HttpRequestOptions = {
    /**
     * The HTTP method.
     */
    method: 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options' | 'upload' | 'download';

    /**
     * Payload to send to the server. Only applicable on post, put or patch methods.
     */
    data?: Record<string, unknown>;

    /**
     * Query params to be appended to the URL (only applicable on get, head, delete, upload or download methods).
     */
    params?: Record<string, string | number>;

    /**
     * Response type. Defaults to json.
     */
    responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';

    /**
     * Timeout for the request in seconds. If undefined, the default value will be used. If null, no timeout.
     */
    timeout?: number;

    /**
     * Serializer to use. Defaults to 'urlencoded'. Only for mobile environments.
     */
    serializer?: 'json' | 'urlencoded' | 'utf8' | 'multipart';

    /**
     * Whether to follow redirects. Defaults to true. Only for mobile environments.
     */
    followRedirect?: boolean;

    /**
     * Headers. Only for mobile environments.
     */
    headers?: Record<string, string>;

    /**
     * File paths to use for upload or download. Only for mobile environments.
     */
    filePath?: string | string[];

    /**
     * Name to use during upload. Only for mobile environments.
     */
    name?: string | string[];
};

/**
 * Options for JSON HTTP requests using Angular Http.
 */
type AngularHttpRequestOptions = Omit<HttpRequestOptions, 'data'|'params'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any> | string;
    params?: HttpParams | {
        [param: string]: string | string[];
    };
};

/**
 * Data needed to retry a WS call.
 */
type RetryCall = {
    method: string;
    siteUrl: string;
    data: Record<string, unknown>;
    preSets: CoreWSPreSets;
    deferred: CorePromisedValue;
};

/**
 * Downloaded file entry. It includes some calculated data.
 */
export type CoreWSDownloadedFileEntry = FileEntry & {
    extension: string; // File extension.
    path: string; // File path.
};

export type CoreWSUploadFileResult = {
    component: string; // Component the file was uploaded to.
    context: string; // Context the file was uploaded to.
    userid: number; // User that uploaded the file.
    filearea: string; // File area the file was uploaded to.
    filename: string; // File name.
    filepath: string; // File path.
    itemid: number; // Item ID the file was uploaded to.
    license: string; // File license.
    author: string; // Author name.
    source: string; // File source.
};
