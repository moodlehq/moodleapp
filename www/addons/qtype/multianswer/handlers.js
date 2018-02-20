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
 * Multi answer (cloze) question handlers.
 *
 * @module mm.addons.qtype_multianswer
 * @ngdoc service
 * @name $mmaQtypeMultianswerHandler
 */
.factory('$mmaQtypeMultianswerHandler', function($mmQuestion, $mmQuestionHelper) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        // Get all the inputs in the question to check if they've all been answered.
        var names = $mmQuestion.getBasicAnswers($mmQuestionHelper.getAllInputNamesFromHtml(question.html));

        for (var name in names) {
            if (!answers[name] && answers[name] !== false && answers[name] !== 0) {
                return false;
            }
        }

        return true;
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if gradable, false if not gradable, -1 if cannot determine.
     */
    self.isGradableResponse = function(question, answers) {
        var hasReponse = false;
        angular.forEach(answers, function(value) {
            if (value || value === false) {
                hasReponse = true;
            }
        });
        return hasReponse;
    };

    /**
     * Check if two responses are the same.
     *
     * @param  {Object} question    Question.
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if same, false otherwise.
     */
    self.isSameResponse = function(question, prevAnswers, newAnswers) {
        return $mmQuestion.compareAllAnswers(prevAnswers, newAnswers);
    };

    /**
     * Get the behaviour for this question.
     *
     * @param  {Object} question  Question to get the directive for.
     * @param  {String} behaviour Default behaviour.
     * @return {String}           Behaviour name.
     */
    self.getBehaviour = function(question, behaviour) {
        if (behaviour === 'interactive') {
            return 'interactivecountback';
        }
        return behaviour;
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-multianswer';
    };

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     *
     * @param  {Object} question        Question
     * @param  {String} offlineSeqCheck Offline sequencecheck.
     * @return {Boolean}                True if valid, false otherwise.
     */
    self.validateSequenceCheck = function(question, offlineSeqCheck) {
        if (question.sequencecheck == offlineSeqCheck) {
            return true;
        }

        // For some reason, viewing a multianswer for the first time without answering it
        // creates a new step "todo". We'll treat this case as valid.
        if (question.sequencecheck == 2 && question.state == 'todo' && offlineSeqCheck == 1) {
            return true;
        }

        return false;
    };

    return self;
});
