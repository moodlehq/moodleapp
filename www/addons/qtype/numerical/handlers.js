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

angular.module('mm.addons.qtype_numerical')

/**
 * Numerical question handlers.
 *
 * @module mm.addons.qtype_numerical
 * @ngdoc service
 * @name $mmaQtypeNumericalHandler
 */
.factory('$mmaQtypeNumericalHandler', function($mmUtil) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        if (!self.isGradableResponse(question, answers) || !self.validateUnits(answers['answer'])) {
            return false;
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
        return answers['answer'] || answers['answer'] === '0' || answers['answer'] === 0;
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
        return $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-numerical';
    };

    /**
     * Validate a number with units. We don't have the list of valid units and conversions, so we can't perform
     * a full validation. If this function returns true means we can't be sure it's valid.
     *
     * @param {String} answer Answer.
     * @return {Boolean}      False if answer isn't valid, true if we aren't sure if it's valid.
     */
    self.validateUnits = function(answer) {
        if (!answer) {
            return false;
        }

        var regexString = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?';

        // Strip spaces (which may be thousands separators) and change other forms of writing e to e.
        answer = answer.replace(' ', '');
        answer = answer.replace(/(?:e|E|(?:x|\*|×)10(?:\^|\*\*))([+-]?\d+)/, 'e$1');

        // If a '.' is present or there are multiple ',' (i.e. 2,456,789) assume ',' is a thousands separator
        // and strip it, else assume it is a decimal separator, and change it to '.'.
        if (answer.indexOf('.') != -1 || answer.split(',').length - 1 > 1) {
            answer = answer.replace(',', '');
        } else {
            answer = answer.replace(',', '.');
        }

        // We don't know if units should be before or after so we check both.
        if (answer.match(new RegExp('^' + regexString)) === null || answer.match(new RegExp(regexString + '$')) === null) {
            return false;
        }

        return true;
    };

    return self;
});
