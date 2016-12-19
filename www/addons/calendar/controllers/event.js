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
 * Controller to handle an event.
 *
 * @module mm.addons.calendar
 * @ngdoc controller
 * @name mmaCalendarEventCtrl
 */
.controller('mmaCalendarEventCtrl', function($scope, $log, $stateParams, $mmaCalendar, $mmUtil, $mmCourse, $mmCourses, $translate,
        $mmLocalNotifications) {

    $log = $log.getInstance('mmaCalendarEventCtrl');

    var eventid = parseInt($stateParams.id);

    // Convenience function that fetches the event and updates the scope.
    function fetchEvent(refresh) {
        return $mmaCalendar.getEvent(eventid, refresh).then(function(e) {
            $mmaCalendar.formatEventData(e);
            $scope.event = e;
            $scope.title = e.name;

            if (e.moduleicon) {
                // It's a module event, translate the module name to the current language.
                var name = $mmCourse.translateModuleName(e.modulename);
                if (name.indexOf('mm.core.mod') === -1) {
                    e.modulename = name;
                }
            }

            if (e.courseid > 1) {
                // It's a course event, retrieve the course name.
                $mmCourses.getUserCourse(e.courseid, true).then(function(course) {
                    $scope.coursename = course.fullname;
                });
            }

        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.calendar.errorloadevent', true);
            }
        });
    }

    // Get event.
    fetchEvent().finally(function() {
        $scope.eventLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshEvent = function() {
        fetchEvent(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.notificationsEnabled = $mmLocalNotifications.isAvailable();
    if ($scope.notificationsEnabled) {

        $mmaCalendar.getEventNotificationTimeOption(eventid).then(function(notificationtime) {
            $scope.notification = { // Use an object, otherwise changes are not reflected.
                time: String(notificationtime)
            };
        });

        $mmaCalendar.getDefaultNotificationTime().then(function(defaultTime) {
            if (defaultTime === 0) {
                // Disabled by default.
                $scope.defaultTimeReadable = $translate.instant('mm.settings.disabled');
            } else {
                $scope.defaultTimeReadable = moment.duration(defaultTime * 60 * 1000).humanize();
            }
        });

        $scope.updateNotificationTime = function() {
            var time = parseInt($scope.notification.time, 10);
            if (!isNaN(time) && $scope.event && $scope.event.id) {
                $mmaCalendar.updateNotificationTime($scope.event, time);
            }
        };
    }
});
