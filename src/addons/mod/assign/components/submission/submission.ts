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

import { Component, Input, OnInit, Optional, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonModAssignAssign,
    AddonModAssignSubmissionFeedback,
    AddonModAssignSubmissionAttempt,
    AddonModAssignSubmissionPreviousAttempt,
    AddonModAssignPlugin,
    AddonModAssign,
    AddonModAssignGetSubmissionStatusWSResponse,
    AddonModAssignGrade,
} from '../../services/assign';
import {
    AddonModAssignAutoSyncData,
    AddonModAssignManualSyncData,
    AddonModAssignSync,
} from '../../services/assign-sync';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGradesFormattedItem, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../../services/assign-helper';
import { Translate } from '@singletons';
import { CoreCourse, CoreCourseModuleGradeInfo } from '@features/course/services/course';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreGroups } from '@services/groups';
import { AddonModAssignSubmissionPluginComponent } from '../submission-plugin/submission-plugin';
import { CoreTime } from '@singletons/time';
import { CoreIonicColorNames } from '@singletons/colors';
import {
    ADDON_MOD_ASSIGN_AUTO_SYNCED,
    ADDON_MOD_ASSIGN_COMPONENT_LEGACY,
    ADDON_MOD_ASSIGN_MANUAL_SYNCED,
    ADDON_MOD_ASSIGN_MODNAME,
    ADDON_MOD_ASSIGN_PAGE_NAME,
    ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
    AddonModAssignAttemptReopenMethodValues,
    AddonModAssignGradingStates,
    AddonModAssignSubmissionStatusValues,
} from '../../constants';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { AddonModAssignFeedbackPluginComponent } from '../feedback-plugin/feedback-plugin';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreModals } from '@services/overlays/modals';
import { CoreUtils } from '@singletons/utils';

/**
 * Component that displays an assignment submission.
 */
@Component({
    selector: 'addon-mod-assign-submission',
    templateUrl: 'addon-mod-assign-submission.html',
    styleUrl: 'submission.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        AddonModAssignSubmissionPluginComponent,
        CoreCourseModuleNavigationComponent,
        AddonModAssignFeedbackPluginComponent,
    ],
})
export class AddonModAssignSubmissionComponent implements OnInit, OnDestroy {

    @ViewChildren(AddonModAssignSubmissionPluginComponent) submissionComponents!:
        QueryList<AddonModAssignSubmissionPluginComponent>;

    @Input({ required: true }) courseId!: number; // Course ID the submission belongs to.
    @Input({ required: true }) moduleId!: number; // Module ID the submission belongs to.
    @Input() submitId!: number; // User that did the submission. Defaults to current user
    @Input() blindId?: number; // Blinded user ID (if it's blinded).

    loaded = false; // Whether data has been loaded.
    assign?: AddonModAssignAssign; // The assignment the submission belongs to.
    userSubmission?: AddonModAssignSubmissionFormatted; // The submission object.
    isSubmittedForGrading = false; // Whether the submission has been submitted for grading.
    acceptStatement = false; // Statement accepted (for grading).
    feedback?: AddonModAssignSubmissionFeedbackFormatted; // The feedback.
    editedOffline = false; // Whether the submission was added or edited in offline.
    submittedOffline = false; // Whether it was submitted in offline.
    removedOffline = false; // Whether the submission was removed in offline.
    fromDate?: string; // Readable date when the assign started accepting submissions.
    currentAttemptNumber = 0; // The current attempt number.
    blindMarking = false; // Whether blind marking is enabled.
    user?: CoreUserProfile; // The user.
    lastAttempt?: AddonModAssignSubmissionAttemptFormatted; // The last attempt.
    membersToSubmit: CoreUserProfile[] = []; // Team members that need to submit the assignment.
    membersToSubmitBlind: number[] = []; // Team members that need to submit the assignment (blindmarking).
    canSubmit = false; // Whether the user can submit for grading.
    canEdit = false; // Whether the user can edit the submission.
    isRemoveAvailable = false; // Whether WS to remove submission is available.
    submissionStatement?: string; // The submission statement.
    showErrorStatementEdit = false; // Whether to show an error in edit due to submission statement.
    showErrorStatementSubmit = false; // Whether to show an error in submit due to submission statement.
    gradingStatus?: AddonModAssignGradingStates;
    gradingStatusBadge?: StatusBadge;
    workflowStatusTranslationId?: string; // Key of the text to display for the workflow status.
    submissionPlugins: AddonModAssignPlugin[] = []; // List of submission plugins.
    timeRemaining = ''; // Message about time remaining.
    timeRemainingClass = ''; // Class to apply to time remaining message.
    timeLimitEndTime = 0; // If time limit is enabled and submission is ongoing, the end time for the timer.
    submissionStatusBadge?: StatusBadge;
    unsupportedEditPlugins: string[] = []; // List of submission plugins that don't support edit.

