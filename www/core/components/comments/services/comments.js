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

angular.module('mm.core.comments')

/**
 * Comments service.
 *
 * @module mm.core.comments
 * @ngdoc service
 * @name $mmComments
 */
.factory('$mmComments', function($log, $mmSitesManager, $mmSite, $q) {

    $log = $log.getInstance('$mmComments');

    var self = {};

    /**
     * Get cache key for get comments data WS calls.
     *
     * @param  {String} contextLevel    Contextlevel system, course, user...
     * @param  {Number} instanceId      The Instance id of item associated with the context level.
     * @param  {String} component       Component name.
     * @param  {Number} itemId          Associated id.
     * @param  {String} [area]          String comment area. Default empty.
     * @param  {Number} [page]          Page number (0 based). Default 0.
     * @return {String}         Cache key.
     */
    function getCommentsCacheKey(contextLevel, instanceId, component, itemId, area, page) {
        page = page || 0;
        area = area || "";
        return getCommentsPrefixCacheKey(contextLevel, instanceId) + ':' + component + ':' + itemId + ':' + area + ':' + page;
    }

    /**
     * Get cache key for get comments instance data WS calls.
     *
     * @param  {String} contextLevel    Contextlevel system, course, user...
     * @param  {Number} instanceId      The Instance id of item associated with the context level.
     * @param  {String} component       Component name.
     * @return {String}         Cache key.
     */
    function getCommentsPrefixCacheKey(contextLevel, instanceId) {
        return 'mmComments:comments:' + contextLevel + ':' + instanceId;
    }

    /**
     * Retrieve a list of comments.
     *
     * @module mm.core.comments
     * @ngdoc method
     * @name $mmComments#getComments
     * @param  {String} contextLevel    Contextlevel system, course, user...
     * @param  {Number} instanceId      The Instance id of item associated with the context level.
     * @param  {String} component       Component name.
     * @param  {Number} itemId          Associated id.
     * @param  {String} [area]          String comment area. Default empty.
     * @param  {Number} [page]          Page number (0 based). Default 0.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the comments.
     */
    self.getComments = function(contextLevel, instanceId, component, itemId, area, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                "contextlevel": contextLevel,
                "instanceid": parseInt(instanceId, 10),
                "component": component,
                "itemid": parseInt(itemId, 10)
            },
            preSets = {};

            if (area) {
                params.area = area;
            }

            if (page) {
                params.page = page;
            }

            preSets.cacheKey = getCommentsCacheKey(contextLevel, instanceId, component, itemId, area, page);

            return site.read('core_comment_get_comments', params, preSets).then(function(response) {
                if (response.comments) {
                    return response.comments;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates comments data.
     *
     * @module mm.core.comments
     * @ngdoc method
     * @name $mmComments#invalidateCommentsData
     * @param  {String} contextLevel    Contextlevel system, course, user...
     * @param  {Number} instanceId      The Instance id of item associated with the context level.
     * @param  {String} component       Component name.
     * @param  {Number} itemId          Associated id.
     * @param  {String} [area]          String comment area. Default empty.
     * @param  {Number} [page]          Page number (0 based). Default 0.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCommentsData = function(contextLevel, instanceId, component, itemId, area, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCommentsCacheKey(contextLevel, instanceId, component, itemId, area, page));
        });
    };

    /**
     * Invalidates all comments data for one instance.
     *
     * @module mm.core.comments
     * @ngdoc method
     * @name $mmComments#invalidateCommentsByInstance
     * @param  {String} contextLevel    Contextlevel system, course, user...
     * @param  {Number} instanceId      The Instance id of item associated with the context level.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCommentsByInstance = function(contextLevel, instanceId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getCommentsPrefixCacheKey(contextLevel, instanceId));
        });
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the comments WS are available.
     *
     * @module mm.core.comments
     * @ngdoc method
     * @name $mmComments#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('core_comment_get_comments');
        });
    };

    return self;
});
