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

angular.module('mm.core.contentlinks')

/**
 * Service to provide some helper functionalities for the contentlinks component.
 *
 * @module mm.core.contentlinks
 * @ngdoc service
 * @name $mmContentLinksHelper
 */
.factory('$mmContentLinksHelper', function($log, $ionicHistory, $state, $mmSite, $mmSitesManager, $mmContentLinksDelegate, $q,
            $mmUtil, $translate) {

    $log = $log.getInstance('$mmContentLinksHelper');

    var self = {};

    /**
     * Goes to a certain state in a certain site. If the site is current site it will perform a regular navigation,
     * otherwise it uses the 'redirect' state to change the site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmUtil#goToSite
     * @param  {String} stateName   Name of the state to go.
     * @param  {Object} stateParams Params to send to the state.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the state is changed.
     */
    self.goInSite = function(stateName, stateParams, siteId) {
        siteId = siteId || $mmSite.getId();
        if (siteId == $mmSite.getId()) {
            return $state.go(stateName, stateParams);
        } else {
            return $state.go('redirect', {
                siteid: siteId,
                state: stateName,
                params: stateParams
            });
        }
    };

    /**
     * Go to the view to choose a site.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#goToChooseSite
     * @param {String} url URL to treat.
     * @return {Promise}   Promise resolved when the state changes.
     */
    self.goToChooseSite = function(url) {
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        return $state.go('mm_contentlinks.choosesite', {url: url});
    };

    /**
     * Handle a link.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#handleLink
     * @param  {String} url URL to handle.
     * @return {Promise}    Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    self.handleLink = function(url) {

        // Check if the link should be treated by some component/addon.
        // We perform this check first because it's synchronous.
        var actions = $mmContentLinksDelegate.getActionsFor(url);
        if (actions && actions.length) {
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (action && angular.isFunction(action.action)) {

                    // We found a valid action. We need to check if the link belongs to any site stored.
                    return $mmSitesManager.getSiteIdsFromUrl(url, true).then(function(ids) {
                        if (!ids.length) {
                            // URL doesn't belong to any site.
                            return false;
                        } else if (ids.length == 1 && ids[0] == $mmSite.getId()) {
                            // Current site.
                            action.action(ids[0]);
                        } else {
                            // Not current site. Ask for confirmation.
                            $mmUtil.showConfirm($translate('mm.contentlinks.confirmurlothersite')).then(function() {
                                if (ids.length == 1) {
                                    action.action(ids[0]);
                                } else {
                                    self.goToChooseSite(url);
                                }
                            });
                        }
                        return true;
                    }).catch(function() {
                        return false;
                    });
                }
            }
        }

        // No valid actions found.
        return $q.when(false);
    };

    return self;
});
