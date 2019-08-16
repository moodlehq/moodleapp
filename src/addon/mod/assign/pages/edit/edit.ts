// (C) Copyright 2015 Martin Dougiamas
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
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreFileUploaderHelperProvider } from '@core/fileuploader/providers/helper';
import { AddonModAssignProvider } from '../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../providers/assign-offline';
import { AddonModAssignSyncProvider } from '../../providers/assign-sync';
import { AddonModAssignHelperProvider } from '../../providers/helper';

/**
 * Page that allows adding or editing an assigment submission.
 */
@IonicPage({ segment: 'addon-mod-assign-edit' })
@Component({
    selector: 'page-addon-mod-assign-edit',
    templateUrl: 'edit.html',
})
export class AddonModAssignEditPage implements OnInit, OnDestroy {
    title: string; // Title to display.
    assign: any; // Assignment.
    courseId: number; // Course ID the assignment belongs to.
    userSubmission: any; // The user submission.
    allowOffline: boolean; // Whether offline is allowed.
    submissionStatement: string; // The submission statement.
    submissionStatementAccepted: boolean; // Whether submission statement is accepted.
    loaded: boolean; // Whether data has been loaded.

    protected moduleId: number; // Module ID the submission belongs to.
    protected userId: number; // User doing the submission.
    protected isBlind: boolean; // Whether blind is used.
    protected editText: string; // "Edit submission" translated text.
    protected saveOffline = false; // Whether to save data in offline.
    protected hasOffline = false; // Whether the assignment has offline data.
    protected isDestroyed = false; // Whether the component has been destroyed.
    protected forceLeave = false; // To allow leaving the page without checking for changes.

    constructor(navParams: NavParams, protected navCtrl: NavController, protected sitesProvider: CoreSitesProvider,
            protected syncProvider: CoreSyncProvider, protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService, protected fileUploaderHelper: CoreFileUploaderHelperProvider,
            protected eventsProvider: CoreEventsProvider, protected assignProvider: AddonModAssignProvider,
            protected assignOfflineProvider: AddonModAssignOfflineProvider, protected assignHelper: AddonModAssignHelperProvider,
            protected assignSyncProvider: AddonModAssignSyncProvider) {

        this.moduleId = navParams.get('moduleId');
        this.courseId = navParams.get('courseId');
        this.userId = sitesProvider.getCurrentSiteUserId(); // Right now we can only edit current user's submissions.
        this.isBlind = !!navParams.get('blindId');

        this.editText = translate.instant('addon.mod_assign.editsubmission');
        this.title = this.editText;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchAssignment().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        // Check if data has changed.
        return this.hasDataChanged().then((changed) => {
            if (changed) {
                return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
            }
        }).then(() => {
            // Nothing has changed or user confirmed to leave. Clear temporary data from plugins.
            this.assignHelper.clearSubmissionPluginTmpData(this.assign, this.userSubmission, this.getInputData());
        });
    }

    /**
     * Fetch assignment data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchAssignment(): Promise<any> {
        const currentUserId = this.sitesProvider.getCurrentSiteUserId();

        // Get assignment data.
        return this.assignProvider.getAssignment(this.courseId, this.moduleId).then((assign) => {
            this.assign = assign;
            this.title = assign.name || this.title;

            if (!this.isDestroyed) {
                // Block the assignment.
                this.syncProvider.blockOperation(AddonModAssignProvider.COMPONENT, assign.id);
            }

            // Wait for sync to be over (if any).
            return this.assignSyncProvider.waitForSync(assign.id);
        }).then(() => {

            // Get submission status. Ignore cache to get the latest data.
            return this.assignProvider.getSubmissionStatus(this.assign.id, this.userId, undefined, this.isBlind, false, true)
                    .catch((err) => {
                // Cannot connect. Get cached data.
                return this.assignProvider.getSubmissionStatus(this.assign.id, this.userId, undefined, this.isBlind)
                        .then((response) => {
                    const userSubmission = this.assignProvider.getSubmissionObjectFromAttempt(this.assign, response.lastattempt);

                    // Check if the user can edit it in offline.
                    return this.assignHelper.canEditSubmissionOffline(this.assign, userSubmission).then((canEditOffline) => {
                        if (canEditOffline) {
                            return response;
                        }

                        // Submission cannot be edited in offline, reject.
                        this.allowOffline = false;

                        return Promise.reject(err);
                    });
                });
            }).then((response) => {
                if (!response.lastattempt.canedit) {
                    // Can't edit. Reject.
                    return Promise.reject(this.translate.instant('core.nopermissions', {$a: this.editText}));
                }

                this.userSubmission = this.assignProvider.getSubmissionObjectFromAttempt(this.assign, response.lastattempt);
                this.allowOffline = true; // If offline isn't allowed we shouldn't have reached this point.

                // Only show submission statement if we are editing our own submission.
                if (this.assign.requiresubmissionstatement && !this.assign.submissiondrafts && this.userId == currentUserId) {
                    this.submissionStatement = this.assign.submissionstatement;
                } else {
                    this.submissionStatement = undefined;
                }

                // Check if there's any offline data for this submission.
                return this.assignOfflineProvider.getSubmission(this.assign.id, this.userId).then((data) => {
                    this.hasOffline = data && data.plugindata && Object.keys(data.plugindata).length > 0;
                }).catch(() => {
                    // No offline data found.
                    this.hasOffline = false;
                });
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting assigment data.');

            // Leave the player.
            this.leaveWithoutCheck();
        });
    }

    /**
     * Get the input data.
     *
     * @return {any} Input data.
     */
    protected getInputData(): any {
        return this.domUtils.getDataFromForm(document.forms['addon-mod_assign-edit-form']);
    }

