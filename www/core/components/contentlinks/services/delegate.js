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
     * Register a link handler. An addon should register 1 handler for each type of URL to treat.
     * E.g. if an addon should treat 2 URLs, one for viewing a list of items and the other to see a single item,
     * it should register 2 different link handlers.
     *
     * @module mm.core.contentlinks
     * @ngdoc method
     * @name $mmContentLinksDelegateProvider#registerLinkHandler
     * @param {String} name                    Handler's name. Must be unique.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                         returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                         It is recommended to use $mmContentLinkHandlerFactory to create the handler.
     *                             - checkAllSites (Boolean) True if the isEnabled function should be called for all the site IDs.
     *                                                 It should be true only if the isEnabled call can return different values for
     *                                                 different users in same site.
     *                             - getActions(siteIds, url, params, courseId) (Mixed) Returns list of actions, or promise
     *                                                 resolved with the list of actions. Each action must have:
     *                                                     - action(siteId): Required. A function to call when the link is clicked.
     *                                                     - message: Optional. Message of the action. Default: 'mm.core.view'.
     *                                                     - icon: Optional. Icon of to the action. Default: 'ion-eye'.
     *                                                     - sites: Optional. Sites IDs that support the action. Subset of siteIds.
     *                                                              Default: siteIds.
     *                             - handles(url) (String) Check if a URL is handled by this handler. If so, returns the site URL.
     *                             - isEnabled(siteId, url, params, courseId) (Mixed) Optional. Returns a boolean or promise
     *                                                 resolved with boolean. True if enabled, false otherwise. Enabled by default.
     *                             - featureName (String) Optional. Name of the feature this handler is related to. It will be used
     *                                                 to check if the feature is disabled (@see $mmSite#isFeatureDisabled).
     * @param {Number} [priority]              Handler's priority.
     */
    self.registerLinkHandler = function(name, handler, priority) {
        if (typeof linkHandlers[name] !== 'undefined') {
            console.log("$mmContentLinksDelegateProvider: Handler '" + linkHandlers[name].name +
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
                    promises = [],
                    params = $mmUtil.extractUrlParams(url);

                angular.forEach(linkHandlers, function(handler) {
                    if (typeof handler.instance === 'undefined') {
                        handler.instance = $mmUtil.resolveObject(handler.handler, true);
                    }

                    if (!handler.instance || !handler.instance.handles(url)) {
                        // Invalid handler or it doesn't handle the URL. Stop.
                        return;
                    }

                    // Filter the site IDs using the isEnabled function.
                    var checkAll = handler.instance.checkAllSites;
                    promises.push($mmUtil.filterEnabledSites(siteIds, isEnabled, checkAll).then(function(siteIds) {

                        if (!siteIds.length) {
                            // No sites supported, no actions.
                            return;
                        }

                        return $q.when(handler.instance.getActions(siteIds, url, params, courseId)).then(function(actions) {
                            if (actions && actions.length) {
                                // Set default values if any value isn't supplied.
                                angular.forEach(actions, function(action) {
                                    action.message = action.message || 'mm.core.view';
                                    action.icon = action.icon || 'ion-eye';
                                    action.sites = action.sites || siteIds;
                                });

                                // Add them to the list.
                                linkActions.push({
                                    priority: handler.priority,
                                    actions: actions
                                });
                            }
                        });
                    }));

                    // Check if the feature and the handler are enabled.
                    function isEnabled(siteId) {
                        var promise;

                        if (handler.instance.featureName) {
                            // Check if the feature is disabled.
                            promise = $mmSitesManager.isFeatureDisabled(handler.instance.featureName, siteId);
                        } else {
                            promise = $q.when(false);
                        }

                        return promise.then(function(disabled) {
                            if (disabled) {
                                return false;
                            }

                            if (!handler.instance.isEnabled) {
                                // isEnabled function not provided, assume it's enabled.
                                return true;
                            }

                            return handler.instance.isEnabled(siteId, url, params, courseId);
                        });
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
