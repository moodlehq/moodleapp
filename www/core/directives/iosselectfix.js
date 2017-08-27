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
 * Directive to fix long text cropped in iOS dropdowns.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmIosSelectFix
 * @description
 * This directive should be added to ALL selects.
 * The solutions is a bit hacky, but it seems to work.
 */
.directive('mmIosSelectFix', function() {
    return {
        restrict: 'A',
        priority: 100,
        scope: false,
        require: 'select',
        link: function(scope, element) {
            if (ionic.Platform.isIOS()) {
                // Watch for changes in HTML, otherwise ng-options would override our changes.
                scope.$watch(function() {
                    return element.html();
                }, function() {
                    // Append an empty optgroup if there isn't any.
                    if (!element[0].querySelector('optgroup')) {
                        element.append('<optgroup label=""></optgroup>');
                    }
                });
            }
        }
    };
});
