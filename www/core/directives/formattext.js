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
 * Directive to format text rendered.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmFormatText
 * @description
 * Directive to format text rendered. Attributes it accepts:
 *     -siteid: Site ID to use.
 *     -courseid: Course ID to use.
 *     -clean: True if all HTML tags should be removed, false otherwise.
 *     -watch: True if the variable used inside the directive should be watched for changes. If the variable data is retrieved
 *             asynchronously, this value must be set to true, or the directive should be inside a ng-if, ng-repeat or similar.
 */
.directive('mmFormatText', function($interpolate, $mmText, $compile) {

    var curlyBracketsRegex = new RegExp('[{{|}}]', 'gi');

    return {
        restrict: 'E', // Restrict to <mm-format-text></mm-format-text>.
        scope: true,
        transclude: true,
        link: function(scope, element, attrs, ctrl, transclude) { // Link function.
            transclude(scope, function(clone) {

                var content = angular.element('<div>').append(clone).html(); // Get directive's content.

                function treatContents() {
                    var interpolated = $interpolate(content)(scope); // "Evaluate" scope variables.
                    interpolated = interpolated.trim();

                    $mmText.formatText(interpolated, attrs.clean).then(function(formatted) {
                        element.html(formatted);
                    });
                }

                if (attrs.watch) {
                    // Watch the variable inside the directive. We clean tags that might be added by ionic.
                    var variable = $mmText.cleanTags(content).replace(curlyBracketsRegex, '');
                    scope.$watch(variable, function() {
                        treatContents();
                    });
                } else {
                    treatContents();
                }
            });
        }
    };
});
