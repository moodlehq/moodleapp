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

angular.module('mm.addons.mod_forum')

/**
 * Mod forum handlers.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumHandlers
 */
.factory('$mmaModForumHandlers', function($mmCourse, $mmaModForum, $state, $mmSite) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#courseContent
     */
    self.courseContent = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @module mm.addons.mod_forum
         * @ngdoc method
         * @name $mmaModForumCourseContentHandler#isEnabled
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModForum.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @module mm.addons.mod_forum
         * @ngdoc method
         * @name $mmaModForumCourseContentHandler#isEnabled
         * @param {Object} module The module info.
         * @param {Number} courseid The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseid) {
            return function($scope) {
                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('forum');
                $scope.action = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $state.go('site.mod_forum', {module: module, courseid: courseid});
                };
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModForum.isPluginEnabled();
        };

        /**
         * Get actions to perform with the link.
         *
         * @param {String} url        URL to treat.
         * @param {Number} [courseid] Course ID related to the URL.
         * @return {Object[]}         List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(url, courseid) {
            // Check it's a forum URL from the current site.
            if (courseid && $mmSite.containsUrl(url) && url.indexOf('/mod/forum/') > -1) {
                var matches = url.match(/discuss\.php\?d=([^#]*)/); // Get discussion ID.
                if (matches && typeof matches[1] != 'undefined') {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        action: function() {
                            $state.go('site.mod_forum-discussion', {
                                courseid: courseid,
                                discussionid: matches[1]
                            });
                        }
                    }];
                }
            }
            return [];
        };

        return self;
    };

    return self;
});
