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
.controller('mmCourseSectionCtrl', function($mmCourse, $mmUtil, $scope, $stateParams, $translate, $mmEvents, $ionicScrollDelegate,
            $mmCourses, $q, mmCoreEventCompletionModuleViewed, $mmCoursePrefetchDelegate, $mmCourseHelper) {

    // Default values are Site Home and all sections.
    var courseId = $stateParams.cid,
        sectionId = $stateParams.sectionid || -1,
        moduleId = $stateParams.mid;

    $scope.sections = []; // Reset scope.sections, otherwise an error is shown in console with tablet view.
    $scope.sectionHasContent = $mmCourseHelper.sectionHasContent;

    if (sectionId < 0) {
        $scope.title = $translate.instant('mm.course.allsections');
        $scope.summary = null;
        $scope.allSections = true;
    }

    // Convenience function to fetch section(s).
    function loadContent(sectionId) {
        return $mmCourses.getUserCourse(courseId, true).catch(function() {
            // User not enrolled in the course or an error occurred, ignore the error.
        }).then(function(course) {
            var promise;
            if (course && course.enablecompletion === false) {
                promise = $q.when([]); // Completion not enabled, return empty array.
            } else {
                promise = $mmCourse.getActivitiesCompletionStatus(courseId).catch(function() {
                    return []; // If fail, return empty array (as if there was no completion).
                });
            }

            return promise.then(function(completionStatus) {
                var promise,
                    sectionnumber;

                if (sectionId < 0) {
                    sectionnumber = 0;
                    promise = $mmCourse.getSections(courseId, false, true);
                } else {
                    sectionnumber = sectionId;
                    promise = $mmCourse.getSection(courseId, false, true, sectionId).then(function(section) {
                        $scope.title = section.name;
                        $scope.summary = section.summary;
                        return [section];
                    });
                }

                return promise.then(function(sections) {

                    $scope.hasContent = $mmCourseHelper.addContentHandlerControllerForSectionModules(sections, courseId,
                        moduleId, completionStatus, $scope);
                    $scope.sections = sections;

                    // Add log in Moodle. The 'section' attribute was added in Moodle 3.2 so maybe it isn't available.
                    if (sectionId > 0 && sections[0] && typeof sections[0].section != 'undefined') {
                        $mmCourse.logView(courseId, sections[0].section);
                    } else {
                        $mmCourse.logView(courseId);
                    }
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

    loadContent(sectionId).finally(function() {
        $scope.sectionLoaded = true;
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
            loadContent(sectionId).finally(function() {
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
        loadContent(sectionId).finally(function() {
            $scope.sectionLoaded = true;
            $scope.loadingPaddingTop = 0;
        });
    }

    // Completion changed for at least one module. Invalidate data and re-load it.
    $scope.completionChanged = function() {
        $mmCourse.invalidateSections(courseId).finally(function() {
            refreshAfterCompletionChange();
        });
    };

    // Listen for viewed modules. If an automatic completion module is viewed, refresh the whole list.
    var observer = $mmEvents.on(mmCoreEventCompletionModuleViewed, function(cid) {
        if (cid === courseId) {
            refreshAfterCompletionChange();
        }
    });
    $scope.$on('$destroy', function() {
        if (observer && observer.off) {
            observer.off();
        }
    });
});
