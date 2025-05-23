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

import { Component, Input, OnInit, ViewChild, ElementRef, Type, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreFileSession } from '@services/file-session';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreUtils } from '@singletons/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreFormFields, CoreForms } from '@singletons/form';
import { AddonWorkshopAssessmentStrategyDelegate } from '../../services/assessment-strategy-delegate';
import {
    AddonModWorkshop,
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopGetAssessmentFormFieldsParsedData,
} from '../../services/workshop';
import { AddonModWorkshopHelper, AddonModWorkshopSubmissionAssessmentWithFormData } from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';
import {
    ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED,
    ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED,
    ADDON_MOD_WORKSHOP_COMPONENT,
    AddonModWorkshopOverallFeedbackMode,
} from '@addons/mod/workshop/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreObject } from '@singletons/object';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays workshop assessment strategy form.
 */
@Component({
    selector: 'addon-mod-workshop-assessment-strategy',
    templateUrl: 'addon-mod-workshop-assessment-strategy.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export class AddonModWorkshopAssessmentStrategyComponent implements OnInit, OnDestroy {

    @Input({ required: true }) workshop!: AddonModWorkshopData;
    @Input({ required: true }) access!: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    @Input({ required: true }) assessmentId!: number;
    @Input({ required: true }) userId!: number;
    @Input({ required: true }) strategy!: string;
    @Input({ transform: toBoolean }) edit = false;

    @ViewChild('assessmentForm') formElement!: ElementRef;

    componentClass?: Type<unknown>;
    data: AddonModWorkshopAssessmentStrategyData = {
        workshopId: 0,
        assessment: undefined,
        edit: false,
        selectedValues: [],
        fieldErrors: {},
        strategy: '',
        moduleId: 0,
        courseId: undefined,
    };

    assessmentStrategyLoaded = false;
    notSupported = false;
    feedbackText = '';
    feedbackControl = new FormControl<string | null>(null);
    overallFeedkback = false;
    overallFeedkbackRequired = false;
    component = ADDON_MOD_WORKSHOP_COMPONENT;
    componentId?: number;
    weights: number[] = [];
    weight?: number;

    protected obsInvalidated?: CoreEventObserver;
    protected hasOffline = false;
    protected originalData: {
        text: string;
        files: CoreFileEntry[];
        weight: number;
        selectedValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[];
    } = {
        text: '',
        files: [],
        weight: 1,
        selectedValues: [],
    };

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.assessmentId || !this.strategy) {
            this.assessmentStrategyLoaded = true;

            return;
        }

        this.data.workshopId = this.workshop.id;
        this.data.edit = this.edit;
        this.data.strategy = this.strategy;
        this.data.moduleId = this.workshop.coursemodule;
        this.data.courseId = this.workshop.course;

        this.componentClass = await AddonWorkshopAssessmentStrategyDelegate.getComponentForPlugin(this.strategy);
        if (this.componentClass) {
            this.overallFeedkback = this.workshop.overallfeedbackmode != AddonModWorkshopOverallFeedbackMode.DISABLED;
            this.overallFeedkbackRequired =
                this.workshop.overallfeedbackmode == AddonModWorkshopOverallFeedbackMode.ENABLED_REQUIRED;
            this.componentId = this.workshop.coursemodule;

            // Load Weights selector.
            if (this.edit && this.access.canallocate) {
                this.weights = [];
                for (let i = 16; i >= 0; i--) {
                    this.weights[i] = i;
                }
            }

            // Check if rich text editor is enabled.
            if (this.edit) {
                // Block the workshop.
                CoreSync.blockOperation(ADDON_MOD_WORKSHOP_COMPONENT, this.workshop.id);
            }

            try {
                await this.load();
                this.obsInvalidated = CoreEvents.on(
                    ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED,
                    () => this.load(),
                    CoreSites.getCurrentSiteId(),
                );
            } catch (error) {
                this.componentClass = undefined;
                CoreAlerts.showError(error, { default: 'Error loading assessment.' });
            } finally {
                this.assessmentStrategyLoaded = true;
            }
        } else {
            // Helper data and fallback.
            this.notSupported = !AddonWorkshopAssessmentStrategyDelegate.isPluginSupported(this.strategy);
            this.assessmentStrategyLoaded = true;
        }
    }

    /**
     * Convenience function to load the assessment data.
     */
    protected async load(): Promise<void> {
        this.data.assessment = await AddonModWorkshopHelper.getReviewerAssessmentById(this.workshop.id, this.assessmentId, {
            userId: this.userId,
            cmId: this.workshop.coursemodule,
            filter: this.edit ? false : undefined,
            readingStrategy: this.edit ? CoreSitesReadingStrategy.PREFER_NETWORK : undefined,
        });

        if (!this.data.assessment.form) {
            return;
        }

        if (this.edit) {
            try {
                const offlineAssessment = await AddonModWorkshopOffline.getAssessment(this.workshop.id, this.assessmentId);
                const offlineData = offlineAssessment.inputdata;

                this.hasOffline = true;

                this.data.assessment.feedbackauthor = <string>offlineData.feedbackauthor;

                if (this.access.canallocate) {
                    this.data.assessment.weight = <number>offlineData.weight;
                }

                // Override assessment plugins values.
                this.data.assessment.form.current = AddonModWorkshop.parseFields(
                    CoreObject.toArrayOfObjects(offlineData, 'name', 'value'),
                );

                // Override offline files.
                if (offlineData) {
                    this.data.assessment.feedbackattachmentfiles =
                        await AddonModWorkshopHelper.getAssessmentFilesFromOfflineFilesObject(
                            <CoreFileUploaderStoreFilesResult>offlineData.feedbackauthorattachmentsid,
                            this.workshop.id,
                            this.assessmentId,
                        );
                }
            } catch {
                this.hasOffline = false;
                // Ignore errors.
            } finally {
                this.feedbackText = CoreFileHelper.replacePluginfileUrls(
                    this.data.assessment.feedbackauthor,
                    this.data.assessment.feedbackcontentfiles,
                );
                this.feedbackControl.setValue(this.feedbackText);

                this.originalData.text = this.data.assessment.feedbackauthor;

                if (this.access.canallocate) {
                    this.originalData.weight = this.data.assessment.weight;
                }

                this.originalData.files = [];
                this.data.assessment.feedbackattachmentfiles.forEach((file) => {
                    let filename = CoreFile.getFileName(file);
                    if (!filename) {
                        // We don't have filename, extract it from the path.
                        filename = CoreFileHelper.getFilenameFromPath(file) || '';
                    }

                    this.originalData.files.push({
                        filename,
                        fileurl: '', // No needed to compare.
                    });
                });
            }
        }

        try {
            this.data.selectedValues = await AddonWorkshopAssessmentStrategyDelegate.getOriginalValues(
                this.strategy,
                this.data.assessment.form,
                this.workshop.id,
            );
        } finally {
            this.originalData.selectedValues = CoreUtils.clone(this.data.selectedValues);
            if (this.edit) {
                CoreFileSession.setFiles(
                    ADDON_MOD_WORKSHOP_COMPONENT,
                    `${this.workshop.id}_${this.assessmentId}`,
                    this.data.assessment.feedbackattachmentfiles,
                );
                if (this.access.canallocate) {
                    this.weight = this.data.assessment.weight;
                }
            }
        }
    }

    /**
     * Check if data has changed.
     *
     * @returns True if data has changed.
     */
    async hasDataChanged(): Promise<boolean> {
        if (!this.assessmentStrategyLoaded || !this.workshop.strategy || !this.edit) {
            return false;
        }

        // Compare feedback text.
        const text = CoreFileHelper.restorePluginfileUrls(this.feedbackText, this.data.assessment?.feedbackcontentfiles || []);
        if (this.originalData.text != text) {
            return true;
        }

        if (this.access.canallocate && this.originalData.weight != this.weight) {
            return true;
        }

        // Compare feedback files.
        const files = CoreFileSession.getFiles(
            ADDON_MOD_WORKSHOP_COMPONENT,
            `${this.workshop.id}_${this.assessmentId}`,
        ) || [];
        if (CoreFileUploader.areFileListDifferent(files, this.originalData.files)) {
            return true;
        }

        return await AddonWorkshopAssessmentStrategyDelegate.hasDataChanged(
            this.workshop.strategy,
            this.originalData.selectedValues,
            this.data.selectedValues,
        );
    }

    /**
     * Save the assessment.
     *
     * @returns Promise resolved when done, rejected if assessment could not be saved.
     */
    async saveAssessment(): Promise<void> {
        if (!this.data.assessment?.form) {
            return;
        }

        const files = CoreFileSession.getFiles(
            ADDON_MOD_WORKSHOP_COMPONENT,
            `${this.workshop.id}_${this.assessmentId}`,
        ) || [];

        let saveOffline = false;
        let allowOffline = !files.length;

        const modal = await CoreLoadings.show('core.sending', true);

        this.data.fieldErrors = {};

        try {
            let attachmentsId: CoreFileUploaderStoreFilesResult | number;
            try {
                // Upload attachments first if any.
                attachmentsId = await AddonModWorkshopHelper.uploadOrStoreAssessmentFiles(
                    this.workshop.id,
                    this.assessmentId,
                    files,
                    saveOffline,
                );
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    throw error;
                }

                // Cannot upload them in online, save them in offline.
                saveOffline = true;
                allowOffline = true;

                attachmentsId = await AddonModWorkshopHelper.uploadOrStoreAssessmentFiles(
                    this.workshop.id,
                    this.assessmentId,
                    files,
                    saveOffline,
                );
            }

            const text = CoreFileHelper.restorePluginfileUrls(this.feedbackText, this.data.assessment?.feedbackcontentfiles || []);

            let assessmentData: CoreFormFields<unknown>;
            try {
                assessmentData = await AddonModWorkshopHelper.prepareAssessmentData(
                    this.workshop,
                    this.data.selectedValues,
                    text,
                    this.data.assessment.form,
                    attachmentsId,
                );
            } catch (errors) {
                this.data.fieldErrors = errors;

                throw new CoreError(Translate.instant('core.errorinvalidform'));
            }

            let gradeUpdated = false;
            if (saveOffline) {
                // Save assessment in offline.
                await AddonModWorkshopOffline.saveAssessment(
                    this.workshop.id,
                    this.assessmentId,
                    this.workshop.course,
                    assessmentData,
                );
            } else {

                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                gradeUpdated = await AddonModWorkshop.updateAssessment(
                    this.workshop.id,
                    this.assessmentId,
                    this.workshop.course,
                    assessmentData,
                    undefined,
                    allowOffline,
                );
            }

            CoreForms.triggerFormSubmittedEvent(this.formElement, !!gradeUpdated, CoreSites.getCurrentSiteId());

            const promises: Promise<void>[] = [];

            // If sent to the server, invalidate and clean.
            if (gradeUpdated) {
                promises.push(AddonModWorkshopHelper.deleteAssessmentStoredFiles(this.workshop.id, this.assessmentId));
                promises.push(AddonModWorkshop.invalidateAssessmentFormData(this.workshop.id, this.assessmentId));
                promises.push(AddonModWorkshop.invalidateAssessmentData(this.workshop.id, this.assessmentId));
            }

            await CorePromiseUtils.ignoreErrors(Promise.all(promises));

            CoreEvents.trigger(ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED, {
                workshopId: this.workshop.id,
                assessmentId: this.assessmentId,
                userId: CoreSites.getCurrentSiteUserId(),
            }, CoreSites.getCurrentSiteId());

            if (files) {
                // Delete the local files from the tmp folder.
                CoreFileUploader.clearTmpFiles(files);
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error saving assessment.' });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Feedback text changed.
     *
     * @param text The new text.
     */
    onFeedbackChange(text?: string | null): void {
        this.feedbackText = text ?? '';
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.obsInvalidated?.off();

        if (this.data.assessment?.feedbackattachmentfiles) {
            // Delete the local files from the tmp folder.
            CoreFileUploader.clearTmpFiles(this.data.assessment.feedbackattachmentfiles);
        }
    }

}

type AddonModWorkshopAssessmentStrategyData = {
    workshopId: number;
    assessment?: AddonModWorkshopSubmissionAssessmentWithFormData;
    edit: boolean;
    selectedValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[];
    fieldErrors: AddonModWorkshopAssessmentStrategyFieldErrors;
    strategy: string;
    moduleId: number;
    courseId?: number;
};

export type AddonModWorkshopAssessmentStrategyFieldErrors = Record<string, string>;
