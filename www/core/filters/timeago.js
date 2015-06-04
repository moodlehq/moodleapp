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
 * Filter to turn a UNIX timestamp to "time ago".
 *
 * @module mm.core
 * @ngdoc filter
 * @name mmTimeAgo
 */
.filter('mmTimeAgo', function($translate) {

    return function(timestamp) {
        // Convert to javascript timestamp (millisecs)
        timestamp *= 1000;
        var seconds = Math.floor((new Date() - timestamp) / 1000);

        var stringName;

        var interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            stringName = 'numyears';
        } else {
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) {
                stringName = 'nummonths';
            } else {
                interval = Math.floor(seconds / 86400);
                if (interval >= 1) {
                    stringName = 'numdays';
                } else {
                    interval = Math.floor(seconds / 3600);
                    if (interval >= 1) {
                        stringName = 'numhours';
                    } else {
                        interval = Math.floor(seconds / 60);
                        if (interval >= 1) {
                            stringName = 'numminutes';
                        } else {
                            interval = seconds;
                            stringName = 'numseconds';
                        }
                    }
                }
            }
        }

        return $translate.instant('mm.core.'+stringName, {number: interval});
    };

});
