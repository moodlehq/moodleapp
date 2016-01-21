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
.controller('mmCourseSectionCtrl', function($mmCourseDelegate, $mmCourse, $mmUtil, $scope, $stateParams, $translate, $mmSite,
            $mmEvents, $ionicScrollDelegate, $mmCourses, $q, mmCoreEventCompletionModuleViewed) {

    // Default values are course 1 (front page) and all sections.
    var courseid = $stateParams.courseid || 1,
        sectionid = $stateParams.sectionid || -1;

    $scope.sitehome = (courseid === 1); // Are we visiting the site home?
    $scope.sections = []; // Reset scope.sections, otherwise an error is shown in console with tablet view.

    if (sectionid < 0) {
        // Special scenario, we want all sections.
        if ($scope.sitehome) {
            $scope.title = $translate.instant('mma.frontpage.sitehome');
        } else {
            $scope.title = $translate.instant('mm.course.allsections');
        }
        $scope.summary = null;
    }

    // Convenience function to fetch section(s).
    function loadContent(sectionid) {
        return $mmCourses.getUserCourse(courseid, true).catch(function() {
            // User not enrolled in the course or an error occurred, ignore the error.
        }).then(function(course) {
            var promise;
            if (course && course.enablecompletion === false) {
                promise = $q.when([]); // Completion not enabled, return empty array.
            } else {
                promise = $mmCourse.getActivitiesCompletionStatus(courseid).catch(function() {
                    return []; // If fail, return empty array (as if there was no completion).
                });
            }

            return promise.then(function(statuses) {
                var promise,
                    sectionnumber;

                if (sectionid < 0) {
                    sectionnumber = 0;
                    promise = $mmCourse.getSections(courseid);
                } else {
                    sectionnumber = sectionid;
                    promise = $mmCourse.getSection(courseid, sectionid).then(function(section) {
                        $scope.title = section.name;
                        $scope.summary = section.summary;
                        return [section];
                    });
                }

                return promise.then(function(sections) {
                    // For the site home, we need to reverse the order to display first the site home section topic.
                    if ($scope.sitehome) {
                        sections.reverse();
                    }

                    var hasContent = false;

                    angular.forEach(sections, function(section) {
                        if (section.summary != '' || section.modules.length) {
                            hasContent = true;
                        }

                        angular.forEach(section.modules, function(module) {
                            module._controller =
                                    $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseid, section.id);
                            // Check if activity has completions and if it's marked.
                            var status = statuses[module.id];
                            if (typeof status != 'undefined') {
                                module.completionstatus = status;
                            }
                        });
                    });

                    $scope.sections = sections;
                    $scope.hasContent = hasContent;

                    // Add log in Moodle.
                    $mmSite.write('core_course_view_course', {
                        courseid: courseid,
                        sectionnumber: sectionnumber
                    });
                }, function(error) {
                    if (error) {
                        $mmUtil.showErrorModal(error);
                    } else {
                        $mmUtil.showErrorModal('mm.course.couldnotloadsectioncontent', true);
                    }
                });
            });
        });
    }

    loadContent(sectionid).finally(function() {
        $scope.sectionLoaded = true;
    });

    $scope.doRefresh = function() {
        $mmCourse.invalidateSections(courseid).finally(function() {
            loadContent(sectionid).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Refresh list after a completion change since there could be new activities or so.
    function refreshAfterCompletionChange() {
        var scrollView = $ionicScrollDelegate.$getByHandle('mmSectionScroll');
        if (scrollView && scrollView.getScrollPosition()) {
            $scope.loadingPaddingTop = scrollView.getScrollPosition().top;
        }
        $scope.sectionLoaded = false;
        $scope.sections = [];
        loadContent(sectionid).finally(function() {
            $scope.sectionLoaded = true;
            $scope.loadingPaddingTop = 0;
        });
    }

    // Completion changed for at least one module. Invalidate data and re-load it.
    $scope.completionChanged = function() {
        $mmCourse.invalidateSections(courseid).finally(function() {
            refreshAfterCompletionChange();
        });
    };

    // Listen for viewed modules. If an automatic completion module is viewed, refresh the whole list.
    var observer = $mmEvents.on(mmCoreEventCompletionModuleViewed, function(cid) {
        if (cid === courseid) {
            refreshAfterCompletionChange();
        }
    });
    $scope.$on('$destroy', function() {
        if (observer && observer.off) {
            observer.off();
        }
    });
});
