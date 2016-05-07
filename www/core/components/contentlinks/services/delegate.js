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

angular.module('mm.core.contentlinks')

/**
 * Service to handle links found in contents. Allows to capture links in content and redirect to certain parts
 * of the app instead of opening them in browser.
 *
 * @module mm.core.contentlinks
 * @ngdoc provider
 * @name $mmContentLinksDelegate
 */
.provider('$mmContentLinksDelegate', function() {
    var linkHandlers = {},
        self = {};

    /**
     * Register a link handler.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksDelegateProvider#registerLinkHandler
     * @param {String} name                    Handler's name.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                         returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - getActions(siteIds, url, courseId) (Promise) Returns list of actions. Each action must have:
     *                                                           - message: Message related to the action to do. E.g. 'View'.
     *                                                           - icon: Icon related to the action to do.
     *                                                           - sites: Sites IDs that support the action. Subset of 'siteIds'.
     *                                                           - action(siteId): A function to be called when the link is clicked.
     *                             - handles(url) (String) Check if a URL is handled by this handler. If so, returns the site URL.
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

    self.$get = function($mmUtil, $log, $q, $mmSitesManager) {
        var self = {};

        $log = $log.getInstance('$mmContentLinksDelegate');

        /**
         * Get the list of possible actions to do for a URL.
         *
         * @module mm.core.contentlinks
         * @ngdoc method
         * @name $mmContentLinksDelegate#getLinkHandlersFor
         * @param {String} url        URL to handle.
         * @param {Number} [courseId] Course ID related to the URL. Optional but recommended since some handlers might require
         *                            to know the courseid if Moodle version is previous to 3.0.
         * @param {String} [username] Username to use to filter sites.
         * @return {Promise}          Promise resolved with the actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActionsFor = function(url, courseId, username) {
            if (!url) {
                return $q.when([]);
            }

            // Get the list of sites the URL belongs to.
            return $mmSitesManager.getSiteIdsFromUrl(url, true, username).then(function(siteIds) {
                var linkActions = [],
                    promises = [];

                angular.forEach(linkHandlers, function(handler) {
                    if (typeof handler.instance === 'undefined') {
                        handler.instance = $mmUtil.resolveObject(handler.handler, true);
                    }

                    if (handler.instance) {
                        promises.push($q.when(handler.instance.getActions(siteIds, url, courseId)).then(function(actions) {
                            if (actions && actions.length) {
                                linkActions.push({
                                    priority: handler.priority,
                                    actions: actions
                                });
                            }
                        }));
                    }
                });

                return $mmUtil.allPromises(promises).catch(function() {}).then(function() {
                    // Sort link actions by priority.
                    return sortActionsByPriority(linkActions);
                });
            });
        };

        /**
         * Get the site URL if the URL is supported by any handler.
         *
         * @module mm.core.contentlinks
         * @ngdoc method
         * @name $mmContentLinksDelegate#getSiteUrl
         * @param {String} url URL to handle.
         * @return {String}   Site URL if the URL is supported by any handler, undefined otherwise.
         */
        self.getSiteUrl = function(url) {
            if (!url) {
                return;
            }

            // Check if any handler supports this URL.
            for (var name in linkHandlers) {
                var handler = linkHandlers[name];
                if (typeof handler.instance === 'undefined') {
                    handler.instance = $mmUtil.resolveObject(handler.handler, true);
                }

                if (handler.instance && handler.instance.handles) {
                    var siteUrl = handler.instance.handles(url);
                    if (siteUrl) {
                        return siteUrl;
                    }
                }
            }
        };

        /**
         * Sort actions by priority. Each object in the actions param must have a priority and a list of actions.
         * The returned array only contains the actions ordered by priority.
         *
         * @param  {Object[]} actions Actions to sort.
         * @return {Object[]}         Sorted actions.
         */
        function sortActionsByPriority(actions) {
            var sorted = [];

            // Sort by priority.
            actions = actions.sort(function(a, b) {
                return a.priority > b.priority;
            });

            // Fill result array.
            actions.forEach(function(entry) {
                sorted = sorted.concat(entry.actions);
            });
            return sorted;
        }

        return self;
    };

    return self;
});