    grader?: CoreUserProfile; // Profile of the teacher that graded the submission.
    gradeInfo?: CoreCourseModuleGradeInfo; // Grade data for the assignment, retrieved from the server.
    canGrade = false; // Whether the user is grading.
    canSaveGrades = false; // Whether the user can save the grades.
    gradeUrl?: string; // URL to grade in browser.
    submissionUrl?: string; // URL to add/edit a submission in browser.
    isPreviousAttemptEmpty = true; // Whether the previous attempt contains an empty submission.
    showDates = false; // Whether to show some dates.
    timeLimitFinished = false; // Whether there is a time limit and it finished, so the user will submit late.

    // Some constants.
    statusNew = AddonModAssignSubmissionStatusValues.NEW;
    statusReopened = AddonModAssignSubmissionStatusValues.REOPENED;
    attemptReopenMethodNone = AddonModAssignAttemptReopenMethodValues.NONE;

    previousAttempts: AddonModAssignSubmissionPreviousAttemptFormatted[] = []; // List of previous attempts.

    protected siteId: string; // Current site ID.
    protected currentUserId: number; // Current user ID.
    protected previousAttempt?: AddonModAssignSubmissionPreviousAttempt; // The previous attempt.
    protected submissionStatusAvailable = false; // Whether we were able to retrieve the submission status.
    protected syncObserver: CoreEventObserver;

    protected hasOfflineGrade = false;

    constructor(
        @Optional() protected splitviewCtrl: CoreSplitViewComponent,
    ) {
        this.siteId = CoreSites.getCurrentSiteId();
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        // Refresh data if this assign is synchronized and it's grading.
        const events = [ADDON_MOD_ASSIGN_AUTO_SYNCED, ADDON_MOD_ASSIGN_MANUAL_SYNCED];
        this.syncObserver = CoreEvents.onMultiple<AddonModAssignAutoSyncData | AddonModAssignManualSyncData>(
            events,
            async (data) => {
                // Check that user is grading and this grade wasn't blocked when sync was performed.
                if (!this.loaded || !this.canGrade || data.gradesBlocked.indexOf(this.submitId) !== -1) {
                    return;
                }

                if ('context' in data && data.context === 'submission' && data.submitId === this.submitId) {
                    // Manual sync triggered by this same submission, ignore it.
                    return;
                }

                this.invalidateAndRefresh(false);
            },
            this.siteId,
        );
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.isSubmittedForGrading = !!this.submitId;
        this.showDates = !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.11');

        this.loadData(true);
    }

