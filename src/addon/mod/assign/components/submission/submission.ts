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

import { Component, Input, OnInit, OnDestroy, ViewChild, Optional, ViewChildren, QueryList } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreLangProvider } from '@providers/lang';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreFileUploaderHelperProvider } from '@core/fileuploader/providers/helper';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreUserProvider } from '@core/user/providers/user';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmissionFeedback, AddonModAssignSubmission,
    AddonModAssignSubmissionAttempt, AddonModAssignSubmissionPreviousAttempt, AddonModAssignPlugin
} from '../../providers/assign';
import { AddonModAssignHelperProvider } from '../../providers/helper';
import { AddonModAssignOfflineProvider } from '../../providers/assign-offline';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonModAssignSubmissionPluginComponent } from '../submission-plugin/submission-plugin';

/**
 * Component that displays an assignment submission.
 */
@Component({
    selector: 'addon-mod-assign-submission',
    templateUrl: 'addon-mod-assign-submission.html',
})
export class AddonModAssignSubmissionComponent implements OnInit, OnDestroy {
    @ViewChild(CoreTabsComponent) tabs: CoreTabsComponent;
    @ViewChildren(AddonModAssignSubmissionPluginComponent) submissionComponents: QueryList<AddonModAssignSubmissionPluginComponent>;

    @Input() courseId: number; // Course ID the submission belongs to.
    @Input() moduleId: number; // Module ID the submission belongs to.
    @Input() submitId: number; // User that did the submission.
    @Input() blindId: number; // Blinded user ID (if it's blinded).
    @Input() showGrade: boolean | string; // Whether to display the grade tab at start.

    loaded: boolean; // Whether data has been loaded.
    selectedTab: number; // Tab selected on start.
    assign: AddonModAssignAssign; // The assignment the submission belongs to.
    userSubmission: AddonModAssignSubmission; // The submission object.
    isSubmittedForGrading: boolean; // Whether the submission has been submitted for grading.
    submitModel: any = {}; // Model where to store the data to submit (for grading).
    feedback: AddonModAssignSubmissionFeedbackFormatted; // The feedback.
    hasOffline: boolean; // Whether there is offline data.
    submittedOffline: boolean; // Whether it was submitted in offline.
    fromDate: string; // Readable date when the assign started accepting submissions.
    currentAttempt: number; // The current attempt number.
    maxAttemptsText: string; // The text for maximum attempts.
    blindMarking: boolean; // Whether blind marking is enabled.
    user: any; // The user.
    lastAttempt: AddonModAssignSubmissionAttemptFormatted; // The last attempt.
    membersToSubmit: any[]; // Team members that need to submit the assignment.
    canSubmit: boolean; // Whether the user can submit for grading.
    canEdit: boolean; // Whether the user can edit the submission.
    submissionStatement: string; // The submission statement.
    showErrorStatementEdit: boolean; // Whether to show an error in edit due to submission statement.
    showErrorStatementSubmit: boolean; // Whether to show an error in submit due to submission statement.
    gradingStatusTranslationId: string; // Key of the text to display for the grading status.
    gradingColor: string; // Color to apply to the grading status.
    workflowStatusTranslationId: string; // Key of the text to display for the workflow status.
    submissionPlugins: AddonModAssignPlugin[]; // List of submission plugins.
    timeRemaining: string; // Message about time remaining.
    timeRemainingClass: string; // Class to apply to time remaining message.
    statusTranslated: string; // Status.
    statusColor: string; // Color to apply to the status.
    unsupportedEditPlugins: string[]; // List of submission plugins that don't support edit.
    grade: any; // Data about the grade.
    grader: any; // Profile of the teacher that graded the submission.
    gradeInfo: any; // Grade data for the assignment, retrieved from the server.
    isGrading: boolean; // Whether the user is grading.
    canSaveGrades: boolean; // Whether the user can save the grades.
    allowAddAttempt: boolean; // Allow adding a new attempt when grading.
    gradeUrl: string; // URL to grade in browser.

    // Some constants.
    statusNew = AddonModAssignProvider.SUBMISSION_STATUS_NEW;
    statusReopened = AddonModAssignProvider.SUBMISSION_STATUS_REOPENED;
    attemptReopenMethodNone = AddonModAssignProvider.ATTEMPT_REOPEN_METHOD_NONE;
    unlimitedAttempts = AddonModAssignProvider.UNLIMITED_ATTEMPTS;

