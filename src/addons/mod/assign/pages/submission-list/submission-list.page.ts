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

import { Component, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { Params } from '@angular/router';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
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
    AddonModAssignGrade,
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
export class AddonModAssignSubmissionListPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    title = ''; // Title to display.
    assign?: AddonModAssignAssign; // Assignment.
    submissions: AddonModAssignSubmissionListManager; // List of submissions
    loaded = false; // Whether data has been loaded.
    haveAllParticipants = true; // Whether all participants have been loaded.
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

    constructor() {
        this.submissions = new AddonModAssignSubmissionListManager(AddonModAssignSubmissionListPage);

        // Update data if some grade changes.
        this.gradedObserver = CoreEvents.on(
            AddonModAssignProvider.GRADED_EVENT,
            (data) => {
                if (
                    this.loaded &&
                    this.assign &&
                    data.assignmentId == this.assign.id &&
                    data.userId == CoreSites.getCurrentSiteUserId()
                ) {
                    // Grade changed, refresh the data.
                    this.loaded = false;

                    this.refreshAllData(true).finally(() => {
                        this.loaded = true;
                    });
                }
            },
            CoreSites.getCurrentSiteId(),
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
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * Component being initialized.
     */
    ngAfterViewInit(): void {
        this.moduleId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.groupId = CoreNavigator.getRouteNumberParam('groupId') || 0;
        this.selectedStatus = CoreNavigator.getRouteParam('status');

        if (this.selectedStatus) {
            if (this.selectedStatus == AddonModAssignProvider.NEED_GRADING) {
                this.title = Translate.instant('addon.mod_assign.numberofsubmissionsneedgrading');
            } else {
                this.title = Translate.instant('addon.mod_assign.submissionstatus_' + this.selectedStatus);
            }
        } else {
            this.title = Translate.instant('addon.mod_assign.numberofparticipants');
        }
        this.fetchAssignment(true).finally(() => {
            this.loaded = true;
            this.submissions.start(this.splitView);
        });
    }

    /**
     * Fetch assignment data.
     *
     * @param sync Whether to try to synchronize data.
     * @return Promise resolved when done.
     */
    protected async fetchAssignment(sync = false): Promise<void> {
        try {
            // Get assignment data.
            this.assign = await AddonModAssign.getAssignment(this.courseId, this.moduleId);

            this.title = this.assign.name || this.title;

            if (sync) {
                try {
                    // Try to synchronize data.
                    const result = await AddonModAssignSync.syncAssign(this.assign.id);

                    if (result && result.updated) {
                        CoreEvents.trigger(
                            AddonModAssignSyncProvider.MANUAL_SYNCED,
                            {
                                assignId: this.assign.id,
                                warnings: result.warnings,
                                gradesBlocked: result.gradesBlocked,
                                context: 'submission-list',
                            },
                            CoreSites.getCurrentSiteId(),
                        );
                    }
                } catch (error) {
                    // Ignore errors, probably user is offline or sync is blocked.
                }
            }

            // Get assignment submissions.
            this.submissionsData = await AddonModAssign.getSubmissions(this.assign.id, { cmId: this.assign.cmid });

            if (!this.submissionsData.canviewsubmissions) {
                // User shouldn't be able to reach here.
                throw new Error('Cannot view submissions.');
            }

            // Check if groupmode is enabled to avoid showing wrong numbers.
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.assign.cmid, false);

            await this.setGroup(CoreGroups.validateGroupId(this.groupId, this.groupInfo));
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting assigment data.');
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

        if (!CoreSites.getCurrentSite()?.wsAvailable('mod_assign_list_participants')) {
            // Submissions are not displayed in Moodle 3.1 without the local plugin, see MOBILE-2968.
            this.haveAllParticipants = false;
            this.submissions.resetItems();

            return;
        }

        // Fetch submissions and grades.
        const submissions =
            await AddonModAssignHelper.getSubmissionsUserData(
                this.assign!,
                this.submissionsData.submissions,
                this.groupId,
            );
        // Get assignment grades only if workflow is not enabled to check grading date.
        const grades = !this.assign!.markingworkflow
            ? await AddonModAssign.getAssignmentGrades(this.assign!.id, { cmId: this.assign!.cmid })
            : [];

        // Filter the submissions to get only the ones with the right status and add some extra data.
        const getNeedGrading = this.selectedStatus == AddonModAssignProvider.NEED_GRADING;
        const searchStatus = getNeedGrading ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED : this.selectedStatus;

        const promises: Promise<void>[] = [];
        const showSubmissions: AddonModAssignSubmissionForList[] = [];

        submissions.forEach((submission: AddonModAssignSubmissionForList) => {
            if (!searchStatus || searchStatus == submission.status) {
                promises.push(
                    CoreUtils.ignoreErrors(
                        AddonModAssignOffline.getSubmissionGrade(this.assign!.id, submission.userid),
                    ).then(async (data) => {
                        if (getNeedGrading) {
                            // Only show the submissions that need to be graded.
                            const add = await AddonModAssign.needsSubmissionToBeGraded(submission, this.assign!.id);

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
                                .reduce(
                                    (a, b) => (a && a.timemodified > b.timemodified ? a : b),
                                    <AddonModAssignGrade | undefined> undefined,
                                );

                            if (grade && grade.timemodified < submission.timemodified) {
                                submission.gradingstatus = AddonModAssignProvider.GRADED_FOLLOWUP_SUBMIT;
                            }
                        }
                        submission.statusColor = AddonModAssign.getSubmissionStatusColor(submission.status);
                        submission.gradingColor = AddonModAssign.getSubmissionGradingStatusColor(
                            submission.gradingstatus,
                        );

                        // Show submission status if not submitted for grading.
                        if (submission.statusColor != 'success' || !submission.gradingstatus) {
                            submission.statusTranslated = Translate.instant(
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
                            submission.gradingStatusTranslationId = AddonModAssign.getSubmissionGradingStatusTranslationId(
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

        this.submissions.setItems(showSubmissions);
    }

    /**
     * Refresh all the data.
     *
     * @param sync Whether to try to synchronize data.
     * @return Promise resolved when done.
     */
    protected async refreshAllData(sync?: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModAssign.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(AddonModAssign.invalidateAllSubmissionData(this.assign.id));
            promises.push(AddonModAssign.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(AddonModAssign.invalidateAssignmentGradesData(this.assign.id));
            promises.push(AddonModAssign.invalidateListParticipantsData(this.assign.id));
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
    refreshList(refresher?: IonRefresher): void {
        this.refreshAllData(true).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.gradedObserver?.off();
        this.syncObserver?.off();
        this.submissions.destroy();
    }

}

/**
 * Helper class to manage submissions.
 */
class AddonModAssignSubmissionListManager extends CorePageItemsListManager<AddonModAssignSubmissionForList> {

    constructor(pageComponent: unknown) {
        super(pageComponent);
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(submission: AddonModAssignSubmissionForList): string {
        return String(submission.submitid);
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(submission: AddonModAssignSubmissionForList): Params {
        return {
            blindId: submission.blindid,
        };
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
