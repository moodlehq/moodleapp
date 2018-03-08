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
 * Directive to render the overview events lists.
 *
 * @module mm.addons.myoverview
 * @ngdoc directive
 * @name mmaMyOverviewEventList
 * @description
 *
 * Parameters received by this directive and shared with the directive to render the plugin:
 *
 * @param {Array} events        Array of event items to show.
 * @param {Boolean} showCourse  Whether of not show course name.
 */
.directive('mmaMyOverviewEventList', function($mmCourse, $mmUtil, $mmText, $mmContentLinksHelper, $mmSite) {

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

    return {
        restrict: 'E',
        scope: {
            events: '=',
            canLoadMore: '=?',
            showCourse: '=?',
            loadMore: '&'
        },
        templateUrl: 'addons/myoverview/templates/eventlist.html',
        link: function(scope, element, attrs) {

            updateEvents(scope.events);

            scope.$watch('events', function(newValue) {
                updateEvents(newValue);
            });

            function updateEvents(events) {
                scope.empty = !events || events.length <= 0;
                if (!scope.empty) {
                    scope.recentlyOverdue = filterEventsByTime(events, -14, 0);
                    scope.today = filterEventsByTime(events, 0, 1);
                    scope.next7Days = filterEventsByTime(events, 1, 7);
                    scope.next30Days = filterEventsByTime(events, 7, 30);
                    scope.future = filterEventsByTime(events, 30);
                }
            }

            scope.loadMoreEvents = function() {
                scope.loadingMore = true;
                scope.loadMore().finally(function() {
                    scope.loadingMore = false;
                });
            };

            scope.action = function(e, url) {
                e.preventDefault();
                e.stopPropagation();

                // Fix URL format.
                url = $mmText.decodeHTMLEntities(url);

                var modal = $mmUtil.showModalLoading();
                $mmContentLinksHelper.handleLink(url).then(function(treated) {
                    if (!treated) {
                        return $mmSite.openInBrowserWithAutoLoginIfSameSite(url);
                    }
                }).finally(function() {
                    modal.dismiss();
                });
                return false;
            }
        }
    };
});
