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
 * Directive to render a question.
 * It will search for the right directive to render the question based on the question type.
 * See {@link $mmaModQuizQuestionsDelegate}.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc directive
 * @name mmaModQuizQuestion
 */
.directive('mmaModQuizQuestion', function($compile, $mmaModQuizQuestionsDelegate, $mmaModQuizHelper) {

    // We set priority to a high number to ensure that it will be compiled before other directives.
    // With terminal set to true, the other directives will be skipped after this directive is compiled.
    return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        templateUrl: 'addons/mod_quiz/templates/questionnotsupported.html',
        scope: {
            question: '=',
        },
        link: function(scope, element) {
            if (scope.question) {
                // Search the right directive to render the question.
                var directive = $mmaModQuizQuestionsDelegate.getDirectiveForQuestion(scope.question);
                if (directive) {
                    // Treat the question before starting the directive.
                    $mmaModQuizHelper.extractQuestionInfoBox(scope.question);

                    // Add the directive to the element.
                    element.attr(directive, '');
                    // Remove current directive, otherwise we would cause an infinite loop when compiling.
                    element.removeAttr('mma-mod-quiz-question');
                    // Compile the new directive.
                    $compile(element)(scope);
                }
            }
        }
    };
});
