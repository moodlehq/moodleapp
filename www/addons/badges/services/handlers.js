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

angular.module('mm.addons.badges')

/**
 * Badges handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.badges
 * @ngdoc service
 * @name $mmaBadgesHandlers
 */
.factory('$mmaBadgesHandlers', function($mmaBadges, $mmUtil, $q, $mmContentLinksHelper, mmUserProfileHandlersTypeNewPage) {

    var self = {};

    /**
     * Add a badge handler in the user profile.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadgesHandlers#userProfile
     */
    self.userProfile = function() {

        var self = {
            type: mmUserProfileHandlersTypeNewPage
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Promise} Promise resolved with true if enabled, resolved with false or rejected otherwise.
         */
        self.isEnabled = function() {
            return $mmaBadges.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}        Promise resolved with true if enabled, resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {

            if (navOptions && typeof navOptions.badges != 'undefined') {
                return navOptions.badges;
            }
            return false;
        };

        /**
         * Get the controller.
         *
         * @param {Object} user     User.
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(user, courseId) {

            /**
             * Add badge handler controller.
             *
             * @module mm.addons.badges
             * @ngdoc controller
             * @name $mmaBadgesHandlers#userProfile:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-trophy';
                $scope.title = 'mma.badges.badges';
                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.userbadges', {
                        courseid: courseId,
                        userid: user.id
                    });
                };
            };

        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadgesHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {},
            patterns = ['/badges/mybadges.php', '/badges/badge.php'];

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId Site ID.
         * @return {Promise}       Promise resolved with true if enabled.
         */
        function isPluginEnabled(siteId) {
            return $mmaBadges.isPluginEnabled(siteId);
        }

        /**
         * Go to My Badges.
         *
         * @param {String} siteId Site ID.
         */
        function goToMyBadges(siteId) {
            var stateParams = {
                courseid: 0
            };
            $mmContentLinksHelper.goInSite('site.userbadges', stateParams, siteId);
        }

        /**
         * Go to view a certain badge.
         *
         * @param {String} hash   Badge's unique hash.
         * @param {String} siteId Site ID.
         */
        function goToBadge(hash, siteId) {
            var stateParams = {
                cid: 0,
                uniquehash: hash
            };
            $mmContentLinksHelper.goInSite('site.issuedbadge', stateParams, siteId);
        }

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @return {Promise}          Promise resolved with the list of actions.
         *                            See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url) {
            var params = $mmUtil.extractUrlParams(url),
                isMyBadges = url.indexOf(patterns[0]) > -1,
                isBadge = url.indexOf(patterns[1]) > -1 && typeof params.hash != 'undefined';

            if (isMyBadges || isBadge) {
                // Pass false because all sites should have the same siteurl.
                return $mmContentLinksHelper.filterSupportedSites(siteIds, isPluginEnabled, false).then(function(ids) {
                    if (!ids.length) {
                        return [];
                    }

                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        sites: ids,
                        action: function(siteId) {
                            if (isMyBadges) {
                                goToMyBadges(siteId);
                            } else if (isBadge) {
                                goToBadge(params.hash, siteId);
                            }
                        }
                    }];
                });
            }

            return $q.when([]);
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            for (var i = 0; i < patterns.length; i++) {
                var position = url.indexOf(patterns[i]);
                if (position > -1) {
                    return url.substr(0, position);
                }
            }
        };

        return self;
    };

    return self;
});
