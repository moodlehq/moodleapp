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
.factory('$mmaQtypeEssayHandler', function($mmUtil, $mmQuestionHelper, $mmText, $q) {

    var self = {};

    /**
     * Get the behaviour for this question.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#getBehaviour
     * @param  {Object} question  Question to get the directive for.
     * @param  {String} behaviour Default behaviour.
     * @return {String}           Behaviour name.
     */
    self.getBehaviour = function(question, behaviour) {
        return 'manualgraded';
    };

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#getPreventSubmitMessage
     * @param  {Object} question Question.
     * @return {String}          Prevent submit message. Undefined or empty if cannot be submitted.
     */
    self.getPreventSubmitMessage = function(question) {
        var questionEl = angular.element(question.html)[0];

        if (questionEl.querySelector('div[id*=filemanager]')) {
            // The question allows attachments. Since the app cannot attach files yet we will prevent submitting the question.
            return 'mm.question.errorattachmentsnotsupported';
        }

        if ($mmQuestionHelper.hasDraftFileUrls(questionEl.innerHTML)) {
            return 'mm.question.errorinlinefilesnotsupported';
        }
    };

    /**
     * Check if a response is complete.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#isCompleteResponse
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        var hasInlineText = answers['answer'] && answers['answer'] !== '',
            questionEl = angular.element(question.html)[0],
            allowsAttachments = !!questionEl.querySelector('div[id*=filemanager]');

        if (!allowsAttachments) {
            return hasInlineText;
        }

        // We can't know if the attachments are required or if the user added any in web.
        return -1;
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#isGradableResponse
     * @param  {Object} question Question.
     * @param  {Object} answers  Question answers (without prefix).
     * @return {Mixed}           True if gradable, false if not gradable, -1 if cannot determine.
     */
    self.isGradableResponse = function(question, answers) {
        return false;
    };

    /**
     * Check if two responses are the same.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#isSameResponse
     * @param  {Object} question    Question.
     * @param  {Object} prevAnswers Previous answers.
     * @param  {Object} newAnswers  New answers.
     * @return {Boolean}            True if same, false otherwise.
     */
    self.isSameResponse = function(question, prevAnswers, newAnswers) {
        // For now we don't support attachments so we only compare the answer.
        return $mmUtil.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    };

    /**
     * Get the directive.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#getDirectiveName
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-essay';
    };

    /**
     * Prepare the answers for a certain question.
     * This function should only be implemented if the answers must be processed before being sent.
     *
     * @module mm.addons.qtype_essay
     * @ngdoc method
     * @name $mmaQtypeEssayHandler#prepareAnswers
     * @param  {Object} question The question.
     * @param  {Object} answers  The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param  {Boolean} offline True if data should be saved in offline.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise|Void}    Promise resolved when data has been prepared.
     */
    self.prepareAnswers = function(question, answers, offline, siteId) {
        // First get the name of the question from the HTML.
        var div = document.createElement('div'),
            textarea,
            promises = [];

        div.innerHTML = question.html;
        textarea = div.querySelector('textarea[name*=_answer]');
        if (textarea && typeof answers[textarea.name] != 'undefined') {
            promises.push($mmUtil.isRichTextEditorEnabled().then(function(enabled) {
                if (!enabled) {
                    // Rich text editor not enabled, add some HTML to the text if needed.
                    answers[textarea.name] = $mmText.formatHtmlLines(answers[textarea.name]);
                }
            }));
        }

        return $q.all(promises);
    };

    return self;
});
