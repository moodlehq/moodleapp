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
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CanLeave } from '@guards/can-leave';
import { CoreFile } from '@services/file';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import {
    AddonModWorkshop,
    AddonModWorkshopSubmissionChangedEventData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopData,
} from '../../services/workshop';
import { AddonModWorkshopHelper, AddonModWorkshopSubmissionDataWithOfflineData } from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_WORKSHOP_COMPONENT,
    ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED,
    AddonModWorkshopAction,
    AddonModWorkshopSubmissionType,
} from '@addons/mod/workshop/constants';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that displays the workshop edit submission.
 */
@Component({
    selector: 'page-addon-mod-workshop-edit-submission',
    templateUrl: 'edit-submission.html',
})
export class AddonModWorkshopEditSubmissionPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('editFormEl') formElement!: ElementRef;

    module!: CoreCourseModuleData;
    courseId!: number;
    access!: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    submission?: AddonModWorkshopSubmissionDataWithOfflineData;

    loaded = false;
    component = ADDON_MOD_WORKSHOP_COMPONENT;
    componentId!: number;
    editForm: FormGroup; // The form group.
    editorExtraParams: Record<string, unknown> = {}; // Extra params to identify the draft.
    workshop?: AddonModWorkshopData;
    textAvailable = false;
    textRequired = false;
    fileAvailable = false;
    fileRequired = false;
    attachments: CoreFileEntry[] = [];

    protected workshopId!: number;
    protected submissionId = 0;
    protected userId: number;
    protected originalData: AddonModWorkshopEditSubmissionInputData = {
        title: '',
        content: '',
        attachmentfiles: [],
    };

    protected hasOffline = false;
    protected editing = false;
    protected forceLeave = false;
    protected siteId: string;
    protected isDestroyed = false;

    constructor(
        protected fb: FormBuilder,
    ) {

        this.userId = CoreSites.getCurrentSiteUserId();
        this.siteId = CoreSites.getCurrentSiteId();

        this.editForm = new FormGroup({});
        this.editForm.addControl('title', this.fb.control('', Validators.required));
        this.editForm.addControl('content', this.fb.control(''));
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.module = CoreNavigator.getRequiredRouteParam<CoreCourseModuleData>('module');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.access = CoreNavigator.getRequiredRouteParam<AddonModWorkshopGetWorkshopAccessInformationWSResponse>('access');
            this.submissionId = CoreNavigator.getRouteNumberParam('submissionId') || 0;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        if (this.submissionId > 0) {
            this.editorExtraParams.id = this.submissionId;
        }

        this.workshopId = this.module.instance;
        this.componentId = this.module.id;

        if (!this.isDestroyed) {
            // Block the workshop.
            CoreSync.blockOperation(this.component, this.workshopId);
        }

        this.fetchSubmissionData();
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
        if (this.hasDataChanged()) {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        if (this.submission?.attachmentfiles) {
            // Delete the local files from the tmp folder.
            CoreFileUploader.clearTmpFiles(this.submission.attachmentfiles);
        }

        CoreForms.triggerFormCancelledEvent(this.formElement, this.siteId);

        return true;
    }

    /**
     * Fetch the submission data.
     *
     * @returns Resolved when done.
     */
    protected async fetchSubmissionData(): Promise<void> {
        try {
            this.workshop = await AddonModWorkshop.getWorkshop(this.courseId, this.module.id);
            this.textAvailable = (this.workshop.submissiontypetext != AddonModWorkshopSubmissionType.SUBMISSION_TYPE_DISABLED);
            this.textRequired = (this.workshop.submissiontypetext == AddonModWorkshopSubmissionType.SUBMISSION_TYPE_REQUIRED);
            this.fileAvailable = (this.workshop.submissiontypefile != AddonModWorkshopSubmissionType.SUBMISSION_TYPE_DISABLED);
            this.fileRequired = (this.workshop.submissiontypefile == AddonModWorkshopSubmissionType.SUBMISSION_TYPE_REQUIRED);

            this.editForm.controls.content.setValidators(this.textRequired ? Validators.required : null);

            if (this.submissionId > 0) {
                this.editing = true;

                this.submission =
                    await AddonModWorkshopHelper.getSubmissionById(this.workshopId, this.submissionId, { cmId: this.module.id });

                const canEdit = this.userId == this.submission.authorid &&
                    this.access.cansubmit &&
                    this.access.modifyingsubmissionallowed;

                if (!canEdit) {
                    // Should not happen, but go back if does.
                    this.forceLeavePage();

                    return;
                }
            } else if (!this.access.cansubmit || !this.access.creatingsubmissionallowed) {
                // Should not happen, but go back if does.
                this.forceLeavePage();

                return;
            }

            const submissionsActions = await AddonModWorkshopOffline.getSubmissions(this.workshopId);
            if (submissionsActions && submissionsActions.length) {
                this.hasOffline = true;
                this.submission = await AddonModWorkshopHelper.applyOfflineData(this.submission, submissionsActions);
            } else {
                this.hasOffline = false;
            }

            if (this.submission) {
                this.originalData.title = this.submission.title || '';
                this.originalData.content = this.submission.content || '';
                this.originalData.attachmentfiles = [];

                (this.submission.attachmentfiles || []).forEach((file) => {
                    let filename = CoreFile.getFileName(file);
                    if (!filename) {
                        // We don't have filename, extract it from the path.
                        filename = CoreFileHelper.getFilenameFromPath(file) || '';
                    }

                    this.originalData.attachmentfiles.push({
                        filename,
                        fileurl: 'fileurl' in file ? file.fileurl : '',
                    });
                });

                this.editForm.controls['title'].setValue(this.submission.title);
                this.editForm.controls['content'].setValue(this.submission.content);
                this.attachments = this.submission.attachmentfiles || [];
            }

            this.loaded = true;

            this.logView();
        } catch (error) {
            this.loaded = false;

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);

            this.forceLeavePage();
        }
    }

    /**
     * Log view.
     */
    protected logView(): void {
        if (!this.workshop) {
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: this.editing ? 'mod_workshop_update_submission' : 'mod_workshop_add_submission',
            name: this.workshop.name,
            data: { id: this.workshop.id, submissionid: this.submissionId, category: 'workshop' },
            url: `/mod/workshop/submission.php?cmid=${this.module.id}&id=${this.submissionId}&edit=on`,
        });
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        CoreNavigator.back();
    }

    /**
     * Get the form input data.
     *
     * @returns Object with all the info.
     */
    protected getInputData(): AddonModWorkshopEditSubmissionInputData {
        const values: AddonModWorkshopEditSubmissionInputData = {
            title: this.editForm.value.title,
            content: '',
            attachmentfiles: [],
        };

        if (this.textAvailable) {
            values.content = this.editForm.value.content || '';
        }

        if (this.fileAvailable) {
            values.attachmentfiles = this.attachments;
        }

        return values;
    }

    /**
     * Check if data has changed.
     *
     * @returns True if changed or false if not.
     */
    protected hasDataChanged(): boolean {
        if (!this.loaded) {
            return false;
        }

        const inputData = this.getInputData();
        if (this.originalData.title != inputData.title || this.textAvailable && this.originalData.content != inputData.content) {
            return true;
        }

        if (this.fileAvailable) {
            return CoreFileUploader.areFileListDifferent(inputData.attachmentfiles, this.originalData.attachmentfiles);
        }

        return false;
    }

    /**
     * Save the submission.
     */
    async save(): Promise<void> {
        // Check if data has changed.
        if (this.hasDataChanged()) {
            try {
                await this.saveSubmission();
                // Go back to entry list.
                this.forceLeavePage();
            } catch{
                // Nothing to do.
            }
        } else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    }

    /**
     * Send submission and save.
     *
     * @returns Resolved when done.
     */
    protected async saveSubmission(): Promise<void> {
        const inputData = this.getInputData();

        if (!inputData.title) {
            CoreDomUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredtitle');

            throw new CoreError(Translate.instant('addon.mod_workshop.submissionrequiredtitle'));
        }

        const noText = CoreTextUtils.htmlIsBlank(inputData.content);
        const noFiles = !inputData.attachmentfiles.length;

        if ((this.textRequired && noText) || (this.fileRequired && noFiles) || (noText && noFiles)) {
            CoreDomUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredcontent');

            throw new CoreError(Translate.instant('addon.mod_workshop.submissionrequiredcontent'));
        }

        let saveOffline = false;

        const modal = await CoreLoadings.show('core.sending', true);
        const submissionId = this.submission?.id;

        // Add some HTML to the message if needed.
        if (this.textAvailable) {
            inputData.content = CoreTextUtils.formatHtmlLines(inputData.content);
        }

        // Upload attachments first if any.
        let allowOffline = !inputData.attachmentfiles.length;
        try {
            let attachmentsId: number | undefined;
            let storeFilesResult: CoreFileUploaderStoreFilesResult | undefined;

            try {
                attachmentsId = await AddonModWorkshopHelper.uploadOrStoreSubmissionFiles(
                    this.workshopId,
                    inputData.attachmentfiles,
                    false,
                );
            } catch (error) {
                if (CoreUtils.isWebServiceError(error)) {
                    throw error;
                }

                // Cannot upload them in online, save them in offline.
                saveOffline = true;
                allowOffline = true;

                storeFilesResult = await AddonModWorkshopHelper.uploadOrStoreSubmissionFiles(
                    this.workshopId,
                    inputData.attachmentfiles,
                    true,
                );
            }

            if (!saveOffline && !this.fileAvailable) {
                attachmentsId = undefined;
            }

            let newSubmissionId: number | false;
            if (this.editing) {
                if (saveOffline) {
                    // Save submission in offline.
                    await AddonModWorkshopOffline.saveSubmission(
                        this.workshopId,
                        this.courseId,
                        inputData.title,
                        inputData.content,
                        storeFilesResult,
                        submissionId,
                        AddonModWorkshopAction.UPDATE,
                    );
                    newSubmissionId = false;
                } else {
                    if (!submissionId) {
                        throw new CoreError('Submission cannot be updated without a submissionId');
                    }
                    // Try to send it to server.
                    // Don't allow offline if there are attachments since they were uploaded fine.
                    newSubmissionId = await AddonModWorkshop.updateSubmission(
                        this.workshopId,
                        submissionId,
                        this.courseId,
                        inputData.title,
                        inputData.content,
                        attachmentsId,
                        undefined,
                        allowOffline,
                    );
                }
            } else {
                if (saveOffline) {
                    // Save submission in offline.
                    await AddonModWorkshopOffline.saveSubmission(
                        this.workshopId,
                        this.courseId,
                        inputData.title,
                        inputData.content,
                        storeFilesResult,
                        undefined,
                        AddonModWorkshopAction.ADD,
                    );
                    newSubmissionId = false;
                } else {
                    // Try to send it to server.
                    // Don't allow offline if there are attachments since they were uploaded fine.
                    newSubmissionId = await AddonModWorkshop.addSubmission(
                        this.workshopId,
                        this.courseId,
                        inputData.title,
                        inputData.content,
                        attachmentsId,
                        undefined,
                        allowOffline,
                    );
                }
            }

            CoreForms.triggerFormSubmittedEvent(this.formElement, !!newSubmissionId, this.siteId);

            const data: AddonModWorkshopSubmissionChangedEventData = {
                workshopId: this.workshopId,
            };

            if (newSubmissionId) {
                // Data sent to server, delete stored files (if any).
                AddonModWorkshopOffline.deleteSubmissionAction(
                    this.workshopId,
                    this.editing ? AddonModWorkshopAction.UPDATE : AddonModWorkshopAction.ADD,
                );

                AddonModWorkshopHelper.deleteSubmissionStoredFiles(this.workshopId, this.siteId);
                data.submissionId = newSubmissionId;
            }

            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'workshop' });

            const promise = newSubmissionId ? AddonModWorkshop.invalidateSubmissionData(this.workshopId, newSubmissionId) :
                Promise.resolve();

            await promise.finally(() => {
                CoreEvents.trigger(ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED, data, this.siteId);

                // Delete the local files from the tmp folder.
                CoreFileUploader.clearTmpFiles(inputData.attachmentfiles);
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Cannot save submission');
        } finally {
            modal.dismiss();
        }
    }

    protected getFilesComponentId(): string {
        const id = this.submissionId > 0
            ? this.submissionId
            : 'newsub';

        return this.workshopId + '_' + id;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        CoreSync.unblockOperation(this.component, this.workshopId);
    }

}

type AddonModWorkshopEditSubmissionInputData = {
    title: string;
    content: string;
    attachmentfiles: CoreFileEntry[];
};
