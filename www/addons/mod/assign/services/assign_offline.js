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

.constant('mmaModAssignSubmissionsStore', 'mma_mod_assign_submissions')
.constant('mmaModAssignSubmissionsGradeStore', 'mma_mod_assign_submissions_grading')

.config(function($mmSitesFactoryProvider, mmaModAssignSubmissionsStore, mmaModAssignSubmissionsGradeStore) {
    var stores = [
        {
            name: mmaModAssignSubmissionsStore,
            keyPath: ['assignmentid', 'userid'],
            indexes: [
                {
                    name: 'assignmentid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'onlinetimemodified'
                }
            ]
        },
        {
            name: mmaModAssignSubmissionsGradeStore,
            keyPath: ['assignmentid', 'userid'],
            indexes: [
                {
                    name: 'assignmentid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'timemodified'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline assign factory.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignOffline
 */
.factory('$mmaModAssignOffline', function($mmSitesManager, $log, $mmFS, $q, mmaModAssignSubmissionsStore, $mmUtil,
        mmaModAssignSubmissionsGradeStore) {
    $log = $log.getInstance('$mmaModAssignOffline');

    var self = {};

    /**
     * Get all the assignments ids that have something to be synced.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getAllAssigns
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with assignments id that have something to be synced.
     */
    self.getAllAssigns = function(siteId) {
        var promises = [];
        promises.push(getAllSubmissions(siteId));
        promises.push(getAllSubmissionsGrade(siteId));

        return $q.all(promises).then(function(objects) {
            // Flatten array.
            objects = [].concat.apply([], objects);

            // Get assignmentid.
            objects = objects.map(function(object) {
              return object.assignmentid;
            });

            // Get unique values.
            objects = objects.filter(function(item, pos) {
                return objects.indexOf(item) == pos;
            });
            return objects;
        });
    };

    /**
     * Get if the assignment have something to be synced.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#hasAssignOfflineData
     * @param  {Number} assignId Assignment ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if the assignment have something to be synced.
     */
    self.hasAssignOfflineData = function(assignId, siteId) {
        var promises = [];
        promises.push(self.getAssignSubmissions(assignId, siteId));
        promises.push(self.getAssignSubmissionsGrade(assignId, siteId));

        return $q.all(promises).then(function(objects) {
            return objects.reduce(function(a, b) {
              return a.length > 0 || b.length > 0;
            }, []);
        }).catch(function() {
            // No offline data found.
            return false;
        });
    };

    /**
     * Delete a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#deleteSubmission
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if deleted, rejected if failure.
     */
    self.deleteSubmission = function(assignId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModAssignSubmissionsStore, [assignId, userId]);
        });
    };

    /**
     * Get all the stored submissions from all the assignments.
     *
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    function getAllSubmissions(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModAssignSubmissionsStore);
        });
    };

    /**
     * Get all the stored submission from a certain assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getAssignSubmissions
     * @param  {Number} assignId Assignment ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    self.getAssignSubmissions = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModAssignSubmissionsStore, 'assignmentid', assignId);
        });
    };

    /**
     * Get a stored submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmission
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submission.
     */
    self.getSubmission = function(assignId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().get(mmaModAssignSubmissionsStore, [assignId, userId]);
        });
    };

    /**
     * Get the path to the folder where to store files for a offline submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmissionFolder
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the path.
     */
    self.getSubmissionFolder = function(assignId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var siteFolderPath = $mmFS.getSiteFolder(site.getId()),
                submissionFolderPath = 'offlineassign/' + assignId + '/' + userId;

            return $mmFS.concatenatePaths(siteFolderPath, submissionFolderPath);
        });
    };

    /**
     * Get the path to the folder where to store files for a certain plugin in an offline submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmissionPluginFolder
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the path.
     */
    self.getSubmissionPluginFolder = function(assignId, pluginName, userId, siteId) {
        return self.getSubmissionFolder(assignId, userId, siteId).then(function(folderPath) {
            return $mmFS.concatenatePaths(folderPath, pluginName);
        });
    };

    /**
     * Delete a submission grade.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#deleteSubmissionGrade
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if deleted, rejected if failure.
     */
    self.deleteSubmissionGrade = function(assignId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModAssignSubmissionsGradeStore, [assignId, userId]);
        });
    };

    /**
     * Get all the stored submissions grade from all the assignments.
     *
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    function getAllSubmissionsGrade(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModAssignSubmissionsGradeStore);
        });
    };

    /**
     * Get all the stored submissions grade from a certain assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getAssignSubmissionsGrade
     * @param  {Number} assignId Assignment ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    self.getAssignSubmissionsGrade = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModAssignSubmissionsGradeStore, 'assignmentid', assignId);
        });
    };

    /**
     * Get a stored submission grade. Submission grades are not identified using attempt number so it can retrieve the feedback for
     * a previous attempt.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmissionGrade
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submission.
     */
    self.getSubmissionGrade = function(assignId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().get(mmaModAssignSubmissionsGradeStore, [assignId, userId]);
        });
    };

    /**
     * Mark/Unmark a submission as being submitted.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#markSubmitted
     * @param  {Number} assignId         Assignment ID.
     * @param  {Number} courseId         Course ID the assign belongs to.
     * @param  {Boolean} submitted       True to mark as submitted, false to mark as not submitted.
     * @param  {Boolean} acceptStatement True to accept the submission statement, false otherwise.
     * @param  {Number} timemodified     The time the submission was last modified in online.
     * @param  {Number} [userId]         User ID. If not defined, site's current user.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved if marked, rejected if failure.
     */
    self.markSubmitted = function(assignId, courseId, submitted, acceptStatement, timemodified, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            // Check if there's a submission stored.
            return self.getSubmission(assignId, userId, site.getId()).catch(function() {
                // No submission, create an empty one.
                var now = $mmUtil.timestamp();
                return {
                    assignmentid: assignId,
                    courseid: courseId,
                    plugindata: {},
                    userid: userId,
                    onlinetimemodified: timemodified,
                    timecreated: now,
                    timemodified: now
                };
            }).then(function(submission) {
                // Mark the submission.
                submission.submitted = !!submitted;
                submission.submissionstatement = !!acceptStatement;
                return site.getDb().insert(mmaModAssignSubmissionsStore, submission);
            });
        });
    };

    /**
     * Save a submission to be sent later.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#saveSubmission
     * @param  {Number} assignId     Assignment ID.
     * @param  {Number} courseId     Course ID the assign belongs to.
     * @param  {Object} pluginData   Data to save.
     * @param  {Number} timemodified The time the submission was last modified in online.
     * @param  {Boolean} submitted   True if submission has been submitted, false otherwise.
     * @param  {Number} [userId]     User ID. If not defined, site's current user.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.saveSubmission = function(assignId, courseId, pluginData, timemodified, submitted, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var now = $mmUtil.timestamp(),
                entry = {
                    assignmentid: assignId,
                    courseid: courseId,
                    plugindata: pluginData,
                    userid: userId,
                    submitted: !!submitted,
                    timecreated: now,
                    timemodified: now,
                    onlinetimemodified: timemodified
                };

            return site.getDb().insert(mmaModAssignSubmissionsStore, entry);
        });
    };

    /**
     * Save a grading to be sent later.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#submitGradingForm
     * @param  {Number}  assignId       Assign ID.
     * @param  {Number}  userId         User ID.
     * @param  {Number}  grade          Grade to submit.
     * @param  {Number}  attemptNumber  Number of the attempt number being graded.
     * @param  {Number}  addAttempt     Admit the user to attempt again.
     * @param  {String}  workflowState  Next workflow State.
     * @param  {Boolean} applyToAll     If it's a team submission, if the grade applies to all group members.
     * @param  {Object}  outcomes       Object including all outcomes values. If empty, any of them will be sent.
     * @param  {Object}  pluginData     Feedback plugin data to save.
     * @param  {Number}  courseId       Course ID the assign belongs to.
     * @param  {String}  [siteId]       Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved if stored, rejected if failure.
     */
    self.submitGradingForm = function(assignId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll, outcomes,
            pluginData, courseId, siteId) {

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var now = $mmUtil.timestamp(),
                entry = {
                    assignmentid: assignId,
                    userid: userId,
                    courseid: courseId,
                    grade: grade,
                    attemptnumber: attemptNumber,
                    addattempt: !!addAttempt,
                    workflowstate: workflowState,
                    applytoall: !!applyToAll,
                    outcomes: outcomes,
                    plugindata: pluginData,
                    timemodified: now
                };

            return site.getDb().insert(mmaModAssignSubmissionsGradeStore, entry);
        });
    };

    return self;
});