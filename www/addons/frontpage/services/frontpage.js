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

angular.module('mm.addons.frontpage')

/**
 * Frontpage factory.
 *
 * @module mm.addons.frontpage
 * @ngdoc service
 * @name $mmaFrontpage
 */
.factory('$mmaFrontpage', function($mmSite, $log, $q, $mmCourse, $mmSitesManager) {
    $log = $log.getInstance('$mmaFrontpage');

    var self = {};

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontpage#isDisabled
     * @param  {String} [siteId] Site Id. If not defined, use current site.
     * @return {Promise}         Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    self.isDisabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return self.isDisabledInSite(site);
        });
    };

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontpage#isDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmaFrontpage');
    };

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontpage#isPluginEnabled
     * @return {Boolean}
     */
    self.isPluginEnabled = function() {

        if (!$mmSite.isLoggedIn()) {
            return false;
        }

        return true;
    };

    /**
     * Returns whether or not the frontpage is available for the current site.
     *
     * This could call a WS so do not abuse this method.
     *
     * @module mm.addons.frontpage
     * @ngdoc method
     * @name $mmaFrontpage#isFrontpageAvailable
     * @param  {Number} [siteId] The site ID. If not defined, current site.
     * @return {Promise}         Resolved when enabled, otherwise rejected.
     */
    self.isFrontpageAvailable = function(siteId) {
        // On older version we cannot check other than calling a WS. If the request
        // fails there is a very high chance that frontpage is not available.
        $log.debug('Using WS call to check if frontpage is available.');

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var siteHomeId = site.getSiteHomeId(),
                hasData = false;

            return $mmCourse.getSections(siteHomeId, false, true, {emergencyCache: false}, siteId).then(function(data) {
                if (!angular.isArray(data) || !data.length) {
                    return $q.reject();
                }

                angular.forEach(data, function(section) {
                    if (section.summary || (section.modules && section.modules.length)) {
                        hasData = true;
                    }
                });

                if (!hasData) {
                    return $q.reject();
                }
            }).catch(function() {
                var config = site.getStoredConfig();
                if (config && config.frontpageloggedin) {
                    var items = config.frontpageloggedin.split(',');
                    if (items.length > 0) {
                        return; // It's enabled.
                    }
                }

                if (!hasData) {
                    return $q.reject();
                }
            });
        });
    };

    return self;
});
