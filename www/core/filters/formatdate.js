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
 * Filter to format a date.
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmFormatDate
 * @description
 * This formats a timestamp into a date. Parameters:
 *
 * @param {Number} timestamp Timestamp to format (in seconds). If not defined, use current time.
 * @param {String} format    Format to use. It should be a string code to handle i18n (e.g. mm.core.dftimedate). If the code doesn't
 *                           have a prefix, 'mm.core' will be used by default. E.g. 'dftimedate' -> 'mm.core.dftimedate'.
 * @return {String}          Formatted date.
 */
.filter('mmFormatDate', function($translate) {

    return function(timestamp, format) {
        if (format.indexOf('.') == -1) {
            format = 'mm.core.' + format;
        }
        return moment(timestamp).format($translate.instant(format));
    };

});