    /**
     * Calculate the time remaining message and class.
     *
     * @param response Response of get submission status.
     */
    protected calculateTimeRemaining(response: AddonModAssignGetSubmissionStatusWSResponse): void {
        if (!this.assign) {
            return;
        }

        const submissionStarted = !!this.userSubmission?.timestarted;
        this.timeLimitEndTime = 0;
        this.timeLimitFinished = false;

        if (this.assign.duedate <= 0 && !submissionStarted) {
            // No due date and no countdown.
            this.timeRemaining = '';
            this.timeRemainingClass = '';

            return;
        }

        const time = CoreTimeUtils.timestamp();
        const timeLimitEnabled = this.assign.timelimit && submissionStarted;

        // Define duedate as latest between due date and extension - which is a possibility...
        const extensionDuedate = response.lastattempt?.extensionduedate;
        const duedate = extensionDuedate ? Math.max(this.assign.duedate, extensionDuedate) : this.assign.duedate;
        const dueDateReached = duedate > 0 && duedate - time <= 0;

        const timeLimitEnabledBeforeDueDate = timeLimitEnabled && !dueDateReached;

        if (this.userSubmission && this.userSubmission.status === AddonModAssignSubmissionStatusValues.SUBMITTED) {
            // Submitted, display the relevant early/late message.
            const lateCalculation = this.userSubmission.timemodified -
                (timeLimitEnabledBeforeDueDate ? this.userSubmission.timestarted ?? 0 : 0);
            const lateThreshold = timeLimitEnabledBeforeDueDate ? this.assign.timelimit || 0 : duedate;
            const earlyString = timeLimitEnabledBeforeDueDate ? 'submittedundertime' : 'submittedearly';
            const lateString = timeLimitEnabledBeforeDueDate ? 'submittedovertime' : 'submittedlate';
            const onTime = lateCalculation <= lateThreshold;

            this.timeRemaining = Translate.instant(
                'addon.mod_assign.' + (onTime ? earlyString : lateString),
                { $a: CoreTime.formatTime(Math.abs(lateCalculation - lateThreshold)) },
            );
            this.timeRemainingClass = onTime ? 'earlysubmission' : 'latesubmission';

            return;
        }

        if (dueDateReached) {
            // There is no submission, due date has passed, show assignment is overdue.
            const submissionsEnabled = response.lastattempt?.submissionsenabled || response.gradingsummary?.submissionsenabled;
            this.timeRemaining = Translate.instant(
                'addon.mod_assign.' + (submissionsEnabled ? 'overdue' : 'duedatereached'),
                { $a: CoreTime.formatTime(time - duedate) },
            );
            this.timeRemainingClass = 'overdue';
            this.timeLimitFinished = true;

            return;
        }

        if (timeLimitEnabled && submissionStarted) {
            // An attempt has started and there is a time limit, display the time limit.
            this.timeRemaining = '';
            this.timeRemainingClass = 'timeremaining';
            this.timeLimitEndTime = AddonModAssignHelper.calculateEndTime(this.assign, this.userSubmission);

            return;
        }

        // Assignment is not overdue, and no submission has been made. Just display the due date.
        this.timeRemaining = CoreTime.formatTime(duedate - time);
        this.timeRemainingClass = 'timeremaining';
    }

