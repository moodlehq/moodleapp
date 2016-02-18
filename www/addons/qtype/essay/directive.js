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

angular.module('mm.addons.qtype_essay')

/**
 * Directive to render an essay question.
 *
 * @module mm.addons.qtype_essay
 * @ngdoc directive
 * @name mmaQtypeEssay
 */
.directive('mmaQtypeEssay', function($log, $mmQuestionHelper, $mmText) {
	$log = $log.getInstance('mmaQtypeEssay');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/essay/template.html',
        link: function(scope) {
            var questionEl = $mmQuestionHelper.directiveInit(scope, $log),
                question = scope.question;

            if (questionEl) {
                questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

                var textarea = questionEl.querySelector('textarea[id*=answer_id]'),
                    input = questionEl.querySelector('input[type="hidden"][name*=answerformat]'),
                    content = textarea.innerHTML;

                if (!textarea) {
                    $log.warn('Aborting because couldn\'t find textarea.', question.name);
                    return $mmQuestionHelper.showDirectiveError(scope);
                }

                // Add current value to model if set.
                if (content) {
                    scope.answers[textarea.name] = $mmText.decodeHTML(content);
                }

                scope.textarea = {
                    id: textarea.id,
                    name: textarea.name
                };

                if (input) {
                    scope.answers[input.name] = input.value;
                }
            }
        }
    };
});
