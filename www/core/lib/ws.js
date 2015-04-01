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

/**
 * Web service module.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmWS
 */
.factory('$mmWS', function($http, $q, $log, $mmLang, $cordovaFileTransfer, $mmFS) {

    var self = {};

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
     *                    - wsfunctions array List of functions available on the site.
     *                    - responseExpected boolean (false) Raise an error if response is null.
     *                    - sync boolean (false) To indicate that is a call in a sync process
     */
    self.call = function(method, data, preSets) {

        var deferred = $q.defer(),
            siteurl;

        data = convertValuesToString(data);
        preSets = verifyPresets(preSets);

        if (!preSets) {
            $mmLang.translateErrorAndReject(deferred, 'unexpectederror');
            return deferred.promise;
        }

        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';

        var ajaxData = data;

        // TODO: Sync
        // TODO: Get from cache
        // TODO: Show error if not connected.

        $http.post(siteurl, ajaxData).success(function(data) {
            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data
            // is returned, we create a blank object.
            if (!data && !preSets.responseExpected) {
                data = {};
            }

            if (!data) {
                $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
                return;
            }

            if (typeof(data.exception) !== 'undefined') {
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {
                    // TODO: Send an event to logout the user and redirect to login page.
                    $log.error("Critical error: " + JSON.stringify(data));
                    $mmLang.translateErrorAndReject(deferred, 'lostconnection');
                } else {
                    deferred.reject(data.message);
                }
                return;
            }

            if (typeof(data.debuginfo) != 'undefined') {
                deferred.reject('Error. ' + data.message);
                return;
            }

            $log.info('WS: Data received from WS ' + typeof(data));

            if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
                $log.info('WS: Data number of elements '+ data.length);
            }

            // if (preSets.saveToCache) {
            //     MM.cache.addWSCall(siteurl, ajaxData, data);
            // }

            // We pass back a clone of the original object, this may
            // prevent errors if in the callback the object is modified.
            deferred.resolve(angular.copy(data));

        }, function(error) {
            $mmLang.translateErrorAndReject(deferred, 'cannotconnect');
        });

        return deferred.promise;
    };

    /**
     * Pre-fill the presets.
     *
     * @param  {Object} preSets The presets.
     * @return {Object}         The final presets.
     */
     function verifyPresets(preSets) {
        if (typeof(preSets) === 'undefined' || preSets == null) {
            preSets = {};
        }
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        if (typeof(preSets.sync) === 'undefined') {
            preSets.sync = 0;
        }
        if (typeof(preSets.omitExpires) === 'undefined') {
            preSets.omitExpires = false;
        }
        if (typeof(preSets.wstoken) === 'undefined') {
            return false;
        }
        if (typeof(preSets.siteurl) === 'undefined') {
            return false;
        }

        return preSets;
    };

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained.
     *
     * @param {Object} data The data that needs all the non-object values set to strings.
     * @return {Object} The cleaned object, with multilevel array and objects preserved.
     */
    function convertValuesToString(data) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = convertValuesToString(data[el]);
            } else {
                result[el] = data[el] + '';
            }
        }
        return result;
    };

    /**
     * Downloads a file from Moodle using Cordova File API
     *
     * @param {String}   url        Download url.
     * @param {String}   path       Local path to store the file.
     * @param {Boolean}  background True if this function should be executed in background using Web Workers.
     * @return {Promise} Promise to be resolved in success.
     */
    self.downloadFile = function(url, path, background) {
        $log.debug('Download file '+url);
        // TODO: Web Workers
        $mmFS.getBasePath().then(function(basePath) {
            var absolutePath = basePath + path;
            return $cordovaFileTransfer.download(url, absolutePath, {}, true).then(function(result) {
                $log.debug('Success downloading file ' + url + ' to '+absolutePath);
                return result.toInternalURL();
            }, function(err) {
                $log.error('Error downloading file '+url);
                $log.error(err);
                return $q.reject();
            });
        });
    };

    return self;

});
