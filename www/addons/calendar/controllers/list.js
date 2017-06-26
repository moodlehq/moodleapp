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

angular.module('mm.addons.calendar')

/**
 * Controller to handle calendar events.
 *
 * @module mm.addons.calendar
 * @ngdoc controller
 * @name mmaCalendarListCtrl
 */
.controller('mmaCalendarListCtrl', function($scope, $stateParams, $log, $state, $mmaCalendar, $mmUtil, $timeout, $mmEvents,
        mmaCalendarDaysInterval, $ionicScrollDelegate, $mmLocalNotifications, $mmCourses, mmaCalendarDefaultNotifTimeChangedEvent,
        $ionicPopover, $q, $translate, $ionicPlatform) {

    $log = $log.getInstance('mmaCalendarListCtrl');

    var daysLoaded,
        emptyEventsTimes, // Variable to identify consecutive calls returning 0 events.
        scrollView = $ionicScrollDelegate.$getByHandle('mmaCalendarEventsListScroll'),
        obsDefaultTimeChange,
        popover,
        allCourses = {
            id: -1,
            fullname: $translate.instant('mm.core.fulllistofcourses')
        };

    $scope.events = [];
    $scope.eventToLoad = 1;

    if ($stateParams.eventid && !$ionicPlatform.isTablet()) {
        // There is an event to load and it's a phone device, open the event in a new state.
        $state.go('site.calendar-event', {id: $stateParams.eventid});
    }

    // Convenience function to initialize variables.
    function initVars() {
        daysLoaded = 0;
        emptyEventsTimes = 0;
    }

    // Fetch all the data required for the view.
    function fetchData(refresh) {
        initVars();

        return loadCourses().then(function() {
            return fetchEvents(refresh);
        });
    }

    // Convenience function that fetches the events and updates the scope.
    function fetchEvents(refresh) {
        return $mmaCalendar.getEvents(daysLoaded, mmaCalendarDaysInterval, refresh).then(function(events) {
            daysLoaded += mmaCalendarDaysInterval;

            if (events.length === 0) {
                emptyEventsTimes++;
                if (emptyEventsTimes > 5) { // Stop execution if we retrieve empty list 6 consecutive times.
                    $scope.canLoadMore = false;
                    if (refresh) {
                        $scope.events = [];
                    }
                } else {
                    // No events returned, load next events.
                    return fetchEvents(refresh);
                }
            } else {
                // Sort the events by timestart, they're ordered by id.
                events.sort(function(a, b) {
                    return a.timestart - b.timestart;
                });

                angular.forEach(events, $mmaCalendar.formatEventData);
                if (refresh) {
                    $scope.events = events;
                } else {
                    // Filter events with same ID. Repeated events are returned once per WS call, show them only once.
                    $scope.events = $mmUtil.mergeArraysWithoutDuplicates($scope.events, events, 'id');
                }
                $scope.canLoadMore = true;

                // Schedule notifications for the events retrieved (might have new events).
                $mmaCalendar.scheduleEventsNotifications(events);
            }

            // Resize the scroll view so infinite loading is able to calculate if it should load more items or not.
            scrollView.resize();
        }, function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.calendar.errorloadevents', true);
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }

    // Load courses for the popover.
    function loadCourses() {
        return $mmCourses.getUserCourses(false).then(function(courses) {
            // Add "All courses".
            courses.unshift(allCourses);
            $scope.courses = courses;
        });
    }

    $scope.filter = {
        courseid: -1,
    };
    $scope.notificationsEnabled = $mmLocalNotifications.isAvailable();

    // Get first events.
    fetchData().then(function() {
        if ($stateParams.eventid && $ionicPlatform.isTablet()) {
            // There is an event to load and it's a tablet device. Search the position of the event in the list and load it.
            var found = false;

            for (var i = 0; i < $scope.events.length; i++) {
                if ($scope.events[i].id == $stateParams.eventid) {
                    $scope.eventToLoad = i + 1;
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Event not found in the list, open it in a new state. Use a $timeout to open the state after the
                // split view is loaded.
                $timeout(function() {
                    $state.go('site.calendar-event', {id: $stateParams.eventid});
                });
            }
        }
    }).finally(function() {
        $scope.eventsLoaded = true;
    });

    // Init popover.
    $ionicPopover.fromTemplateUrl('addons/calendar/templates/course_picker.html', {
        scope: $scope
    }).then(function(po) {
        popover = po;

        // Open the popover to filter by course.
        $scope.pickCourse = function(event) {
            popover.show(event);
        };

        // Course picked.
        $scope.coursePicked = function() {
            popover.hide();
            scrollView.scrollTop();
        };
    });

    // Load more events.
    $scope.loadMoreEvents = function() {
        fetchEvents().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    // Pull to refresh.
    $scope.refreshEvents = function() {
        var promises = [];
        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmaCalendar.invalidateEventsList());

        return $q.all(promises).finally(function() {
            return fetchData(true);
        });
    };

    // Open calendar events settings.
    $scope.openSettings = function() {
        $state.go('site.calendar-settings');
    };

    // Filter event by course.
    $scope.filterEvent = function(event) {
        if ($scope.filter.courseid == -1) {
            // All courses, nothing to filter.
            return true;
        }

        // Show the event if it has courseid 1 or if it matches the selected course.
        return event.courseid === 1 || event.courseid == $scope.filter.courseid;
    };

    if ($scope.notificationsEnabled) {
        // Re-schedule events if default time changes.
        obsDefaultTimeChange = $mmEvents.on(mmaCalendarDefaultNotifTimeChangedEvent, function() {
            $mmaCalendar.scheduleEventsNotifications($scope.events);
        });
    }

    $scope.$on('$destroy', function() {
        obsDefaultTimeChange && obsDefaultTimeChange.off && obsDefaultTimeChange.off();
        popover && popover.remove();
    });
});
