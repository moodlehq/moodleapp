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

angular.module('mm.addons.mod_workshop')

/**
 * Helper to gather some common functions for workshop.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopHelper
 */
.factory('$mmaModWorkshopHelper', function($mmaModWorkshop, $mmSite, $mmFileUploader, mmaModWorkshopComponent, $mmFS,
        $mmaModWorkshopOffline) {

    var self = {},
        examples = {
            EXAMPLES_VOLUNTARY: 0,
            EXAMPLES_BEFORE_SUBMISSION: 1,
            EXAMPLES_BEFORE_ASSESSMENT: 2
        };

    /**
     * Get a task by code.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getTask
     * @param  {Array}  tasks     Array of tasks.
     * @param  {String} taskCode  Unique task code.
     * @return {Object}           Task requested
     */
    self.getTask = function(tasks, taskCode) {
        for (var x in tasks) {
            if (tasks[x].code == taskCode) {
                return tasks[x];
            }
        }
        return false;
    };

    /**
     * Check is task code is done.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#isTaskDone
     * @param  {Array}  tasks     Array of tasks.
     * @param  {String} taskCode  Unique task code.
     * @return {Boolean}          True if task is completed.
     */
    self.isTaskDone = function(tasks, taskCode) {
        var task = self.getTask(tasks, taskCode);

        if (task) {
            return task.completed;
        }

        // Task not found, assume true.
        return true;
    };

    /**
     * Return if a user can submit a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#canSubmit
     * @param  {Object} workshop  Workshop info.
     * @param  {Object} access    Access information.
     * @param  {Array}  tasks     Array of tasks.
     * @return {Boolean}          True if the user can submit the workshop.
     */
    self.canSubmit = function(workshop, access, tasks) {
        var examplesMust = workshop.useexamples && workshop.examplesmode == examples.EXAMPLES_BEFORE_SUBMISSION,
            examplesDone = access.canmanageexamples || workshop.examplesmode == examples.EXAMPLES_VOLUNTARY ||
                self.isTaskDone(tasks, 'examples');

        return access.cansubmit && (!examplesMust || examplesDone);
    };

    /**
     * Return a particular user submission from the submission list.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getUserSubmission
     * @param  {Number} workshopId  Workshop ID.
     * @param  {Number} [userId]    User ID. If not defined current user Id.
     * @return {Promise}            Resolved with the submission.
     */
    self.getUserSubmission = function(workshopId, userId) {
        return $mmaModWorkshop.getSubmissions(workshopId).then(function(submissions) {
            userId = userId || $mmSite.getUserId();

            for (var x in submissions) {
                if (submissions[x].authorid == userId) {
                    return submissions[x];
                }
            }
            return false;
        });
    };

    /**
     * Return a particular submission. It will use prefetched data if fetch fails.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getSubmissionById
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} submissionId Submission ID.
     * @return {Promise}             Resolved with the submission.
     */
    self.getSubmissionById = function(workshopId, submissionId) {
        return $mmaModWorkshop.getSubmission(workshopId, submissionId).catch(function() {
            return $mmaModWorkshop.getSubmissions(workshopId).then(function(submissions) {
                for (var x in submissions) {
                    if (submissions[x].id == submissionId) {
                        return submissions[x];
                    }
                }
                return false;
            });
        });
    };

    /**
     * Delete stored attachment files for a submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#deleteSubmissionStoredFiles
     * @param  {Number}  workshopId    Workshop ID.
     * @param  {Number}  submissionId  If not editing, it will refer to timecreated.
     * @param  {Boolean} editing       If the submission is being edited or added otherwise.
     * @param  {String}  [siteId]      Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved when deleted.
     */
    self.deleteSubmissionStoredFiles = function(workshopId, submissionId, editing, siteId) {
        return $mmaModWorkshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#storeSubmissionFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId If not editing, it will refer to timecreated.
     * @param  {Boolean}  editing      If the submission is being edited or added otherwise.
     * @param  {Object[]} files        List of files.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved if success, rejected otherwise.
     */
    self.storeSubmissionFiles = function(workshopId, submissionId, editing, files, siteId) {
        // Get the folder where to store the files.
        return $mmaModWorkshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Upload or store some files for a submission, depending if the user is offline or not.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#uploadOrStoreSubmissionFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId If not editing, it will refer to timecreated.
     * @param  {Object[]} files        List of files.
     * @param  {Boolean}  editing      If the submission is being edited or added otherwise.
     * @param  {Boolean}  offline      True if files sould be stored for offline, false to upload them.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved if success.
     */
    self.uploadOrStoreSubmissionFiles = function(workshopId, submissionId, files, editing, offline, siteId) {
        if (offline) {
            return self.storeSubmissionFiles(workshopId, submissionId, editing, files, siteId);
        } else {
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModWorkshopComponent, workshopId, siteId);
        }
    };

    /**
     * Get a list of stored attachment files for a submission. See $mmaModWorkshopHelper#storeFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getStoredFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId If not editing, it will refer to timecreated.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the files.
     */
    self.getStoredFiles = function(workshopId, submissionId, editing, siteId) {
        return $mmaModWorkshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath).catch(function() {
                // Ignore not found files.
                return [];
            });
        });
    };

    /**
     * Returns the action of a given submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#filterSubmissionActions
     * @param  {Array}    actions      Offline actions to be applied to the given submission.
     * @param  {Number}   submissionId ID of the submission to filter by or false.
     * @return {Promise}               Promise resolved with the files.
     */
    self.filterSubmissionActions = function(actions, submissionId) {
        return actions.filter(function(action) {
            if (submissionId) {
                return action.submissionid == submissionId;
            } else {
                return action.submissionid < 0;
            }
        });
    };

    /**
     * Applies offline data to submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#applyOfflineData
     * @param  {Object}   submission   Submission object to be modified.
     * @param  {Array}    actions      Offline actions to be applied to the given submission.
     * @return {Promise}               Promise resolved with the files.
     */
    self.applyOfflineData = function(submission, actions) {
        if (actions.length && !submission) {
            submission = {};
        }
        angular.forEach(actions, function(action) {
            switch (action.action) {
                case 'add':
                    submission.id = action.submissionid;
                case 'update':
                    submission.title = action.title;
                    submission.content = action.content;
                    submission.title = action.title;
                    submission.courseid = action.courseid;
                    submission.submissionmodified = parseInt(action.timemodified / 1000, 10);
                    submission.offline = true;
                    break;
                case 'delete':
                    submission.deleted = true;
                    submission.submissionmodified = parseInt(action.timemodified / 1000, 10);
                    break;
            }
        });
        return submission;
    };

    return self;
});
