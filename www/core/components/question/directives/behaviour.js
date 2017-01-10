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

angular.module('mm.core.question')

/**
 * Directive to render a behaviour specific directive.
 *
 * @module mm.core.question
 * @ngdoc directive
 * @name mmQuestionBehaviour
 * @description
 *
 * The directives to render the question will receive the following parameters in the scope:
 *
 * @param {Object} question          The question to render.
 * @param {String} component         The component to link files to if the question has any.
 * @param {Number} [componentId]     An ID to use in conjunction with the component.
 * @param {Function} abort           A function to call to abort the execution.
 *                                   Directives implementing questions should use it if there's a critical error.
 *                                   Addons using this directive should provide a function that allows aborting the execution
 *                                   of the addon, so if any question calls it the whole feature is aborted.
 * @param {Function} [buttonClicked] A function to call when a question behaviour button is clicked (check, redo, ...).
 *                                   Will receive as params the name and the value of the button.
 */
.directive('mmQuestionBehaviour', function($compile) {

    return {
        restrict: 'A',
        link: function(scope, element) {
            if (scope.directive) {
                // Remove the current directive from the element.
                element[0].removeAttribute('mm-question-behaviour');
                // Add the directive to the element.
                element[0].setAttribute(scope.directive, '');
                // Compile the new directive.
                $compile(element)(scope);
            }
        }
    };
});
