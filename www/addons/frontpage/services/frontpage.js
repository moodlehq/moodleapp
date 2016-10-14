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
.factory('$mmaFrontpage', function($mmSite, $log, $q, $mmCourse) {
    $log = $log.getInstance('$mmaFrontpage');

    var self = {};

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
     * @return {Promise} Resolved when enabled, otherwise rejected.
     */
    self.isFrontpageAvailable = function() {
        // On older version we cannot check other than calling a WS. If the request
        // fails there is a very high chance that frontpage is not available.
        $log.debug('Using WS call to check if frontpage is available.');

        return $mmCourse.getSections(1, false, true, {emergencyCache: false}).then(function(data) {
            if (!angular.isArray(data) || data.length == 0) {
                return $q.reject();
            }
        });
    };

    return self;
});
