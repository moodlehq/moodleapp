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
 * Directive to render a gap select question.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc directive
 * @name mmaModQuizQuestionGapSelect
 */
.directive('mmaModQuizQuestionGapSelect', function($log, $mmaModQuestionHelper) {
	$log = $log.getInstance('mmaModQuizQuestionGapSelect');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod_quiz/questions/gapselect/template.html',
        link: function(scope) {
            var question = scope.question,
                questionEl,
                content,
                selects;

            if (!question) {
                $log.warn('Aborting quiz because of no question received.');
                return $mmaModQuestionHelper.showDirectiveError(scope);
            }

            questionEl = angular.element(question.html);

            // Get question content.
            content = questionEl[0].querySelector('.qtext');
            if (!content) {
                log.warn('Aborting quiz because of an error parsing question.', question.name);
                return $mmaModQuestionHelper.showDirectiveError(scope);
            }

            // Find selects and add ng-model to them.
            selects = content.querySelectorAll('select');
            angular.forEach(selects, function(select) {
                select.setAttribute('ng-model', 'answers["' + select.name + '"]');

                // Search if there's any option selected.
                var selected = select.querySelector('option[selected]');
                if (selected && selected.value !== '' && typeof selected.value != 'undefined') {
                    // Store the value in the model.
                    scope.answers[select.name] = selected.value;
                }
            });

            // Set the question text.
            question.text = content.innerHTML;
        }
    };
});
