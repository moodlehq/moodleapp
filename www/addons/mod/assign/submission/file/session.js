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

angular.module('mm.addons.mod_assign')

/**
 * Helper to store some temporary data for submission file.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignSubmissionFileSession
 */
.factory('$mmaModAssignSubmissionFileSession', function($mmSite) {

    var self = {},
        files = {};

    /**
     * Add a file to the session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#addFile
     * @param  {Number} assignmentId Assignment ID.
     * @param  {Object} file         File to add.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.addFile = function(assignmentId, file, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!files[siteId]) {
            files[siteId] = {};
        }

        if (!files[siteId][assignmentId]) {
            files[siteId][assignmentId] = [];
        }

        files[siteId][assignmentId].push(file);
    };

    /**
     * Clear files stored in session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#clearFiles
     * @param  {Number} assignmentId Assignment ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.clearFiles = function(assignmentId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][assignmentId]) {
            files[siteId][assignmentId] = [];
        }
    };

    /**
     * Get files stored in session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#getFiles
     * @param  {Number} assignmentId Assignment ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Object[]}            Files in session.
     */
    self.getFiles = function(assignmentId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][assignmentId]) {
            return files[siteId][assignmentId];
        }
        return [];
    };

    /**
     * Remove a file stored in session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#removeFile
     * @param  {Number} assignmentId Assignment ID.
     * @param  {Object} file         File to remove. The instance should be exactly the same as the one stored in session.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.removeFile = function(assignmentId, file, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][assignmentId]) {
            var position = files[siteId][assignmentId].indexOf(file);
            if (position != -1) {
                files[siteId][assignmentId].splice(position, 1);
            }
        }
    };

    /**
     * Remove a file stored in session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#removeFileByIndex
     * @param  {Number} assignmentId Assignment ID.
     * @param  {Number} index        Position of the file to remove.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.removeFileByIndex = function(assignmentId, index, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][assignmentId] && index >= 0 && index < files[siteId][assignmentId].length) {
            files[siteId][assignmentId].splice(index, 1);
        }
    };

    /**
     * Set a group of files in the session.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileSession#setFiles
     * @param  {Number} assignmentId Assignment ID.
     * @param  {Object[]} newFiles   Files to set.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.setFiles = function(assignmentId, newFiles, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!files[siteId]) {
            files[siteId] = {};
        }

        files[siteId][assignmentId] = newFiles;
    };

    return self;
});
