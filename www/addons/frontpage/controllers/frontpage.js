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
 * Frontpage view controller.
 *
 * @module mm.addons.frontpage
 * @ngdoc controller
 * @name mmaFrontpageCtrl
 */
.controller('mmaFrontpageCtrl', function($mmCourse, $mmUtil, $scope, $stateParams, $mmSite, $q, $mmCoursePrefetchDelegate,
            $mmCourseHelper) {

    // Default values are Site Home and all sections.
    var courseId = $mmSite.getInfo().siteid || 1,
        moduleId = $stateParams.moduleid,
        sectionsLoaded;

    $scope.items = [];
    $scope.sectionHasContent = $mmCourseHelper.sectionHasContent;

    // Convenience function to fetch section(s).
    function loadContent() {
        $scope.hasContent = false;

        return $mmSite.getConfig().catch(function() {
            // Ignore errors for not present settings assuming numsections will be true.
            return $q.when({
                numsections: 1
            });
        }).then(function(config) {
            if (config.frontpageloggedin) {
                // Items with index 1 and 3 were removed on 2.5 and not being supported in the app.
                var frontpageItems = [
                        'mma-frontpage-item-news', // News items.
                        false,
                        'mma-frontpage-item-categories', // List of categories.
                        false,
                        'mma-frontpage-item-categories', // Combo list.
                        'mma-frontpage-item-enrolled-course-list', // Enrolled courses.
                        'mma-frontpage-item-all-course-list', // List of courses.
                        'mma-frontpage-item-course-search' // Course search box.
                    ],
                    items = config.frontpageloggedin.split(',');

                $scope.items = [];

                angular.forEach(items, function (itemNumber) {
                    // Get the frontpage item directive to render itself.
                    var item = frontpageItems[parseInt(itemNumber, 10)];
                    if (!item || $scope.items.indexOf(item) >= 0) {
                        return;
                    }

                    $scope.hasContent = true;
                    $scope.items.push(item);
                });

            }

            return $mmCourse.getSections(courseId, false, true).then(function(sections) {
                sectionsLoaded = sections;
                // Check "Include a topic section" setting from numsections.
                if (config.numsections && sections.length > 0) {
                    $scope.section = sections.pop();
                } else {
                    $scope.section = false;
                }

                if (sections.length > 0) {
                    $scope.block = sections.pop();
                } else {
                    $scope.block = false;
                }

                $scope.hasContent = $mmCourseHelper.addContentHandlerControllerForSectionModules([$scope.section, $scope.block],
                    courseId, moduleId, false, $scope) || $scope.hasContent;

                // Add log in Moodle.
                $mmCourse.logView(courseId);
            }, function(error) {
                $mmUtil.showErrorModalDefault(error, 'mm.course.couldnotloadsectioncontent', true);
            });
        });
    }

    loadContent().finally(function() {
        $scope.frontpageLoaded = true;
    });

    $scope.doRefresh = function() {
        var promises = [];

        promises.push($mmCourse.invalidateSections(courseId));
        promises.push($mmSite.invalidateConfig());

        if (sectionsLoaded) {
            // Invalidate modules prefetch data.
            var modules = $mmCourseHelper.getSectionsModules(sectionsLoaded);
            promises.push($mmCoursePrefetchDelegate.invalidateModules(modules, courseId));
        }

        $q.all(promises).finally(function() {
            loadContent().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
