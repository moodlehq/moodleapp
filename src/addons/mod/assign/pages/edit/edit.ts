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
} from '../../services/assign';
import { AddonModAssignHelper } from '../../services/assign-helper';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { AddonModAssignSync } from '../../services/assign-sync';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreWSExternalFile } from '@services/ws';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_COMPONENT_LEGACY,
    ADDON_MOD_ASSIGN_MODNAME,
    ADDON_MOD_ASSIGN_STARTED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
} from '../../constants';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { AddonModAssignSubmissionPluginComponent } from '../../components/submission-plugin/submission-plugin';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that allows adding or editing an assigment submission.
 */
@Component({
    selector: 'page-addon-mod-assign-edit',
    templateUrl: 'edit.html',
    styleUrl: 'edit.scss',
    imports: [
        CoreSharedModule,
        AddonModAssignSubmissionPluginComponent,
    ],
})
export default class AddonModAssignEditPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('editSubmissionForm') formElement?: ElementRef;

    title: string; // Title to display.
    assign?: AddonModAssignAssign; // Assignment.
    courseId!: number; // Course ID the assignment belongs to.
    moduleId!: number; // Module ID the submission belongs to.
    userSubmission?: AddonModAssignSubmission; // The user submission.
    submissionStatement?: string; // The submission statement.
    submissionStatementAccepted = false; // Whether submission statement is accepted.
    loaded = false; // Whether data has been loaded.
    timeLimitEndTime = 0; // If time limit is enabled, the end time for the timer.
    activityInstructions?: string; // Activity instructions.
    introAttachments?: CoreWSExternalFile[]; // Intro attachments.
    component = ADDON_MOD_ASSIGN_COMPONENT_LEGACY;

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
            CoreAlerts.showError(error);
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
            await CoreAlerts.confirmLeaveWithChanges();
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

            // Fetch filtered submission first to be able to calculate if we need to fetch unfiltered or not.
            const options: AddonModAssignSubmissionStatusOptions = {
                userId: this.userId,
                isBlind: this.isBlind,
                cmId: this.assign.cmid,
                filter: true,
                readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
                checkFetchOriginal: false,
            };
            let submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign, options);
            const filteredSubmissionStatus = submissionStatus;
            let userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);

            const shouldFetchUnfiltered =
                await AddonModAssignHelper.shouldFetchUnfilteredSubmissionToEdit(this.assign, userSubmission);

            if (shouldFetchUnfiltered) {
                submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign, {
                    ...options,
                    filter: false,
                });
                userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);
            }

            this.userSubmission = userSubmission;

            if (!submissionStatus.lastattempt?.canedit) {
                // Can't edit. Reject.
                throw new CoreError(Translate.instant('core.nopermissions', { $a: this.editText }));
            }

            submissionStatus = await this.startSubmissionIfNeeded(submissionStatus, options);

            if (filteredSubmissionStatus.assignmentdata?.activity) {
                // There are activity instructions. Make sure to display it with filters applied.
                // Apply a workaround to URLs for sites that don't have MDL-83474 fixed.
                this.activityInstructions = filteredSubmissionStatus.assignmentdata?.activity
                    .replace(/mod_assign\/activityattachment\/(?!0\/)/g, 'mod_assign/activityattachment/0/');
            }

            this.introAttachments = submissionStatus.assignmentdata?.attachments?.intro ?? this.assign.introattachments;

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

            // Check if there's any offline data for this submission.
            this.hasOffline = await CorePromiseUtils.promiseWorks(AddonModAssignOffline.getSubmission(this.assign.id, this.userId));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_assign_save_submission',
                name: Translate.instant('addon.mod_assign.subpagetitle', {
                    contextname: this.assign.name,
                    subpage: Translate.instant('addon.mod_assign.editsubmission'),
                }),
                data: { id: this.assign.id, category: ADDON_MOD_ASSIGN_MODNAME },
                url: `/mod/assign/view.php?action=editsubmission&id=${this.moduleId}`,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting assigment data.' });

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

        if (this.userSubmission && !AddonModAssign.isNewOrReopenedSubmission(this.userSubmission.status)) {
            // There is an ongoing submission, no need to start it.
            return submissionStatus;
        }

        await AddonModAssign.startSubmission(this.assign.id);

        CoreEvents.trigger(ADDON_MOD_ASSIGN_STARTED_EVENT, {
            assignmentId: this.assign.id,
        }, CoreSites.getCurrentSiteId());

        // Submission started, update the submission status.
        const newSubmissionStatus = await AddonModAssign.getSubmissionStatus(this.assign, {
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
            if (!this.saveOffline && !CoreWSError.isWebServiceError(error)) {
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
            CoreAlerts.showError(error, { default: 'Error saving submission.' });
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

        if (AddonModAssignHelper.isSubmissionEmptyForEdit(this.assign!, this.userSubmission!, inputData)) {
            throw Translate.instant('addon.mod_assign.submissionempty');
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
            await CoreFileUploaderHelper.confirmUploadFile(size, true, true);

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
                    this.userSubmission!.timemodified,
                    !!this.assign!.submissiondrafts,
                    this.userId,
                );
            }

            // Clear temporary data from plugins.
            AddonModAssignHelper.clearSubmissionPluginTmpData(this.assign!, this.userSubmission, inputData);

            if (sent) {
                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: ADDON_MOD_ASSIGN_MODNAME });
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
