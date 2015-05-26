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
 * @todo Optimise, pre compile some variables?
 * @todo Use proper localised filter.
 * @todo Add more rules
 */
.filter('mmDateDayOrTime', function($filter) {

  return function(timestamp) {

    var d = new Date(timestamp * 1000);

    var todayStarts = new Date();
    var todayEnds = new Date();
    var sixDayStarts = new Date();
    var yearStarts = new Date();
    var yearEnds = new Date();
    var monthStarts = new Date();
    var monthEnds = new Date();
    var dateStarts = new Date(d);
    var dateEnds = new Date(d);

    todayStarts.setHours(0, 0, 0, 0);
    todayEnds.setHours(23, 59, 59, 999);
    dateStarts.setHours(0, 0, 0, 0);
    dateEnds.setHours(23, 59, 59, 999);
    sixDayStarts.setHours(0, 0, 0, 0);
    sixDayStarts = new Date(sixDayStarts.getTime() - (3600 * 24 * 6 * 1000));
    monthStarts.setHours(0, 0, 0, 0);
    monthStarts.setDate(1);
    monthEnds = new Date(monthEnds.getFullYear(), monthEnds.getMonth() + 1, 0);
    monthEnds.setHours(23, 59, 59, 999);
    yearStarts = new Date(yearStarts.getFullYear() - 1, 12, 1);
    yearStarts.setHours(0, 0, 0, 0);
    yearEnds = new Date(yearEnds.getFullYear(), 12, 0);
    yearEnds.setHours(23, 59, 59, 999);

    if (d >= todayStarts && d <= todayEnds) {
      // Today.
      return $filter('date')(d, 'h:mm a');
    } else if (d >= sixDayStarts && d < todayStarts) {
      // In the last 6 days.
      return $filter('date')(d, 'EEE');
    } else if (d >= monthStarts && d <= monthEnds) {
      // In the same month.
      return $filter('date')(d, 'EEE, d');
    } else if (d >= yearStarts && d <= yearEnds) {
      // In the same year.
      return $filter('date')(d, 'MMM d');
    } else {
      return $filter('date')(d, 'd MMM yy');
    }
  };

});
