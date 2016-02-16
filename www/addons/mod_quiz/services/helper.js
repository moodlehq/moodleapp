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
 * Helper to gather some common quiz functions.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizHelper
 */
.factory('$mmaModQuizHelper', function($mmaModQuiz, $mmUtil, $q, $ionicModal) {

    var self = {};

    /**
     * Removes the info box (flag, question number, etc.) from a question's HTML and adds it in a new infoBox property.
     * Please take into account that all scripts will also be removed due to angular.element.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#extractQuestionInfoBox
     * @param  {Object} question Question.
     * @return {Void}
     */
    self.extractQuestionInfoBox = function(question) {
        var el = angular.element(question.html)[0],
            info;
        if (el) {
            info = el.querySelector('.info');
            if (info) {
                question.infoBox = info.outerHTML;
                info.remove();
                question.html = el.outerHTML;
            }
        }
    };

    /**
     * Removes the scripts from a question's HTML and adds it in a new 'scriptsCode' property.
     * It will also search for init_question functions of the question type and add the object to an 'initObjects' property.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#extractQuestionScripts
     * @param  {Object} question Question.
     * @return {Void}
     */
    self.extractQuestionScripts = function(question) {
        var matches;

        question.scriptsCode = '';
        question.initObjects = [];

        if (question.html) {
            // Search the scripts.
            matches = question.html.match(/<script[^>]*>[\s\S]*?<\/script>/mg);
            angular.forEach(matches, function(match) {
                // Add the script to scriptsCode and remove it from html.
                question.scriptsCode += match;
                question.html = question.html.replace(match, '');

                // Search init_question functions for this type.
                var initMatches = match.match(new RegExp('M\.' + question.type + '\.init_question\\(.*?}\\);', 'mg'));
                angular.forEach(initMatches, function(initMatch) {
                    // Remove start and end of the match, we only want the object.
                    initMatch = initMatch.replace('M.' + question.type + '.init_question(', '');
                    initMatch = initMatch.substr(0, initMatch.length - 2);

                    // Try to convert it to an object and add it to the question.
                    try {
                        initMatch = JSON.parse(initMatch);
                        question.initObjects.push(initMatch);
                    } catch(ex) {}
                });
            });
        }
    };

    /**
     * Returns the contents of a certain selection in a DOM element.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getContentsOfElement
     * @param  {Object} element   DOM element to search in.
     * @param  {String} className Class to search.
     * @return {String}           Div contents.
     */
    self.getContentsOfElement = function(element, selector) {
        if (element) {
            var el = element[0] || element, // Convert from jqLite to plain JS if needed.
                div = el.querySelector(selector);
            if (div) {
                return div.innerHTML;
            }
        }
        return '';
    };

    /**
     * Gets the mark string from a question HTML.
     * Example result: "Marked out of 1.00".
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getQuestionMarkFromHtml
     * @param  {String} html Question's HTML.
     * @return {String}      Question's mark.
     */
    self.getQuestionMarkFromHtml = function(html) {
        return self.getContentsOfElement(angular.element(html), '.grade');
    };

    /**
     * Get the sequence check from a question HTML.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#getQuestionSequenceCheckFromHtml
     * @param  {String} html Question's HTML.
     * @return {Object}      Object with the sequencecheck name and value.
     */
    self.getQuestionSequenceCheckFromHtml = function(html) {
        var el,
            input;

        if (html) {
            el = angular.element(html)[0];

            // Search the input holding the sequencecheck.
            input = el.querySelector('input[name*=sequencecheck]');
            if (input && typeof input.name != 'undefined' && typeof input.value != 'undefined') {
                return {
                    name: input.name,
                    value: input.value
                };
            }
        }
    };

    /**
     * Init a password modal, adding it to the scope.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#initConfirmStartModal
     * @param  {Object} scope Scope.
     * @return {Promise}      Promise resolved when the modal is initialized.
     */
    self.initConfirmStartModal = function(scope) {
        return $ionicModal.fromTemplateUrl('addons/mod_quiz/templates/confirmstart-modal.html', {
            scope: scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            scope.modal = modal;

            scope.closeModal = function() {
                scope.preflightData.password = '';
                modal.hide();
            };
            scope.$on('$destroy', function() {
                modal.remove();
            });
        });
    };

    /**
     * Add some calculated data to the attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#setAttemptCalculatedData
     * @param  {Object} quiz        Quiz.
     * @param  {Object} attempt     Attempt.
     * @param  {Boolean} highlight  True if we should check if attempt should be highlighted, false otherwise.
     * @param  {Number} [bestGrade] Quiz's best grade. Required if highlight=true.
     *                              the due date if the attempt's state is "overdue".
     * @return {Void}
     */
    self.setAttemptCalculatedData = function(quiz, attempt, highlight, bestGrade) {

        attempt.rescaledGrade = $mmaModQuiz.rescaleGrade(attempt.sumgrades, quiz, false);
        attempt.finished = $mmaModQuiz.isAttemptFinished(attempt.state);
        attempt.readableState = $mmaModQuiz.getAttemptReadableState(quiz, attempt);

        if (quiz.showMarkColumn && attempt.finished) {
            attempt.readableMark = $mmaModQuiz.formatGrade(attempt.sumgrades, quiz.decimalpoints);
        } else {
            attempt.readableMark = '';
        }

        if (quiz.showGradeColumn && attempt.finished) {
            attempt.readableGrade = $mmaModQuiz.formatGrade(attempt.rescaledGrade, quiz.decimalpoints);
            // Highlight the highest grade if appropriate.
            attempt.highlightGrade = highlight && !attempt.preview && attempt.state == $mmaModQuiz.ATTEMPT_FINISHED &&
                                        attempt.rescaledGrade == bestGrade;
        } else {
            attempt.readableGrade = '';
        }
    };

    /**
     * Add some calculated data to the quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#setQuizCalculatedData
     * @param  {Object} quiz    Quiz.
     * @param  {Object} options Options returned by $mmaModQuiz#getCombinedReviewOptions.
     * @return {Void}
     */
    self.setQuizCalculatedData = function(quiz, options) {
        quiz.sumGradesFormatted = $mmaModQuiz.formatGrade(quiz.sumgrades, quiz.decimalpoints);
        quiz.gradeFormatted = $mmaModQuiz.formatGrade(quiz.grade, quiz.decimalpoints);

        quiz.showAttemptColumn = quiz.attempts != 1;
        quiz.showGradeColumn = options.someoptions.marks >= $mmaModQuiz.QUESTION_OPTIONS_MARK_AND_MAX &&
                                    $mmaModQuiz.quizHasGrades(quiz);
        quiz.showMarkColumn = quiz.showGradeColumn && quiz.grade != quiz.sumgrades;
        quiz.showFeedbackColumn = quiz.hasfeedback && options.alloptions.overallfeedback;
    };

    /**
     * Show an error message and returns a rejected promise.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHelper#showError
     * @param  {String} [message]        Message to show.
     * @param  {String} [defaultMessage] Code of the message to show if message is not defined or empty.
     * @return {Promise}                 Rejected promise.
     */
    self.showError = function(message, defaultMessage) {
        defaultMessage = defaultMessage || 'mma.mod_quiz.errorgetquiz';
        if (message) {
            $mmUtil.showErrorModal(message);
        } else {
            $mmUtil.showErrorModal(defaultMessage, true);
        }
        return $q.reject();
    };

    return self;
});
