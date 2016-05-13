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

angular.module('mm.addons.qbehaviour_deferredfeedback')

/**
 * Deferred feedback behaviour handler.
 *
 * @module mm.addons.qbehaviour_deferredfeedback
 * @ngdoc service
 * @name $mmaQbehaviourDeferredFeedbackHandler
 */
.factory('$mmaQbehaviourDeferredFeedbackHandler', function($mmQuestion) {

    var self = {};

    /**
     * Determine a question state based on its answer(s).
     *
     * @param  {String} component      Component the question belongs to.
     * @param  {Number} attemptId      Attempt ID the question belongs to.
     * @param  {Object} question       The question.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {Function} [isComplete] To override the default isCompleteResponse check. Optional.
     * @param  {Function} [isSame]     To override the default isSameResponse check. Optional.
     * @return {Promise}               Promise resolved with the state or false if cannot determine state.
     */
    self.determineQuestionState = function(component, attemptId, question, siteId, isComplete, isSame) {
        // Check if we have local data for the question.
        return $mmQuestion.getQuestion(component, attemptId, question.slot, siteId).catch(function() {
            // No entry found, use the original data.
            return question;
        }).then(function(dbQuestion) {
            var state = $mmQuestion.getState(dbQuestion.state);

            if (state.finished || !state.active) {
                // Question is finished.
                return false;
            }

            // We need to check if the answers have changed. Retrieve current stored answers.
            return $mmQuestion.getQuestionAnswers(component, attemptId, question.slot, false, siteId);
        }).then(function(prevAnswers) {
            var complete,
                gradable,
                newState,
                prevBasicAnswers,
                newBasicAnswers = $mmQuestion.getBasicAnswers(question.answers);

            prevAnswers = $mmQuestion.convertAnswersArrayToObject(prevAnswers, true);
            prevBasicAnswers = $mmQuestion.getBasicAnswers(prevAnswers);

            // Check if answers haven't changed.
            if (typeof isSame == 'function') {
                if (isSame(question, prevAnswers, prevBasicAnswers, question.answers, newBasicAnswers)) {
                    return false;
                }
            } else {
                if ($mmQuestion.isSameResponse(question, prevBasicAnswers, newBasicAnswers)) {
                    return false;
                }
            }

            // Answers have changed.
            if (typeof isComplete == 'function') {
                // Pass all the answers since some behaviours might need the extra data.
                complete = isComplete(question, question.answers);
            } else {
                // Only pass the basic answers since questions should be independent of extra data.
                complete = $mmQuestion.isCompleteResponse(question, newBasicAnswers);
            }

            if (complete == -1) {
                newState = 'unknown';
            } else if (complete) {
                newState = 'complete';
            } else {
                gradable = $mmQuestion.isGradableResponse(question, newBasicAnswers);
                if (gradable == -1) {
                    newState = 'unknown';
                } else if (gradable) {
                    newState = 'invalid';
                } else {
                    newState = 'todo';
                }
            }

            return $mmQuestion.getState(newState);

        });
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
     * @return {Void}
     */
    self.handleQuestion = function(question) {
        // Nothing to do.
    };

    return self;
});
