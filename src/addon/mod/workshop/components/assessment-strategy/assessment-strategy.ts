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

import { Component, Input, OnInit, Injector, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';
import { AddonWorkshopAssessmentStrategyDelegate } from '../../providers/assessment-strategy-delegate';

/**
 * Component that displays workshop assessment strategy form.
 */
@Component({
    selector: 'addon-mod-workshop-assessment-strategy',
    templateUrl: 'addon-mod-workshop-assessment-strategy.html',
})
export class AddonModWorkshopAssessmentStrategyComponent implements OnInit {

    @Input() workshop: any;
    @Input() access: any;
    @Input() assessmentId: number;
    @Input() userId: number;
    @Input() strategy: string;
    @Input() edit?: boolean;

    @ViewChild('assessmentForm') formElement: ElementRef;

    componentClass: any;
    data = {
        workshopId: 0,
        assessment: null,
        edit: false,
        selectedValues: [],
        fieldErrors: {},
        strategy: '',
        moduleId: 0,
        courseId: null
    };
    assessmentStrategyLoaded = false;
    notSupported = false;
    feedbackText = '';
    feedbackControl = new FormControl();
    overallFeedkback = false;
    overallFeedkbackRequired = false;
    component = AddonModWorkshopProvider.COMPONENT;
    componentId: number;
    weights: any[];
    weight: number;

    protected obsInvalidated: any;
    protected hasOffline: boolean;
    protected originalData = {
        text: '',
        files: [],
        weight: 1,
        selectedValues: []
    };

    constructor(private translate: TranslateService,
            private injector: Injector,
            private eventsProvider: CoreEventsProvider,
            private fileSessionProvider: CoreFileSessionProvider,
            private syncProvider: CoreSyncProvider,
            private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider,
            private sitesProvider: CoreSitesProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private workshopProvider: AddonModWorkshopProvider,
            private workshopHelper: AddonModWorkshopHelperProvider,
            private workshopOffline: AddonModWorkshopOfflineProvider,
            private strategyDelegate: AddonWorkshopAssessmentStrategyDelegate) {}

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.assessmentId || !this.strategy) {
            this.assessmentStrategyLoaded = true;

            return;
        }

        this.data.workshopId = this.workshop.id;
        this.data.edit = this.edit;
        this.data.strategy = this.strategy;
        this.data.moduleId = this.workshop.coursemodule;
        this.data.courseId = this.workshop.course;

        this.componentClass = this.strategyDelegate.getComponentForPlugin(this.injector, this.strategy);
        if (this.componentClass) {
            this.overallFeedkback = !!this.workshop.overallfeedbackmode;
            this.overallFeedkbackRequired = this.workshop.overallfeedbackmode == 2;
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
                this.syncProvider.blockOperation(AddonModWorkshopProvider.COMPONENT, this.workshop.id);
            }

            this.load().then(() => {
                this.obsInvalidated = this.eventsProvider.on(AddonModWorkshopProvider.ASSESSMENT_INVALIDATED,
                        this.load.bind(this), this.sitesProvider.getCurrentSiteId());
            }).finally(() => {
                this.assessmentStrategyLoaded = true;
            });
        } else {
            // Helper data and fallback.
            this.notSupported = !this.strategyDelegate.isPluginSupported(this.strategy);
            this.assessmentStrategyLoaded = true;
        }
    }

    /**
     * Convenience function to load the assessment data.
     *
     * @return Promised resvoled when data is loaded.
     */
    protected load(): Promise<any> {
        return this.workshopHelper.getReviewerAssessmentById(this.workshop.id, this.assessmentId, this.userId)
                .then((assessmentData) => {
            this.data.assessment = assessmentData;

            let promise;
            if (this.edit) {
                promise = this.workshopOffline.getAssessment(this.workshop.id, this.assessmentId).then((offlineAssessment) => {
                    const offlineData = offlineAssessment.inputdata;

                    this.hasOffline = true;

                    assessmentData.feedbackauthor = offlineData.feedbackauthor;

                    if (this.access.canallocate) {
                        assessmentData.weight = offlineData.weight;
                    }

                    // Override assessment plugins values.
                    assessmentData.form.current = this.workshopProvider.parseFields(
                        this.utils.objectToArrayOfObjects(offlineData, 'name', 'value'));

                    // Override offline files.
                    if (offlineData) {
                        return this.workshopHelper.getAssessmentFilesFromOfflineFilesObject(
                                offlineData.feedbackauthorattachmentsid, this.workshop.id, this.assessmentId)
                                .then((files) => {
                            assessmentData.feedbackattachmentfiles = files;
                        });
                    }
                }).catch(() => {
                    this.hasOffline = false;
                    // Ignore errors.
                }).finally(() => {
                    this.feedbackText = assessmentData.feedbackauthor;
                    this.feedbackControl.setValue(this.feedbackText);

                    this.originalData.text = this.data.assessment.feedbackauthor;

                    if (this.access.canallocate) {
                        this.originalData.weight = assessmentData.weight;
                    }

                    this.originalData.files = [];
                    assessmentData.feedbackattachmentfiles.forEach((file) => {
                        let filename;
                        if (file.filename) {
                            filename = file.filename;
                        } else {
                            // We don't have filename, extract it from the path.
                            filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                        }

                        this.originalData.files.push({
                            filename : filename,
                            fileurl: file.fileurl
                        });
                    });
                });
            } else {
                promise = Promise.resolve();
            }

            return promise.then(() => {
                return this.strategyDelegate.getOriginalValues(this.strategy, assessmentData.form, this.workshop.id)
                        .then((values) => {
                    this.data.selectedValues = values;
                }).finally(() => {
                    this.originalData.selectedValues = this.utils.clone(this.data.selectedValues);
                    if (this.edit) {
                        this.fileSessionProvider.setFiles(AddonModWorkshopProvider.COMPONENT,
                            this.workshop.id + '_' + this.assessmentId, assessmentData.feedbackattachmentfiles);
                        if (this.access.canallocate) {
                            this.weight = assessmentData.weight;
                        }
                    }
                });
            });
        });
    }

    /**
     * Check if data has changed.
     *
     * @return True if data has changed.
     */
    hasDataChanged(): boolean {
        if (!this.assessmentStrategyLoaded) {
            return false;
        }

        // Compare feedback text.
        const text = this.textUtils.restorePluginfileUrls(this.feedbackText, this.data.assessment.feedbackcontentfiles || []);
        if (this.originalData.text != text) {
            return true;
        }

        if (this.access.canallocate && this.originalData.weight != this.weight) {
            return true;
        }

        // Compare feedback files.
        const files = this.fileSessionProvider.getFiles(AddonModWorkshopProvider.COMPONENT,
            this.workshop.id + '_' + this.assessmentId) || [];
        if (this.uploaderProvider.areFileListDifferent(files, this.originalData.files)) {
            return true;
        }

        return this.strategyDelegate.hasDataChanged(this.workshop, this.originalData.selectedValues, this.data.selectedValues);
    }

    /**
     * Save the assessment.
     *
     * @return Promise resolved when done, rejected if assessment could not be saved.
     */
    saveAssessment(): Promise<any> {
        const files = this.fileSessionProvider.getFiles(AddonModWorkshopProvider.COMPONENT,
            this.workshop.id + '_' + this.assessmentId) || [];
        let saveOffline = false;
        let allowOffline = !files.length;

        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.data.fieldErrors = {};

        // Upload attachments first if any.
        return this.workshopHelper.uploadOrStoreAssessmentFiles(this.workshop.id, this.assessmentId, files,
                saveOffline).catch(() => {
            // Cannot upload them in online, save them in offline.
            saveOffline = true;
            allowOffline = true;

            return this.workshopHelper.uploadOrStoreAssessmentFiles(this.workshop.id, this.assessmentId, files, saveOffline);
        }).then((attachmentsId) => {
            const text = this.textUtils.restorePluginfileUrls(this.feedbackText, this.data.assessment.feedbackcontentfiles || []);

            return this.workshopHelper.prepareAssessmentData(this.workshop, this.data.selectedValues, text, files,
                    this.data.assessment.form, attachmentsId).catch((errors) => {
                this.data.fieldErrors = errors;

                return Promise.reject(this.translate.instant('core.errorinvalidform'));
            });
        }).then((assessmentData) => {
            if (saveOffline) {
                // Save assessment in offline.
                return this.workshopOffline.saveAssessment(this.workshop.id, this.assessmentId, this.workshop.course,
                        assessmentData).then(() => {
                    return false;
                });
            }

            // Try to send it to server.
            // Don't allow offline if there are attachments since they were uploaded fine.
            return this.workshopProvider.updateAssessment(this.workshop.id, this.assessmentId, this.workshop.course,
                assessmentData, false, allowOffline);
        }).then((grade) => {

            this.domUtils.triggerFormSubmittedEvent(this.formElement, !!grade, this.sitesProvider.getCurrentSiteId());

            const promises = [];

            // If sent to the server, invalidate and clean.
            if (grade) {
                promises.push(this.workshopHelper.deleteAssessmentStoredFiles(this.workshop.id, this.assessmentId));
                promises.push(this.workshopProvider.invalidateAssessmentFormData(this.workshop.id, this.assessmentId));
                promises.push(this.workshopProvider.invalidateAssessmentData(this.workshop.id, this.assessmentId));
            }

            return Promise.all(promises).catch(() => {
                // Ignore errors.
            }).finally(() => {
                this.eventsProvider.trigger(AddonModWorkshopProvider.ASSESSMENT_SAVED, {
                    workshopId: this.workshop.id,
                    assessmentId: this.assessmentId,
                    userId: this.sitesProvider.getCurrentSiteUserId(),
                }, this.sitesProvider.getCurrentSiteId());

                if (files) {
                    // Delete the local files from the tmp folder.
                    this.uploaderProvider.clearTmpFiles(files);
                }
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error saving assessment.');

            return Promise.reject(null);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Feedback text changed.
     *
     * @param text The new text.
     */
    onFeedbackChange(text: string): void {
        this.feedbackText = text;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.obsInvalidated && this.obsInvalidated.off();

        if (this.data.assessment.feedbackattachmentfiles) {
            // Delete the local files from the tmp folder.
            this.uploaderProvider.clearTmpFiles(this.data.assessment.feedbackattachmentfiles);
        }
    }
}
