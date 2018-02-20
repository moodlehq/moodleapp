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
 * Helper to gather some common functions for forum.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumHelper
 */
.factory('$mmaModForumHelper', function($mmaModForumOffline, $mmSite, $mmFileUploader, $mmFS, mmaModForumComponent, $mmUser, $q,
        $mmFileUploaderHelper) {

    var self = {};

    /**
     * Convert offline reply to online format in order to be compatible with them.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#convertOfflineReplyToOnline
     * @param  {Object} offlineReply Offline version of the reply.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the object converted to Online.
     */
    self.convertOfflineReplyToOnline = function(offlineReply, siteId) {
        var reply = {
                attachments: [],
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
            },
            promises = [];

        // Treat attachments if any.
        if (offlineReply.options && offlineReply.options.attachmentsid) {
            reply.attachments = offlineReply.options.attachmentsid.online || [];

            if (offlineReply.options.attachmentsid.offline) {
                promises.push(self.getReplyStoredFiles(offlineReply.forumid, reply.parent, siteId, reply.userid)
                            .then(function(files) {
                    reply.attachments = reply.attachments.concat(files);
                }));
            }
        }

        // Get user data.
        promises.push($mmUser.getProfile(offlineReply.userid, offlineReply.courseid, true).then(function(user) {
            reply.userfullname = user.fullname;
            reply.userpictureurl = user.profileimageurl;
        }).catch(function() {
            // Ignore errors.
        }));

        return $q.all(promises).then(function() {
            reply.attachment = reply.attachments.length > 0 ? 1 : 0;
            return reply;
        });
    };

    /**
     * Delete stored attachment files for a new discussion.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#deleteNewDiscussionStoredFiles
     * @param  {Number} forumId     Forum ID.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when deleted.
     */
    self.deleteNewDiscussionStoredFiles = function(forumId, timecreated, siteId) {
        return $mmaModForumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Delete stored attachment files for a reply.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#deleteReplyStoredFiles
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} postId   ID of the post being replied.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved when deleted.
     */
    self.deleteReplyStoredFiles = function(forumId, postId, siteId, userId) {
        return $mmaModForumOffline.getReplyFolder(forumId, postId, siteId, userId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Get a list of stored attachment files for a new discussion. See $mmaModForumHelper#storeNewDiscussionFiles.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#getNewDiscussionStoredFiles
     * @param  {Number} forumId     Forum ID.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the files.
     */
    self.getNewDiscussionStoredFiles = function(forumId, timecreated, siteId) {
        return $mmaModForumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath);
        });
    };

    /**
     * Get a list of stored attachment files for a reply. See $mmaModForumHelper#storeReplyFiles.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#getReplyStoredFiles
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} postId   ID of the post being replied.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with the files.
     */
    self.getReplyStoredFiles = function(forumId, postId, siteId, userId) {
        return $mmaModForumOffline.getReplyFolder(forumId, postId, siteId, userId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath);
        });
    };

    /**
     * Check if the data of a post/discussion has changed.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#hasPostDataChanged
     * @param  {Object}  post     Current data.
     * @param  {Object}  original Original data.
     * @return {Boolean}          True if data has changed, false otherwise.
     */
    self.hasPostDataChanged = function(post, original) {
        if (!original || typeof original.subject == 'undefined') {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        if (original.subject != post.subject || original.text != post.text) {
            return true;
        }

        return $mmFileUploaderHelper.areFileListDifferent(post.files, original.files);
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#storeNewDiscussionFiles
     * @param  {Number} forumId     Forum ID.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {Object[]} files     List of files.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if success, rejected otherwise.
     */
    self.storeNewDiscussionFiles = function(forumId, timecreated, files, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get the folder where to store the files.
        return $mmaModForumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#storeReplyFiles
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} postId   ID of the post being replied.
     * @param  {Object[]} files  List of files.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved if success, rejected otherwise.
     */
    self.storeReplyFiles = function(forumId, postId, files, siteId, userId) {
        // Get the folder where to store the files.
        return $mmaModForumOffline.getReplyFolder(forumId, postId, siteId, userId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Upload or store some files for a new discussion, depending if the user is offline or not.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#uploadOrStoreNewDiscussionFiles
     * @param  {Number} forumId     Forum ID.
     * @param  {Number} timecreated The time the discussion was created.
     * @param  {Object[]} files     List of files.
     * @param  {Boolean} offline    True if files sould be stored for offline, false to upload them.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if success.
     */
    self.uploadOrStoreNewDiscussionFiles = function(forumId, timecreated, files, offline, siteId) {
        if (offline) {
            return self.storeNewDiscussionFiles(forumId, timecreated, files, siteId);
        } else {
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModForumComponent, forumId, siteId);
        }
    };

    /**
     * Upload or store some files for a reply, depending if the user is offline or not.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#uploadOrStoreReplyFiles
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} postId   ID of the post being replied.
     * @param  {Object[]} files  List of files.
     * @param  {Boolean} offline True if files sould be stored for offline, false to upload them.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved if success.
     */
    self.uploadOrStoreReplyFiles = function(forumId, postId, files, offline, siteId, userId) {
        if (offline) {
            return self.storeReplyFiles(forumId, postId, files, siteId, userId);
        } else {
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModForumComponent, forumId, siteId);
        }
    };

    return self;
});
