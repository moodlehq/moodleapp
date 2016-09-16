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

.constant('mmaModForumOfflineDiscussionsStore', 'mma_mod_forum_offline_discussions')
.constant('mmaModForumOfflineRepliesStore', 'mma_mod_forum_offline_replies')

.config(function($mmSitesFactoryProvider, mmaModForumOfflineDiscussionsStore, mmaModForumOfflineRepliesStore) {
    var stores = [
        {
            name: mmaModForumOfflineDiscussionsStore,
            keyPath: ['forumid', 'userid', 'timecreated'],
            indexes: [
                {
                    name: 'forumid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'timecreated'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'forumAndUser',
                    generator: function(obj) {
                        return [obj.forumid, obj.userid];
                    }
                }
            ]
        },
        {
            name: mmaModForumOfflineRepliesStore,
            keyPath: ['postid', 'userid'],
            indexes: [
                {
                    name: 'postid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'timecreated'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'discussionAndUser',
                    generator: function(obj) {
                        return [obj.discussionid, obj.userid];
                    }
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'forumAndUser',
                    generator: function(obj) {
                        return [obj.forumid, obj.userid];
                    }
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Forum offline service.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumOffline
 */
.factory('$mmaModForumOffline', function($log, mmaModForumOfflineDiscussionsStore, $mmSitesManager, mmaModForumOfflineRepliesStore,
        $mmSite, $mmUser) {

    $log = $log.getInstance('$mmaModForumOffline');

    var self = {};

    /**
     * Delete forum new discussions.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#deleteNewDiscussion
     * @param  {Number} forumId     Forum ID to remove.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User the discussion belongs to. If not defined, current user in site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.deleteNewDiscussion = function(forumId, timecreated, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModForumOfflineDiscussionsStore, [forumId, userId, timecreated]);
        });
    };

    /**
     * Get a forum offline discussion.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getNewDiscussion
     * @param  {Number} forumId     Forum ID to get.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User the discussion belongs to. If not defined, current user in site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.getNewDiscussion = function(forumId, timecreated, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().get(mmaModForumOfflineDiscussionsStore, [forumId, userId, timecreated]);
        });
    };

    /**
     * Get all offline new discussions .
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getAllNewDiscussions
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with discussions.
     */
    self.getAllNewDiscussions = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModForumOfflineDiscussionsStore);
        });
    };

    /**
     * Check if there are offline new discussions to send.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#hasNewDiscussions
     * @param  {Number} forumId   Forum ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User the discussions belong to. If not defined, current user in site.
     * @return {Promise}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasNewDiscussions = function(forumId, siteId, userId) {
        return self.getNewDiscussions(forumId, siteId, userId).then(function(discussions) {
            return !!discussions.length;
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };

    /**
     * Get new discussions to be synced.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getNewDiscussions
     * @param  {Number} forumId  Forum ID to get.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the discussions belong to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with the object to be synced.
     */
    self.getNewDiscussions = function(forumId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModForumOfflineDiscussionsStore, 'forumAndUser', [forumId, userId]);
        });
    };

    /**
     * Offline version for adding a new discussion to a forum.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#addNewDiscussion
     * @param {Number}  forumId   Forum ID.
     * @param {String}  name      Forum name.
     * @param {Number}  courseId  Course ID the forum belongs to.
     * @param {String}  subject   New discussion's subject.
     * @param {String}  message   New discussion's message.
     * @param {String}  subscribe True if should subscribe to the discussion, false otherwise.
     * @param {String}  [groupId] Group this discussion belongs to.
     * @param {String}  [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User the discussion belong to. If not defined, current user in site.
     * @return {Promise}          Promise resolved when new discussion is successfully saved.
     */
    self.addNewDiscussion = function(forumId, name, courseId, subject, message, subscribe, groupId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var db = site.getDb(),
                entry = {
                    forumid: forumId,
                    name: name,
                    courseid: courseId,
                    subject: subject,
                    message: message,
                    subscribe: subscribe,
                    groupid: groupId || -1,
                    userid: userId,
                    timecreated: new Date().getTime()
                };
            return db.insert(mmaModForumOfflineDiscussionsStore, entry);
        });
    };

    /**
     * Delete forum offline replies.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#deleteReply
     * @param  {Number} postId    ID of the post being replied.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User the reply belongs to. If not defined, current user in site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.deleteReply = function(postId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModForumOfflineRepliesStore, [postId, userId]);
        });
    };

    /**
     * Get all offline replies.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getAllReplies
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with replies.
     */
    self.getAllReplies = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModForumOfflineRepliesStore);
        });
    };

    /**
     * Check if there is an offline reply for a forum to be synced.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#hasForumReplies
     * @param  {Number} forumId         ID of the forum being replied.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the replies belong to. If not defined, current user in site.
     * @return {Promise}                Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasForumReplies = function(forumId, siteId, userId) {
        return self.getForumReplies(forumId, siteId, userId).then(function(replies) {
            return !!replies.length;
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };

    /**
     * Get the replies of a forum to be synced.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getForumReplies
     * @param  {Number} forumId         ID of the forum being replied.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the replies belong to. If not defined, current user in site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getForumReplies = function(forumId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModForumOfflineRepliesStore, 'forumAndUser', [forumId, userId]);
        });
    };

    /**
     * Check if there is an offline reply to be synced.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#hasDiscussionReplies
     * @param  {Number} discussionId    ID of the discussion the user is replying to.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the replies belong to. If not defined, current user in site.
     * @return {Promise}                Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasDiscussionReplies = function(discussionId, siteId, userId) {
        return self.getDiscussionReplies(discussionId, siteId, userId).then(function(replies) {
            return !!replies.length;
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };

    /**
     * Get the replies of a discussion to be synced.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#getDiscussionReplies
     * @param  {Number} discussionId    ID of the discussion the user is replying to.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the replies belong to. If not defined, current user in site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getDiscussionReplies = function(discussionId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModForumOfflineRepliesStore, 'discussionAndUser', [discussionId, userId]);
        });
    };

    /**
     * Convert offline reply to online format in order to be compatible with them.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#convertOfflineReplyToOnline
     * @param  {Object} offlineReply    Offline version of the reply.
     * @return {Promise}                Promise resolved with the object converted to Online.
     */
    self.convertOfflineReplyToOnline = function(offlineReply) {
        var reply = {
            attachment: "",
            canreply: false,
            children: [],
            created: offlineReply.timecreated,
            discussion: offlineReply.discussionid,
            id: false,
            mailed: 0,
            mailnow: 0,
            message: offlineReply.message,
            messageformat: 1,
            messagetrust: 0,
            modified: false,
            parent: offlineReply.postid,
            postread: false,
            subject: offlineReply.subject,
            totalscore: 0,
            userid: offlineReply.userid
        };

        return $mmUser.getProfile(offlineReply.userid, offlineReply.courseid, true).then(function(user) {
            reply.userfullname = user.fullname;
            reply.userpictureurl = user.profileimageurl;
        }).catch(function() {
            // Ignore errors.
        }).then(function() {
            return reply;
        });
    };




    /**
     * Offline version for replying to a certain post.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumOffline#replyPost
     * @param {Number}  postId          ID of the post being replied.
     * @param {Number}  discussionId    ID of the discussion the user is replying to.
     * @param {Number}  forumId         ID of the forum the user is replying to.
     * @param {String}  name            Forum name.
     * @param {Number}  courseId        Course ID the forum belongs to.
     * @param {String}  subject         New post's subject.
     * @param {String}  message         New post's message.
     * @param {String}  [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the post belong to. If not defined, current user in site.
     * @return {Promise}                Promise resolved when the post is created.
     */
    self.replyPost = function(postId, discussionId, forumId, name, courseId, subject, message, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var db = site.getDb(),
                discussion = {
                    postid: postId,
                    discussionid: discussionId,
                    forumid: forumId,
                    name: name,
                    courseid: courseId,
                    subject: subject,
                    message: message,
                    userid: userId,
                    timecreated: new Date().getTime()
                };
            return db.insert(mmaModForumOfflineRepliesStore, discussion);
        });
    };

    return self;
});
