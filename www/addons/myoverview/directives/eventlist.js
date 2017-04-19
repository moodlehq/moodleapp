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
.directive('mmaMyOverviewEventList', function() {

    return {
        restrict: 'E',
        scope: {
            events: '=',
            showCourse: '=?'
        },
        templateUrl: 'addons/myoverview/templates/eventlist.html'
    };
});
