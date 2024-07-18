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
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonModAssignAssign,
    AddonModAssignSubmissionFeedback,
    AddonModAssignSubmissionAttempt,
    AddonModAssignSubmissionPreviousAttempt,
    AddonModAssignPlugin,
    AddonModAssign,
    AddonModAssignGetSubmissionStatusWSResponse,
    AddonModAssignSavePluginData,
    AddonModAssignGradingStates,
    AddonModAssignSubmissionStatusValues,
    AddonModAssignAttemptReopenMethodValues,
} from '../../services/assign';
import {
    AddonModAssignAutoSyncData,
    AddonModAssignManualSyncData,
    AddonModAssignSync,
} from '../../services/assign-sync';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreTabComponent } from '@components/tabs/tab';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGradesFormattedItem, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CoreMenuItem, CoreUtils } from '@services/utils/utils';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../../services/assign-helper';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreTextUtils } from '@services/utils/text';
import { CoreCourse, CoreCourseModuleGradeInfo, CoreCourseModuleGradeOutcome } from '@features/course/services/course';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreLang } from '@services/lang';
import { CoreError } from '@classes/errors/error';
import { CoreGroups } from '@services/groups';
import { CoreSync } from '@services/sync';
import { AddonModAssignSubmissionPluginComponent } from '../submission-plugin/submission-plugin';
import { CanLeave } from '@guards/can-leave';
import { CoreTime } from '@singletons/time';
import { isSafeNumber, SafeNumber } from '@/core/utils/types';
import { CoreIonicColorNames } from '@singletons/colors';
import {
    ADDON_MOD_ASSIGN_AUTO_SYNCED,
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_GRADED_EVENT,
    ADDON_MOD_ASSIGN_MANUAL_SYNCED,
    ADDON_MOD_ASSIGN_PAGE_NAME,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
    ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS,
} from '../../constants';
import { CoreViewer } from '@features/viewer/services/viewer';

/**
 * Component that displays an assignment submission.
 */
@Component({
    selector: 'addon-mod-assign-submission',
    templateUrl: 'addon-mod-assign-submission.html',
    styleUrls: ['submission.scss'],
})
export class AddonModAssignSubmissionComponent implements OnInit, OnDestroy, CanLeave {

    @ViewChild(CoreTabsComponent) tabs!: CoreTabsComponent;
    @ViewChildren(AddonModAssignSubmissionPluginComponent) submissionComponents!:
        QueryList<AddonModAssignSubmissionPluginComponent>;

    @Input({ required: true }) courseId!: number; // Course ID the submission belongs to.
    @Input({ required: true }) moduleId!: number; // Module ID the submission belongs to.
    @Input() submitId!: number; // User that did the submission. Defaults to current user
    @Input() blindId?: number; // Blinded user ID (if it's blinded).

    loaded = false; // Whether data has been loaded.
    selectedTab = 'submission'; // Tab selected on start.
    assign?: AddonModAssignAssign; // The assignment the submission belongs to.
    userSubmission?: AddonModAssignSubmissionFormatted; // The submission object.
    isSubmittedForGrading = false; // Whether the submission has been submitted for grading.
    acceptStatement = false; // Statement accepted (for grading).
    feedback?: AddonModAssignSubmissionFeedbackFormatted; // The feedback.
    hasOffline = false; // Whether there is offline data.
    submittedOffline = false; // Whether it was submitted in offline.
    fromDate?: string; // Readable date when the assign started accepting submissions.
    currentAttempt = 0; // The current attempt number.
    maxAttemptsText: string; // The text for maximum attempts.
    blindMarking = false; // Whether blind marking is enabled.
    user?: CoreUserProfile; // The user.
    lastAttempt?: AddonModAssignSubmissionAttemptFormatted; // The last attempt.
    membersToSubmit: CoreUserProfile[] = []; // Team members that need to submit the assignment.
    membersToSubmitBlind: number[] = []; // Team members that need to submit the assignment (blindmarking).
    canSubmit = false; // Whether the user can submit for grading.
    canEdit = false; // Whether the user can edit the submission.
    submissionStatement?: string; // The submission statement.
    showErrorStatementEdit = false; // Whether to show an error in edit due to submission statement.
    showErrorStatementSubmit = false; // Whether to show an error in submit due to submission statement.
    gradingStatusTranslationId?: string; // Key of the text to display for the grading status.
    gradingColor = ''; // Color to apply to the grading status.
    workflowStatusTranslationId?: string; // Key of the text to display for the workflow status.
    submissionPlugins: AddonModAssignPlugin[] = []; // List of submission plugins.
    timeRemaining = ''; // Message about time remaining.
    timeRemainingClass = ''; // Class to apply to time remaining message.
    timeLimitEndTime = 0; // If time limit is enabled and submission is ongoing, the end time for the timer.
    statusTranslated?: string; // Status.
    statusColor = ''; // Color to apply to the status.
    unsupportedEditPlugins: string[] = []; // List of submission plugins that don't support edit.
    grade: AddonModAssignSubmissionGrade = {
        method: '',
        modified: 0,
        addAttempt : false,
        applyToAll: false,
        lang: 'en',
        disabled: false,
    }; // Data about the grade.

