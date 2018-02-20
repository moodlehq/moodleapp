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
            $mmCourses, $q, mmCoreEventCompletionModuleViewed, $mmCoursePrefetchDelegate, $mmCourseHelper, $timeout) {

    // Default values are Site Home and all sections.
    var courseId = $stateParams.cid,
        sectionId = $stateParams.sectionid || -1,
        moduleId = $stateParams.mid,
        scrollView;

    $scope.sections = []; // Reset scope.sections, otherwise an error is shown in console with tablet view.
    $scope.sectionHasContent = $mmCourseHelper.sectionHasContent;

    if (sectionId < 0) {
        $scope.title = $translate.instant('mm.course.allsections');
        $scope.summary = null;
        $scope.allSections = true;
    }

    // Convenience function to fetch section(s).
    function loadContent(sectionId, refresh) {
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
                        $scope.title = section.name.trim();
                        $scope.summary = section.summary;
                        return [section];
                    });
                }

                return promise.then(function(sections) {
                    var promise;
                    if (refresh) {
                        // Invalidate the recently downloaded module list. To ensure info can be prefetched.
                        var modules = $mmCourseHelper.getSectionsModules(sections);
                        promise = $mmCoursePrefetchDelegate.invalidateModules(modules, courseId);
                    } else {
                        promise = $q.when();
                    }

                    return promise.then(function() {
                        return sections;
                    });
                }).then(function(sections) {
                    sections = sections.map(function(section) {
                        section.name = section.name.trim() || false;
                        return section;
                    });

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
                    $mmUtil.showErrorModalDefault(error, 'mm.course.couldnotloadsectioncontent', true);
                });
            });
        });
    }

    loadContent(sectionId).finally(function() {
        $scope.sectionLoaded = true;

        if (moduleId) {
            $timeout(function() {
                // Module should've been opened, scroll to it.
                if (!scrollView) {
                    scrollView = $ionicScrollDelegate.$getByHandle('mmSectionScroll');
                }

                $mmUtil.scrollToElement(document.body, '#mm-course-module-' + moduleId, scrollView);
            }, 400);
        }
    });

    $scope.doRefresh = function() {
        var promises = [];

        promises.push($mmCourse.invalidateSections(courseId));

        if ($scope.sections) {
            promises.push($mmCoursePrefetchDelegate.invalidateCourseUpdates(courseId));
        }

        $q.all(promises).finally(function() {
            loadContent(sectionId, true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Refresh list after a completion change since there could be new activities or so.
    function refreshAfterCompletionChange() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmSectionScroll');
        }

        // Save scroll position to restore it once done.
        var scrollPosition = scrollView.getScrollPosition() || {};

        $scope.sectionLoaded = false;
        $scope.sections = [];
        scrollView.scrollTop(); // Scroll top so the spinner is seen.

        loadContent(sectionId).finally(function() {
            $scope.sectionLoaded = true;
            // Wait for the view to render and scroll back to the user's position.
            $timeout(function() {
                scrollView.scrollTo(scrollPosition.left, scrollPosition.top);
            });
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