    /**
     * Copy a previous attempt and then go to edit.
     *
     * @returns Promise resolved when done.
     */
    async copyPrevious(): Promise<void> {
        if (!this.assign) {
            return;
        }

        if (!CoreNetwork.isOnline()) {
            CoreAlerts.showError(Translate.instant('core.networkerrormsg'));

            return;
        }

        if (!this.previousAttempt?.submission) {
            // Cannot access previous attempts, just go to edit.
            return this.goToEdit(true);
        }

        const previousSubmission = this.previousAttempt.submission;
        let modal = await CoreLoadings.show();

        const size = await CorePromiseUtils.ignoreErrors(
            AddonModAssignHelper.getSubmissionSizeForCopy(this.assign, previousSubmission),
            -1,
        ); // Error calculating size, return -1.

        modal.dismiss();

        try {
            // Confirm action.
            await CoreFileUploaderHelper.confirmUploadFile(size, true);
        } catch {
            // Cancelled.
            return;
        }

        // User confirmed, copy the attempt.
        modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModAssignHelper.copyPreviousAttempt(this.assign, previousSubmission);
            // Now go to edit.
            this.goToEdit(true);

            if (!this.assign.submissiondrafts && this.userSubmission) {
                // No drafts allowed, so it was submitted. Trigger event.
                CoreEvents.trigger(ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.userSubmission.id,
                    userId: this.currentUserId,
                }, this.siteId);
            } else {
                // Invalidate and refresh data to update this view.
                await this.invalidateAndRefresh(true);
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.error') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Go to the page to add or edit submission.
     *
     * @param afterCopyPrevious Whether the user has just copied the previous submission.
     */
    async goToEdit(afterCopyPrevious = false): Promise<void> {
        if (!afterCopyPrevious && this.assign?.timelimit && (!this.userSubmission || !this.userSubmission.timestarted)) {
            try {
                await CoreAlerts.confirm(
                    Translate.instant('addon.mod_assign.confirmstart', {
                        $a: CoreTime.formatTime(this.assign.timelimit),
                    }),
                    { okText: Translate.instant('addon.mod_assign.beginassignment') },
                );
            } catch {
                return; // User canceled.
            }
        }

        CoreNavigator.navigateToSitePath(
            ADDON_MOD_ASSIGN_PAGE_NAME + '/' + this.courseId + '/' + this.moduleId + '/edit',
            {
                params: {
                    blindId: this.blindId,
                },
            },
        );
    }

    /**
     * Remove submisson.
     */
    async remove(): Promise<void> {
        if (!this.assign || !this.userSubmission) {
            return;
        }
        const message = this.assign.timelimit ?
            'addon.mod_assign.removesubmissionconfirmwithtimelimit' :
            'addon.mod_assign.removesubmissionconfirm';
        try {
            await CoreAlerts.confirmDelete(Translate.instant(message));
        } catch {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const sent = await AddonModAssign.removeSubmission(this.assign, this.userSubmission);

            if (sent) {
                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: ADDON_MOD_ASSIGN_MODNAME });
            }

            CoreEvents.trigger(
                ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT,
                {
                    assignmentId: this.assign.id,
                    submissionId: this.userSubmission.id,
                    userId: this.currentUserId,
                },
                CoreSites.getCurrentSiteId(),
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error removing submission.' });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Invalidate and refresh data.
     *
     * @param sync Whether to try to synchronize data.
     * @returns Promise resolved when done.
     */
    async invalidateAndRefresh(sync = false): Promise<void> {
        this.loaded = false;

        const promises: Promise<void>[] = [];

        promises.push(AddonModAssign.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(AddonModAssign.invalidateSubmissionStatusData(
                this.assign.id,
                this.submitId,
                undefined,
                !!this.blindId,
            ));
            promises.push(AddonModAssign.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(AddonModAssign.invalidateListParticipantsData(this.assign.id));
            promises.push(AddonModAssign.invalidateAssignmentGradesData(this.assign.id));
        }
        promises.push(CoreGradesHelper.invalidateGradeModuleItems(this.courseId, this.submitId));
        promises.push(CoreCourse.invalidateModule(this.moduleId));

        // Invalidate plugins.
        if (this.submissionComponents && this.submissionComponents.length) {
            this.submissionComponents.forEach((component) => {
                promises.push(component.invalidate());
            });
        }

        await CorePromiseUtils.allPromisesIgnoringErrors(promises);

        await this.loadData(sync);
    }

    /**
     * Load the data to render the submission.
     *
     * @param sync Whether to try to synchronize data.
     * @returns Promise resolved when done.
     */
    protected async loadData(sync = false): Promise<void> {
        let isBlind = !!this.blindId;

        if (!this.submitId) {
            this.submitId = this.currentUserId;
            isBlind = false;
        }

        try {
            // Get the assignment.
            this.assign = await AddonModAssign.getAssignment(this.courseId, this.moduleId);

            if (this.submitId !== this.currentUserId && sync) {
                // Teacher viewing a student submission. Try to sync the assign, there could be offline grades stored.
                try {
                    const result = await AddonModAssignSync.syncAssign(this.assign.id);

                    if (result?.updated) {
                        CoreEvents.trigger(ADDON_MOD_ASSIGN_MANUAL_SYNCED, {
                            assignId: this.assign.id,
                            warnings: result.warnings,
                            gradesBlocked: result.gradesBlocked,
                            context: 'submission',
                            submitId: this.submitId,
                        }, this.siteId);
                    }
                } catch {
                    // Ignore errors, probably user is offline or sync is blocked.
                }
            }

            const time = CoreTimeUtils.timestamp();
            let promises: Promise<void>[] = [];

            if (this.assign.allowsubmissionsfromdate && this.assign.allowsubmissionsfromdate >= time) {
                this.fromDate = CoreTimeUtils.userDate(this.assign.allowsubmissionsfromdate * 1000);
            }

            this.blindMarking = this.isSubmittedForGrading && !!this.assign.blindmarking && !this.assign.revealidentities;

            if (!this.blindMarking && this.submitId != this.currentUserId) {
                promises.push(this.loadSubmissionUserProfile());
            }

            // Check if there's any offline data for this submission.
            promises.push(this.loadSubmissionOfflineData());

            await Promise.all(promises);

            // Get submission status.
            const submissionStatus =
                await AddonModAssign.getSubmissionStatusWithRetry(this.assign, { userId: this.submitId, isBlind });

            this.submissionStatusAvailable = true;
            this.lastAttempt = submissionStatus.lastattempt;
            this.gradingStatus = this.lastAttempt?.gradingstatus;

            this.membersToSubmit = [];
            this.membersToSubmitBlind = [];

            this.previousAttempts = submissionStatus.previousattempts
                ? submissionStatus.previousattempts.sort((a, b) => b.attemptnumber - a.attemptnumber)
                : [];

            const graderPromises = this.previousAttempts.map(async (attempt) => {
                attempt.submissionStatusBadge = this.getSubmissionStatusBadge(attempt.submission?.status, this.lastAttempt);

                // If we have data about the grader, get its profile.
                attempt.grader = await this.getGrader(attempt.grade);
                attempt.advancedgrade = this.getAdvancedGrade(attempt.grade?.gradefordisplay);
            });

            promises.push(...graderPromises);

            // Search the previous attempt.
            if (this.previousAttempts.length > 0) {
                this.previousAttempt = this.previousAttempts[0];
                this.isPreviousAttemptEmpty =
                    AddonModAssignHelper.isSubmissionEmpty(this.assign, this.previousAttempt.submission);
            } else {
                this.previousAttempt = undefined;
                this.isPreviousAttemptEmpty = true;
            }

            // Treat last attempt.
            promises = this.treatLastAttempt(this.lastAttempt);

            // Calculate the time remaining.
            this.calculateTimeRemaining(submissionStatus);

            // Load the feedback.
            promises.push(this.loadFeedback(this.assign, submissionStatus.feedback));

            // Check if there's any unsupported plugin for editing.
            if (!this.userSubmission || !this.userSubmission.plugins) {
                // Submission not created yet, we have to use assign configs to detect the plugins used.
                this.userSubmission = AddonModAssignHelper.createEmptySubmission();
                this.userSubmission.plugins = AddonModAssignHelper.getPluginsEnabled(this.assign, 'assignsubmission');
            }

            // Get the submission plugins that don't support editing.
            promises.push(this.loadUnsupportedPlugins());

            await Promise.all(promises);
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting assigment data.' });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Load profile of submission's user.
     */
    protected async loadSubmissionUserProfile(): Promise<void> {
        this.user = await CoreUser.getProfile(this.submitId, this.courseId);
    }

    /**
     * Load offline data for the submission (not the submission grade).
     */
    protected async loadSubmissionOfflineData(): Promise<void> {
        if (!this.assign) {
            return;
        }

        try {
            const submission = await AddonModAssignOffline.getSubmission(this.assign.id, this.submitId);

            this.removedOffline = submission && Object.keys(submission.plugindata).length == 0;
            this.editedOffline = submission && !this.removedOffline;
            this.submittedOffline = !!submission?.submitted && !this.removedOffline;
        } catch (error) {
            // No offline data found.
            this.editedOffline = false;
            this.submittedOffline = false;
            this.removedOffline = false;
        }
    }

    /**
     * Load the data to render the feedback and grade.
     *
     * @param assign Assign data.
     * @param feedback The feedback data from the submission status.
     */
    protected async loadFeedback(assign: AddonModAssignAssign, feedback?: AddonModAssignSubmissionFeedback): Promise<void> {
        if (feedback) {
            this.feedback = feedback;

            // If we have data about the grader, get its profile.
            this.grader = await this.getGrader(feedback.grade);

            // Check if the grade uses advanced grading.
            this.feedback.advancedgrade = this.getAdvancedGrade(feedback.gradefordisplay);
        }

        // Get the grade for the assign.
        const gradeInfo = await CoreCourse.getModuleBasicGradeInfo(this.moduleId);
        if (!gradeInfo) {
            // No is grading, stop.
            return;
        }

        this.canGrade = true;

        // Make sure outcomes is an array.
        gradeInfo.outcomes = gradeInfo.outcomes || [];

        let method = 'simple';
        // Check if grading method is simple or not.
        if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] && gradeInfo.advancedgrading[0].method !== undefined) {
            method = gradeInfo.advancedgrading[0].method || method;
        }

        this.canSaveGrades = method === 'simple'; // Grades can be saved if simple grading.

        if (assign.markingworkflow && this.gradingStatus) {
            this.workflowStatusTranslationId =
                AddonModAssign.getSubmissionGradingStatusTranslationId(this.gradingStatus);
        }

        if (this.gradingStatus === AddonModAssignGradingStates.GRADED && !assign.markingworkflow &&
            this.userSubmission && feedback
        ) {
            if (feedback.gradeddate < this.userSubmission.timemodified) {
                this.gradingStatus = AddonModAssignGradingStates.GRADED_FOLLOWUP_SUBMIT;

                // Get grading text and color.
                const translationId = AddonModAssign.getSubmissionGradingStatusTranslationId(
                    this.gradingStatus,
                );

                this.gradingStatusBadge = translationId
                    ? {
                        translationId,
                        color: AddonModAssign.getSubmissionGradingStatusColor(this.gradingStatus),
                    }
                    : undefined;
            }
        }

        // Check if there's any offline data for this submission.
        if (!this.canSaveGrades) {
            // User cannot save grades in the app. Load the URL to grade it in browser.
            const mod = await CoreCourse.getModule(this.moduleId, this.courseId, undefined, true);
            this.gradeUrl = mod.url + '&action=grader&userid=' + this.submitId;

            return;
        }

        // Submission grades aren't identified by attempt number so it can retrieve the feedback for a previous attempt.
        // The app will not treat that as an special case.
        const submissionGrade = await CorePromiseUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(assign.id, this.submitId),
        );

        this.hasOfflineGrade = false;

        let gradeModified = 0;
        const gradebookGrades = await CoreGradesHelper.getGradeModuleItems(this.courseId, this.moduleId, this.submitId);
        gradebookGrades.forEach((grade: CoreGradesFormattedItem) => {
            if (!grade.outcomeid && !grade.scaleid) {
                gradeModified = grade.gradedategraded ?? gradeModified;
            }
        });

        // Load offline grades.
        if (submissionGrade && (!feedback || !feedback.gradeddate || feedback.gradeddate < submissionGrade.timemodified)) {
            // If grade has been modified from gradebook, do not use offline.
            if (gradeModified < submissionGrade.timemodified) {
                const gradeForDisplay = String(!this.gradeInfo?.scale
                    ? CoreUtils.formatFloat(submissionGrade.grade)
                    : submissionGrade.grade);

                if (!this.feedback) {
                    this.feedback = {
                        gradefordisplay: gradeForDisplay,
                        gradeddate: gradeModified,
                    };
                } else {
                    this.feedback.gradefordisplay = gradeForDisplay;
                    this.feedback.gradeddate = gradeModified;
                }

                this.grader = await CorePromiseUtils.ignoreErrors(CoreUser.getProfile(this.currentUserId, this.courseId));

                this.hasOfflineGrade = true;
                this.gradingStatusBadge = {
                    translationId: 'addon.mod_assign.gradenotsynced',
                    color: CoreIonicColorNames.NONE,
                };
            }
        }
    }

    /**
     * Get the submission plugins that don't support editing.
     */
    protected async loadUnsupportedPlugins(): Promise<void> {
        this.unsupportedEditPlugins = await AddonModAssign.getUnsupportedEditPlugins(this.userSubmission?.plugins || []);

        if (this.unsupportedEditPlugins && !this.submissionUrl) {
            const mod = await CoreCourse.getModule(this.moduleId, this.courseId, undefined, true);
            this.submissionUrl = `${mod.url}&action=editsubmission`;
        }

    }

    /**
     * Set the submission status name and class.
     *
     * @param submissionStatus Submission status.
     * @param lastAttempt Last attempt info.
     * @returns Submission status translation Id and color.
     */
    protected getSubmissionStatusBadge(
        submissionStatus?: AddonModAssignSubmissionStatusValues,
        lastAttempt?: AddonModAssignSubmissionAttempt,
    ): StatusBadge | undefined {
        if (!this.assign) {
            return;
        }

        if (this.editedOffline || this.submittedOffline) {
            // Added, edited or submitted offline.
            return {
                translationId: 'core.notsent',
                color: CoreIonicColorNames.WARNING,
            };
        }

        if (!this.assign.teamsubmission) {
            // Single submission.
            if (submissionStatus && submissionStatus !== this.statusNew && !this.removedOffline) {
                return {
                    translationId: 'addon.mod_assign.submissionstatus_' + submissionStatus,
                    color: AddonModAssign.getSubmissionStatusColor(submissionStatus),
                };
            }

            if (!lastAttempt?.submissionsenabled) {
                return {
                    translationId: 'addon.mod_assign.noonlinesubmissions',
                    color: AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ONLINE_SUBMISSIONS),
                };
            }

            return {
                translationId: 'addon.mod_assign.noattempt',
                color: AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ATTEMPT),
            };
        }

        // Team submission.
        if (!lastAttempt?.submissiongroup && this.assign.preventsubmissionnotingroup && !this.removedOffline) {
            return {
                translationId: 'addon.mod_assign.nosubmission',
                color: AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_SUBMISSION),
            };
        }

