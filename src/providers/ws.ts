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

import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { FileTransfer, FileUploadOptions } from '@ionic-native/file-transfer';
import { CoreAppProvider } from './app';
import { CoreFileProvider } from './file';
import { CoreLoggerProvider } from './logger';
import { CoreMimetypeUtilsProvider } from './utils/mimetype';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreConstants } from '@core/constants';
import { Md5 } from 'ts-md5/dist/md5';
import { CoreInterceptor } from '@classes/interceptor';

/**
 * PreSets accepted by the WS call.
 */
export interface CoreWSPreSets {
    /**
     * The site URL.
     * @type {string}
     */
    siteUrl: string;

    /**
     * The Webservice token.
     * @type {string}
     */
    wsToken: string;

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

    /**
     * Defaults to false. Clean multibyte Unicode chars from data.
     * @type {string}
     */
    cleanUnicode?: boolean;
}

/**
 * PreSets accepted by AJAX WS calls.
 */
export interface CoreWSAjaxPreSets {
    /**
     * The site URL.
     * @type {string}
     */
    siteUrl: string;

    /**
     * Defaults to true. Set to false when the expected response is null.
     * @type {boolean}
     */
    responseExpected?: boolean;
}

/**
 * Error returned by a WS call.
 */
export interface CoreWSError {
    /**
     * The error message.
     * @type {string}
     */
    message: string;

    /**
     * Name of the exception. Undefined for local errors (fake WS errors).
     * @type {string}
     */
    exception?: string;

    /**
     * The error code. Undefined for local errors (fake WS errors).
     * @type {string}
     */
    errorcode?: string;
}

/**
 * File upload options.
 */
export interface CoreWSFileUploadOptions extends FileUploadOptions {
    /**
     * The file area where to put the file. By default, 'draft'.
     * @type {string}
     */
    fileArea?: string;

    /**
     * Item ID of the area where to put the file. By default, 0.
     * @type {number}
     */
    itemId?: number;
}

/**
 * This service allows performing WS calls and download/upload files.
 */
@Injectable()
export class CoreWSProvider {
    protected logger;
    protected mimeTypeCache = {}; // A "cache" to store file mimetypes to prevent performing too many HEAD requests.
    protected ongoingCalls = {};
    protected retryCalls = [];
    protected retryTimeout = 0;

    constructor(private http: HttpClient, private translate: TranslateService, private appProvider: CoreAppProvider,
            private textUtils: CoreTextUtilsProvider, logger: CoreLoggerProvider,
            private fileProvider: CoreFileProvider, private fileTransfer: FileTransfer, private commonHttp: Http,
            private mimeUtils: CoreMimetypeUtilsProvider) {
        this.logger = logger.getInstance('CoreWSProvider');
    }

    /**
     * Adds the call data to an special queue to be processed when retrying.
     *
     * @param {string} method The WebService method to be called.
     * @param {string} siteUrl Complete site url to perform the call.
     * @param {any} ajaxData Arguments to pass to the method.
     * @param {CoreWSPreSets} preSets Extra settings and information.
     * @return {Promise<any>} Deferred promise resolved with the response data in success and rejected with the error message
     *                        if it fails.
     */
    protected addToRetryQueue(method: string, siteUrl: string, ajaxData: any, preSets: CoreWSPreSets): Promise<any> {
        const call: any = {
            method: method,
            siteUrl: siteUrl,
            ajaxData: ajaxData,
            preSets: preSets,
            deferred: {}
        };

        call.deferred.promise = new Promise((resolve, reject): void => {
            call.deferred.resolve = resolve;
            call.deferred.reject = reject;
        });

        this.retryCalls.push(call);

        return call.deferred.promise;
    }

