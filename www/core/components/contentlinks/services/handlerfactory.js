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
 * Factory to create content link handler service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmContentLinkHandlerFactory
 */
.factory('$mmContentLinkHandlerFactory', function($log) {

    $log = $log.getInstance('$mmContentLinkHandlerFactory');

    var self = {},
        contentLinkHandler = (function () {
            this.pattern = false;
            this.featureName = '';
            this.checkAllSites = false;

            /**
             * Get actions to perform with the link.
             *
             * @param  {String[]} siteIds  Site IDs the URL belongs to.
             * @param  {String} url        URL to treat.
             * @param  {Object} params     Params of the URL.
             * @param  {Number} [courseId] Course ID related to the URL.
             * @return {Mixed}             List of actions, or promise resolved with the list of actions.
             *                             See {@link $mmContentLinksDelegate#registerLinkHandler}.
             */
            this.getActions = function(siteIds, url, params, courseId) {
                // Return actions.
                return [];
            };

            /**
             * Check if the URL is handled by this handler.
             *
             * @param  {String}  url URL to check.
             * @return {Boolean}     If the URL is handled.
             */
            this.handles = function(url) {
                return this.pattern && url.search(this.pattern) >= 0;
            };

            /**
             * Check if the URL is handled by this handler. If so, returns the URL of the site.
             *
             * @param  {String} url URL to check.
             * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
             */
            this.getHandlerUrl = function(url) {
                if (this.pattern) {
                    var position = url.search(this.pattern);
                    if (position > -1) {
                        return url.substr(0, position);
                    }
                }
            };

            /**
             * Check if the handler is enabled for a certain site.
             *
             * @param  {String} siteId     Site ID.
             * @param  {String} url        URL being treated.
             * @param  {Object} params     Params of the URL.
             * @param  {Number} [courseId] Course ID related to the URL.
             * @return {Mixed}             Boolean or promise resolved with boolean. True if enabled, false otherwise.
             */
            this.isEnabled = function(siteId, url, params, courseId) {
                return true;
            };

            return this;
        }());

    /**
     * Returns the subclass of contentLinkHandler object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmContentLinkHandlerFactory#createChild
     * @param  {Mixed} pattern         String or RegExp handled by this handler. Required.
     * @param  {String} [featureName]  Name of the feature this handler is related to. It will be used to check if the feature
     *                                 is disabled (@see $mmSite#isFeatureDisabled).
     * @param  {Boolean} checkAllSites True if the isEnabled function should be called for all the site IDs. It should be true only
     *                                 if the isEnabled call can return different values for different users in same site.
     * @return {Object}                Child object of contentLinkHandler.
     */
    self.createChild = function(pattern, featureName, checkAllSites) {
        var child = Object.create(contentLinkHandler);
        child.pattern = pattern;
        child.featureName = featureName;
        child.checkAllSites = !!checkAllSites;
        return child;
    };

    return self;
});