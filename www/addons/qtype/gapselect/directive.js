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

angular.module('mm.addons.qtype_gapselect')

/**
 * Directive to render a gap select question.
 *
 * @module mm.addons.qtype_gapselect
 * @ngdoc directive
 * @name mmaQtypeGapSelect
 */
.directive('mmaQtypeGapSelect', function($log, $mmQuestionHelper) {
	$log = $log.getInstance('mmaQtypeGapSelect');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/gapselect/template.html',
        link: function(scope) {
            var question = scope.question,
                questionEl,
                content,
                selects;

            if (!question) {
                $log.warn('Aborting because of no question received.');
                return $mmQuestionHelper.showDirectiveError(scope);
            }

            questionEl = angular.element(question.html);

            // Get question content.
            content = questionEl[0].querySelector('.qtext');
            if (!content) {
                log.warn('Aborting because of an error parsing question.', question.name);
                return $mmQuestionHelper.showDirectiveError(scope);
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
