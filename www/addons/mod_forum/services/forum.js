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

angular.module('mm.addons.mod_forum')

/**
 * Forum service.
 *
 * @module mm.addons.mod_forum
 * @ngdoc controller
 * @name $mmaModForum
 */
.factory('$mmaModForum', function($q, $mmSite, $mmUtil, mmaModForumDiscPerPage) {
    var self = {};

    /**
     * Get cache key for forum data WS calls.
     *
     * @param {Number} cmid Course module ID.
     * @return {String}     Cache key.
     */
    function getForumDataCacheKey(cmid) {
        return 'mmaModForum:forum:' + cmid;
    }

    /**
     * Get cache key for forum discussions list WS calls.
     *
     * @param  {Number} forumid Forum ID.
     * @return {String}         Cache key.
     */
    function getDiscussionsListCacheKey(forumid) {
        return 'mmaModForum:discussions:' + forumid;
    }

    /**
     * Return whether or not the plugin is enabled. Plugin is enabled if the forum WS are available.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_forum_get_forums_by_courses') &&
                $mmSite.wsAvailable('mod_forum_get_forum_discussions_paginated') &&
                $mmSite.wsAvailable('mod_forum_get_forum_discussion_posts');
    };

    /**
     * Get a forum.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#getForum
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @return {Promise}        Promise resolved when the forum is retrieved.
     */
    self.getForum = function(courseid, cmid) {
        var params = {
                'courseids[0]': courseid
            },
            preSets = {
                cacheKey: getForumDataCacheKey(cmid)
            };

        return $mmSite.read('mod_forum_get_forums_by_courses', params, preSets).then(function(forums) {
            var currentForum;
            angular.forEach(forums, function(forum) {
                if (forum.cmid == cmid) {
                    currentForum = forum;
                }
            });
            return currentForum;
        });
    };

    /**
     * Get forum discussions.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#getDiscussions
     * @param {Number} forumid Forum ID.
     * @param {Number} page    Page.
     * @return {Promise}       Promise resolved with forum discussions.
     */
    self.getDiscussions = function(forumid, page) {
        page = page || 0;

        var params = {
                'forumid': forumid,
                'sortby':  'timemodified',
                'sortdirection':  'DESC',
                'page': page,
                'perpage': mmaModForumDiscPerPage
            },
            preSets = {
                cacheKey: getDiscussionsListCacheKey(forumid)
            };

        return $mmSite.read('mod_forum_get_forum_discussions_paginated', params, preSets).then(function(response) {
            if (response) {
                var canLoadMore = response.discussions.length >= mmaModForumDiscPerPage;
                return {discussions: response.discussions, canLoadMore: canLoadMore};
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Invalidates forum data and discussion list.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#invalidateDiscussionsList
     * @param {Number} cmid     Course module ID.
     * @param  {Number} forumid Forum ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateDiscussionsList = function(cmid, forumid) {
        return $mmSite.invalidateWsCacheForKey(getForumDataCacheKey(cmid)).then(function() {
            return $mmSite.invalidateWsCacheForKey(getDiscussionsListCacheKey(forumid));
        });
    };

    return self;
});
