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
 * Filter to format a timestamp to a locale string. Timestamp can be in seconds or milliseconds.
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmToLocaleString
 */
.filter('mmToLocaleString', function() {
    return function(text) {
        var timestamp = parseInt(text);

        if (isNaN(timestamp) || timestamp < 0) {
            // Date not valid.
            return '';
        }
        if (timestamp < 100000000000) {
            // Timestamp is in seconds, convert it to milliseconds.
            timestamp = timestamp * 1000;
        }
        return new Date(timestamp).toLocaleString();
    };
});