    /**
     * Check if data has changed.
     *
     * @return {Promise<boolean>} Promise resolved with boolean: whether data has changed.
     */
    protected hasDataChanged(): Promise<boolean> {
        // Usually the hasSubmissionDataChanged call will be resolved inmediately, causing the modal to be shown just an instant.
        // We'll wait a bit before showing it to prevent this "blink".
        let modal,
            showModal = true;

        setTimeout(() => {
            if (showModal) {
                modal = this.domUtils.showModalLoading();
            }
        }, 100);

        const data = this.getInputData();

        return this.assignHelper.hasSubmissionDataChanged(this.assign, this.userSubmission, data).finally(() => {
           if (modal) {
                modal.dismiss();
            } else {
                showModal = false;
            }
        });
    }

    /**
     * Leave the view without checking for changes.
     */
    protected leaveWithoutCheck(): void {
        this.forceLeave = true;
        this.navCtrl.pop();
    }

    /**
     * Get data to submit based on the input data.
     *
     * @param {any} inputData The input data.
     * @return {Promise<any>} Promise resolved with the data to submit.
     */
    protected prepareSubmissionData(inputData: any): Promise<any> {
        // If there's offline data, always save it in offline.
        this.saveOffline = this.hasOffline;

        return this.assignHelper.prepareSubmissionPluginData(this.assign, this.userSubmission, inputData, this.hasOffline)
                .catch((error) => {

            if (this.allowOffline && !this.saveOffline) {
                // Cannot submit in online, prepare for offline usage.
                this.saveOffline = true;

                return this.assignHelper.prepareSubmissionPluginData(this.assign, this.userSubmission, inputData, true);
            }

            return Promise.reject(error);
        });
    }

    /**
     * Save the submission.
     */
    save(): void {
        // Check if data has changed.
        this.hasDataChanged().then((changed) => {
            if (changed) {
                this.saveSubmission().then(() => {
                    this.leaveWithoutCheck();
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'Error saving submission.');
                });
            } else {
                // Nothing to save, just go back.
                this.leaveWithoutCheck();
            }
        });
    }

    /**
     * Save the submission.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected saveSubmission(): Promise<any> {
        const inputData = this.getInputData();

        if (this.submissionStatement && (!inputData.submissionstatement || inputData.submissionstatement === 'false')) {
            return Promise.reject(this.translate.instant('addon.mod_assign.acceptsubmissionstatement'));
        }

        let modal = this.domUtils.showModalLoading();

        // Get size to ask for confirmation.
        return this.assignHelper.getSubmissionSizeForEdit(this.assign, this.userSubmission, inputData).catch(() => {
            // Error calculating size, return -1.
            return -1;
        }).then((size) => {
            modal.dismiss();

            // Confirm action.
            return this.fileUploaderHelper.confirmUploadFile(size, true, this.allowOffline);
        }).then(() => {
            modal = this.domUtils.showModalLoading('core.sending', true);

            return this.prepareSubmissionData(inputData).then((pluginData) => {
                if (!Object.keys(pluginData).length) {
                    // Nothing to save.
                    return;
                }

                let promise;

                if (this.saveOffline) {
                    // Save submission in offline.
                    promise = this.assignOfflineProvider.saveSubmission(this.assign.id, this.courseId, pluginData,
                            this.userSubmission.timemodified, !this.assign.submissiondrafts, this.userId);
                } else {
                    // Try to send it to server.
                    promise = this.assignProvider.saveSubmission(this.assign.id, this.courseId, pluginData, this.allowOffline,
                            this.userSubmission.timemodified, this.assign.submissiondrafts, this.userId);
                }

                return promise.then(() => {
                    // Clear temporary data from plugins.
                    return this.assignHelper.clearSubmissionPluginTmpData(this.assign, this.userSubmission, inputData);
                }).then(() => {
                    // Submission saved, trigger event.
                    const params = {
                        assignmentId: this.assign.id,
                        submissionId: this.userSubmission.id,
                        userId: this.userId,
                    };

                    this.eventsProvider.trigger(AddonModAssignProvider.SUBMISSION_SAVED_EVENT, params,
                            this.sitesProvider.getCurrentSiteId());

                    if (!this.assign.submissiondrafts) {
                        // No drafts allowed, so it was submitted. Trigger event.
                        this.eventsProvider.trigger(AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT, params,
                                this.sitesProvider.getCurrentSiteId());
                    }
                });
            });
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        // Unblock the assignment.
        if (this.assign) {
            this.syncProvider.unblockOperation(AddonModAssignProvider.COMPONENT, this.assign.id);
        }
    }
}
