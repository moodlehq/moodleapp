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

angular.module('mm.core.sidemenu')

/**
 * Service to interact with plugins to be shown in the side menu. Provides functions to register a plugin
 * and notify an update in the data.
 *
 * @module mm.core.sidemenu
 * @ngdoc provider
 * @name $mmSideMenuDelegate
 */
.provider('$mmSideMenuDelegate', function() {
    var navHandlers = {},
        self = {};

    /**
     * Register a navigation handler.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenuDelegateProvider#registerNavHandler
     * @param {String} addon The addon's name (mmaFiles, mmaMessages, ...)
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getController (Object) Returns the object that will act as controller.
     *                                                                See core/components/sidemenu/templates/menu.html
     *                                                                for the list of scope variables expected.
     */
    self.registerNavHandler = function(addon, handler, priority) {
        if (typeof navHandlers[addon] !== 'undefined') {
            console.log("$mmSideMenuDelegateProvider: Addon '" + navHandlers[addon].addon + "' already registered as navigation handler");
            return false;
        }
        console.log("$mmSideMenuDelegateProvider: Registered addon '" + addon + "' as navigation handler.");
        navHandlers[addon] = {
            addon: addon,
            handler: handler,
            instance: undefined,
            priority: priority
        };
        return true;
    };

    self.$get = function($mmUtil, $q, $log, $mmSite) {
        var enabledNavHandlers = {},
            currentSiteHandlers = [], // Handlers to return.
            self = {};

        $log = $log.getInstance('$mmSideMenuDelegate');

        /**
         * Get the handlers for the current site.
         *
         * @module mm.core.sidemenu
         * @ngdoc method
         * @name $mmSideMenuDelegate#getNavHandlers
         * @return {Promise} Resolved with an array of objects containing 'priority' and 'controller'.
         */
        self.getNavHandlers = function() {
            return currentSiteHandlers;
        };

        /**
         * Update the handler for the current site.
         *
         * @module mm.core.sidemenu
         * @ngdoc method
         * @name $mmSideMenuDelegate#updateNavHandler
         * @param {String} addon The addon.
         * @param {Object} handlerInfo The handler details.
         * @return {Promise} Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateNavHandler = function(addon, handlerInfo) {
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
                    enabledNavHandlers[addon] = {
                        instance: handlerInfo.instance,
                        priority: handlerInfo.priority
                    };
                } else {
                    return $q.reject();
                }
            }).catch(function() {
                delete enabledNavHandlers[addon];
            });
        };

        /**
         * Update the handlers for the current site.
         *
         * @module mm.core.sidemenu
         * @ngdoc method
         * @name $mmSideMenuDelegate#updateNavHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateNavHandlers = function() {
            var promises = [];

            $log.debug('Updating navigation handlers for current site.');

            // Loop over all the content handlers.
            angular.forEach(navHandlers, function(handlerInfo, addon) {
                promises.push(self.updateNavHandler(addon, handlerInfo));
            });

            return $q.all(promises).then(function() {
                return true;
            }, function() {
                // Never reject.
                return true;
            }).finally(function() {

                $mmUtil.emptyArray(currentSiteHandlers);

                angular.forEach(enabledNavHandlers, function(handler) {
                    currentSiteHandlers.push({
                        controller: handler.instance.getController(),
                        priority: handler.priority
                    });
                });
            });
        };

        return self;
    };

    return self;

});
