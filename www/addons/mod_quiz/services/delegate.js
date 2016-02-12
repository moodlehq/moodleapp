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

angular.module('mm.addons.mod_quiz')

/**
 * Delegate to register question handlers.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizQuestionsDelegate
 * @description
 *
 * Delegate to register question handlers.
 * You can use this service to register your own question handlers to be used in a quiz.
 *
 * Important: This service mustn't be injected using Angular's dependency injection. This is because custom apps could have this
 * addon disabled or removed, so you can't guarantee that the service exists. Please inject it using {@link $mmAddonManager}.
 *
 */
.factory('$mmaModQuizQuestionsDelegate', function($log, $q, $mmUtil, $mmSite) {

    $log = $log.getInstance('$mmaModQuizQuestionsDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {};

    /**
     * Get the directive to use for a certain question type.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizQuestionsDelegate#getDirectiveForQuestion
     * @param  {Object} question Question to get the directive for.
     * @return {String}          Directive name. Undefined if no directive found.
     */
    self.getDirectiveForQuestion = function(question) {
        var type = question.type;
        if (typeof enabledHandlers[type] != 'undefined') {
            return enabledHandlers[type].getDirectiveName(question);
        }
    };

    /**
     * Check if a question type is supported.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizQuestionsDelegate#isQuestionSupported
     * @param  {String}  type Question type.
     * @return {Boolean}      True if supported, false otherwise.
     */
    self.isQuestionSupported = function(type) {
        return typeof enabledHandlers[type] != 'undefined';
    };

    /**
     * Register a question handler. The handler will be used when we need to render a question of the type defined.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizQuestionsDelegate#registerHandler
     * @param {String} name                    Handler's name.
     * @param {String} questionType            Question type the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getDirectiveName(question) (String) Returns the name of the directive to render the question.
     *                                                           There's no need to check the question type in this function.
     */
    self.registerHandler = function(name, questionType, handler) {
        if (typeof handlers[questionType] !== 'undefined') {
            $log.debug("Addon '" + name + "' already registered as handler for '" + questionType + "'");
            return false;
        }
        $log.debug("Registered handler '" + name + "' for question type '" + questionType + "'");
        handlers[questionType] = {
            addon: name,
            instance: undefined,
            handler: handler
        };

        // It's possible that this handler is registered after updateQuestionHandlers has been called for the current
        // site. Let's call updateQuestionHandler just in case.
        self.updateQuestionHandler(questionType, handlers[questionType]);
    };

    /**
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizQuestionsDelegate#updateQuestionHandler
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
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizQuestionsDelegate#updateQuestionHandlers
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
});
