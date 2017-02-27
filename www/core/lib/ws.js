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

angular.module('mm.core')

// 30s timeout for $http requests and promises.
.constant('mmWSTimeout', 30000)

/**
 * Web service module.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmWS
 */
.factory('$mmWS', function($http, $q, $log, $mmLang, $cordovaFileTransfer, $mmApp, $mmFS, mmCoreSessionExpired, $translate, $window,
            mmCoreUserDeleted, md5, $timeout, mmWSTimeout, mmCoreUserPasswordChangeForced, mmCoreUserNotFullySetup, $mmText,
            mmCoreSitePolicyNotAgreed, mmCoreUnicodeNotSupported) {

    $log = $log.getInstance('$mmWS');

    var self = {},
        mimeTypeCache = {}, // A "cache" to store file mimetypes to prevent performing too many HEAD requests.
        ongoingCalls = {},
        retryCalls = [],
        retryTimeout = 0;

    /**
     * A wrapper function for a moodle WebService call.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#call
     * @param {string} method The WebService method to be called.
     * @param {Object} data Arguments to pass to the method.
     * @param {Object} preSets Extra settings and information.
     *                    - siteurl string The site URL.
     *                    - wstoken string The Webservice token.
     *                    - responseExpected boolean Defaults to true. Set to false when the expected response is null.
     *                    - typeExpected string Defaults to 'object'. Use it when you expect a type that's not an object|array.
     *                    - cleanUnicode boolean Defaults to false. Clean multibyte Unicode chars from data.
     * @return {Promise} Promise resolved with the response data in success and rejected with the error message if it fails.
     */
    self.call = function(method, data, preSets) {

        var siteurl;

        if (typeof preSets == 'undefined' || preSets === null ||
                typeof preSets.wstoken == 'undefined' || typeof preSets.siteurl == 'undefined') {
            return $mmLang.translateAndReject('mm.core.unexpectederror');
        } else if (!$mmApp.isOnline()) {
            return $mmLang.translateAndReject('mm.core.networkerrormsg');
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        try {
            data = convertValuesToString(data, preSets.cleanUnicode);
        } catch (e) {
           // Empty cleaned text found.
           return $mmLang.translateAndReject('mm.core.unicodenotsupportedcleanerror');
        }

        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';

        var ajaxData = data;

        var promise = getPromiseHttp('post', preSets.siteurl, ajaxData);

        if (!promise) {
            // There are some ongoing retry calls, wait for timeout.
            if (retryCalls.length > 0) {
                $log.warn('Calls locked, trying later...');
                promise = addToRetryQueue(method, siteurl, ajaxData, preSets);
            } else {
                promise = performPost(method, siteurl, ajaxData, preSets);
            }
        }

        return promise;
    };

    /**
     * Perform the post call and save the promise while waiting to be resolved.
     *
     * @param {string} method   The WebService method to be called.
     * @param {string} siteurl  Complete site url to perform the call.
     * @param {Object} ajaxData Arguments to pass to the method.
     * @param {Object} preSets  Extra settings and information. See $mmWS#call.
     * @return {Promise} Promise resolved with the response data in success and rejected with the error message if it fails.
     */
    function performPost(method, siteurl, ajaxData, preSets) {
        var promise = $http.post(siteurl, ajaxData, {timeout: mmWSTimeout}).then(function(data) {

            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data
            // is returned, we create a blank object.
            if ((!data || !data.data) && !preSets.responseExpected) {
                data = {};
            } else {
                data = data.data;
            }

            if (!data) {
                return $mmLang.translateAndReject('mm.core.serverconnection');
            } else if (typeof data != preSets.typeExpected) {
                $log.warn('Response of type "' + typeof data + '" received, expecting "' + preSets.typeExpected + '"');
                return $mmLang.translateAndReject('mm.core.errorinvalidresponse');
            }

            if (typeof(data.exception) !== 'undefined') {
                if (data.errorcode == 'invalidtoken' ||
                        (data.errorcode == 'accessexception' && data.message.indexOf('Invalid token - token expired') > -1)) {
                    $log.error("Critical error: " + JSON.stringify(data));
                    return $q.reject(mmCoreSessionExpired);
                } else if (data.errorcode === 'userdeleted') {
                    return $q.reject(mmCoreUserDeleted);
                } else if (data.errorcode === 'sitemaintenance' || data.errorcode === 'upgraderunning') {
                    return $mmLang.translateAndReject('mm.core.' + data.errorcode);
                } else if (data.errorcode === 'forcepasswordchangenotice') {
                    return $q.reject(mmCoreUserPasswordChangeForced);
                } else if (data.errorcode === 'usernotfullysetup') {
                    return $q.reject(mmCoreUserNotFullySetup);
                } else if (data.errorcode === 'sitepolicynotagreed') {
                    return $q.reject(mmCoreSitePolicyNotAgreed);
                } else if (data.errorcode === 'dmlwriteexception' && $mmText.hasUnicodeData(ajaxData)) {
                    return $q.reject(mmCoreUnicodeNotSupported);
                } else {
                    return $q.reject(data.message);
                }
            }

            if (typeof(data.debuginfo) != 'undefined') {
                return $q.reject('Error. ' + data.message);
            }

            $log.info('WS: Data received from WS ' + typeof(data));

            if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
                $log.info('WS: Data number of elements '+ data.length);
            }

            return data;
        }, function(data) {
            // If server has heavy load, retry after some seconds.
            if (data.status == 429) {
                var retryPromise = addToRetryQueue(method, siteurl, ajaxData, preSets);

                // Only process the queue one time.
                if (retryTimeout == 0) {
                    retryTimeout = parseInt(data.headers('Retry-After'), 10) || 5;
                    $log.warn(data.statusText + '. Retrying in ' + retryTimeout + ' seconds. ' + retryCalls.length + ' calls left.');

                    $timeout(function() {
                        $log.warn('Retrying now with ' + retryCalls.length + ' calls to process.');
                        // Finish timeout.
                        retryTimeout = 0;
                        processRetryQueue();
                    }, retryTimeout * 1000);
                } else {
                    $log.warn('Calls locked, trying later...');
                }

                return retryPromise;
            }

            return $mmLang.translateAndReject('mm.core.serverconnection');
        });

        setPromiseHttp(promise, 'post', preSets.siteurl, ajaxData);

        return promise;
    }

    /**
     * Retry all requests in the queue.
     * This function uses recursion in order to add a delay between requests to reduce stress.
     */
    function processRetryQueue() {
        if (retryCalls.length > 0 && retryTimeout == 0) {
            var call = retryCalls.shift();
            // Add a delay between calls.
            $timeout(function() {
                call.deferred.resolve(performPost(call.method, call.siteurl, call.ajaxData, call.preSets));
                processRetryQueue();
            }, 200);
        } else {
            $log.warn('Retry queue has stopped with ' + retryCalls.length + ' calls and ' + retryTimeout + ' timeout seconds.');
        }
    }

    /**
     * Adds the call data to an special queue to be processed when retrying.
     *
     * @param {string} method   The WebService method to be called.
     * @param {string} siteurl  Complete site url to perform the call.
     * @param {Object} ajaxData Arguments to pass to the method.
     * @param {Object} preSets  Extra settings and information. See $mmWS#call.
     * @return {Promise} Deferrend promise resolved with the response data in success and rejected with the error message if it fails.
     */
    function addToRetryQueue(method, siteurl, ajaxData, preSets) {
        var call = {
            method: method,
            siteurl: siteurl,
            ajaxData: ajaxData,
            preSets: preSets,
            deferred: $q.defer()
        };

        retryCalls.push(call);
        return call.deferred.promise;
    }

    /**
     * Save promise on the cache.
     *
     * @param {Promise} promise     to be saved
     * @param {String}  method      Method of the HTTP request.
     * @param {String}  url         Base URL of the HTTP request.
     * @param {Object}  [params]    Params of the HTTP request.
     */
    function setPromiseHttp(promise, method, url, params) {
        var deletePromise,
            queueItemId = getQueueItemId(method, url, params);

        ongoingCalls[queueItemId] = promise;

        // HTTP not finished, but we should delete the promise after timeout.
        deletePromise = $timeout(function() {
            delete ongoingCalls[queueItemId];
        }, mmWSTimeout);

        // HTTP finished, delete from ongoing.
        ongoingCalls[queueItemId].finally(function() {
            delete ongoingCalls[queueItemId];

            $timeout.cancel(deletePromise);
        });
    }

    /**
     * Get a promise from the cache.
     *
     * @param {String}  method      Method of the HTTP request.
     * @param {String}  url         Base URL of the HTTP request.
     * @param {Object}  [params]    Params of the HTTP request.
     */
    function getPromiseHttp(method, url, params) {
        var queueItemId = getQueueItemId(method, url, params);
        if (typeof ongoingCalls[queueItemId] != 'undefined') {
            return ongoingCalls[queueItemId];
        }

        return false;
    }

    /**
     * Get the unique queue item id of the cache for a HTTP request.
     *
     * @param {String}  method      Method of the HTTP request.
     * @param {String}  url         Base URL of the HTTP request.
     * @param {Object}  [params]    Params of the HTTP request.
     */
    function getQueueItemId(method, url, params) {
        if (params) {
            url += '###' + serializeParams(params);
        }
        return method + '#' + md5.createHash(url);
    }

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained.
     *
     * @param {Object}  data            The data that needs all the non-object values set to strings.
     * @param {Boolean} stripUnicode    If Unicode long chars need to be stripped.
     * @return {Object} The cleaned object, with multilevel array and objects preserved.
     */
    function convertValuesToString(data, stripUnicode) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = convertValuesToString(data[el], stripUnicode);
            } else {
                if (typeof data[el] == "string") {
                    result[el] = stripUnicode ? $mmText.stripUnicode(data[el]) : data[el];
                    if (stripUnicode && data[el] != result[el] && result[el].trim().length == 0) {
                        throw new Exception();
                    }
                } else {
                    result[el] = data[el] + '';
                }
            }
        }
        return result;
    }

    /**
     * Downloads a file from Moodle using Cordova File API.
     * @todo Use Web Workers.
     *
     * @param {String}   url            Download url.
     * @param {String}   path           Local path to store the file.
     * @param {Boolean}  addExtension   True if extension need to be added to the final path.
     * @return {Promise}                The success returns the fileEntry, the reject will contain the error object.
     */
    self.downloadFile = function(url, path, addExtension) {
        $log.debug('Downloading file ' + url, path, addExtension);

        // Use a tmp path to download the file and then move it to final location.This is because if the download fails,
        // the local file is deleted.
        var tmpPath = path + '.tmp';

        // Create the tmp file as an empty file.
        return $mmFS.createFile(tmpPath).then(function(fileEntry) {
            return $cordovaFileTransfer.download(url, fileEntry.toURL(), { encodeURI: false }, true).then(function() {
                var promise;

                if (addExtension) {
                    ext = $mmFS.getFileExtension(path);

                    if (!ext) {
                        promise = self.getRemoteFileMimeType(url).then(function(mime) {
                            var ext;
                            if (mime) {
                                ext = $mmFS.getExtension(mime, url);
                                if (ext) {
                                    path += '.' + ext;
                                }
                                return ext;
                            }
                            return false;
                        });
                    } else {
                        promise = $q.when(ext);
                    }
                } else {
                    promise = $q.when("");
                }

                return promise.then(function(extension) {
                    return $mmFS.moveFile(tmpPath, path).then(function(movedEntry) {
                        // Save the extension.
                        movedEntry.extension = extension;
                        movedEntry.path = path;
                        $log.debug('Success downloading file ' + url + ' to ' + path + ' with extension ' + extension);
                        return movedEntry;
                    });
                });
            });
        }).catch(function(err) {
            $log.error('Error downloading ' + url + ' to ' + path);
            $log.error(JSON.stringify(err));
            return $q.reject(err);
        });
    };

    /*
     * Uploads a file using Cordova File API.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#uploadFile
     * @param {Object} uri File URI.
     * @param {Object} options File settings: fileKey, fileName, mimeType, fileArea and itemId.
     * @param {Object} preSets Contains siteurl and token.
     * @return {Promise}
     */
    self.uploadFile = function(uri, options, preSets) {
        $log.debug('Trying to upload file: ' + uri);

        if (!uri || !options || !preSets) {
            return $q.reject();
        }

        var ftOptions = {},
            uploadUrl = preSets.siteurl + '/webservice/upload.php';

        ftOptions.fileKey = options.fileKey;
        ftOptions.fileName = options.fileName;
        ftOptions.httpMethod = 'POST';
        ftOptions.mimeType = options.mimeType;
        ftOptions.params = {
            token: preSets.token,
            filearea: options.fileArea || 'draft',
            itemid: options.itemId || 0
        };
        ftOptions.chunkedMode = false;
        ftOptions.headers = {
            Connection: "close"
        };

        $log.debug('Initializing upload');
        return $cordovaFileTransfer.upload(uploadUrl, uri, ftOptions, true).then(function(success) {
            var data = success.response;
            try {
                data = JSON.parse(data);
            } catch(err) {
                $log.error('Error parsing response:', err, data);
                return $mmLang.translateAndReject('mm.core.errorinvalidresponse');
            }

            if (!data) {
                return $mmLang.translateAndReject('mm.core.serverconnection');
            } else if (typeof data != 'object') {
                $log.warn('Upload file: Response of type "' + typeof data + '" received, expecting "object"');
                return $mmLang.translateAndReject('mm.core.errorinvalidresponse');
            }

            if (typeof data.exception !== 'undefined') {
                return $q.reject(data.message);
            } else if (data && typeof data.error !== 'undefined') {
                return $q.reject(data.error);
            } else if (data[0] && typeof data[0].error !== 'undefined') {
                return $q.reject(data[0].error);
            }

            // We uploaded only 1 file, so we only return the first file returned.
            $log.debug('Successfully uploaded file');
            return data[0];
        }, function(error) {
            $log.error('Error while uploading file', error.exception);
            return $mmLang.translateAndReject('mm.core.serverconnection');
        });
    };

    /**
     * Perform a HEAD request to get the size of a remote file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#getRemoteFileSize
     * @param {Object} url File URL.
     * @return {Promise}   Promise resolved with the size or -1 if failure.
     */
    self.getRemoteFileSize = function(url) {
        var promise = getPromiseHttp('head', url);

        if (!promise) {
            promise = $http.head(url, {timeout: mmWSTimeout}).then(function(data) {
                var size = parseInt(data.headers('Content-Length'), 10);

                if (size) {
                    return size;
                }
                return -1;
            }).catch(function() {
                return -1;
            });

            setPromiseHttp(promise, 'head', url);
        }

        return promise;
    };

    /**
     * Perform a HEAD request to get the mimetype of a remote file.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#getRemoteFileMimeType
     * @param  {Object} url          File URL.
     * @param  {Boolean} ignoreCache True to ignore cache, false otherwise.
     * @return {Promise}             Promise resolved with the mimetype or '' if failure.
     */
    self.getRemoteFileMimeType = function(url, ignoreCache) {
        if (mimeTypeCache[url] && !ignoreCache) {
            return $q.when(mimeTypeCache[url]);
        }

        var promise = getPromiseHttp('head', url);

        if (!promise) {
            promise = $http.head(url, {timeout: mmWSTimeout}).then(function(data) {
                var mimeType = data.headers('Content-Type');
                if (mimeType) {
                    // Remove "parameters" like charset.
                    mimeType = mimeType.split(';')[0];
                }
                mimeTypeCache[url] = mimeType;

                return mimeType || '';
            }).catch(function() {
                return '';
            });

            setPromiseHttp(promise, 'head', url);
        }

        return promise;
    };

    /**
     * A wrapper function for a synchronous Moodle WebService call.
     * Warning: This function should only be used if synchronous is a must. It's recommended to use $mmWS#call.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#syncCall
     * @param {string} method The WebService method to be called.
     * @param {Object} data Arguments to pass to the method.
     * @param {Object} preSets Extra settings and information.
     *                    - siteurl string The site URL.
     *                    - wstoken string The Webservice token.
     *                    - responseExpected boolean Defaults to true. Set to false when the expected response is null.
     *                    - typeExpected string Defaults to 'object'. Use it when you expect a type that's not an object|array.
     * @return {Mixed} Request response. If the request fails, returns an object with 'error'=true and 'message' properties.
     */
    self.syncCall = function(method, data, preSets) {
        var siteurl,
            xhr,
            errorResponse = {
                error: true,
                message: ''
            };

        data = convertValuesToString(data);

        if (typeof preSets == 'undefined' || preSets === null ||
                typeof preSets.wstoken == 'undefined' || typeof preSets.siteurl == 'undefined') {
            errorResponse.message = $translate.instant('mm.core.unexpectederror');
            return errorResponse;
        } else if (!$mmApp.isOnline()) {
            errorResponse.message = $translate.instant('mm.core.networkerrormsg');
            return errorResponse;
        }

        preSets.typeExpected = preSets.typeExpected || 'object';
        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';

        // Serialize data.
        data = serializeParams(data);

        // Perform sync request using XMLHttpRequest.
        xhr = new $window.XMLHttpRequest();
        xhr.open('post', siteurl, false);
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
            errorResponse.message = $translate.instant('mm.core.serverconnection');
        } else if (typeof data != preSets.typeExpected) {
            $log.warn('Response of type "' + typeof data + '" received, expecting "' + preSets.typeExpected + '"');
            errorResponse.message = $translate.instant('mm.core.errorinvalidresponse');
        }

        if (typeof data.exception != 'undefined' || typeof data.debuginfo != 'undefined') {
            errorResponse.message = data.message;
        }

        if (errorResponse.message !== '') {
            return errorResponse;
        }

        $log.info('Synchronous: Data received from WS ' + typeof data);

        if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
            $log.info('Synchronous: Data number of elements '+ data.length);
        }

        return data;
    };

    /**
     * Serialize an object to be used in a request.
     *
     * @param  {Object} obj Object to serialize.
     * @return {String}     Serialization of the object.
     */
    function serializeParams(obj) {
        var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

        for (name in obj) {
            value = obj[name];

            if (value instanceof Array) {
                for (i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += serializeParams(innerObj) + '&';
                }
            }
            else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += serializeParams(innerObj) + '&';
                }
            }
            else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    }

    /**
     * Call a Moodle WS using the AJAX API. Please use it if the WS layer is not an option.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWS#callAjax
     * @param {String} method  The WebService method to be called.
     * @param {Object} data    Arguments to pass to the method.
     * @param {Object} preSets Extra settings and information.
     *                             - siteurl string The site URL.
     *                             - responseExpected boolean Defaults to true. Set to false when the expected response is null.
     * @return {Promise}       Promise resolved with the response data in success and rejected with an object containing:
     *                                 - error: Error message.
     *                                 - errorcode: Error code returned by the site (if any).
     *                                 - available: 0 if unknown, 1 if available, -1 if not available.
     */
    self.callAjax = function(method, data, preSets) {
        var siteurl,
            ajaxData;

        if (typeof preSets.siteurl == 'undefined') {
            return rejectWithError($translate.instant('mm.core.unexpectederror'));
        } else if (!$mmApp.isOnline()) {
            return rejectWithError($translate.instant('mm.core.networkerrormsg'));
        }

        if (typeof preSets.responseExpected == 'undefined') {
            preSets.responseExpected = true;
        }

        ajaxData = [{
            index: 0,
            methodname: method,
            args: convertValuesToString(data)
        }];

        siteurl = preSets.siteurl + '/lib/ajax/service.php';

        return $http.post(siteurl, JSON.stringify(ajaxData), {timeout: mmWSTimeout}).then(function(data) {
            // Some moodle web services return null. If the responseExpected value is set then so long as no data
            // is returned, we create a blank object.
            if ((!data || !data.data) && !preSets.responseExpected) {
                data = [{}];
            } else {
                data = data.data;
            }

            // Check if error. Ajax layer should always return an object (if error) or an array (if success).
            if (!data || typeof data != 'object') {
                return rejectWithError($translate.instant('mm.core.serverconnection'));
            } else if (data.error) {
                return rejectWithError(data.error, data.errorcode);
            }

            // Get the first response since only one request was done.
            data = data[0];

            if (data.error) {
                return rejectWithError(data.exception.message, data.exception.errorcode);
            }

            return data.data;
        }, function(data) {
            var available = data.status == 404 ? -1 : 0;
            return rejectWithError($translate.instant('mm.core.serverconnection'), '', available);
        });

        // Convenience function to return an error.
        function rejectWithError(message, code, available) {
            if (typeof available == 'undefined') {
                if (code) {
                    available = code == 'invalidrecord' ? -1 : 1;
                } else {
                    available = 0;
                }
            }

            return $q.reject({
                error: message,
                errorcode: code,
                available: available
            });
        }
    };

    return self;

});
