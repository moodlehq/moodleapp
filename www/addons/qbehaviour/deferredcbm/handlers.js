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

angular.module('mm.addons.qbehaviour_deferredcbm')

/**
 * Deferred CBM behaviour handler.
 *
 * @module mm.addons.qbehaviour_deferredcbm
 * @ngdoc service
 * @name $mmaQbehaviourDeferredCBMHandler
 */
.factory('$mmaQbehaviourDeferredCBMHandler', function($mmQuestionHelper, $mmaQbehaviourDeferredFeedbackHandler, $mmQuestion) {

    var self = {};

    /**
     * Determine a question state based on its answer(s).
     *
     * @param  {String} component Component the question belongs to.
     * @param  {Number} attemptId Attempt ID the question belongs to.
     * @param  {Object} question  The question.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the state or false if cannot determine state.
     */
    self.determineQuestionState = function(component, attemptId, question, siteId) {
        // Depends on deferredfeedback.
        return $mmaQbehaviourDeferredFeedbackHandler.determineQuestionState(
                    component, attemptId, question, siteId, self.isCompleteResponse, self.isSameResponse);
    };

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question Question.
     * @param  {Object} answers  Answers.
     * @return {Mixed}           True if complete, false if not complete, -1 if cannot determine.
     */
    self.isCompleteResponse = function(question, answers) {
        var complete = $mmQuestion.isCompleteResponse(question, answers);
        if (complete && complete != -1) {
            // Answer is complete, check the user answered CBM too.
            return !!answers['-certainty'];
        }
        return complete;
    };

    /**
     * Check if a response is complete.
     *
     * @param  {Object} question         Question.
     * @param  {Object} prevAnswers      Previous answers.
     * @param  {Object} prevBasicAnswers Previous "basic" answers (without sequencecheck, certainty, ...).
     * @param  {Object} newAnswers       New answers.
     * @param  {Object} newBasicAnswers  New "basic" answers (without sequencecheck, certainty, ...).
     * @return {Boolean}                 True if complete, false if not complete.
     */
    self.isSameResponse = function(question, prevAnswers, prevBasicAnswers, newAnswers, newBasicAnswers) {
        var same = $mmQuestion.isSameResponse(question, prevBasicAnswers, newBasicAnswers);
        if (same) {
            // Same response, check the CBM is the same too.
            return prevAnswers['-certainty'] == newAnswers['-certainty'];
        }
        return same;
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
     * Handle a question.
     *
     * @param {Object} question The question.
     * @return {String[]}       Directive to render the certainty options if required, undefined otherwise.
     */
    self.handleQuestion = function(question) {
        if ($mmQuestionHelper.extractQbehaviourCBM(question)) {
            return ['mma-qbehaviour-deferred-cbm'];
        }
    };

    return self;
});