    protected siteId: string; // Current site ID.
    protected currentUserId: number; // Current user ID.
    protected previousAttempt: AddonModAssignSubmissionPreviousAttempt; // The previous attempt.
    protected isPreviousAttemptEmpty: boolean; // Whether the previous attempt contains an empty submission.
    protected submissionStatusAvailable: boolean; // Whether we were able to retrieve the submission status.
    protected originalGrades: any = {}; // Object with the original grade data, to check for changes.
    protected isDestroyed: boolean; // Whether the component has been destroyed.

    constructor(protected navCtrl: NavController, protected appProvider: CoreAppProvider, protected domUtils: CoreDomUtilsProvider,
            sitesProvider: CoreSitesProvider, protected syncProvider: CoreSyncProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected textUtils: CoreTextUtilsProvider, protected translate: TranslateService, protected utils: CoreUtilsProvider,
            protected eventsProvider: CoreEventsProvider, protected courseProvider: CoreCourseProvider,
            protected fileUploaderHelper: CoreFileUploaderHelperProvider, protected gradesHelper: CoreGradesHelperProvider,
            protected userProvider: CoreUserProvider, protected groupsProvider: CoreGroupsProvider,
            protected langProvider: CoreLangProvider, protected assignProvider: AddonModAssignProvider,
            protected assignHelper: AddonModAssignHelperProvider, protected assignOfflineProvider: AddonModAssignOfflineProvider,
            @Optional() protected splitviewCtrl: CoreSplitViewComponent) {

        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.selectedTab = this.showGrade && this.showGrade !== 'false' ? 1 : 0;
        this.isSubmittedForGrading = !!this.submitId;

        this.loadData();
    }

