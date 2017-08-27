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

angular.module('mm.core.user')

/**
 * User handlers factory.
 *
 * @module mm.core.user
 * @ngdoc service
 * @name $mmUserHandlers
 */
.factory('$mmUserHandlers', function($mmContentLinksHelper, mmUserProfileHandlersTypeCommunication, $mmSite, $window,
            $mmContentLinkHandlerFactory) {

    var self = {};

    /**
     * Content links handler.
     * Match user/view.php and user/profile.php but NOT grade/report/user/.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserHandlers#linksHandler
     */
    self.linksHandler = $mmContentLinkHandlerFactory.createChild(
                /((\/user\/view\.php)|(\/user\/profile\.php)).*([\?\&]id=\d+)/);

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.linksHandler.isEnabled = function(siteId, url, params, courseId) {
        return url.indexOf('/grade/report/') == -1;
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.linksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                var stateParams = {
                    courseid: params.course,
                    userid: parseInt(params.id, 10)
                };
                $mmContentLinksHelper.goInSite('site.mm_user-profile', stateParams, siteId);
            }
        }];
    };

    /**
     * Profile links email handler.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserHandlers#userEmail
     */
    self.userEmail = function() {

        var self = {
            type: mmUserProfileHandlersTypeCommunication
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean}    Always enabled.
         */
        self.isEnabled = function() {
            return true;
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
            // Not current user required.
            return user.id != $mmSite.getUserId() && user.email;
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
             * Add mail handler controller.
             *
             * @modulemm.core.user
             * @ngdoc controller
             * @name $mmUserHandlers#userProfile:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-android-mail';
                $scope.title = 'mm.user.sendemail';
                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $window.location.href = "mailto:" + user.email;
                };
            };

        };

        return self;
    };

    return self;
});
