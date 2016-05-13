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

angular.module('mm.addons.qbehaviour_informationitem')

/**
 * Information item behaviour handler.
 *
 * @module mm.addons.qbehaviour_informationitem
 * @ngdoc service
 * @name $mmaQbehaviourInformationItemHandler
 */
.factory('$mmaQbehaviourInformationItemHandler', function($mmQuestionHelper, $mmQuestion) {

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
        if (question.answers['-seen']) {
            return $mmQuestion.getState('complete');
        }

        return false;
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
     * @return {String[]}       Directive to render the "seen" input if required, undefined otherwise.
     */
    self.handleQuestion = function(question) {
        if ($mmQuestionHelper.extractQbehaviourSeenInput(question)) {
            return ['mma-qbehaviour-information-item'];
        }
    };

    return self;
});
