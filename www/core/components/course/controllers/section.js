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
.controller('mmCourseSectionCtrl', function($mmCourse, $mmUtil, $scope, $stateParams, $translate, $mmSite) {
    var courseid = $stateParams.courseid,
        sectionid = $stateParams.sectionid,
        sections = [];

    if (sectionid < 0) {
        // Special scenario, we want all sections.
        $translate('mm.course.allsections').then(function(str) {
            $scope.title = str;
        });
        $scope.summary = null;
    }

    function loadContent(sectionid) {
        $translate('mm.core.loading').then(function(str) {
            $mmUtil.showModalLoading(str);
        });
        if (sectionid < 0) {
            $mmCourse.getSections(courseid).then(function(sections) {
                $scope.sections = sections;
                // Add log in Moodle.
                $mmSite.write('core_course_view_course', {
                    courseid: courseid,
                    sectionnumber: 0
                });
            }, function() {
                $mmUtil.showErrorModal('mm.course.couldnotloadsectioncontent', true);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        } else {
            $mmCourse.getSection(courseid, sectionid).then(function(section) {
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
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        }
    }

    loadContent(sectionid);
});
