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
 * Site service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmSite
 */
.factory('$mmSite', function($http, $q, $mmWS, md5) {

    var schema = {
    };

    var self = {},
        currentSite;

    /**
     * Save the token retrieved and load the full siteinfo object.
     *
     * @module mm.core
     * @ngdoc service
     * @name $mmSite#getSiteInfo
     * @param  {string} siteurl The site URL
     * @param  {str} token      The user token
     * @return {Promise}        A promise to be resolved when the token is saved.
     */
    self.getSiteInfo = function() {
        var deferred = $q.defer();

        if (!self.isLoggedIn()) {
            deferred.reject('notloggedin');
            return deferred.promise;
        }

        function siteDataRetrieved(infos) {
            deferred.resolve(infos);
        }

        // We have a valid token, try to get the site info.
        self.read('moodle_webservice_get_siteinfo', {}).then(siteDataRetrieved, function(error) {
            self.read('core_webservice_get_site_info', {}).then(siteDataRetrieved, function(error) {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    };

    self.isLoggedIn = function() {
        return typeof(currentSite) != 'undefined' && typeof(currentSite.token) != 'undefined' && currentSite.token != '';
    }

    self.logout = function() {
        delete currentSite;
    }

    self.setSite = function(site) {
        currentSite = site;
    }

    self.read = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 1;
        preSets.saveToCache = 1;
        return self.request(method, data, preSets);
    }

    self.write = function(method, data, preSets) {
        preSets = preSets || {};
        preSets.getFromCache = 0;
        preSets.saveToCache = 0;
        return self.request(method, data, preSets);
    }

    self.request = function(method, data, preSets) {
        var deferred = $q.defer();

        if (!self.isLoggedIn()) {
            deferred.reject('notloggedin');
        }

        preSets = preSets || {};
        preSets.wstoken = currentSite.token;
        preSets.siteurl = currentSite.siteurl;

        $mmWS.call(method, data, preSets).then(function(data) {
            deferred.resolve(data);
        }, function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    return self;
});
