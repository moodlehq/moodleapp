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
 * Service to handle quiz autosave. Only 1 autosave can be running at the same time.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizAutoSave
 */
.factory('$mmaModQuizAutoSave', function($log, $timeout, $mmaModQuiz, $interval, $mmQuestionHelper,
            mmaModQuizCheckChangesInterval) {

    $log = $log.getInstance('$mmaModQuizAutoSave');

    var self = {},
        autoSavePromise,
        loadPreviousAnswersPromise,
        checkChangesProcess,
        previousAnswers,
        formName,
        popoverName,
        offline,
        connectionErrorButtonSelector;

    /**
     * Cancel a pending auto save.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#cancelAutoSave
     * @return {Void}
     */
    self.cancelAutoSave = function() {
        if (autoSavePromise) {
            $timeout.cancel(autoSavePromise);
        }
        autoSavePromise = undefined;
    };

    /**
     * Check if the answers have changed in a page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#checkChanges
     * @param  {Object} scope   Scope.
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {Void}
     */
    self.checkChanges = function(scope, quiz, attempt) {
        var answers,
            equal = true;
        if (scope.showSummary || autoSavePromise) {
            // Summary is being shown or we already have an auto save pending, no need to check changes.
            return;
        }

        answers = getAnswers();

        if (!previousAnswers) {
            // Previous answers isn't set, set it now.
            previousAnswers = answers;
        } else {
            // Check if answers have changed.
            angular.forEach(answers, function(value, name) {
                if (previousAnswers[name] != value) {
                    equal = false;
                }
            });

            if (!equal) {
                self.setAutoSaveTimer(scope, quiz, attempt);
                previousAnswers = answers;
            }
        }
    };

    /**
     * Hide the auto save error.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#hideAutoSaveError
     * @param  {Object} scope Scope.
     * @return {Void}
     */
    self.hideAutoSaveError = function(scope) {
        scope.autoSaveError = false;
        if (scope[popoverName]) {
            scope[popoverName].hide();
        }
    };

    /**
     * Get answers from a form.
     *
     * @return {Object} Answers.
     */
    function getAnswers() {
        return $mmQuestionHelper.getAnswersFromForm(document.forms[formName]);
    }

    /**
     * Init the auto save process.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#init
     * @param  {Object} scope              Scope.
     * @param  {String} formNm             Name of the form to get the answers from.
     * @param  {String} popoverNm          Name of the connection error popover in the scope.
     *                                     This popover will be shown when there's a connection error.
     * @param  {String} connErrorButtonSel Selector to find the connection error button where to place the popover.
     * @param  {Boolean} offlineMode       True if attempt is offline.
     * @return {Void}
     */
    self.init = function(scope, formNm, popoverNm, connErrorButtonSel, offlineMode) {
        // Cancel previous processes.
        self.cancelAutoSave();
        self.stopCheckChangesProcess();
        previousAnswers = undefined;
        scope.autoSaveError = false;

        formName = formNm;
        popoverName = popoverNm;
        connectionErrorButtonSelector = connErrorButtonSel;
        offline = offlineMode;
    };

    /**
     * Schedule an auto save process if it's not scheduled already.
     * The auto save process expects a "preflightData" object in the scope with the preflight data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#setAutoSaveTimer
     * @param  {Object} scoep   Scope.
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {Void}
     */
    self.setAutoSaveTimer = function(scope, quiz, attempt) {
        // Don't schedule if already shceduled or quiz is almost closed.
        if (quiz.autosaveperiod && !autoSavePromise && !$mmaModQuiz.isAttemptTimeNearlyOver(quiz, attempt)) {
            // Schedule save.
            autoSavePromise = $timeout(function() {
                var answers = getAnswers();
                self.cancelAutoSave();
                previousAnswers = answers; // Update previous answers to match what we're sending to the server.

                $mmaModQuiz.saveAttempt(quiz, attempt, answers, scope.preflightData, offline).then(function() {
                    // Save successful, we can hide the connection error if it was shown.
                    self.hideAutoSaveError(scope);
                }).catch(function(message) {
                    // Error auto-saving. Show error and set timer again.
                    $log.warn('Error auto-saving data.', message);
                    self.showAutoSaveError(scope);
                    self.setAutoSaveTimer(scope, quiz, attempt);
                });
            }, quiz.autosaveperiod * 1000);
        }
    };

    /**
     * Show an error popover due to an auto save error.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#showAutoSaveError
     * @param  {Object} scope Scope.
     * @return {Void}
     */
    self.showAutoSaveError = function(scope) {
        // Don't show popover if it was already shown.
        if (!scope.autoSaveError) {
            scope.autoSaveError = true;
            // Wait a digest to show the popover.
            // This is because we need the button to be rendered, otherwise it's not shown right.
            $timeout(function() {
                if (scope[popoverName]) {
                    scope[popoverName].show(document.querySelector(connectionErrorButtonSelector));
                }
            });
        }
    };

    /**
     * Start a process to periodically check changes in answers.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#startCheckChangesProcess
     * @param  {Object} scope   Scope.
     * @param  {Object} quiz    Quiz.
     * @param  {Object} attempt Attempt.
     * @return {Void}
     */
    self.startCheckChangesProcess = function(scope, quiz, attempt) {
        if (checkChangesProcess || !quiz.autosaveperiod) {
            // We already have the interval in place or the quiz has autosave disabled.
            return;
        }

        function checkChanges() {
            self.checkChanges(scope, quiz, attempt);
        }

        previousAnswers = undefined;
        // Load initial answers in 2.5 seconds.
        loadPreviousAnswersPromise = $timeout(checkChanges, 2500);
        // Check changes every certain time.
        checkChangesProcess = $interval(checkChanges, mmaModQuizCheckChangesInterval);
    };

    /**
     * Stops the auto save process.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#stopAutoSaving
     * @return {Void}
     */
    self.stopAutoSaving = function() {
        self.cancelAutoSave();
        // Set it to true so we cannot start autosave again unless we call init().
        autoSavePromise = true;
    };

    /**
     * Stops the periodical check for changes.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAutoSave#stopCheckChangesProcess
     * @return {Void}
     */
    self.stopCheckChangesProcess = function() {
        if (checkChangesProcess) {
            $interval.cancel(checkChangesProcess);
        }
        if (loadPreviousAnswersPromise) {
            $timeout.cancel(loadPreviousAnswersPromise);
        }
        loadPreviousAnswersPromise = undefined;
        checkChangesProcess = undefined;
    };

    return self;
});
