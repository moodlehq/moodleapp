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

angular.module('mm.core.course')

/**
 * Default course content handler.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourseContentHandler
 */
.factory('$mmCourseContentHandler', function($mmCourse, $mmUtil) {
    return {
        getController: function(module) {
            return function($scope, $state) {
                $scope.icon = $mmCourse.getModuleIconSrc(module.modname);
                $scope.title = module.name;
                $scope.class = 'mm-course-default-handler mm-course-module-' + module.modname + '-handler';

                $scope.action = function(e) {
                    $state.go('site.mm_course-modcontent', {module: module});
                    e.preventDefault();
                    e.stopPropagation();
                };

                if (module.url) {
                    $scope.buttons = [{
                        icon: 'ion-ios-browsers-outline',
                        label: 'mm.core.openinbrowser',
                        action: function(e) {
                            $mmUtil.openInBrowser(module.url);
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }];
                }
            };
        }
    };
});
