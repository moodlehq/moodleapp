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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';

/**
 * Page that displays the workshop edit submission.
 */
@IonicPage({ segment: 'addon-mod-workshop-edit-submission' })
@Component({
    selector: 'page-addon-mod-workshop-edit-submission',
    templateUrl: 'edit-submission.html',
})
export class AddonModWorkshopEditSubmissionPage implements OnInit, OnDestroy {

    module: any;
    courseId: number;
    access: any;
    submission = {
        id: 0,
        title: '',
        content: '',
        attachmentfiles: [],
    };

    loaded = false;
    component = AddonModWorkshopProvider.COMPONENT;
    componentId: number;
    editForm: FormGroup; // The form group.

    protected workshopId: number;
    protected submissionId: number;
    protected userId: number;
    protected originalData: any = {};
    protected hasOffline = false;
    protected editing = false;
    protected forceLeave = false;
    protected siteId: string;
    protected workshop: any;
    protected isDestroyed = false;
    protected textAvailable = false;
    protected textRequired = false;
    protected fileAvailable = false;
    protected fileRequired = false;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, protected fileUploaderProvider: CoreFileUploaderProvider,
            protected workshopProvider: AddonModWorkshopProvider, protected workshopOffline: AddonModWorkshopOfflineProvider,
            protected workshopHelper: AddonModWorkshopHelperProvider, protected navCtrl: NavController,
            protected fileSessionprovider: CoreFileSessionProvider, protected syncProvider: CoreSyncProvider,
            protected textUtils: CoreTextUtilsProvider, protected domUtils: CoreDomUtilsProvider, protected fb: FormBuilder,
            protected translate: TranslateService, protected eventsProvider: CoreEventsProvider) {
        this.module = navParams.get('module');
        this.courseId = navParams.get('courseId');
        this.access = navParams.get('access');
        this.submissionId = navParams.get('submissionId');

        this.workshopId = this.module.instance;
        this.componentId = this.module.id;
        this.userId = sitesProvider.getCurrentSiteUserId();
        this.siteId = sitesProvider.getCurrentSiteId();

        this.editForm = new FormGroup({});
        this.editForm.addControl('title', this.fb.control('', Validators.required));
        this.editForm.addControl('content', this.fb.control(''));
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.isDestroyed) {
            // Block the workshop.
            this.syncProvider.blockOperation(this.component, this.workshopId);
        }

        this.fetchSubmissionData();
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        let promise;

        // Check if data has changed.
        if (!this.hasDataChanged()) {
            promise = Promise.resolve();
        } else {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        }

        return promise.then(() => {
            if (this.submission.attachmentfiles) {
                // Delete the local files from the tmp folder.
                this.fileUploaderProvider.clearTmpFiles(this.submission.attachmentfiles);
            }
        });
    }

    /**
     * Fetch the submission data.
     *
     * @return Resolved when done.
     */
    protected fetchSubmissionData(): Promise<void> {
        return this.workshopProvider.getWorkshop(this.courseId, this.module.id).then((workshopData) => {
            this.workshop = workshopData;
            this.textAvailable = (this.workshop.submissiontypetext != AddonModWorkshopProvider.SUBMISSION_TYPE_DISABLED);
            this.textRequired = (this.workshop.submissiontypetext == AddonModWorkshopProvider.SUBMISSION_TYPE_REQUIRED);
            this.fileAvailable = (this.workshop.submissiontypefile != AddonModWorkshopProvider.SUBMISSION_TYPE_DISABLED);
            this.fileRequired = (this.workshop.submissiontypefile == AddonModWorkshopProvider.SUBMISSION_TYPE_REQUIRED);

            this.editForm.controls.content.setValidators(this.textRequired ? Validators.required : null);

            if (this.submissionId > 0) {
                this.editing = true;

                return this.workshopHelper.getSubmissionById(this.workshopId, this.submissionId).then((submissionData) => {
                    this.submission = submissionData;

                    const canEdit = (this.userId == submissionData.authorid && this.access.cansubmit &&
                        this.access.modifyingsubmissionallowed);
                    if (!canEdit) {
                        // Should not happen, but go back if does.
                        this.forceLeavePage();

                        return;
                    }
                });
            } else if (!this.access.cansubmit || !this.access.creatingsubmissionallowed) {
                // Should not happen, but go back if does.
                this.forceLeavePage();

                return;
            }

        }).then(() => {
            return this.workshopOffline.getSubmissions(this.workshopId).then((submissionsActions) => {
                if (submissionsActions && submissionsActions.length) {
                    this.hasOffline = true;
                    const actions = this.workshopHelper.filterSubmissionActions(submissionsActions, this.editing ?
                        this.submission.id : 0);

                    return this.workshopHelper.applyOfflineData(this.submission, actions);
                } else {
                    this.hasOffline = false;
                }
            }).finally(() => {
                this.originalData.title = this.submission.title;
                this.originalData.content = this.submission.content;
                this.originalData.attachmentfiles = [];

                this.submission.attachmentfiles.forEach((file) => {
                    let filename;
                    if (file.filename) {
                        filename = file.filename;
                    } else {
                        // We don't have filename, extract it from the path.
                        filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }

                    this.originalData.attachmentfiles.push({
                        filename : filename,
                        fileurl: file.fileurl
                    });
                });
            });
        }).then(() => {
            this.editForm.controls['title'].setValue(this.submission.title);
            this.editForm.controls['content'].setValue(this.submission.content);

            const submissionId = this.submission.id || 'newsub';
            this.fileSessionprovider.setFiles(this.component,
                this.workshopId + '_' + submissionId, this.submission.attachmentfiles || []);

            this.loaded = true;
        }).catch((message) => {
            this.loaded = false;

            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);

            this.forceLeavePage();
        });
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        this.navCtrl.pop();
    }

    /**
     * Get the form input data.
     *
     * @return Object with all the info.
     */
    protected getInputData(): any {
        const submissionId = this.submission.id || 'newsub';

        const values = {
            title: this.editForm.value.title,
            content: null,
            attachmentfiles: []
        };

        if (this.textAvailable) {
            values.content = this.editForm.value.content || '';
        }

        if (this.fileAvailable) {
            values.attachmentfiles = this.fileSessionprovider.getFiles(this.component, this.workshopId + '_' + submissionId) || [];
        }

        return values;
    }

    /**
     * Check if data has changed.
     *
     * @return True if changed or false if not.
     */
    protected hasDataChanged(): boolean {
        if (!this.loaded) {
            return false;
        }

        const inputData = this.getInputData();
        if (!this.originalData || typeof this.originalData.title == 'undefined') {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        if (this.originalData.title != inputData.title || this.textAvailable && this.originalData.content != inputData.content) {
            return true;
        }

        if (this.fileAvailable) {
            return this.fileUploaderProvider.areFileListDifferent(inputData.attachmentfiles, this.originalData.attachmentfiles);
        }

        return false;
    }

    /**
     * Save the submission.
     */
    save(): void {
        // Check if data has changed.
        if (this.hasDataChanged()) {
            this.saveSubmission().then(() => {
                // Go back to entry list.
                this.forceLeavePage();
            }).catch(() => {
                // Nothing to do.
            });
        } else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    }

    /**
     * Send submission and save.
     *
     * @return Resolved when done.
     */
    protected saveSubmission(): Promise<any> {
        const inputData = this.getInputData();

        if (!inputData.title) {
            this.domUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredtitle');

            return Promise.reject(null);
        }

        const noText = this.textUtils.htmlIsBlank(inputData.content);
        const noFiles = !inputData.attachmentfiles.length;

        if ((this.textRequired && noText) || (this.fileRequired && noFiles) || (noText && noFiles)) {
            this.domUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredcontent');

            return Promise.reject(null);
        }

        let allowOffline = true,
            saveOffline = false;

        const modal = this.domUtils.showModalLoading('core.sending', true),
            submissionId = this.submission.id;

        // Add some HTML to the message if needed.
        if (this.textAvailable) {
            inputData.content = this.textUtils.formatHtmlLines(inputData.content);
        }

        // Upload attachments first if any.
        allowOffline = !inputData.attachmentfiles.length;

        return this.workshopHelper.uploadOrStoreSubmissionFiles(this.workshopId, this.submission.id, inputData.attachmentfiles,
                this.editing, saveOffline).catch(() => {
            // Cannot upload them in online, save them in offline.
            saveOffline = true;
            allowOffline = true;

            return this.workshopHelper.uploadOrStoreSubmissionFiles(this.workshopId, this.submission.id,
                inputData.attachmentfiles, this.editing, saveOffline);
        }).then((attachmentsId) => {
            if (!saveOffline && !this.fileAvailable) {
                attachmentsId = null;
            }

            if (this.editing) {
                if (saveOffline) {
                    // Save submission in offline.
                    return this.workshopOffline.saveSubmission(this.workshopId, this.courseId, inputData.title,
                            inputData.content, attachmentsId, submissionId, 'update').then(() => {
                        // Don't return anything.
                    });
                }

                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return this.workshopProvider.updateSubmission(this.workshopId, submissionId, this.courseId, inputData.title,
                    inputData.content, attachmentsId, undefined, allowOffline);
            }

            if (saveOffline) {
                // Save submission in offline.
                return this.workshopOffline.saveSubmission(this.workshopId, this.courseId, inputData.title, inputData.content,
                    attachmentsId, submissionId, 'add').then(() => {
                    // Don't return anything.
                });
            }

            // Try to send it to server.
            // Don't allow offline if there are attachments since they were uploaded fine.
            return this.workshopProvider.addSubmission(this.workshopId, this.courseId, inputData.title, inputData.content,
                attachmentsId, undefined, submissionId, allowOffline);
        }).then((newSubmissionId) => {
            const data = {
                workshopId: this.workshopId,
                cmId: this.module.cmid
            };

            if (newSubmissionId && submissionId) {
                // Data sent to server, delete stored files (if any).
                this.workshopOffline.deleteSubmissionAction(this.workshopId, submissionId, this.editing ? 'update' : 'add');
                this.workshopHelper.deleteSubmissionStoredFiles(this.workshopId, submissionId, this.editing);
                data['submissionId'] = newSubmissionId;
            }

            const promise = newSubmissionId ? this.workshopProvider.invalidateSubmissionData(this.workshopId, newSubmissionId) :
                Promise.resolve();

            return promise.finally(() => {
                this.eventsProvider.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);

                // Delete the local files from the tmp folder.
                this.fileUploaderProvider.clearTmpFiles(inputData.attachmentfiles);
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Cannot save submission');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.syncProvider.unblockOperation(this.component, this.workshopId);
    }
}
