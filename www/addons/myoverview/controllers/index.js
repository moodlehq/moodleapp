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
.controller('mmaMyOverviewCtrl', function($scope, $mmaMyOverview, $mmUtil, $q, $mmCourse) {

    var timeline = [];
    $scope.tabShown = 'timeline';
    $scope.timeline = {
        loaded: false,
        loadingMore: false,
        canLoadMore: false
    }

    function fetchMyOverviewTimeline(afterEventId) {
        return $mmaMyOverview.getActionEventsByTimesort(afterEventId).then(function(events) {
            timeline = timeline.concat(events);

            $scope.timeline.empty = !timeline.length;
            $scope.timeline.recentlyOverdue = filterEventsByTime(timeline, -14, 0);
            $scope.timeline.today = filterEventsByTime(timeline, 0, 1);
            $scope.timeline.next7Days = filterEventsByTime(timeline, 1, 7);
            $scope.timeline.next30Days = filterEventsByTime(timeline, 7, 30);
            $scope.timeline.future = filterEventsByTime(timeline, 30);
            $scope.timeline.canLoadMore = events.length >= 20;

        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting my overview data.');
            return $q.reject();
        });
    }

    function filterEventsByTime(events, start, end) {
        start = moment().add(start, 'days').unix();
        end = typeof end == "undefined" ? false : moment().add(end, 'days').unix();

        return events.filter(function(event) {
            if (end) {
                return start <= event.timesort && event.timesort < end;
            }

            return start <= event.timesort;
        }).map(function(event) {
            event.iconUrl = $mmCourse.getModuleIconSrc(event.icon.component);
            return event;
        });
    }

    // Pull to refresh.
    $scope.refreshMyOverview = function() {
        switch($scope.tabShown) {
            case 'timeline':
                timeline = [];
                $mmaMyOverview.invalidateActionEventsByTimesort().finally(function() {
                    fetchMyOverviewTimesort().finally(function() {
                        $scope.$broadcast('scroll.refreshComplete');
                    });
                });
                break;
            case 'courses':
                break;
        }
    };

    // Change tab being viewed.
    $scope.switchTab = function(tab) {
        $scope.tabShown = tab;
        switch($scope.tabShown) {
            case 'timeline':
                if (!$scope.timeline.loaded) {
                    fetchMyOverviewTimeline().finally(function() {
                        $scope.timeline.loaded = true;
                    });
                }
                break;
            case 'courses':
                break;
        }
    };

    $scope.switchTab('timeline');

    // Load more events.
    $scope.loadMore = function() {
        switch($scope.tabShown) {
            case 'timeline':
                $scope.timeline.loadingMore = true;
                fetchMyOverviewTimeline(timeline[timeline.length -1].id).catch(function(message) {
                    $mmUtil.showErrorModalDefault(message, 'Error getting my overview data.');
                }).finally(function() {
                    $scope.timeline.loadingMore = false;
                });
                break;
            case 'courses':
                break;
        }

    };
});