    /**
     * Calculate the time remaining message and class.
     *
     * @param response Response of get submission status.
     */
    protected calculateTimeRemaining(response: any): void {
        if (this.assign.duedate > 0) {
            const time = this.timeUtils.timestamp(),
                dueDate = response.lastattempt && response.lastattempt.extensionduedate ?
                    response.lastattempt.extensionduedate : this.assign.duedate,
                timeRemaining = dueDate - time;

            if (timeRemaining <= 0) {
                if (!this.userSubmission || this.userSubmission.status != AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {

                    if ((response.lastattempt && response.lastattempt.submissionsenabled) ||
                            (response.gradingsummary && response.gradingsummary.submissionsenabled)) {
                        this.timeRemaining = this.translate.instant('addon.mod_assign.overdue',
                                {$a: this.timeUtils.formatDuration(-timeRemaining, 3) });
                        this.timeRemainingClass = 'overdue';
                    } else {
                        this.timeRemaining = this.translate.instant('addon.mod_assign.duedatereached');
                        this.timeRemainingClass = '';
                    }
                } else {

                    const timeSubmittedDiff = this.userSubmission.timemodified - dueDate;
                    if (timeSubmittedDiff > 0) {
                        this.timeRemaining = this.translate.instant('addon.mod_assign.submittedlate',
                                {$a: this.timeUtils.formatDuration(timeSubmittedDiff, 2) });
                        this.timeRemainingClass = 'latesubmission';
                    } else {
                        this.timeRemaining = this.translate.instant('addon.mod_assign.submittedearly',
                                {$a: this.timeUtils.formatDuration(-timeSubmittedDiff, 2) });
                        this.timeRemainingClass = 'earlysubmission';
                    }
                }
            } else {
                this.timeRemaining = this.timeUtils.formatDuration(timeRemaining, 3);
                this.timeRemainingClass = '';
            }
        } else {
            this.timeRemaining = '';
            this.timeRemainingClass = '';
        }
    }

    /**
     * Check if the user can leave the view. If there are changes to be saved, it will ask for confirm.
     *
     * @return Promise resolved if can leave the view, rejected otherwise.
     */
    canLeave(): Promise<void> {
        // Check if there is data to save.
        return this.hasDataToSave().then((modified) => {
            if (modified) {
                // Modified, confirm user wants to go back.
                return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit')).then(() => {
                    return this.discardDrafts().catch(() => {
                        // Ignore errors.
                    });
                });
            }
        });
    }

    /**
     * Copy a previous attempt and then go to edit.
     */
    copyPrevious(): void {
        if (!this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        if (!this.previousAttempt) {
            // Cannot access previous attempts, just go to edit.
            return this.goToEdit();
        }

        const previousSubmission = this.previousAttempt.submission;
        let modal = this.domUtils.showModalLoading();

        this.assignHelper.getSubmissionSizeForCopy(this.assign, previousSubmission).catch(() => {
            // Error calculating size, return -1.
            return -1;
        }).then((size) => {
            modal.dismiss();

            // Confirm action.
            return this.fileUploaderHelper.confirmUploadFile(size, true);
        }).then(() => {
            // User confirmed, copy the attempt.
            modal = this.domUtils.showModalLoading('core.sending', true);

            this.assignHelper.copyPreviousAttempt(this.assign, previousSubmission).then(() => {
                // Now go to edit.
                this.goToEdit();

                if (!this.assign.submissiondrafts) {
                    // No drafts allowed, so it was submitted. Trigger event.
                    this.eventsProvider.trigger(AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT, {
                        assignmentId: this.assign.id,
                        submissionId: this.userSubmission.id,
                        userId: this.currentUserId
                    }, this.siteId);
                } else {
                    // Invalidate and refresh data to update this view.
                    this.invalidateAndRefresh();
                }
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.error', true);
            }).finally(() => {
                modal.dismiss();
            });
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Discard feedback drafts.
     *
     * @return Promise resolved when done.
     */
    protected discardDrafts(): Promise<any> {
        if (this.feedback && this.feedback.plugins) {
            return this.assignHelper.discardFeedbackPluginData(this.assign.id, this.submitId, this.feedback);
        }

        return Promise.resolve();
    }

    /**
     * Go to the page to add or edit submission.
     */
    goToEdit(): void {
        this.navCtrl.push('AddonModAssignEditPage', {
            moduleId: this.moduleId,
            courseId: this.courseId,
            userId: this.submitId,
            blindId: this.blindId
        });
    }

    /**
     * Check if there's data to save (grade).
     *
     * @return Promise resolved with boolean: whether there's data to save.
     */
    protected hasDataToSave(): Promise<boolean> {
        if (!this.canSaveGrades || !this.loaded) {
            return Promise.resolve(false);
        }

        // Check if numeric grade and toggles changed.
        if (this.originalGrades.grade != this.grade.grade || this.originalGrades.addAttempt != this.grade.addAttempt ||
                this.originalGrades.applyToAll != this.grade.applyToAll) {
            return Promise.resolve(true);
        }

        // Check if outcomes changed.
        if (this.gradeInfo && this.gradeInfo.outcomes) {
            for (const x in this.gradeInfo.outcomes) {
                const outcome = this.gradeInfo.outcomes[x];

                if (this.originalGrades.outcomes[outcome.id] == 'undefined' ||
                        this.originalGrades.outcomes[outcome.id] != outcome.selectedId) {
                    return Promise.resolve(true);
                }
            }
        }

        if (this.feedback && this.feedback.plugins) {
            return this.assignHelper.hasFeedbackDataChanged(this.assign, this.userSubmission, this.feedback, this.submitId)
                    .catch(() => {
                // Error ocurred, consider there are no changes.
                return false;
            });
        }

        return Promise.resolve(false);
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.tabs && this.tabs.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.tabs && this.tabs.ionViewDidLeave();
    }

    /**
     * Invalidate and refresh data.
     *
     * @return Promise resolved when done.
     */
    invalidateAndRefresh(): Promise<any> {
        this.loaded = false;

        const promises = [];

        promises.push(this.assignProvider.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(this.assignProvider.invalidateSubmissionStatusData(this.assign.id, this.submitId, undefined,
                !!this.blindId));
            promises.push(this.assignProvider.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(this.assignProvider.invalidateListParticipantsData(this.assign.id));
        }
        promises.push(this.gradesHelper.invalidateGradeModuleItems(this.courseId, this.submitId));
        promises.push(this.courseProvider.invalidateModule(this.moduleId));

        // Invalidate plugins.
        if (this.submissionComponents && this.submissionComponents.length) {
            this.submissionComponents.forEach((component) => {
                promises.push(component.invalidate());
            });
        }

        return Promise.all(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.loadData();
        });
    }

    /**
     * Load the data to render the submission.
     *
     * @return Promise resolved when done.
     */
    protected loadData(): Promise<any> {
        let isBlind = !!this.blindId;

        this.previousAttempt = undefined;
        this.isPreviousAttemptEmpty = true;

        if (!this.submitId) {
            this.submitId = this.currentUserId;
            isBlind = false;
        }

        // Get the assignment.
        return this.assignProvider.getAssignment(this.courseId, this.moduleId).then((assign) => {
            const time = this.timeUtils.timestamp(),
                promises = [];

            this.assign = assign;

            if (assign.allowsubmissionsfromdate && assign.allowsubmissionsfromdate >= time) {
                this.fromDate = this.timeUtils.userDate(assign.allowsubmissionsfromdate * 1000);
            }

            this.currentAttempt = 0;
            this.maxAttemptsText = this.translate.instant('addon.mod_assign.unlimitedattempts');
            this.blindMarking = this.isSubmittedForGrading && assign.blindmarking && !assign.revealidentities;

            if (!this.blindMarking && this.submitId != this.currentUserId) {
                promises.push(this.userProvider.getProfile(this.submitId, this.courseId).then((profile) => {
                    this.user = profile;
                }));
            }

            // Check if there's any offline data for this submission.
            promises.push(this.assignOfflineProvider.getSubmission(assign.id, this.submitId).then((data) => {
                this.hasOffline = data && data.plugindata && Object.keys(data.plugindata).length > 0;
                this.submittedOffline = data && data.submitted;
            }).catch(() => {
                // No offline data found.
                this.hasOffline = false;
                this.submittedOffline = false;
            }));

            return Promise.all(promises);
        }).then(() => {
            // Get submission status.
            return this.assignProvider.getSubmissionStatusWithRetry(this.assign, this.submitId, undefined, isBlind);
        }).then((response) => {

            const promises = [];

            this.submissionStatusAvailable = true;
            this.lastAttempt = response.lastattempt;
            this.membersToSubmit = [];

            // Search the previous attempt.
            if (response.previousattempts && response.previousattempts.length > 0) {
                const previousAttempts = response.previousattempts.sort((a, b) => {
                    return a.attemptnumber - b.attemptnumber;
                });
                this.previousAttempt = previousAttempts[previousAttempts.length - 1];
                this.isPreviousAttemptEmpty = this.assignHelper.isSubmissionEmpty(this.assign, this.previousAttempt.submission);
            }

            // Treat last attempt.
            this.treatLastAttempt(response, promises);

            // Calculate the time remaining.
            this.calculateTimeRemaining(response);

            // Load the feedback.
            promises.push(this.loadFeedback(response.feedback));

            // Check if there's any unsupported plugin for editing.
            if (!this.userSubmission || !this.userSubmission.plugins) {
                // Submission not created yet, we have to use assign configs to detect the plugins used.
                this.userSubmission = this.assignHelper.createEmptySubmission();
                this.userSubmission.plugins = this.assignHelper.getPluginsEnabled(this.assign, 'assignsubmission');
            }

            // Get the submission plugins that don't support editing.
            promises.push(this.assignProvider.getUnsupportedEditPlugins(this.userSubmission.plugins).then((list) => {
                this.unsupportedEditPlugins = list;
            }));

            return Promise.all(promises);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting assigment data.');
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Load the data to render the feedback and grade.
     *
     * @param feedback The feedback data from the submission status.
     * @return Promise resolved when done.
     */
    protected loadFeedback(feedback: AddonModAssignSubmissionFeedback): Promise<any> {
        this.grade = {
            method: false,
            grade: false,
            gradebookGrade: false,
            modified: 0,
            gradingStatus: false,
            addAttempt : false,
            applyToAll: false,
            scale: false,
            lang: false,
            disabled: false
        };

        this.originalGrades =  {
            grade: false,
            addAttempt: false,
            applyToAll: false,
            outcomes: {}
        };

        if (feedback) {
            this.feedback = feedback;

            // If we have data about the grader, get its profile.
            if (feedback.grade && feedback.grade.grader > 0) {
                this.userProvider.getProfile(feedback.grade.grader, this.courseId).then((profile) => {
                    this.grader = profile;
                }).catch(() => {
                    // Ignore errors.
                });
            } else {
                delete this.grader;
            }

            // Check if the grade uses advanced grading.
            if (feedback.gradefordisplay) {
                const position = feedback.gradefordisplay.indexOf('class="advancedgrade"');
                if (position > -1) {
                    this.feedback.advancedgrade = true;
                }
            }

            // Do not override already loaded grade.
            if (feedback.grade && feedback.grade.grade && !this.grade.grade) {
                const parsedGrade = parseFloat(feedback.grade.grade);
                this.grade.grade = parsedGrade >= 0 ? parsedGrade : null;
                this.grade.gradebookGrade = this.utils.formatFloat(this.grade.grade);
                this.originalGrades.grade = this.grade.grade;
            }
        } else {
            // If no feedback, always show Submission.
            this.selectedTab = 0;
            this.tabs.selectTab(0);
        }

        this.grade.gradingStatus = this.lastAttempt && this.lastAttempt.gradingstatus;

        // Get the grade for the assign.
        return this.courseProvider.getModuleBasicGradeInfo(this.moduleId).then((gradeInfo) => {
            this.gradeInfo = gradeInfo;

            if (!gradeInfo) {
                return;
            }

            // Make sure outcomes is an array.
            gradeInfo.outcomes = gradeInfo.outcomes || [];

            if (!this.isDestroyed) {
                // Block the assignment.
                this.syncProvider.blockOperation(AddonModAssignProvider.COMPONENT, this.assign.id);
            }

            // Treat the grade info.
            return this.treatGradeInfo();
        }).then(() => {
            if (!this.isGrading) {
                return;
            }

            const isManual = this.assign.attemptreopenmethod == AddonModAssignProvider.ATTEMPT_REOPEN_METHOD_MANUAL,
                isUnlimited = this.assign.maxattempts == AddonModAssignProvider.UNLIMITED_ATTEMPTS,
                isLessThanMaxAttempts = this.userSubmission && (this.userSubmission.attemptnumber < (this.assign.maxattempts - 1));

            this.allowAddAttempt = isManual && (!this.userSubmission || isUnlimited || isLessThanMaxAttempts);

            if (this.assign.teamsubmission) {
                this.grade.applyToAll = true;
                this.originalGrades.applyToAll = true;
            }
            if (this.assign.markingworkflow && this.grade.gradingStatus) {
                this.workflowStatusTranslationId =
                    this.assignProvider.getSubmissionGradingStatusTranslationId(this.grade.gradingStatus);
            }

            if (this.isGrading && this.lastAttempt.gradingstatus == 'graded' && !this.assign.markingworkflow) {
                if (this.feedback.gradeddate < this.lastAttempt.submission.timemodified) {
                    this.lastAttempt.gradingstatus = AddonModAssignProvider.GRADED_FOLLOWUP_SUBMIT;

                    // Get grading text and color.
                    this.gradingStatusTranslationId = this.assignProvider.getSubmissionGradingStatusTranslationId(
                            this.lastAttempt.gradingstatus);
                    this.gradingColor = this.assignProvider.getSubmissionGradingStatusColor(this.lastAttempt.gradingstatus);

                }
            }

            if (!this.feedback || !this.feedback.plugins) {
                // Feedback plugins not present, we have to use assign configs to detect the plugins used.
                this.feedback = this.assignHelper.createEmptyFeedback();
                this.feedback.plugins = this.assignHelper.getPluginsEnabled(this.assign, 'assignfeedback');
            }

            // Check if there's any offline data for this submission.
            if (this.canSaveGrades) {
                // Submission grades aren't identified by attempt number so it can retrieve the feedback for a previous attempt.
                // The app will not treat that as an special case.
                return this.assignOfflineProvider.getSubmissionGrade(this.assign.id, this.submitId).catch(() => {
                    // Grade not found.
                }).then((data) => {

                    // Load offline grades.
                    if (data && (!feedback || !feedback.gradeddate || feedback.gradeddate < data.timemodified)) {
                        // If grade has been modified from gradebook, do not use offline.
                        if (this.grade.modified < data.timemodified) {
                            this.grade.grade = !this.grade.scale ? this.utils.formatFloat(data.grade) : data.grade;
                            this.gradingStatusTranslationId = 'addon.mod_assign.gradenotsynced';
                            this.gradingColor = '';
                            this.originalGrades.grade = this.grade.grade;
                        }

                        this.grade.applyToAll = data.applytoall;
                        this.grade.addAttempt = data.addattempt;
                        this.originalGrades.applyToAll = this.grade.applyToAll;
                        this.originalGrades.addAttempt = this.grade.addAttempt;

                        if (data.outcomes && Object.keys(data.outcomes).length) {
                            this.gradeInfo.outcomes.forEach((outcome) => {
                                if (typeof data.outcomes[outcome.itemNumber] != 'undefined') {
                                    // If outcome has been modified from gradebook, do not use offline.
                                    if (outcome.modified < data.timemodified) {
                                        outcome.selectedId = data.outcomes[outcome.itemNumber];
                                        this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                // User cannot save grades in the app. Load the URL to grade it in browser.
                return this.courseProvider.getModule(this.moduleId, this.courseId, undefined, true).then((mod) => {
                    this.gradeUrl = mod.url + '&action=grader&userid=' + this.submitId;
                });
            }
        });
    }

    /**
     * Set the submission status name and class.
     *
     * @param status Submission status.
     */
    protected setStatusNameAndClass(status: any): void {
        if (this.hasOffline || this.submittedOffline) {
            // Offline data.
            this.statusTranslated = this.translate.instant('core.notsent');
            this.statusColor = 'warning';
        } else if (!this.assign.teamsubmission) {

            // Single submission.
            if (this.userSubmission && this.userSubmission.status != this.statusNew) {
                this.statusTranslated = this.translate.instant('addon.mod_assign.submissionstatus_' + this.userSubmission.status);
                this.statusColor = this.assignProvider.getSubmissionStatusColor(this.userSubmission.status);
            } else {
                if (!status.lastattempt.submissionsenabled) {
                    this.statusTranslated = this.translate.instant('addon.mod_assign.noonlinesubmissions');
                    this.statusColor = this.assignProvider.getSubmissionStatusColor('noonlinesubmissions');
                } else {
                    this.statusTranslated = this.translate.instant('addon.mod_assign.noattempt');
                    this.statusColor = this.assignProvider.getSubmissionStatusColor('noattempt');
                }
            }
        } else {

            // Team submission.
            if (!status.lastattempt.submissiongroup && this.assign.preventsubmissionnotingroup) {
                this.statusTranslated = this.translate.instant('addon.mod_assign.nosubmission');
                this.statusColor = this.assignProvider.getSubmissionStatusColor('nosubmission');
            } else if (this.userSubmission && this.userSubmission.status != this.statusNew) {
                this.statusTranslated = this.translate.instant('addon.mod_assign.submissionstatus_' + this.userSubmission.status);
                this.statusColor = this.assignProvider.getSubmissionStatusColor(this.userSubmission.status);
            } else {
                if (!status.lastattempt.submissionsenabled) {
                    this.statusTranslated = this.translate.instant('addon.mod_assign.noonlinesubmissions');
                    this.statusColor = this.assignProvider.getSubmissionStatusColor('noonlinesubmissions');
                } else {
                    this.statusTranslated = this.translate.instant('addon.mod_assign.nosubmission');
                    this.statusColor = this.assignProvider.getSubmissionStatusColor('nosubmission');
                }
            }
        }
    }

    /**
     * Show advanced grade.
     */
    showAdvancedGrade(): void {
        if (this.feedback && this.feedback.advancedgrade) {
            this.textUtils.expandText(this.translate.instant('core.grades.grade'), this.feedback.gradefordisplay,
                    AddonModAssignProvider.COMPONENT, this.moduleId);
        }
    }

    /**
     * Submit for grading.
     *
     * @param acceptStatement Whether the statement has been accepted.
     */
    submitForGrading(acceptStatement: boolean): void {
        if (this.assign.requiresubmissionstatement && !acceptStatement) {
            this.domUtils.showErrorModal('addon.mod_assign.acceptsubmissionstatement', true);

            return;
        }

        // Ask for confirmation. @todo plugin precheck_submission
        this.domUtils.showConfirm(this.translate.instant('addon.mod_assign.confirmsubmission')).then(() => {
            const modal = this.domUtils.showModalLoading('core.sending', true);

            this.assignProvider.submitForGrading(this.assign.id, this.courseId, acceptStatement, this.userSubmission.timemodified,
                    this.hasOffline).then(() => {

                // Submitted, trigger event.
                this.eventsProvider.trigger(AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.userSubmission.id,
                    userId: this.currentUserId
                }, this.siteId);
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.error', true);
        });
    }

    /**
     * Submit a grade and feedback.
     *
     * @return Promise resolved when done.
     */
    submitGrade(): Promise<any> {
        // Check if there's something to be saved.
        return this.hasDataToSave().then((modified) => {
            if (!modified) {
                return;
            }

            const attemptNumber = this.userSubmission ? this.userSubmission.attemptnumber : -1,
                outcomes = {},
                // Scale "no grade" uses -1 instead of 0.
                grade = this.grade.scale && this.grade.grade == 0 ? -1 : this.utils.unformatFloat(this.grade.grade, true);

            if (grade === false) {
                // Grade is invalid.
                return Promise.reject(this.translate.instant('core.grades.badgrade'));
            }

            const modal = this.domUtils.showModalLoading('core.sending', true);
            let pluginPromise;

            this.gradeInfo.outcomes.forEach((outcome) => {
                if (outcome.itemNumber) {
                    outcomes[outcome.itemNumber] = outcome.selectedId;
                }
            });

            if (this.feedback && this.feedback.plugins) {
                pluginPromise = this.assignHelper.prepareFeedbackPluginData(this.assign.id, this.submitId, this.feedback);
            } else {
                pluginPromise = Promise.resolve({});
            }

            return pluginPromise.then((pluginData) => {
                // We have all the data, now send it.
                return this.assignProvider.submitGradingForm(this.assign.id, this.submitId, this.courseId, grade, attemptNumber,
                        this.grade.addAttempt, this.grade.gradingStatus, this.grade.applyToAll, outcomes, pluginData).then(() => {

                    // Data sent, discard draft.
                    return this.discardDrafts();
                }).finally(() => {
                    // Invalidate and refresh data.
                    this.invalidateAndRefresh();

                    this.eventsProvider.trigger(AddonModAssignProvider.GRADED_EVENT, {
                        assignmentId: this.assign.id,
                        submissionId: this.submitId,
                        userId: this.currentUserId
                    }, this.siteId);
                });
            }).finally(() => {
                // Select submission view.
                this.tabs.selectTab(0);
                modal.dismiss();
            });
        });
    }

    /**
     * Treat the grade info.
     *
     * @return Promise resolved when done.
     */
    protected treatGradeInfo(): Promise<any> {
        // Check if grading method is simple or not.
        if (this.gradeInfo.advancedgrading && this.gradeInfo.advancedgrading[0] &&
                typeof this.gradeInfo.advancedgrading[0].method != 'undefined') {
            this.grade.method = this.gradeInfo.advancedgrading[0].method || 'simple';
        } else {
            this.grade.method = 'simple';
        }

        this.isGrading = true;
        this.canSaveGrades = this.grade.method == 'simple'; // Grades can be saved if simple grading.

        if (this.gradeInfo.scale) {
            this.grade.scale = this.utils.makeMenuFromList(this.gradeInfo.scale, this.translate.instant('core.nograde'));
        } else {
            // Format the grade.
            this.grade.grade = this.utils.formatFloat(this.grade.grade);
            this.originalGrades.grade = this.grade.grade;

            // Get current language to format grade input field.
            this.langProvider.getCurrentLanguage().then((lang) => {
                this.grade.lang = lang;
            });
        }

        // Treat outcomes.
        if (this.assignProvider.isOutcomesEditEnabled()) {
            this.gradeInfo.outcomes.forEach((outcome) => {
                if (outcome.scale) {
                    outcome.options =
                        this.utils.makeMenuFromList(outcome.scale, this.translate.instant('core.grades.nooutcome'));
                }
                outcome.selectedId = 0;
                this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
            });
        }

        // Get grade items.
        return this.gradesHelper.getGradeModuleItems(this.courseId, this.moduleId, this.submitId).then((grades) => {
            const outcomes = [];

            grades.forEach((grade) => {
                if (!grade.outcomeid && !grade.scaleid) {

                    // Not using outcomes or scale, get the numeric grade.
                    if (this.grade.scale) {
                        this.grade.gradebookGrade = this.utils.formatFloat(this.gradesHelper.getGradeValueFromLabel(
                                this.grade.scale, grade.gradeformatted));
                    } else {
                        const parsedGrade = parseFloat(grade.gradeformatted);
                        this.grade.gradebookGrade = parsedGrade || parsedGrade == 0 ? this.utils.formatFloat(parsedGrade) : null;
                    }

                    this.grade.disabled = grade.gradeislocked || grade.gradeisoverridden;
                    this.grade.modified = grade.gradedategraded;
                } else if (grade.outcomeid) {

                    // Only show outcomes with info on it, outcomeid could be null if outcomes are disabled on site.
                    this.gradeInfo.outcomes.forEach((outcome) => {
                        if (outcome.id == grade.outcomeid) {
                            outcome.selected = grade.gradeformatted;
                            outcome.modified = grade.gradedategraded;
                            if (outcome.options) {
                                outcome.selectedId = this.gradesHelper.getGradeValueFromLabel(outcome.options, outcome.selected);
                                this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
                                outcome.itemNumber = grade.itemnumber;
                            }
                            outcomes.push(outcome);
                        }
                    });
                    this.gradeInfo.disabled = grade.gradeislocked || grade.gradeisoverridden;
                }
            });

            this.gradeInfo.outcomes = outcomes;
        });
    }

    /**
     * Treat the last attempt.
     *
     * @param response Response of get submission status.
     * @param promises List where to add the promises.
     */
    protected treatLastAttempt(response: any, promises: any[]): void {
        if (!response.lastattempt) {
            return;
        }

        const submissionStatementMissing = this.assign.requiresubmissionstatement &&
                typeof this.assign.submissionstatement == 'undefined';

        this.canSubmit = !this.isSubmittedForGrading && !this.submittedOffline && (response.lastattempt.cansubmit ||
                (this.hasOffline && this.assignProvider.canSubmitOffline(this.assign, response)));
        this.canEdit = !this.isSubmittedForGrading && response.lastattempt.canedit &&
                (!this.submittedOffline || !this.assign.submissiondrafts);

        // Get submission statement if needed.
        if (this.assign.requiresubmissionstatement && this.assign.submissiondrafts && this.submitId == this.currentUserId) {
            this.submissionStatement = this.assign.submissionstatement;
            this.submitModel.submissionStatement = false;
        } else {
            this.submissionStatement = undefined;
            this.submitModel.submissionStatement = true; // No submission statement, so it's accepted.
        }

        // Show error if submission statement should be shown but it couldn't be retrieved.
        this.showErrorStatementEdit = submissionStatementMissing && !this.assign.submissiondrafts &&
                this.submitId == this.currentUserId;
        this.showErrorStatementSubmit = submissionStatementMissing && !!this.assign.submissiondrafts;

        this.userSubmission = this.assignProvider.getSubmissionObjectFromAttempt(this.assign, response.lastattempt);

        if (this.assign.attemptreopenmethod != this.attemptReopenMethodNone && this.userSubmission) {
            this.currentAttempt = this.userSubmission.attemptnumber + 1;
        }

        this.setStatusNameAndClass(response);

        if (this.assign.teamsubmission) {
            if (response.lastattempt.submissiongroup) {
                // Get the name of the group.
                promises.push(this.groupsProvider.getActivityAllowedGroups(this.assign.cmid).then((result) => {
                    result.groups.forEach((group) => {
                        if (group.id == response.lastattempt.submissiongroup) {
                            this.lastAttempt.submissiongroupname = group.name;
                        }
                    });
                }));
            }

            // Get the members that need to submit.
            if (this.userSubmission && this.userSubmission.status != this.statusNew) {
                response.lastattempt.submissiongroupmemberswhoneedtosubmit.forEach((member) => {
                    if (this.blindMarking) {
                        // Users not blinded! (Moodle < 3.1.1, 3.2).
                        promises.push(this.assignProvider.getAssignmentUserMappings(this.assign.id, member).then((blindId) => {
                            this.membersToSubmit.push(blindId);
                        }));
                    } else {
                        promises.push(this.userProvider.getProfile(member, this.courseId).then((profile) => {
                            this.membersToSubmit.push(profile);
                        }));
                    }
                });
            }
        }

        // Get grading text and color.
        this.gradingStatusTranslationId = this.assignProvider.getSubmissionGradingStatusTranslationId(
                response.lastattempt.gradingstatus);
        this.gradingColor = this.assignProvider.getSubmissionGradingStatusColor(response.lastattempt.gradingstatus);

        // Get the submission plugins.
        if (this.userSubmission) {
            if (!this.assign.teamsubmission || !response.lastattempt.submissiongroup || !this.assign.preventsubmissionnotingroup) {
                if (this.previousAttempt && this.previousAttempt.submission.plugins &&
                        this.userSubmission.status == this.statusReopened) {
                    // Get latest attempt if avalaible.
                    this.submissionPlugins = this.previousAttempt.submission.plugins;
                } else {
                    this.submissionPlugins = this.userSubmission.plugins;
                }
            }
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        if (this.assign && this.isGrading) {
            this.syncProvider.unblockOperation(AddonModAssignProvider.COMPONENT, this.assign.id);
        }
    }
}

/**
 * Submission attempt with some calculated data.
 */
type AddonModAssignSubmissionAttemptFormatted = AddonModAssignSubmissionAttempt & {
    submissiongroupname?: string; // Calculated in the app. Group name the attempt belongs to.
};

/**
 * Feedback of an assign submission with some calculated data.
 */
type AddonModAssignSubmissionFeedbackFormatted = AddonModAssignSubmissionFeedback & {
    advancedgrade?: boolean; // Calculated in the app. Whether it uses advanced grading.
};
