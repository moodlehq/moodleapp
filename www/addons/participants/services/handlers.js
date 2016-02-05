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

angular.module('mm.addons.participants')

/**
 * Participants handlers.
 *
 * @module mm.addons.participants
 * @ngdoc service
 * @name $mmaParticipantsHandlers
 */
.factory('$mmaParticipantsHandlers', function($mmaParticipants, mmCoursesAccessMethods, $mmUtil, $state) {
    var self = {};

    /**
     * Course nav handler.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipantsHandlers#coursesNavHandler
     */
    self.coursesNavHandler = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return true;
        };

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} courseId   Course ID.
         * @param {Object} accessData Type of access to the course: default, guest, ...
         * @return {Boolean|Promise}  Promise resolved  with true if handler is enabled,
         *                            false or promise rejected or resolved with false otherwise.
         */
        self.isEnabledForCourse = function(courseId, accessData) {
            if (accessData && accessData.type == mmCoursesAccessMethods.guest) {
                return false; // Not enabled for guests.
            }
            return $mmaParticipants.isPluginEnabledForCourse(courseId);
        };

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(courseId) {
            return function($scope, $state) {
                $scope.icon = 'ion-person-stalker';
                $scope.title = 'mma.participants.participants';
                $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.participants', {
                        course: course
                    });
                };
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipantsHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds Site IDs the URL belongs to.
         * @param {String} url       URL to treat.
         * @return {Object[]}        List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url) {
            // Check it's a user URL.
            if (typeof self.handles(url) != 'undefined') {
                var params = $mmUtil.extractUrlParams(url);
                if (typeof params.id != 'undefined') {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        sites: siteIds,
                        action: function(siteId) {
                            // Use redirect to make the participants list the new history root (to avoid "loops" in history).
                            $state.go('redirect', {
                                siteid: siteId,
                                state: 'site.participants',
                                params: {
                                    course: {id: parseInt(params.id, 10)}
                                }
                            });
                        }
                    }];
                }
            }
            return [];
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            // Verify it's not a grade URL.
            if (url.indexOf('grade/report/user') == -1) {
                var position = url.indexOf('/user/index.php');
                if (position > -1) {
                    return url.substr(0, position);
                }
            }
        };

        return self;
    };

    return self;
});
