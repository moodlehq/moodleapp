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
import { ActivatedRoute } from '@angular/router';
import { IonRefresher } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignProvider,
    AddonModAssign,
    AddonModAssignGradedEventData,
} from '../../services/assign';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../../services/assign-helper';
import { AddonModAssignOffline } from '../../services/assign-offline';
import {
    AddonModAssignSyncProvider,
    AddonModAssignSync,
    AddonModAssignManualSyncData,
    AddonModAssignAutoSyncData,
} from '../../services/assign-sync';

/**
 * Page that displays a list of submissions of an assignment.
 */
@Component({
    selector: 'page-addon-mod-assign-submission-list',
    templateUrl: 'submission-list.html',
})
export class AddonModAssignSubmissionListPage implements OnInit, OnDestroy {

    // @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    title = ''; // Title to display.
    assign?: AddonModAssignAssign; // Assignment.
    submissions: AddonModAssignSubmissionForList[] = []; // List of submissions
    loaded = false; // Whether data has been loaded.
    haveAllParticipants  = true; // Whether all participants have been loaded.
    selectedSubmissionId?: number; // Selected submission ID.
    groupId = 0; // Group ID to show.
    courseId!: number; // Course ID the assignment belongs to.
    moduleId!: number; // Module ID the submission belongs to.

    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false,
        defaultGroupId: 0,
    };

    protected selectedStatus?: string; // The status to see.
    protected gradedObserver: CoreEventObserver; // Observer to refresh data when a grade changes.
    protected syncObserver: CoreEventObserver; // Observer to refresh data when the async is synchronized.
    protected submissionsData: { canviewsubmissions: boolean; submissions?: AddonModAssignSubmission[] } = {
        canviewsubmissions: false,
    };

    constructor(
        protected route: ActivatedRoute,
    ) {
        // Update data if some grade changes.
        this.gradedObserver = CoreEvents.on<AddonModAssignGradedEventData>(
            AddonModAssignProvider.GRADED_EVENT,
            (data) => {
                if (
                    this.loaded &&
                    this.assign &&
                    data.assignmentId == this.assign.id &&
                    data.userId == CoreSites.instance.getCurrentSiteUserId()
                ) {
                    // Grade changed, refresh the data.
                    this.loaded = false;

                    this.refreshAllData(true).finally(() => {
                        this.loaded = true;
                    });
                }
            },
            CoreSites.instance.getCurrentSiteId(),
        );

        // Refresh data if this assign is synchronized.
        const events = [AddonModAssignSyncProvider.AUTO_SYNCED, AddonModAssignSyncProvider.MANUAL_SYNCED];
        this.syncObserver = CoreEvents.onMultiple<AddonModAssignAutoSyncData | AddonModAssignManualSyncData>(
            events,
            (data) => {
                if (!this.loaded || ('context' in data && data.context == 'submission-list')) {
                    return;
                }

                this.loaded = false;

                this.refreshAllData(false).finally(() => {
                    this.loaded = true;
                });
            },
            CoreSites.instance.getCurrentSiteId(),
        );
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.moduleId = CoreNavigator.instance.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId')!;

        this.route.queryParams.subscribe((params) => {
            this.groupId = CoreNavigator.instance.getRouteNumberParam('groupId', params) || 0;
            this.selectedStatus = CoreNavigator.instance.getRouteParam('status', params);

            if (this.selectedStatus) {
                if (this.selectedStatus == AddonModAssignProvider.NEED_GRADING) {
                    this.title = Translate.instance.instant('addon.mod_assign.numberofsubmissionsneedgrading');
                } else {
                    this.title = Translate.instance.instant('addon.mod_assign.submissionstatus_' + this.selectedStatus);
                }
            } else {
                this.title = Translate.instance.instant('addon.mod_assign.numberofparticipants');
            }
            this.fetchAssignment(true).finally(() => {
                /* if (!this.selectedSubmissionId && this.splitviewCtrl.isOn() && this.submissions.length > 0) {
                    // Take first and load it.
                    this.loadSubmission(this.submissions[0]);
                }*/

                this.loaded = true;
            });
        });
    }

    /**
     * Fetch assignment data.
     *
     * @param sync Whether to try to synchronize data.
     * @return Promise resolved when done.
     */
    protected async fetchAssignment(sync?: boolean): Promise<void> {
        try {
            // Get assignment data.
            this.assign = await AddonModAssign.instance.getAssignment(this.courseId, this.moduleId);

            this.title = this.assign.name || this.title;

            if (sync) {
                try {
                    // Try to synchronize data.
                    const result = await AddonModAssignSync.instance.syncAssign(this.assign.id);

                    if (result && result.updated) {
                        CoreEvents.trigger<AddonModAssignManualSyncData>(
                            AddonModAssignSyncProvider.MANUAL_SYNCED,
                            {
                                assignId: this.assign.id,
                                warnings: result.warnings,
                                gradesBlocked: result.gradesBlocked,
                                context: 'submission-list',
                            },
                            CoreSites.instance.getCurrentSiteId(),
                        );
                    }
                } catch (error) {
                    // Ignore errors, probably user is offline or sync is blocked.
                }
            }

            // Get assignment submissions.
            this.submissionsData = await AddonModAssign.instance.getSubmissions(this.assign.id, { cmId: this.assign.cmid });

            if (!this.submissionsData.canviewsubmissions) {
                // User shouldn't be able to reach here.
                throw new Error('Cannot view submissions.');
            }

            // Check if groupmode is enabled to avoid showing wrong numbers.
            this.groupInfo = await CoreGroups.instance.getActivityGroupInfo(this.assign.cmid, false);

            await this.setGroup(CoreGroups.instance.validateGroupId(this.groupId, this.groupInfo));
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error getting assigment data.');
        }
    }

    /**
     * Set group to see the summary.
     *
     * @param groupId Group ID.
     * @return Resolved when done.
     */
    async setGroup(groupId: number): Promise<void> {
        this.groupId = groupId;

        this.haveAllParticipants = true;

        if (!CoreSites.instance.getCurrentSite()?.wsAvailable('mod_assign_list_participants')) {
            // Submissions are not displayed in Moodle 3.1 without the local plugin, see MOBILE-2968.
            this.haveAllParticipants = false;
            this.submissions = [];

            return;
        }

        // Fetch submissions and grades.
        const submissions =
            await AddonModAssignHelper.instance.getSubmissionsUserData(
                this.assign!,
                this.submissionsData.submissions,
                this.groupId,
            );
        // Get assignment grades only if workflow is not enabled to check grading date.
        const grades = !this.assign!.markingworkflow
            ? await AddonModAssign.instance.getAssignmentGrades(this.assign!.id, { cmId: this.assign!.cmid })
            : [];

        // Filter the submissions to get only the ones with the right status and add some extra data.
        const getNeedGrading = this.selectedStatus == AddonModAssignProvider.NEED_GRADING;
        const searchStatus = getNeedGrading ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED : this.selectedStatus;

        const promises: Promise<void>[] = [];
        const showSubmissions: AddonModAssignSubmissionForList[] = [];

        submissions.forEach((submission: AddonModAssignSubmissionForList) => {
            if (!searchStatus || searchStatus == submission.status) {
                promises.push(
                    CoreUtils.instance.ignoreErrors(
                        AddonModAssignOffline.instance.getSubmissionGrade(this.assign!.id, submission.userid),
                    ).then(async (data) => {
                        if (getNeedGrading) {
                            // Only show the submissions that need to be graded.
                            const add = await AddonModAssign.instance.needsSubmissionToBeGraded(submission, this.assign!.id);

                            if (!add) {
                                return;
                            }
                        }

                        // Load offline grades.
                        const notSynced = !!data && submission.timemodified < data.timemodified;

                        if (submission.gradingstatus == 'graded' && !this.assign!.markingworkflow) {
                            // Get the last grade of the submission.
                            const grade = grades
                                .filter((grade) => grade.userid == submission.userid)
                                .reduce((a, b) => (a.timemodified > b.timemodified ? a : b));

                            if (grade && grade.timemodified < submission.timemodified) {
                                submission.gradingstatus = AddonModAssignProvider.GRADED_FOLLOWUP_SUBMIT;
                            }
                        }
                        submission.statusColor = AddonModAssign.instance.getSubmissionStatusColor(submission.status);
                        submission.gradingColor = AddonModAssign.instance.getSubmissionGradingStatusColor(
                            submission.gradingstatus,
                        );

                        // Show submission status if not submitted for grading.
                        if (submission.statusColor != 'success' || !submission.gradingstatus) {
                            submission.statusTranslated = Translate.instance.instant(
                                'addon.mod_assign.submissionstatus_' + submission.status,
                            );
                        } else {
                            submission.statusTranslated = '';
                        }

                        if (notSynced) {
                            submission.gradingStatusTranslationId = 'addon.mod_assign.gradenotsynced';
                            submission.gradingColor = '';
                        } else if (submission.statusColor != 'danger' || submission.gradingColor != 'danger') {
                            // Show grading status if one of the statuses is not done.
                            submission.gradingStatusTranslationId = AddonModAssign.instance.getSubmissionGradingStatusTranslationId(
                                submission.gradingstatus,
                            );
                        } else {
                            submission.gradingStatusTranslationId = '';
                        }

                        showSubmissions.push(submission);

                        return;
                    }),
                );
            }
        });

        await Promise.all(promises);

        this.submissions = showSubmissions;
    }

    /**
     * Load a certain submission.
     *
     * @param submission The submission to load.
     */
    loadSubmission(submission: AddonModAssignSubmissionForList): void {
        /* if (this.selectedSubmissionId === submission.submitid && this.splitviewCtrl.isOn()) {
            // Already selected.
            return;
        }*/

        this.selectedSubmissionId = submission.submitid;

        /* this.splitviewCtrl.push('AddonModAssignSubmissionReviewPage', {
            courseId: this.courseId,
            moduleId: this.moduleId,
            submitId: submission.submitid,
            blindId: submission.blindid,
        });*/
    }

    /**
     * Refresh all the data.
     *
     * @param sync Whether to try to synchronize data.
     * @return Promise resolved when done.
     */
    protected async refreshAllData(sync?: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModAssign.instance.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(AddonModAssign.instance.invalidateAllSubmissionData(this.assign.id));
            promises.push(AddonModAssign.instance.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(AddonModAssign.instance.invalidateAssignmentGradesData(this.assign.id));
            promises.push(AddonModAssign.instance.invalidateListParticipantsData(this.assign.id));
        }

        try {
            await Promise.all(promises);
        } finally {
            this.fetchAssignment(sync);
        }
    }

    /**
     * Refresh the list.
     *
     * @param refresher Refresher.
     */
    refreshList(refresher?: CustomEvent<IonRefresher>): void {
        this.refreshAllData(true).finally(() => {
            refresher?.detail.complete();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.gradedObserver?.off();
        this.syncObserver?.off();
    }

}

/**
 * Calculated data for an assign submission.
 */
type AddonModAssignSubmissionForList = AddonModAssignSubmissionFormatted & {
    statusColor?: string; // Calculated in the app. Color of the submission status.
    gradingColor?: string; // Calculated in the app. Color of the submission grading status.
    statusTranslated?: string; // Calculated in the app. Translated text of the submission status.
    gradingStatusTranslationId?: string; // Calculated in the app. Key of the text of the submission grading status.
};
