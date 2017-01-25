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
.factory('$mmaModForumHelper', function($mmaModForumOffline, $mmSite, $mmFileUploader, $mmFS, mmaModForumComponent) {

    var self = {};

    /**
     * Clear temporary attachments because a new discussion or post was cancelled.
     * Attachments already saved in an offline discussion or post will NOT be deleted.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHelper#clearTmpFiles
     * @param  {Object[]} files List of current files.
     * @return {Void}
     */
    self.clearTmpFiles = function(files) {
        // Delete the local files from the tmp folder.
        files.forEach(function(file) {
            if (!file.offline && file.remove) {
                file.remove();
            }
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
        siteId = siteId || $mmSite.getId();

        return $mmaModForumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then(function(folderPath) {
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
        siteId = siteId || $mmSite.getId();

        return $mmaModForumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then(function(folderPath) {
            return $mmFS.getDirectoryContents(folderPath).then(function(files) {
                // Mark the files as pending offline.
                angular.forEach(files, function(file) {
                    file.offline = true;
                    file.filename = file.name;
                });
                return files;
            });
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

        var postFiles = post.files || [],
            originalFiles = original.files || [];

        if (original.subject != post.subject || original.text != post.text || postFiles.length != originalFiles.length) {
            return true;
        }

        for (var i = 0; i < postFiles.length; i++) {
            if (postFiles[i] != originalFiles[i]) {
                return true;
            }
        }

        return false;
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
     * Upload or store some files, depending if the user is offline or not.
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

    return self;
});
