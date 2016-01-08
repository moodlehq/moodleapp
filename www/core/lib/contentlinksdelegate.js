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

angular.module('mm.core')

/**
 * Service to handle links found in contents. Allows to capture links in content and redirect to certain parts
 * of the app instead of opening them in browser.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmContentLinksDelegate
 */
.provider('$mmContentLinksDelegate', function() {
    var linkHandlers = {},
        self = {};

    /**
     * Register a link handler.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmContentLinksDelegateProvider#registerLinkHandler
     * @param {String} name                    Handler's name.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                         returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getActions(url, courseid) (Object[]) Returns list of actions. Each action must have:
     *                                                           - message: Message related to the action to do. E.g. 'View'.
     *                                                           - icon: Icon related to the action to do.
     *                                                           - action: A function to be called when the link is clicked.
     * @param {Number} [priority]              Handler's priority.
     */
    self.registerLinkHandler = function(name, handler, priority) {
        if (typeof linkHandlers[name] !== 'undefined') {
            console.log("$mmContentLinksDelegateProvider: Addon '" + linkHandlers[name].name +
                        "' already registered as link handler");
            return false;
        }
        console.log("$mmContentLinksDelegateProvider: Registered handler '" + name + "' as link handler.");
        linkHandlers[name] = {
            name: name,
            handler: handler,
            instance: undefined,
            priority: typeof priority === 'undefined' ? 100 : priority
        };
        return true;
    };

    self.$get = function($mmUtil, $log, $mmSite, $q) {
        var enabledLinkHandlers = {},
            self = {};

        $log = $log.getInstance('$mmContentLinksDelegate');

        /**
         * Get the list of possible actions to do for a URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmContentLinksDelegate#getLinkHandlersFor
         * @param {String} url        URL to handle.
         * @param {Number} [courseid] Course ID related to the URL. Optional but recommended since some handlers might require
         *                            to know the courseid if Moodle version is previous to 3.0.
         * @return {Object[]}         Actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActionsFor = function(url, courseid) {
            if (!url) {
                return [];
            }

            var linkActions = {};
            angular.forEach(enabledLinkHandlers, function(handler) {
                if (handler.instance && angular.isFunction(handler.instance.getActions)) {
                    var actions = handler.instance.getActions(url, courseid);
                    if (actions && actions.length) {
                        linkActions[handler.priority] = actions;
                    }
                }
            });
            return sortActionsByPriority(linkActions);
        };

        /**
         * Converts an object with priority -> action to an array of actions ordered by priority.
         * If object keys are numbers they're usually automatically ordered, but we can't be 100% sure.
         *
         * @param  {Object} actions Actions to sort.
         * @return {Object[]}       Sorted actions.
         */
        function sortActionsByPriority(actions) {
            var sorted = [],
                priorities = Object.keys(actions);
            // Sort priorities.
            priorities = priorities.sort(function(a, b) {
                return parseInt(a, 10) > parseInt(b, 10);
            });
            // Fill sorted array.
            priorities.forEach(function(priority) {
                var list = actions[priority];
                list.forEach(function(action) {
                    sorted.push(action);
                });
            });
            return sorted;
        }

        /**
         * Update the enabled link handlers for the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmContentLinksDelegate#updateLinkHandler
         * @param {String} name        The handler name.
         * @param {Object} handlerInfo The handler details.
         * @return {Promise}           Resolved when enabled, rejected when not.
         * @protected
         */
        self.updateLinkHandler = function(name, handlerInfo) {
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
                    enabledLinkHandlers[name] = {
                        instance: handlerInfo.instance,
                        priority: handlerInfo.priority
                    };
                } else {
                    return $q.reject();
                }
            }).catch(function() {
                delete enabledLinkHandlers[name];
            });
        };

        /**
         * Update the link handlers for the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmContentLinksDelegate#updateLinkHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateLinkHandlers = function() {
            var promises = [];

            $log.debug('Updating link handlers for current site.');

            // Loop over all the link handlers.
            angular.forEach(linkHandlers, function(handler, name) {
                promises.push(self.updateLinkHandler(name, handler));
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
})

.run(function($mmEvents, $mmContentLinksDelegate, mmCoreEventLogin, mmCoreEventSiteUpdated) {
    $mmEvents.on(mmCoreEventLogin, $mmContentLinksDelegate.updateLinkHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmContentLinksDelegate.updateLinkHandlers);
});
