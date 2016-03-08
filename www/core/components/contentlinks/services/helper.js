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
.factory('$mmContentLinksHelper', function($log, $ionicHistory, $state, $mmSite, $mmContentLinksDelegate, $mmUtil, $translate,
            $mmCourseHelper, $mmSitesManager, $q, $mmLoginHelper, $mmText, mmCoreConfigConstants) {

    $log = $log.getInstance('$mmContentLinksHelper');

    var self = {};

    /**
     * Filter the list of supported sites based on a isEnabled function.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#filterSupportedSites
     * @param  {String[]} siteIds     Site IDs to filter.
     * @param  {Function} isEnabledFn Function to call for each site. Must return a promise resolved with true if enabled. It
     *                                receives a siteId param and all the params sent to this function after 'checkAll'.
     * @param  {Boolean} checkAll     True if it should check all the sites, false if it should check only 1 and treat them all
     *                                depending on this result.
     * @param  {Mixed}                All the params sent after checkAll will be passed to isEnabledFn.
     * @return {Promise}              Promise resolved with the list of supported sites.
     */
    self.filterSupportedSites = function(siteIds, isEnabledFn, checkAll) {
        var promises = [],
            supported = [],
            extraParams = Array.prototype.slice.call(arguments, 3); // Params received after 'checkAll'.

        angular.forEach(siteIds, function(siteId) {
            if (checkAll || !promises.length) {
                promises.push(isEnabledFn.apply(isEnabledFn, [siteId].concat(extraParams)).then(function(enabled) {
                    if (enabled) {
                        supported.push(siteId);
                    }
                }));
            }
        });

        return $mmUtil.allPromises(promises).catch(function() {}).then(function() {
            if (!checkAll) {
                if (supported.length) {
                    return siteIds; // Checking 1 was enough and it succeeded, all sites supported.
                } else {
                    return []; // Checking 1 was enough and it failed, no sites supported.
                }
            } else {
                return supported;
            }
        });
    };

    /**
     * Get the first valid action in a list of actions.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#getFirstValidAction
     * @param  {Object[]} actions List of actions.
     * @return {Object}           First valid action. Returns undefined if no valid action found.
     */
    self.getFirstValidAction = function(actions) {
        if (actions) {
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (action && action.sites && action.sites.length && angular.isFunction(action.action)) {
                    return action;
                }
            }
        }
    };

    /**
     * Goes to a certain state in a certain site. If the site is current site it will perform a regular navigation,
     * otherwise it uses the 'redirect' state to change the site.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#goInSite
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
     * Handle a URL received by Custom URL Scheme.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#handleCustomUrl
     * @param  {String} url URL to handle.
     * @return {True}       True if the URL should be handled by this component, false otherwise.
     */
    self.handleCustomUrl = function(url) {
        var contentLinksScheme = mmCoreConfigConstants.customurlscheme + '://link=';
        if (url.indexOf(contentLinksScheme) == -1) {
            return false;
        }

        // App opened using custom URL scheme.
        $log.debug('Treating custom URL scheme: ' + url);

        var modal = $mmUtil.showModalLoading(),
            username;

        // Delete the scheme from the URL.
        url = url.replace(contentLinksScheme, '');

        // Detect if there's a user specified.
        username = $mmText.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // Check if the site is stored.
        $mmSitesManager.getSiteIdsFromUrl(url, false, username).then(function(siteIds) {
            if (siteIds.length) {
                modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.
                return self.handleLink(url, username).then(function(treated) {
                    if (!treated) {
                        $mmUtil.showErrorModal('mm.contentlinks.errornoactions', true);
                    }
                });
            } else {
                // Get the site URL.
                var siteUrl = $mmContentLinksDelegate.getSiteUrl(url),
                    formatted = $mmUtil.formatURL(siteUrl);
                if (!siteUrl) {
                    $mmUtil.showErrorModal('mm.login.invalidsite', true);
                    return;
                }

                // Check that site exists.
                return $mmSitesManager.checkSite(siteUrl).then(function(result) {
                    // Site exists. We'll allow to add it.
                    var promise,
                        ssoNeeded = $mmLoginHelper.isSSOLoginNeeded(result.code);

                    modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                    if (!$mmSite.isLoggedIn()) {
                        if (ssoNeeded) {
                            // Ask SSO confirmation.
                            promise = $mmUtil.showConfirm($translate('mm.login.logininsiterequired'));
                        } else {
                            // Not logged in and no SSO, no need to confirm.
                            promise = $q.when();
                        }
                    } else {
                        // Ask the user before changing site.
                        promise = $mmUtil.showConfirm($translate('mm.contentlinks.confirmurlothersite')).then(function() {
                            if (!ssoNeeded) {
                                return $mmSitesManager.logout().catch(function() {
                                    // Ignore errors (shouldn't happen).
                                });
                            }
                        });
                    }

                    return promise.then(function() {
                        if (ssoNeeded) {
                            $mmLoginHelper.openBrowserForSSOLogin(result.siteurl);
                        } else {
                            $state.go('mm_login.credentials', {
                                siteurl: result.siteurl,
                                username: username,
                                urltoopen: url
                            });
                        }
                    });

                }, function(error) {
                    $mmUtil.showErrorModal(error);
                });
            }
        }).finally(function() {
            modal.dismiss();
        });

        return true;
    };

    /**
     * Handle a link.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#handleLink
     * @param  {String} url        URL to handle.
     * @param  {String} [username] Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                             the username 'myuser'. Don't use it if you don't want to filter by username.
     * @return {Promise}           Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    self.handleLink = function(url, username) {
        // Check if the link should be treated by some component/addon.
        return $mmContentLinksDelegate.getActionsFor(url, undefined, username).then(function(actions) {
            var action = self.getFirstValidAction(actions);
            if (action) {
                if (!$mmSite.isLoggedIn()) {
                    // No current site. Perform the action if only 1 site found, choose the site otherwise.
                    if (action.sites.length == 1) {
                        action.action(action.sites[0]);
                    } else {
                        self.goToChooseSite(url);
                    }
                } else if (action.sites.length == 1 && action.sites[0] == $mmSite.getId()) {
                    // Current site.
                    action.action(action.sites[0]);
                } else {
                    // Not current site or more than one site. Ask for confirmation.
                    $mmUtil.showConfirm($translate('mm.contentlinks.confirmurlothersite')).then(function() {
                        if (action.sites.length == 1) {
                            action.action(action.sites[0]);
                        } else {
                            self.goToChooseSite(url);
                        }
                    });
                }
                return true;
            }
            return false;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Treats a URL that belongs to a module's index page.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#treatModuleIndexUrl
     * @param {String[]} siteIds   Site IDs the URL belongs to.
     * @param {String} url         URL to treat.
     * @param {Function} isEnabled Function to check if the module is enabled. @see $mmContentLinksHelper#filterSupportedSites .
     * @param {Number} [courseId]  Course ID related to the URL.
     * @return {Promise}           Promise resolved with the list of actions.
     */
    self.treatModuleIndexUrl = function(siteIds, url, isEnabled, courseId) {
        var params = $mmUtil.extractUrlParams(url);
        if (typeof params.id != 'undefined') {
            // If courseId is not set we check if it's set in the URL as a param.
            courseId = courseId || params.courseid || params.cid;

            // Pass false because all sites should have the same siteurl.
            return self.filterSupportedSites(siteIds, isEnabled, false, courseId).then(function(ids) {
                if (!ids.length) {
                    return [];
                } else {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        sites: ids,
                        action: function(siteId) {
                            $mmCourseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
                        }
                    }];
                }
            });
        }
        return $q.when([]);
    };

    return self;
});