        if (submissionStatus && submissionStatus !== this.statusNew && !this.removedOffline) {
            return {
                translationId: 'addon.mod_assign.submissionstatus_' + submissionStatus,
                color: AddonModAssign.getSubmissionStatusColor(submissionStatus),
            };
        }
        if (!lastAttempt?.submissionsenabled) {
            return  {
                translationId: 'addon.mod_assign.noonlinesubmissions',
                color: AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ONLINE_SUBMISSIONS),
            };
        }

        return {
            translationId: 'addon.mod_assign.nosubmission',
            color: AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_SUBMISSION),
        };
    }

    /**
     * Show advanced grade.
     *
     * @param grade Grade to show.
     */
    showAdvancedGrade(grade: string): void {
        CoreViewer.viewText(
            Translate.instant('core.grades.grade'),
            grade,
            {
                component: ADDON_MOD_ASSIGN_COMPONENT_LEGACY,
                componentId: this.moduleId,
            },
        );
    }

    /**
     * Submit for grading.
     *
     * @param acceptStatement Whether the statement has been accepted.
     */
    async submitForGrading(acceptStatement: boolean): Promise<void> {
        if (!this.assign || !this.userSubmission) {
            return;
        }

        if (this.assign.requiresubmissionstatement && !acceptStatement) {
            CoreAlerts.showError(Translate.instant('addon.mod_assign.acceptsubmissionstatement'));

            return;
        }

        try {
            // Ask for confirmation. @todo plugin precheck_submission
            await CoreAlerts.confirm(Translate.instant('addon.mod_assign.confirmsubmission'));

            const modal = await CoreLoadings.show('core.sending', true);

            try {
                await AddonModAssign.submitForGrading(
                    this.assign.id,
                    this.courseId,
                    acceptStatement,
                    this.userSubmission.timemodified,
                    this.editedOffline,
                );

                // Submitted, trigger event.
                CoreEvents.trigger(ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.userSubmission.id,
                    userId: this.currentUserId,
                }, this.siteId);
            } catch (error) {
                CoreAlerts.showError(error, { default: Translate.instant('core.error') });
            } finally {
                modal.dismiss();
            }
        } catch {
            // Cancelled.
        }
    }

    /**
     * Treat the last attempt.
     *
     * @param lastAttempt Last attempt (if any).
     * @returns Promises resolved when done.
     */
    protected treatLastAttempt(
        lastAttempt?: AddonModAssignSubmissionAttemptFormatted,
    ): Promise<void>[] {
        const promises: Promise<void>[] =[];

        if (!lastAttempt || !this.assign) {
            return [];
        }

        // Receved submission statement should not be undefined. It would mean that the WS is not returning the value.
        const submissionStatementMissing = !!this.assign.requiresubmissionstatement &&
            this.assign.submissionstatement === undefined;

        // If received submission statement is empty, then it's not required.
        if(!this.assign.submissionstatement && this.assign.submissionstatement !== undefined) {
            this.assign.requiresubmissionstatement = 0;
        }

        this.canSubmit = !this.isSubmittedForGrading && !this.submittedOffline && !this.removedOffline &&
            (lastAttempt.cansubmit || (this.editedOffline && AddonModAssign.canSubmitOffline(this.assign, lastAttempt)));

        this.canEdit = !this.isSubmittedForGrading && lastAttempt.canedit &&
            (!this.submittedOffline || !this.assign.submissiondrafts);
        this.isRemoveAvailable = AddonModAssign.isRemoveSubmissionAvailable();

        // Get submission statement if needed.
        if (this.assign.requiresubmissionstatement && this.assign.submissiondrafts && this.submitId == this.currentUserId) {
            this.submissionStatement = this.assign.submissionstatement;
            this.acceptStatement = false;
        } else {
            this.submissionStatement = undefined;
            this.acceptStatement = true; // No submission statement, so it's accepted.
        }

        // Show error if submission statement should be shown but it couldn't be retrieved.
        this.showErrorStatementEdit = submissionStatementMissing && !this.assign.submissiondrafts &&
            this.submitId == this.currentUserId;

        this.showErrorStatementSubmit = submissionStatementMissing && !!this.assign.submissiondrafts;

        this.userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(this.assign, lastAttempt);

        if (this.assign.attemptreopenmethod !== this.attemptReopenMethodNone && this.userSubmission) {
            this.currentAttemptNumber = this.userSubmission.attemptnumber + 1;
        }

        this.submissionStatusBadge = this.getSubmissionStatusBadge(this.userSubmission?.status, this.lastAttempt);

        if (this.assign.teamsubmission) {
            if (lastAttempt.submissiongroup) {
                // Get the name of the group.
                promises.push(CoreGroups.getActivityAllowedGroups(this.assign.cmid).then((result) => {
                    const group = result.groups.find((group) => group.id === lastAttempt.submissiongroup);
                    if (group) {
                        lastAttempt.submissiongroupname = group.name;
                    }

                    return;
                }));
            }

            // Get the members that need to submit.
            if (this.userSubmission?.status !== this.statusNew &&
                lastAttempt.submissiongroupmemberswhoneedtosubmit
            ) {
                lastAttempt.submissiongroupmemberswhoneedtosubmit.forEach((member) => {
                    if (!this.blindMarking) {
                        promises.push(CoreUser.getProfile(member, this.courseId).then((profile) => {
                            this.membersToSubmit.push(profile);

                            return;
                        }));
                    }
                });
            }
        }

        // Get grading text and color.
        const translationId = AddonModAssign.getSubmissionGradingStatusTranslationId(this.gradingStatus);
        this.gradingStatusBadge = translationId
            ? {
                translationId,
                color:  AddonModAssign.getSubmissionGradingStatusColor(this.gradingStatus),
            }
            : undefined;

        // Get the submission plugins.
        if (this.userSubmission) {
            if (!this.assign.teamsubmission ||
                !lastAttempt.submissiongroup ||
                !this.assign.preventsubmissionnotingroup
            ) {
                if (this.previousAttempt?.submission?.plugins && this.userSubmission.status === this.statusReopened) {
                    // Get latest attempt if available.
                    this.submissionPlugins = this.previousAttempt.submission.plugins;
                } else {
                    this.submissionPlugins = this.userSubmission.plugins || [];
                }
            }
        }

        return promises;
    }

    /**
     * Function called when the time is up.
     */
    timeUp(): void {
        this.timeLimitFinished = true;
    }

    /**
     * Open the grade modal.
     */
    async openGrade(): Promise<void> {
        const { AddonModAssignEditFeedbackModalComponent } =
            await import('@addons/mod/assign/components/edit-feedback-modal/edit-feedback-modal');

        const newData = await CoreModals.openModal<boolean>({
            component: AddonModAssignEditFeedbackModalComponent,
            componentProps: {
                assign: this.assign,
                moduleId: this.moduleId,
                courseId: this.courseId,
                submitId: this.submitId,
                feedback: this.feedback,
                userSubmission: this.userSubmission,
                gradingStatus: this.gradingStatus,
            },
        });

        if (newData === true) {
            this.invalidateAndRefresh(true);
        }
    }

    /**
     * Get grader user info.
     *
     * @param grade Grade to get the grader from.
     * @returns Promise resolved with the grader user info or undefined if not found.
     */
    protected async getGrader(grade?: AddonModAssignGrade): Promise<CoreUserProfile | undefined> {
        if (!grade || grade.grader <= 0) {
            return;
        }

        return await CorePromiseUtils.ignoreErrors(CoreUser.getProfile(grade.grader, this.courseId));
    }

    /**
     * Check if the grade uses advanced grading.
     *
     * @param gradeForDisplay Grade to check.
     * @returns Whether it uses advanced grading.
     */
    protected getAdvancedGrade(gradeForDisplay?: string): boolean {
        // Check if the grade uses advanced grading.
        if (gradeForDisplay) {
            const position = gradeForDisplay.indexOf('class="advancedgrade"');
            if (position > -1) {
                return true;
            }
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.syncObserver?.off();
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

type AddonModAssignSubmissionPreviousAttemptFormatted = AddonModAssignSubmissionPreviousAttempt & {
    submissionStatusBadge?: StatusBadge;
    grader?: CoreUserProfile;
    advancedgrade?: boolean;
};

type StatusBadge = {
    translationId: string; // Status translation key.
    color: CoreIonicColorNames; // Color to apply to the badge.
};
