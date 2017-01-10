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

angular.module('mm.addons.qtype_multichoice')

/**
 * Multi choice question handlers.
 *
 * @module mm.addons.qtype_multichoice
 * @ngdoc service
 * @name $mmaQtypeMultichoiceHandler
 */
.factory('$mmaQtypeMultichoiceHandler', function($mmUtil) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        var isSingle = true,
            isMultiComplete = false;

        // To know if it's single or multi answer we need to search for answers with "choice" in the name.
        angular.forEach(answers, function(value, name) {
            if (name.indexOf('choice') != -1) {
                isSingle = false;
                if (value) {
                    isMultiComplete = true;
                }
            }
        });

        if (isSingle) {
            // Single.
            return self.isCompleteResponseSingle(answers);
        } else {
            // Multi.
            return isMultiComplete;
        }
    };

    /**
     * Check if a response is complete. Only for single answer.
     *
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponseSingle = function(answers) {
        return answers['answer'] && answers['answer'] !== '';
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
        return self.isCompleteResponse(question, answers);
    };

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted. Only for single answer.
     *
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if gradable, false if not gradable, -1 if cannot determine.
     */
    self.isGradableResponseSingle = function(answers) {
        return self.isCompleteResponseSingle(answers);
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
        var isSingle = true,
            isMultiSame = true;

        // To know if it's single or multi answer we need to search for answers with "choice" in the name.
        angular.forEach(newAnswers, function(value, name) {
            if (name.indexOf('choice') != -1) {
                isSingle = false;
                if (!$mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, name)) {
                    isMultiSame = false;
                }
            }
        });

        if (isSingle) {
            return self.isSameResponseSingle(prevAnswers, newAnswers);
        } else {
            return isMultiSame;
        }
    };

    /**
     * Check if two responses are the same. Only for single answer.
     *
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if same, false otherwise.
     */
    self.isSameResponseSingle = function(prevAnswers, newAnswers) {
        return $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-multichoice';
    };

    return self;
});