    grader?: CoreUserProfile; // Profile of the teacher that graded the submission.
    gradeInfo?: AddonModAssignGradeInfo; // Grade data for the assignment, retrieved from the server.
    isGrading = false; // Whether the user is grading.
    canSaveGrades = false; // Whether the user can save the grades.
    allowAddAttempt = false; // Allow adding a new attempt when grading.
    gradeUrl?: string; // URL to grade in browser.
    submissionUrl?: string; // URL to add/edit a submission in browser.
    isPreviousAttemptEmpty = true; // Whether the previous attempt contains an empty submission.
    showDates = false; // Whether to show some dates.
    timeLimitFinished = false; // Whether there is a time limit and it finished, so the user will submit late.

    // Some constants.
    statusNew = AddonModAssignSubmissionStatusValues.NEW;
    statusReopened = AddonModAssignSubmissionStatusValues.REOPENED;
    attemptReopenMethodNone = AddonModAssignAttemptReopenMethodValues.NONE;
    unlimitedAttempts = ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS;

    protected siteId: string; // Current site ID.
    protected currentUserId: number; // Current user ID.
    protected previousAttempt?: AddonModAssignSubmissionPreviousAttempt; // The previous attempt.
    protected submissionStatusAvailable = false; // Whether we were able to retrieve the submission status.
    protected originalGrades: AddonModAssignSubmissionOriginalGrades = {
        addAttempt: false,
        applyToAll: false,
        outcomes: {},
    }; // Object with the original grade data, to check for changes.

    protected isDestroyed = false; // Whether the component has been destroyed.
    protected syncObserver: CoreEventObserver;
    protected hasOfflineGrade = false;

