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
     *                                                           When using a promise, it should return a boolean.
     *                             - getDirectiveName(question) (String) Returns the name of the directive to render the question.
     *                                                           There's no need to check the question type in this function.
     *                             - getBehaviour(question, behaviour) (String) Optional. Returns the name of the behaviour to use
     *                                                           for the question. If the question should use the default behaviour
     *                                                           you shouldn't implement this question or it should just return
     *                                                           the behaviour param.
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
            self = {};

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
         * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionDelegate#updateQuestionHandler
         * @param {String} questionType The question type this handler handles.
         * @param {Object} handlerInfo  The handler details.
         * @return {Promise}            Resolved when done.
         * @protected
         */
        self.updateQuestionHandler = function(questionType, handlerInfo) {
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
                // Check that site hasn't changed since the check started.
                if ($mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
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
            var promises = [];

            $log.debug('Updating question handlers for current site.');

            // Loop over all the handlers.
            angular.forEach(handlers, function(handlerInfo, questionType) {
                promises.push(self.updateQuestionHandler(questionType, handlerInfo));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            });
        };

        return self;
    };

    return self;
});
