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

import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController, Translate } from '@singletons';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignSavePluginData,
    AddonModAssignSubmissionFeedback,
} from '../../services/assign';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModAssignFeedbackPluginComponent } from '../feedback-plugin/feedback-plugin';
import { isSafeNumber, SafeNumber } from '@/core/utils/types';
import { CoreMenuItem, CoreUtils } from '@singletons/utils';
import {
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_GRADED_EVENT,
    ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS,
    AddonModAssignAttemptReopenMethodValues,
    AddonModAssignGradingStates,
} from '../../constants';
import { CoreCourse, CoreCourseModuleGradeInfo, CoreCourseModuleGradeOutcome } from '@features/course/services/course';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../../services/assign-helper';
import { CoreError } from '@classes/errors/error';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreEvents } from '@singletons/events';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { AddonModAssignSync } from '../../services/assign-sync';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSync } from '@services/sync';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreGradesHelper, CoreGradesFormattedItem } from '@features/grades/services/grades-helper';
import { CoreLang } from '@services/lang';
import { CoreText } from '@singletons/text';
import { CoreFormFields, CoreForms } from '@singletons/form';

/**
 * Modal that allows editing a submission feedback.
 */
@Component({
    selector: 'addon-mod-assign-edit-feedback-modal',
    templateUrl: 'edit-feedback-modal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        AddonModAssignFeedbackPluginComponent,
    ],
})
export class AddonModAssignEditFeedbackModalComponent implements OnDestroy, OnInit {

    @Input({ required: true }) courseId!: number; // Course ID the submission belongs to.
    @Input({ required: true }) moduleId!: number; // Module ID the submission belongs to.
    @Input({ required: true }) assign!: AddonModAssignAssign; // The assignment.
    @Input({ required: true }) submitId!: number; // User that did the submission. Defaults to current user
    @Input() blindId?: number; // Blinded user ID (if it's blinded).
    @Input() gradingStatus?: AddonModAssignGradingStates; // Grading status of the last attempt.
    @Input() feedback?: AddonModAssignSubmissionFeedback; // Feedback of the last attempt.
    @Input() userSubmission?: AddonModAssignSubmissionFormatted; // The submission object.

    @ViewChild('editFeedbackForm') formElement?: ElementRef;

    grade: AddonModAssignSubmissionGrade = {
        method: '',
        modified: 0,
        addAttempt : false,
        applyToAll: false,
        lang: 'en',
        disabled: false,
    }; // Data about the grade.

    loaded = false;
    gradeInfo?: AddonModAssignGradeInfo; // Grade data for the assignment, retrieved from the server.
    allowAddAttempt = false; // Allow adding a new attempt when grading.

    unlimitedAttempts = ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS;
    currentAttemptNumber = 0; // The current attempt number.
    maxAttemptsText = ''; // The text for maximum attempts.

