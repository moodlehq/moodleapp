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
.factory('$mmaBadgesHandlers', function($mmaBadges, $mmContentLinksHelper, mmUserProfileHandlersTypeNewPage,
            $mmContentLinkHandlerFactory) {

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
     * Content links handler for My Badges.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadgesHandlers#myBadgesLinksHandler
     */
    self.myBadgesLinksHandler = $mmContentLinkHandlerFactory.createChild('/badges/mybadges.php', '$mmUserDelegate_mmaBadges');
    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.myBadgesLinksHandler.isEnabled = $mmaBadges.isPluginEnabled;
    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.myBadgesLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                var stateParams = {
                    courseid: 0
                };
                $mmContentLinksHelper.goInSite('site.userbadges', stateParams, siteId);
            }
        }];
    };

    /**
     * Content links handler for viewing a badge.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadgesHandlers#badgeLinksHandler
     */
    self.badgeLinksHandler = $mmContentLinkHandlerFactory.createChild(/\/badges\/badge\.php.*([\?\&]hash=)/);
    self.badgeLinksHandler.isEnabled = $mmaBadges.isPluginEnabled;
    self.badgeLinksHandler.getActions = function(siteIds, url, params) {
        return [{
            action: function(siteId) {
                var stateParams = {
                    cid: 0,
                    uniquehash: params.hash
                };
                $mmContentLinksHelper.goInSite('site.issuedbadge', stateParams, siteId);
            }
        }];
    };

    return self;
});
