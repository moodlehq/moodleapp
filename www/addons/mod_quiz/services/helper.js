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
