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

angular.module('mm.core.settings')

/**
 * Service to interact with addons to be shown in app settings. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core.settings
 * @ngdoc provider
 * @name $mmSettingsDelegate
 */
.provider('$mmSettingsDelegate', function() {
    var handlers = {},
        self = {};

    /**
     * Register a handler.
     *
     * @module mm.core.settings
     * @ngdoc method
     * @name $mmSettingsDelegateProvider#registerHandler
     * @param {String} component               The addon's name.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                          returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getController() (Function)  Returns the function that will act as controller.
     *                                                                See core/components/settings/templates/list.html
     *                                                                for the list of scope variables expected.
     * @param {Number} [priority=100] Plugin priority.
     */
    self.registerHandler = function(component, handler, priority) {
        if (typeof handlers[component] !== 'undefined') {
            console.log("$mmSettingsDelegateProvider: Handler '" + handlers[component].component + "' already registered as settings handler");
            return false;
        }
        console.log("$mmSettingsDelegateProvider: Registered component '" + component + "' as settings handler.");
        handlers[component] = {
            component: component,
            handler: handler,
            instance: undefined,
            priority: typeof priority === 'undefined' ? 100 : priority
        };
        return true;
    };

    self.$get = function($q, $log, $mmSite, $mmUtil) {
        var enabledHandlers = {},
            currentSiteHandlers = [], // Handlers to return.
            self = {},
            loaded = false, // If site handlers have been loaded.
            lastUpdateHandlersStart;

        $log = $log.getInstance('$mmSettingsDelegate');

        /**
         * Check if addons are loaded.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#areHandlersLoaded
         * @return {Boolean} True if addons are loaded, false otherwise.
         */
        self.areHandlersLoaded = function() {
            return loaded;
        };

        /**
         * Clear current site handlers. Reserved for core use.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#clearSiteHandlers
         * @return {Void}
         */
        self.clearSiteHandlers = function() {
            loaded = false;
            $mmUtil.emptyArray(currentSiteHandlers);
        };

        /**
         * Get the handlers for the current site.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#getHandlers
         * @return {Promise} Resolved with an array of objects containing 'priority' and 'controller'.
         */
        self.getHandlers = function() {
            return currentSiteHandlers;
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#isLastUpdateCall
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
         * Update the handler for the current site.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#updateHandler
         * @param {String} addon The addon.
         * @param {Object} handlerInfo The handler details.
         * @param  {Number} time Time this update process started.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateHandler = function(addon, handlerInfo, time) {
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
                        enabledHandlers[addon] = {
                            instance: handlerInfo.instance,
                            priority: handlerInfo.priority
                        };
                    } else {
                        delete enabledHandlers[addon];
                    }
                }
            });
        };

        /**
         * Update the handlers for the current site.
         *
         * @module mm.core.settings
         * @ngdoc method
         * @name $mmSettingsDelegate#updateHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating setting handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the content handlers.
            angular.forEach(handlers, function(handlerInfo, addon) {
                promises.push(self.updateHandler(addon, handlerInfo, now));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            }).finally(function() {
                // Verify that this call is the last one that was started.
                if (self.isLastUpdateCall(now)) {
                    $mmUtil.emptyArray(currentSiteHandlers);

                    angular.forEach(enabledHandlers, function(handler) {
                        currentSiteHandlers.push({
                            controller: handler.instance.getController(),
                            priority: handler.priority
                        });
                    });

                    loaded = true;
                }
            });
        };

        return self;
    };

    return self;
});
