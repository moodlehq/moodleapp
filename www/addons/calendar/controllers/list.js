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
.controller('mmaCalendarListCtrl', function($scope, $log, $state, $mmaCalendar, $mmUtil, mmaCalendarDaysInterval) {

    $log = $log.getInstance('mmaCalendarListCtrl');

    var daysLoaded,
        emptyEventsTimes; // Variable to identify consecutive calls returning 0 events.

    // Convenience function to initialize variables.
    function initVars() {
        daysLoaded = 0;
        emptyEventsTimes = 0;
        $scope.events = [];
        $scope.canLoadMore = true;
    }

    // Get event ng-href depending on Mobile or Tablet.
    // We need to use ng-href instead of ui-sref to make it work when list is refreshed.
    // @todo Adapt to tablet split view when it is implemented.
    $scope.getUrl = function(id) {
        return $state.href('site.calendar-event', {id: id});
    };

    // Convenience function that fetches the events and updates the scope.
    function fetchEvents(refresh) {
        if (refresh) {
            initVars();
        }

        return $mmaCalendar.getEvents(daysLoaded, mmaCalendarDaysInterval, refresh).then(function(events) {
            daysLoaded += mmaCalendarDaysInterval;

            if (events.length === 0) {
                emptyEventsTimes++;
                if (emptyEventsTimes > 5) { // Stop execution if we retrieve empty list 6 consecutive times.
                    $scope.canLoadMore = false;
                } else if($scope.events.length === 0) {
                    // No events returned and empty list. Load next events.
                    return fetchEvents();
                }
            } else {
                angular.forEach(events, $mmaCalendar.formatEventData);
                if (refresh) {
                    $scope.events = events;
                } else {
                    $scope.events = $scope.events.concat(events);
                }
                $scope.count = $scope.events.length;
            }
        }, function(err) {
            if (err) {
                $log.error(err);
            }
            $mmUtil.showErrorModal('mma.calendar.errorloadevents', true);
        });
    }

    initVars();
    $scope.count = 0;

    // Get first events.
    fetchEvents().finally(function() {
        $scope.eventsLoaded = true;
    });

    // Load more events.
    $scope.loadMoreEvents = function() {
        fetchEvents().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    // Pull to refresh.
    $scope.refreshEvents = function() {
        $mmaCalendar.invalidateEventsList().finally(function() {
            fetchEvents(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
