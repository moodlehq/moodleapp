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

.constant('mmaModWorkshopOfflineSubmissionStore', 'mma_mod_workshop_offline_submissions')
.constant('mmaModWorkshopOfflineAssessmentsStore', 'mma_mod_workshop_offline_assessments')
.constant('mmaModWorkshopOfflineEvaluateSubmissionsStore', 'mma_mod_workshop_offline_evaluate_submissions')
.constant('mmaModWorkshopOfflineEvaluateAssessmentsStore', 'mma_mod_workshop_offline_evaluate_assessments')


.config(function($mmSitesFactoryProvider, mmaModWorkshopOfflineSubmissionStore, mmaModWorkshopOfflineAssessmentsStore,
        mmaModWorkshopOfflineEvaluateSubmissionsStore, mmaModWorkshopOfflineEvaluateAssessmentsStore) {
    var stores = [
        {
            name: mmaModWorkshopOfflineSubmissionStore,
            keyPath: ['workshopid', 'submissionid', 'action'],
            indexes: [
                {
                    name: 'workshopid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'submissionid'
                },
                {
                    name: 'action'
                },
                {
                    name: 'workshopAndSubmission',
                    keyPath: ['workshopid', 'submissionid']
                }
            ]
        },
        {
            name: mmaModWorkshopOfflineAssessmentsStore,
            keyPath: ['workshopid', 'assessmentid'],
            indexes: [
                {
                    name: 'workshopid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'assessmentid'
                }
            ]
        },
        {
            name: mmaModWorkshopOfflineEvaluateSubmissionsStore,
            keyPath: ['workshopid', 'submissionid'],
            indexes: [
                {
                    name: 'workshopid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'submissionid'
                }
            ]
        },
        {
            name: mmaModWorkshopOfflineEvaluateAssessmentsStore,
            keyPath: ['workshopid', 'assessmentid'],
            indexes: [
                {
                    name: 'workshopid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'assessmentid'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Workshop offline service.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopOffline
 */
.factory('$mmaModWorkshopOffline', function($log, mmaModWorkshopOfflineSubmissionStore, mmaModWorkshopOfflineAssessmentsStore, $q,
        $mmSitesManager, $mmFS, $mmUtil, mmaModWorkshopOfflineEvaluateSubmissionsStore,
        mmaModWorkshopOfflineEvaluateAssessmentsStore) {

    $log = $log.getInstance('$mmaModWorkshopOffline');

    var self = {};

    /**
     * Get all the workshops ids that have something to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAllWorkshops
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with workshops id that have something to be synced.
     */
    self.getAllWorkshops = function(siteId) {
        var promises = [];
        promises.push(self.getAllSubmissions(siteId));
        promises.push(self.getAllAssessments(siteId));
        promises.push(self.getAllEvaluateSubmissions(siteId));
        promises.push(self.getAllEvaluateAssessments(siteId));

        return $q.all(promises).then(function(promiseResults) {
            var workshopIds = {};

            // Get workshops from any offline object all should have workshopid.
            angular.forEach(promiseResults, function(offlineObjects) {
                angular.forEach(offlineObjects, function(offlineObject) {
                    workshopIds[offlineObject.workshopid] = true;
                });
            });
            return Object.keys(workshopIds).map(function(workshopId) {
                return parseInt(workshopId, 10);
            });
        });
    };

    /**
     * Check if there is an offline data to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#hasWorkshopOfflineData
     * @param  {Number} workshopId  Workshop ID to remove.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with boolean: true if has offline data, false otherwise.
     */
    self.hasWorkshopOfflineData = function(workshopId, siteId) {
        var promises = [];
        promises.push(self.getSubmissions(workshopId, siteId));
        promises.push(self.getAssessments(workshopId, siteId));
        promises.push(self.getEvaluateSubmissions(workshopId, siteId));
        promises.push(self.getEvaluateAssessments(workshopId, siteId));

        return $q.all(promises).then(function(objects) {
            for (var i = 0; i < objects.length; i++) {
                var result = objects[i];
                if (result && result.length) {
                    return true;
                }
            }
            return false;
        }).catch(function() {
            // No offline data found.
            return false;
        });
    };

    /**
     * Delete workshop submission action.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#deleteSubmissionAction
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} submissionId Submission ID.
     * @param  {String} action       Action to be done.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.deleteSubmissionAction = function(workshopId, submissionId, action, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModWorkshopOfflineSubmissionStore, [workshopId, submissionId, action]);
        });
    };

    /**
     * Delete all workshop submission actions.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#deleteAllSubmissionActions
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} submissionId Submission ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.deleteAllSubmissionActions = function(workshopId, submissionId, siteId) {
        return self.getSubmissionActions(workshopId, submissionId, siteId).then(function(actions) {
            var promises = [];
            angular.forEach(actions, function(action) {
                promises.push(self.deleteSubmissionAction(workshopId, submissionId, action.action, siteId));
            });
            return $q.all(promises);
        });
    };

    /**
     * Get the all the submissions to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAllSubmissions
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the objects to be synced.
     */
    self.getAllSubmissions = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModWorkshopOfflineSubmissionStore);
        });
    };

    /**
     * Get the submissions of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getSubmissions
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getSubmissions = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWorkshopOfflineSubmissionStore, 'workshopid', workshopId);
        });
    };

    /**
     * Get all actions of a submission of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getSubmissionActions
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {Number} submissionId    ID of the submission.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getSubmissionActions = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWorkshopOfflineSubmissionStore, 'workshopAndSubmission', [workshopId, submissionId]);
        });
    };

    /**
     * Get an specific action of a submission of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getSubmissionAction
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {Number} submissionId    ID of the submission.
     * @param  {String} action          Action to be done.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getSubmissionAction = function(workshopId, submissionId, action, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModWorkshopOfflineSubmissionStore, [workshopId, submissionId, action]);
        });
    };

    /**
     * Offline version for adding a submission action to a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#saveSubmission
     * @param  {Number} workshopId      Workshop ID.
     * @param  {Number} courseId        Course ID the workshop belongs to.
     * @param  {String} title           The submission title.
     * @param  {String} content         The submission text content.
     * @param  {Number} [attachmentsId] The draft file area id for attachments.
     * @param  {Number} [submissionId]  Submission Id, if action is add, the time the submission was created.
     *                                  If not defined, current time.
     * @param  {String} action          Action to be done. ['add', 'update', 'delete']
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when submission action is successfully saved.
     */
    self.saveSubmission = function(workshopId, courseId, title, content, attachmentsId, submissionId, action, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                timemodified = $mmUtil.timestamp(),
                submission = {
                    workshopid: workshopId,
                    courseid: courseId,
                    title: title,
                    content: content,
                    attachmentsid: attachmentsId || 0,
                    action: action,
                    submissionid: submissionId ? submissionId : -timemodified,
                    timemodified: timemodified
                };
            return db.insert(mmaModWorkshopOfflineSubmissionStore, submission);
        });
    };

    /**
     * Delete workshop assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#deleteAssessment
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} assessmentId Assessment ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.deleteAssessment = function(workshopId, assessmentId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModWorkshopOfflineAssessmentsStore, [workshopId, assessmentId]);
        });
    };

    /**
     * Get the all the assessments to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAllAssessments
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the objects to be synced.
     */
    self.getAllAssessments = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModWorkshopOfflineAssessmentsStore);
        });
    };

    /**
     * Get the assessments of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAssessments
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getAssessments = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWorkshopOfflineAssessmentsStore, 'workshopid', workshopId);
        });
    };

    /**
     * Get an specific assessment of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAssessment
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {Number} assessmentId    Assessment ID.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getAssessment = function(workshopId, assessmentId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModWorkshopOfflineAssessmentsStore, [workshopId, assessmentId]);
        });
    };

    /**
     * Offline version for adding an assessment to a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#saveAssessment
     * @param  {Number} workshopId      Workshop ID.
     * @param  {Number} assessmentId    Assessment ID.
     * @param  {Number} courseId        Course ID the workshop belongs to.
     * @param  {Object} inputData       Assessment data.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when assessment is successfully saved.
     */
    self.saveAssessment = function(workshopId, assessmentId, courseId, inputData, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                timemodified = $mmUtil.timestamp(),
                assessment = {
                    workshopid: workshopId,
                    courseid: courseId,
                    inputdata: inputData,
                    assessmentid: assessmentId,
                    timemodified: timemodified
                };

            return db.insert(mmaModWorkshopOfflineAssessmentsStore, assessment);
        });
    };

    /**
     * Delete workshop evaluate submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#deleteEvaluateSubmission
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} submissionId Submission ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.deleteEvaluateSubmission = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModWorkshopOfflineEvaluateSubmissionsStore, [workshopId, submissionId]);
        });
    };

    /**
     * Get the all the evaluate submissions to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAllEvaluateSubmissions
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the objects to be synced.
     */
    self.getAllEvaluateSubmissions = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModWorkshopOfflineEvaluateSubmissionsStore);
        });
    };

    /**
     * Get the evaluate submissions of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getEvaluateSubmissions
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getEvaluateSubmissions = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWorkshopOfflineEvaluateSubmissionsStore, 'workshopid', workshopId);
        });
    };

    /**
     * Get an specific evaluate submission of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getEvaluateSubmission
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {Number} submissionId    Submission ID.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getEvaluateSubmission = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModWorkshopOfflineEvaluateSubmissionsStore, [workshopId, submissionId]);
        });
    };

    /**
     * Offline version for evaluation a submission to a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#saveEvaluateSubmission
     * @param  {Number}  workshopId     Workshop ID.
     * @param  {Number}  submissionId   Submission ID.
     * @param  {Number}  courseId       Course ID the workshop belongs to.
     * @param  {String}  feedbackText   The feedback for the author.
     * @param  {Boolean} published      Whether to publish the submission for other users.
     * @param  {Mixed}   gradeOver      The new submission grade (empty for no overriding the grade).
     * @param  {String}  [siteId]       Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when submission evaluation is successfully saved.
     */
    self.saveEvaluateSubmission = function(workshopId, submissionId, courseId, feedbackText, published, gradeOver, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                timemodified = $mmUtil.timestamp(),
                submission = {
                    workshopid: workshopId,
                    courseid: courseId,
                    submissionid: submissionId,
                    timemodified: timemodified,
                    feedbacktext: feedbackText,
                    published: published,
                    gradeover: gradeOver
                };

            return db.insert(mmaModWorkshopOfflineEvaluateSubmissionsStore, submission);
        });
    };

    /**
     * Delete workshop evaluate assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#deleteEvaluateAssessment
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} assessmentId Assessment ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.deleteEvaluateAssessment = function(workshopId, assessmentId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModWorkshopOfflineEvaluateAssessmentsStore, [workshopId, assessmentId]);
        });
    };

    /**
     * Get the all the evaluate assessments to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAllEvaluateAssessments
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the objects to be synced.
     */
    self.getAllEvaluateAssessments = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModWorkshopOfflineEvaluateAssessmentsStore);
        });
    };

    /**
     * Get the evaluate assessments of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getEvaluateAssessments
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getEvaluateAssessments = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWorkshopOfflineEvaluateAssessmentsStore, 'workshopid', workshopId);
        });
    };

    /**
     * Get an specific evaluate assessment of a workshop to be synced.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getEvaluateAssessment
     * @param  {Number} workshopId      ID of the workshop.
     * @param  {Number} assessmentId    Assessment ID.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the object to be synced.
     */
    self.getEvaluateAssessment = function(workshopId, assessmentId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModWorkshopOfflineEvaluateAssessmentsStore, [workshopId, assessmentId]);
        });
    };

    /**
     * Offline version for evaluating an assessment to a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#saveEvaluateAssessment
     * @param  {Number}  workshopId       Workshop ID.
     * @param  {Number}  assessmentId     Assessment ID.
     * @param  {Number}  courseId         Course ID the workshop belongs to.
     * @param  {String}  feedbackText     The feedback for the reviewer.
     * @param  {Boolean} weight           The new weight for the assessment.
     * @param  {Mixed}   gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param  {String}  [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                  Promise resolved when assessment evaluation is successfully saved.
     */
    self.saveEvaluateAssessment = function(workshopId, assessmentId, courseId, feedbackText, weight, gradingGradeOver, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                timemodified = $mmUtil.timestamp(),
                assessment = {
                    workshopid: workshopId,
                    courseid: courseId,
                    assessmentid: assessmentId,
                    timemodified: timemodified,
                    feedbacktext: feedbackText,
                    weight: weight,
                    gradinggradeover: gradingGradeOver
                };

            return db.insert(mmaModWorkshopOfflineEvaluateAssessmentsStore, assessment);
        });
    };

    /**
     * Get the path to the folder where to store files for offline attachments in a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getWorkshopFolder
     * @param  {Number} workshopId   Workshop ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the path.
     */
    self.getWorkshopFolder = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            var siteFolderPath = $mmFS.getSiteFolder(site.getId()),
                workshopFolderPath = 'offlineworkshop/' + workshopId + '/';

            return $mmFS.concatenatePaths(siteFolderPath, workshopFolderPath);
        });
    };

    /**
     * Get the path to the folder where to store files for offline submissions.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getSubmissionFolder
     * @param  {Number}  workshopId   Workshop ID.
     * @param  {Number}  submissionId If not editing, it will refer to timecreated.
     * @param  {Boolean} editing      If the submission is being edited or added otherwise.
     * @param  {String}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the path.
     */
    self.getSubmissionFolder = function(workshopId, submissionId, editing, siteId) {
        return self.getWorkshopFolder(workshopId, siteId).then(function(folderPath) {
            folderPath += 'submission/';
            var folder = editing ? 'update_' + submissionId : 'add';
            return $mmFS.concatenatePaths(folderPath, folder);
        });
    };

    /**
     * Get the path to the folder where to store files for offline assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopOffline#getAssessmentFolder
     * @param  {Number}  workshopId   Workshop ID.
     * @param  {Number}  assessmentId Assessment ID.
     * @param  {String}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with the path.
     */
    self.getAssessmentFolder = function(workshopId, assessmentId, siteId) {
        return self.getWorkshopFolder(workshopId, siteId).then(function(folderPath) {
            folderPath += 'assessment/';
            return $mmFS.concatenatePaths(folderPath, assessmentId + '');
        });
    };

    return self;
});
