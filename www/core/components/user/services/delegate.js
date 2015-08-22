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

angular.module('mm.core.user')

/**
 * Service to interact with plugins to be shown in user profile. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core.user
 * @ngdoc provider
 * @name $mmUserDelegate
 */
.provider('$mmUserDelegate', function() {
    var profileHandlers = {},
        self = {};

    /**
     * Register a profile handler.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserDelegateProvider#registerProfileHandler
     * @param {String} component The addon's name, or addon and sub context (mmaMessages, mmaMessage:blockContact, ...)
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                          returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isEnabledForUser (Boolean|Promise) Whether or not the handler is enabled for a user.
     *                                                                  When using a promise, it should return a boolean.
     *                             - getController(userid) (Function) Returns the function that will act as controller.
     *                                                                See core/components/user/templates/profile.html
     *                                                                for the list of scope variables expected.
     *                           The string can either be 'factoryName' or 'factoryName.functionToCall'.
     * @param {Number} [priority=100] Plugin priority.
     */
    self.registerProfileHandler = function(component, handler, priority) {
        if (typeof profileHandlers[component] !== 'undefined') {
            console.log("$mmUserDelegateProvider: Handler '" + profileHandlers[component].component + "' already registered as profile handler");
            return false;
        }
        console.log("$mmUserDelegateProvider: Registered component '" + component + "' as profile handler.");
        profileHandlers[component] = {
            component: component,
            handler: handler,
            instance: undefined,
            priority: typeof priority === 'undefined' ? 100 : priority
        };
        return true;
    };

    self.$get = function($q, $log, $mmSite, $mmUtil) {
        var enabledProfileHandlers = {},
            self = {};

        $log = $log.getInstance('$mmUserDelegate');

        /**
         * Get the profile handlers for a user.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserDelegate#getProfileHandlersFor
         * @param {Object} user The user object.
         * @param {Number} courseId The course ID.
         * @return {Promise} Resolved with an array of objects containing 'priority' and 'controller'.
         */
        self.getProfileHandlersFor = function(user, courseId) {
            var handlers = [],
                promises = [];

            angular.forEach(enabledProfileHandlers, function(handler) {
                // Checks if the handler is enabled for the user.
                var promise = $q.when(handler.instance.isEnabledForUser(user, courseId)).then(function(enabled) {
                    if (enabled) {
                        handlers.push({
                            controller: handler.instance.getController(user, courseId),
                            priority: handler.priority
                        });
                    } else {
                        return $q.reject();
                    }
                }).catch(function() {
                    // Nothing to do here, it is not enabled for this user.
                });
                promises.push(promise);
            });

            return $q.all(promises).then(function() {
                return handlers;
            }).catch(function() {
                // Never fails.
                return handlers;
            });
        };

        /**
         * Update the enabled profile handlers for the current site.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserDelegate#updateProfileHandler
         * @param {String} component The component name.
         * @param {Object} handlerInfo The handler details.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateProfileHandler = function(component, handlerInfo) {
            var promise;

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            if (!$mmSite.isLoggedIn()) {
                promise = $q.reject();
            } else {
                promise = $q.when(handlerInfo.instance.isEnabled());
            }

            // Checks if the content is enabled.
            return promise.then(function(enabled) {
                if (enabled) {
                    enabledProfileHandlers[component] = {
                        instance: handlerInfo.instance,
                        priority: handlerInfo.priority
                    };
                } else {
                    return $q.reject();
                }
            }).catch(function() {
                delete enabledProfileHandlers[component];
            });
        };

        /**
         * Update the profile handlers for the current site.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserDelegate#updateProfileHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateProfileHandlers = function() {
            var promises = [];

            $log.debug('Updating profile handlers for current site.');

            // Loop over all the profile handlers.
            angular.forEach(profileHandlers, function(handlerInfo, component) {
                promises.push(self.updateProfileHandler(component, handlerInfo));
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
