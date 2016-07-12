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
 * Directive to render a question.
 * It will search for the right directive to render the question based on the question type.
 * See {@link $mmQuestionDelegate}.
 *
 * @module mm.core.question
 * @ngdoc directive
 * @name mmQuestion
 * @description
 *
 * The directives to render the question will receive the following parameters in the scope:
 *
 * @param {Object} question          The question to render.
 * @param {String} component         The component to link files and search local answers.
 * @param {Number} [componentId]     An ID to use in conjunction with the component for the files.
 * @param {Number} attemptId         Attempt ID the question belongs to.
 * @param {Function} abort           A function to call to abort the execution.
 *                                   Directives implementing questions should use it if there's a critical error.
 *                                   Addons using this directive should provide a function that allows aborting the execution
 *                                   of the addon, so if any question calls it the whole feature is aborted.
 * @param {Function} [buttonClicked] A function to call when a question behaviour button is clicked (check, redo, ...).
 *                                   Will receive as params the name and the value of the button.
 * @param {Mixed} offlineEnabled     If offline mode is disabled for this question, set it to false, 0, "0" or "false".
 *                                   Otherwise it'll assume offline mode is enabled.
 * @param {String} [scrollHandle]    Name of the scroll handle of the page containing the post.
 */
.directive('mmQuestion', function($log, $compile, $mmQuestionDelegate, $mmQuestionHelper, $mmQuestionBehaviourDelegate, $mmUtil,
            $translate, $q, $mmQuestion) {
    $log = $log.getInstance('mmQuestion');

    return {
        restrict: 'E',
        templateUrl: 'core/components/question/templates/question.html',
        scope: {
            question: '=',
            component: '=?',
            componentId: '=?',
            attemptId: '=?',
            abort: '&',
            buttonClicked: '&?',
            offlineEnabled: '@?',
            scrollHandle: '@?'
        },
        link: function(scope, element) {
            var question = scope.question,
                component = scope.component,
                attemptId = scope.attemptId,
                questionContainer = element[0].querySelector('.mm-question-container'),
                behaviour,
                promise,
                offline = scope.offlineEnabled && scope.offlineEnabled !== '0' && scope.offlineEnabled !== 'false';

            if (question && questionContainer) {
                // Search the right directive to render the question.
                var directive = $mmQuestionDelegate.getDirectiveForQuestion(question);
                if (directive) {
                    // Treat the question before starting the directive.
                    $mmQuestionHelper.extractQuestionScripts(question);

                    // Handle question behaviour.
                    behaviour = $mmQuestionDelegate.getBehaviourForQuestion(question, question.preferredBehaviour);
                    if (!$mmQuestionBehaviourDelegate.isBehaviourSupported(behaviour)) {
                        // Behaviour not supported! Abort the quiz.
                        $log.warn('Aborting question because the behaviour is not supported.', question.name);
                        $mmQuestionHelper.showDirectiveError(scope,
                                $translate.instant('mma.mod_quiz.errorbehaviournotsupported') + ' ' + behaviour);
                        return;
                    }

                    // Get the sequence check (hidden input). This is required.
                    scope.seqCheck = $mmQuestionHelper.getQuestionSequenceCheckFromHtml(question.html);
                    if (!scope.seqCheck) {
                        $log.warn('Aborting question because couldn\'t retrieve sequence check.', question.name);
                        $mmQuestionHelper.showDirectiveError(scope);
                        return;
                    }

                    // Load local answers if offline is enabled.
                    if (offline) {
                        promise = $mmQuestion.getQuestionAnswers(component, attemptId, question.slot).then(function(answers) {
                            question.localAnswers = $mmQuestion.convertAnswersArrayToObject(answers, true);
                        }).catch(function() {
                            question.localAnswers = {};
                        });
                    } else {
                        question.localAnswers = {};
                        promise = $q.when();
                    }

                    promise.then(function() {

                        // Handle behaviour.
                        scope.behaviourDirectives = $mmQuestionBehaviourDelegate.handleQuestion(
                                        question, question.preferredBehaviour);
                        $mmQuestionHelper.extractQbehaviourRedoButton(question);
                        question.html = $mmUtil.removeElementFromHtml(question.html, '.im-controls');

                        // Extract the validation error of the question.
                        question.validationError = $mmQuestionHelper.getValidationErrorFromHtml(question.html);

                        // Load the local answers in the HTML.
                        $mmQuestionHelper.loadLocalAnswersInHtml(question);

                        // Try to extract the feedback and comment for the question.
                        $mmQuestionHelper.extractQuestionFeedback(question);
                        $mmQuestionHelper.extractQuestionComment(question);

                        // Add the directive to the element.
                        questionContainer.setAttribute(directive, '');
                        // Compile the new directive.
                        $compile(questionContainer)(scope);
                    });
                }
            }
        }
    };
});
