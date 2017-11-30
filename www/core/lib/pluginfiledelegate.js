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
 * Delegate to register pluginfile information handlers.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmPluginFileDelegate
 * @description
 *
 * To register a handler:
 *
 * $mmPluginFileDelegate.registerHandler('mmaYourAddon', 'pluginType', 'handlerName');
 *
 * Example:
 *
 * .config($mmPluginFileDelegate, function() {
 *     $mmPluginFileDelegate.registerHandler('mmaModFolder', 'mod_folder', '$mmaModFolderPluginFileHandler');
 * })
 *
 * @see $mmPluginFileDelegate#registerHandler to see the methods your handle needs to implement.
 */
.provider('$mmPluginFileDelegate', function() {
    var pluginHandlers = {},
        self = {};

    /**
     * Register a pluginfile handler. If module is not supported in current site, handler should return undefined.
     * All handlers included will be always enabled to manage revision even if the module is disabled because this is about
     * improving performance on downloading files.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmPluginFileDelegate#registerHandler
     * @param {String} addon The addon's name (mmaLabel, mmaForum, ...)
     * @param {String} component The component name of the pluginfile.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - getComponentRevisionRegExp(args) Optional.
     *                                                           Should return the RegExp to match revision on pluginfile url.
     *                             - getComponentRevisionReplace(args) Optional.
     *                                                           Should return the String to remove the revision on pluginfile url.
     */
    self.registerHandler = function(addon, component, handler) {
        if (typeof pluginHandlers[component] !== 'undefined') {
            console.log("$mmPluginFileDelegateProvider: Addon '" + pluginHandlers[component].addon + "' already registered as handler for '" + component + "'");
            return false;
        }
        console.log("$mmPluginFileDelegateProvider: Registered addon '" + addon + "' as pluginfile handler.");
        pluginHandlers[component] = {
            addon: addon,
            handler: handler,
            instance: undefined
        };
        return true;
    };

    self.$get = function($log, $mmSite, $mmUtil, $q) {
        var self = {},
            enabledHandlers = {},
            lastUpdateHandlersStart;

        $log = $log.getInstance('$mmPluginFileDelegate');

        /**
         * Get the handler for a certain pluginfile url.
         *
         * @param  {String} pluginType Type of the plugin.
         * @return {Object}            Handler. Undefined if no handler found for the plugin.
         */
        function getPluginHandler(pluginType) {
            if (typeof enabledHandlers[pluginType] != 'undefined') {
                return enabledHandlers[pluginType];
            }
        }

        /**
         * Get the RegExp of the component and filearea described in the URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmPluginFileDelegate#getComponentRevisionRegExp
         * @param  {Array}   args     Arguments of the pluginfile URL defining component and filearea at least.
         * @return {Mixed}            RegExp to match the revision or false if not found.
         */
        self.getComponentRevisionRegExp = function(args) {
            // Get handler based on component (args[1]).
            var handler = getPluginHandler(args[1]);

            if (handler && handler.getComponentRevisionRegExp) {
                return handler.getComponentRevisionRegExp(args);
            }
            return false;
        };

        /**
         * Removes the revision number from a file URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmPluginFileDelegate#removeRevisionFromUrl
         * @param  {String}  url      URL to be replaced.
         * @param  {Array}   args     Arguments of the pluginfile URL defining component and filearea at least.
         * @return {String}           Replaced URL without revision.
         */
        self.removeRevisionFromUrl = function(url, args) {
            // Get handler based on component (args[1]).
            var handler = getPluginHandler(args[1]);

            if (handler && handler.getComponentRevisionRegExp && handler.getComponentRevisionReplace) {
                var revisionRegex = handler.getComponentRevisionRegExp(args);
                if (revisionRegex) {
                    replace = handler.getComponentRevisionReplace(args);
                    return url.replace(revisionRegex, replace);
                }
            }

            return url;
        };

        /**
         * Check if a time belongs to the last update handlers call.
         * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmPluginFileDelegate#isLastUpdateCall
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
         * Check if a handler is enabled for a certain site and add/remove it to pluginHandlers.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmPluginFileDelegate#updateHandler
         * @param {String} pluginType   The type of the plugin this handler handles.
         * @param {Object} handlerInfo  The handler details.
         * @param  {Number} time        Time this update process started.
         * @return {Promise}            Resolved when done.
         * @protected
         */
        self.updateHandler = function(pluginType, handlerInfo, time) {
            var siteId = $mmSite.getId();

            if (typeof handlerInfo.instance === 'undefined') {
                handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
            }

            // Checks if site is enabled.
            var enabled = $mmSite.isLoggedIn();

            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (self.isLastUpdateCall(time) && $mmSite.getId() === siteId) {
                if (enabled) {
                    enabledHandlers[pluginType] = handlerInfo.instance;
                } else {
                    delete enabledHandlers[pluginType];
                }
            }
        };

        /**
         * Update the enabled handlers for the current site.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmPluginFileDelegate#updateHandlers
         * @return {Promise} Resolved when done.
         * @protected
         */
        self.updateHandlers = function() {
            var promises = [],
                now = new Date().getTime();

            $log.debug('Updating handlers for current site.');

            lastUpdateHandlersStart = now;

            // Loop over all the handlers.
            angular.forEach(pluginHandlers, function(handlerInfo, pluginType) {
                promises.push(self.updateHandler(pluginType, handlerInfo, now));
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

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventRemoteAddonsLoaded, $mmPluginFileDelegate) {
    $mmEvents.on(mmCoreEventLogin, $mmPluginFileDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmPluginFileDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmPluginFileDelegate.updateHandlers);
});