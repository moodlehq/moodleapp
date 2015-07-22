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
.factory('$mmaModForum', function($q, $mmSite, $mmUtil, $mmUser, mmaModForumDiscPerPage) {
    var self = {};

    /**
     * Get cache key for forum data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getForumDataCacheKey(courseid) {
        return 'mmaModForum:forum:' + courseid;
    }

    /**
     * Get cache key for forum discussion posts WS calls.
     *
     * @param  {Number} discussionid Discussion ID.
     * @return {String}              Cache key.
     */
    function getDiscussionPostsCacheKey(discussionid) {
        return 'mmaModForum:discussion:' + discussionid;
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
     * Extract the starting post of a discussion from a list of posts. The post is removed from the array passed as a parameter.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#getStartingPost
     * @param  {Object[]} posts Posts to search.
     * @return {Object}         Starting post.
     */
    self.extractStartingPost = function(posts) {
        // Check the last post first, since they'll usually be ordered by create time.
        var lastPost = posts[posts.length - 1];
        if (lastPost.parent == 0) {
            posts.pop(); // Remove it from the array.
            return lastPost;
        }

        // Last post wasn't the starting one. Let's search all the posts until we find the first one.
        for (var i = 0; i < posts.length; i++) {
            if (posts[i].parent == 0) {
                array.splice(i, 1); // Remove it from the array.
                return posts[i];
            }
        }

        return undefined;
    };

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
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getForumDataCacheKey(courseid)
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
     * Get forum discussion posts.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#getDiscussionPosts
     * @param {Number} discussionid Discussion ID.
     * @return {Promise}            Promise resolved with forum discussions.
     */
    self.getDiscussionPosts = function(discussionid) {
        var params = {
                discussionid: discussionid
            },
            preSets = {
                cacheKey: getDiscussionPostsCacheKey(discussionid)
            };

        return $mmSite.read('mod_forum_get_forum_discussion_posts', params, preSets).then(function(response) {
            if (response) {
                storeUserData(response.posts);
                return response.posts;
            } else {
                return $q.reject();
            }
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
                forumid: forumid,
                sortby:  'timemodified',
                sortdirection:  'DESC',
                page: page,
                perpage: mmaModForumDiscPerPage
            },
            preSets = {
                cacheKey: getDiscussionsListCacheKey(forumid)
            };

        return $mmSite.read('mod_forum_get_forum_discussions_paginated', params, preSets).then(function(response) {
            if (response) {
                var canLoadMore = response.discussions.length >= mmaModForumDiscPerPage;
                storeUserData(response.discussions);
                return {discussions: response.discussions, canLoadMore: canLoadMore};
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Invalidates forum discussion posts.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#invalidateDiscussionPosts
     * @param {Number} discussionid Discussion ID.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateDiscussionPosts = function(discussionid) {
        return $mmSite.invalidateWsCacheForKey(getDiscussionPostsCacheKey(discussionid));
    };

    /**
     * Invalidates forum data and discussion list.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#invalidateDiscussionsList
     * @param {Number} courseid Course ID.
     * @param  {Number} forumid Forum ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateDiscussionsList = function(courseid, forumid) {
        return $mmSite.invalidateWsCacheForKey(getForumDataCacheKey(courseid)).then(function() {
            return $mmSite.invalidateWsCacheForKey(getDiscussionsListCacheKey(forumid));
        });
    };

    /**
     * Report a forum as being viewed.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForum#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                forumid: id
            };
            return $mmSite.write('mod_forum_view_forum', params);
        }
        return $q.reject();
    };

    /**
     * Store the users data from a discussions/posts list.
     *
     * @param {Object[]} list Array of posts or discussions.
     */
    function storeUserData(list) {
        var ids = [];
        angular.forEach(list, function(entry) {
            var id = parseInt(entry.userid);
            if (ids.indexOf(id) === -1) {
                ids.push(id);
                $mmUser.storeUser(id, entry.userfullname, entry.userpictureurl);
            }
            if (typeof entry.usermodified != 'undefined') {
                id = parseInt(entry.usermodified);
                if(ids.indexOf(id) === -1) {
                    ids.push(id);
                    $mmUser.storeUser(id, entry.usermodifiedfullname, entry.usermodifiedpictureurl);
                }
            }
        });
    }

    return self;
});
