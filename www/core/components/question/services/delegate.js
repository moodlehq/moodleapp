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

angular.module('mm.core.question')

/**
 * Delegate to register question handlers.
 *
 * @module mm.core.question
 * @ngdoc provider
 * @name $mmQuestionDelegate
 * @description
 *
 * Delegate to register question handlers.
 * You can use this provider to register your own question handlers to be used in a quiz or other places.
 *
 * To register a question handler:
 *
 * $mmQuestionDelegateProvider.registerHandler('mmaYourAddon', 'questionType', 'handlerName');
 *
 * Example:
 *
 * .config(function($mmQuestionDelegateProvider) {
 *     $mmQuestionDelegateProvider.registerHandler('mmaQtypeCalculated', 'qtype_calculated', '$mmaQtypeCalculatedHandler');
 * })
 *
 * @see $mmQuestionDelegateProvider#registerHandler to see the methods your handler needs to implement.
 */
.provider('$mmQuestionDelegate', function() {

    var handlers = {},
        self = {};

    /**
     * Register a question handler. The handler will be used when we need to render a question of the type defined.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionDelegateProvider#registerHandler
     * @param {String} name                    Handler's name.
     * @param {String} questionType            Question type the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                              When using a promise, it should return a boolean.
     *                             - getDirectiveName(question) (String) Returns the name of the directive to render the question.
     *                                              There's no need to check the question type in this function.
     *                             - getBehaviour(question, behaviour) (String) Optional. Returns the name of the behaviour to use
     *                                              for the question. If the question should use the default behaviour you
     *                                              shouldn't implement this function.
     *                             - validateSequenceCheck(question, offlineSeqCheck) (Boolean) Optional. Validate if an offline
     *                                              sequencecheck is valid compared with the online one. This function only
     *                                              needs to be implemented if a specific compare is required.
     *                             - isCompleteResponse(question, answers) (Mixed) Optional. Check if a response is complete.
     *                                              Return true if complete, false if not complete, -1 if cannot determine.
     *                             - isGradableResponse(question, answers) (Mixed) Optional. Check if a student has provided enough
     *                                              of an answer for the question to be graded automatically, or whether it must
     *                                              be considered aborted.
     *                                              Return true if gradable, false if not gradable, -1 if cannot determine.
     *                             - isSameResponse(question, prevAnswers, newAnswers) (Boolean) Optional. Check if two responses
     *                                              are equal. Always return boolean.
     *                             - prepareAnswers(question, answers, offline, siteId) (Promise|Void) Optional. Prepare and add to
     *                                              answers the data to send to server based in the input. Return promise if async.
     */
    self.registerHandler = function(name, questionType, handler) {
        if (typeof handlers[questionType] !== 'undefined') {
            console.log("$mmQuestionDelegateProvider: Addon '" + name + "' already registered as handler for '" + questionType + "'");
            return false;
        }
        console.log("$mmQuestionDelegateProvider: Registered handler '" + name + "' for question type '" + questionType + "'");
        handlers[questionType] = {
            addon: name,
            instance: undefined,
            handler: handler
        };
    };

    self.$get = function($log, $q, $mmUtil, $mmSite) {

        $log = $log.getInstance('$mmQuestionDelegate');

        var enabledHandlers = {},
            self = {},
            lastUpdateHandlersStart;

        /**
         * Get the behaviour to use for a certain question type.
         * E.g. 'qtype_essay' uses 'manualgraded'.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#getBehaviourForQuestion
         * @param  {Object} question  Question to get the directive for.
         * @param  {String} behaviour Default behaviour.
         * @return {String}           Behaviour name.
         */
        self.getBehaviourForQuestion = function(question, behaviour) {
            var type = 'qtype_' + question.type;
            // Check if there's a handler and it implements the required method.
            if (typeof enabledHandlers[type] != 'undefined' && enabledHandlers[type].getBehaviour) {
                var questionBehaviour = enabledHandlers[type].getBehaviour(question, behaviour);
                if (questionBehaviour) {
                    return questionBehaviour;
                }
            }
            return behaviour;
        };

        /**
         * Get the directive to use for a certain question type.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#getDirectiveForQuestion
         * @param  {Object} question Question to get the directive for.
         * @return {String}          Directive name. Undefined if no directive found.
         */
        self.getDirectiveForQuestion = function(question) {
            var type = 'qtype_' + question.type;
            if (typeof enabledHandlers[type] != 'undefined') {
                return enabledHandlers[type].getDirectiveName(question);
            }
        };

        /**
         * Check if a question can be submitted.
         * If a question cannot be submitted it should return a message explaining why (translated or not).
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#getPreventSubmitMessage
         * @param  {Object} question Question.
         * @return {String}          Prevent submit message. Undefined or empty if cannot be submitted.
         */
        self.getPreventSubmitMessage = function(question) {
            var type = 'qtype_' + question.type,
                handler = enabledHandlers[type];
            if (typeof handler != 'undefined' && handler.getPreventSubmitMessage) {
                return handler.getPreventSubmitMessage(question);
            }
        };

        /**
         * Check if a response is complete.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#isCompleteResponse
         * @param  {Object} answers Question answers (without prefix).
         * @return {Mixed}          True if complete, false if not complete, -1 if cannot determine.
         */
        self.isCompleteResponse = function(question, answers) {
            var type = 'qtype_' + question.type;
            if (typeof enabledHandlers[type] != 'undefined') {
                if (enabledHandlers[type].isCompleteResponse) {
                    return enabledHandlers[type].isCompleteResponse(question, answers);
                }
            }
            return -1;
        };

        /**
         * Check if a student has provided enough of an answer for the question to be graded automatically,
         * or whether it must be considered aborted.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#isGradableResponse
         * @param  {Object} answers Question answers (without prefix).
         * @return {Mixed}          True if gradable, false if not gradable, -1 if cannot determine.
         */
        self.isGradableResponse = function(question, answers) {
            var type = 'qtype_' + question.type;
            if (typeof enabledHandlers[type] != 'undefined') {
                if (enabledHandlers[type].isGradableResponse) {
                    return enabledHandlers[type].isGradableResponse(question, answers);
                }
            }
            return -1;
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateQuestionHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#isLastUpdateCall
         * @param  {Number}  time Time to check.
         * @return {Boolean}      True if equal, false otherwise.
         */
        self.isLastUpdateCall = function(time) {
            if (!lastUpdateHandlersStart) {
                return true;
            }
            return time == lastUpdateHandlersStart;
        };

        /**
         * Check if two responses are the same.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#isSameResponse
         * @param  {Object} question    Question.
         * @param  {Object} prevAnswers Previous answers.
         * @param  {Object} newAnswers  New answers.
         * @return {Boolean}            True if same, false otherwise.
         */
        self.isSameResponse = function(question, prevAnswers, newAnswers) {
            var type = 'qtype_' + question.type;
            if (typeof enabledHandlers[type] != 'undefined') {
                if (enabledHandlers[type].isSameResponse) {
                    return enabledHandlers[type].isSameResponse(question, prevAnswers, newAnswers);
                }
            }
            return false;
        };

        /**
         * Check if a question type is supported.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#isQuestionSupported
         * @param  {String}  type Question type.
         * @return {Boolean}      True if supported, false otherwise.
         */
        self.isQuestionSupported = function(type) {
            return typeof enabledHandlers['qtype_' + type] != 'undefined';
        };

        /**
         * Prepare the answers for a certain question.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#prepareAnswersForQuestion
         * @param  {Object} question The question.
         * @param  {Object} answers  The answers retrieved from the form. Prepared answers must be stored in this object.
         * @param  {Boolean} offline True if data should be saved in offline.
         * @param  {String} [siteId] Site ID. If not defined, current site.
         * @return {Promise}         Promise resolved when data has been prepared.
         */
        self.prepareAnswersForQuestion = function(question, answers, offline, siteId) {
            var type = 'qtype_' + question.type,
                handler = enabledHandlers[type];

            // Check if there's a handler and it implements the required method.
            if (typeof handler != 'undefined' && handler.prepareAnswers) {
                return $q.when(handler.prepareAnswers(question, answers, offline, siteId));
            }
            return $q.when();
        };

        /**
         * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#updateQuestionHandler
         * @param {String} questionType The question type this handler handles.
         * @param {Object} handlerInfo  The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise}            Resolved when done.
         * @protected
         */
        self.updateQuestionHandler = function(questionType, handlerInfo, time) {
            var promise,
                siteId = $mmSite.getId();

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the handler is enabled.
            return promise.catch(function() {
                return false;
            }).then(function(enabled) {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    if (enabled) {
                        enabledHandlers[questionType] = handlerInfo.instance;
                    } else {
                        delete enabledHandlers[questionType];
                    }
                }
            });
        };

        /**
         * Update the enabled handlers for the current site.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#updateQuestionHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateQuestionHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating question handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the handlers.
            angular.forEach(handlers, function(handlerInfo, questionType) {
                promises.push(self.updateQuestionHandler(questionType, handlerInfo, now));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            });
        };

        /**
         * Validate if an offline sequencecheck is valid compared with the online one.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#validateSequenceCheck
         * @param  {Object} question             Question.
         * @param  {String} offlineSequenceCheck Sequence check stored in offline.
         * @return {Boolean}                     True if offline sequencecheck is valid, false otherwise.
         */
        self.validateSequenceCheck = function(question, offlineSequenceCheck) {
            var type = 'qtype_' + question.type;
            // Check if there's a handler.
            if (typeof enabledHandlers[type] != 'undefined') {
                // Check if it implements its own comparing method.
                if (enabledHandlers[type].validateSequenceCheck) {
                    return enabledHandlers[type].validateSequenceCheck(question, offlineSequenceCheck);
                } else {
                    return question.sequencecheck == offlineSequenceCheck;
                }
            }
            return false;
        };

        return self;
    };

    return self;
});
