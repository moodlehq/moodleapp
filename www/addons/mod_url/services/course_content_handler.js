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
 * Mod URL course content handler.
 *
 * @module mm.addons.mod_url
 * @ngdoc service
 * @name $mmaModUrlCourseContentHandler
 */
.factory('$mmaModUrlCourseContentHandler', function($mmCourse, $mmaModUrl, $state) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrlCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrlCourseContentHandler#getController
     * @param {Object} module The module info.
     * @param {Number} courseid The course ID.
     * @return {Function}
     */
    self.getController = function(module, courseid) {
        return function($scope) {
            $scope.icon = $mmCourse.getModuleIconSrc('url');
            $scope.title = module.name;
            $scope.action = function(e) {
                $state.go('site.mod_url', {module: module, courseid: courseid});
            };

            if (module.contents && module.contents[0] && module.contents[0].fileurl) {
                $scope.buttons = [{
                    icon: 'ion-link',
                    label: 'mm.core.openinbrowser',
                    action: function(e) {
                        e.preventDefault();
                        e.stopPropagation();
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
});
