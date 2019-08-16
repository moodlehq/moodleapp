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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModWorkshopProvider } from './workshop';
import { AddonModWorkshopHelperProvider } from './helper';
import { AddonModWorkshopOfflineProvider } from './offline';

/**
 * Service to sync workshops.
 */
@Injectable()
export class AddonModWorkshopSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_workshop_autom_synced';
    static MANUAL_SYNCED = 'addon_mod_workshop_manual_synced';

    protected componentTranslate: string;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            courseProvider: CoreCourseProvider,
            private eventsProvider: CoreEventsProvider,
            loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider,
            private workshopProvider: AddonModWorkshopProvider,
            private workshopHelper: AddonModWorkshopHelperProvider,
            private workshopOffline: AddonModWorkshopOfflineProvider,
            private logHelper: CoreCourseLogHelperProvider) {

        super('AddonModWorkshopSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('workshop');
    }

    /**
     * Check if an workshop has data to synchronize.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    hasDataToSync(workshopId: number, siteId?: string): Promise<any> {
        return this.workshopOffline.hasWorkshopOfflineData(workshopId, siteId);
    }

    /**
     * Try to synchronize all workshops that need it and haven't been synchronized in a while.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @return {Promise<any>}    Promise resolved when the sync is done.
     */
    syncAllWorkshops(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all workshops', this.syncAllWorkshopsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all workshops on a site.
     *
     * @param  {string} siteId Site ID to sync.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllWorkshopsFunc(siteId: string, force?: boolean): Promise<any> {
        return this.workshopOffline.getAllWorkshops(siteId).then((workshopIds) => {
            // Sync all workshops that haven't been synced for a while.
            const promises = workshopIds.map((workshopId) => {
                const promise = force ? this.syncWorkshop(workshopId, siteId) : this.syncWorkshopIfNeeded(workshopId, siteId);

                return promise.then((data) => {
                    if (data && data.updated) {
                        // Sync done. Send event.
                        this.eventsProvider.trigger(AddonModWorkshopSyncProvider.AUTO_SYNCED, {
                            workshopId: workshopId,
                            warnings: data.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Sync a workshop only if a certain time has passed since the last time.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the workshop is synced or if it doesn't need to be synced.
     */
    syncWorkshopIfNeeded(workshopId: number, siteId?: string): Promise<any> {
        return this.isSyncNeeded(workshopId, siteId).then((needed) => {
            if (needed) {
                return this.syncWorkshop(workshopId, siteId);
            }
        });
    }

    /**
     * Try to synchronize a workshop.
     *
     * @param  {number} workshopId  Workshop ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved if sync is successful, rejected otherwise.
     */
    syncWorkshop(workshopId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(workshopId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(workshopId, siteId);
        }

        // Verify that workshop isn't blocked.
        if (this.syncProvider.isBlocked(AddonModWorkshopProvider.COMPONENT, workshopId, siteId)) {
            this.logger.debug('Cannot sync workshop ' + workshopId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync workshop ' + workshopId);

        const syncPromises = [];

        // Get offline submissions to be sent.
        syncPromises.push(this.workshopOffline.getSubmissions(workshopId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submission assessments to be sent.
        syncPromises.push(this.workshopOffline.getAssessments(workshopId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submission evaluations to be sent.
        syncPromises.push(this.workshopOffline.getEvaluateSubmissions(workshopId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline assessment evaluations to be sent.
        syncPromises.push(this.workshopOffline.getEvaluateAssessments(workshopId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Sync offline logs.
        syncPromises.push(this.logHelper.syncIfNeeded(AddonModWorkshopProvider.COMPONENT, workshopId, siteId));

        const result = {
            warnings: [],
            updated: false
        };

        // Get offline submissions to be sent.
        const syncPromise = Promise.all(syncPromises).then((syncs) => {
            let courseId;

            // Get courseId from the first object
            for (const x in syncs) {
                if (syncs[x].length > 0 && syncs[x][0].courseid) {
                    courseId = syncs[x][0].courseid;
                    break;
                }
            }

            if (!courseId) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            return this.workshopProvider.getWorkshopById(courseId, workshopId, siteId).then((workshop) => {
                const submissionsActions = syncs[0],
                    assessments = syncs[1],
                    submissionEvaluations = syncs[2],
                    assessmentEvaluations = syncs[3],
                    promises = [],
                    offlineSubmissions = {};

                submissionsActions.forEach((action) => {
                    if (typeof offlineSubmissions[action.submissionid] == 'undefined') {
                        offlineSubmissions[action.submissionid] = [];
                    }
                    offlineSubmissions[action.submissionid].push(action);
                });

                Object.keys(offlineSubmissions).forEach((submissionId) => {
                    const submissionActions = offlineSubmissions[submissionId];
                    promises.push(this.syncSubmission(workshop, submissionActions, result, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                assessments.forEach((assessment) => {
                    promises.push(this.syncAssessment(workshop, assessment, result, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                submissionEvaluations.forEach((evaluation) => {
                    promises.push(this.syncEvaluateSubmission(workshop, evaluation, result, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                assessmentEvaluations.forEach((evaluation) => {
                    promises.push(this.syncEvaluateAssessment(workshop, evaluation, result, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                return Promise.all(promises);
            }).then(() => {
                if (result.updated) {
                    // Data has been sent to server. Now invalidate the WS calls.
                    return this.workshopProvider.invalidateContentById(workshopId, courseId, siteId).catch(() => {
                        // Ignore errors.
                    });
                }
            });
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(workshopId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(workshopId, syncPromise, siteId);
    }

    /**
     * Synchronize a submission.
     *
     * @param  {any}    workshop          Workshop.
     * @param  {any[]}  submissionActions Submission actions offline data.
     * @param  {any}    result            Object with the result of the sync.
     * @param  {string} siteId            Site ID.
     * @return {Promise<any>}             Promise resolved if success, rejected otherwise.
     */
    protected syncSubmission(workshop: any, submissionActions: any, result: any, siteId: string): Promise<any> {
        let discardError;
        let editing = false;

        // Sort entries by timemodified.
        submissionActions = submissionActions.sort((a, b) => {
            return a.timemodified - b.timemodified;
        });

        let timePromise = null;
        let submissionId = submissionActions[0].submissionid;

        if (submissionId > 0) {
            editing = true;
            timePromise = this.workshopProvider.getSubmission(workshop.id, submissionId, siteId).then((submission) => {
                return submission.timemodified;
            }).catch(() => {
                return -1;
            });
        } else {
            timePromise = Promise.resolve(0);
        }

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= submissionActions[0].timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_workshop.warningsubmissionmodified');

                return this.workshopOffline.deleteAllSubmissionActions(workshop.id, submissionId, siteId);
            }

            let promise = Promise.resolve();

            submissionActions.forEach((action) => {
                promise = promise.then(() => {
                    submissionId = action.submissionid > 0 ? action.submissionid : submissionId;

                    let fileProm;
                    // Upload attachments first if any.
                    if (action.attachmentsid) {
                        fileProm = this.workshopHelper.getSubmissionFilesFromOfflineFilesObject(action.attachmentsid, workshop.id,
                                submissionId, editing, siteId).then((files) => {
                            return this.workshopHelper.uploadOrStoreSubmissionFiles(workshop.id, submissionId, files, editing,
                                false, siteId);
                        });
                    } else {
                        // Remove all files.
                        fileProm = this.workshopHelper.uploadOrStoreSubmissionFiles(workshop.id, submissionId, [], editing, false,
                                siteId);
                    }

                    return fileProm.then((attachmentsId) => {
                        if (workshop.submissiontypefile == AddonModWorkshopProvider.SUBMISSION_TYPE_DISABLED) {
                            attachmentsId = null;
                        }

                        // Perform the action.
                        switch (action.action) {
                            case 'add':
                                return this.workshopProvider.addSubmissionOnline(workshop.id, action.title, action.content,
                                        attachmentsId, siteId).then((newSubmissionId) => {
                                    submissionId = newSubmissionId;
                                });
                            case 'update':
                                return this.workshopProvider.updateSubmissionOnline(submissionId, action.title, action.content,
                                        attachmentsId, siteId);
                            case 'delete':
                                return this.workshopProvider.deleteSubmissionOnline(submissionId, siteId);
                            default:
                                return Promise.resolve();
                        }
                    }).catch((error) => {
                        if (error && this.utils.isWebServiceError(error)) {
                            // The WebService has thrown an error, this means it cannot be performed. Discard.
                            discardError = this.textUtils.getErrorMessageFromError(error);
                        } else {
                            // Couldn't connect to server, reject.
                            return Promise.reject(error);
                        }
                    }).then(() => {
                        // Delete the offline data.
                        result.updated = true;

                        return this.workshopOffline.deleteSubmissionAction(action.workshopid, action.submissionid, action.action,
                                siteId).then(() => {
                            // Delete stored files.
                            if (action.action == 'add' || action.action == 'update') {
                                const editing = action.action == 'update';

                                return this.workshopHelper.deleteSubmissionStoredFiles(action.workshopid,
                                        action.submissionid, editing, siteId);
                            }
                        });
                    });
                });
            });

            return promise.then(() => {
                if (discardError) {
                    // Submission was discarded, add a warning.
                    const message = this.translate.instant('core.warningofflinedatadeleted', {
                        component: this.componentTranslate,
                        name: workshop.name,
                        error: discardError
                    });

                    if (result.warnings.indexOf(message) == -1) {
                        result.warnings.push(message);
                    }
                }
            });
        });
    }

    /**
     * Synchronize an assessment.
     *
     * @param  {any}    workshop   Workshop.
     * @param  {any}    assessment Assessment offline data.
     * @param  {any}    result     Object with the result of the sync.
     * @param  {string} siteId     Site ID.
     * @return {Promise<any>}      Promise resolved if success, rejected otherwise.
     */
    protected syncAssessment(workshop: any, assessmentData: any, result: any, siteId: string): Promise<any> {
        let discardError;
        const assessmentId = assessmentData.assessmentid;

        const timePromise = this.workshopProvider.getAssessment(workshop.id, assessmentId, siteId).then((assessment) => {
            return assessment.timemodified;
        }).catch(() => {
            return -1;
        });

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= assessmentData.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_workshop.warningassessmentmodified');

                return this.workshopOffline.deleteAssessment(workshop.id, assessmentId, siteId);
            }

            let fileProm;
            const inputData = assessmentData.inputdata;

            // Upload attachments first if any.
            if (inputData.feedbackauthorattachmentsid) {
                fileProm = this.workshopHelper.getAssessmentFilesFromOfflineFilesObject(inputData.feedbackauthorattachmentsid,
                        workshop.id, assessmentId, siteId).then((files) => {
                    return this.workshopHelper.uploadOrStoreAssessmentFiles(workshop.id, assessmentId, files, false, siteId);
                });
            } else {
                // Remove all files.
                fileProm = this.workshopHelper.uploadOrStoreAssessmentFiles(workshop.id, assessmentId, [], false, siteId);
            }

            return fileProm.then((attachmentsId) => {
                inputData.feedbackauthorattachmentsid = attachmentsId || 0;

                return this.workshopProvider.updateAssessmentOnline(assessmentId, inputData, siteId);
            }).catch((error) => {
                if (error && this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = this.textUtils.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    return Promise.reject(error);
                }
            }).then(() => {
                // Delete the offline data.
                result.updated = true;

                return this.workshopOffline.deleteAssessment(workshop.id, assessmentId, siteId).then(() => {
                    this.workshopHelper.deleteAssessmentStoredFiles(workshop.id, assessmentId, siteId);
                });
            });
        }).then(() => {
            if (discardError) {
                // Assessment was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
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
     * @param  {any}    workshop Workshop.
     * @param  {any}    evaluate Submission evaluation offline data.
     * @param  {any}    result   Object with the result of the sync.
     * @param  {string} siteId   Site ID.
     * @return {Promise<any>}    Promise resolved if success, rejected otherwise.
     */
    protected syncEvaluateSubmission(workshop: any, evaluate: any, result: any, siteId: string): Promise<any> {
        let discardError;
        const submissionId = evaluate.submissionid;

        const timePromise = this.workshopProvider.getSubmission(workshop.id, submissionId, siteId).then((submission) => {
            return submission.timemodified;
        }).catch(() => {
            return -1;
        });

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= evaluate.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_workshop.warningsubmissionmodified');

                return this.workshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);
            }

            return this.workshopProvider.evaluateSubmissionOnline(submissionId, evaluate.feedbacktext, evaluate.published,
                evaluate.gradeover, siteId).catch((error) => {
                if (error && this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = this.textUtils.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    return Promise.reject(error);
                }
            }).then(() => {
                // Delete the offline data.
                result.updated = true;

                return this.workshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);
            });
        }).then(() => {
            if (discardError) {
                // Assessment was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
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
     * @param  {any}    workshop Workshop.
     * @param  {any}    evaluate Assessment evaluation offline data.
     * @param  {any}    result   Object with the result of the sync.
     * @param  {string} siteId   Site ID.
     * @return {Promise<any>}    Promise resolved if success, rejected otherwise.
     */
    protected syncEvaluateAssessment(workshop: any, evaluate: any, result: any, siteId: string): Promise<any> {
        let discardError;
        const assessmentId = evaluate.assessmentid;

        const timePromise = this.workshopProvider.getAssessment(workshop.id, assessmentId, siteId).then((assessment) => {
            return assessment.timemodified;
        }).catch(() => {
            return -1;
        });

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= evaluate.timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_workshop.warningassessmentmodified');

                return this.workshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);
            }

            return this.workshopProvider.evaluateAssessmentOnline(assessmentId, evaluate.feedbacktext, evaluate.weight,
                evaluate.gradinggradeover, siteId).catch((error) => {
                if (error && this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = this.textUtils.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    return Promise.reject(error);
                }
            }).then(() => {
                // Delete the offline data.
                result.updated = true;

                return this.workshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);
            });
        }).then(() => {
            if (discardError) {
                // Assessment was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
                    name: workshop.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }
        });
    }
}
