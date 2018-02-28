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

angular.module('mm.addons.qtype_calculatedsimple')

/**
 * Calculated simple question handlers.
 *
 * @module mm.addons.qtype_calculatedsimple
 * @ngdoc service
 * @name $mmaQtypeCalculatedSimpleHandler
 */
.factory('$mmaQtypeCalculatedSimpleHandler', function($mmaQtypeCalculatedHandler) {

    var self = {};

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        // This question type depends on calculated.
        return $mmaQtypeCalculatedHandler.isCompleteResponse(question, answers);
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
        // This question type depends on calculated.
        return $mmaQtypeCalculatedHandler.isGradableResponse(question, answers);
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
        // This question type depends on calculated.
        return $mmaQtypeCalculatedHandler.isSameResponse(question, prevAnswers, newAnswers);
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-calculated-simple';
    };

    /**
     * Prepare the answers for a certain question.
     * This function should only be implemented if the answers must be processed before being sent.
     *
     * @param  {Object} question The question.
     * @param  {Object} answers  The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param  {Boolean} offline True if data should be saved in offline.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise|Void}    Promise resolved when data has been prepared.
     */
    self.prepareAnswers = function(question, answers, offline, siteId) {
        // This question type depends on calculated.
        return $mmaQtypeCalculatedHandler.prepareAnswers(question, answers, offline, siteId);
    };

    return self;
});
