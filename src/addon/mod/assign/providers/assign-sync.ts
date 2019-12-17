// (C) Copyright 2015 Moodle Pty Ltd.
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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { AddonModAssignProvider, AddonModAssignAssign } from './assign';
import { AddonModAssignOfflineProvider } from './assign-offline';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';

/**
 * Data returned by an assign sync.
 */
export interface AddonModAssignSyncResult {
    /**
     * List of warnings.
     */
    warnings: string[];

    /**
     * Whether data was updated in the site.
     */
    updated: boolean;
}

/**
 * Service to sync assigns.
 */
@Injectable()
export class AddonModAssignSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_assign_autom_synced';

    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            translate: TranslateService,
            timeUtils: CoreTimeUtilsProvider,
            protected courseProvider: CoreCourseProvider,
            protected eventsProvider: CoreEventsProvider,
            protected assignProvider: AddonModAssignProvider,
            protected assignOfflineProvider: AddonModAssignOfflineProvider,
            protected utils: CoreUtilsProvider,
            protected submissionDelegate: AddonModAssignSubmissionDelegate,
            protected feedbackDelegate: AddonModAssignFeedbackDelegate,
            protected gradesHelper: CoreGradesHelperProvider,
            protected logHelper: CoreCourseLogHelperProvider) {

        super('AddonModAssignSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('assign');
    }

    /**
     * Convenience function to get scale selected option.
     *
     * @param options Possible options.
     * @param selected Selected option to search.
     * @return Index of the selected option.
     */
    protected getSelectedScaleId(options: string, selected: string): number {
        let optionsList = options.split(',');

        optionsList = optionsList.map((value) => {
            return value.trim();
        });

        optionsList.unshift('');

        const index = options.indexOf(selected) || 0;
        if (index < 0) {
            return 0;
        }

        return index;
    }

    /**
     * Check if an assignment has data to synchronize.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it has data to sync.
     */
    hasDataToSync(assignId: number, siteId?: string): Promise<boolean> {
        return this.assignOfflineProvider.hasAssignOfflineData(assignId, siteId);
    }

    /**
     * Try to synchronize all the assignments in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllAssignments(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all assignments', this.syncAllAssignmentsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all assignments on a site.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllAssignmentsFunc(siteId?: string, force?: boolean): Promise<any> {
        // Get all assignments that have offline data.
        return this.assignOfflineProvider.getAllAssigns(siteId).then((assignIds) => {
            // Sync all assignments that haven't been synced for a while.
            const promises = assignIds.map((assignId) => {
                const promise = force ? this.syncAssign(assignId, siteId) : this.syncAssignIfNeeded(assignId, siteId);

                return promise.then((data) => {
                    if (data && data.updated) {
                        // Sync done. Send event.
                        this.eventsProvider.trigger(AddonModAssignSyncProvider.AUTO_SYNCED, {
                            assignId: assignId,
                            warnings: data.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Sync an assignment only if a certain time has passed since the last time.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the assign is synced or it doesn't need to be synced.
     */
    syncAssignIfNeeded(assignId: number, siteId?: string): Promise<void | AddonModAssignSyncResult> {
        return this.isSyncNeeded(assignId, siteId).then((needed) => {
            if (needed) {
                return this.syncAssign(assignId, siteId);
            }
        });
    }

    /**
     * Try to synchronize an assign.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success.
     */
    syncAssign(assignId: number, siteId?: string): Promise<AddonModAssignSyncResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises: Promise<any>[] = [],
            result: AddonModAssignSyncResult = {
                warnings: [],
                updated: false
            };
        let assign: AddonModAssignAssign,
            courseId: number,
            syncPromise: Promise<any>;

        if (this.isSyncing(assignId, siteId)) {
            // There's already a sync ongoing for this assign, return the promise.
            return this.getOngoingSync(assignId, siteId);
        }

        // Verify that assign isn't blocked.
        if (this.syncProvider.isBlocked(AddonModAssignProvider.COMPONENT, assignId, siteId)) {
            this.logger.debug('Cannot sync assign ' + assignId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync assign ' + assignId + ' in site ' + siteId);

        // Get offline submissions to be sent.
        promises.push(this.assignOfflineProvider.getAssignSubmissions(assignId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Get offline submission grades to be sent.
        promises.push(this.assignOfflineProvider.getAssignSubmissionsGrade(assignId, siteId).catch(() => {
            // No offline data found, return empty array.
            return [];
        }));

        // Sync offline logs.
        promises.push(this.logHelper.syncIfNeeded(AddonModAssignProvider.COMPONENT, assignId, siteId));

        syncPromise = Promise.all(promises).then((results) => {
            const submissions = results[0],
                grades = results[1];

            if (!submissions.length && !grades.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            courseId = submissions.length > 0 ? submissions[0].courseid : grades[0].courseid;

            return this.assignProvider.getAssignmentById(courseId, assignId, false, siteId).then((assignData) => {
                assign = assignData;

                const promises = [];

                submissions.forEach((submission) => {
                    promises.push(this.syncSubmission(assign, submission, result.warnings, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                grades.forEach((grade) => {
                    promises.push(this.syncSubmissionGrade(assign, grade, result.warnings, courseId, siteId).then(() => {
                        result.updated = true;
                    }));
                });

                return Promise.all(promises);
            }).then(() => {
                if (result.updated) {
                    // Data has been sent to server. Now invalidate the WS calls.
                    return this.assignProvider.invalidateContent(assign.cmid, courseId, siteId).catch(() => {
                        // Ignore errors.
                    });
                }
            });
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(assignId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the result.
            return result;
        });

        return this.addOngoingSync(assignId, syncPromise, siteId);
    }

    /**
     * Synchronize a submission.
     *
     * @param assign Assignment.
     * @param offlineData Submission offline data.
     * @param warnings List of warnings.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    protected syncSubmission(assign: AddonModAssignAssign, offlineData: any, warnings: string[], siteId?: string): Promise<any> {
        const userId = offlineData.userid,
            pluginData = {};
        let discardError,
            submission;

        return this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId).then((status) => {
            const promises = [];

            submission = this.assignProvider.getSubmissionObjectFromAttempt(assign, status.lastattempt);

            if (submission.timemodified != offlineData.onlinetimemodified) {
                // The submission was modified in Moodle, discard the submission.
                discardError = this.translate.instant('addon.mod_assign.warningsubmissionmodified');

                return;
            }

            submission.plugins.forEach((plugin) => {
                promises.push(this.submissionDelegate.preparePluginSyncData(assign, submission, plugin, offlineData, pluginData,
                        siteId));
            });

            return Promise.all(promises).then(() => {
                // Now save the submission.
                let promise;

                if (!Object.keys(pluginData).length) {
                    // Nothing to save.
                    promise = Promise.resolve();
                } else {
                    promise = this.assignProvider.saveSubmissionOnline(assign.id, pluginData, siteId);
                }

                return promise.then(() => {
                    if (assign.submissiondrafts && offlineData.submitted) {
                        // The user submitted the assign manually. Submit it for grading.
                        return this.assignProvider.submitForGradingOnline(assign.id, offlineData.submissionstatement, siteId);
                    }
                }).then(() => {
                    // Submission data sent, update cached data. No need to block the user for this.
                    this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId);
                });
            }).catch((error) => {
                if (error && this.utils.isWebServiceError(error)) {
                    // A WebService has thrown an error, this means it cannot be submitted. Discard the submission.
                    discardError = this.textUtils.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    return Promise.reject(error);
                }
            });
        }).then(() => {
            // Delete the offline data.
            return this.assignOfflineProvider.deleteSubmission(assign.id, userId, siteId).then(() => {
                const promises = [];

                submission.plugins.forEach((plugin) => {
                    promises.push(this.submissionDelegate.deletePluginOfflineData(assign, submission, plugin, offlineData, siteId));
                });

                return Promise.all(promises);
            });
        }).then(() => {
            if (discardError) {
                // Submission was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
                    name: assign.name,
                    error: discardError
                });

                if (warnings.indexOf(message) == -1) {
                    warnings.push(message);
                }
            }
        });
    }

    /**
     * Synchronize a submission grade.
     *
     * @param assign Assignment.
     * @param offlineData Submission grade offline data.
     * @param warnings List of warnings.
     * @param courseId Course Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    protected syncSubmissionGrade(assign: AddonModAssignAssign, offlineData: any, warnings: string[], courseId: number,
            siteId?: string): Promise<any> {

        const userId = offlineData.userid;
        let discardError;

        return this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId).then((status) => {
            const timemodified = status.feedback && (status.feedback.gradeddate || status.feedback.grade.timemodified);

            if (timemodified > offlineData.timemodified) {
                // The submission grade was modified in Moodle, discard it.
                discardError = this.translate.instant('addon.mod_assign.warningsubmissiongrademodified');

                return;
            }

            // If grade has been modified from gradebook, do not use offline.
            return this.gradesHelper.getGradeModuleItems(courseId, assign.cmid, userId, undefined, siteId, true).then((grades) => {
                return this.courseProvider.getModuleBasicGradeInfo(assign.cmid, siteId).then((gradeInfo) => {

                    // Override offline grade and outcomes based on the gradebook data.
                    grades.forEach((grade) => {
                        if (grade.gradedategraded >= offlineData.timemodified) {
                            if (!grade.outcomeid && !grade.scaleid) {
                                if (gradeInfo && gradeInfo.scale) {
                                    offlineData.grade = this.getSelectedScaleId(gradeInfo.scale, grade.gradeformatted);
                                } else {
                                    offlineData.grade = parseFloat(grade.gradeformatted) || null;
                                }
                            } else if (grade.outcomeid && this.assignProvider.isOutcomesEditEnabled() && gradeInfo.outcomes) {
                                gradeInfo.outcomes.forEach((outcome, index) => {
                                    if (outcome.scale && grade.itemnumber == index) {
                                        offlineData.outcomes[grade.itemnumber] = this.getSelectedScaleId(outcome.scale,
                                                outcome.selected);
                                    }
                                });
                            }
                        }
                    });
                });
            }).then(() => {
                // Now submit the grade.
                return this.assignProvider.submitGradingFormOnline(assign.id, userId, offlineData.grade, offlineData.attemptnumber,
                        offlineData.addattempt, offlineData.workflowstate, offlineData.applytoall, offlineData.outcomes,
                        offlineData.plugindata, siteId).then(() => {
                    // Grades sent.
                    // Discard grades drafts.
                    const promises = [];
                    if (status.feedback && status.feedback.plugins) {
                        status.feedback.plugins.forEach((plugin) => {
                            promises.push(this.feedbackDelegate.discardPluginFeedbackData(assign.id, userId, plugin, siteId));
                        });
                    }

                    // Update cached data.
                    promises.push(this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId));

                    return Promise.all(promises);
                }).catch((error) => {
                    if (error && this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means it cannot be submitted. Discard the offline data.
                        discardError = this.textUtils.getErrorMessageFromError(error);
                    } else {
                        // Couldn't connect to server, reject.
                    return Promise.reject(error);
                    }
                });
            });
        }).then(() => {
            // Delete the offline data.
            return this.assignOfflineProvider.deleteSubmissionGrade(assign.id, userId, siteId);
        }).then(() => {
            if (discardError) {
                // Submission grade was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
                    name: assign.name,
                    error: discardError
                });

                if (warnings.indexOf(message) == -1) {
                    warnings.push(message);
                }
            }
        });
    }
}
