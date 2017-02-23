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

.config(function($mmSitesFactoryProvider, mmCoreWSCacheStore) {
    var stores = [
        {
            name: mmCoreWSCacheStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'key'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Provider to create sites instances.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmSitesFactory
 * @description
 * This provider is the interface with the DB database. The modules that need to store
 * information here need to register their stores.
 * Remote addons registering stores MUST call $mmSite#reloadDb.
 *
 * Example:
 *
 * .config(function($mmSitesFactoryProvider) {
 *      $mmSitesFactoryProvider.registerStore({
 *          name: 'courses',
 *          keyPath: 'id'
 *      });
 *  })
 *
 * The service $mmSitesFactory is used to create site instances. It's not intended to be used directly, its usage is
 * restricted to core. Developers should only use $mmSitesFactoryProvider, $mmSitesManager and $mmSite.
 */
.provider('$mmSitesFactory', function() {

    /** Define the site storage schema. */
    var siteSchema = {
            stores: []
        },
        dboptions = {
            autoSchema: true
        },
        supportWhereEqual;

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
        store.indexes = getIndexes(store.indexes);
        siteSchema.stores.push(store);
    };

    /**
     * Convenience function that translates indexes of a store keyPath values into generators if needed.
     *
     * @param  {Array} indexes Indexes Schema
     * @return {Array}         Indexes translated if needed.
     */
    function getIndexes(indexes) {
        if (!isWhereEqualSupported()) {
            var neededIndexes = {},
                uniqueIndexes = {};

            // Get compound indexes and add the individual ones if not added.
            angular.forEach(indexes, function(index) {
                if (index.keyPath) {
                    angular.forEach(index.keyPath, function(keyName) {
                        neededIndexes[keyName] = keyName;
                    });
                } else {
                    uniqueIndexes[index.name] = true;
                }
            });

            // Add needed indexes not added.
            angular.forEach(neededIndexes, function(index) {
                if (typeof uniqueIndexes[index] == "undefined") {
                    indexes.push({
                        name: index
                    });
                    uniqueIndexes[index] = true;
                }
            });
        } else {
            // Needs a generator instead of keyPath.
            angular.forEach(indexes, function(index) {
                if (index.keyPath) {
                    var path = index.keyPath;
                    index.generator = function(obj) {
                        var arr = [];
                        angular.forEach(path, function(keyName) {
                            arr.push(obj[keyName]);
                        });
                        return arr;
                    };
                    delete index.keyPath;
                }
            });
        }

        return indexes;
    }

    /**
     * Convenience function to check if WhereEqual is supported by the DB.
     *
     * @return {Boolean} If Where equal function will be supported by the device.
     */
    function isWhereEqualSupported() {
        if (typeof supportWhereEqual != "undefined") {
            return supportWhereEqual;
        }

        if (ionic.Platform.isIOS()) {
            supportWhereEqual = true;
            return true;
        }

        var isSafari = !ionic.Platform.isIOS() && !ionic.Platform.isAndroid() && navigator.userAgent.indexOf('Safari') != -1 &&
                            navigator.userAgent.indexOf('Chrome') == -1 && navigator.userAgent.indexOf('Firefox') == -1;
        supportWhereEqual = typeof IDBObjectStore != 'undefined' && typeof IDBObjectStore.prototype.count != 'undefined' &&
                            !isSafari;

        return supportWhereEqual;
    }

    /**
     * Register multiple stores at once.
     * IMPORTANT: Modifying the schema of an already existing store deletes all its data in WebSQL Storage.
     * If a store schema needs to be modified, the data should be manually migrated to the new store.
     * Remote addons registering stores MUST call $mmSite#reloadDb.
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

    this.$get = function($http, $q, $mmWS, $mmDB, $log, md5, $mmApp, $mmLang, $mmUtil, $mmFS, mmCoreWSCacheStore,
            mmCoreWSPrefix, mmCoreSessionExpired, $mmEvents, mmCoreEventSessionExpired, mmCoreUserDeleted, mmCoreEventUserDeleted,
            $mmText, $translate, mmCoreConfigConstants, mmCoreUserPasswordChangeForced, mmCoreEventPasswordChangeForced,
            mmCoreLoginTokenChangePassword, mmCoreSecondsMinute, mmCoreUserNotFullySetup, mmCoreEventUserNotFullySetup,
            mmCoreSitePolicyNotAgreed, mmCoreEventSitePolicyNotAgreed, mmCoreUnicodeNotSupported) {

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
            moodleReleases = {
                '2.4': 2012120300,
                '2.5': 2013051400,
                '2.6': 2013111800,
                '2.7': 2014051200,
                '2.8': 2014111000,
                '2.9': 2015051100,
                '3.0': 2015111600,
                '3.1': 2016052300,
                '3.2': 2016120500
            };

        /**
         * Site object to store site data.
         *
         * @param  {String} id             Site ID.
         * @param  {String} siteurl        Site URL.
         * @param  {String} token          User's token in the site.
         * @param  {Object} infos          Site's info.
         * @param  {String} [privateToken] User's private token.
         * @param  {Object} [config]       Site config.
         * @param  {Boolean} loggedOut     True if logged out and needs to authenticate again, false otherwise.
         * @return {Void}
         */
        function Site(id, siteurl, token, infos, privateToken, config, loggedOut) {
            this.id = id;
            this.siteurl = siteurl;
            this.token = token;
            this.infos = infos;
            this.privateToken = privateToken;
            this.config = config;
            this.loggedOut = !!loggedOut;
            this.cleanUnicode = false;

            if (this.id) {
                this.db = $mmDB.getDB('Site-' + this.id, siteSchema, dboptions);
            }
        }

        /**
         * Get site ID.
         *
         * @return {String} Current site ID.
         */
        Site.prototype.getId = function() {
            return this.id;
        };

        /**
         * Get site URL.
         *
         * @return {String} Current site URL.
         */
        Site.prototype.getURL = function() {
            return this.siteurl;
        };

        /**
         * Get site token.
         *
         * @return {String} Current site token.
         */
        Site.prototype.getToken = function() {
            return this.token;
        };

        /**
         * Get site info.
         *
         * @return {Object} Current site info.
         */
        Site.prototype.getInfo = function() {
            return this.infos;
        };

        /**
         * Get site private token.
         *
         * @return {String} Current site private token.
         */
        Site.prototype.getPrivateToken = function() {
            return this.privateToken;
        };

        /**
         * Get site DB.
         *
         * @return {Object} Current site DB.
         */
        Site.prototype.getDb = function() {
            return this.db;
        };

        /**
         * Reload the site database.
         * This must be used by remote addons that register stores in the site database.
         *
         * @return {Void}
         */
        Site.prototype.reloadDb = function() {
            if (this.db) {
                this.db = $mmDB.getDB('Site-' + this.id, siteSchema, dboptions, true);
            }
        };

        /**
         * Get site user's ID.
         *
         * @return {Object} User's ID.
         */
        Site.prototype.getUserId = function() {
            if (typeof this.infos != 'undefined' && typeof this.infos.userid != 'undefined') {
                return this.infos.userid;
            } else {
                return undefined;
            }
        };

        /**
         * Get site Course ID for frontpage course. If not declared it will return 1 as default.
         *
         * @return {Number} Site Home ID.
         */
        Site.prototype.getSiteHomeId = function() {
            return this.infos && this.infos.siteid || 1;
        };

        /**
         * Set site ID.
         *
         * @param {String} New ID.
         */
        Site.prototype.setId = function(id) {
            this.id = id;
            this.db = $mmDB.getDB('Site-' + this.id, siteSchema, dboptions);
        };

        /**
         * Set site token.
         *
         * @param {String} New token.
         */
        Site.prototype.setToken = function(token) {
            this.token = token;
        };

        /**
         * Set site private token.
         *
         * @param {String} privateToken New private token.
         */
        Site.prototype.setPrivateToken = function(privateToken) {
            this.privateToken = privateToken;
        };

        /**
         * Check if token is already expired using local data.
         *
         * @return {Boolean} is token is expired or not.
         * @deprecated since version 3.2.
         */
        Site.prototype.isTokenExpired = function() {
            return this.token == mmCoreLoginTokenChangePassword;
        };

        /**
         * Check if user logged out from the site and needs to authenticate again.
         *
         * @return {Boolean} Whether is logged out.
         */
        Site.prototype.isLoggedOut = function() {
            return !!this.loggedOut;
        };

        /**
         * Set site info.
         *
         * @param {Object} New info.
         */
        Site.prototype.setInfo = function(infos) {
            this.infos = infos;
        };

        /**
         * Set site config.
         *
         * @param {Object} Config.
         */
        Site.prototype.setConfig = function(config) {
            this.config = config;
        };

        /**
         * Set site logged out.
         *
         * @param  {Boolean} loggedOut True if logged out and needs to authenticate again, false otherwise.
         */
        Site.prototype.setLoggedOut = function(loggedOut) {
            this.loggedOut = !!loggedOut;
        };

        /**
         * Can the user access their private files?
         *
         * @return {Boolean} False when they cannot.
         */
        Site.prototype.canAccessMyFiles = function() {
            var infos = this.getInfo();
            return infos && (typeof infos.usercanmanageownfiles === 'undefined' || infos.usercanmanageownfiles);
        };

        /**
         * Can the user download files?
         *
         * @return {Boolean} False when they cannot.
         */
        Site.prototype.canDownloadFiles = function() {
            var infos = this.getInfo();
            return infos && infos.downloadfiles;
        };

        /**
         * Can the user use an advanced feature?
         *
         * @param {String} feature The name of the feature.
         * @param {Boolean} [whenUndefined=true] The value to return when the parameter is undefined
         * @return {Boolean} False when they cannot.
         */
        Site.prototype.canUseAdvancedFeature = function(feature, whenUndefined) {
            var infos = this.getInfo(),
                canUse = true;

            whenUndefined = (typeof whenUndefined === 'undefined') ? true : whenUndefined;

            if (typeof infos.advancedfeatures === 'undefined') {
                canUse = whenUndefined;
            } else {

                angular.forEach(infos.advancedfeatures, function(item) {
                    if (item.name === feature && parseInt(item.value, 10) === 0) {
                        canUse = false;
                    }
                });

            }

            return canUse;
        };

        /**
         * Can the user upload files?
         *
         * @return {Boolean} False when they cannot.
         */
        Site.prototype.canUploadFiles = function() {
            var infos = this.getInfo();
            return infos && infos.uploadfiles;
        };

        /**
         * Fetch site info from the Moodle site.
         *
         * @return {Promise} A promise to be resolved when the site info is retrieved.
         */
        Site.prototype.fetchSiteInfo = function() {
            var deferred = $q.defer(),
                site = this;

            // get_site_info won't be cached.
            var preSets = {
                getFromCache: 0,
                saveToCache: 0
            };

            // Reset clean Unicode to check if it's supported again.
            site.cleanUnicode = false;

            site.read('core_webservice_get_site_info', {}, preSets).then(deferred.resolve, function(error) {
                site.read('moodle_webservice_get_siteinfo', {}, preSets).then(deferred.resolve, function(error) {
                    deferred.reject(error);
                });
            });

            return deferred.promise;
        };

        /**
         * Read some data from the Moodle site using WS. Requests are cached by default.
         *
         * @param  {String} read  WS method to use.
         * @param  {Object} data    Data to send to the WS.
         * @param  {Object} preSets Options: @see Site#request.
         * @return {Promise}        Promise to be resolved when the request is finished.
         */
        Site.prototype.read = function(method, data, preSets) {
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
            return this.request(method, data, preSets);
        };

        /**
         * Sends some data to the Moodle site using WS. Requests are NOT cached by default.
         *
         * @param  {String} method  WS method to use.
         * @param  {Object} data    Data to send to the WS.
         * @param  {Object} preSets Options: @see Site#request.
         * @return {Promise}        Promise to be resolved when the request is finished.
         */
        Site.prototype.write = function(method, data, preSets) {
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
            if (typeof(preSets.emergencyCache) === 'undefined') {
                preSets.emergencyCache = 0;
            }
            return this.request(method, data, preSets);
        };

        /**
         * WS request to the site.
         *
         * @param {string} method The WebService method to be called.
         * @param {Object} data Arguments to pass to the method.
         * @param {Object} preSets Extra settings.
         *                    - getFromCache boolean (false) Use the cache when possible.
         *                    - saveToCache boolean (false) Save the call results to the cache.
         *                    - omitExpires boolean (false) Ignore cache expiry.
         *                    - emergencyCache boolean (true) If possible, use the cache when the request fails.
         *                    - sync boolean (false) Add call to queue if device is not connected.
         *                    - cacheKey (string) Extra key to add to the cache when storing this call. This key is to
         *                                        flag the cache entry, it doesn't affect the data retrieved in this call.
         *                    - getCacheUsingCacheKey (boolean) True if it should retrieve cached data by cacheKey,
         *                                        false if it should get the data based on the params passed (usual behavior).
         *                    - getEmergencyCacheUsingCacheKey (boolean) True to retrieve emergency cached data by cacheKey,
         *                                        false if it should get the data based on the params passed (usual behavior).
         *                    - uniqueCacheKey (boolean) True if there should only be 1 entry for this cache key, so all the
         *                                        cache entries with the same cache key will be deleted.
         *                    - filter boolean (true) True to filter WS response (moodlewssettingfilter), false otherwise.
         *                    - rewriteurls boolean (true) True to rewrite URLs (moodlewssettingfileurl), false otherwise.
         * @param {Boolean} retrying True if we're retrying the call for some reason. This is to prevent infinite loops.
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
        Site.prototype.request = function(method, data, preSets, retrying) {
            var site = this,
                initialToken = site.token;
            data = data || {};

            // Get the method to use based on the available ones.
            method = site.getCompatibleFunction(method);

            // Check if the method is available, use a prefixed version if possible.
            // We ignore this check when we do not have the site info, as the list of functions is not loaded yet.
            if (site.getInfo() && !site.wsAvailable(method, false)) {
                if (site.wsAvailable(mmCoreWSPrefix + method, false)) {
                    $log.info("Using compatibility WS method '" + mmCoreWSPrefix + method + "'");
                    method = mmCoreWSPrefix + method;
                } else {
                    $log.error("WS function '" + method + "' is not available, even in compatibility mode.");
                    return $mmLang.translateAndReject('mm.core.wsfunctionnotavailable');
                }
            }

            preSets = angular.copy(preSets) || {};
            preSets.wstoken = site.token;
            preSets.siteurl = site.siteurl;
            preSets.cleanUnicode = site.cleanUnicode;

            if (preSets.cleanUnicode && $mmText.hasUnicodeData(data)) {
                // Data will be cleaned, notify the user.
                // @todo: Detect if the call is a syncing call and not notify.
                $mmUtil.showToast('mm.core.unicodenotsupported', true, 3000);
            } else {
                // No need to clean data in this call.
                preSets.cleanUnicode = false;
            }

            // Enable text filtering by default.
            data.moodlewssettingfilter = preSets.filter === false ? false : true;
            data.moodlewssettingfileurl = preSets.rewriteurls === false ? false : true;

            return getFromCache(site, method, data, preSets).catch(function() {
                // Do not pass those options to the core WS factory.
                var wsPreSets = angular.copy(preSets);
                delete wsPreSets.getFromCache;
                delete wsPreSets.saveToCache;
                delete wsPreSets.omitExpires;
                delete wsPreSets.cacheKey;
                delete wsPreSets.emergencyCache;
                delete wsPreSets.getCacheUsingCacheKey;
                delete wsPreSets.getEmergencyCacheUsingCacheKey;
                delete wsPreSets.uniqueCacheKey;

                // @todo Sync

                return $mmWS.call(method, data, wsPreSets).then(function(response) {

                    if (preSets.saveToCache) {
                        saveToCache(site, method, data, response, preSets);
                    }

                    // We pass back a clone of the original object, this may
                    // prevent errors if in the callback the object is modified.
                    return angular.copy(response);
                }).catch(function(error) {
                    if (error === mmCoreSessionExpired) {
                        if (initialToken !== site.token && !retrying) {
                            // Token has changed, retry with the new token.
                            return site.request(method, data, preSets, true);
                        } else if ($mmApp.isSSOAuthenticationOngoing()) {
                            // There's an SSO authentication ongoing, wait for it to finish and try again.
                            return $mmApp.waitForSSOAuthentication().then(function() {
                                return site.request(method, data, preSets, true);
                            });
                        }

                        // Session expired, trigger event.
                        $mmEvents.trigger(mmCoreEventSessionExpired, {siteid: site.id});
                        // Change error message. We'll try to get data from cache.
                        error = $translate.instant('mm.core.lostconnection');
                    } else if (error === mmCoreUserDeleted) {
                        // User deleted, trigger event.
                        $mmEvents.trigger(mmCoreEventUserDeleted, {siteid: site.id, params: data});
                        return $mmLang.translateAndReject('mm.core.userdeleted');
                    } else if (error === mmCoreUserPasswordChangeForced) {
                        // Password Change Forced, trigger event.
                        $mmEvents.trigger(mmCoreEventPasswordChangeForced, site.id);
                        return $mmLang.translateAndReject('mm.core.forcepasswordchangenotice');
                    } else if (error === mmCoreUserNotFullySetup) {
                        // User not fully setup, trigger event.
                        $mmEvents.trigger(mmCoreEventUserNotFullySetup, site.id);
                        return $mmLang.translateAndReject('mm.core.usernotfullysetup');
                    } else if (error === mmCoreSitePolicyNotAgreed) {
                        // Site policy not agreed, trigger event.
                        $mmEvents.trigger(mmCoreEventSitePolicyNotAgreed, site.id);
                        return $mmLang.translateAndReject('mm.login.sitepolicynotagreederror');
                    } else if (error === mmCoreUnicodeNotSupported) {
                        if (!site.cleanUnicode) {
                            // Try again cleaning unicode.
                            site.cleanUnicode = true;
                            return site.request(method, data, preSets);
                        }
                        // This should not happen.
                        return $mmLang.translateAndReject('mm.core.unicodenotsupported');
                    } else if (typeof preSets.emergencyCache !== 'undefined' && !preSets.emergencyCache) {
                        $log.debug('WS call ' + method + ' failed. Emergency cache is forbidden, rejecting.');
                        return $q.reject(error);
                    }

                    $log.debug('WS call ' + method + ' failed. Trying to use the emergency cache.');
                    preSets.omitExpires = true;
                    preSets.getFromCache = true;
                    return getFromCache(site, method, data, preSets, true).catch(function() {
                        return $q.reject(error);
                    });
                });
            });
        };

        /**
         * Check if a WS is available in this site.
         *
         * @param  {String} method WS name.
         * @param  {Boolean=true} checkPrefix When true also checks with the compatibility prefix.
         * @return {Boolean}       True if the WS is available, false otherwise.
         * @description
         *
         * This method checks if a web service function is available. By default it will
         * also check if there is a compatibility function for it, e.g. a prefixed one.
         */
        Site.prototype.wsAvailable = function(method, checkPrefix) {
            checkPrefix = (typeof checkPrefix === 'undefined') ? true : checkPrefix;

            if (typeof this.infos == 'undefined') {
                return false;
            }

            for (var i = 0; i < this.infos.functions.length; i++) {
                var f = this.infos.functions[i];
                if (f.name == method) {
                    return true;
                }
            }

            // Let's try again with the compatibility prefix.
            if (checkPrefix) {
                return this.wsAvailable(mmCoreWSPrefix + method, false);
            }

            return false;
        };

        /*
         * Uploads a file using Cordova File API.
         *
         * @param {Object} uri File URI.
         * @param {Object} options File settings: fileKey, fileName and mimeType.
         * @return {Promise}
         */
        Site.prototype.uploadFile = function(uri, options) {
            if (!options.fileArea) {
                if (this.isVersionGreaterEqualThan('3.1')) {
                    // From Moodle 3.1 only draft is allowed.
                    options.fileArea = 'draft';
                } else {
                    options.fileArea = 'private';
                }
            }

            return $mmWS.uploadFile(uri, options, {
                siteurl: this.siteurl,
                token: this.token
            });
        };

        /**
         * Invalidates all the cache entries.
         *
         * @return {Promise} Promise resolved when the cache entries are invalidated.
         */
        Site.prototype.invalidateWsCache = function() {
            var db = this.db;
            if (!db) {
                return $q.reject();
            }

            $log.debug('Invalidate all the cache for site: '+ this.id);
            return db.getAll(mmCoreWSCacheStore).then(function(entries) {
                if (entries && entries.length > 0) {
                    return invalidateWsCacheEntries(db, entries);
                }
            });
        };

        /**
         * Invalidates all the cache entries with a certain key.
         *
         * @param  {String} key Key to search.
         * @return {Promise}    Promise resolved when the cache entries are invalidated.
         */
        Site.prototype.invalidateWsCacheForKey = function(key) {
            var db = this.db;
            if (!db || !key) {
                return $q.reject();
            }

            $log.debug('Invalidate cache for key: '+key);
            return db.whereEqual(mmCoreWSCacheStore, 'key', key).then(function(entries) {
                if (entries && entries.length > 0) {
                    return invalidateWsCacheEntries(db, entries);
                }
            });
        };

        /**
         * Invalidates all the cache entries in an array of keys.
         *
         * @param  {Array} keys Keys to search.
         * @return {Promise}    Promise resolved when the cache entries are invalidated.
         */
        Site.prototype.invalidateMultipleWsCacheForKey = function(keys) {
            var db = this.db;
            if (!db) {
                return $q.reject();
            }

            var allEntries = [],
                promises = [];

            $log.debug('Invalidating multiple cache keys');
            angular.forEach(keys, function(key) {
                if (key) {
                    promises.push(db.whereEqual(mmCoreWSCacheStore, 'key', key).then(function(entries) {
                        if (entries && entries.length > 0) {
                            allEntries.concat(entries);
                        }
                    }));
                }
            });

            return $q.all(promises).then(function() {
                return invalidateWsCacheEntries(db, allEntries);
            });
        };

        /**
         * Invalidates all the cache entries whose key starts with a certain value.
         *
         * @param  {String} key Key to search.
         * @return {Promise}    Promise resolved when the cache entries are invalidated.
         */
        Site.prototype.invalidateWsCacheForKeyStartingWith = function(key) {
            var db = this.db;
            if (!db || !key) {
                return $q.reject();
            }

            $log.debug('Invalidate cache for key starting with: '+key);
            return db.where(mmCoreWSCacheStore, 'key', '^', key).then(function(entries) {
                if (entries && entries.length > 0) {
                    return invalidateWsCacheEntries(db, entries);
                }
            });
        };

        /**
         * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
         * Uses $mmUtil.fixPluginfileURL, passing site's token.
         *
         * @param {String} url   The url to be fixed.
         * @return {String}      Fixed URL.
         */
        Site.prototype.fixPluginfileURL = function(url) {
            return $mmUtil.fixPluginfileURL(url, this.token);

        };

        /**
         * Deletes site's DB.
         *
         * @return {Promise} Promise to be resolved when the DB is deleted.
         */
        Site.prototype.deleteDB = function() {
            return $mmDB.deleteDB('Site-' + this.id);
        };

        /**
         * Deletes site's folder.
         *
         * @return {Promise} Promise to be resolved when the DB is deleted.
         */
        Site.prototype.deleteFolder = function() {
            if ($mmFS.isAvailable()) {
                var siteFolder = $mmFS.getSiteFolder(this.id);
                return $mmFS.removeDir(siteFolder).catch(function() {
                    // Ignore any errors, $mmFS.removeDir fails if folder doesn't exists.
                });
            } else {
                return $q.when();
            }
        };

        /**
         * Get space usage of the site.
         *
         * @return {Promise} Promise resolved with the site space usage (size).
         */
        Site.prototype.getSpaceUsage = function() {
            if ($mmFS.isAvailable()) {
                var siteFolderPath = $mmFS.getSiteFolder(this.id);
                return $mmFS.getDirectorySize(siteFolderPath).catch(function() {
                    return 0;
                });
            } else {
                return $q.when(0);
            }
        };

        /**
         * Returns the URL to the documentation of the app, based on Moodle version and current language.
         *
         * @param {String} [page]    Docs page to go to.
         * @return {Promise}         Promise resolved with the Moodle docs URL.
         */
        Site.prototype.getDocsUrl = function(page) {
            var release = this.infos.release ? this.infos.release : undefined;
            return $mmUtil.getDocsUrl(release, page);
        };

        /**
         * Check if the local_mobile plugin is installed in the Moodle site.
         * This plugin provide extended services.
         *
         * @param {Boolean} retrying True if we're retrying the check.
         * @return {Promise}         Promise resolved when the check is done. Resolve params:
         *                                   - {Number} code Code to identify the authentication method to use.
         *                                   - {String} [service] If defined, name of the service to use.
         *                                   - {String} [warning] If defined, code of the warning message.
         *                                   - {Boolean} [coresupported] Whether core SSO is supported.
         */
        Site.prototype.checkLocalMobilePlugin = function(retrying) {
            var siteurl = this.siteurl,
                self = this,
                service = mmCoreConfigConstants.wsextservice;

            if (!service) {
                // External service not defined.
                return $q.when({code: 0});
            }

            return $http.post(siteurl + '/local/mobile/check.php', {service: service}).then(function(response) {
                var data = response.data;

                if (typeof data != 'undefined' && data.errorcode === 'requirecorrectaccess') {
                    if (!retrying) {
                        self.siteurl = $mmText.addOrRemoveWWW(siteurl);
                        return self.checkLocalMobilePlugin(true);
                    } else {
                        return $q.reject(data.error);
                    }
                } else if (typeof data == 'undefined' || typeof data.code == 'undefined') {
                    // local_mobile returned something we didn't expect. Let's assume it's not installed.
                    return {code: 0, warning: 'mm.login.localmobileunexpectedresponse'};
                }

                var code = parseInt(data.code, 10);
                if (data.error) {
                    switch (code) {
                        case 1:
                            // Site in maintenance mode.
                            return $mmLang.translateAndReject('mm.login.siteinmaintenance');
                        case 2:
                            // Web services not enabled.
                            return $mmLang.translateAndReject('mm.login.webservicesnotenabled');
                        case 3:
                            // Extended service not enabled, but the official is enabled.
                            return {code: 0};
                        case 4:
                            // Neither extended or official services enabled.
                            return $mmLang.translateAndReject('mm.login.mobileservicesnotenabled');
                        default:
                            return $mmLang.translateAndReject('mm.core.unexpectederror');
                    }
                } else {
                    return {code: code, service: service, coresupported: !!data.coresupported};
                }
            }, function() {
                return {code: 0};
            });
        };

        /**
         * Check if local_mobile has been installed in Moodle.
         *
         * @return {Boolean} If App is able to use local_mobile plugin.
         */
        Site.prototype.checkIfAppUsesLocalMobile = function() {
            var appUsesLocalMobile = false;
            angular.forEach(this.infos.functions, function(func) {
                if (func.name.indexOf(mmCoreWSPrefix) != -1) {
                    appUsesLocalMobile = true;
                }
            });

            return appUsesLocalMobile;
        };

        /**
         * Check if local_mobile has been installed in Moodle but the app is not using it.
         *
         * @return {Promise} Promise resolved it local_mobile was added, rejected otherwise.
         */
        Site.prototype.checkIfLocalMobileInstalledAndNotUsed = function() {
            var appUsesLocalMobile = this.checkIfAppUsesLocalMobile();

            if (appUsesLocalMobile) {
                // App already uses local_mobile, it wasn't added.
                return $q.reject();
            }

            return this.checkLocalMobilePlugin().then(function(data) {
                if (typeof data.service == 'undefined') {
                    // local_mobile NOT installed. Reject.
                    return $q.reject();
                }
                return data;
            });
        };

        /**
         * Check if a URL belongs to this site.
         *
         * @param  {String}  url URL to check.
         * @return {Boolean}     True if URL belongs to this site, false otherwise.
         */
        Site.prototype.containsUrl = function(url) {
            if (!url) {
                return false;
            }
            var siteurl = $mmText.removeProtocolAndWWW(this.siteurl);
            url = $mmText.removeProtocolAndWWW(url);
            return url.indexOf(siteurl) == 0;
        };

        /**
         * Get the public config of this site.
         *
         * @return {Promise} Promise resolved with site public config. Rejected with an object if error, see $mmWS#callAjax.
         */
        Site.prototype.getPublicConfig = function() {
            var that = this;
            return $mmWS.callAjax('tool_mobile_get_public_config', {}, {siteurl: this.siteurl}).then(function(config) {
                // Use the wwwroot returned by the server.
                if (config.httpswwwroot) {
                    that.siteurl = config.httpswwwroot;
                }
                return config;
            });
        };

        /**
         * Open a URL in browser using auto-login in the Moodle site if available.
         *
         * @param  {String} url            The URL to open.
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openInBrowserWithAutoLogin = function(url, alertMessage) {
            return this.openWithAutoLogin(false, url, undefined, alertMessage);
        };

        /**
         * Open a URL in browser using auto-login in the Moodle site if available and the URL belongs to the site.
         *
         * @param  {String} url            The URL to open.
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openInBrowserWithAutoLoginIfSameSite = function(url, alertMessage) {
            return this.openWithAutoLoginIfSameSite(false, url, undefined, alertMessage);
        };

        /**
         * Open a URL in inappbrowser using auto-login in the Moodle site if available.
         *
         * @param  {String} url            The URL to open.
         * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openInAppWithAutoLogin = function(url, options, alertMessage) {
            return this.openWithAutoLogin(true, url, options, alertMessage);
        };

        /**
         * Open a URL in inappbrowser using auto-login in the Moodle site if available and the URL belongs to the site.
         *
         * @param  {String} url            The URL to open.
         * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openInAppWithAutoLoginIfSameSite = function(url, options, alertMessage) {
            return this.openWithAutoLoginIfSameSite(true, url, options, alertMessage);
        };

        /**
         * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available.
         *
         * @param  {Boolean} inApp         True to open it in InAppBrowser, false to open in browser.
         * @param  {String} url            The URL to open.
         * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open.
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openWithAutoLogin = function(inApp, url, options, alertMessage) {
            if (!this.privateToken || !this.wsAvailable('tool_mobile_get_autologin_key') ||
                    (this.lastAutoLogin && $mmUtil.timestamp() - this.lastAutoLogin < 6 * mmCoreSecondsMinute)) {
                // No private token, WS not available or last auto-login was less than 6 minutes ago.
                // Open the final URL without auto-login.
                return open(url);
            }

            var that = this,
                userId = that.getUserId(),
                params = {
                    privatetoken: that.privateToken
                },
                modal = $mmUtil.showModalLoading();

            // Use write to not use cache.
            return that.write('tool_mobile_get_autologin_key', params).then(function(data) {
                if (!data.autologinurl || !data.key) {
                    // Not valid data, open the final URL without auto-login.
                    return open(url);
                }

                that.lastAutoLogin = $mmUtil.timestamp();

                return open(data.autologinurl + '?userid=' + userId + '&key=' + data.key + '&urltogo=' + url);
            }).catch(function() {
                // Couldn't get autologin key, open the final URL without auto-login.
                return open(url);
            });

            function open(url) {
                if (modal) {
                    modal.dismiss();
                }

                var promise;
                if (alertMessage) {
                    promise = $mmUtil.showModal('mm.core.notice', alertMessage, 3000);
                } else {
                    promise = $q.when();
                }

                return promise.finally(function() {
                    if (inApp) {
                        $mmUtil.openInApp(url, options);
                    } else {
                        $mmUtil.openInBrowser(url);
                    }
                });
            }
        };

        /**
         * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available and the URL belongs to the site.
         *
         * @param  {Boolean} inApp         True to open it in InAppBrowser, false to open in browser.
         * @param  {String} url            The URL to open.
         * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open.
         * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
         * @return {Promise}               Promise resolved when done, rejected otherwise.
         */
        Site.prototype.openWithAutoLoginIfSameSite = function(inApp, url, options, alertMessage) {
            if (this.containsUrl(url)) {
                return this.openWithAutoLogin(inApp, url, options, alertMessage);
            } else {
                if (inApp) {
                    $mmUtil.openInApp(url, options);
                } else {
                    $mmUtil.openInBrowser(url);
                }
                return $q.when();
            }
        };

        /**
         * Get the config of this site.
         * It is recommended to use getStoredConfig instead since it's faster and doesn't use network.
         *
         * @param {String}  [name]        Name of the setting to get. If not set or false, all settings will be returned.
         * @param {Boolean} [ignoreCache] True if it should ignore cached data.
         * @return {Promise}              Promise resolved with site config. Rejected with an object if error.
         */
        Site.prototype.getConfig = function(name, ignoreCache) {
            var site = this;

            var preSets = {
                cacheKey: getConfigCacheKey()
            };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('tool_mobile_get_config', {}, preSets).then(function(config) {
                if (name) {
                    // Return the requested setting.
                    for (var x in config.settings) {
                        if (config.settings[x].name == name) {
                            return config.settings[x].value;
                        }
                    }
                    return $q.reject();
                } else {
                    // Return all settings in the same array.
                    var settings = {};
                    angular.forEach(config.settings, function(setting) {
                        settings[setting.name] = setting.value;
                    });
                    return settings;
                }
            });
        };

        /**
         * Invalidates config WS call.
         *
         * @return {Promise}        Promise resolved when the data is invalidated.
         */
        Site.prototype.invalidateConfig = function() {
            var site = this;
            return site.invalidateWsCacheForKey(getConfigCacheKey());
        };

        /**
         * Get cache key for getConfig WS calls.
         *
         * @return {String} Cache key.
         */
        function getConfigCacheKey() {
            return 'tool_mobile_get_config';
        }

        /**
         * Get the stored config of this site.
         *
         * @param {String} [name] Name of the setting to get. If not set or false, all settings will be returned.
         * @return {Object}       Site config or a specific setting.
         */
        Site.prototype.getStoredConfig = function(name) {
            if (!this.config) {
                return;
            }

            if (name) {
                return this.config[name];
            } else {
                return this.config;
            }
        };

        /**
         * Check if a certain feature is disabled in the site.
         *
         * @param {String} name Name of the feature to check.
         * @return {Boolean}    True if disabled, false otherwise.
         */
        Site.prototype.isFeatureDisabled = function(name) {
            var disabledFeatures = this.getStoredConfig('tool_mobile_disabledfeatures');
            if (!disabledFeatures) {
                return false;
            }

            var regEx = new RegExp('(,|^)' + $mmText.escapeForRegex(name) + '(,|$)', 'g');
            return !!disabledFeatures.match(regEx);
        };

        /**
         * Invalidate entries from the cache.
         *
         * @param  {Object} db      DB the entries belong to.
         * @param  {Array}  entries Entries to invalidate.
         * @return {Promise}        Promise resolved when the cache entries are invalidated.
         */
        function invalidateWsCacheEntries(db, entries) {
            var promises = [];
            angular.forEach(entries, function(entry) {
                if (entry.expirationtime > 0) {
                    entry.expirationtime = 0;
                    promises.push(db.insert(mmCoreWSCacheStore, entry));
                }
            });
            return $q.all(promises);
        }

        /**
         * Return the function to be used, based on the available functions in the site. It'll try to use non-deprecated
         * functions first, and fallback to deprecated ones if needed.
         *
         * @param  {String} method WS function to check.
         * @return {String}        Method to use based in the available functions.
         */
        Site.prototype.getCompatibleFunction = function(method) {
            if (typeof deprecatedFunctions[method] !== "undefined") {
                // Deprecated function is being used. Warn the developer.
                if (this.wsAvailable(deprecatedFunctions[method])) {
                    $log.warn("You are using deprecated Web Services: " + method +
                        " you must replace it with the newer function: " + deprecatedFunctions[method]);
                    return deprecatedFunctions[method];
                } else {
                    $log.warn("You are using deprecated Web Services. " +
                        "Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
                }
            } else if (!this.wsAvailable(method)) {
                // Method not available. Check if there is a deprecated method to use.
                for (var oldFunc in deprecatedFunctions) {
                    if (deprecatedFunctions[oldFunc] === method && this.wsAvailable(oldFunc)) {
                        $log.warn("Your remote site doesn't support the function " + method +
                            ", it seems to be outdated, consider upgrade it to the latest Moodle version.");
                        return oldFunc; // Use deprecated function.
                    }
                }
            }
            return method;
        };

        /**
         * Check if the site version is greater than one or some versions.
         * This function accepts a string or an array of strings. If array, the last version must be the highest.
         *
         * @param  {Mixed} versions Version or list of versions to check.
         * @return {Boolean}        True if greater or equal, false otherwise.
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
        Site.prototype.isVersionGreaterEqualThan = function(versions) {
            var siteVersion = parseInt(this.getInfo().version, 10);

            if (angular.isArray(versions)) {
                if (!versions.length) {
                    return false;
                }

                for (var i = 0; i < versions.length; i++) {
                    var versionNumber = getVersionNumber(versions[i]);
                    if (i == versions.length - 1) {
                        // It's the last version, check only if site version is greater than this one.
                        return siteVersion >= versionNumber;
                    } else {
                        // Check if site version if bigger than this number but lesser than next major.
                        if (siteVersion >= versionNumber && siteVersion < getNextMajorVersionNumber(versions[i])) {
                            return true;
                        }
                    }
                }
            } else if (typeof versions == 'string') {
                // Compare with this version.
                return siteVersion >= getVersionNumber(versions);
            }

            return false;
        };

        /**
         * Get a version number from a release version.
         * If release version is valid but not found in the list of Moodle releases, it will use the last released major version.
         *
         * @param  {String} version Release version to convert to version number.
         * @return {Number}         Version number, 0 if invalid.
         */
        function getVersionNumber(version) {
            var data = getMajorAndMinor(version);

            if (!data) {
                // Invalid version.
                return 0;
            }

            if (typeof moodleReleases[data.major] == 'undefined') {
                // Major version not found. Use the last one.
                data.major = Object.keys(moodleReleases).slice(-1);
            }

            return moodleReleases[data.major] + data.minor;
        }

        /**
         * Given a release version, return the major and minor versions.
         *
         * @param  {String} version Release version (e.g. '3.1.0').
         * @return {Object}         Object with major and minor. Returns false if invalid version.
         */
        function getMajorAndMinor(version) {
            var match = version.match(/(\d)+(?:\.(\d)+)?(?:\.(\d)+)?/);
            if (!match || !match[1]) {
                // Invalid version.
                return false;
            }

            return {
                major: match[1] + '.' + (match[2] || '0'),
                minor: parseInt(match[3] || 0, 10)
            };
        }

        /**
         * Given a release version, return the next major version number.
         *
         * @param  {String} version Release version (e.g. '3.1.0').
         * @return {Number}         Next major version number.
         */
        function getNextMajorVersionNumber(version) {
            var data = getMajorAndMinor(version),
                position,
                releases = Object.keys(moodleReleases);

            if (!data) {
                // Invalid version.
                return 0;
            }

            position = releases.indexOf(data.major);

            if (position == -1 || position == releases.length -1) {
                // Major version not found or it's the last one. Use the last one.
                return moodleReleases[releases[position]];
            }

            return moodleReleases[releases[position + 1]];
        }

        /**
         * Get cache ID.
         *
         * @param  {String} method     The WebService method.
         * @param  {Object} data       Arguments to pass to the method.
         * @return {String}            Cache ID.
         */
        function getCacheId(method, data) {
            return md5.createHash(method + ':' + JSON.stringify(data));
        }

        /**
         * Get a WS response from cache.
         *
         * @param  {Object} site       Site.
         * @param  {String} method     The WebService method.
         * @param  {Object} data       Arguments to pass to the method.
         * @param  {Object} preSets    Extra settings.
         * @param  {Boolean} emergency True if it's an "emergency" cache call (WS call failed).
         * @return {Promise}           Promise to be resolved with the WS response.
         */
        function getFromCache(site, method, data, preSets, emergency) {
            var db = site.db,
                id = getCacheId(method, data),
                promise;

            if (!db || !preSets.getFromCache) {
                return $q.reject();
            }

            if (preSets.getCacheUsingCacheKey || (emergency && preSets.getEmergencyCacheUsingCacheKey)) {
                promise = db.whereEqual(mmCoreWSCacheStore, 'key', preSets.cacheKey).then(function(entries) {
                    if (!entries.length) {
                        // Cache key not found, get by params sent.
                        return db.get(mmCoreWSCacheStore, id);
                    } else if (entries.length > 1) {
                        // More than one entry found. Search the one with same ID as this call.
                        for (var i = 0, len = entries.length; i < len; i++) {
                            var entry = entries[i];
                            if (entry.id == id) {
                                return entry;
                            }
                        }
                    }
                    return entries[0];
                });
            } else {
                promise = db.get(mmCoreWSCacheStore, id);
            }

            return promise.then(function(entry) {
                var now = new Date().getTime();

                preSets.omitExpires = preSets.omitExpires || !$mmApp.isOnline();

                if (!preSets.omitExpires) {
                    if (now > entry.expirationtime) {
                        $log.debug('Cached element found, but it is expired');
                        return $q.reject();
                    }
                }

                if (typeof entry != 'undefined' && typeof entry.data != 'undefined') {
                    var expires = (entry.expirationtime - now) / 1000;
                    $log.info('Cached element found, id: ' + id + ' expires in ' + expires + ' seconds');
                    return entry.data;
                }

                return $q.reject();
            });
        }

        /**
         * Save a WS response to cache.
         *
         * @param  {Object} site     Site.
         * @param  {String} method   The WebService method.
         * @param  {Object} data     Arguments to pass to the method.
         * @param  {Object} response WS call response.
         * @param  {Object} preSets  Extra settings.
         * @return {Promise}         Promise to be resolved when the response is saved.
         */
        function saveToCache(site, method, data, response, preSets) {
            var db = site.db,
                id = getCacheId(method, data),
                cacheExpirationTime = mmCoreConfigConstants.cache_expiration_time,
                promise,
                entry = {
                    id: id,
                    data: response
                };

            if (!db) {
                return $q.reject();
            } else {
                if (preSets.uniqueCacheKey) {
                    // Cache key must be unique, delete all entries with same cache key.
                    promise = deleteFromCache(site, method, data, preSets, true).catch(function() {
                        // Ignore errors.
                    });
                } else {
                    promise = $q.when();
                }

                return promise.then(function() {
                    cacheExpirationTime = isNaN(cacheExpirationTime) ? 300000 : cacheExpirationTime;
                    entry.expirationtime = new Date().getTime() + cacheExpirationTime;
                    if (preSets.cacheKey) {
                        entry.key = preSets.cacheKey;
                    }
                    return db.insert(mmCoreWSCacheStore, entry);
                });
            }
        }

        /**
         * Delete a WS cache entry or entries.
         *
         * @param  {Object} site         Site.
         * @param  {String} method       The WebService method.
         * @param  {Object} data         Arguments to pass to the method.
         * @param  {Object} preSets      Extra settings.
         * @param  {Boolean} allCacheKey True to delete all entries with the cache key, false to delete only by ID.
         * @return {Promise}             Promise to be resolved when the entries are deleted.
         */
        function deleteFromCache(site, method, data, preSets, allCacheKey) {
            var db = site.db,
                id = getCacheId(method, data);

            if (!db) {
                return $q.reject();
            } else {
                if (allCacheKey) {
                    return db.whereEqual(mmCoreWSCacheStore, 'key', preSets.cacheKey).then(function(entries) {
                        var promises = [];

                        angular.forEach(entries, function(entry) {
                            promises.push(db.remove(mmCoreWSCacheStore, entry.id));
                        });

                        return $q.all(promises);
                    });
                } else {
                    return db.remove(mmCoreWSCacheStore, id);
                }
            }
        }

        /**
         * Make a site object.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSitesFactory#makeSite
         * @param  {String} id             Site ID.
         * @param  {String} siteurl        Site URL.
         * @param  {String} token          User's token in the site.
         * @param  {Object} infos          Site's info.
         * @param  {String} [privateToken] User's private token.
         * @param  {Object} [config]       Site config.
         * @param  {Boolean} loggedOut     True if logged out and needs to authenticate again, false otherwise.
         * @return {Object}                The current site object.
         * @description
         * This returns a site object.
         */
        self.makeSite = function(id, siteurl, token, infos, privateToken, config, loggedOut) {
            return new Site(id, siteurl, token, infos, privateToken, config, loggedOut);
        };

        /**
         * Gets the list of Site methods.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmSitesFactory#getSiteMethods
         * @return {Array} List of methods.
         */
        self.getSiteMethods = function() {
            var methods = [];
            for (var name in Site.prototype) {
                methods.push(name);
            }
            return methods;
        };

        return self;
    };
});
