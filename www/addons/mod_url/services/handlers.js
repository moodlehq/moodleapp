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

angular.module('mm.addons.mod_url')

/**
 * Mod URL handlers.
 *
 * @module mm.addons.mod_url
 * @ngdoc service
 * @name $mmaModUrlHandlers
 */
.factory('$mmaModUrlHandlers', function($mmCourse, $mmaModUrl, $state, $mmUtil, $mmContentLinksHelper, $q) {

    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrlHandlers#courseContentHandler
     */
    self.courseContentHandler = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return true;
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseid The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseid) {
            return function($scope) {
                $scope.icon = $mmCourse.getModuleIconSrc('url');
                $scope.title = module.name;
                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_url', {module: module, courseid: courseid});
                };

                if (module.contents && module.contents[0] && module.contents[0].fileurl) {
                    $scope.buttons = [{
                        icon: 'ion-link',
                        label: 'mm.core.openinbrowser',
                        action: function(e) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            $mmaModUrl.logView(module.instance).then(function() {
                                $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
                            });
                            $mmaModUrl.open(module.contents[0].fileurl);
                        }
                    }];
                }
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrlHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            if (courseId) {
                return $q.when(true);
            }
            return $mmCourse.canGetModuleWithoutCourseId(siteId);
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
            // Check it's a mod_url URL.
            if (typeof self.handles(url) != 'undefined') {
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isEnabled, courseId);
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
            var position = url.indexOf('/mod/url/view.php');
            if (position > -1) {
                return url.substr(0, position);
            }
        };

        return self;
    };

    return self;
});
