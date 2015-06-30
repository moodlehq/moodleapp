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
 * Section view controller.
 *
 * @module mm.core.course
 * @ngdoc controller
 * @name mmCourseSectionCtrl
 */
.controller('mmCourseSectionCtrl', function($mmCourseDelegate, $mmCourse, $mmUtil, $scope, $stateParams, $translate, $mmSite) {

    // Default values are course 1 (front page) and all sections.
    var courseid = $stateParams.courseid || 1,
        sectionid = $stateParams.sectionid || -1,
        sections = [];

    if (sectionid < 0) {
        // Special scenario, we want all sections.
        $translate('mm.course.allsections').then(function(str) {
            $scope.title = str;
        });
        $scope.summary = null;
    }

    function loadContent(sectionid, refresh) {
        if (sectionid < 0) {
            return $mmCourse.getSections(courseid, refresh).then(function(sections) {
                angular.forEach(sections, function(section) {
                    angular.forEach(section.modules, function(module) {
                        module._controller =
                                $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseid, section.id);
                    });
                });

                $scope.sections = sections;
                // Add log in Moodle.
                $mmSite.write('core_course_view_course', {
                    courseid: courseid,
                    sectionnumber: 0
                });
            }, function() {
                $mmUtil.showErrorModal('mm.course.couldnotloadsectioncontent', true);
            });
        } else {
            return $mmCourse.getSection(courseid, sectionid, refresh).then(function(section) {
                angular.forEach(section.modules, function(module) {
                    module._controller =
                            $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseid, section.id);
                });

                $scope.sections = [section];
                $scope.title = section.name;
                $scope.summary = section.summary;
                // Add log in Moodle.
                $mmSite.write('core_course_view_course', {
                    courseid: courseid,
                    sectionnumber: sectionid
                });
            }, function() {
                $mmUtil.showErrorModal('mm.course.couldnotloadsectioncontent', true);
            });
        }
    }

    $scope.doRefresh = function() {
        loadContent(sectionid, true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    loadContent(sectionid).finally(function() {
        $scope.sectionLoaded = true;
    });
});
