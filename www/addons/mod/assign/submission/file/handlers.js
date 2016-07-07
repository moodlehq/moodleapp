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
 * Handler for file submission plugin.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignSubmissionFileHandler
 */
.factory('$mmaModAssignSubmissionFileHandler', function($mmaModAssignSubmissionFileSession, $mmaModAssign, $mmFileUploader,
            $mmFilepool, $mmFS, $mmSite, $q, mmaModAssignComponent) {

    var self = {};

    /**
     * Clear some temporary data because a submission was cancelled.
     *
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to clear the data for.
     * @param  {Object} plugin     Plugin to clear the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Void}
     */
    self.clearTmpData = function(assign, submission, plugin, inputData) {
        var files = $mmaModAssignSubmissionFileSession.getFiles(assign.id);

        // Clear the files in session for this assign.
        $mmaModAssignSubmissionFileSession.clearFiles(assign.id);

        // Now delete the local files from the tmp folder.
        files.forEach(function(file) {
            if (file.remove) {
                file.remove();
            }
        });
    };

    /**
     * Whether or not the rule is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Whether or not the plugin is enabled for editing in the site.
     * This should return true if the plugin has no submission component (allow_submissions=false),
     * otherwise the user won't be able to edit submissions at all.
     *
     * @return {Boolean}
     */
    self.isEnabledForEdit = function() {
        return true;
    };

    /**
     * Get the name of the directive to render this plugin.
     *
     * @param  {Object} plugin Plugin to get the directive for.
     * @param  {Boolean} edit  True if editing a submission, false if read only.
     * @return {String} Directive name.
     */
    self.getDirectiveName = function(plugin, edit) {
        return 'mma-mod-assign-submission-file';
    };

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasDataChanged = function(assign, submission, plugin, inputData) {
        var currentFiles = $mmaModAssignSubmissionFileSession.getFiles(assign.id),
            initialFiles = $mmaModAssign.getSubmissionPluginAttachments(plugin);

        if (currentFiles.length != initialFiles.length) {
            return true;
        }

        // Search if there is any local file added.
        for (var i = 0; i < currentFiles.length; i++) {
            var file = currentFiles[i];
            if (!file.filename && typeof file.name != 'undefined') {
                // There's a local file added, list has changed.
                return true;
            }
        }

        // No local files and list length is the same, this means the list hasn't changed.
        return false;
    };

    /**
     * Should prepare and add to pluginData the data to send to server based in the input data.
     *
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @param  {Object} pluginData Object where to add the plugin data.
     * @return {Void}
     */
    self.prepareSubmissionData = function(assign, submission, plugin, inputData, pluginData) {
        var siteId = $mmSite.getId();

        if (self.hasDataChanged(assign, submission, plugin, inputData)) {
            // Data has changed, we need to upload new files and re-upload all the existing files.
            var currentFiles = $mmaModAssignSubmissionFileSession.getFiles(assign.id);

            if (!currentFiles.length) {
                // There are no attached files. Use a fake draft id and stop.
                pluginData.files_filemanager = 1;
                return;
            }

            // Upload only the first file first to get a draft id.
            return uploadFile(assign.id, currentFiles[0]).then(function(itemId) {
                var promises = [];

                angular.forEach(currentFiles, function(file, index) {
                    if (index === 0) {
                        // First file has already been uploaded.
                        return;
                    }

                    promises.push(uploadFile(assign.id, file, itemId, siteId));
                });

                return $q.all(promises).then(function() {
                    pluginData.files_filemanager = itemId;
                });
            });

        }
    };

    /**
     * Upload a file to a draft area. If the file is an online file it will be downloaded and then re-uploaded.
     *
     * @param  {Number} assignId Assignment ID.
     * @param  {Object} file     Online file or local FileEntry.
     * @param  {Number} [itemId] Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the itemId.
     */
    function uploadFile(assignId, file, itemId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promise,
            fileName;

        if (file.filename) {
            // It's an online file. We need to download it and re-upload it.
            fileName = file.filename;
            promise = $mmFilepool.downloadUrl(siteId, file.fileurl, false, mmaModAssignComponent, assignId).then(function(path) {
                return $mmFS.getExternalFile(path);
            });
        } else {
            // Local file, we already have the file entry.
            fileName = file.name;
            promise = $q.when(file);
        }

        return promise.then(function(fileEntry) {
            // Now upload the file.
            return $mmFileUploader.uploadGenericFile(fileEntry.toURL(), fileName, fileEntry.type, true, itemId, siteId)
                    .then(function(result) {
                return result.itemid;
            });
        });
    }

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModAssignSubmissionDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the quiz addon will be packaged in custom apps.
    var $mmaModAssignSubmissionDelegate = $mmAddonManager.get('$mmaModAssignSubmissionDelegate');
    if ($mmaModAssignSubmissionDelegate) {
        $mmaModAssignSubmissionDelegate.registerHandler('mmaModAssignSubmissionFile', 'file',
                                '$mmaModAssignSubmissionFileHandler');
    }
});
