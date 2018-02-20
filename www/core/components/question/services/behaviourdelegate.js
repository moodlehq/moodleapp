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
 * Delegate to register question behaviour handlers.
 *
 * @module mm.core.question
 * @ngdoc provider
 * @name $mmQuestionBehaviourDelegate
 * @description
 *
 * Delegate to register question behaviour handlers.
 * You can use this provider to register your own question behaviour handlers to be used in a quiz or other places.
 *
 * To register a question behavour handler:
 *
 * $mmQuestionBehaviourDelegateProvider.registerHandler('mmaYourAddon', 'behaviourName', 'handlerName');
 *
 * Example:
 *
 * .config(function($mmQuestionBehaviourDelegateProvider) {
 *     $mmQuestionBehaviourDelegateProvider.registerHandler('mmaQbehaviourAdaptive', 'adaptive', '$mmaQbehaviourAdaptiveHandler');
 * })
 *
 * @see $mmQuestionBehaviourDelegateProvider#registerHandler to see the methods your handler needs to implement.
 */
.provider('$mmQuestionBehaviourDelegate', function() {

    var handlers = {},
        self = {};

    /**
     * Register a question behaviour handler.
     * The handler will be used when we need to render a question with the behaviour defined.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestionBehaviourDelegateProvider#registerHandler
     * @param {String} name                    Handler's name.
     * @param {String} behaviour               Name of the behaviour the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - handleQuestion(question) (String[]) Handle a question. If the behaviour requires a submit
     *                                                           button, the handler should add it to question.behaviourButtons. It
     *                                                           should return a list of directives to render extra data if needed.
     */
    self.registerHandler = function(name, behaviour, handler) {
        if (typeof handlers[behaviour] !== 'undefined') {
            console.log("$mmQuestionBehaviourDelegateProvider: Addon '" + name +
                            "' already registered as handler for '" + behaviour + "'");
            return false;
        }
        console.log("$mmQuestionBehaviourDelegateProvider: Registered handler '" + name + "' for behaviour '" + behaviour + "'");
        handlers[behaviour] = {
            addon: name,
            instance: undefined,
            handler: handler
        };
    };

    self.$get = function($log, $q, $mmUtil, $mmSite, $mmQuestionDelegate) {

        $log = $log.getInstance('$mmQuestionBehaviourDelegate');

        var enabledHandlers = {},
            self = {},
            lastUpdateHandlersStart;

        /**
         * Determine a question state based on its answer(s).
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#determineQuestionState
         * @param  {String} component Component the question belongs to.
         * @param  {Number} attemptId Attempt ID the question belongs to.
         * @param  {Object} question  The question.
         * @param  {String} [siteId]  Site ID. If not defined, current site.
         * @return {Promise}          Promise resolved with the state or false if cannot determine state.
         */
        self.determineQuestionState = function(behaviour, component, attemptId, question, siteId) {
            behaviour = $mmQuestionDelegate.getBehaviourForQuestion(question, behaviour);
            var handler = enabledHandlers[behaviour];
            if (typeof handler != 'undefined' && handler.determineQuestionState) {
                return $q.when(handler.determineQuestionState(component, attemptId, question, siteId));
            }
            return $q.when(false);
        };

        /**
         * Handle a question behaviour.
         * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
         * If the behaviour requires to show some extra data, it should return a directive to render it.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#handleQuestion
         * @param  {Object} question  Question.
         * @param  {String} behaviour Name of the behaviour the handler supports.
         * @return {String[]}         Names of the directives to render some extra data in the question. Don't return anything
         *                            if no extra data is required.
         */
        self.handleQuestion = function(question, behaviour) {
            behaviour = $mmQuestionDelegate.getBehaviourForQuestion(question, behaviour);
            if (typeof enabledHandlers[behaviour] != 'undefined') {
                return enabledHandlers[behaviour].handleQuestion(question);
            }
        };

        /**
         * Check if a question behaviour is supported.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#isBehaviourSupported
         * @param  {String} behaviour Name of the question behaviour.
         * @return {Boolean}          True if supported, false otherwise.
         */
        self.isBehaviourSupported = function(behaviour) {
            return typeof enabledHandlers[behaviour] != 'undefined';
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateQuestionBehaviourHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#isLastUpdateCall
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
         * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#updateQuestionBehaviourHandler
         * @param  {String} behaviour   Name of the behaviour the handler supports.
         * @param  {Object} handlerInfo The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise}            Resolved when done.
         * @protected
         */
        self.updateQuestionBehaviourHandler = function(behaviour, handlerInfo, time) {
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
                        enabledHandlers[behaviour] = handlerInfo.instance;
                    } else {
                        delete enabledHandlers[behaviour];
                    }
                }
            });
        };

        /**
         * Update the enabled handlers for the current site.
         *
         * @module mm.core.question
         * @ngdoc method
         * @name $mmQuestionBehaviourDelegate#updateQuestionBehaviourHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateQuestionBehaviourHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating question behaviour handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the handlers.
            angular.forEach(handlers, function(handlerInfo, behaviour) {
                promises.push(self.updateQuestionBehaviourHandler(behaviour, handlerInfo, now));
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
