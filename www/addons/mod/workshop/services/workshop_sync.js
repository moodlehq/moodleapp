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
 * Workshop synchronization service.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopSync
 */
.factory('$mmaModWorkshopSync', function($log, $mmaModWorkshop, $mmSite, $mmSitesManager, $q, $mmaModWorkshopOffline, $mmCourse,
            $mmApp, $mmEvents, $translate, mmaModWorkshopSyncTime, $mmSync, mmaModWorkshopEventAutomSynced, mmaModWorkshopComponent,
            $mmSyncBlock, $mmLang, $mmaModWorkshopHelper) {

    $log = $log.getInstance('$mmaModWorkshopSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModWorkshopComponent, mmaModWorkshopSyncTime);

    /**
     * Check if an workshop has data to synchronize.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopSync#hasDataToSync
     * @param  {Number} workshopId Workshop ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    self.hasDataToSync = function(workshopId, siteId) {
        return $mmaModWorkshopOffline.hasWorkshopOfflineData(workshopId, siteId);
    };

    /**
     * Try to synchronize all workshops that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopSync#syncAllWorkshops
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllWorkshops = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all workshops because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync workshops in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync workshops in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync submissions.
                sitePromises.push($mmaModWorkshopOffline.getAllWorkshops(siteId).then(function(workshopIds) {
                    var promises = [];

                    // Sync all workshops that haven't been synced for a while.
                    angular.forEach(workshopIds, function(workshopId) {
                        promises.push(self.syncWorkshopIfNeeded(workshopId, siteId).then(function(data) {
                            if (data && data.updated) {
                                // Sync done. Send event.
                                $mmEvents.trigger(mmaModWorkshopEventAutomSynced, {
                                    siteid: siteId,
                                    workshopid: workshopId,
                                    warnings: data.warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a workshop only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopSync#syncWorkshopIfNeeded
     * @param {Number}  workshopId Workshop ID.
     * @param {String}  [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the workshop is synced or if it doesn't need to be synced.
     */
    self.syncWorkshopIfNeeded = function(workshopId, siteId) {
        return self.isSyncNeeded(workshopId, siteId).then(function(needed) {
            if (needed) {
                return self.syncWorkshop(workshopId, siteId);
            }
        });
    };

    /**
     * Try to synchronize a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopSync#syncWorkshop
     * @param  {Number} workshopId  Workshop ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncWorkshop = function(workshopId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            syncPromises = [],
            workshop,
            courseId,
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(workshopId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(workshopId, siteId);
        }

        // Verify that workshop isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModWorkshopComponent, workshopId, siteId)) {
            $log.debug('Cannot sync workshop ' + workshopId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('workshop');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync workshop ' + workshopId);

        // Get offline submissions to be sent.
        syncPromises.push($mmaModWorkshopOffline.getSubmissions(workshopId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submission assessments to be sent.
        syncPromises.push($mmaModWorkshopOffline.getAssessments(workshopId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submission evaluations to be sent.
        syncPromises.push($mmaModWorkshopOffline.getEvaluateSubmissions(workshopId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline assessment evaluations to be sent.
        syncPromises.push($mmaModWorkshopOffline.getEvaluateAssessments(workshopId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submissions to be sent.
        syncPromise = $q.all(syncPromises).then(function(syncs) {
            // Get courseId from the first object
            for (var x in syncs) {
                if (syncs[x].length > 0 && syncs[x][0].courseid) {
                    courseId = syncs[x][0].courseid;
                    break;
                }
            }

            if (!courseId) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            return $mmaModWorkshop.getWorkshopById(courseId, workshopId, siteId).then(function(workshop) {
                var submissionsActions = syncs[0],
                    assessments = syncs[1],
                    submissionEvaluations = syncs[2],
                    assessmentEvaluations = syncs[3];

                var promises = [],
                    offlineSubmissions = {};

                angular.forEach(submissionsActions, function(action) {
                    if (typeof offlineSubmissions[action.submissionid] == "undefined") {
                        offlineSubmissions[action.submissionid] = [];
                    }
                    offlineSubmissions[action.submissionid].push(action);
                });

                angular.forEach(offlineSubmissions, function(submissionActions) {
                    promises.push(syncSubmission(workshop, submissionActions, result, siteId).then(function() {
                        result.updated = true;
                    }));
                });

                angular.forEach(assessments, function(assessment) {
                    promises.push(syncAssessment(workshop, assessment, result, siteId).then(function() {
                        result.updated = true;
                    }));
                });

                angular.forEach(submissionEvaluations, function(evaluation) {
                    promises.push(syncEvaluateSubmission(workshop, evaluation, result, siteId).then(function() {
                        result.updated = true;
                    }));
                });

                angular.forEach(assessmentEvaluations, function(evaluation) {
                    promises.push(syncEvaluateAssessment(workshop, evaluation, result, siteId).then(function() {
                        result.updated = true;
                    }));
                });

                return $q.all(promises);
            }).then(function() {
                if (result.updated) {
                    // Data has been sent to server. Now invalidate the WS calls.
                    return $mmaModWorkshop.invalidateContentById(workshopId, courseId, siteId).catch(function() {
                        // Ignore errors.
                    });
                }
            });
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(workshopId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(workshopId, syncPromise, siteId);
    };

    /**
     * Synchronize a submission.
     *
     * @param  {Object}   workshop          Workshop.
     * @param  {Object}   submissionActions Submission actions offline data.
     * @param  {Object}   result            Object with the result of the sync.
     * @param  {String}   [siteId]          Site ID. If not defined, current site.
     * @return {Promise}                    Promise resolved if success, rejected otherwise.
     */
    function syncSubmission(workshop, submissionActions, result, siteId) {
        var discardError,
            deleted = false,
            editing = false;

        // Sort entries by timemodified.
        submissionActions = submissionActions.sort(function(a, b) {
            return a.timemodified - b.timemodified;
        });

        submissionId = submissionActions[0].submissionid;

        if (submissionId > 0) {
            editing = true;
            timePromise = $mmaModWorkshop.getSubmission(workshop.id, submissionId, siteId).then(function(submission) {
                return submission.timemodified;
            }).catch(function() {
                return -1;
            });
        } else {
            timePromise = $q.when(0);
        }

        return timePromise.then(function(timemodified) {
            if (timemodified < 0 || timemodified >= submissionActions[0].timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = $translate.instant('mma.mod_workshop.warningsubmissionmodified');
                return $mmaModWorkshopOffline.deleteAllSubmissionActions(workshop.id, submissionId, siteId);
            }

            var promises = [];

            angular.forEach(submissionActions, function(action) {
                var actionPromise,
                    fileProm;

                submissionId = action.submissionid > 0 ? action.submissionid : submissionId;

                // Upload attachments first if any.
                if (action.attachmentsid) {
                    fileProm = $mmaModWorkshopHelper.getSubmissionFilesFromOfflineFilesObject(action.attachmentsid, workshop.id,
                            submissionId, editing, siteId).then(function(files) {
                        return $mmaModWorkshopHelper.uploadOrStoreSubmissionFiles(workshop.id, submissionId, files, editing, false,
                                siteId);
                    });
                } else {
                    // Remove all files.
                    fileProm = $mmaModWorkshopHelper.uploadOrStoreSubmissionFiles(workshop.id, submissionId, [], editing, false,
                                siteId);
                }

                actionPromise = fileProm.then(function(attachmentsId) {
                    // Perform the action.
                    switch (action.action) {
                        case 'add':
                            return $mmaModWorkshop.addSubmissionOnline(workshop.id, action.title, action.content, attachmentsId,
                                    siteId).then(function(newSubmissionId) {
                                submissionId = newSubmissionId;
                            });
                        case 'update':
                            return $mmaModWorkshop.updateSubmissionOnline(submissionId, action.title, action.content, attachmentsId,
                                    siteId);
                        case 'delete':
                            return $mmaModWorkshop.deleteSubmissionOnline(submissionId, siteId).then(function() {
                                deleted = true;
                            });
                    }
                });

                promises.push(actionPromise.catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = error.error;
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }).then(function() {
                    // Delete the offline data.
                    result.updated = true;
                    return $mmaModWorkshopOffline.deleteSubmissionAction(action.workshopid, action.submissionid, action.action,
                            siteId);
                }));
            });
            return $q.all(promises);
        }).then(function() {
            if (discardError) {
                // Submission was discarded, add a warning.
                var message = $translate.instant('mm.core.warningofflinedatadeleted', {
                    component: $mmCourse.translateModuleName('workshop'),
                    name: workshop.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }
        });
    }

    /**
     * Synchronize an assessment.
     *
     * @param  {Object}   workshop          Workshop.
     * @param  {Object}   assessment        Assessment offline data.
     * @param  {Object}   result            Object with the result of the sync.
     * @param  {String}   [siteId]          Site ID. If not defined, current site.
     * @return {Promise}                    Promise resolved if success, rejected otherwise.
     */
    function syncAssessment(workshop, assessmentData, result, siteId) {
        var discardError,
            timePromise,
            assessmentId = assessmentData.assessmentid;

        timePromise = $mmaModWorkshop.getAssessment(workshop.id, assessmentId, siteId).then(function(assessment) {
            return assessment.timemodified;
        }).catch(function() {
            return -1;
        });

        return timePromise.then(function(timemodified) {
            if (timemodified < 0 || timemodified >= assessmentData.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = $translate.instant('mma.mod_workshop.warningassessmentmodified');
                return $mmaModWorkshopOffline.deleteAssessment(workshop.id, assessmentId, siteId);
            }

            var fileProm,
                inputData = assessmentData.inputdata;

            // Upload attachments first if any.
            if (inputData.feedbackauthorattachmentsid) {
                fileProm = $mmaModWorkshopHelper.getAssessmentFilesFromOfflineFilesObject(inputData.feedbackauthorattachmentsid,
                        workshop.id, assessmentId, siteId).then(function(files) {
                    return $mmaModWorkshopHelper.uploadOrStoreAssessmentFiles(workshop.id, assessmentId, files, false, siteId);
                });
            } else {
                // Remove all files.
                fileProm = $mmaModWorkshopHelper.uploadOrStoreAssessmentFiles(workshop.id, assessmentId, [], false, siteId);
            }

            return fileProm.then(function(attachmentsId) {
                inputData.feedbackauthorattachmentsid = attachmentsId || 0;
                return $mmaModWorkshop.updateAssessmentOnline(assessmentId, inputData, siteId);
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = error.error;
                } else {
                    // Couldn't connect to server, reject.
                    return $q.reject(error && error.error);
                }
            }).then(function() {
                // Delete the offline data.
                result.updated = true;
                return $mmaModWorkshopOffline.deleteAssessment(workshop.id, assessmentId, siteId);
            });
        }).then(function() {
            if (discardError) {
                // Assessment was discarded, add a warning.
                var message = $translate.instant('mm.core.warningofflinedatadeleted', {
                    component: $mmCourse.translateModuleName('workshop'),
                    name: workshop.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }
        });
    }

    /**
     * Synchronize a submission evaluation.
     *
     * @param  {Object}   workshop          Workshop.
     * @param  {Object}   evaluate          Submission evaluation offline data.
     * @param  {Object}   result            Object with the result of the sync.
     * @param  {String}   [siteId]          Site ID. If not defined, current site.
     * @return {Promise}                    Promise resolved if success, rejected otherwise.
     */
    function syncEvaluateSubmission(workshop, evaluate, result, siteId) {
        var discardError,
            timePromise,
            submissionId = evaluate.submissionid;

        timePromise = $mmaModWorkshop.getSubmission(workshop.id, submissionId, siteId).then(function(submission) {
            return submission.timemodified;
        }).catch(function() {
            return -1;
        });

        return timePromise.then(function(timemodified) {
            if (timemodified < 0 || timemodified >= evaluate.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = $translate.instant('mma.mod_workshop.warningsubmissionmodified');
                return $mmaModWorkshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);
            }

            return $mmaModWorkshop.evaluateSubmissionOnline(submissionId, evaluate.feedbacktext, evaluate.published,
                evaluate.gradeover, siteId).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = error.error;
                } else {
                    // Couldn't connect to server, reject.
                    return $q.reject(error && error.error);
                }
            }).then(function() {
                // Delete the offline data.
                result.updated = true;
                return $mmaModWorkshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);
            });
        }).then(function() {
            if (discardError) {
                // Assessment was discarded, add a warning.
                var message = $translate.instant('mm.core.warningofflinedatadeleted', {
                    component: $mmCourse.translateModuleName('workshop'),
                    name: workshop.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }
        });
    }

    /**
     * Synchronize a assessment evaluation.
     *
     * @param  {Object}   workshop          Workshop.
     * @param  {Object}   evaluate          Assessment evaluation offline data.
     * @param  {Object}   result            Object with the result of the sync.
     * @param  {String}   [siteId]          Site ID. If not defined, current site.
     * @return {Promise}                    Promise resolved if success, rejected otherwise.
     */
    function syncEvaluateAssessment(workshop, evaluate, result, siteId) {
        var discardError,
            timePromise,
            assessmentId = evaluate.assessmentid;

        timePromise = $mmaModWorkshop.getAssessment(workshop.id, assessmentId, siteId).then(function(assessment) {
            return assessment.timemodified;
        }).catch(function() {
            return -1;
        });

        return timePromise.then(function(timemodified) {
            if (timemodified < 0 || timemodified >= evaluate.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = $translate.instant('mma.mod_workshop.warningassessmentmodified');
                return $mmaModWorkshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);
            }

            return $mmaModWorkshop.evaluateAssessmentOnline(assessmentId, evaluate.feedbacktext, evaluate.weight,
                evaluate.gradinggradeover, siteId).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = error.error;
                } else {
                    // Couldn't connect to server, reject.
                    return $q.reject(error && error.error);
                }
            }).then(function() {
                // Delete the offline data.
                result.updated = true;
                return $mmaModWorkshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);
            });
        }).then(function() {
            if (discardError) {
                // Assessment was discarded, add a warning.
                var message = $translate.instant('mm.core.warningofflinedatadeleted', {
                    component: $mmCourse.translateModuleName('workshop'),
                    name: workshop.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }
        });
    }


    return self;
});
