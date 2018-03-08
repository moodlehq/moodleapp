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

angular.module('mm.addons.myoverview')

/**
 * Controller to handle my overview.
 *
 * @module mm.addons.myoverview
 * @ngdoc controller
 * @name mmaMyOverviewCtrl
 */
.controller('mmaMyOverviewCtrl', function($scope, $mmaMyOverview, $mmUtil, $q, $mmCourses, $mmCoursesDelegate, $mmCourseHelper) {
    var prefetchIconsInitialized = false;

    $scope.tabShown = 'courses';
    $scope.timeline = {
        sort: 'sortbydates',
        events: [],
        loaded: false,
        canLoadMore: false
    };
    $scope.timelineCourses = {
        courses: [],
        loaded: false,
        canLoadMore: false
    };
    $scope.courses = {
        selected: 'inprogress',
        loaded: false,
        filter: ''
    };
    $scope.showGrid = true;
    $scope.showFilter = false;

    $scope.searchEnabled = $mmCourses.isSearchCoursesAvailable() && !$mmCourses.isSearchCoursesDisabledInSite();
    $scope.prefetchCoursesData = {
        inprogress: {},
        past: {},
        future: {}
    };

    function fetchMyOverviewTimeline(afterEventId, refresh) {
        return $mmaMyOverview.getActionEventsByTimesort(afterEventId).then(function(events) {
            $scope.timeline.events = [];
            $scope.timeline.events = $scope.timeline.events.concat(events.events);
            $scope.timeline.canLoadMore = events.canLoadMore;
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting my overview data.');
            return $q.reject();
        });
    }

    function fetchMyOverviewTimelineByCourses() {
        return fetchUserCourses().then(function(courses) {
            var today = moment().unix(),
                courseIds = [];
            courses = courses.filter(function(course) {
                return course.startdate <= today && (!course.enddate || course.enddate >= today);
            });

            $scope.timelineCourses.courses = courses;
            if (courses.length > 0) {
                courseIds = courses.map(function(course) {
                    return course.id;
                });
                return $mmaMyOverview.getActionEventsByCourses(courseIds).then(function(courseEvents) {
                    angular.forEach($scope.timelineCourses.courses, function(course) {
                        course.events = courseEvents[course.id].events;
                        course.canLoadMore = courseEvents[course.id].canLoadMore;
                    });
                });
            }
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting my overview data.');
            return $q.reject();
        });
    }

    function fetchMyOverviewCourses() {
        return fetchUserCourses().then(function(courses) {
            var today = moment().unix();

            $scope.courses.filter = ''; // Filter value MUST be set after courses are shown.
            $scope.showFilter = false;
            $scope.courses.past = [];
            $scope.courses.inprogress = [];
            $scope.courses.future = [];

            angular.forEach(courses, function(course) {
                if (course.startdate > today) {
                    // Courses that have not started yet.
                    $scope.courses.future.push(course);
                } else if (course.enddate && course.enddate < today) {
                    // Courses that have already ended.
                    $scope.courses.past.push(course);
                } else {
                    // Courses still in progress. Either their end date is not set, or the end date is not yet past the current date.
                    $scope.courses.inprogress.push(course);
                }
            });

            initPrefetchCoursesIcons();
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting my overview data.');
            return $q.reject();
        });
    }

    function fetchUserCourses() {
        var courseIds = [];
        return $mmCourses.getUserCourses().then(function(courses) {
            courseIds = courses.map(function(course) {
                return course.id;
            });

            // Load course options of the course.
            return $mmCourses.getCoursesOptions(courseIds).then(function(options) {
                angular.forEach(courses, function(course) {
                    course.showProgress = true;
                    course.progress = isNaN(parseInt(course.progress, 10)) ? false : parseInt(course.progress, 10);

                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });

                return courses.sort(function(a, b) {
                    var compareA = a.fullname.toLowerCase(),
                        compareB = b.fullname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
            });
        });
    }

    // Initialize the prefetch icon for selected courses.
    function initPrefetchCoursesIcons() {
        if (prefetchIconsInitialized) {
            // Already initialized.
            return;
        }

        prefetchIconsInitialized = true;

        Object.keys($scope.prefetchCoursesData).forEach(function(filter) {
            if (!$scope.courses[filter] || $scope.courses[filter].length < 2) {
                // Not enough courses.
                $scope.prefetchCoursesData[filter].icon = '';
                return;
            }

            $mmCourseHelper.determineCoursesStatus($scope.courses[filter]).then(function(status) {
                var icon = $mmCourseHelper.getCourseStatusIconFromStatus(status);
                if (icon == 'spinner') {
                    // It seems all courses are being downloaded, show a download button instead.
                    icon = 'ion-ios-cloud-download-outline';
                }
                $scope.prefetchCoursesData[filter].icon = icon;
            });

        });
    }

    $scope.switchFilter = function() {
        $scope.showFilter = !$scope.showFilter;
        if (!$scope.showFilter) {
            $scope.courses.filter = "";
        }
    };

    $scope.switchGrid = function() {
        $scope.showGrid = !$scope.showGrid;
    };

    // Pull to refresh.
    $scope.refreshMyOverview = function() {
        var promises = [];

        if ($scope.tabShown == 'timeline') {
            promises.push($mmaMyOverview.invalidateActionEventsByTimesort());
            promises.push($mmaMyOverview.invalidateActionEventsByCourses());
        }

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCoursesDelegate.clearAndInvalidateCoursesOptions());

        return $q.all(promises).finally(function() {
            var promise;

            switch ($scope.tabShown) {
                case 'timeline':
                    switch ($scope.timeline.sort) {
                        case 'sortbydates':
                            promise = fetchMyOverviewTimeline(undefined, true);
                            break;
                        case 'sortbycourses':
                            promise = fetchMyOverviewTimelineByCourses();
                            break;
                    }
                    break;
                case 'courses':
                    prefetchIconsInitialized = false;
                    promise = fetchMyOverviewCourses();
                    break;
            }

            return promise;
        });
    };

    // Change timeline sort being viewed.
    $scope.switchSort = function() {
        switch ($scope.timeline.sort) {
            case 'sortbydates':
                if (!$scope.timeline.loaded) {
                    fetchMyOverviewTimeline().finally(function() {
                        $scope.timeline.loaded = true;
                    });
                }
                break;
            case 'sortbycourses':
                if (!$scope.timelineCourses.loaded) {
                    fetchMyOverviewTimelineByCourses().finally(function() {
                        $scope.timelineCourses.loaded = true;
                    });
                }
                break;
        }
    };

    // Change tab being viewed.
    $scope.switchTab = function(tab) {
        $scope.tabShown = tab;
        switch ($scope.tabShown) {
            case 'timeline':
                if (!$scope.timeline.loaded) {
                    return fetchMyOverviewTimeline().finally(function() {
                        $scope.timeline.loaded = true;
                    });
                }
                break;
            case 'courses':
                if (!$scope.courses.loaded) {
                    return fetchMyOverviewCourses().finally(function() {
                        $scope.courses.loaded = true;
                    });
                }
                break;
        }
    };

    $scope.switchTab($scope.tabShown);

    // Load more events.
    $scope.loadMoreTimeline = function() {
        return fetchMyOverviewTimeline($scope.timeline.canLoadMore);
    };

    // Load more events.
    $scope.loadMoreCourse = function(course) {
        return $mmaMyOverview.getActionEventsByCourse(course.id, course.canLoadMore).then(function(courseEvents) {
            course.events = course.events.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        });
    };

    // Download all the shown courses.
    $scope.downloadCourses = function() {
        var selected = $scope.courses.selected,
            selectedData = $scope.prefetchCoursesData[selected],
            initialIcon = selectedData.icon;

        selectedData.icon = 'spinner';
        selectedData.badge = '';
        return $mmCourseHelper.confirmAndPrefetchCourses($scope.courses[selected]).then(function(downloaded) {
            selectedData.icon = downloaded ? 'ion-android-refresh' : initialIcon;
        }, function(error) {
            if (!$scope.$$destroyed) {
                $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingcourse', true);
                selectedData.icon = initialIcon;
            }
        }, function(progress) {
            selectedData.badge = progress.count + ' / ' + progress.total;
        }).finally(function() {
            selectedData.badge = '';
        });
    };
});
