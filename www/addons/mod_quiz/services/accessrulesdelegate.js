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
 * Delegate to register access rules handlers.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizAccessRulesDelegate
 * @description
 *
 * Delegate to register access rules handlers.
 * You can use this service to register your own access rules handlers to be used in a quiz.
 *
 * To register an access rule handler:
 *
 * $mmaModQuizAccessRulesDelegate.registerHandler('mmaYourAddon', 'ruleName', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaModQuizAccessRulesDelegate = $mmAddonManager.get('$mmaModQuizAccessRulesDelegate');
 *     if ($mmaModQuizAccessRulesDelegate) {
 *         $mmaModQuizAccessRulesDelegate.registerHandler('mmaQuizAccessPassword', 'quizaccess_password',
 *                                 '$mmaQuizAccessPasswordHandler');
 *      }
 * });
 *
 * @see $mmaModQuizAccessRulesDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaModQuizAccessRulesDelegate', function($log, $q, $mmUtil, $mmSite) {

    $log = $log.getInstance('$mmaModQuizAccessRulesDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {},
        updatePromises = {};

    /**
     * Get the handler for a certain rule.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#getAccessRuleHandler
     * @param  {String} ruleName Name of the access rule.
     * @return {Object}          Handler. Undefined if no handler found for the rule.
     */
    self.getAccessRuleHandler = function(ruleName) {
        if (typeof enabledHandlers[ruleName] != 'undefined') {
            return enabledHandlers[ruleName];
        }
    };

    /**
     * Check if an access rule is supported.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#isAccessRuleSupported
     * @param  {String} ruleName Name of the rule.
     * @return {Boolean}         True if supported, false otherwise.
     */
    self.isAccessRuleSupported = function(ruleName) {
        return typeof enabledHandlers[ruleName] != 'undefined';
    };

    /**
     * Register an access rule handler. The handler will be used when attempting a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#registerHandler
     * @param {String} addon                   Handler's name.
     * @param {String} ruleName                Name of the rule the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isPreflightCheckRequired(attempt) (Boolean|Promise) Whether or not the rule requires a
     *                                                           preflight check when starting/continuing an attempt.
     *                             - getPreflightDirectiveName() (String) Optional. Returns the name of the directive to render
     *                                                           the access rule preflight. Required if the handler needs a
     *                                                           preflight check in some cases.
     *                             - shouldShowTimeLeft(attempt, endTime, timeNow) (Boolean) Optional. Whether or not the time
     *                                                           left of an attempt should be displayed.
     */
    self.registerHandler = function(addon, ruleName, handler) {
        if (typeof handlers[ruleName] !== 'undefined') {
            $log.debug("Addon '" + addon + "' already registered as handler for '" + ruleName + "'");
            return false;
        }
        $log.debug("Registered handler '" + addon + "' for access rule '" + ruleName + "'");
        handlers[ruleName] = {
            addon: addon,
            instance: undefined,
            handler: handler
        };

        // Handlers are registered in the "run" phase, it can happen that a handler is registered after updateHandlers
        // has been executed. If the user is logged in we'll run updateHandler to be sure it has been executed for this site.
        if ($mmSite.isLoggedIn()) {
            self.updateHandler(ruleName, handlers[ruleName]);
        }
    };

    /**
     * Compute what should be displayed to the user for time remaining in this attempt.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#getTimeLeftDisplay
     * @param  {String[]} rules List of active rules names.
     * @param  {Object} attempt Attempt.
     * @param  {Number} endTime The attempt end time (in seconds).
     * @param  {Number} timeNow The time to consider as 'now' (in seconds).
     * @return {Number|Boolean} The number of seconds remaining for this attempt. False if no limit should be displayed.
     */
    self.shouldShowTimeLeft = function(rules, attempt, endTime, timeNow) {
        var show = false;
        angular.forEach(rules, function(ruleName) {
            var handler = self.getAccessRuleHandler(ruleName);
            if (handler && handler.shouldShowTimeLeft && handler.shouldShowTimeLeft(attempt, endTime, timeNow)) {
                show = true;
            }
        });
        return show;
    };

    /**
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#updateHandler
     * @param {String} ruleName     The name of the rule this handler handles.
     * @param {Object} handlerInfo  The handler details.
     * @return {Promise}            Resolved when done.
     * @protected
     */
    self.updateHandler = function(ruleName, handlerInfo) {
        var promise,
            deleted = false,
            siteId = $mmSite.getId();

        if (updatePromises[siteId] && updatePromises[siteId][ruleName]) {
            // There's already an update ongoing for this package, return the promise.
            return updatePromises[siteId][ruleName];
        } else if (!updatePromises[siteId]) {
            updatePromises[siteId] = {};
        }

        if (typeof handlerInfo.instance === 'undefined') {
            handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
        }

        if (!$mmSite.isLoggedIn()) {
            promise = $q.reject();
        } else {
            promise = $q.when(handlerInfo.instance.isEnabled());
        }

        // Checks if the handler is enabled.
        promise = promise.catch(function() {
            return false;
        }).then(function(enabled) {
            // Check that site hasn't changed since the check started.
            if ($mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                if (enabled) {
                    enabledHandlers[ruleName] = handlerInfo.instance;
                } else {
                    delete enabledHandlers[ruleName];
                }
            }
        }).finally(function() {
            // Update finished, delete the promise.
            delete updatePromises[siteId][ruleName];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            updatePromises[siteId][ruleName] = promise;
        }
        return promise;
    };

    /**
     * Update the enabled handlers for the current site.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizAccessRulesDelegate#updateHandlers
     * @return {Promise} Resolved when done.
     * @protected
     */
    self.updateHandlers = function() {
        var promises = [];

        $log.debug('Updating handlers for current site.');

        // Loop over all the handlers.
        angular.forEach(handlers, function(handlerInfo, ruleName) {
            promises.push(self.updateHandler(ruleName, handlerInfo));
        });

        return $q.all(promises).then(function() {
            return true;
        }, function() {
            // Never reject.
            return true;
        });
    };

    return self;
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmaModQuizAccessRulesDelegate) {
    $mmEvents.on(mmCoreEventLogin, $mmaModQuizAccessRulesDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaModQuizAccessRulesDelegate.updateHandlers);
});
