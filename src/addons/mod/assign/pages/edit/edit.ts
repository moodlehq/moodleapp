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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CanLeave } from '@guards/can-leave';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreFormFields, CoreForms } from '@singletons/form';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssign,
    AddonModAssignSubmissionStatusOptions,
    AddonModAssignGetSubmissionStatusWSResponse,
    AddonModAssignSavePluginData,
    AddonModAssignSubmissionStatusValues,
} from '../../services/assign';
import { AddonModAssignHelper } from '../../services/assign-helper';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { AddonModAssignSync } from '../../services/assign-sync';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile } from '@services/ws';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_STARTED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
} from '../../constants';
import { CoreToasts, ToastDuration } from '@services/toasts';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that allows adding or editing an assigment submission.
 */
@Component({
    selector: 'page-addon-mod-assign-edit',
    templateUrl: 'edit.html',
    styleUrls: ['edit.scss'],
})
export class AddonModAssignEditPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('editSubmissionForm') formElement?: ElementRef;

    title: string; // Title to display.
    assign?: AddonModAssignAssign; // Assignment.
    courseId!: number; // Course ID the assignment belongs to.
    moduleId!: number; // Module ID the submission belongs to.
    userSubmission?: AddonModAssignSubmission; // The user submission.
    allowOffline = false; // Whether offline is allowed.
    submissionStatement?: string; // The submission statement.
    submissionStatementAccepted = false; // Whether submission statement is accepted.
    loaded = false; // Whether data has been loaded.
    timeLimitEndTime = 0; // If time limit is enabled, the end time for the timer.
    activityInstructions?: string; // Activity instructions.
    introAttachments?: CoreWSExternalFile[]; // Intro attachments.
    component = ADDON_MOD_ASSIGN_COMPONENT;

    protected userId: number; // User doing the submission.
    protected isBlind = false; // Whether blind is used.
    protected editText: string; // "Edit submission" translated text.
    protected saveOffline = false; // Whether to save data in offline.
    protected hasOffline = false; // Whether the assignment has offline data.
    protected isDestroyed = false; // Whether the component has been destroyed.
    protected forceLeave = false; // To allow leaving the page without checking for changes.
    protected timeUpToast?: HTMLIonToastElement;

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.userId = CoreSites.getCurrentSiteUserId(); // Right now we can only edit current user's submissions.
        this.editText = Translate.instant('addon.mod_assign.editsubmission');
        this.title = this.editText;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.moduleId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.isBlind = !!CoreNavigator.getRouteNumberParam('blindId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.fetchAssignment().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave) {
            return true;
        }

        // Check if data has changed.
        const changed = await this.hasDataChanged();
        if (changed) {
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        // Nothing has changed or user confirmed to leave. Clear temporary data from plugins.
        AddonModAssignHelper.clearSubmissionPluginTmpData(this.assign!, this.userSubmission, this.getInputData());

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Fetch assignment data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAssignment(): Promise<void> {
        const currentUserId = CoreSites.getCurrentSiteUserId();

        try {
            // Get assignment data.
            this.assign = await AddonModAssign.getAssignment(this.courseId, this.moduleId);
            this.title = this.assign.name || this.title;

            if (!this.isDestroyed) {
                // Block the assignment.
                CoreSync.blockOperation(ADDON_MOD_ASSIGN_COMPONENT, this.assign.id);
            }

            // Wait for sync to be over (if any).
            await AddonModAssignSync.waitForSync(this.assign.id);

            // Get submission status. Ignore cache to get the latest data.
            const options: AddonModAssignSubmissionStatusOptions = {
                userId: this.userId,
                isBlind: this.isBlind,
                cmId: this.assign.cmid,
                filter: false,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            };

            let submissionStatus: AddonModAssignGetSubmissionStatusWSResponse;
            try {
                submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign.id, options);
                this.userSubmission =
                    AddonModAssign.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);
            } catch (error) {
                // Cannot connect. Get cached data.
                options.filter = true;
                options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

                submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign.id, options);
                this.userSubmission =
                    AddonModAssign.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);

                // Check if the user can edit it in offline.
                const canEditOffline =
                    await AddonModAssignHelper.canEditSubmissionOffline(this.assign, this.userSubmission);
                if (!canEditOffline) {
                    // Submission cannot be edited in offline, reject.
                    this.allowOffline = false;
                    throw error;
                }
            }

            if (!submissionStatus.lastattempt?.canedit) {
                // Can't edit. Reject.
                throw new CoreError(Translate.instant('core.nopermissions', { $a: this.editText }));
            }

            submissionStatus = await this.startSubmissionIfNeeded(submissionStatus, options);

            if (submissionStatus.assignmentdata?.activity) {
                // There are activity instructions. Make sure to display it with filters applied.
                const filteredSubmissionStatus = options.filter ?
                    submissionStatus :
                    await AddonModAssign.getSubmissionStatus(this.assign.id, {
                        ...options,
                        filter: true,
                    });

                this.activityInstructions = filteredSubmissionStatus.assignmentdata?.activity;
            }

            this.introAttachments = submissionStatus.assignmentdata?.attachments?.intro ?? this.assign.introattachments;

            this.allowOffline = true; // If offline isn't allowed we shouldn't have reached this point.

            // If received submission statement is empty, then it's not required.
            if(!this.assign.submissionstatement && this.assign.submissionstatement !== undefined) {
                this.assign.requiresubmissionstatement = 0;
            }

            // Only show submission statement if we are editing our own submission.
            if (this.assign.requiresubmissionstatement && !this.assign.submissiondrafts && this.userId == currentUserId) {
                this.submissionStatement = this.assign.submissionstatement;
            } else {
                this.submissionStatement = undefined;
            }

            if (this.assign.timelimit && this.userSubmission?.timestarted) {
                this.timeLimitEndTime = AddonModAssignHelper.calculateEndTime(this.assign, this.userSubmission);
            } else {
                this.timeLimitEndTime = 0;
            }

            try {
                // Check if there's any offline data for this submission.
                const offlineData = await AddonModAssignOffline.getSubmission(this.assign.id, this.userId);

                this.hasOffline = offlineData?.plugindata && Object.keys(offlineData.plugindata).length > 0;
            } catch {
                // No offline data found.
                this.hasOffline = false;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_assign_save_submission',
                name: Translate.instant('addon.mod_assign.subpagetitle', {
                    contextname: this.assign.name,
                    subpage: Translate.instant('addon.mod_assign.editsubmission'),
                }),
                data: { id: this.assign.id, category: 'assign' },
                url: `/mod/assign/view.php?action=editsubmission&id=${this.moduleId}`,
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting assigment data.');

            // Leave the player.
            this.leaveWithoutCheck();
        }
    }

    /**
     * Start the submission if needed.
     *
     * @param submissionStatus Current submission status.
     * @param options Options.
     * @returns Promise resolved with the new submission status if it changed, original submission status otherwise.
     */
    protected async startSubmissionIfNeeded(
        submissionStatus: AddonModAssignGetSubmissionStatusWSResponse,
        options: AddonModAssignSubmissionStatusOptions,
    ): Promise<AddonModAssignGetSubmissionStatusWSResponse> {
        if (!this.assign || !this.assign.timelimit) {
            // Submission only needs to be started if there's a timelimit.
            return submissionStatus;
        }

        if (this.userSubmission && this.userSubmission.status !== AddonModAssignSubmissionStatusValues.NEW &&
            this.userSubmission.status !== AddonModAssignSubmissionStatusValues.REOPENED) {
            // There is an ongoing submission, no need to start it.
            return submissionStatus;
        }

        await AddonModAssign.startSubmission(this.assign.id);

        CoreEvents.trigger(ADDON_MOD_ASSIGN_STARTED_EVENT, {
            assignmentId: this.assign.id,
        }, CoreSites.getCurrentSiteId());

        // Submission started, update the submission status.
        const newSubmissionStatus = await AddonModAssign.getSubmissionStatus(this.assign.id, {
            ...options,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK, // Make sure not to use cache.
        });

        this.userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(this.assign, newSubmissionStatus.lastattempt);

        return newSubmissionStatus;
    }

    /**
     * Get the input data.
     *
     * @returns Input data.
     */
    protected getInputData(): CoreFormFields {
        return CoreForms.getDataFromForm(document.forms['addon-mod_assign-edit-form']);
    }

    /**
     * Check if data has changed.
     *
     * @returns Promise resolved with boolean: whether data has changed.
     */
    protected async hasDataChanged(): Promise<boolean> {
        // Usually the hasSubmissionDataChanged call will be resolved inmediately, causing the modal to be shown just an instant.
        // We'll wait a bit before showing it to prevent this "blink".
        const modal = await CoreLoadings.show();

        const data = this.getInputData();

        return AddonModAssignHelper.hasSubmissionDataChanged(this.assign!, this.userSubmission, data).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Leave the view without checking for changes.
     */
    protected leaveWithoutCheck(): void {
        this.forceLeave = true;
        CoreNavigator.back();
    }

    /**
     * Get data to submit based on the input data.
     *
     * @param inputData The input data.
     * @returns Promise resolved with the data to submit.
     */
    protected async prepareSubmissionData(inputData: CoreFormFields): Promise<AddonModAssignSavePluginData> {
        // If there's offline data, always save it in offline.
        this.saveOffline = this.hasOffline;

        try {
            return await AddonModAssignHelper.prepareSubmissionPluginData(
                this.assign!,
                this.userSubmission,
                inputData,
                this.hasOffline,
            );
        } catch (error) {
            if (this.allowOffline && !this.saveOffline && !CoreUtils.isWebServiceError(error)) {
                // Cannot submit in online, prepare for offline usage.
                this.saveOffline = true;

                return AddonModAssignHelper.prepareSubmissionPluginData(
                    this.assign!,
                    this.userSubmission,
                    inputData,
                    true,
                );
            }

            throw error;
        }
    }

    /**
     * Save the submission.
     */
    async save(): Promise<void> {
        // Check if data has changed.
        const changed = await this.hasDataChanged();
        if (!changed) {
            // Nothing to save, just go back.
            this.leaveWithoutCheck();

            return;
        }
        try {
            await this.saveSubmission();
            this.leaveWithoutCheck();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error saving submission.');
        }
    }

    /**
     * Save the submission.
     *
     * @returns Promise resolved when done.
     */
    protected async saveSubmission(): Promise<void> {
        const inputData = this.getInputData();

        if (this.submissionStatement && (!inputData.submissionstatement || inputData.submissionstatement === 'false')) {
            throw Translate.instant('addon.mod_assign.acceptsubmissionstatement');
        }

        let modal = await CoreLoadings.show();
        let size = -1;

        // Get size to ask for confirmation.
        try {
            size = await AddonModAssignHelper.getSubmissionSizeForEdit(this.assign!, this.userSubmission!, inputData);
        } catch (error) {
            // Error calculating size, return -1.
            size = -1;
        }

        modal.dismiss();

        try {
            // Confirm action.
            await CoreFileUploaderHelper.confirmUploadFile(size, true, this.allowOffline);

            modal = await CoreLoadings.show('core.sending', true);

            const pluginData = await this.prepareSubmissionData(inputData);
            if (!Object.keys(pluginData).length) {
                // Nothing to save.
                return;
            }

            let sent: boolean;

            if (this.saveOffline) {
                // Save submission in offline.
                sent = false;
                await AddonModAssignOffline.saveSubmission(
                    this.assign!.id,
                    this.courseId,
                    pluginData,
                    this.userSubmission!.timemodified,
                    !this.assign!.submissiondrafts,
                    this.userId,
                );
            } else {
                // Try to send it to server.
                sent = await AddonModAssign.saveSubmission(
                    this.assign!.id,
                    this.courseId,
                    pluginData,
                    this.allowOffline,
                    this.userSubmission!.timemodified,
                    !!this.assign!.submissiondrafts,
                    this.userId,
                );
            }

            // Clear temporary data from plugins.
            AddonModAssignHelper.clearSubmissionPluginTmpData(this.assign!, this.userSubmission, inputData);

            if (sent) {
                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'assign' });
            }

            // Submission saved, trigger events.
            CoreForms.triggerFormSubmittedEvent(this.formElement, sent, CoreSites.getCurrentSiteId());

            CoreEvents.trigger(
                ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
                {
                    assignmentId: this.assign!.id,
                    submissionId: this.userSubmission!.id,
                    userId: this.userId,
                },
                CoreSites.getCurrentSiteId(),
            );

            if (!this.assign!.submissiondrafts) {
                // No drafts allowed, so it was submitted. Trigger event.
                CoreEvents.trigger(
                    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
                    {
                        assignmentId: this.assign!.id,
                        submissionId: this.userSubmission!.id,
                        userId: this.userId,
                    },
                    CoreSites.getCurrentSiteId(),
                );
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Function called when the time is up.
     */
    async timeUp(): Promise<void> {
        this.timeUpToast = await CoreToasts.show({
            message: Translate.instant('addon.mod_assign.caneditsubmission'),
            duration: ToastDuration.STICKY,
            buttons: [Translate.instant('core.dismiss')],
            cssClass: 'core-danger-toast',
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.timeUpToast?.dismiss();

        // Unblock the assignment.
        if (this.assign) {
            CoreSync.unblockOperation(ADDON_MOD_ASSIGN_COMPONENT, this.assign.id);
        }
    }

}