    constructor(
        @Optional() protected splitviewCtrl: CoreSplitViewComponent,
    ) {
        this.siteId = CoreSites.getCurrentSiteId();
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.maxAttemptsText = Translate.instant('addon.mod_assign.unlimitedattempts');

        // Refresh data if this assign is synchronized and it's grading.
        const events = [ADDON_MOD_ASSIGN_AUTO_SYNCED, ADDON_MOD_ASSIGN_MANUAL_SYNCED];
        this.syncObserver = CoreEvents.onMultiple<AddonModAssignAutoSyncData | AddonModAssignManualSyncData>(
            events,
            async (data) => {
                // Check that user is grading and this grade wasn't blocked when sync was performed.
                if (!this.loaded || !this.isGrading || data.gradesBlocked.indexOf(this.submitId) != -1) {
                    return;
                }

                if ('context' in data && data.context == 'submission' && data.submitId == this.submitId) {
                    // Manual sync triggered by this same submission, ignore it.
                    return;
                }

                // Don't refresh if the user has modified some data.
                const hasDataToSave = await this.hasDataToSave();

                if (!hasDataToSave) {
                    this.invalidateAndRefresh(false);
                }
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
                (timeLimitEnabledBeforeDueDate ? this.userSubmission.timecreated : 0);
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
     * Check if the user can leave the view. If there are changes to be saved, it will ask for confirm.
     *
     * @returns Promise resolved with true if can leave the view, rejected otherwise.
     */
    async canLeave(): Promise<boolean> {
        // Check if there is data to save.
        const modified = await this.hasDataToSave();

        if (modified) {
            // Modified, confirm user wants to go back.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));

            await this.discardDrafts();
        }

        return true;
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
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        if (!this.previousAttempt?.submission) {
            // Cannot access previous attempts, just go to edit.
            return this.goToEdit(true);
        }

        const previousSubmission = this.previousAttempt.submission;
        let modal = await CoreDomUtils.showModalLoading();

        const size = await CoreUtils.ignoreErrors(
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
        modal = await CoreDomUtils.showModalLoading('core.sending', true);

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
            CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Discard feedback drafts.
     *
     * @returns Promise resolved when done.
     */
    protected async discardDrafts(): Promise<void> {
        if (this.assign && this.feedback && this.feedback.plugins) {
            await AddonModAssignHelper.discardFeedbackPluginData(this.assign.id, this.submitId, this.feedback);
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
                await CoreDomUtils.showConfirm(
                    Translate.instant('addon.mod_assign.confirmstart', {
                        $a: CoreTime.formatTime(this.assign.timelimit),
                    }),
                    undefined,
                    Translate.instant('addon.mod_assign.beginassignment'),
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
     * Check if there's data to save (grade).
     *
     * @param isSubmit Whether the user is about to submit the grade.
     * @returns Promise resolved with boolean: whether there's data to save.
     */
    protected async hasDataToSave(isSubmit = false): Promise<boolean> {
        if (!this.canSaveGrades || !this.loaded || !this.assign) {
            return false;
        }

        if (isSubmit && this.hasOfflineGrade) {
            // Always allow sending if the grade is saved in offline.
            return true;
        }

        // Check if numeric grade and toggles changed.
        if (this.originalGrades.grade != this.grade.grade || this.originalGrades.addAttempt != this.grade.addAttempt ||
                this.originalGrades.applyToAll != this.grade.applyToAll) {
            return true;
        }

        // Check if outcomes changed.
        if (this.gradeInfo?.outcomes) {
            for (const x in this.gradeInfo.outcomes) {
                const outcome = this.gradeInfo.outcomes[x];

                if (this.originalGrades.outcomes[outcome.id] === undefined ||
                        this.originalGrades.outcomes[outcome.id] != outcome.selectedId) {
                    return true;
                }
            }
        }

        if (!this.feedback?.plugins) {
            return false;
        }

        try {
            return AddonModAssignHelper.hasFeedbackDataChanged(
                this.assign,
                this.userSubmission,
                this.feedback,
                this.submitId,
            );
        } catch {
            // Error ocurred, consider there are no changes.
            return false;
        }
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.tabs?.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.tabs?.ionViewDidLeave();
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

        await CoreUtils.ignoreErrors(Promise.all(promises));

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

        this.previousAttempt = undefined;
        this.isPreviousAttemptEmpty = true;

        if (!this.submitId) {
            this.submitId = this.currentUserId;
            isBlind = false;
        }

        try {
            // Get the assignment.
            this.assign = await AddonModAssign.getAssignment(this.courseId, this.moduleId);

            if (this.submitId != this.currentUserId && sync) {
                // Teacher viewing a student submission. Try to sync the assign, there could be offline grades stored.
                try {
                    const result = await AddonModAssignSync.syncAssign(this.assign.id);

                    if (result && result.updated) {
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
            this.membersToSubmit = [];
            this.membersToSubmitBlind = [];

            // Search the previous attempt.
            if (submissionStatus.previousattempts && submissionStatus.previousattempts.length > 0) {
                const previousAttempts = submissionStatus.previousattempts.sort((a, b) => a.attemptnumber - b.attemptnumber);
                this.previousAttempt = previousAttempts[previousAttempts.length - 1];
                this.isPreviousAttemptEmpty =
                    AddonModAssignHelper.isSubmissionEmpty(this.assign, this.previousAttempt.submission);
            }

            // Treat last attempt.
            promises = this.treatLastAttempt(submissionStatus, this.lastAttempt);

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
            CoreDomUtils.showErrorModalDefault(error, 'Error getting assigment data.');
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Load profile of submission's user.
     *
     * @returns Promise resolved when done.
     */
    protected async loadSubmissionUserProfile(): Promise<void> {
        this.user = await CoreUser.getProfile(this.submitId, this.courseId);
    }

    /**
     * Load offline data for the submission (not the submission grade).
     *
     * @returns Promise resolved when done.
     */
    protected async loadSubmissionOfflineData(): Promise<void> {
        if (!this.assign) {
            return;
        }

        try {
            const submission = await AddonModAssignOffline.getSubmission(this.assign.id, this.submitId);

            this.hasOffline = submission && submission.plugindata && Object.keys(submission.plugindata).length > 0;

            this.submittedOffline = !!submission?.submitted;
        } catch (error) {
            // No offline data found.
            this.hasOffline = false;
            this.submittedOffline = false;
        }
    }

    /**
     * Load the data to render the feedback and grade.
     *
     * @param assign Assign data.
     * @param feedback The feedback data from the submission status.
     * @returns Promise resolved when done.
     */
    protected async loadFeedback(assign: AddonModAssignAssign, feedback?: AddonModAssignSubmissionFeedback): Promise<void> {
        this.grade = {
            method: '',
            modified: 0,
            addAttempt : false,
            applyToAll: false,
            lang: '',
            disabled: false,
        };

        this.originalGrades = {
            addAttempt: false,
            applyToAll: false,
            outcomes: {},
        };

        if (feedback) {
            this.feedback = feedback;

            // If we have data about the grader, get its profile.
            if (feedback.grade && feedback.grade.grader > 0) {
                this.grader = await CoreUtils.ignoreErrors(CoreUser.getProfile(feedback.grade.grader, this.courseId));
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

                this.grade.grade = parsedGrade >= 0 ? parsedGrade : undefined;
                this.grade.gradebookGrade = CoreUtils.formatFloat(this.grade.grade);
                this.originalGrades.grade = this.grade.grade;
            }
        } else {
            // If no feedback, always show Submission.
            this.selectedTab = 'submission';
            this.tabs.selectTab(this.selectedTab);
        }

        this.grade.gradingStatus = this.lastAttempt?.gradingstatus;

        // Get the grade for the assign.
        this.gradeInfo = await CoreCourse.getModuleBasicGradeInfo(this.moduleId);

        if (!this.gradeInfo) {
            return;
        }

        // Treat the grade info.
        await this.treatGradeInfo(assign);

        const isManual = assign.attemptreopenmethod == AddonModAssignAttemptReopenMethodValues.MANUAL;
        const isUnlimited = assign.maxattempts == ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS;
        const isLessThanMaxAttempts = !!this.userSubmission && (this.userSubmission.attemptnumber < (assign.maxattempts - 1));

        this.allowAddAttempt = isManual && (!this.userSubmission || isUnlimited || isLessThanMaxAttempts);

        if (assign.teamsubmission) {
            this.grade.applyToAll = true;
            this.originalGrades.applyToAll = true;
        }
        if (assign.markingworkflow && this.grade.gradingStatus) {
            this.workflowStatusTranslationId =
                AddonModAssign.getSubmissionGradingStatusTranslationId(this.grade.gradingStatus);
        }

        if (
            this.lastAttempt?.gradingstatus === AddonModAssignGradingStates.GRADED && !assign.markingworkflow &&
            this.userSubmission && feedback
        ) {
            if (feedback.gradeddate < this.userSubmission.timemodified) {
                this.lastAttempt.gradingstatus = AddonModAssignGradingStates.GRADED_FOLLOWUP_SUBMIT;

                // Get grading text and color.
                this.gradingStatusTranslationId = AddonModAssign.getSubmissionGradingStatusTranslationId(
                    this.lastAttempt.gradingstatus,
                );
                this.gradingColor = AddonModAssign.getSubmissionGradingStatusColor(this.lastAttempt.gradingstatus);

            }
        }

        if (!this.feedback || !this.feedback.plugins) {
            // Feedback plugins not present, we have to use assign configs to detect the plugins used.
            this.feedback = AddonModAssignHelper.createEmptyFeedback();
            this.feedback.plugins = AddonModAssignHelper.getPluginsEnabled(assign, 'assignfeedback');
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
        const submissionGrade = await CoreUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(assign.id, this.submitId),
        );

        this.hasOfflineGrade = false;

        // Load offline grades.
        if (submissionGrade && (!feedback || !feedback.gradeddate || feedback.gradeddate < submissionGrade.timemodified)) {
            // If grade has been modified from gradebook, do not use offline.
            if ((this.grade.modified || 0) < submissionGrade.timemodified) {
                this.hasOfflineGrade = true;
                this.grade.grade = !this.grade.scale
                    ? CoreUtils.formatFloat(submissionGrade.grade)
                    : submissionGrade.grade;
                this.gradingStatusTranslationId = 'addon.mod_assign.gradenotsynced';
                this.gradingColor = '';
                this.originalGrades.grade = this.grade.grade;
            }

            this.grade.applyToAll = !!submissionGrade.applytoall;
            this.grade.addAttempt = !!submissionGrade.addattempt;
            this.originalGrades.applyToAll = !!this.grade.applyToAll;
            this.originalGrades.addAttempt = !!this.grade.addAttempt;

            if (submissionGrade.outcomes && Object.keys(submissionGrade.outcomes).length && this.gradeInfo?.outcomes) {
                this.gradeInfo.outcomes.forEach((outcome) => {
                    if (outcome.itemNumber !== undefined && submissionGrade.outcomes[outcome.itemNumber] !== undefined) {
                        // If outcome has been modified from gradebook, do not use offline.
                        if ((outcome.modified || 0) < submissionGrade.timemodified) {
                            outcome.selectedId = submissionGrade.outcomes[outcome.itemNumber];
                            this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
                        }
                    }
                });
            }
        }
    }

    /**
     * Get the submission plugins that don't support editing.
     *
     * @returns Promise resolved when done.
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
     * @param status Submission status.
     */
    protected setStatusNameAndClass(status: AddonModAssignGetSubmissionStatusWSResponse): void {
        if (!this.assign) {
            return;
        }

        if (this.hasOffline || this.submittedOffline) {
            // Offline data.
            this.statusTranslated = Translate.instant('core.notsent');
            this.statusColor = CoreIonicColorNames.WARNING;
        } else if (!this.assign.teamsubmission) {

            // Single submission.
            if (this.userSubmission && this.userSubmission.status != this.statusNew) {
                this.statusTranslated = Translate.instant('addon.mod_assign.submissionstatus_' + this.userSubmission.status);
                this.statusColor = AddonModAssign.getSubmissionStatusColor(this.userSubmission.status);
            } else {
                if (!status.lastattempt?.submissionsenabled) {
                    this.statusTranslated = Translate.instant('addon.mod_assign.noonlinesubmissions');
                    this.statusColor =
                        AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ONLINE_SUBMISSIONS);
                } else {
                    this.statusTranslated = Translate.instant('addon.mod_assign.noattempt');
                    this.statusColor = AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ATTEMPT);
                }
            }
        } else {

            // Team submission.
            if (!status.lastattempt?.submissiongroup && this.assign.preventsubmissionnotingroup) {
                this.statusTranslated = Translate.instant('addon.mod_assign.nosubmission');
                this.statusColor = AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_SUBMISSION);
            } else if (this.userSubmission && this.userSubmission.status != this.statusNew) {
                this.statusTranslated = Translate.instant('addon.mod_assign.submissionstatus_' + this.userSubmission.status);
                this.statusColor = AddonModAssign.getSubmissionStatusColor(this.userSubmission.status);
            } else {
                if (!status.lastattempt?.submissionsenabled) {
                    this.statusTranslated = Translate.instant('addon.mod_assign.noonlinesubmissions');
                    this.statusColor =
                        AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_ONLINE_SUBMISSIONS);
                } else {
                    this.statusTranslated = Translate.instant('addon.mod_assign.nosubmission');
                    this.statusColor = AddonModAssign.getSubmissionStatusColor(AddonModAssignSubmissionStatusValues.NO_SUBMISSION);
                }
            }
        }
    }

    /**
     * Show advanced grade.
     */
    showAdvancedGrade(): void {
        if (this.feedback && this.feedback.advancedgrade) {
            CoreViewer.viewText(
                Translate.instant('core.grades.grade'),
                this.feedback.gradefordisplay,
                {
                    component: ADDON_MOD_ASSIGN_COMPONENT,
                    componentId: this.moduleId,
                },
            );
        }
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
            CoreDomUtils.showErrorModal('addon.mod_assign.acceptsubmissionstatement', true);

            return;
        }

        try {
            // Ask for confirmation. @todo plugin precheck_submission
            await CoreDomUtils.showConfirm(Translate.instant('addon.mod_assign.confirmsubmission'));

            const modal = await CoreDomUtils.showModalLoading('core.sending', true);

            try {
                await AddonModAssign.submitForGrading(
                    this.assign.id,
                    this.courseId,
                    acceptStatement,
                    this.userSubmission.timemodified,
                    this.hasOffline,
                );

                // Submitted, trigger event.
                CoreEvents.trigger(ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.userSubmission.id,
                    userId: this.currentUserId,
                }, this.siteId);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            } finally {
                modal.dismiss();
            }
        } catch {
            // Cancelled.
        }
    }

    /**
     * Submit a grade and feedback.
     *
     * @returns Promise resolved when done.
     */
    async submitGrade(): Promise<void> {
        // Check if there's something to be saved.
        const modified = await this.hasDataToSave(true);
        if (!modified || !this.assign) {
            return;
        }

        const attemptNumber = this.userSubmission ? this.userSubmission.attemptnumber : -1;
        const outcomes: Record<number, number> = {};
        // Scale "no grade" uses -1 instead of 0.
        const grade = this.grade.scale && this.grade.grade == 0
            ? -1
            : CoreUtils.unformatFloat(this.grade.grade, true);

        if (grade === false) {
            // Grade is invalid.
            throw new CoreError(Translate.instant('core.grades.badgrade'));
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        (this.gradeInfo?.outcomes || []).forEach((outcome) => {
            if (outcome.itemNumber && outcome.selectedId) {
                outcomes[outcome.itemNumber] = outcome.selectedId;
            }
        });

        let pluginData: AddonModAssignSavePluginData = {};
        try {
            if (this.feedback && this.feedback.plugins) {
                pluginData = await AddonModAssignHelper.prepareFeedbackPluginData(this.assign.id, this.submitId, this.feedback);
            }

            try {
                // We have all the data, now send it.
                await AddonModAssign.submitGradingForm(
                    this.assign.id,
                    this.submitId,
                    this.courseId,
                    grade || 0,
                    attemptNumber,
                    this.grade.addAttempt,
                    this.grade.gradingStatus || '',
                    this.grade.applyToAll,
                    outcomes,
                    pluginData,
                );

                // Data sent, discard draft.
                await this.discardDrafts();
            } finally {
                // Invalidate and refresh data.
                this.invalidateAndRefresh(true);

                CoreEvents.trigger(ADDON_MOD_ASSIGN_GRADED_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.submitId,
                    userId: this.currentUserId,
                }, this.siteId);
            }
        } finally {
            // Select submission view.
            this.tabs.selectTab('submission');
            modal.dismiss();
        }
    }

    /**
     * Treat the grade info.
     *
     * @param assign Assign info.
     * @returns Promise resolved when done.
     */
    protected async treatGradeInfo(assign: AddonModAssignAssign): Promise<void> {
        if (!this.gradeInfo) {
            return;
        }

        this.isGrading = true;

        // Make sure outcomes is an array.
        const gradeInfo = this.gradeInfo;
        gradeInfo.outcomes = gradeInfo.outcomes || [];

        // Check if grading method is simple or not.
        if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] && gradeInfo.advancedgrading[0].method !== undefined) {
            this.grade.method = gradeInfo.advancedgrading[0].method || 'simple';
        } else {
            this.grade.method = 'simple';
        }

        this.canSaveGrades = this.grade.method == 'simple'; // Grades can be saved if simple grading.

        const gradeNotReleased = assign.markingworkflow &&
            this.grade.gradingStatus !== AddonModAssignGradingStates.MARKING_WORKFLOW_STATE_RELEASED;

        const [gradebookGrades, assignGrades] = await Promise.all([
            CoreGradesHelper.getGradeModuleItems(this.courseId, this.moduleId, this.submitId),
            gradeNotReleased ?
                CoreUtils.ignoreErrors(AddonModAssign.getAssignmentGrades(assign.id, { cmId: assign.cmid })) :
                undefined,
        ]);

        const unreleasedGrade = Number(assignGrades?.find(grade => grade.userid === this.submitId)?.grade);
        this.grade.unreleasedGrade = undefined;

        if (gradeInfo.scale) {
            this.grade.scale = CoreUtils.makeMenuFromList(gradeInfo.scale, Translate.instant('core.nograde'));

            if (isSafeNumber(unreleasedGrade)) {
                const scaleItem = this.grade.scale.find(scaleItem => scaleItem.value === unreleasedGrade);
                this.grade.unreleasedGrade = scaleItem?.label;
                this.grade.grade = (scaleItem ?? this.grade.scale[0])?.value;
                this.originalGrades.grade = this.grade.grade;
            }
        } else {
            this.grade.unreleasedGrade = isSafeNumber(unreleasedGrade) ? unreleasedGrade : undefined;

            // Format the grade.
            this.grade.grade = CoreUtils.formatFloat(this.grade.unreleasedGrade ?? this.grade.grade);
            this.originalGrades.grade = this.grade.grade;

            // Get current language to format grade input field.
            this.grade.lang = await CoreLang.getCurrentLanguage();
        }

        // Treat outcomes.
        if (gradeInfo.outcomes) {
            gradeInfo.outcomes.forEach((outcome) => {
                if (outcome.scale) {
                    outcome.options =
                        CoreUtils.makeMenuFromList<number>(
                            outcome.scale,
                            Translate.instant('core.grades.nooutcome'),
                        );
                }
                outcome.selectedId = 0;
                this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
            });
        }

        const outcomes: AddonModAssignGradeOutcome[] = [];

        gradebookGrades.forEach((grade: CoreGradesFormattedItem) => {
            if (!grade.outcomeid && !grade.scaleid) {

                // Clean HTML tags, grade can contain an icon.
                const gradeFormatted = CoreTextUtils.cleanTags(grade.gradeformatted || '');
                // Not using outcomes or scale, get the numeric grade.
                if (this.grade.scale) {
                    this.grade.gradebookGrade = CoreUtils.formatFloat(
                        CoreGradesHelper.getGradeValueFromLabel(this.grade.scale, gradeFormatted),
                    );
                } else {
                    const parsedGrade = parseFloat(gradeFormatted);
                    this.grade.gradebookGrade = parsedGrade || parsedGrade == 0
                        ? CoreUtils.formatFloat(parsedGrade)
                        : undefined;
                }

                this.grade.disabled = !!grade.gradeislocked || !!grade.gradeisoverridden;
                this.grade.modified = grade.gradedategraded;
            } else if (grade.outcomeid) {

                // Only show outcomes with info on it, outcomeid could be null if outcomes are disabled on site.
                gradeInfo.outcomes?.forEach((outcome) => {
                    if (outcome.id == String(grade.outcomeid)) {
                        // Clean HTML tags, grade can contain an icon.
                        outcome.selected = CoreTextUtils.cleanTags(grade.gradeformatted || '');
                        outcome.modified = grade.gradedategraded;
                        if (outcome.options) {
                            outcome.selectedId = CoreGradesHelper.getGradeValueFromLabel(outcome.options, outcome.selected);
                            this.originalGrades.outcomes[outcome.id] = outcome.selectedId;
                            outcome.itemNumber = grade.itemnumber;
                        }
                        outcomes.push(outcome);
                    }
                });
                gradeInfo.disabled = grade.gradeislocked || grade.gradeisoverridden;
            }
        });

        gradeInfo.outcomes = outcomes;
    }

    /**
     * Treat the last attempt.
     *
     * @param submissionStatus Response of get submission status.
     * @param lastAttempt Last attempt (if any).
     * @returns Promises resolved when done.
     */
    protected treatLastAttempt(
        submissionStatus: AddonModAssignGetSubmissionStatusWSResponse,
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

        this.canSubmit = !this.isSubmittedForGrading && !this.submittedOffline && (lastAttempt.cansubmit ||
            (this.hasOffline && AddonModAssign.canSubmitOffline(this.assign, submissionStatus)));

        this.canEdit = !this.isSubmittedForGrading && lastAttempt.canedit &&
            (!this.submittedOffline || !this.assign.submissiondrafts);

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

        if (this.assign.attemptreopenmethod != this.attemptReopenMethodNone && this.userSubmission) {
            this.currentAttempt = this.userSubmission.attemptnumber + 1;
        }

        this.setStatusNameAndClass(submissionStatus);

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
            if (this.userSubmission &&
                this.userSubmission.status != this.statusNew &&
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
        this.gradingStatusTranslationId = AddonModAssign.getSubmissionGradingStatusTranslationId(lastAttempt.gradingstatus);
        this.gradingColor = AddonModAssign.getSubmissionGradingStatusColor(lastAttempt.gradingstatus);

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
     * Block or unblock the automatic sync of the user grade.
     *
     * @param block Whether to block or unblock.
     */
    protected setGradeSyncBlocked(block = false): void {
        if (this.isDestroyed || !this.assign || !this.isGrading) {
            return;
        }

        const syncId = AddonModAssignSync.getGradeSyncId(this.assign.id, this.submitId);

        if (block) {
            CoreSync.blockOperation(ADDON_MOD_ASSIGN_COMPONENT, syncId);
        } else {
            CoreSync.unblockOperation(ADDON_MOD_ASSIGN_COMPONENT, syncId);
        }
    }

    /**
     * A certain tab has been selected, either manually or automatically.
     *
     * @param tab The tab that was selected.
     */
    tabSelected(tab: CoreTabComponent): void {
        this.selectedTab = tab.id;
        // Block sync when selecting grade tab, unblock when leaving it.
        this.setGradeSyncBlocked(tab.id === 'grade');
    }

    /**
     * Function called when the time is up.
     */
    timeUp(): void {
        this.timeLimitFinished = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.setGradeSyncBlocked(false);
        this.isDestroyed = true;
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

type AddonModAssignSubmissionGrade = {
    method: string;
    grade?: number | string;
    gradebookGrade?: string;
    modified?: number;
    gradingStatus?: AddonModAssignGradingStates;
    addAttempt: boolean;
    applyToAll: boolean;
    scale?: CoreMenuItem<number>[];
    lang: string;
    disabled: boolean;
    unreleasedGrade?: SafeNumber | string;
};

type AddonModAssignSubmissionOriginalGrades = {
    grade?: number | string;
    addAttempt: boolean;
    applyToAll: boolean;
    outcomes: Record<number, AddonModAssignGradeOutcome>;
};

type AddonModAssignGradeInfo = Omit<CoreCourseModuleGradeInfo, 'outcomes'> & {
    outcomes?: AddonModAssignGradeOutcome[];
    disabled?: boolean;
};

type AddonModAssignGradeOutcome = CoreCourseModuleGradeOutcome & {
    selectedId?: number;
    selected?: string;
    modified?: number;
    options?: CoreMenuItem<number>[];
    itemNumber?: number;
};
