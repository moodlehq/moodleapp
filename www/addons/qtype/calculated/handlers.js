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

angular.module('mm.addons.qtype_calculated')

/**
 * Calculated question handlers.
 *
 * @module mm.addons.qtype_calculated
 * @ngdoc service
 * @name $mmaQtypeCalculatedHandler
 */
.factory('$mmaQtypeCalculatedHandler', function($mmaQtypeNumericalHandler, $mmUtil) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        // This question type depends on numerical.
        if (!self.isGradableResponse(question, answers) || !$mmaQtypeNumericalHandler.validateUnits(answers['answer'])) {
            return false;
        }

        if (self.requiresUnits(question)) {
            return self.isValidValue(answers['unit']);
        }

        return -1;
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
        // This question type depends on numerical.
        var hasAnswer = self.isValidValue(answers['answer']);
        if (self.requiresUnits(question)) {
            // The question requires a unit.
            return hasAnswer && self.isValidValue(answers['unit']);
        } else {
            return hasAnswer;
        }
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
        // This question type depends on numerical.
        return $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') &&
            $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'unit');
    };

    /**
     * Check if a value is valid (not empty).
     *
     * @param  {Mixed} value Value to check.
     * @return {Boolean}     Whether the value is valid.
     */
    self.isValidValue = function(value) {
        return value || value === '0' || value === 0;
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-calculated';
    };

    /**
     * Check if a question requires units in a separate input.
     *
     * @param {Object} question The questions.
     * @return {Boolean}        Whether the question requires units.
     */
    self.requiresUnits = function(question) {
        var div = document.createElement('div');
        div.innerHTML = question.html;

        return div.querySelector('select[name*=unit]') || div.querySelector('input[type="radio"]');
    };

    return self;
});