    /**
     * A wrapper function for a moodle WebService call.
     *
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method. It's recommended to call convertValuesToString before passing the data.
     * @param {CoreWSPreSets} preSets Extra settings and information.
     * @return {Promise<any>} Promise resolved with the response data in success and rejected if it fails.
     */
    call(method: string, data: any, preSets: CoreWSPreSets): Promise<any> {

        let siteUrl;

        if (!preSets) {
            return Promise.reject(this.createFakeWSError('core.unexpectederror', true));
        } else if (!this.appProvider.isOnline()) {
            return Promise.reject(this.createFakeWSError('core.networkerrormsg', true));
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        data = Object.assign({}, data); // Create a new object so the changes don't affect the original data.
        data.wsfunction = method;
        data.wstoken = preSets.wsToken;
        siteUrl = preSets.siteUrl + '/webservice/rest/server.php?moodlewsrestformat=json';

        // There are some ongoing retry calls, wait for timeout.
        if (this.retryCalls.length > 0) {
            this.logger.warn('Calls locked, trying later...');

            return this.addToRetryQueue(method, siteUrl, data, preSets);
        } else {
            return this.performPost(method, siteUrl, data, preSets);
        }
    }

    /**
     * Call a Moodle WS using the AJAX API. Please use it if the WS layer is not an option.
     *
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method.
     * @param {CoreWSAjaxPreSets} preSets Extra settings and information. Only some
     * @return {Promise<any>} Promise resolved with the response data in success and rejected with an object containing:
     *                                 - error: Error message.
     *                                 - errorcode: Error code returned by the site (if any).
     *                                 - available: 0 if unknown, 1 if available, -1 if not available.
     */
    callAjax(method: string, data: any, preSets: CoreWSAjaxPreSets): Promise<any> {
        let siteUrl,
            ajaxData;

        if (typeof preSets.siteUrl == 'undefined') {
            return rejectWithError(this.createFakeWSError('core.unexpectederror', true));
        } else if (!this.appProvider.isOnline()) {
            return rejectWithError(this.createFakeWSError('core.networkerrormsg', true));
        }

        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        ajaxData = [{
            index: 0,
            methodname: method,
            args: this.convertValuesToString(data)
        }];

        // The info= parameter has no function. It is just to help with debugging.
        // We call it info to match the parameter name use by Moodle's AMD ajax module.
        siteUrl = preSets.siteUrl + '/lib/ajax/service.php?info=' + method;

        const promise = this.http.post(siteUrl, JSON.stringify(ajaxData)).timeout(CoreConstants.WS_TIMEOUT).toPromise();

        return promise.then((data: any) => {
            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data is returned, we create a blank object.
            if (!data && !preSets.responseExpected) {
                data = [{}];
            }

            // Check if error. Ajax layer should always return an object (if error) or an array (if success).
            if (!data || typeof data != 'object') {
                return rejectWithError(this.createFakeWSError('core.serverconnection', true));
            } else if (data.error) {
                return rejectWithError(data);
            }

            // Get the first response since only one request was done.
            data = data[0];

            if (data.error) {
                return rejectWithError(data.exception);
            }

            return data.data;
        }, (data) => {
            const available = data.status == 404 ? -1 : 0;

            return rejectWithError(this.createFakeWSError('core.serverconnection', true), available);
        });

        // Convenience function to return an error.
        function rejectWithError(exception: any, available?: number): Promise<never> {
            if (typeof available == 'undefined') {
                if (exception.errorcode) {
                    available = exception.errorcode == 'invalidrecord' ? -1 : 1;
                } else {
                    available = 0;
                }
            }

            exception.available = available;

            return Promise.reject(exception);
        }
    }

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained, null values will be removed.
     *
     * @param {object} data The data that needs all the non-object values set to strings.
     * @param {boolean} [stripUnicode] If Unicode long chars need to be stripped.
     * @return {object} The cleaned object or null if some strings becomes empty after stripping Unicode.
     */
    convertValuesToString(data: any, stripUnicode?: boolean): any {
        const result: any = Array.isArray(data) ? [] : {};

        for (const key in data) {
            let value = data[key];

            if (value == null) {
                // Skip null or undefined value.
                continue;
            } else if (typeof value == 'object') {
                // Object or array.
                value = this.convertValuesToString(value, stripUnicode);
                if (value == null) {
                    return null;
                }
            } else if (typeof value == 'string') {
                if (stripUnicode) {
                    const stripped = this.textUtils.stripUnicode(value);
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
     * Create a "fake" WS error for local errors.
     *
     * @param {string} message The message to include in the error.
     * @param {boolean} [needsTranslate] If the message needs to be translated.
     * @return {CoreWSError} Fake WS error.
     */
    createFakeWSError(message: string, needsTranslate?: boolean): CoreWSError {
        if (needsTranslate) {
            message = this.translate.instant(message);
        }

        return {
            message: message
        };
    }

    /**
     * Downloads a file from Moodle using Cordova File API.
     *
     * @param {string} url Download url.
     * @param {string} path Local path to store the file.
     * @param {boolean} [addExtension] True if extension need to be added to the final path.
     * @param {Function} [onProgress] Function to call on progress.
     * @return {Promise<any>} Promise resolved with the downloaded file.
     */
    downloadFile(url: string, path: string, addExtension?: boolean, onProgress?: (event: ProgressEvent) => any): Promise<any> {
        this.logger.debug('Downloading file', url, path, addExtension);

        if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        }

        // Use a tmp path to download the file and then move it to final location.
        // This is because if the download fails, the local file is deleted.
        const tmpPath = path + '.tmp';

        // Create the tmp file as an empty file.
        return this.fileProvider.createFile(tmpPath).then((fileEntry) => {
            const transfer = this.fileTransfer.create();
            transfer.onProgress(onProgress);

            return transfer.download(url, fileEntry.toURL(), true).then(() => {
                let promise;

                if (addExtension) {
                    const ext = this.mimeUtils.getFileExtension(path);

                    // Google Drive extensions will be considered invalid since Moodle usually converts them.
                    if (!ext || ext == 'gdoc' || ext == 'gsheet' || ext == 'gslides' || ext == 'gdraw' || ext == 'php') {
                        // Not valid, get the file's mimetype.
                        promise = this.getRemoteFileMimeType(url).then((mime) => {
                            if (mime) {
                                const remoteExt = this.mimeUtils.getExtension(mime, url);
                                // If the file is from Google Drive, ignore mimetype application/json.
                                if (remoteExt && (!ext || mime != 'application/json')) {
                                    if (ext) {
                                        // Remove existing extension since we will use another one.
                                        path = this.mimeUtils.removeExtension(path);
                                    }
                                    path += '.' + remoteExt;

                                    return remoteExt;
                                }
                            }

                            return ext;
                        });
                    } else {
                        promise = Promise.resolve(ext);
                    }
                } else {
                    promise = Promise.resolve('');
                }

                return promise.then((extension) => {
                    return this.fileProvider.moveFile(tmpPath, path).then((movedEntry) => {
                        // Save the extension.
                        movedEntry.extension = extension;
                        movedEntry.path = path;
                        this.logger.debug(`Success downloading file ${url} to ${path} with extension ${extension}`);

                        return movedEntry;
                    });
                });
            });
        }).catch((err) => {
            this.logger.error(`Error downloading ${url} to ${path}`, err);

            return Promise.reject(err);
        });
    }

    /**
     * Get a promise from the cache.
     *
     * @param {string} method Method of the HTTP request.
     * @param {string} url Base URL of the HTTP request.
     * @param {any} [params] Params of the HTTP request.
     */
    protected getPromiseHttp(method: string, url: string, params?: any): any {
        const queueItemId = this.getQueueItemId(method, url, params);
        if (typeof this.ongoingCalls[queueItemId] != 'undefined') {
            return this.ongoingCalls[queueItemId];
        }

        return false;
    }

    /**
     * Perform a HEAD request to get the mimetype of a remote file.
     *
     * @param {string} url File URL.
     * @param {boolean} [ignoreCache] True to ignore cache, false otherwise.
     * @return {Promise<string>} Promise resolved with the mimetype or '' if failure.
     */
    getRemoteFileMimeType(url: string, ignoreCache?: boolean): Promise<string> {
        if (this.mimeTypeCache[url] && !ignoreCache) {
            return Promise.resolve(this.mimeTypeCache[url]);
        }

        return this.performHead(url).then((data) => {
            let mimeType = data.headers.get('Content-Type');
            if (mimeType) {
                // Remove "parameters" like charset.
                mimeType = mimeType.split(';')[0];
            }
            this.mimeTypeCache[url] = mimeType;

            return mimeType || '';
        }).catch(() => {
            // Error, resolve with empty mimetype.
            return '';
        });
    }

    /**
     * Perform a HEAD request to get the size of a remote file.
     *
     * @param {string} url File URL.
     * @return {Promise<number>} Promise resolved with the size or -1 if failure.
     */
    getRemoteFileSize(url: string): Promise<number> {
        return this.performHead(url).then((data) => {
            const size = parseInt(data.headers.get('Content-Length'), 10);

            if (size) {
                return size;
            }

            return -1;
        }).catch(() => {
            // Error, return -1.
            return -1;
        });
    }

    /**
     * Get the unique queue item id of the cache for a HTTP request.
     *
     * @param {string} method Method of the HTTP request.
     * @param {string} url Base URL of the HTTP request.
     * @param {object} [params] Params of the HTTP request.
     * @return {string} Queue item ID.
     */
    protected getQueueItemId(method: string, url: string, params?: any): string {
        if (params) {
            url += '###' + CoreInterceptor.serialize(params);
        }

        return method + '#' + Md5.hashAsciiStr(url);
    }

    /**
     * Perform a HEAD request and save the promise while waiting to be resolved.
     *
     * @param {string} url URL to perform the request.
     * @return {Promise<any>} Promise resolved with the response.
     */
    performHead(url: string): Promise<any> {
        let promise = this.getPromiseHttp('head', url);

        if (!promise) {
            promise = this.commonHttp.head(url).timeout(CoreConstants.WS_TIMEOUT).toPromise();
            promise = this.setPromiseHttp(promise, 'head', url);
        }

        return promise;
    }

    /**
     * Perform the post call and save the promise while waiting to be resolved.
     *
     * @param {string} method The WebService method to be called.
     * @param {string} siteUrl Complete site url to perform the call.
     * @param {any} ajaxData Arguments to pass to the method.
     * @param {CoreWSPreSets} preSets Extra settings and information.
     * @return {Promise<any>} Promise resolved with the response data in success and rejected with CoreWSError if it fails.
     */
    performPost(method: string, siteUrl: string, ajaxData: any, preSets: CoreWSPreSets): Promise<any> {
        const options = {};

        // This is done because some returned values like 0 are treated as null if responseType is json.
        if (preSets.typeExpected == 'number' || preSets.typeExpected == 'boolean' || preSets.typeExpected == 'string') {
            // Avalaible values are: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
            options['responseType'] = 'text';
        }

        // We add the method name to the URL purely to help with debugging.
        // This duplicates what is in the ajaxData, but that does no harm.
        // POST variables take precedence over GET.
        const requestUrl = siteUrl + '&wsfunction=' + method;

        // Perform the post request.
        const promise = this.http.post(requestUrl, ajaxData, options).timeout(CoreConstants.WS_TIMEOUT).toPromise();

        return promise.then((data: any) => {
            // Some moodle web services return null.
            // If the responseExpected value is set to false, we create a blank object if the response is null.
            if (!data && !preSets.responseExpected) {
                data = {};
            }

            if (!data) {
                return Promise.reject(this.createFakeWSError('core.serverconnection', true));
            } else if (typeof data != preSets.typeExpected) {
                // If responseType is text an string will be returned, parse before returning.
                if (typeof data == 'string') {
                    if (preSets.typeExpected == 'number') {
                        data = Number(data);
                        if (isNaN(data)) {
                            this.logger.warn(`Response expected type "${preSets.typeExpected}" cannot be parsed to number`);

                            return Promise.reject(this.createFakeWSError('core.errorinvalidresponse', true));
                        }
                    } else if (preSets.typeExpected == 'boolean') {
                        if (data === 'true') {
                            data = true;
                        } else if (data === 'false') {
                            data = false;
                        } else {
                            this.logger.warn(`Response expected type "${preSets.typeExpected}" is not true or false`);

                            return Promise.reject(this.createFakeWSError('core.errorinvalidresponse', true));
                        }
                    } else {
                        this.logger.warn('Response of type "' + typeof data + `" received, expecting "${preSets.typeExpected}"`);

                        return Promise.reject(this.createFakeWSError('core.errorinvalidresponse', true));
                    }
                } else {
                    this.logger.warn('Response of type "' + typeof data + `" received, expecting "${preSets.typeExpected}"`);

                    return Promise.reject(this.createFakeWSError('core.errorinvalidresponse', true));
                }
            }

            if (typeof data.exception !== 'undefined') {
                // Special debugging for site plugins, otherwise it's hard to debug errors if the data is cached.
                if (method == 'tool_mobile_get_content') {
                    this.logger.error('Error calling WS', method, data);
                }

                return Promise.reject(data);
            }

            if (typeof data.debuginfo != 'undefined') {
                return Promise.reject(this.createFakeWSError('Error. ' + data.message));
            }

            return data;
        }, (error) => {
            // If server has heavy load, retry after some seconds.
            if (error.status == 429) {
                const retryPromise = this.addToRetryQueue(method, siteUrl, ajaxData, preSets);

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
            }

            return Promise.reject(this.createFakeWSError('core.serverconnection', true));
        });
    }

    /**
     * Retry all requests in the queue.
     * This function uses recursion in order to add a delay between requests to reduce stress.
     */
    protected processRetryQueue(): void {
        if (this.retryCalls.length > 0 && this.retryTimeout == 0) {
            const call = this.retryCalls.shift();
            // Add a delay between calls.
            setTimeout(() => {
                call.deferred.resolve(this.performPost(call.method, call.siteUrl, call.ajaxData, call.preSets));
                this.processRetryQueue();
            }, 200);
        } else {
            this.logger.warn(`Retry queue has stopped with ${this.retryCalls.length} calls and ${this.retryTimeout} timeout secs.`);
        }
    }

    /**
     * Save promise on the cache.
     *
     * @param {Promise<any>} promise Promise to be saved.
     * @param {string} method Method of the HTTP request.
     * @param {string} url Base URL of the HTTP request.
     * @param {any} [params] Params of the HTTP request.
     * @return {Promise<any>} The promise saved.
     */
    protected setPromiseHttp(promise: Promise<any>, method: string, url: string, params?: any): Promise<any> {
        const queueItemId = this.getQueueItemId(method, url, params);
        let timeout;

        this.ongoingCalls[queueItemId] = promise;

        // HTTP not finished, but we should delete the promise after timeout.
        timeout = setTimeout(() => {
            delete this.ongoingCalls[queueItemId];
        }, CoreConstants.WS_TIMEOUT);

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
     * @param {string} method The WebService method to be called.
     * @param {any} data Arguments to pass to the method.
     * @param {CoreWSPreSets} preSets Extra settings and information.
     * @return {Promise} Promise resolved with the response data in success and rejected with the error message if it fails.
     * @return {any} Request response. If the request fails, returns an object with 'error'=true and 'message' properties.
     */
    syncCall(method: string, data: any, preSets: CoreWSPreSets): any {
        const errorResponse = {
                error: true,
                message: ''
            };
        let siteUrl,
            xhr;

        if (!preSets) {
            errorResponse.message = this.translate.instant('core.unexpectederror');

            return errorResponse;
        } else if (!this.appProvider.isOnline()) {
            errorResponse.message = this.translate.instant('core.networkerrormsg');

            return errorResponse;
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        data = this.convertValuesToString(data || {}, preSets.cleanUnicode);
        if (data == null) {
            // Empty cleaned text found.
            errorResponse.message = this.translate.instant('core.unicodenotsupportedcleanerror');

            return errorResponse;
        }

        data.wsfunction = method;
        data.wstoken = preSets.wsToken;
        siteUrl = preSets.siteUrl + '/webservice/rest/server.php?moodlewsrestformat=json';

        // Serialize data.
        data = CoreInterceptor.serialize(data);

        // Perform sync request using XMLHttpRequest.
        xhr = new (<any> window).XMLHttpRequest();
        xhr.open('post', siteUrl, false);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');

        xhr.send(data);

        // Get response.
        data = ('response' in xhr) ? xhr.response : xhr.responseText;

        // Check status.
        const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
        if (status < 200 || status >= 300) {
            // Request failed.
            errorResponse.message = data;

            return errorResponse;
        }

        // Treat response.
        data = this.textUtils.parseJSON(data);

        // Some moodle web services return null.
        // If the responseExpected value is set then so long as no data is returned, we create a blank object.
        if ((!data || !data.data) && !preSets.responseExpected) {
            data = {};
        }

        if (!data) {
            errorResponse.message = this.translate.instant('core.serverconnection');
        } else if (typeof data != preSets.typeExpected) {
            this.logger.warn('Response of type "' + typeof data + '" received, expecting "' + preSets.typeExpected + '"');
            errorResponse.message = this.translate.instant('core.errorinvalidresponse');
        }

        if (typeof data.exception != 'undefined' || typeof data.debuginfo != 'undefined') {
            errorResponse.message = data.message;
        }

        if (errorResponse.message !== '') {
            return errorResponse;
        }

        return data;
    }

    /*
     * Uploads a file.
     *
     * @param {string} filePath File path.
     * @param {CoreWSFileUploadOptions} options File upload options.
     * @param {CoreWSPreSets} preSets Must contain siteUrl and wsToken.
     * @param {Function} [onProgress] Function to call on progress.
     * @return {Promise<any>} Promise resolved when uploaded.
     */
    uploadFile(filePath: string, options: CoreWSFileUploadOptions, preSets: CoreWSPreSets,
            onProgress?: (event: ProgressEvent) => any): Promise<any> {
        this.logger.debug(`Trying to upload file: ${filePath}`);

        if (!filePath || !options || !preSets) {
            return Promise.reject(null);
        }

        if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        }

        const uploadUrl = preSets.siteUrl + '/webservice/upload.php',
            transfer = this.fileTransfer.create();

        transfer.onProgress(onProgress);

        options.httpMethod = 'POST';
        options.params = {
            token: preSets.wsToken,
            filearea: options.fileArea || 'draft',
            itemid: options.itemId || 0
        };
        options.chunkedMode = false;
        options.headers = {
            Connection: 'close'
        };

        return transfer.upload(filePath, uploadUrl, options, true).then((success) => {
            const data = this.textUtils.parseJSON(success.response, null,
                    this.logger.error.bind(this.logger, 'Error parsing response from upload'));
            if (data === null) {
                return Promise.reject(this.translate.instant('core.errorinvalidresponse'));
            }

            if (!data) {
                return Promise.reject(this.translate.instant('core.serverconnection'));
            } else if (typeof data != 'object') {
                this.logger.warn('Upload file: Response of type "' + typeof data + '" received, expecting "object"');

                return Promise.reject(this.translate.instant('core.errorinvalidresponse'));
            }

            if (typeof data.exception !== 'undefined') {
                return Promise.reject(data.message);
            } else if (data && typeof data.error !== 'undefined') {
                return Promise.reject(data.error);
            } else if (data[0] && typeof data[0].error !== 'undefined') {
                return Promise.reject(data[0].error);
            }

            // We uploaded only 1 file, so we only return the first file returned.
            this.logger.debug('Successfully uploaded file', filePath);

            return data[0];
        }).catch((error) => {
            this.logger.error('Error while uploading file', filePath, error);

            return Promise.reject(this.translate.instant('core.errorinvalidresponse'));
        });
    }
}
