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

angular.module('mm.core')

/**
 * This directive shows a timer in format HH:MM:SS. When the countdown reaches 0, a function is called.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmTimer
 * @description
 * Given an end timestamp, this directive will show a timer in format HH:MM:SS.
 * When the countdown reaches 0, a function is called.
 *
 * @param {Number} endTime         Timestamp (in seconds) when the timer should end.
 * @param {Function} finished      Function called when the timer reaches 0.
 * @param {String} [timerText]     Text to show next to the timer. If not defined, no text shown.
 * @param {String} [timeLeftClass] Name of the class to apply with each second. By default, 'mm-timer-timeleft-'.
 *
 * Example usage:
 * <mm-timer end-time="endTime" finished="timeUp()" time-left-class="my-class-"
 *         timer-text="{{ 'mm.core.text' | translate }}"></mm-timer>
 */
.directive('mmTimer', function($interval, $mmUtil) {
    return {
        restrict: 'E',
        scope: {
            endTime: '=',
            finished: '&'
        },
        templateUrl: 'core/templates/timer.html',
        link: function(scope, element, attrs) {
            if (!scope.endTime || !scope.finished) {
                return;
            }

            var timeLeftClass = attrs.timeLeftClass || 'mm-timer-timeleft-',
                timeInterval;

            // Add mm-timer class.
            element.addClass('mm-timer item item-icon-left');
            scope.text = attrs.timerText || '';

            // Check time left every 200ms.
            timeInterval = $interval(function() {
                scope.timeLeft = scope.endTime - $mmUtil.timestamp();

                if (scope.timeLeft < 0) {
                    // Time is up! Stop the timer and call the finish function.
                    $interval.cancel(timeInterval);
                    scope.finished();
                    return;
                }

                // If the time has nearly expired, change the color.
                if (scope.timeLeft < 100 && !element.hasClass(timeLeftClass + scope.timeLeft)) {
                    // Time left has changed. Remove previous classes and add the new one.
                    element.removeClass(timeLeftClass + (scope.timeLeft + 1));
                    element.removeClass(timeLeftClass + (scope.timeLeft + 2));
                    element.addClass(timeLeftClass + scope.timeLeft);
                }
            }, 200);

            scope.$on('$destroy', function() {
                if (timeInterval) {
                    $interval.cancel(timeInterval);
                }
            });
        }
    };
});
