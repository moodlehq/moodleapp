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
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { FileTransfer, FileUploadOptions } from '@ionic-native/file-transfer';
import { CoreAppProvider } from './app';
import { CoreFileProvider } from './file';
import { CoreLoggerProvider } from './logger';
import { CoreMimetypeUtilsProvider } from './utils/mimetype';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUtilsProvider } from './utils/utils';
import { CoreConstants } from '../core/constants';
import { Md5 } from 'ts-md5/dist/md5';
import { CoreInterceptor } from '../classes/interceptor';

/**
 * Interface of the presets accepted by the WS call.
 */
export interface CoreWSPreSets {
    siteUrl: string; // The site URL.
    wsToken: string; // The Webservice token.
    responseExpected?: boolean; // Defaults to true. Set to false when the expected response is null.
    typeExpected?: string; // Defaults to 'object'. Use it when you expect a type that's not an object|array.
    cleanUnicode?: boolean; // Defaults to false. Clean multibyte Unicode chars from data.
};

/**
 * Interface of the presets accepted by AJAX WS calls.
 */
export interface CoreWSAjaxPreSets {
    siteUrl: string; // The site URL.
    responseExpected?: boolean; // Defaults to true. Set to false when the expected response is null.
};

/**
 * Interface for WS Errors.
 */
export interface CoreWSError {
    message: string; // The error message.
    exception?: string; // Name of the exception. Undefined for local errors (fake WS errors).
    errorcode?: string; // The error code. Undefined for local errors (fake WS errors).
};

/**
 * Interface for file upload options.
 */
export interface CoreWSFileUploadOptions extends FileUploadOptions {
    fileArea?: string; // The file area where to put the file. By default, 'draft'.
    itemId?: number; // Item ID of the area where to put the file. By default, 0.
};

/**
 * This service allows performing WS calls and download/upload files.
 */
@Injectable()
export class CoreWSProvider {
    logger;
    mimeTypeCache = {}; // A "cache" to store file mimetypes to prevent performing too many HEAD requests.
    ongoingCalls = {};
    retryCalls = [];
    retryTimeout = 0;

    constructor(private http: HttpClient, private translate: TranslateService, private appProvider: CoreAppProvider,
            private textUtils: CoreTextUtilsProvider, logger: CoreLoggerProvider, private utils: CoreUtilsProvider,
            private fileProvider: CoreFileProvider, private fileTransfer: FileTransfer, private mimeUtils: CoreMimetypeUtilsProvider) {
        this.logger = logger.getInstance('CoreWSProvider');
    }

