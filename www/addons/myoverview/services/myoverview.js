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

angular.module('mm.addons.myoverview')

/**
 * My overview factory.
 *
 * @module mm.addons.myoverview
 * @ngdoc service
 * @name $mmaMyOverview
 */
.factory('$mmaMyOverview', function($log, $mmSitesManager, $mmSite) {
    $log = $log.getInstance('$mmaMyOverview');

    var self = {};

    /**
     * Returns whether or not the my overview plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('core_calendar_get_action_events_by_courses');
        });
    };

    /**
     * Check if My Overview is disabled in a certain site.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isMyOverviewDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isMyOverviewDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmaMyOverview');
    };


    /**
     * Check if My Overview is avalaible to be shown on side meny.
     *
     * @module mm.addons.myoverview
     * @ngdoc method
     * @name $mmaMyOverview#isSideMenuAvalaible
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isSideMenuAvalaible = function() {
        if (!self.isMyOverviewDisabledInSite()) {
            return self.isPluginEnabled().catch(function() {
                return false;
            });
        }
        return $q.when(false);
    };

    return self;
});
