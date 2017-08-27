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

.constant('mmaModAssignSubmissionFileName', 'submission_file')

/**
 * Handler for file submission plugin.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignSubmissionFileHandler
 */
.factory('$mmaModAssignSubmissionFileHandler', function($mmFileSession, mmaModAssignComponent, $mmaModAssign, $mmSite, $q,
            $mmaModAssignHelper, $mmWS, $mmFS, $mmFilepool, $mmUtil, $mmaModAssignOffline, mmaModAssignSubmissionFileName,
            $mmFileUploaderHelper) {

    var self = {};

    /**
     * Check if the plugin can be edited in offline for existing submissions.
     * In general, this should return false if the plugin uses Moodle filters. The reason is that the app only prefetches
     * filtered data, and the user should edit unfiltered data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#canEditOffline
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission.
     * @param  {Object} plugin     Plugin.
     * @return {Boolean}           Whether the plugin can be edited in offline for existing submissions.
     */
    self.canEditOffline = function(assign, submission, plugin) {
        // This plugin doesn't use Moodle filters, it can be edited in offline.
        return true;
    };

    /**
     * Clear some temporary data because a submission was cancelled.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#clearTmpData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to clear the data for.
     * @param  {Object} plugin     Plugin to clear the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Void}
     */
    self.clearTmpData = function(assign, submission, plugin, inputData) {
        var files = $mmFileSession.getFiles(mmaModAssignComponent, assign.id);

        // Clear the files in session for this assign.
        $mmFileSession.clearFiles(mmaModAssignComponent, assign.id);
        // Now delete the local files from the tmp folder.
        $mmFileUploaderHelper.clearTmpFiles(files);
    };

    /**
     * Function meant to copy a submission.
     * Should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#copySubmissionData
     * @param  {Object} assign     Assignment.
     * @param  {Object} plugin     Plugin data of the previous submission (the one to get the data from).
     * @param  {Object} pluginData Object where to add the plugin data.
     * @return {Promise}           Promise resolved when copied.
     */
    self.copySubmissionData = function(assign, plugin, pluginData) {
        // We need to re-upload all the existing files.
        var files = $mmaModAssign.getSubmissionPluginAttachments(plugin);

        return $mmaModAssignHelper.uploadFiles(assign.id, files).then(function(itemId) {
            pluginData.files_filemanager = itemId;
        });
    };

    /**
     * Delete offline data stored for a certain submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#deleteOfflineData
     * @param  {Object} assign      Assignment.
     * @param  {Object} submission  Submission affected.
     * @param  {Object} plugin      Plugin to delete the data for.
     * @param  {Object} offlineData Offline data stored for the submission.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when deleted.
     */
    self.deleteOfflineData = function(assign, submission, plugin, offlineData, siteId) {
        return $mmaModAssignHelper.deleteStoredSubmissionFiles(assign.id,
                mmaModAssignSubmissionFileName, submission.userid, siteId).catch(function() {
            // Ignore errors, maybe the folder doesn't exist.
        });
    };

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous attempt.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#getSizeForCopy
     * @param  {Object} assign Assignment.
     * @param  {Object} plugin Plugin data of the previous submission (the one to get the data from).
     * @return {Promise}       Promise resolved with the size.
     */
    self.getSizeForCopy = function(assign, plugin) {
        var files = $mmaModAssign.getSubmissionPluginAttachments(plugin),
            totalSize = 0,
            promises = [];

        angular.forEach(files, function(file) {
            promises.push($mmWS.getRemoteFileSize(file.fileurl).then(function(size) {
                if (size == -1) {
                    // Couldn't determine the size, reject.
                    return $q.reject();
                }
                totalSize += size;
            }));
        });

        return $q.all(promises).then(function() {
            return totalSize;
        });
    };

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#getSizeForEdit
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Number}            Size.
     */
    self.getSizeForEdit = function(assign, submission, plugin, inputData) {
        var siteId = $mmSite.getId();

        // Check if there's any change.
        if (self.hasDataChanged(assign, submission, plugin, inputData)) {
            var files = $mmFileSession.getFiles(mmaModAssignComponent, assign.id),
                totalSize = 0,
                promises = [];

            angular.forEach(files, function(file) {
                if (file.filename && !file.name) {
                    // It's a remote file. First check if we have the file downloaded since it's more reliable.
                    promises.push($mmFilepool.getFilePathByUrl(siteId, file.fileurl).then(function(path) {
                        return $mmFS.getFile(path).then(function(fileEntry) {
                            return $mmFS.getFileObjectFromFileEntry(fileEntry);
                        }).then(function(file) {
                            totalSize += file.size;
                        });
                    }).catch(function() {
                        // Error getting the file, maybe it's not downloaded. Get remote size.
                        return $mmWS.getRemoteFileSize(file.fileurl).then(function(size) {
                            if (size == -1) {
                                // Couldn't determine the size, reject.
                                return $q.reject();
                            }
                            totalSize += size;
                        });
                    }));
                } else if (file.name) {
                    // It's a local file, get its size.
                    promises.push($mmFS.getFileObjectFromFileEntry(file).then(function(file) {
                        totalSize += file.size;
                    }));
                }
            });

            return $q.all(promises).then(function() {
                return totalSize;
            });
        } else {
            // Nothing has changed, we won't upload any file.
            return 0;
        }
    };

    /**
     * Whether or not the plugin is enabled for the site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#isEnabled
     * @return {Boolean} Whether the plugin is enabled.
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Whether or not the plugin is enabled for editing in the site.
     * This should return true if the plugin has no submission component (allow_submissions=false),
     * otherwise the user won't be able to edit submissions at all.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#isEnabledForEdit
     * @return {Boolean} Whether the plugin is enabled for edit.
     */
    self.isEnabledForEdit = function() {
        return true;
    };

    /**
     * Get the name of the directive to render this plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#getDirectiveName
     * @param  {Object} plugin Plugin to get the directive for.
     * @param  {Boolean} edit  True if editing a submission, false if read only.
     * @return {String} Directive name.
     */
    self.getDirectiveName = function(plugin, edit) {
        return 'mma-mod-assign-submission-file';
    };

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#getPluginFiles
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when prefetch is done.
     */
    self.getPluginFiles = function(assign, submission, plugin, siteId) {
        return $mmaModAssign.getSubmissionPluginAttachments(plugin);
    };

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#hasDataChanged
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasDataChanged = function(assign, submission, plugin, inputData) {
        // Check if there's any offline data.
        return $mmaModAssignOffline.getSubmission(assign.id, submission.userid).catch(function() {
                // No offline data found.
        }).then(function(offlineData) {
            if (offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager) {
                // Has offline data, return the number of files.
                return offlineData.plugindata.files_filemanager.offline + offlineData.plugindata.files_filemanager.online.length;
            }
            // No offline data, return the number of online files.
            var pluginFiles = $mmaModAssign.getSubmissionPluginAttachments(plugin);
            return pluginFiles && pluginFiles.length;
        }).then(function(numFiles) {
            var currentFiles = $mmFileSession.getFiles(mmaModAssignComponent, assign.id);

            if (currentFiles.length != numFiles) {
                // Number of files has changed.
                return true;
            }

            // Search if there is any local file added.
            for (var i = 0; i < currentFiles.length; i++) {
                var file = currentFiles[i];
                if (!file.filename && typeof file.name != 'undefined' && !file.offline) {
                    // There's a local file added, list has changed.
                    return true;
                }
            }

            // No local files and list length is the same, this means the list hasn't changed.
            return false;
        });
    };

    /**
     * Should prepare and add to pluginData the data to send to server based in the input data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#prepareSubmissionData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission affected.
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @param  {Object} pluginData Object where to add the plugin data.
     * @param  {Boolean} offline   True to prepare the data for an offline submission, false otherwise.
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise|Void}
     */
    self.prepareSubmissionData = function(assign, submission, plugin, inputData, pluginData, offline, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        if (self.hasDataChanged(assign, submission, plugin, inputData)) {
            // Data has changed, we need to upload new files and re-upload all the existing files.
            var currentFiles = $mmFileSession.getFiles(mmaModAssignComponent, assign.id),
                error = $mmUtil.hasRepeatedFilenames(currentFiles);

            if (error) {
                return $q.reject(error);
            }

            return $mmaModAssignHelper.uploadOrStoreFiles(assign.id, mmaModAssignSubmissionFileName,
                        currentFiles, offline, userId, siteId).then(function(result) {
                pluginData.files_filemanager = result;
            });
        }
    };

    /**
     * Should prepare and add to pluginData the data to send to server to synchronize an offline submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionFileHandler#prepareSyncData
     * @param  {Object} assign      Assignment.
     * @param  {Object} submission  Submission affected.
     * @param  {Object} plugin      Plugin to get the data for.
     * @param  {Object} offlineData Offline data stored for the submission.
     * @param  {Object} pluginData  Object where to add the plugin data.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise|Void}
     */
    self.prepareSyncData = function(assign, submission, plugin, offlineData, pluginData, siteId) {
        var filesData = offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager;
        if (filesData) {
            // Has some data to sync.
            var files = filesData.online || [],
                promise;

            if (filesData.offline) {
                // Has offline files.
                promise = $mmaModAssignHelper.getStoredSubmissionFiles(assign.id,
                            mmaModAssignSubmissionFileName, submission.userid, siteId).then(function(result) {
                    files = files.concat(result);
                }).catch(function() {
                    // Folder not found, no files to add.
                });
            } else {
                promise = $q.when();
            }

            return promise.then(function() {
                return $mmaModAssignHelper.uploadFiles(assign.id, files, siteId).then(function(itemId) {
                    pluginData.files_filemanager = itemId;
                });
            });
        }
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModAssignSubmissionDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the assign addon will be packaged in custom apps.
    var $mmaModAssignSubmissionDelegate = $mmAddonManager.get('$mmaModAssignSubmissionDelegate');
    if ($mmaModAssignSubmissionDelegate) {
        $mmaModAssignSubmissionDelegate.registerHandler('mmaModAssignSubmissionFile', 'file',
                                '$mmaModAssignSubmissionFileHandler');
    }
});