    /**
     * Adds the call data to an special queue to be processed when retrying.
     *
     * @param {string} method The WebService method to be called.
     * @param {string} siteUrl Complete site url to perform the call.
     * @param {any} ajaxData Arguments to pass to the method.
     * @param {CoreWSPreSets} preSets Extra settings and information.
     * @return {Promise<any>} Deferred promise resolved with the response data in success and rejected with the error message if it fails.
     */
    protected addToRetryQueue(method: string, siteUrl: string, ajaxData: any, preSets: CoreWSPreSets) : Promise<any> {
        let call = {
            method: method,
            siteUrl: siteUrl,
            ajaxData: ajaxData,
            preSets: preSets,
            deferred: this.utils.promiseDefer(),
        };

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
    call(method: string, data: any, preSets: CoreWSPreSets) : Promise<any> {

        let siteUrl;

        if (!preSets) {
            return Promise.reject(this.createFakeWSError('mm.core.unexpectederror', true));
        } else if (!this.appProvider.isOnline()) {
            return Promise.reject(this.createFakeWSError('mm.core.networkerrormsg', true));
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        data.wsfunction = method;
        data.wstoken = preSets.wsToken;
        siteUrl = preSets.siteUrl + '/webservice/rest/server.php?moodlewsrestformat=json';

        let promise = this.getPromiseHttp('post', preSets.siteUrl, data);

        if (!promise) {
            // There are some ongoing retry calls, wait for timeout.
            if (this.retryCalls.length > 0) {
                this.logger.warn('Calls locked, trying later...');
                promise = this.addToRetryQueue(method, siteUrl, data, preSets);
            } else {
                promise = this.performPost(method, siteUrl, data, preSets);
            }
        }

        return promise;
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
    callAjax(method: string, data: any, preSets: CoreWSAjaxPreSets) : Promise<any> {
        let siteUrl,
            ajaxData;

        if (typeof preSets.siteUrl == 'undefined') {
            return rejectWithError(this.translate.instant('mm.core.unexpectederror'));
        } else if (!this.appProvider.isOnline()) {
            return rejectWithError(this.translate.instant('mm.core.networkerrormsg'));
        }

        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        ajaxData = [{
            index: 0,
            methodname: method,
            args: this.convertValuesToString(data)
        }];

        siteUrl = preSets.siteUrl + '/lib/ajax/service.php';

        let observable = this.http.post(siteUrl, JSON.stringify(ajaxData)).timeout(CoreConstants.wsTimeout);
        return this.utils.observableToPromise(observable).then((data: any) => {
            // Some moodle web services return null. If the responseExpected value is set then so long as no data
            // is returned, we create a blank object.
            if (!data && !preSets.responseExpected) {
                data = [{}];
            }

            // Check if error. Ajax layer should always return an object (if error) or an array (if success).
            if (!data || typeof data != 'object') {
                return rejectWithError(this.translate.instant('mm.core.serverconnection'));
            } else if (data.error) {
                return rejectWithError(data.error, data.errorcode);
            }

            // Get the first response since only one request was done.
            data = data[0];

            if (data.error) {
                return rejectWithError(data.exception.message, data.exception.errorcode);
            }

            return data.data;
        }, (data) => {
            let available = data.status == 404 ? -1 : 0;
            return rejectWithError(this.translate.instant('mm.core.serverconnection'), '', available);
        });

        // Convenience function to return an error.
        function rejectWithError(message: string, code?: string, available?: number) {
            if (typeof available == 'undefined') {
                if (code) {
                    available = code == 'invalidrecord' ? -1 : 1;
                } else {
                    available = 0;
                }
            }

            return Promise.reject({
                error: message,
                errorcode: code,
                available: available
            });
        }
    }

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained.
     *
     * @param {object} data The data that needs all the non-object values set to strings.
     * @param {boolean} [stripUnicode] If Unicode long chars need to be stripped.
     * @return {object} The cleaned object, with multilevel array and objects preserved.
     */
    convertValuesToString(data: object, stripUnicode?: boolean) : object {
        let result;
        if (!Array.isArray(data) && typeof data == 'object') {
            result = {};
        } else {
            result = [];
        }

        for (let el in data) {
            if (typeof data[el] == 'object') {
                result[el] = this.convertValuesToString(data[el], stripUnicode);
            } else {
                if (typeof data[el] == 'string') {
                    result[el] = stripUnicode ? this.textUtils.stripUnicode(data[el]) : data[el];
                    if (stripUnicode && data[el] != result[el] && result[el].trim().length == 0) {
                        throw new Error();
                    }
                } else {
                    result[el] = data[el] + '';
                }
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
    createFakeWSError(message: string, needsTranslate?: boolean) : CoreWSError {
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
    downloadFile(url: string, path: string, addExtension?: boolean, onProgress?: (event: ProgressEvent) => any) : Promise<any> {
        this.logger.debug('Downloading file', url, path, addExtension);

        if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('mm.core.networkerrormsg'));
        }

        // Use a tmp path to download the file and then move it to final location. This is because if the download fails,
        // the local file is deleted.
        let tmpPath = path + '.tmp';

        // Create the tmp file as an empty file.
        return this.fileProvider.createFile(tmpPath).then((fileEntry) => {
            let transfer = this.fileTransfer.create();
            transfer.onProgress(onProgress);

            return transfer.download(url, fileEntry.toURL(), true).then(() => {
                let promise;

                if (addExtension) {
                    let ext = this.mimeUtils.getFileExtension(path);

                    // Google Drive extensions will be considered invalid since Moodle usually converts them.
                    if (!ext || ext == 'gdoc' || ext == 'gsheet' || ext == 'gslides' || ext == 'gdraw') {
                        // Not valid, get the file's mimetype.
                        promise = this.getRemoteFileMimeType(url).then((mime) => {
                            if (mime) {
                                let remoteExt = this.mimeUtils.getExtension(mime, url);
                                // If the file is from Google Drive, ignore mimetype application/json (sometimes pluginfile
                                // returns an invalid mimetype for files).
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
    protected getPromiseHttp(method: string, url: string, params?: any) : any {
        let queueItemId = this.getQueueItemId(method, url, params);
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
    getRemoteFileMimeType(url: string, ignoreCache?: boolean) : Promise<string> {
        if (this.mimeTypeCache[url] && !ignoreCache) {
            return Promise.resolve(this.mimeTypeCache[url]);
        }

        return this.performHead(url).then((data) => {
            let mimeType = data.headers('Content-Type');
            if (mimeType) {
                // Remove "parameters" like charset.
                mimeType = mimeType.split(';')[0];
            }
            this.mimeTypeCache[url] = mimeType;

            return mimeType || '';
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
    getRemoteFileSize(url: string) : Promise<number> {
        return this.performHead(url).then((data) => {
            let size = parseInt(data.headers('Content-Length'), 10);

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
    protected getQueueItemId(method: string, url: string, params?: any) : string {
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
    performHead(url: string) : Promise<any> {
        let promise = this.getPromiseHttp('head', url);

        if (!promise) {
            promise = this.utils.observableToPromise(this.http.head(url).timeout(CoreConstants.wsTimeout));
            this.setPromiseHttp(promise, 'head', url);
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
    performPost(method: string, siteUrl: string, ajaxData: any, preSets: CoreWSPreSets) : Promise<any> {
        // Perform the post request.
        let observable = this.http.post(siteUrl, ajaxData).timeout(CoreConstants.wsTimeout),
            promise;

        promise = this.utils.observableToPromise(observable).then((data: any) => {
            // Some moodle web services return null.
            // If the responseExpected value is set to false, we create a blank object if the response is null.
            if (!data && !preSets.responseExpected) {
                data = {};
            }

            if (!data) {
                return Promise.reject(this.createFakeWSError('mm.core.serverconnection', true));
            } else if (typeof data != preSets.typeExpected) {
                this.logger.warn('Response of type "' + typeof data + `" received, expecting "${preSets.typeExpected}"`);
                return Promise.reject(this.createFakeWSError('mm.core.errorinvalidresponse', true));
            }

            if (typeof data.exception !== 'undefined') {
                return Promise.reject(data);
            }

            if (typeof data.debuginfo != 'undefined') {
                return Promise.reject(this.createFakeWSError('Error. ' + data.message));
            }

            return data;
        }, (error) => {
            // If server has heavy load, retry after some seconds.
            if (error.status == 429) {
                let retryPromise = this.addToRetryQueue(method, siteUrl, ajaxData, preSets);

                // Only process the queue one time.
                if (this.retryTimeout == 0) {
                    this.retryTimeout = parseInt(error.headers('Retry-After'), 10) || 5;
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

            return Promise.reject(this.createFakeWSError('mm.core.serverconnection', true));
        });

        this.setPromiseHttp(promise, 'post', preSets.siteUrl, ajaxData);

        return promise;
    }

    /**
     * Retry all requests in the queue.
     * This function uses recursion in order to add a delay between requests to reduce stress.
     */
    protected processRetryQueue() : void {
        if (this.retryCalls.length > 0 && this.retryTimeout == 0) {
            let call = this.retryCalls.shift();
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
     */
    protected setPromiseHttp(promise: Promise<any>, method: string, url: string, params?: any) : void {
        let timeout,
            queueItemId = this.getQueueItemId(method, url, params);

        this.ongoingCalls[queueItemId] = promise;

        // HTTP not finished, but we should delete the promise after timeout.
        timeout = setTimeout(() => {
            delete this.ongoingCalls[queueItemId];
        }, CoreConstants.wsTimeout);

        // HTTP finished, delete from ongoing.
        this.ongoingCalls[queueItemId].finally(() => {
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
    syncCall(method: string, data: any, preSets: CoreWSPreSets) : any {
        let siteUrl,
            xhr,
            errorResponse = {
                error: true,
                message: ''
            };

        if (!preSets) {
            errorResponse.message = this.translate.instant('mm.core.unexpectederror');
            return errorResponse;
        } else if (!this.appProvider.isOnline()) {
            errorResponse.message = this.translate.instant('mm.core.networkerrormsg');
            return errorResponse;
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        try {
            data = this.convertValuesToString(data, preSets.cleanUnicode);
        } catch (e) {
            // Empty cleaned text found.
            errorResponse.message = this.translate.instant('mm.core.unicodenotsupportedcleanerror');
            return errorResponse;
        }

        data.wsfunction = method;
        data.wstoken = preSets.wsToken;
        siteUrl = preSets.siteUrl + '/webservice/rest/server.php?moodlewsrestformat=json';

        // Serialize data.
        data = CoreInterceptor.serialize(data);

        // Perform sync request using XMLHttpRequest.
        xhr = new (<any>window).XMLHttpRequest();
        xhr.open('post', siteUrl, false);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');

        xhr.send(data);

        // Get response.
        data = ('response' in xhr) ? xhr.response : xhr.responseText;

        // Check status.
        xhr.status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
        if (xhr.status < 200 || xhr.status >= 300) {
            // Request failed.
            errorResponse.message = data;
            return errorResponse;
        }

        // Treat response.
        try {
            data = JSON.parse(data);
        } catch(ex) {}

        // Some moodle web services return null.
        // If the responseExpected value is set then so long as no data is returned, we create a blank object.
        if ((!data || !data.data) && !preSets.responseExpected) {
            data = {};
        }

        if (!data) {
            errorResponse.message = this.translate.instant('mm.core.serverconnection');
        } else if (typeof data != preSets.typeExpected) {
            this.logger.warn('Response of type "' + typeof data + '" received, expecting "' + preSets.typeExpected + '"');
            errorResponse.message = this.translate.instant('mm.core.errorinvalidresponse');
        }

        if (typeof data.exception != 'undefined' || typeof data.debuginfo != 'undefined') {
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
            onProgress?: (event: ProgressEvent) => any) : Promise<any> {
        this.logger.debug(`Trying to upload file: ${filePath}`);

        if (!filePath || !options || !preSets) {
            return Promise.reject(null);
        }

        if (!this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('mm.core.networkerrormsg'));
        }

        let uploadUrl = preSets.siteUrl + '/webservice/upload.php',
            transfer = this.fileTransfer.create();

        transfer.onProgress(onProgress);

        options.httpMethod = 'POST';
        options.params = {
            token: preSets.wsToken,
            filearea: options.fileArea || 'draft',
            itemid: options.itemId || 0
        };
        options.chunkedMode = false;
        options.headers = {
            Connection: "close"
        };

        return transfer.upload(filePath, uploadUrl, options, true).then((success) => {
            let data: any = success.response;
            try {
                data = JSON.parse(data);
            } catch(err) {
                this.logger.error('Error parsing response from upload:', err, data);
                return Promise.reject(this.translate.instant('mm.core.errorinvalidresponse'));
            }

            if (!data) {
                return Promise.reject(this.translate.instant('mm.core.serverconnection'));
            } else if (typeof data != 'object') {
                this.logger.warn('Upload file: Response of type "' + typeof data + '" received, expecting "object"');
                return Promise.reject(this.translate.instant('mm.core.errorinvalidresponse'));
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
            return Promise.reject(this.translate.instant('mm.core.errorinvalidresponse'));
        });
    }
}
