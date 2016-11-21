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
 * Service to interact with user profile fields. Provides functions to register a plugin.
 *
 * @module mm.core.user
 * @ngdoc provider
 * @name $mmUserProfileFieldsDelegate
 */
.provider('$mmUserProfileFieldsDelegate', function() {
    var handlers = {},
        self = {};

    /**
     * Register a profile field handler.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserProfileFieldsDelegate#registerHandler
     * @param {String} addon                   The addon's name. Must be unique.
     * @param {String} fieldType               The type of the user profile field.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                          returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getDirectiveName(field, signup, method) (String) Returns the name of the directive to render
     *                                              the field. There's no need to check the field type in this function.
     */
    self.registerHandler = function(addon, fieldType, handler) {
        if (typeof handlers[fieldType] !== 'undefined') {
            console.log("$mmUserProfileFieldsDelegateProvider: Addon '" + addon +
                        "' already registered as handler for '" + fieldType + "'");
            return false;
        }
        console.log("$mmUserProfileFieldsDelegateProvider: Registered handler '" + addon + "' for user field '" + fieldType + "'");
        handlers[fieldType] = {
            addon: addon,
            handler: handler,
            instance: undefined
        };
        return true;
    };

    self.$get = function($q, $log, $mmSite, $mmUtil) {
        var enabledHandlers = {},
            self = {},
            lastUpdateHandlersStart;

        $log = $log.getInstance('$mmUserProfileFieldsDelegate');

        /**
         * Get the data to send for a certain field based on the input data.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#getDataForField
         * @param  {Object} field          User field to get the data for.
         * @param  {Boolean} signup        True if user is in signup page.
         * @param  {String} [registerAuth] Register auth method. E.g. 'email'.
         * @param  {Object} model          Model with the input data.
         * @return {Object}                Data to send for the field.
         */
        self.getDataForField = function(field, signup, registerAuth, model) {
            var handler = self.getHandlerInstance(field, signup),
                name = 'profile_field_' + field.shortname;

            if (handler) {
                if (handler.getData) {
                    return $q.when(handler.getData(field, signup, registerAuth, model));
                } else if (field.shortname && typeof model[name] != 'undefined') {
                    // Handler doesn't implement the function, but the model has data for the field.
                    return $q.when({
                        type: field.type || field.datatype,
                        name: name,
                        value: model[name]
                    });
                }
            }

            return $q.when();
        };

        /**
         * Get the data to send for a list of fields based on the input data.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#getDataForFields
         * @param  {Object[]} fields       User fields to get the data for.
         * @param  {Boolean} signup        True if user is in signup page.
         * @param  {String} [registerAuth] Register auth method. E.g. 'email'.
         * @param  {Object} model          Model with the input data.
         * @return {Object[]}              Data to send.
         */
        self.getDataForFields = function(fields, signup, registerAuth, model) {
            var result = [],
                promises = [];

            angular.forEach(fields, function(field) {
                promises.push(self.getDataForField(field, signup, registerAuth, model).then(function(data) {
                    if (data) {
                        result.push(data);
                    }
                }));
            });

            return $q.all(promises).then(function() {
                return result;
            });
        };

        /**
         * Get the directive to use for a certain user profile field.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#getDirectiveForField
         * @param  {Object} field          User field to get the directive for.
         * @param  {Boolean} signup        True if user is in signup page.
         * @param  {String} [registerAuth] Register auth method. E.g. 'email'.
         * @return {String}                Directive name. Undefined if no directive found.
         */
        self.getDirectiveForField = function(field, signup, registerAuth) {
            var handler = self.getHandlerInstance(field, signup);
            if (handler) {
                return handler.getDirectiveName(field, signup, registerAuth);
            }
        };

        /**
         * Get a handler instance.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#getHandlerInstance
         * @param  {Object} field          User field to get the directive for.
         * @param  {Boolean} signup        True if user is in signup page.
         * @return {Object}                Handler instance, undefined if not found.
         */
        self.getHandlerInstance = function(field, signup) {
            var type = field.type || field.datatype;

            if (signup) {
                if (handlers[type]) {
                    if (typeof handlers[type].instance === 'undefined') {
                        handlers[type].instance = $mmUtil.resolveObject(handlers[type].handler, true);
                    }
                    return handlers[type].instance;
                }
            } else {
                return enabledHandlers[type];
            }
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateProfileHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#isLastUpdateCall
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
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#updateFieldHandler
         * @param {String} fieldType   The type of the user profile field.
         * @param {Object} handlerInfo The handler details.
         * @param  {Number} time       Time this update process started.
         * @return {Promise}           Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateFieldHandler = function(fieldType, handlerInfo, time) {
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

            // Checks if the content is enabled.
            return promise.catch(function() {
                return false;
            }).then(function(enabled) {
                // Verify that this call is the last one that was started.
                // Check that site hasn't changed since the check started.
                if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                    if (enabled) {
                        enabledHandlers[fieldType] = handlerInfo.instance;
                    } else {
                        delete enabledHandlers[fieldType];
                    }
                }
            });
        };

        /**
         * Update the field handlers for the current site.
         *
         * @module mm.core.user
         * @ngdoc method
         * @name $mmUserProfileFieldsDelegate#updateFieldHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateFieldHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating field handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the profile handlers.
            angular.forEach(handlers, function(handlerInfo, fieldType) {
                promises.push(self.updateFieldHandler(fieldType, handlerInfo, now));
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
