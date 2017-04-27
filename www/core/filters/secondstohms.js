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
 * Filter to convert a number of seconds to Hours:Minutes:Seconds.
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmSecondsToHMS
 * @description
 * This converts a number of seconds to Hours:Minutes:Seconds. If the number of seconds is negative,
 * returns 00:00:00.
 */
.filter('mmSecondsToHMS', function($mmText, mmCoreSecondsHour, mmCoreSecondsMinute) {

    return function(seconds) {
        var hours,
            minutes;

        if (typeof seconds == 'undefined' || seconds < 0) {
            seconds = 0;
        }

        hours = Math.floor(seconds / mmCoreSecondsHour);
        seconds -= hours * mmCoreSecondsHour;
        minutes = Math.floor(seconds / mmCoreSecondsMinute);
        seconds -= minutes * mmCoreSecondsMinute;

        return $mmText.twoDigits(hours) + ':' + $mmText.twoDigits(minutes) + ':' + $mmText.twoDigits(seconds);
    };

});
