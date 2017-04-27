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
            $mmCourseHelper, $mmSitesManager, $q, $mmLoginHelper, $mmText, mmCoreConfigConstants, $mmCourse,
            $mmContentLinkHandlerFactory) {

    $log = $log.getInstance('$mmContentLinksHelper');

    var self = {};

    /**
     * Create a link handler to handle links to a module index page.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#createModuleIndexLinkHandler
     * @param  {String} addon          Name of the addon as it's registered in $mmCourseDelegateProvider.
     * @param  {String} modName        Name of the module (assign, book, ...)
     * @param  {Object} service        Module's service. Should implement a 'isPluginEnabled(siteId)' function.
     * @param  {Function} [gotoReview] Function to go to review page if user is not current user.
     * @return {Object}                Link handler.
     */
    self.createModuleGradeLinkHandler = function(addon, modName, service, gotoReview) {
        var regex = new RegExp('\/mod\/' + modName + '\/grade\.php.*([\&\?]id=\\d+)'),
            handler = $mmContentLinkHandlerFactory.createChild(regex, '$mmCourseDelegate_' + addon);

        // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
        handler.isEnabled = function(siteId, url, params, courseId) {
            courseId = courseId || params.courseid || params.cid;
            return self.isModuleIndexEnabled(service, siteId, courseId);
        };

        // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
        handler.getActions = function(siteIds, url, params, courseId) {
            courseId = courseId || params.courseid || params.cid;
            return self.treatModuleGradeUrl(siteIds, url, params, courseId, gotoReview);
        };

        return handler;
    };

    /**
     * Create a link handler to handle links to a module index page.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#createModuleIndexLinkHandler
     * @param  {String} addon   Name of the addon as it's registered in $mmCourseDelegateProvider.
     * @param  {String} modName Name of the module (assign, book, ...)
     * @param  {Object} service Module's service. Should implement a 'isPluginEnabled(siteId)' function.
     * @return {Object}         Link handler.
     */
    self.createModuleIndexLinkHandler = function(addon, modName, service) {
        // Match the view.php URL with an id param.
        var regex = new RegExp('\/mod\/' + modName + '\/view\.php.*([\&\?]id=\\d+)'),
            handler = $mmContentLinkHandlerFactory.createChild(regex, '$mmCourseDelegate_' + addon);

        // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
        handler.isEnabled = function(siteId, url, params, courseId) {
            courseId = courseId || params.courseid || params.cid;
            return self.isModuleIndexEnabled(service, siteId, courseId);
        };

        // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
        handler.getActions = self.treatModuleIndexUrl;

        return handler;
    };

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
     * @deprecated since v3.2.1. Please use $mmUtil#filterEnabledSites instead.
     */
    self.filterSupportedSites = $mmUtil.filterEnabledSites;

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
                var siteUrl = $mmContentLinksDelegate.getSiteUrl(url);
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
                        // Not logged in, no need to confirm. If SSO the confirm will be shown later.
                        promise = $q.when();
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
                            $mmLoginHelper.confirmAndOpenBrowserForSSOLogin(
                                        result.siteurl, result.code, result.service, result.config && result.config.launchurl);
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
     * Check if a module is enabled for module index links.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#isModuleIndexEnabled
     * @param  {Object} service    Module's service. Should implement a 'isPluginEnabled(siteId)' function.
     * @param  {String} siteId     Site ID.
     * @param  {Number} [courseId] Course ID of the module.
     * @return {Promise}           Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isModuleIndexEnabled = function(service, siteId, courseId) {
        var promise;
        if (service.isPluginEnabled) {
            promise = service.isPluginEnabled(siteId);
        } else {
            promise = $q.when(true);
        }

        return promise.then(function(enabled) {
            if (!enabled) {
                return false;
            }

            return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
        });
    };

    /**
     * Treats a module grade URL (grade.php).
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#treatModuleGradeUrl
     * @param  {String[]} siteIds      Site IDs the URL belongs to.
     * @param  {String} url            URL to treat.
     * @param  {Object} params         Params of the URL.
     * @param  {Number} [courseId]     Course ID related to the URL.
     * @param  {Function} [gotoReview] Function to go to review page if user is not current user.
     * @return {Object[]}              List of actions.
     */
    self.treatModuleGradeUrl = function(siteIds, url, params, courseId, gotoReview) {
        return [{
            action: function(siteId) {
                // Check if userid is the site's current user.
                var modal = $mmUtil.showModalLoading();
                $mmSitesManager.getSite(siteId).then(function(site) {
                    if (!params.userid || params.userid == site.getUserId()) {
                        // No user specified or current user. Navigate to module.
                        $mmCourseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
                    } else if (angular.isFunction(gotoReview)) {
                        // gotoReview function is defined, use it.
                        gotoReview(url, params, courseId, siteId);
                    } else {
                        // Not current user and no gotoReview function specified, open it in browser.
                        return site.openInBrowserWithAutoLogin(url);
                    }
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Treats a URL that belongs to a module's index page. Returns actions for the module.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksHelper#treatModuleIndexUrl
     * @param  {String[]} siteIds  Site IDs the URL belongs to.
     * @param  {String} url        URL to treat.
     * @param  {Object} params     Params of the URL.
     * @param  {Number} [courseId] Course ID related to the URL.
     * @return {Object[]}          List of actions.
     */
    self.treatModuleIndexUrl = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;
        return [{
            action: function(siteId) {
                $mmCourseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
            }
        }];
    };

    return self;
});
