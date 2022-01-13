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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignGrade,
    AddonModAssignProvider,
    AddonModAssignSubmission,
} from '../services/assign';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../services/assign-helper';
import { AddonModAssignOffline } from '../services/assign-offline';
import { AddonModAssignSync, AddonModAssignSyncProvider } from '../services/assign-sync';

/**
 * Provides a collection of assignment submissions.
 */
export class AddonModAssignSubmissionsSource extends CoreRoutedItemsManagerSource<AddonModAssignSubmissionForList> {

    /**
     * @inheritdoc
     */
    static getSourceId(courseId: number, moduleId: number, selectedStatus?: string): string {
        selectedStatus = selectedStatus ?? '__empty__';

        return `submissions-${courseId}-${moduleId}-${selectedStatus}`;
    }

    readonly COURSE_ID: number;
    readonly MODULE_ID: number;
    readonly SELECTED_STATUS: string | undefined;

    assign?: AddonModAssignAssign;
    groupId = 0;
    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false,
        defaultGroupId: 0,
        canAccessAllGroups: false,
    };

    protected submissionsData: { canviewsubmissions: boolean; submissions?: AddonModAssignSubmission[] } = {
        canviewsubmissions: false,
    };

    constructor(courseId: number, moduleId: number, selectedStatus?: string) {
        super();

        this.COURSE_ID = courseId;
        this.MODULE_ID = moduleId;
        this.SELECTED_STATUS = selectedStatus;
    }

    /**
     * @inheritdoc
     */
    getItemPath(submission: AddonModAssignSubmissionForList): string {
        return String(submission.submitid);
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(submission: AddonModAssignSubmissionForList): Params {
        return {
            blindId: submission.blindid,
            groupId: this.groupId,
            selectedStatus: this.SELECTED_STATUS,
        };
    }

    /**
     * Invalidate assignment cache.
     */
    async invalidateCache(): Promise<void> {
        await Promise.all([
            AddonModAssign.invalidateAssignmentData(this.COURSE_ID),
            this.assign && AddonModAssign.invalidateAllSubmissionData(this.assign.id),
            this.assign && AddonModAssign.invalidateAssignmentUserMappingsData(this.assign.id),
            this.assign && AddonModAssign.invalidateAssignmentGradesData(this.assign.id),
            this.assign && AddonModAssign.invalidateListParticipantsData(this.assign.id),
        ]);
    }

    /**
     * Load assignment.
     */
    async loadAssignment(sync: boolean = false): Promise<void> {
        // Get assignment data.
        this.assign = await AddonModAssign.getAssignment(this.COURSE_ID, this.MODULE_ID);

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

        this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);

        await this.reload();
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: AddonModAssignSubmissionForList[] }> {
        const assign = this.assign;

        if (!assign) {
            throw new Error('Can\'t load submissions without assignment');
        }

        // Fetch submissions and grades.
        let submissions =
            await AddonModAssignHelper.getSubmissionsUserData(
                assign,
                this.submissionsData.submissions,
                this.groupId,
            );
        // Get assignment grades only if workflow is not enabled to check grading date.
        const grades = !assign.markingworkflow
            ? await AddonModAssign.getAssignmentGrades(assign.id, { cmId: assign.cmid })
            : [];

        // Filter the submissions to get only the ones with the right status and add some extra data.
        const getNeedGrading = this.SELECTED_STATUS == AddonModAssignProvider.NEED_GRADING;
        const searchStatus = getNeedGrading ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED : this.SELECTED_STATUS;

        const showSubmissions: AddonModAssignSubmissionForList[] = [];

        if (searchStatus) {
            submissions = submissions.filter((submission: AddonModAssignSubmissionForList) => searchStatus == submission.status);
        }

        const promises: Promise<void>[] = submissions.map(async (submission: AddonModAssignSubmissionForList) => {
            const gradeData = await CoreUtils.ignoreErrors(AddonModAssignOffline.getSubmissionGrade(assign.id, submission.userid));
            if (getNeedGrading) {
                // Only show the submissions that need to be graded.
                const add = await AddonModAssign.needsSubmissionToBeGraded(submission, assign.id);

                if (!add) {
                    return;
                }
            }

            // Load offline grades.
            const notSynced = !!gradeData && submission.timemodified < gradeData.timemodified;

            if (submission.gradingstatus == 'graded' && !assign.markingworkflow) {
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

            submission.statusTranslated = Translate.instant(
                'addon.mod_assign.submissionstatus_' + submission.status,
            );

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
        });

        await Promise.all(promises);

        return { items: showSubmissions };
    }

}

/**
 * Calculated data for an assign submission.
 */
export type AddonModAssignSubmissionForList = AddonModAssignSubmissionFormatted & {
    statusColor?: string; // Calculated in the app. Color of the submission status.
    gradingColor?: string; // Calculated in the app. Color of the submission grading status.
    statusTranslated?: string; // Calculated in the app. Translated text of the submission status.
    gradingStatusTranslationId?: string; // Calculated in the app. Key of the text of the submission grading status.
};
