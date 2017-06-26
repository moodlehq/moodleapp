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
 * This directive shows a chronometer in format HH:MM:SS.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmChrono
 * @description
 * This directive shows a chronometer in format HH:MM:SS.
 *
 * If no startTime is provided, it will start at 00:00:00. If the startTime changes, the chrono
 * will be resetted to the startTime (and it will keep running if it was already running).
 * If an endTime is provided, the chrono will stop and call the onEnd function when that number of seconds is reached.
 * E.g. if startTime=60000 and endTime=120000, the chrono will start at 00:01:00 and end when it reaches 00:02:00.
 *
 * This directive listens for scope events to start and stop the timer. All events accept an object as a parameter.
 * If the chrono has an id, the events must pass an id in the param object.
 *
 * mm-chrono-start To start the chrono.
 * mm-chrono-stop To stop the chrono, leaving the current value.
 * mm-chrono-reset To stop and reset the chrono. If the chrono should play after reset, pass play=true.
 *
 * Example usage:
 * <mm-chrono id="'mychrono'" start-time="chronoStart" end-time="chronoEnd" auto-play="true" on-end="chronoEnd()"></mm-chrono>
 *
 * Then the controller can send events like this:
 *
 * $scope.$broadcast('mm-chrono-reset', {id: 'mychrono', play: true});
 *
 * @param {Number} [id]        ID to identify the chrono. It's used when sending events to the chrono.
 * @param {Number} [startTime] Number of milliseconds to put in the chrono before starting. Defaults to 0.
 * @param {Number} [endTime]   Number of milliseconds to stop the chrono. By default, never stop it.
 * @param {Boolean} [autoPlay] True to start the chrono automatically right after creating it.
 * @param {Function} [onEnd]   Function called when the endTime is reached.
 */
.directive('mmChrono', function($interval) {

    /**
     * Check if an event received belongs to the current chrono.
     *
     * @param  {Object} scope Chrono's scope.
     * @param  {Object} data  Data received by the event.
     * @return {Boolean}      True if this chrono, false otherwise.
     */
    function isCurrentChrono(scope, data) {
        if (!scope.id && (!data || !data.id)) {
            // Neither the chrono or the event has ID, consider it's this chrono.
            return true;
        } else if (scope.id && data && data.id == scope.id) {
            // IDs match, it's this chrono.
            return true;
        }

        return false;
    }

    /**
     * Reset the chrono, stopping it and setting it to startTime.
     *
     * @param  {Object} scope Chrono's scope.
     * @return {Void}
     */
    function reset(scope) {
        stop(scope);
        scope.time = scope.startTime || 0;
    }

    /**
     * Start the chrono if it isn't running.
     *
     * @param  {Object} scope Chrono's scope.
     * @return {Void}
     */
    function start(scope) {
        if (scope.isRunning) {
            // Already running.
            return;
        }

        var lastExecTime = Date.now();
        scope.isRunning = true;

        scope.interval = $interval(function() {
            // Increase the chrono.
            scope.time += Date.now() - lastExecTime;
            lastExecTime = Date.now();

            if (typeof scope.endTime != 'undefined' && scope.time > scope.endTime) {
                // End time reached, stop the timer and call the end function.
                stop(scope);
                if (scope.onEnd) {
                    scope.onEnd();
                }
            }
        }, 200);
    }

    /**
     * Stop the chrono, leaving the same time it has.
     *
     * @param  {Object} scope Chrono's scope.
     * @return {Void}
     */
    function stop(scope) {
        scope.isRunning = false;
        $interval.cancel(scope.interval);
    }

    return {
        restrict: 'E',
        scope: {
            id: '=?',
            startTime: '=?',
            endTime: '=?',
            autoPlay: '=?',
            onEnd: '&?'
        },
        template: '<span>{{ time / 1000 | mmSecondsToHMS }}</span>',
        link: function(scope) {
            scope.time = scope.startTime || 0;

            // Listen for events to start, stop and reset.
            scope.$on('mm-chrono-start', function (e, data) {
                if (isCurrentChrono(scope, data)) {
                    start(scope);
                }
            });

            scope.$on('mm-chrono-stop', function (e, data) {
                if (isCurrentChrono(scope, data)) {
                    stop(scope);
                }
            });

            scope.$on('mm-chrono-reset', function (e, data) {
                if (isCurrentChrono(scope, data)) {
                    reset(scope);
                    if (data && data.play) {
                        start(scope);
                    }
                }
            });

            // If start time changes, reset the chrono.
            scope.$watch('startTime', function() {
                var wasRunning = scope.isRunning;
                reset(scope);
                if (wasRunning) {
                    start(scope);
                }
            });

            if (scope.autoPlay && scope.autoPlay !== 'false') {
                // auto-play is true, start the chrono now.
                start(scope);
            }

            scope.$on('$destroy', function() {
                stop(scope);
            });
        }
    };
});
