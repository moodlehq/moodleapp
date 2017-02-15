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
 * Service to provide functionalities related to current site.
 *
 * @module mm.core
 * @ngdoc factory
 * @name $mmSite
 * @description
 * This services provides a set of functionalities related to current site. The current site instance is stored in $mmSitesManager.
 * This service can be seen as an instance of Site defined in $mmSitesFactory, with one method added: $mmSite.isLoggedIn.
 */
.factory('$mmSite', function($mmSitesManager, $mmSitesFactory) {

    var self = {},
        siteMethods = $mmSitesFactory.getSiteMethods();

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getId
     * @return {String} Current site ID.
     * @description
     *
     * Get current site ID.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getURL
     * @return {String} Current site URL.
     * @description
     *
     * Get current site URL.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getToken
     * @return {String} Current site token.
     * @description
     *
     * Get current site token.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getInfo
     * @return {Object} Current site info.
     * @description
     *
     * Get current site info.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getDb
     * @return {Object} Current site DB.
     * @description
     *
     * Get current site DB.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#reloadDb
     * @return {Void}
     * @description
     *
     * Reload the site database.
     * This must be used by remote addons that register stores in the site database.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getUserId
     * @return {Object} User's ID.
     * @description
     *
     * Get current site user's ID.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#setId
     * @param {String} New ID.
     * @description
     *
     * Set current site ID.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#setToken
     * @param {String} New token.
     * @description
     *
     * Set current site token.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#canAccessMyFiles
     * @return {Boolean} False when they cannot.
     * #description
     *
     * Check if user can access private files in current site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#canDownloadFiles
     * @return {Boolean} False when they cannot.
     * #description
     *
     * Check if user can download files in current site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#canUseAdvancedFeature
     * @param {String} feature The name of the feature.
     * @param {Boolean} [whenUndefined=true] The value to return when the parameter is undefined
     * @return {Boolean} False when they cannot.
     * @description
     *
     * Can the user use an advanced feature?
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#canUploadFiles
     * @return {Boolean} False when they cannot.
     * #description
     *
     * Check if user can upload files in current site.
     */

    /**
     * Fetch site info from the Moodle site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#fetchSiteInfo
     * @return {Promise} A promise to be resolved when the site info is retrieved.
     * #description
     *
     * Fetch site info from the current Moodle site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#read
     * @param  {String} read  WS method to use.
     * @param  {Object} data    Data to send to the WS.
     * @param  {Object} preSets Options. @see $mmSite#request.
     * @return {Promise}        Promise to be resolved when the request is finished.
     * #description
     *
     * Read some data from the current Moodle site using WS. Requests are cached by default.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#write
     * @param  {String} method  WS method to use.
     * @param  {Object} data    Data to send to the WS.
     * @param  {Object} preSets Options. @see $mmSite#request.
     * @return {Promise}        Promise to be resolved when the request is finished.
     * #description
     *
     * Sends some data to the current Moodle site using WS. Requests are NOT cached by default.
     */

    /**
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
     *                    - cacheKey (string) Extra key to add to the cache when storing this call. This key is to
     *                                        flag the cache entry, it doesn't affect the data retrieved in this call.
     *                    - getCacheUsingCacheKey (boolean) True if it should retrieve cached data by cacheKey,
     *                                        false if it should get the data based on the params passed (usual behavior).
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

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#wsAvailable
     * @param  {String}       method      WS name.
     * @param  {Boolean=true} checkPrefix When true also checks with the compatibility prefix.
     * @return {Boolean}                  True if the WS is available, false otherwise.
     * @description
     * Check if a WS is available in the current site.
     *
     * This method checks if a web service function is available. By default it will
     * also check if there is a compatibility function for it, e.g. a prefixed one.
     */

    /*
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#uploadFile
     * @param {Object} uri File URI.
     * @param {Object} options File settings: fileKey, fileName and mimeType.
     * @return {Promise}
     * @description
     *
     * Uploads a file to the current site using Cordova File API.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#invalidateWsCacheForKey
     * @param  {String} key Key to search.
     * @return {Promise}    Promise resolved when the cache entries are invalidated.
     * @description
     *
     * Invalidates all the cache entries with a certain key.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#invalidateWsCacheForKeyStartingWith
     * @param  {String} key Key to search.
     * @return {Promise}    Promise resolved when the cache entries are invalidated.
     * @description
     *
     * Invalidates all the cache entries whose key starts with a certain value.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#fixPluginfileURL
     * @param {String} url   The url to be fixed.
     * @return {String}      Fixed URL.
     * @description
     *
     * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
     * Uses $mmUtil.fixPluginfileURL, passing current site's token.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#deleteDB
     * @return {Promise} Promise to be resolved when the DB is deleted.
     * @description
     *
     * Deletes current site's DB.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#deleteFolder
     * @return {Promise} Promise to be resolved when the folder is deleted.
     * @description
     *
     * Deletes current site's folder.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getSpaceUsage
     * @return {Promise} Promise resolved with the site space usage (size).
     * @description
     *
     * Get space usage of the site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getDocsUrl
     * @param {String} [page]    Docs page to go to.
     * @return {Promise}         Promise resolved with the Moodle docs URL.
     * @description
     *
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#checkLocalMobilePlugin
     * @return {Promise} Promise resolved when the check is done. Resolve params:
     *                           - {Number} code Code to identify the authentication method to use.
     *                           - {String} [service] If defined, name of the service to use.
     *                           - {String} [warning] If defined, code of the warning message.
     * @description
     *
     * Check if the local_mobile plugin is installed in the Moodle site.
     * This plugin provide extended services.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#checkLocalMobilePlugin
     * @return {Promise} Promise resolved it local_mobile was added, rejected otherwise.
     * @description
     *
     * Check if local_mobile has been installed in Moodle but the app is not using it.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#containsUrl
     * @param  {String}  url URL to check.
     * @return {Boolean}     True if URL belongs to this site, false otherwise.
     * @description
     *
     * Check if a URL belongs to this site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getPublicConfig
     * @return {Promise} Promise resolved with site public config. Rejected with an object if error, see $mmWS#callAjax.
     * @description
     *
     * Get the public config of this site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openInBrowserWithAutoLogin
     * @param  {String} url            The URL to open.
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in browser using auto-login in the Moodle site if available.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openInBrowserWithAutoLoginIfSameSite
     * @param  {String} url            The URL to open.
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in browser using auto-login in the Moodle site if available and the URL belongs to the site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openInAppWithAutoLogin
     * @param  {String} url            The URL to open.
     * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in inappbrowser using auto-login in the Moodle site if available.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openInAppWithAutoLoginIfSameSite
     * @param  {String} url            The URL to open.
     * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the inappbrowser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in inappbrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openWithAutoLogin
     * @param  {Boolean} inApp         True to open it in InAppBrowser, false to open in browser.
     * @param  {String} url            The URL to open.
     * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open.
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#openWithAutoLoginIfSameSite
     * @param  {Boolean} inApp         True to open it in InAppBrowser, false to open in browser.
     * @param  {String} url            The URL to open.
     * @param  {Object} options        Override default options passed to $cordovaInAppBrowser#open.
     * @param  {String} [alertMessage] If defined, an alert will be shown before opening the browser/inappbrowser.
     * @return {Promise}               Promise resolved when done, rejected otherwise.
     * @description
     *
     * Open a URL in browser or InAppBrowser using auto-login in the Moodle site if available and the URL belongs to the site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getConfig
     * @param {String}  [name]        Name of the setting to get. If not set or false, all settings will be returned.
     * @param {Boolean} [ignoreCache] True if it should ignore cached data.
     * @return {Promise}              Promise resolved with site config. Rejected with an object if error.
     * @description
     *
     * Get the config of this site.
     * It is recommended to use getStoredConfig instead since it's faster and doesn't use network.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#invalidateConfig
     * @return {Promise}        Promise resolved when the data is invalidated.
     * @description
     *
     * Invalidates config WS call.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getStoredConfig
     * @param {String} [name] Name of the setting to get. If not set or false, all settings will be returned.
     * @return {Object}       Site config or a specific setting.
     * @description
     *
     * Get the stored config of this site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#isFeatureDisabled
     * @param {String} name Name of the feature to check.
     * @return {Boolean}    True if disabled, false otherwise.
     * @description
     *
     * Check if a certain feature is disabled in the site.
     */

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#isVersionGreaterEqualThan
     * @param  {Mixed} versions Version or list of versions to check.
     * @return {Boolean}        True if greater or equal, false otherwise.
     * @description
     *
     * Check if the site version is greater than one or some versions.
     * This function accepts a string or an array of strings. If array, the last version must be the highest.
     *
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

    /**
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#getCompatibleFunction
     * @param  {String} method WS function to check.
     * @return {String}        Method to use based in the available functions.
     * @description
     *
     * Return the function to be used, based on the available functions in the site. It'll try to use non-deprecated
     * functions first, and fallback to deprecated ones if needed.
     */

    // Replicate all Site methods refined in $mmSitesFactory to be used with current site.
    angular.forEach(siteMethods, function(method) {
        self[method] = function() {
            var currentSite = $mmSitesManager.getCurrentSite();
            if (typeof currentSite == 'undefined') {
                return undefined;
            } else {
                return currentSite[method].apply(currentSite, arguments);
            }
        };
    });

    /**
     * Check if the user is logged in a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSite#isLoggedIn
     * @return {Boolean} True if the user is logged in a site, false otherwise.
     */
    self.isLoggedIn = function() {
        var currentSite = $mmSitesManager.getCurrentSite();
        return typeof currentSite != 'undefined' && typeof currentSite.token != 'undefined' && currentSite.token != '';
    };

    return self;
});
