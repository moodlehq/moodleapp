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
 * Helper to gather some common functions for assign.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignHelper
 */
.factory('$mmaModAssignHelper', function($mmUtil, $mmaModAssignSubmissionDelegate, $q, $mmSite, $mmFS, $mmaModAssign, $mmGroups,
            $mmFileUploader, mmaModAssignComponent, $mmaModAssignOffline, $mmaModAssignFeedbackDelegate,
            mmaModAssignSubmissionStatusNew, mmaModAssignSubmissionStatusReopened) {

    var self = {};

    /**
     * Check if a submission can be edited in offline.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#canEditSubmissionOffline
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission.
     * @return {Boolean}           True if can edit offline, false otherwise.
     */
    self.canEditSubmissionOffline = function(assign, submission) {
        if (!submission) {
            return false;
        }

        if (submission.status == mmaModAssignSubmissionStatusNew || submission.status == mmaModAssignSubmissionStatusReopened) {
            // It's a new submission, allow creating it in offline.
            return true;
        }

        for (var i = 0; i < submission.plugins.length; i++) {
            var plugin = submission.plugins[i];
            if (!$mmaModAssignSubmissionDelegate.canPluginEditOffline(assign, submission, plugin)) {
                return false;
            }
        }

        return true;
    };

    /**
     * Clear plugins temporary data because a submission was cancelled.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#clearSubmissionPluginTmpData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to clear the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Void}
     */
    self.clearSubmissionPluginTmpData = function(assign, submission, inputData) {
        angular.forEach(submission.plugins, function(plugin) {
            $mmaModAssignSubmissionDelegate.clearTmpData(assign, submission, plugin, inputData);
        });
    };

    /**
     * Copy the data from last submitted attempt to the current submission.
     * Since we don't have any WS for that we'll have to re-submit everything manually.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#copyPreviousAttempt
     * @param  {Object} assign             Assignment.
     * @param  {Object} previousSubmission Submission to copy.
     * @return {Promise}                   Promise resolved when done.
     */
    self.copyPreviousAttempt = function(assign, previousSubmission) {
        var pluginData = {},
            promises = [],
            errorMessage;

        angular.forEach(previousSubmission.plugins, function(plugin) {
            promises.push($mmaModAssignSubmissionDelegate.copyPluginSubmissionData(assign, plugin, pluginData).catch(function(err) {
                errorMessage = err;
                return $q.reject();
            }));
        });

        return $q.all(promises).then(function() {
            // We got the plugin data. Now we need to submit it.
            if (Object.keys(pluginData).length) {
                // There's something to save.
                return $mmaModAssign.saveSubmissionOnline(assign.id, pluginData);
            }
        }).catch(function() {
            return $q.reject(errorMessage);
        });
    };

    /**
     * Delete stored submission files for a plugin. See $mmaModAssignHelper#storeSubmissionFiles.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#deleteStoredSubmissionFiles
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the files.
     */
    self.deleteStoredSubmissionFiles = function(assignId, pluginName, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModAssignOffline.getSubmissionPluginFolder(assignId, pluginName, userId, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Retrieve the answers entered in a form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getAnswersFromForm
     * @param  {Object} form Form (DOM element).
     * @return {Object}      Object with the answers.
     */
    self.getAnswersFromForm = function(form) {
        if (!form || !form.elements) {
            return {};
        }

        var answers = {};

        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                answers[name] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    answers[name] = element.value;
                }
            } else {
                answers[name] = element.value;
            }
        });

        return answers;
    };

    /**
     * Get a list of stored submission files. See $mmaModAssignHelper#storeSubmissionFiles.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getStoredSubmissionFiles
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the files.
     */
    self.getStoredSubmissionFiles = function(assignId, pluginName, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModAssignOffline.getSubmissionPluginFolder(assignId, pluginName, userId, siteId).then(function(folderPath) {
            return $mmFS.getDirectoryContents(folderPath);
        });
    };

    /**
     * Get the size that will be uploaded to perform an attempt copy.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getSubmissionSizeForCopy
     * @param  {Object} assign             Assignment.
     * @param  {Object} previousSubmission Submission to copy.
     * @return {Promise}                   Promise resolved with the size.
     */
    self.getSubmissionSizeForCopy = function(assign, previousSubmission) {
        var totalSize = 0,
            promises = [];

        angular.forEach(previousSubmission.plugins, function(plugin) {
            promises.push($q.when($mmaModAssignSubmissionDelegate.getPluginSizeForCopy(assign, plugin)).then(function(size) {
                totalSize += size;
            }));
        });

        return $q.all(promises).then(function() {
            return totalSize;
        });
    };

    /**
     * Get the size that will be uploaded to save a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getSubmissionSizeForEdit
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with the size.
     */
    self.getSubmissionSizeForEdit = function(assign, submission, inputData) {
        var totalSize = 0,
            promises = [];

        angular.forEach(submission.plugins, function(plugin) {
            var promise = $q.when($mmaModAssignSubmissionDelegate.getPluginSizeForEdit(assign, submission, plugin, inputData));
            promises.push(promise.then(function(size) {
                totalSize += size;
            }));
        });

        return $q.all(promises).then(function() {
            return totalSize;
        });
    };

    /**
     * Check if the submission data has changed for a certain submission and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#hasSubmissionDataChanged
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasSubmissionDataChanged = function(assign, submission, inputData) {
        var hasChanged = false,
            promises = [];

        angular.forEach(submission.plugins, function(plugin) {
            promises.push($mmaModAssignSubmissionDelegate.hasPluginDataChanged(assign, submission, plugin, inputData)
                    .then(function(changed) {
                if (changed) {
                    hasChanged = true;
                }
            }).catch(function() {
                // Ignore errors.
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return hasChanged;
        });
    };

    /**
     * Check if the feedback has draft data for a certain submission and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#hasFeedbackDraftData
     * @param  {Number} assignId        Assignment Id.
     * @param  {Number} userId          User Id.
     * @param  {Object} feedback        Feedback data.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasFeedbackDraftData = function(assignId, userId, feedback, siteId) {
        var hasDraft = false,
            promises = [];

        angular.forEach(feedback.plugins, function(plugin) {
            promises.push($mmaModAssignFeedbackDelegate.hasPluginDraftData(assignId, userId, plugin, siteId)
                    .then(function(draft) {
                if (draft) {
                    hasDraft = true;
                }
            }).catch(function() {
                // Ignore errors.
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return hasDraft;
        });
    };

    /**
     * Prepare and return the plugin data to send for a certain submission and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#prepareSubmissionPluginData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} inputData  Data entered in the submission form.
     * @param  {Boolean} offline   True to prepare the data for an offline submission, false otherwise.
     * @return {Promise}           Promise resolved with plugin data to send to server.
     */
    self.prepareSubmissionPluginData = function(assign, submission, inputData, offline) {
        var pluginData = {},
            promises = [],
            error;

        angular.forEach(submission.plugins, function(plugin) {
            promises.push($mmaModAssignSubmissionDelegate.preparePluginSubmissionData(
                    assign, submission, plugin, inputData, pluginData, offline).catch(function(message) {
                error = message;
                return $q.reject();
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return pluginData;
        }).catch(function() {
            return $q.reject(error);
        });
    };

    /**
     * Prepare and return the plugin data to send for a certain feedback and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#prepareFeedbackPluginData
     * @param  {Number} assignId        Assignment Id.
     * @param  {Number} userId          User Id.
     * @param  {Object} feedback        Feedback data.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with plugin data to send to server.
     */
    self.prepareFeedbackPluginData = function(assignId, userId, feedback, siteId) {
        var pluginData = {},
            promises = [],
            error;

        angular.forEach(feedback.plugins, function(plugin) {
            promises.push($mmaModAssignFeedbackDelegate.preparePluginFeedbackData(assignId, userId, plugin, pluginData, siteId)
                    .catch(function(message) {
                error = message;
                return $q.reject();
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return pluginData;
        }).catch(function() {
            return $q.reject(error);
        });
    };

    /**
     * Delete all drafts of the feedback plugin data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#discardFeedbackPluginData
     * @param  {Number} assignId        Assignment Id.
     * @param  {Number} userId          User Id.
     * @param  {Object} feedback        Feedback data.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with plugin data to send to server.
     */
    self.discardFeedbackPluginData = function(assignId, userId, feedback, siteId) {
        var promises = [];

        angular.forEach(feedback.plugins, function(plugin) {
            promises.push($mmaModAssignFeedbackDelegate.discardPluginFeedbackData(assignId, userId, plugin, siteId));
        });

        return $q.all(promises);
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#storeSubmissionFiles
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Object[]} files    List of files.
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if success, rejected otherwise.
     */
    self.storeSubmissionFiles = function(assignId, pluginName, files, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get the folder where to store the files.
        return $mmaModAssignOffline.getSubmissionPluginFolder(assignId, pluginName, userId, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Upload a file to a draft area. If the file is an online file it will be downloaded and then re-uploaded.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#uploadFile
     * @param  {Number} assignId Assignment ID.
     * @param  {Object} file     Online file or local FileEntry.
     * @param  {Number} [itemId] Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the itemId.
     */
    self.uploadFile = function(assignId, file, itemId, siteId) {
        return $mmFileUploader.uploadOrReuploadFile(file, itemId, mmaModAssignComponent, assignId, siteId);
    };

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     * Online files will be downloaded and then re-uploaded.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#uploadFiles
     * @param  {Number} assignId Assignment ID.
     * @param  {Object[]} files  List of files.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the itemId.
     */
    self.uploadFiles = function(assignId, files, siteId) {
        return $mmFileUploader.uploadOrReuploadFiles(files, mmaModAssignComponent, assignId, siteId);
    };

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#uploadOrStoreFiles
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Object[]} files    List of files.
     * @param  {Boolean} offline   True if files sould be stored for offline, false to upload them.
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if success.
     */
    self.uploadOrStoreFiles = function(assignId, pluginName, files, offline, userId, siteId) {
        if (offline) {
            return self.storeSubmissionFiles(assignId, pluginName, files, userId, siteId);
        } else {
            return self.uploadFiles(assignId, files, siteId);
        }
    };

    /**
     * Get enabled subplugins.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getPluginsEnabled
     * @param  {Object} assign  Assignment object including all config.
     * @param  {String} subtype  Subtype name (assignsubmission or assignfeedback)
     * @return {Object}          Object containing all enabled plugins for the assign.
     */
    self.getPluginsEnabled = function(assign, subtype) {
        var enabled = [];
        angular.forEach(assign.configs, function(config) {
            if (config.subtype == subtype && config.name == 'enabled' && parseInt(config.value, 10) === 1) {
                // Format the plugin objects.
                enabled.push({
                    type: config.plugin
                });
            }
        });
        return enabled;
    };

    /**
     * Get Plugin config from assignment config.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getPluginConfig
     * @param  {Object} assign  Assignment object including all config.
     * @param  {String} subtype Subtype name (assignsubmission or assignfeedback)
     * @param  {String} type    Name of the subplugin.
     * @return {Object}         Object containing all configurations of the subplugin selected.
     */
    self.getPluginConfig = function(assign, subtype, type) {
        var configs = {};
        angular.forEach(assign.configs, function(config) {
            if (config.subtype == subtype && config.plugin == type) {
                configs[config.name] = config.value;
            }
        });
        return configs;
    };

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getParticipants
     * @param {Object} assign       Assignment object
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the list of participants and summary of submissions.
     */
    self.getParticipants = function(assign, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModAssign.listParticipants(assign.id, undefined, siteId).then(function(participants) {
            if (participants && participants.length > 0) {
                return participants;
            }

            // If no participants returned, get participants by groups.
            return $mmGroups.getActivityAllowedGroupsIfEnabled(assign.cmid, undefined, siteId).then(function(userGroups) {
                var promises = [],
                    particips = {};

                angular.forEach(userGroups, function(userGroup) {
                    promises.push($mmaModAssign.listParticipants(assign.id, userGroup.id, siteId).then(function(parts) {
                        // Do not get repeated users.
                        angular.forEach(parts, function(p) {
                            particips[p.id] = p;
                        });
                    }));
                });
                return $q.all(promises).then(function() {
                    return $mmUtil.objectToArray(particips);
                });
            });
        });
    };

    return self;
});
