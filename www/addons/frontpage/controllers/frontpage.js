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

angular.module('mm.addons.frontpage')

/**
 * Section view controller.
 *
 * @module mm.addons.frontpage
 * @ngdoc controller
 * @name mmaFrontpageCtrl
 */
.controller('mmaFrontpageCtrl', function($mmCourseDelegate, $mmCourse, $mmUtil, $scope, $stateParams, $mmSite, $q, $controller,
            $mmCoursePrefetchDelegate, $mmCourseHelper) {

    // Default values are Site Home and all sections.
    var courseId = $mmSite.getInfo().siteid || 1,
        moduleId = $stateParams.mid;

    $scope.sections = []; // Reset scope.sections, otherwise an error is shown in console with tablet view.
    $scope.sectionHasContent = $mmCourseHelper.sectionHasContent;

    // Convenience function to fetch section(s).
    function loadContent() {
        return $mmCourse.getSections(courseId, false, true).then(function(sections) {
            // For the site home, we need to reverse the order to display first the site home section topic.
            sections.reverse();

            var hasContent = false;

            angular.forEach(sections, function(section) {
                if ($mmCourseHelper.sectionHasContent(section)) {
                    hasContent = true;
                }

                angular.forEach(section.modules, function(module) {
                    module._controller =
                            $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseId, section.id);

                    if (module.id == moduleId) {
                        // This is the module we're looking for. Open it.
                        var scope = $scope.$new();
                        $controller(module._controller, {$scope: scope});
                        if (scope.action) {
                            scope.action();
                        }
                    }
                });
            });

            $scope.sections = sections;
            $scope.hasContent = hasContent;

            // Add log in Moodle.
            $mmCourse.logView(courseId);
        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.course.couldnotloadsectioncontent', true);
            }
        });
    }

    loadContent().finally(function() {
        $scope.frontpageLoaded = true;
    });

    $scope.doRefresh = function() {
        var promises = [];

        promises.push($mmCourse.invalidateSections(courseId));

        if ($scope.sections) {
            // Invalidate modules prefetch data.
            var modules = $mmCourseHelper.getSectionsModules($scope.sections);
            promises.push($mmCoursePrefetchDelegate.invalidateModules(modules, courseId));
        }

        $q.all(promises).finally(function() {
            loadContent().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
