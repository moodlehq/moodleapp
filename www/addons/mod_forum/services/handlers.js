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
.factory('$mmaModForumHandlers', function($mmCourse, $mmaModForum, $state, $mmUtil, $mmContentLinksHelper, $q) {
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
                $scope.class = 'mma-mod_forum-handler';
                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
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

        var self = {},
            patterns = ['/mod/forum/view.php', '/mod/forum/discuss.php'];

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isIndexEnabled(siteId, courseId) {
            return $mmaModForum.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
            });
        }

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId Site ID.
         * @return {Promise}       Promise resolved with true if enabled.
         */
        function isDiscEnabled(siteId) {
            // We don't check courseId because it's only needed for user profile links, we can afford not passing it.
            return $mmaModForum.isPluginEnabled(siteId);
        }

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         *                            See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url, courseId) {
            // Check it's a forum URL.
            if (url.indexOf(patterns[0]) > -1) {
                // Forum index.
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isIndexEnabled, courseId);
            } else if (url.indexOf(patterns[1]) > -1) {
                // Forum discussion.
                var params = $mmUtil.extractUrlParams(url);
                if (params.d != 'undefined') {
                    // If courseId is not set we check if it's set in the URL as a param.
                    courseId = courseId || params.courseid || params.cid;

                    // Pass false because all sites should have the same siteurl.
                    return $mmContentLinksHelper.filterSupportedSites(siteIds, isDiscEnabled, false, courseId).then(function(ids) {
                        if (!ids.length) {
                            return [];
                        } else {
                            // Return actions.
                            return [{
                                message: 'mm.core.view',
                                icon: 'ion-eye',
                                sites: ids,
                                action: function(siteId) {
                                    var stateParams = {
                                        discussionid: parseInt(params.d, 10),
                                        cid: courseId
                                    };
                                    $mmContentLinksHelper.goInSite('site.mod_forum-discussion', stateParams, siteId);
                                }
                            }];
                        }
                    });
                }
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
