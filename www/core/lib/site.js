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

.value('mmCoreWSPrefix', 'local_mobile_')

.constant('mmCoreWSCacheStore', 'wscache')

.config(function($mmSiteProvider, mmCoreWSCacheStore) {
    var stores = [
        {
            name: mmCoreWSCacheStore,
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
    };

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
        });
    };

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

    this.$get = function($http, $q, $mmWS, $mmDB, $mmConfig, $log, md5, $cordovaNetwork, $mmLang, $mmUtil,
        mmCoreWSCacheStore, mmCoreWSPrefix) {

        $log = $log.getInstance('$mmSite');

        /**
         * List of deprecated WS functions with their corresponding NOT deprecated name.
         *
         * When the function does not have an equivalent set its value to true.
         *
         * @type {Object}
         */
        var deprecatedFunctions = {
            "core_grade_get_definitions": "core_grading_get_definitions",
            "moodle_course_create_courses": "core_course_create_courses",
            "moodle_course_get_courses": "core_course_get_courses",
            "moodle_enrol_get_enrolled_users": "core_enrol_get_enrolled_users",
            "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
            "moodle_file_get_files": "core_files_get_files",
            "moodle_file_upload": "core_files_upload",
            "moodle_group_add_groupmembers": "core_group_add_group_members",
            "moodle_group_create_groups": "core_group_create_groups",
            "moodle_group_delete_groupmembers": "core_group_delete_group_members",
            "moodle_group_delete_groups": "core_group_delete_groups",
            "moodle_group_get_course_groups": "core_group_get_course_groups",
            "moodle_group_get_groupmembers": "core_group_get_group_members",
            "moodle_group_get_groups": "core_group_get_groups",
            "moodle_message_send_instantmessages": "core_message_send_instant_messages",
            "moodle_notes_create_notes": "core_notes_create_notes",
            "moodle_role_assign": "core_role_assign_role",
            "moodle_role_unassign": "core_role_unassign_role",
            "moodle_user_create_users": "core_user_create_users",
            "moodle_user_delete_users": "core_user_delete_users",
            "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
            "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
            // Both *_user_get_users_by_id are deprecated, but there is no equivalent available in the Mobile service.
            "moodle_user_get_users_by_id": "core_user_get_users_by_id",
            "moodle_user_update_users": "core_user_update_users",
            "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
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
        }

        /**
         * Can the user access their private files?
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#canAccessMyFiles
         * @return {Boolean} False when they cannot.
         */
        self.canAccessMyFiles = function() {
            var infos = self.getInfo();
            return infos && (typeof infos.usercanmanageownfiles === 'undefined' || infos.usercanmanageownfiles);
        };

        /**
         * Can the user download files?
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#canDownloadFiles
         * @return {Boolean} False when they cannot.
         */
        self.canDownloadFiles = function() {
            var infos = self.getInfo();
            return infos && infos.downloadfiles;
        };

        /**
         * Can the user upload files?
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#canUploadFiles
         * @return {Boolean} False when they cannot.
         */
        self.canUploadFiles = function() {
            var infos = self.getInfo();
            return infos && infos.uploadfiles;
        };

        /**
         * Fetch current site info from the Moodle site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#fetchSiteInfo
         * @return {Promise}        A promise to be resolved when the site info is retrieved.
         */
        self.fetchSiteInfo = function() {
            var deferred = $q.defer();

            if (!self.isLoggedIn()) {
                $mmLang.translateErrorAndReject(deferred, 'mm.login.notloggedin');
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
                self.read('moodle_webservice_get_siteinfo', {}, preSets).then(siteDataRetrieved, function(error) {
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
        };

        /**
         * Logouts a user from a site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#logout
         */
        self.logout = function() {
            currentSite = undefined;
        };

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
        };

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
        };

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
            if (typeof(currentSite) !== 'undefined' && currentSite.id == siteid) {
                self.logout();
            }
            return $mmDB.deleteDB('Site-' + siteid);
        };

        /**
         * Read some data from the Moodle site using WS. Requests are cached by default.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#logout
         * @param  {String} read  WS method to use.
         * @param  {Object} data    Data to send to the WS.
         * @param  {Object} preSets Options: getFromCache, saveToCache, omitExpires, sync.
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
            if (typeof(preSets.sync) === 'undefined') {
                preSets.sync = 0;
            }
            return self.request(method, data, preSets);
        };

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
            if (typeof(preSets.sync) === 'undefined') {
                preSets.sync = 0;
            }
            return self.request(method, data, preSets);
        };

        /**
         * WS request to the site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#request
         * @param {string} method The WebService method to be called.
         * @param {Object} data Arguments to pass to the method.
         * @param {Object} preSets Extra settings.
         *                    - getFromCache boolean (false) Use the cache when possible.
         *                    - saveToCache boolean (false) Save the call results to the cache.
         *                    - omitExpires boolean (false) Ignore cache expiry.
         *                    - sync boolean (false) Add call to queue if device is not connected.
         * @return {Promise}
         * @description
         *
         * Sends a webservice request to the site. This method will automatically add the
         * required parameters and pass it on to the low level API in $mmWS.call().
         *
         * Caching is also implemented, when enabled this method will returned a cached
         * version of itself rather than contacting the server.
         *
         * This method is smart which means that it will try to map the method to a
         * compatibility one if need be, usually that means that it will fallback on
         * the 'local_mobile_' prefixed function if it is available and the non-prefixed is not.
         */
        self.request = function(method, data, preSets) {
            var deferred = $q.defer();

            if (!self.isLoggedIn()) {
                $mmLang.translateErrorAndReject(deferred, 'mm.login.notloggedin');
                return deferred.promise;
            }

            // Get the method to use based on the available ones.
            method = getCompatibleFunction(method);

            // Check if the method is available, use a prefixed version if possible.
            // We ignore this check when we do not have the site info, as the list of functions is not loaded yet.
            if (self.getInfo() && !self.wsAvailable(method, false)) {
                if (self.wsAvailable(mmCoreWSPrefix + method, false)) {
                    $log.info("Using compatibility WS method '" + mmCoreWSPrefix + method + "'");
                    method = mmCoreWSPrefix + method;
                } else {
                    $log.error("WS function '" + method + "' is not available, even in compatibility mode.");
                    $mmLang.translateErrorAndReject(deferred, 'mm.core.wsfunctionnotavailable');
                    return deferred.promise;
                }
            }

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

                // TODO: Sync

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
        };

        /**
         * Check if a WS is available in the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#wsAvailable
         * @param  {String} method WS name.
         * @param  {Boolean=true} checkPrefix When true also checks with the compatibility prefix.
         * @return {Boolean}       True if the WS is available, false otherwise.
         * @description
         *
         * This method checks if a web service function is available. By default it will
         * also check if there is a compatibility function for it, e.g. a prefixed one.
         */
        self.wsAvailable = function(method, checkPrefix) {
            checkPrefix = (typeof checkPrefix === 'undefined') ? true : checkPrefix;

            if (!self.isLoggedIn() || typeof(currentSite.infos) == 'undefined') {
                return false;
            }

            for (var i = 0; i < currentSite.infos.functions.length; i++) {
                var f = currentSite.infos.functions[i];
                if (f.name == method) {
                    return true;
                }
            }

            // Let's try again with the compatibility prefix.
            if (checkPrefix) {
                return self.wsAvailable(mmCoreWSPrefix + method, false);
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
         * Get current site user's ID. If user is not logged in, return undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#getUserId
         * @return {Object} User's ID.
         */
        self.getUserId = function() {
            if (typeof(currentSite) !== 'undefined' && typeof(currentSite.infos) !== 'undefined'
                    && typeof(currentSite.infos.userid) !== 'undefined') {
                return currentSite.infos.userid;
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

        /*
         * Uploads a file using Cordova File API.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSite#uploadFile
         * @param {Object} uri File URI.
         * @param {Object} options File settings: fileKey, fileName and mimeType.
         * @return {Promise}
         */
        self.uploadFile = function(uri, options) {
            return $mmWS.uploadFile(uri, options, {
                siteurl: self.getURL(),
                token: self.getToken()
            });
        };

        /**
         * Return the function to be used, based on the available functions in the site. It'll try to use non-deprecated
         * functions first, and fallback to deprecated ones if needed.
         *
         * @param  {String} method WS function to check.
         * @return {String}        Method to use based in the available functions.
         */
        function getCompatibleFunction(method) {
            if (typeof deprecatedFunctions[method] !== "undefined") {
                // Deprecated function is being used. Warn the developer.
                if (self.wsAvailable(deprecatedFunctions[method])) {
                    $log.warn("You are using deprecated Web Services: " + method +
                        " you must replace it with the newer function: " + deprecatedFunctions[method]);
                    return deprecatedFunctions[method];
                } else {
                    $log.warn("You are using deprecated Web Services. " +
                        "Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
                }
            } else if (!self.wsAvailable(method)) {
                // Method not available. Check if there is a deprecated method to use.
                for (var oldFunc in deprecatedFunctions) {
                    if (deprecatedFunctions[oldFunc] === method && self.wsAvailable(oldFunc)) {
                        $log.warn("Your remote site doesn't support the function " + method +
                            ", it seems to be outdated, consider upgrade it to the latest Moodle version.");
                        return oldFunc; // Use deprecated function.
                    }
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
            db.get(mmCoreWSCacheStore, key).then(function(entry) {
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
                    db.insert(mmCoreWSCacheStore, entry);
                    deferred.resolve();

                }, deferred.reject);
            }

            return deferred.promise;
        }

        return self;
    };
});
