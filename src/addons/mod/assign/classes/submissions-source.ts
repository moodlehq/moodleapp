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
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreIonicColorNames } from '@singletons/colors';
import { CoreEvents } from '@singletons/events';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignSubmission,
} from '../services/assign';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../services/assign-helper';
import { AddonModAssignOffline } from '../services/assign-offline';
import { AddonModAssignSync } from '../services/assign-sync';
import {
    ADDON_MOD_ASSIGN_MANUAL_SYNCED,
    AddonModAssignGradingStates,
    AddonModAssignListFilterName,
    AddonModAssignSubmissionStatusValues,
} from '../constants';

/**
 * Provides a collection of assignment submissions.
 */
export class AddonModAssignSubmissionsSource extends CoreRoutedItemsManagerSource<AddonModAssignSubmissionForList> {

    /**
     * @inheritdoc
     */
    static getSourceId(courseId: number, moduleId: number, selectedStatus?: AddonModAssignListFilterName): string {
        const statusId = selectedStatus ?? '__empty__';

        return `submissions-${courseId}-${moduleId}-${statusId}`;
    }

    readonly courseId: number;
    readonly moduleId: number;
    readonly selectedStatus: AddonModAssignListFilterName | undefined;

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

    constructor(courseId: number, moduleId: number, selectedStatus?: AddonModAssignListFilterName) {
        super();

        this.courseId = courseId;
        this.moduleId = moduleId;
        this.selectedStatus = selectedStatus;
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
            selectedStatus: this.selectedStatus,
        };
    }

    /**
     * Invalidate assignment cache.
     */
    async invalidateCache(): Promise<void> {
        await Promise.all([
            AddonModAssign.invalidateAssignmentData(this.courseId),
            this.assign && AddonModAssign.invalidateAllSubmissionData(this.assign.id),
            this.assign && AddonModAssign.invalidateAssignmentUserMappingsData(this.assign.id),
            this.assign && AddonModAssign.invalidateAssignmentGradesData(this.assign.id),
            this.assign && AddonModAssign.invalidateListParticipantsData(this.assign.id),
        ]);
    }

    /**
     * Load assignment.
     */
    async loadAssignment(sync = false): Promise<void> {
        // Get assignment data.
        this.assign = await AddonModAssign.getAssignment(this.courseId, this.moduleId);

        if (sync) {
            try {
                // Try to synchronize data.
                const result = await AddonModAssignSync.syncAssign(this.assign.id);

                if (result && result.updated) {
                    CoreEvents.trigger(
                        ADDON_MOD_ASSIGN_MANUAL_SYNCED,
                        {
                            assignId: this.assign.id,
                            warnings: result.warnings,
                            gradesBlocked: result.gradesBlocked,
                            context: 'submission-list',
                        },
                        CoreSites.getCurrentSiteId(),
                    );
                }
            } catch {
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
        let grades = !assign.markingworkflow
            ? await AddonModAssign.getAssignmentGrades(assign.id, { cmId: assign.cmid })
            : [];

        // Remove grades (not graded) and sort by timemodified DESC to allow finding quicker.
        grades = grades.filter((grade) => parseInt(grade.grade, 10) >= 0).sort((a, b) => b.timemodified - a.timemodified);
        // Filter the submissions to get only the ones with the right status and add some extra data.
        if (this.selectedStatus == AddonModAssignListFilterName.NEED_GRADING) {
            const promises: Promise<void>[] = submissions.map(async (submission: AddonModAssignSubmissionForList) => {
                // Only show the submissions that need to be graded.
                submission.needsGrading = await AddonModAssign.needsSubmissionToBeGraded(submission, assign);
            });

            await Promise.all(promises);

            submissions = submissions.filter((submission: AddonModAssignSubmissionForList) => submission.needsGrading);
        } else if (this.selectedStatus) {
            const searchStatus = this.selectedStatus == AddonModAssignListFilterName.DRAFT
                ? AddonModAssignSubmissionStatusValues.DRAFT
                : AddonModAssignSubmissionStatusValues.SUBMITTED;

            submissions = submissions.filter((submission: AddonModAssignSubmissionForList) => submission.status  == searchStatus);
        }

        const showSubmissions: AddonModAssignSubmissionForList[] = await Promise.all(
            submissions.map(async (submission: AddonModAssignSubmissionForList) => {
                const gradeData =
                    await CorePromiseUtils.ignoreErrors(AddonModAssignOffline.getSubmissionGrade(assign.id, submission.userid));

                // Load offline grades.
                const notSynced = !!gradeData && submission.timemodified < gradeData.timemodified;

                if (!assign.markingworkflow) {
                    // Get the last grade of the submission.
                    const grade = grades.find((grade) => grade.userid == submission.userid);

                    if (grade) {
                        // Override status if grade is found.
                        submission.gradingstatus = grade.timemodified < submission.timemodified
                            ? AddonModAssignGradingStates.GRADED_FOLLOWUP_SUBMIT
                            : AddonModAssignGradingStates.GRADED;
                    }
                } else if (assign.teamsubmission) {
                    // Try to use individual grading status instead of the group one.
                    const individualSubmission = this.submissionsData.submissions?.find(subm => submission.userid === subm.userid);
                    submission.gradingstatus = individualSubmission?.gradingstatus ?? submission.gradingstatus;
                }

                submission.statusColor = AddonModAssign.getSubmissionStatusColor(submission.status);
                submission.gradingColor = AddonModAssign.getSubmissionGradingStatusColor(
                    submission.gradingstatus,
                );

                submission.statusTranslated = Translate.instant(
                    `addon.mod_assign.submissionstatus_${submission.status}`,
                );

                if (notSynced) {
                    submission.gradingStatusTranslationId = 'addon.mod_assign.gradenotsynced';
                    submission.gradingColor = '';
                } else if (submission.statusColor != CoreIonicColorNames.DANGER ||
                    submission.gradingColor != CoreIonicColorNames.DANGER) {
                    // Show grading status if one of the statuses is not done.
                    submission.gradingStatusTranslationId = AddonModAssign.getSubmissionGradingStatusTranslationId(
                        submission.gradingstatus,
                    );
                } else {
                    submission.gradingStatusTranslationId = '';
                }

                return submission;
            }),
        );

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
    needsGrading?: boolean; // Calculated in the app. If submission and grading status means that it needs grading.
};
