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

.constant('mmWSCacheStore', 'wscache')

.config(function($mmSiteProvider, mmWSCacheStore) {
    var stores = [
        {
            name: mmWSCacheStore,
            keyPath: 'id'
        }
    ];
    $mmSiteProvider.registerStores(stores);
})

/**
 * Service to provide functionalities related to a site.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmSite
 * @description
 * This provider is the interface with the DB database. The modules that need to store
 * information here need to register their stores.
 *
 * Example:
 *
 * .config(function($mmSiteProvider) {
 *      $mmSiteProvider.registerStore({
 *          name: 'courses',
 *          keyPath: 'id'
 *      });
 *  })
 */
.provider('$mmSite', function() {

    /** Define the site storage schema. */
    var siteSchema = {
        autoSchema: true,
        stores: []
    };

    /**
     * Register a store schema.
     * IMPORTANT: Modifying the schema of an already existing store deletes all its data in WebSQL Storage.
     * If a store schema needs to be modified, the data should be manually migrated to the new store.
     *
     * @param  {Object} store The store object definition.
     * @return {Void}
     */
    this.registerStore = function(store) {
        if (typeof(store.name) === 'undefined') {
            console.log('$mmSite: Error: store name is undefined.');
            return;
        } else if (storeExists(store.name)) {
            console.log('$mmSite: Error: store ' + store.name + ' is already defined.');
            return;
        }
        siteSchema.stores.push(store);
    }

    /**
     * Register multiple stores at once.
     * IMPORTANT: Modifying the schema of an already existing store deletes all its data in WebSQL Storage.
     * If a store schema needs to be modified, the data should be manually migrated to the new store.
     *
     * @param  {Array} stores Array of store objects.
     * @return {Void}
     */
    this.registerStores = function(stores) {
        var self = this;
        angular.forEach(stores, function(store) {
            self.registerStore(store);
        })
    }

    /**
     * Check if a store is already defined.
     *
     * @param  {String} name The name of the store.
     * @return {Boolean} True when the store was already defined.
     */
    function storeExists(name) {
        var exists = false;
        angular.forEach(siteSchema.stores, function(store) {
            if (store.name === name) {
                exists = true;
            }
        });
        return exists;
    }

    this.$get = function($http, $q, $mmWS, $mmDB, $mmConfig, $log, md5, $cordovaNetwork, $mmLang, $mmUtil, mmWSCacheStore) {

        /**
         * List of deprecated WS functions with their corresponding NOT deprecated name.
         * @type {Object}
         */
        var deprecatedFunctions = {
            "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
            "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
            "moodle_notes_create_notes": "core_notes_create_notes",
            "moodle_message_send_instantmessages": "core_message_send_instant_messages",
            "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
            "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
        };

        var self = {},
            currentSite;

        /**
         * Site object to store site data.
         *
         * @param {String} id      Site ID.
         * @param {String} siteurl Site URL.
         * @param {String} token   User's token in the site.
         * @param {Object} infos   Site's info.
         */
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
         * Fetch current site info from the Moodle site.
         *
         * @module mm.core
         * @ngdoc service
         * @name $mmSite#fetchSiteInfo
         * @return {Promise}        A promise to be resolved when the site info is retrieved.
         */
        self.fetchSiteInfo = function() {
            var deferred = $q.defer();

            if (!self.isLoggedIn()) {
                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.notloggedin');
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

        /**
         * Check if the user is logged in a site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#isLoggedIn
         * @return {Boolean} True if the user is logged in a site, false otherwise.
         */
        self.isLoggedIn = function() {
            return typeof(currentSite) != 'undefined' && typeof(currentSite.token) != 'undefined' && currentSite.token != '';
        }

        /**
         * Logouts a user from a site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#logout
         */
        self.logout = function() {
            currentSite = undefined;
        }

        /**
         * Sets a site as a candidate to be a permanent site (during login).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#setCandidateSite
         * @param {String} siteurl URL of the site.
         * @param {String} token   User's token in the site.
         */
        self.setCandidateSite = function(siteurl, token) {
            currentSite = new Site(undefined, siteurl, token);
        }

        /**
         * Delete the candidate site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#deleteCandidateSite
         */
        self.deleteCandidateSite = function() {
            currentSite = undefined;
        };

        /**
         * Set a permanent site (user logged in).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#setSite
         * @param {String} id      Site ID.
         * @param {String} siteurl Site URL.
         * @param {String} token   User's token in the site.
         * @param {Object} infos   Site info.
         */
        self.setSite = function(id, siteurl, token, infos) {
            currentSite = new Site(id, siteurl, token, infos);
        }

        /**
         * Deletes a certain site and all its stored data.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#deleteSite
         * @param  {String} siteid ID of the site to be deleted.
         * @return {Promise}       Promise to be resolved when the data is deleted.
         */
        self.deleteSite = function(siteid) {
            if(typeof(currentSite) !== 'undefined' && currentSite.id == siteid) {
                self.logout();
            }
            return $mmDB.deleteDB('Site-' + siteid);
        }

        /**
         * Read some data from the Moodle site using WS. Requests are cached by default.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#logout
         * @param  {String} read  WS method to use.
         * @param  {Object} data    Data to send to the WS.
         * @param  {Object} preSets Options: getFromCache, saveToCache, omitExpires.
         * @return {Promise}        Promise to be resolved when the request is finished.
         */
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

        /**
         * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#write
         * @param  {String} method  WS method to use.
         * @param  {Object} data    Data to send to the WS.
         * @param  {Object} preSets Options: getFromCache, saveToCache, omitExpires.
         * @return {Promise}        Promise to be resolved when the request is finished.
         */
        self.write = function(method, data, preSets) {
            preSets = preSets || {};
            if (typeof(preSets.getFromCache) === 'undefined') {
                preSets.getFromCache = 0;
            }
            if (typeof(preSets.saveToCache) === 'undefined') {
                preSets.saveToCache = 0;
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
                $mmLang.translateErrorAndReject(deferred, 'mm.core.login.notloggedin');
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
                    $log.debug('WS call failed. Try to get the value from the cache.');
                    preSets.omitExpires = true;
                    getFromCache(method, data, preSets).then(function(data) {
                        deferred.resolve(data);
                    }, function() {
                        deferred.reject(error);
                    });
                });
            });

            return deferred.promise;
        }

        /**
         * Check if a WS is available in the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#wsAvailable
         * @param  {String} method WS name.
         * @return {Boolean}       True if the WS is available, false otherwise.
         */
        self.wsAvailable = function(method) {
            if (!self.isLoggedIn() || typeof(currentSite.infos) == 'undefined') {
                return false;
            }
            for(var i = 0; i < currentSite.infos.functions.length; i++) {
                var f = currentSite.infos.functions[i];
                if (f.name == method) {
                    return true;
                }
            }
            return false;
        };

        /**
         * Get current site ID. If user is not logged in, return undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#getId
         * @return {String} Current site ID.
         */
        self.getId = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.id) !== 'undefined') {
                return currentSite.id;
            } else {
                return undefined;
            }
        };

        /**
         * Get current site URL. If user is not logged in, return undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#getURL
         * @return {String} Current site URL.
         */
        self.getURL = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.siteurl) !== 'undefined') {
                return currentSite.siteurl;
            } else {
                return undefined;
            }
        };

        /**
         * Get current site token. If user is not logged in, return undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#getToken
         * @return {String} Current site token.
         */
        self.getToken = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.token) !== 'undefined') {
                return currentSite.token;
            } else {
                return undefined;
            }
        };

        /**
         * Get current site info. If user is not logged in, return undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#getInfo
         * @return {Object} Current site info.
         */
        self.getInfo = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.infos) !== 'undefined') {
                return currentSite.infos;
            } else {
                return undefined;
            }
        };

        /**
         * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
         * Uses $mmUtil.fixPluginfileURL, passing current site's token if it's not set.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#fixPluginfileURL
         * @param {String} url   The url to be fixed.
         * @param {String} token Token to use. If not set, use the current site token.
         * @return {String}      Fixed URL.
         */
        self.fixPluginfileURL = function(url, token) {
            if (!token) {
                token = self.getToken();
            }
            return $mmUtil.fixPluginfileURL(url, token);

        };

        /**
         * Check if a function is deprecated and returns the function that should be used.
         *
         * @param  {String} method WS function to check.
         * @return {String}        Method to use based in the available functions.
         */
        function checkDeprecatedFunction(method) {
            if (typeof deprecatedFunctions[method] !== "undefined") {
                if (self.wsAvailable(deprecatedFunctions[method])) {
                    $log.warn("You are using deprecated Web Services: " + method +
                        " you must replace it with the newer function: " + deprecatedFunctions[method]);
                    return deprecatedFunctions[method];
                } else {
                    $log.warn("You are using deprecated Web Services. " +
                        "Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
                }
            }
            return method;
        }

        /**
         * Get a WS response from cache.
         *
         * @param {String} method  The WebService method.
         * @param {Object} data    Arguments to pass to the method.
         * @param {Object} preSets Extra settings.
         * @return {Promise}       Promise to be resolved with the WS response.
         */
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

            key = md5.createHash(method + ':' + JSON.stringify(data));
            db.get(mmWSCacheStore, key).then(function(entry) {
                var now = new Date().getTime();

                try { // Use try/catch because $cordovaNetwork fails in Chromium (until mm.emulator is migrated).
                    preSets.omitExpires = preSets.omitExpires || $cordovaNetwork.isOffline(); // omitExpires in offline.
                } catch(err) {}

                if (!preSets.omitExpires) {
                    if (now > entry.expirationtime) {
                        $log.debug('Cached element found, but it is expired');
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

        /**
         * Save a WS response to cache.
         *
         * @param {String} method  The WebService method.
         * @param {Object} data    Arguments to pass to the method.
         * @param {Object} preSets Extra settings.
         * @return {Promise}       Promise to be resolved when the response is saved.
         */
        function saveToCache(method, data, response) {
            var db = currentSite.db,
                deferred = $q.defer(),
                key = md5.createHash(method + ':' + JSON.stringify(data));

            if (!db) {
                deferred.reject();
            } else {
                $mmConfig.get('cache_expiration_time').then(function(cacheExpirationTime) {

                    var entry = {
                        id: key,
                        data: response
                    };
                    entry.expirationtime = new Date().getTime() + cacheExpirationTime;
                    db.insert(mmWSCacheStore, entry);
                    deferred.resolve();

                }, deferred.reject);
            }

            return deferred.promise;
        }

        return self;
    };
});
