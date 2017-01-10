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

angular.module('mm.addons.qtype_multianswer')

/**
 * Directive to render a multianswer (cloze) question.
 *
 * @module mm.addons.qtype_multianswer
 * @ngdoc directive
 * @name mmaQtypeMultianswer
 */
.directive('mmaQtypeMultianswer', function($log, $mmQuestionHelper, $mmUtil) {
	$log = $log.getInstance('mmaQtypeMultianswer');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/multianswer/template.html',
        link: function(scope) {
            var question = scope.question,
                questionEl,
                content;

            if (!question) {
                $log.warn('Aborting because of no question received.');
                return $mmQuestionHelper.showDirectiveError(scope);
            }

            questionEl = angular.element(question.html);

            // Get question content.
            content = questionEl[0].querySelector('.formulation');
            if (!content) {
                log.warn('Aborting because of an error parsing question.', question.name);
                return $mmQuestionHelper.showDirectiveError(scope);
            }

            // Remove sequencecheck and validation error.
            $mmUtil.removeElement(content, 'input[name*=sequencecheck]');
            $mmUtil.removeElement(content, '.validationerror');

            // Replace Moodle's correct/incorrect and feedback classes with our own.
            $mmQuestionHelper.replaceCorrectnessClasses(questionEl);
            $mmQuestionHelper.replaceFeedbackClasses(questionEl);

            // Treat the correct/incorrect icons.
            $mmQuestionHelper.treatCorrectnessIcons(scope, questionEl);

            // Set the question text.
            question.text = content.innerHTML;
        }
    };
});
