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

angular.module('mm.addons.mod_quiz')

/**
 * Directive to render an access rule.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc directive
 * @name mmaQuizAccessRule
 * @description
 * Directive to render an access rule.
 * It requires to receive a "directive" scope variable indicating the directive to render the access rule.
 */
.directive('mmaQuizAccessRule', function($log, $compile) {
    $log = $log.getInstance('mmaQuizAccessRule');

    return {
        restrict: 'E',
        templateUrl: 'addons/mod/quiz/templates/accessrule.html',
        link: function(scope, element) {
            var directive = scope.directive,
                container = element[0].querySelector('.mma-quiz-accessrule-container');

            if (directive && container) {
                // Add the directive to the element.
                container.setAttribute(directive, '');
                // Compile the new directive.
                $compile(container)(scope);
            }
        }
    };
});
