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
.factory('$mmSite', function($http, $q, $mmWS, $mmDB, $mmConfig, $log, md5) {

    var deprecatedFunctions = {
        "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
        "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
        "moodle_notes_create_notes": "core_notes_create_notes",
        "moodle_message_send_instantmessages": "core_message_send_instant_messages",
        "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
        "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
    };

    var self = {},
        currentSite,
        siteSchema = {
            autoSchema: true,
            stores: [
                {
                    name: 'wscache',
                    keyPath: 'id'
                }
            ]
        };

    function Site(id, siteurl, token, infos) {
        this.id = id;
        this.siteurl = siteurl;
        this.token = token;
        this.infos = infos;

        if (this.id) {
            this.db = $mmDB.getDB('Site-' + this.id, siteSchema);
        }
    };

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
            $translate('mm.core.login.notloggedin').then(function(value) {
                deferred.reject(value);
            });
            return deferred.promise;
        }

        function siteDataRetrieved(infos) {
            currentSite.infos = infos;
            deferred.resolve(infos);
        }

        // get_site_info won't be cached. The returned data is stored in the site.
        var preSets = {
            getFromCache: 0,
            saveToCache: 0
        };

        // We have a valid token, try to get the site info.
        self.read('core_webservice_get_site_info', {}, preSets).then(siteDataRetrieved, function(error) {
            self.read('moodle_webservice_get_site_info', {}, preSets).then(siteDataRetrieved, function(error) {
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

    self.setCandidateSite = function(siteurl, token) {
        currentSite = new Site(undefined, siteurl, token);
    }

    self.deleteCandidateSite = function() {
        delete currentSite;
    };

    self.setSite = function(id, siteurl, token, infos) {
        currentSite = new Site(id, siteurl, token, infos);
    }

    self.deleteSite = function(siteid) {
        if(typeof(currentSite) !== 'undefined' && currentSite.id == siteid) {
            self.logout();
        }
        return $mmDB.deleteDB('Site-' + siteid);
    }

    self.read = function(method, data, preSets) {
        preSets = preSets || {};
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        return self.request(method, data, preSets);
    }

    self.write = function(method, data, preSets) {
        preSets = preSets || {};
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        return self.request(method, data, preSets);
    }

    /**
     * WS request to the site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#request
     * @param {string} method The WebService method to be called.
     * @param {Object} data Arguments to pass to the method.
     * @param {Object} preSets Extra settings.
     *                    - getFromCache boolean (true) Use the cache when possible.
     *                    - saveToCache boolean (true) Save the call results to the cache.
     *                    - omitExpires boolean (false) Ignore cache expiry.
     * @return {Promise}
     */
    self.request = function(method, data, preSets) {
        var deferred = $q.defer();

        if (!self.isLoggedIn()) {
            $translate('mm.core.login.notloggedin').then(function(value) {
                deferred.reject(value);
            });
            return deferred.promise;
        }

        // Alter the method to be non-deprecated if necessary/
        method = checkDeprecatedFunction(method);

        preSets = preSets || {};
        preSets.wstoken = currentSite.token;
        preSets.siteurl = currentSite.siteurl;

        getFromCache(method, data, preSets).then(function(data) {
            deferred.resolve(data);
        }, function() {
            var mustSaveToCache = preSets.saveToCache;

            // Do not pass those options to the core WS factory.
            delete preSets.getFromCache;
            delete preSets.saveToCache;
            delete preSets.omitExpires;

            $mmWS.call(method, data, preSets).then(function(response) {

                if (mustSaveToCache) {
                    saveToCache(method, data, response);
                }

                deferred.resolve(response);
            }, function(error) {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }

    self.wsAvailable = function(method) {
        if (!self.isLoggedIn() || typeof(currentSite.infos) == 'undefined') {
            return false;
        }
        for(var i = 0; i < currentSite.infos.functions; i++) {
            var f = functions[i];
            if (f.name == method) {
                return true;
            }
        }
        return false;
    }

    self.getCurrentSiteId = function() {
        if (typeof(currentSite) !== 'undefined' && typeof(currentSite.id) !== 'undefined') {
            return currentSite.id;
        } else {
            return undefined;
        }
    };

    self.getCurrentSiteURL = function() {
        if (typeof(currentSite) !== 'undefined' && typeof(currentSite.siteurl) !== 'undefined') {
            return currentSite.siteurl;
        } else {
            return undefined;
        }
    };

    self.getCurrentSiteToken = function() {
        if (typeof(currentSite) !== 'undefined' && typeof(currentSite.token) !== 'undefined') {
            return currentSite.token;
        } else {
            return undefined;
        }
    };

    self.getCurrentSiteInfo = function() {
        if (typeof(currentSite) !== 'undefined' && typeof(currentSite.infos) !== 'undefined') {
            return currentSite.infos;
        } else {
            return undefined;
        }
    };

    function checkDeprecatedFunction(method) {
        if (typeof deprecatedFunctions[method] !== "undefined") {
            if (self.wsAvailable(deprecatedFunctions[method])) {
                $log.warn("You are using deprecated Web Services: " + method +
                    " you must replace it with the newer function: " + MM.deprecatedFunctions[method]);
                return deprecatedFunctions[method];
            } else {
                $log.warn("You are using deprecated Web Services. " +
                    "Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
            }
        }
        return method;
    }

    function getFromCache(method, data, preSets) {
        var result,
            db = currentSite.db,
            deferred = $q.defer(),
            key;

        if (!db) {
            deferred.reject();
            return deferred.promise;
        } else if (!preSets.getFromCache) {
            deferred.reject();
            return deferred.promise;
        }

        key = method + ':' + JSON.stringify(data);
        db.get('wscache', key).then(function(entry) {
            var now = new Date().getTime();

            if (!preSets.omitExpires) {
                if (now > entry.expirationtime) {
                    deferred.reject();
                    return;
                }
            }

            if (typeof(entry) !== 'undefined' && typeof(entry.data) !== 'undefined') {
                var expires = (entry.expirationtime - now) / 1000;
                $log.info('Cached element found, id: ' + key + ' expires in ' + expires + ' seconds');
                deferred.resolve(entry.data);
                return;
            }

            deferred.reject();
        }, function() {
            deferred.reject();
        });

        return deferred.promise;
    }

    function saveToCache(method, data, response) {
        var db = currentSite.db,
            deferred = $q.defer(),
            key = method + ':' + JSON.stringify(data);

        if (!db) {
            deferred.reject();
        } else {

            $mmConfig.get('cache_expiration_time').then(function(cacheExpirationTime) {

                var entry = {
                    id: key,
                    data: response
                };
                entry.expirationtime = new Date().getTime() + cacheExpirationTime;
                db.insert('wscache', entry);
                deferred.resolve();

            }, deferred.reject);
        }

        return deferred.promise;
    }

    return self;
});
