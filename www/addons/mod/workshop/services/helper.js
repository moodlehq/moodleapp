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
.factory('$mmaModWorkshopHelper', function($mmaModWorkshop, $mmSite, $mmFileUploader, mmaModWorkshopComponent, $mmFS, $q, $mmUtil,
        $mmaModWorkshopOffline, $mmaModWorkshopAssessmentStrategyDelegate, $translate, $mmFileUploaderHelper) {

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

        return workshop.phase > $mmaModWorkshop.PHASE_SETUP && access.cansubmit && (!examplesMust || examplesDone);
    };

    /**
     * Return if a user can assess a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#canAssess
     * @param  {Object} workshop  Workshop info.
     * @param  {Object} access    Access information.
     * @return {Boolean}          True if the user can assess the workshop.
     */
    self.canAssess = function(workshop, access) {
        var examplesMust = workshop.useexamples && workshop.examplesmode == examples.EXAMPLES_BEFORE_ASSESSMENT,
            examplesDone = access.canmanageexamples;

        return !examplesMust || examplesDone;
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
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId Submission ID.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Resolved with the submission.
     */
    self.getSubmissionById = function(workshopId, submissionId, siteId) {
        return $mmaModWorkshop.getSubmission(workshopId, submissionId, siteId).catch(function() {
            return $mmaModWorkshop.getSubmissions(workshopId, undefined, undefined, undefined, undefined, siteId)
                    .then(function(submissions) {
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
     * Return a particular assesment. It will use prefetched data if fetch fails. It will add assessment form data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getReviewerAssessmentById
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   assessmentId Assessment ID.
     * @param   {Number}  [userId]     User ID. If not defined, current user.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Resolved with the assessment.
     */
    self.getReviewerAssessmentById = function(workshopId, assessmentId, userId, siteId) {
        return $mmaModWorkshop.getAssessment(workshopId, assessmentId, siteId).catch(function() {
            return $mmaModWorkshop.getReviewerAssessments(workshopId, userId, undefined, undefined, siteId)
                    .then(function(assessments) {
                for (var x in assessments) {
                    if (assessments[x].id == assessmentId) {
                        return assessments[x];
                    }
                }
                return false;
            });
        }).then(function(assessment) {
            if (!assessment) {
                return false;
            }

            return $mmaModWorkshop.getAssessmentForm(workshopId, assessmentId, undefined, undefined, undefined, siteId)
                    .then(function(assessmentForm) {
                assessment.form = assessmentForm;
                return assessment;
            });
        });
    };

    /**
     * Retrieves the assessment of the given user and all the related data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getReviewerAssessments
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Number}    [userId]        User ID. If not defined, current user.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop data is retrieved.
     */
    self.getReviewerAssessments = function(workshopId, userId, offline, ignoreCache, siteId) {
        return $mmaModWorkshop.getReviewerAssessments(workshopId, userId, offline, ignoreCache, siteId).then(function(assessments) {
            var promises = [];
            angular.forEach(assessments, function (assessment) {
                promises.push(self.getSubmissionById(workshopId, assessment.submissionid, siteId)
                        .then(function(submission) {
                    assessment.submission = submission;
                }));
            });

            return $q.all(promises).then(function() {
                return assessments;
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
     * @name $mmaModWorkshopHelper#getStoredSubmissionFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId If not editing, it will refer to timecreated.
     * @param  {Boolean}  editing      If the submission is being edited or added otherwise.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the files.
     */
    self.getStoredSubmissionFiles = function(workshopId, submissionId, editing, siteId) {
        return $mmaModWorkshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath).catch(function() {
                // Ignore not found files.
                return [];
            });
        });
    };


    /**
     * Get a list of stored attachment files for a submission and online files also. See $mmaModWorkshopHelper#storeFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getSubmissionFilesFromOfflineFilesObject
     * @param  {object}   filesObject  Files object combining offline and online information.
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   submissionId If not editing, it will refer to timecreated.
     * @param  {Boolean}  editing      If the submission is being edited or added otherwise.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the files.
     */
    self.getSubmissionFilesFromOfflineFilesObject = function(filesObject, workshopId, submissionId, editing, siteId) {
        return $mmaModWorkshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
        });
    };

    /**
     * Delete stored attachment files for an assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#deleteAssessmentStoredFiles
     * @param  {Number}  workshopId    Workshop ID.
     * @param  {Number}  assessmentId  Assessment ID.
     * @param  {String}  [siteId]      Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved when deleted.
     */
    self.deleteAssessmentStoredFiles = function(workshopId, assessmentId, siteId) {
        return $mmaModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#storeAssessmentFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   assessmentId Assessment ID.
     * @param  {Object[]} files        List of files.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved if success, rejected otherwise.
     */
    self.storeAssessmentFiles = function(workshopId, assessmentId, files, siteId) {
        // Get the folder where to store the files.
        return $mmaModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Upload or store some files for an assessment, depending if the user is offline or not.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#uploadOrStoreAssessmentFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   assessmentIdAssessment ID.
     * @param  {Object[]} files        List of files.
     * @param  {Boolean}  offline      True if files sould be stored for offline, false to upload them.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved if success.
     */
    self.uploadOrStoreAssessmentFiles = function(workshopId, assessmentId, files, offline, siteId) {
        if (offline) {
            return self.storeAssessmentFiles(workshopId, assessmentId, files, siteId);
        } else {
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModWorkshopComponent, workshopId, siteId);
        }
    };

    /**
     * Get a list of stored attachment files for an assessment. See $mmaModWorkshopHelper#storeFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getStoredAssessmentFiles
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   assessmentId Assessment ID.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the files.
     */
    self.getStoredAssessmentFiles = function(workshopId, assessmentId, siteId) {
        return $mmaModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath).catch(function() {
                // Ignore not found files.
                return [];
            });
        });
    };

    /**
     * Get a list of stored attachment files for an assessment and online files also. See $mmaModWorkshopHelper#storeFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#getAssessmentFilesFromOfflineFilesObject
     * @param  {object}   filesObject  Files object combining offline and online information.
     * @param  {Number}   workshopId   Workshop ID.
     * @param  {Number}   assessmentId Assessment ID.
     * @param  {String}   [siteId]     Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the files.
     */
    self.getAssessmentFilesFromOfflineFilesObject = function(filesObject, workshopId, assessmentId, siteId) {
        return $mmaModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
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

        var editing = true,
            attachmentsid = false,
            workshopId;

        angular.forEach(actions, function(action) {
            switch (action.action) {
                case 'add':
                    submission.id = action.submissionid;
                    editing = false;
                case 'update':
                    submission.title = action.title;
                    submission.content = action.content;
                    submission.title = action.title;
                    submission.courseid = action.courseid;
                    submission.submissionmodified = parseInt(action.timemodified / 1000, 10);
                    submission.offline = true;
                    attachmentsid = action.attachmentsid;
                    workshopId = action.workshopid;
                    break;
                case 'delete':
                    submission.deleted = true;
                    submission.submissionmodified = parseInt(action.timemodified / 1000, 10);
                    break;
            }
        });

        // Check offline files for latest attachmentsid.
        if (actions.length) {
            if (attachmentsid) {
                return self.getSubmissionFilesFromOfflineFilesObject(attachmentsid, workshopId, submission.id, editing)
                        .then(function(files) {
                    submission.attachmentfiles = files;
                    return submission;
                });
            } else {
                submission.attachmentfiles = [];
            }
        }
        return $q.when(submission);
    };

    /**
     * Prepare assessment data to be sent to the server.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#prepareAssessmentData
     * @param {Object}  workshop            Workshop object.
     * @param {Object}  inputData           Assessment data.
     * @param {Object}  form                Assessment form original data.
     * @param {Number}  [attachmentsId]     The draft file area id for attachments.
     * @return {Promise}                    Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    self.prepareAssessmentData = function(workshop, inputData, form, attachmentsId) {
        delete inputData.files;
        inputData.feedbackauthorattachmentsid = attachmentsId || 0;
        inputData.nodims = form.dimenssionscount;

        if (workshop.overallfeedbackmode == 2 && (!inputData.feedbackauthor || inputData.feedbackauthor.length == 0)) {
            return $q.reject({'feedbackauthor': $translate.instant('mm.core.err_required')});
        }

        return $mmaModWorkshopAssessmentStrategyDelegate.prepareAssessmentData(workshop.strategy, inputData, form);
    };

    /**
     * Calculates the real value of a grade based on real_grade_value.
     *
     * @param {Number} value  Percentual value from 0 to 100.
     * @param {Number} max    The maximal grade.
     * @return {String} Real grade formatted.
     */
    function realGradeValue(value, max, decimals) {
        if (value == null || value === "") {
            return null;
        } else if (max == 0) {
            return 0;
        } else {
            value = $mmUtil.roundToDecimals(parseFloat(max * value / 100), decimals);
            return $mmUtil.formatFloat(value);
        }
    };

    /**
     * Calculates the real value of a grades of an assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#realGradeValue
     * @param {Object}  workshop        Workshop object.
     * @param {Object}  assessment      Assessment data.
     * @return {Object} Assessment with real grades.
     */
    self.realGradeValue = function(workshop, assessment) {
        assessment.grade = realGradeValue(assessment.grade, workshop.grade, workshop.gradedecimals);
        assessment.gradinggrade = realGradeValue(assessment.gradinggrade, workshop.gradinggrade, workshop.gradedecimals);
        assessment.gradinggradeover = realGradeValue(assessment.gradinggradeover, workshop.gradinggrade, workshop.gradedecimals);

        return assessment;
    };

    /**
     * Check grade should be shown
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopHelper#showGrade
     * @param {Number}  grade        Grade to be shown
     * @return {Boolean}  If grade should be shown or not.
     */
    self.showGrade = function(grade) {
        return typeof grade !== "undefined" && grade !== null;
    };

    return self;
});
