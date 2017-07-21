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
 * Sections view controller.
 *
 * @module mm.core.course
 * @ngdoc controller
 * @name mmCourseSectionsCtrl
 */
.controller('mmCourseSectionsCtrl', function($mmCourse, $mmUtil, $scope, $stateParams, $translate, $mmCourseHelper, $mmEvents,
            $mmSite, $mmCoursePrefetchDelegate, $mmCourses, $q, $ionicHistory, $ionicPlatform, mmCoreCourseAllSectionsId,
            mmCoreEventSectionStatusChanged, $state, $timeout, $mmCoursesDelegate, $controller) {
    var courseId = $stateParams.courseid,
        sectionId = parseInt($stateParams.sid, 10),
        sectionNumber = parseInt($stateParams.sectionnumber, 10),
        moduleId = $stateParams.moduleid,
        course = $stateParams.course ? angular.copy($stateParams.course) : false;

    $scope.courseId = courseId;
    $scope.sectionToLoad = 2; // Load "General" section by default.
    $scope.fullname = course.fullname || "";
    $scope.downloadSectionsEnabled = $mmCourseHelper.isDownloadSectionsEnabled();
    $scope.downloadSectionsIcon = getDownloadSectionIcon();
    $scope.sectionHasContent = $mmCourseHelper.sectionHasContent;
    $scope.courseActions = [];

    function loadSections(refresh) {
        var promise;

        if (course) {
            promise = $q.when();
        } else {
            // We don't have the course name, get it.
            promise = $mmCourses.getUserCourse(courseId).catch(function() {
                // Fail, maybe user isn't enrolled but he has capabilities to view it.
                return $mmCourses.getCourse(courseId);
            }).then(function(courseResponse) {
                course = courseResponse;
                return course.fullname;
            }).catch(function() {
                // Fail again, return generic value.
                return $translate.instant('mm.core.course');
            });
        }

        return promise.then(function(courseFullName) {
            if (courseFullName) {
                $scope.fullname = courseFullName;
            }

            // Load course actions in background.
            $mmCoursesDelegate.getNavHandlersForCourse(course, refresh, true).then(function(buttons) {
                $scope.courseActions = buttons.map(function(button) {
                    var newScope = $scope.$new();
                    $controller(button.controller, {$scope: newScope});

                    var buttonInfo = {
                            text: $translate.instant(newScope.title),
                            icon: newScope.icon || false,
                            priority: button.priority || false,
                            action: function() {
                                // Fake event (already prevented) to avoid errors on app.
                                var ev = document.createEvent("MouseEvent");
                                return newScope.action(ev, course);
                            }
                        };

                    newScope.$destroy();
                    return buttonInfo;
                });
            });

            // Get the sections.
            return $mmCourse.getSections(courseId, false, true).then(function(sections) {
                sections = sections.map(function(section) {
                    section.name = section.name.trim() || section.section;
                    return section;
                });

                // Add a fake first section (all sections).
                var result = [{
                    name: $translate.instant('mm.course.allsections'),
                    id: mmCoreCourseAllSectionsId
                }].concat(sections);


                $scope.sections = result;

                if ($scope.downloadSectionsEnabled) {
                    calculateSectionStatus(refresh);
                }
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mm.course.couldnotloadsections', true);
        });
    }

    $scope.toggleDownloadSections = function() {
        $scope.downloadSectionsEnabled = !$scope.downloadSectionsEnabled;
        $mmCourseHelper.setDownloadSectionsEnabled($scope.downloadSectionsEnabled);
        $scope.downloadSectionsIcon = getDownloadSectionIcon();
        if ($scope.downloadSectionsEnabled) {
            calculateSectionStatus(false);
        }
    };

    // Convenience function to calculate icon for the contextual menu.
    function getDownloadSectionIcon() {
        return $scope.downloadSectionsEnabled ? 'ion-android-checkbox-outline' : 'ion-android-checkbox-outline-blank';
    }

    // Calculate status of the sections. We don't return the promise because
    // we don't want to block the rendering of the sections.
    function calculateSectionStatus(refresh) {
        $mmCourseHelper.calculateSectionsStatus($scope.sections, $scope.courseId, true, refresh).catch(function() {
            // Ignore errors (shouldn't happen).
        }).then(function(downloadpromises) {
            // If we restored any download we'll recalculate the status once all of them have finished.
            if (downloadpromises && downloadpromises.length) {
                $mmUtil.allPromises(downloadpromises).catch(function(error) {
                    if (!$scope.$$destroyed) {
                        $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingsection', true);
                    }
                }).finally(function() {
                    if (!$scope.$$destroyed) {
                        // Recalculate the status.
                        $mmCourseHelper.calculateSectionsStatus($scope.sections, $scope.courseId, false);
                    }
                });
            }
        });
    }

    // Prefetch a section. The second parameter indicates if the prefetch was started manually (true)
    // or it was automatically started because all modules are being downloaded (false).
    function prefetch(section, manual) {
        $mmCourseHelper.prefetch(section, courseId, $scope.sections).catch(function(error) {
            // Don't show error message if scope is destroyed or it's an automatic download but we aren't in this state.
            if ($scope.$$destroyed) {
                return;
            }

            var current = $ionicHistory.currentStateName(),
                isCurrent = ($ionicPlatform.isTablet() && current == 'site.mm_course.mm_course-section') ||
                            (!$ionicPlatform.isTablet() && current == 'site.mm_course');
            if (!manual && !isCurrent) {
                return;
            }

            $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingsection', true);
        }).finally(function() {
            if (!$scope.$$destroyed) {
                // Recalculate the status.
                $mmCourseHelper.calculateSectionsStatus($scope.sections, courseId, false);
            }
        });
    }

    // Convenience function to autoload a section if sectionId param is set.
    function autoloadSection() {
        if (sectionId || sectionNumber >= 0) {
            if ($ionicPlatform.isTablet()) {
                // Search the position of the section to load.
                for (var index in $scope.sections) {
                    var section = $scope.sections[index];
                    if (section.id == sectionId || (sectionNumber >= 0 && section.section === sectionNumber)) {
                        $scope.sectionToLoad = parseInt(index, 10) + 1;
                        break;
                    }
                }

                // Set moduleId to pass it to the new state when the section is autoloaded. We unset it after this
                // to prevent autoloading the module when the user manually loads a section.
                $scope.moduleId = moduleId;
                $timeout(function() {
                    $scope.moduleId = null; // Unset moduleId when
                }, 500);
            } else {
                if (!sectionId) {
                    // Search the section ID by section number.
                    for (var index in $scope.sections) {
                        var section = $scope.sections[index];
                        if (section.section == sectionNumber) {
                            sectionId = section.id
                            break;
                        }
                    }
                }

                if (sectionId) {
                    $state.go('site.mm_course-section', {
                        sectionid: sectionId,
                        cid: courseId,
                        mid: moduleId
                    });
                }
            }
        }
    }

    $scope.doRefresh = function() {
        var promises = [];

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCourse.invalidateSections(courseId));

        if ($scope.sections && $scope.downloadSectionsEnabled) {
            // Invalidate modules prefetch data.
            var modules = $mmCourseHelper.getSectionsModules($scope.sections);
            promises.push($mmCoursePrefetchDelegate.invalidateModules(modules, courseId));
        }

        promises.push($mmCoursesDelegate.clearAndInvalidateCoursesOptions(courseId));

        $q.all(promises).finally(function() {
            loadSections(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    $scope.prefetch = function(e, section) {
        e.preventDefault();
        e.stopPropagation();

        section.isCalculating = true;
        $mmCourseHelper.confirmDownloadSize(courseId, section, $scope.sections).then(function() {
            prefetch(section, true);
        }).finally(function() {
            section.isCalculating = false;
        });
    };

    loadSections().finally(function() {
        autoloadSection();
        $scope.sectionsLoaded = true;
    });

    // Listen for section status changes.
    var statusObserver = $mmEvents.on(mmCoreEventSectionStatusChanged, function(data) {
        if ($scope.downloadSectionsEnabled && $scope.sections && $scope.sections.length && data.siteid === $mmSite.getId() &&
                    !$scope.$$destroyed && data.sectionid) {
            // Check if the affected section is being downloaded. If so, we don't update section status
            // because it'll already be updated when the download finishes.
            if ($mmCoursePrefetchDelegate.isBeingDownloaded($mmCourseHelper.getSectionDownloadId({id: data.sectionid}))) {
                return;
            }

            // Recalculate the status.
            $mmCourseHelper.calculateSectionsStatus($scope.sections, courseId, false).then(function() {
                var section;
                angular.forEach($scope.sections, function(s) {
                    if (s.id === data.sectionid) {
                        section = s;
                    }
                });
                if (section) {
                    var downloadid = $mmCourseHelper.getSectionDownloadId(section);
                    if (section.isDownloading && !$mmCoursePrefetchDelegate.isBeingDownloaded(downloadid)) {
                        // All the modules are now downloading, set a download all promise.
                        prefetch(section, false);
                    }
                }
            });
        }
    });

    $scope.$on('$destroy', function() {
        statusObserver && statusObserver.off && statusObserver.off();
    });
});