    protected hasOfflineGrade = false;
    protected isDestroyed = false; // Whether the component has been destroyed.
    protected siteId: string; // Current site ID.
    protected currentUserId: number; // Current user ID.
    protected originalGrades: AddonModAssignSubmissionOriginalGrades = {
        addAttempt: false,
        applyToAll: false,
        outcomes: {},
    }; // Object with the original grade data, to check for changes.

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.maxAttemptsText = Translate.instant('addon.mod_assign.unlimitedattempts');
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.setGradeSyncBlocked(true);
        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     */
    protected async fetchData(): Promise<void> {
        try {
            if (this.userSubmission) {
                this.currentAttemptNumber = this.userSubmission.attemptnumber + 1;
            }

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

            // Do not override already loaded grade.
            if (this.feedback?.grade?.grade && !this.grade.grade) {
                const parsedGrade = parseFloat(this.feedback.grade.grade);

                this.grade.grade = parsedGrade >= 0 ? parsedGrade : undefined;
                this.grade.gradebookGrade = CoreUtils.formatFloat(this.grade.grade);
                this.originalGrades.grade = this.grade.grade;
            }

            // Get the grade for the assign.
            this.gradeInfo = await CoreCourse.getModuleBasicGradeInfo(this.moduleId);

            const assign = this.assign;

            // Treat the grade info.
            await this.treatGradeInfo(assign);

            const isManual = assign.attemptreopenmethod == AddonModAssignAttemptReopenMethodValues.MANUAL;
            const isUnlimited = assign.maxattempts === ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS;
            const isLessThanMaxAttempts = !!this.userSubmission && (this.userSubmission.attemptnumber < (assign.maxattempts - 1));

            this.allowAddAttempt = isManual && (!this.userSubmission || isUnlimited || isLessThanMaxAttempts);

            if (assign.teamsubmission) {
                this.grade.applyToAll = true;
                this.originalGrades.applyToAll = true;
            }

            await this.loadFeedbackData();
        } catch (error) {
            CoreAlerts.showError(error);
            this.closeModal(true);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Load feedback data.
     */
    protected async loadFeedbackData(): Promise<void> {
        // Check if there is offline data first.
        this.hasOfflineGrade = false;

        // Submission grades aren't identified by attempt number so it can retrieve the feedback for a previous attempt.
        // The app will not treat that as an special case.
        const submissionGrade = await CorePromiseUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(this.assign.id, this.submitId),
        );

        if (!submissionGrade && this.feedback) {
            // No offline data and there is online feedback. Check if editing offline is allowed.
            const canEditOffline = await AddonModAssignHelper.canEditFeedbackOffline(this.assign, this.submitId, this.feedback);

            if (!canEditOffline) {
                // Cannot edit offline, this usually means the feedback uses filters. Try to load the unfiltered data.
                const submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign.id, {
                    userId: this.submitId,
                    isBlind: !!this.blindId,
                    cmId: this.assign.cmid,
                    filter: false,
                    readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                });

                this.feedback = submissionStatus.feedback;
            }
        }

        if (!this.feedback) {
            // Feedback plugins not present, we have to use assign configs to detect the plugins used.
            this.feedback = AddonModAssignHelper.createEmptyFeedback();
            this.feedback.plugins = AddonModAssignHelper.getPluginsEnabled(this.assign, 'assignfeedback');
        }

        // Load offline grades.
        if (submissionGrade && (!this.feedback.gradeddate || this.feedback.gradeddate < submissionGrade.timemodified)) {
            // If grade has been modified from gradebook, do not use offline.
            if ((this.grade.modified || 0) < submissionGrade.timemodified) {
                this.hasOfflineGrade = true;
                this.grade.grade = !this.grade.scale
                    ? CoreUtils.formatFloat(submissionGrade.grade)
                    : submissionGrade.grade;
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
     * Treat the grade info.
     *
     * @param assign Assign info.
     */
    protected async treatGradeInfo(assign: AddonModAssignAssign): Promise<void> {
        if (!this.gradeInfo) {
            this.closeModal(true);

            return;
        }

        // Make sure outcomes is an array.
        const gradeInfo = this.gradeInfo;
        gradeInfo.outcomes = gradeInfo.outcomes || [];

        // Check if grading method is simple or not.
        if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] && gradeInfo.advancedgrading[0].method !== undefined) {
            this.grade.method = gradeInfo.advancedgrading[0].method || 'simple';
        } else {
            this.grade.method = 'simple';
        }

        if (this.grade.method !== 'simple') {
            // Should not happen.
            this.closeModal(true);

            return;
        }

        const gradeNotReleased = assign.markingworkflow &&
            this.gradingStatus !== AddonModAssignGradingStates.MARKING_WORKFLOW_STATE_RELEASED;

        const [gradebookGrades, assignGrades] = await Promise.all([
            CoreGradesHelper.getGradeModuleItems(this.courseId, this.moduleId, this.submitId),
            gradeNotReleased ?
                CorePromiseUtils.ignoreErrors(AddonModAssign.getAssignmentGrades(assign.id, { cmId: assign.cmid })) :
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
                const gradeFormatted = CoreText.cleanTags(grade.gradeformatted || '');
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
                        outcome.selected = CoreText.cleanTags(grade.gradeformatted || '');
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
     * Close modal checking if there are changes first.
     *
     * @param force Whether to force closing the modal, without checking changes.
     */
    async closeModal(force = false): Promise<void> {
        const canLeave = force || await this.canLeave();
        if (canLeave) {
            this.dismissModal(false);
        }
    }

    /**
     * Check if there's data to save (grade).
     *
     * @param isSubmit Whether the user is about to submit the grade.
     * @returns Promise resolved with boolean: whether there's data to save.
     */
    protected async hasDataToSave(isSubmit = false): Promise<boolean> {
        if (!this.assign) {
            return false;
        }

        if (isSubmit && this.hasOfflineGrade) {
            // Always allow sending if the grade is saved in offline.
            return true;
        }

        // Check if numeric grade and toggles changed.
        if (this.originalGrades.grade !== this.grade.grade || this.originalGrades.addAttempt !== this.grade.addAttempt ||
                this.originalGrades.applyToAll !== this.grade.applyToAll) {
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
            const inputData = this.getInputData();

            return AddonModAssignHelper.hasFeedbackDataChanged(
                this.assign,
                this.userSubmission,
                this.feedback,
                this.submitId,
                inputData,
            );
        } catch {
            // Error ocurred, consider there are no changes.
            return false;
        }
    }

    /**
     * Submit a grade and feedback.
     */
    async submitGrade(): Promise<void> {
        // Check if there's something to be saved.
        const modified = await this.hasDataToSave(true);
        if (!modified || !this.assign) {
            this.dismissModal(false);

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

        const sendingModal = await CoreLoadings.show('core.sending', true);

        (this.gradeInfo?.outcomes || []).forEach((outcome) => {
            if (outcome.itemNumber && outcome.selectedId) {
                outcomes[outcome.itemNumber] = outcome.selectedId;
            }
        });

        const inputData = this.getInputData();

        let pluginData: AddonModAssignSavePluginData = {};
        try {
            if (this.feedback && this.feedback.plugins) {
                pluginData =
                    await AddonModAssignHelper.prepareFeedbackPluginData(this.assign.id, this.submitId, this.feedback, inputData);
            }

            try {
                // We have all the data, now send it.
                const online = await AddonModAssign.submitGradingForm(
                    this.assign.id,
                    this.submitId,
                    this.courseId,
                    grade || 0,
                    attemptNumber,
                    this.grade.addAttempt,
                    this.gradingStatus || '',
                    this.grade.applyToAll,
                    outcomes,
                    pluginData,
                );

                // Data sent, discard draft.
                await this.discardDrafts();

                this.dismissModal(true, online);
            } finally {
                CoreEvents.trigger(ADDON_MOD_ASSIGN_GRADED_EVENT, {
                    assignmentId: this.assign.id,
                    submissionId: this.submitId,
                    userId: this.currentUserId,
                }, this.siteId);
            }
        } finally {
            sendingModal.dismiss();
        }
    }

    /**
     * Get the input data.
     *
     * @returns Input data.
     */
    protected getInputData(): CoreFormFields {
        return CoreForms.getDataFromForm(document.forms['addon-mod_assign-edit-feedback-form']);
    }

    /**
     * Discard feedback drafts.
     */
    protected async discardDrafts(): Promise<void> {
        if (this.assign && this.feedback && this.feedback.plugins) {
            // eslint-disable-next-line deprecation/deprecation
            await AddonModAssignHelper.discardFeedbackPluginData(this.assign.id, this.submitId, this.feedback);
        }
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
            const confirmed = await CorePromiseUtils.promiseWorks(CoreAlerts.confirmLeaveWithChanges());
            if (!confirmed) {
                return false;
            }

            await this.discardDrafts();
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.setGradeSyncBlocked(false);
        this.isDestroyed = true;
    }

    /**
     * Block or unblock the automatic sync of the user grade.
     *
     * @param block Whether to block or unblock.
     */
    protected setGradeSyncBlocked(block = false): void {
        if (this.isDestroyed) {
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
     * Dismiss the modal.
     *
     * @param savedData Whether data was saved.
     * @param online Whether the submission was done in online or offline (only if saved data)-
     */
    protected dismissModal(savedData: boolean, online?: boolean): void {
        if (savedData) {
            CoreForms.triggerFormSubmittedEvent(this.formElement, online, CoreSites.getCurrentSiteId());
        } else {
            CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());
        }

        ModalController.dismiss(savedData);
    }

}

type AddonModAssignSubmissionGrade = {
    method: string;
    grade?: number | string;
    gradebookGrade?: string;
    modified?: number;
    addAttempt: boolean;
    applyToAll: boolean;
    scale?: CoreMenuItem<number>[];
    lang: string;
    disabled: boolean;
    unreleasedGrade?: SafeNumber | string;
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

type AddonModAssignSubmissionOriginalGrades = {
    grade?: number | string;
    addAttempt: boolean;
    applyToAll: boolean;
    outcomes: Record<number, AddonModAssignGradeOutcome>;
};
