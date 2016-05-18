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
.directive('mmaQtypeEssay', function($log, $mmQuestionHelper, $mmText, $mmUtil) {
	$log = $log.getInstance('mmaQtypeEssay');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/essay/template.html',
        link: function(scope) {
            var questionEl = $mmQuestionHelper.directiveInit(scope, $log),
                textarea;

            if (questionEl) {
                questionEl = questionEl[0] || questionEl; // Convert from jqLite to plain JS if needed.

                // First search the textarea.
                textarea = questionEl.querySelector('textarea[name*=_answer]');
                scope.allowsAttachments = !!questionEl.querySelector('div[id*=filemanager]');
                scope.isMonospaced = !!questionEl.querySelector('.qtype_essay_monospaced');

                if (!textarea) {
                    // Textarea not found, we might be in review. Search the answer and the attachments.
                    scope.answer = $mmUtil.getContentsOfElement(angular.element(questionEl), '.qtype_essay_response');
                    scope.attachments = $mmQuestionHelper.getQuestionAttachmentsFromHtml(
                                            $mmUtil.getContentsOfElement(angular.element(questionEl), '.attachments'));
                } else {
                    // Textarea found.
                    var input = questionEl.querySelector('input[type="hidden"][name*=answerformat]'),
                        content = textarea.innerHTML;

                    scope.textarea = {
                        id: textarea.id,
                        name: textarea.name,
                        value: content ? $mmText.decodeHTML(content) : ''
                    };

                    if (input) {
                        scope.formatInput = {
                            name: input.name,
                            value: input.value
                        };
                    }
                }
            }
        }
    };
});
