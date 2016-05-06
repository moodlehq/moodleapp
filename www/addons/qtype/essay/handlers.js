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
 * Essay question handlers.
 *
 * @module mm.addons.qtype_essay
 * @ngdoc service
 * @name $mmaQtypeEssayHandler
 */
.factory('$mmaQtypeEssayHandler', function($mmUtil) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} answers Question answers (without prefix).
     * @return {Mixed}          True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(answers) {
        if (answers['answer'] && answers['answer'] !== '') {
            return true;
        }
        // Since we can't know if the text is required or not we return -1.
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
     * @param  {Object} answers Question answers (without prefix).
     * @return {Mixed}          True if gradable, false if not gradable, -1 if cannot determine.
     */
    self.isGradableResponse = function(answers) {
        return false;
    };

    /**
     * Check if two responses are the same.
     *
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if same, false otherwise.
     */
    self.isSameResponse = function(prevAnswers, newAnswers) {
        // For now we don't support attachments so we only compare the answer.
        return $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-essay';
    };

    return self;
});
