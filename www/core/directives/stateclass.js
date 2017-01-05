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
 * Directive to add a class to the element based on the current state.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmStateClass
 * @description
 * Directive to add a class to the element based on the current state.
 * The class is prefixed with "mm-" and dots are replaced with underscores.
 *
 * Example: If the current state is "site.courses", then the element will have a class "mm-site_courses".
 *
 * This directive only allows 2 state levels. If current state has more than 2 levels, only the first and the last one
 * will be used.
 * Example: "site.course.section" would be converted to "mm-site_section".
 */
.directive('mmStateClass', function($state) {
    return {
        restrict: 'A',
        link: function(scope, el) {
            var current = $state.$current.name,
                split,
                className = 'mm-';

            if (typeof current == 'string') {
                split = current.split('.');
                className += split.shift();
                if (split.length) {
                    className += '_' + split.pop();
                }
                el.addClass(className);
            }
        }
    };
});
