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
.factory('$mmaModUrlHandlers', function($mmCourse, $mmaModUrl, $state, $mmContentLinksHelper) {

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
         * @param {Number} courseId The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseId) {
            return function($scope) {
                $scope.icon = $mmCourse.getModuleIconSrc('url');
                $scope.title = module.name;
                $scope.class = 'mma-mod_url-handler';
                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_url', {module: module, courseid: courseId});
                };

                // Get contents.
                $scope.spinner = true;
                $mmCourse.loadModuleContents(module, courseId).then(function() {
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
                                    $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                                });
                                $mmaModUrl.open(module.contents[0].fileurl);
                            }
                        }];
                    }
                }).finally(function() {
                    $scope.spinner = false;
                });
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
    self.linksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModUrl', 'url', $mmaModUrl);

    return self;
});
