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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModAssignProvider } from '../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../providers/assign-offline';
import { AddonModAssignHelperProvider } from '../../providers/helper';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays a list of submissions of an assignment.
 */
@IonicPage({ segment: 'addon-mod-assign-submission-list' })
@Component({
    selector: 'page-addon-mod-assign-submission-list',
    templateUrl: 'submission-list.html',
})
export class AddonModAssignSubmissionListPage implements OnInit, OnDestroy {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    title: string; // Title to display.
    assign: any; // Assignment.
    submissions: any[]; // List of submissions
    loaded: boolean; // Whether data has been loaded.
    haveAllParticipants: boolean; // Whether all participants have been loaded.
    selectedSubmissionId: number; // Selected submission ID.

    protected moduleId: number; // Module ID the submission belongs to.
    protected courseId: number; // Course ID the assignment belongs to.
    protected selectedStatus: string; // The status to see.
    protected gradedObserver; // Observer to refresh data when a grade changes.

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected domUtils: CoreDomUtilsProvider, protected translate: TranslateService,
            protected assignProvider: AddonModAssignProvider, protected assignOfflineProvider: AddonModAssignOfflineProvider,
            protected assignHelper: AddonModAssignHelperProvider) {

        this.moduleId = navParams.get('moduleId');
        this.courseId = navParams.get('courseId');
        this.selectedStatus = navParams.get('status');

        if (this.selectedStatus) {
            if (this.selectedStatus == AddonModAssignProvider.NEED_GRADING) {
                this.title = this.translate.instant('addon.mod_assign.numberofsubmissionsneedgrading');
            } else {
                this.title = this.translate.instant('addon.mod_assign.submissionstatus_' + this.selectedStatus);
            }
        } else {
            this.title = this.translate.instant('addon.mod_assign.numberofparticipants');
        }

        // Update data if some grade changes.
        this.gradedObserver = eventsProvider.on(AddonModAssignProvider.GRADED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == sitesProvider.getCurrentSiteUserId()) {
                // Grade changed, refresh the data.
                this.loaded = false;

                this.refreshAllData().finally(() => {
                    this.loaded = true;
                });
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchAssignment().finally(() => {
            if (!this.selectedSubmissionId && this.splitviewCtrl.isOn() && this.submissions.length > 0) {
                // Take first and load it.
                this.loadSubmission(this.submissions[0]);
            }

            this.loaded = true;
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        // If split view is enabled, check if we can leave the details page.
        if (this.splitviewCtrl.isOn()) {
            const detailsPage = this.splitviewCtrl.getDetailsNav().getActive().instance;
            if (detailsPage && detailsPage.ionViewCanLeave) {
                return detailsPage.ionViewCanLeave();
            }
        }

        return true;
    }

    /**
     * Fetch assignment data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchAssignment(): Promise<any> {
        let participants,
            submissionsData;

        // Get assignment data.
        return this.assignProvider.getAssignment(this.courseId, this.moduleId).then((assign) => {
            this.title = assign.name || this.title;
            this.assign = assign;
            this.haveAllParticipants = true;

            // Get assignment submissions.
            return this.assignProvider.getSubmissions(assign.id);
        }).then((data) => {
            if (!data.canviewsubmissions) {
                // User shouldn't be able to reach here.
                return Promise.reject(null);
            }

            submissionsData = data;

            // Get the participants.
            return this.assignHelper.getParticipants(this.assign).then((parts) => {
                this.haveAllParticipants = true;
                participants = parts;
            }).catch(() => {
                this.haveAllParticipants = false;
            });
        }).then(() => {
            // We want to show the user data on each submission.
            return this.assignProvider.getSubmissionsUserData(submissionsData.submissions, this.courseId, this.assign.id,
                    this.assign.blindmarking && !this.assign.revealidentities, participants);
        }).then((submissions) => {

            // Filter the submissions to get only the ones with the right status and add some extra data.
            const getNeedGrading = this.selectedStatus == AddonModAssignProvider.NEED_GRADING,
                searchStatus = getNeedGrading ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED : this.selectedStatus,
                promises = [];

            this.submissions = [];
            submissions.forEach((submission) => {
                if (!searchStatus || searchStatus == submission.status) {
                    promises.push(this.assignOfflineProvider.getSubmissionGrade(this.assign.id, submission.userid).catch(() => {
                        // Ignore errors.
                    }).then((data) => {
                        let promise,
                            notSynced = false;

                        // Load offline grades.
                        if (data && submission.timemodified < data.timemodified) {
                            notSynced = true;
                        }

                        if (getNeedGrading) {
                            // Only show the submissions that need to be graded.
                            promise = this.assignProvider.needsSubmissionToBeGraded(submission, this.assign.id);
                        } else {
                            promise = Promise.resolve(true);
                        }

                        return promise.then((add) => {
                            if (!add) {
                                return;
                            }

                            submission.statusColor = this.assignProvider.getSubmissionStatusColor(submission.status);
                            submission.gradingColor = this.assignProvider.getSubmissionGradingStatusColor(submission.gradingstatus);

                            // Show submission status if not submitted for grading.
                            if (submission.statusColor != 'success' || !submission.gradingstatus) {
                                submission.statusTranslated = this.translate.instant('addon.mod_assign.submissionstatus_' +
                                    submission.status);
                            } else {
                                submission.statusTranslated = false;
                            }

                            if (notSynced) {
                                submission.gradingStatusTranslationId = 'addon.mod_assign.gradenotsynced';
                                submission.gradingColor = '';
                            } else if (submission.statusColor != 'danger' || submission.gradingColor != 'danger') {
                                // Show grading status if one of the statuses is not done.
                                submission.gradingStatusTranslationId =
                                    this.assignProvider.getSubmissionGradingStatusTranslationId(submission.gradingstatus);
                            } else {
                                submission.gradingStatusTranslationId = false;
                            }

                            this.submissions.push(submission);
                        });
                    }));
                }
            });

            return Promise.all(promises);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting assigment data.');
        });
    }

    /**
     * Load a certain submission.
     *
     * @param {any} submission The submission to load.
     */
    loadSubmission(submission: any): void {
        if (this.selectedSubmissionId === submission.id && this.splitviewCtrl.isOn()) {
            // Already selected.
            return;
        }

        this.selectedSubmissionId = submission.id;

        this.splitviewCtrl.push('AddonModAssignSubmissionReviewPage', {
            courseId: this.courseId,
            moduleId: this.moduleId,
            submitId: submission.submitid,
            blindId: submission.blindid
        });
    }

    /**
     * Refresh all the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshAllData(): Promise<any> {
        const promises = [];

        promises.push(this.assignProvider.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(this.assignProvider.invalidateAllSubmissionData(this.assign.id));
            promises.push(this.assignProvider.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(this.assignProvider.invalidateListParticipantsData(this.assign.id));
        }

        return Promise.all(promises).finally(() => {
            return this.fetchAssignment();
        });
    }

    /**
     * Refresh the list.
     *
     * @param {any} refresher Refresher.
     */
    refreshList(refresher: any): void {
        this.refreshAllData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.gradedObserver && this.gradedObserver.off();
    }
}
