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
 * Filter to display a date using the day, or the time.
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmDateDayOrTime
 * @description
 * This shows a short version of a date. Use this filter when you want
 * the user to visualise when the action was done relatively to today's date.
 *
 * For instance, if the action happened during this day it will display the time,
 * but when the action happened few days ago, it will display the day of the week.
 *
 * The older the date is, the more information about it will be displayed.
 *
 * This filter expects a timestamp NOT including milliseconds.
 */
.filter('mmDateDayOrTime', function($translate) {

    return function(timestamp) {
        return moment(timestamp * 1000).calendar(null, {
            sameDay: $translate.instant('mm.core.dftimedate'),
            lastDay: $translate.instant('mm.core.dflastweekdate'),
            lastWeek: $translate.instant('mm.core.dflastweekdate')
        });
    };

});
