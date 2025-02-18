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

import { Injectable } from '@angular/core';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton } from '@singletons';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignSubmissionStatusOptions,
} from '../assign';
import { AddonModAssignSubmissionDelegate } from '../submission-delegate';
import { AddonModAssignFeedbackDelegate } from '../feedback-delegate';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreWSFile } from '@services/ws';
import { AddonModAssignHelper, AddonModAssignSubmissionFormatted } from '../assign-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreFilepool } from '@services/filepool';
import { CoreGroups } from '@services/groups';
import { AddonModAssignSync, AddonModAssignSyncResult } from '../assign-sync';
import { CoreUser } from '@features/user/services/user';
import { CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CoreCourses } from '@features/courses/services/courses';
import { ADDON_MOD_ASSIGN_COMPONENT_LEGACY, ADDON_MOD_ASSIGN_MODNAME, ADDON_MOD_ASSIGN_PREFETCH_NAME } from '../../constants';

/**
 * Handler to prefetch assigns.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = ADDON_MOD_ASSIGN_PREFETCH_NAME;
    modName = ADDON_MOD_ASSIGN_MODNAME;
    component = ADDON_MOD_ASSIGN_COMPONENT_LEGACY;
    updatesNames = /^configuration$|^.*files$|^submissions$|^grades$|^gradeitems$|^outcomes$|^comments$/;

    /**
     * Check if a certain module can use core_course_check_updates to check if it has updates.
     * If not defined, it will assume all modules can be checked.
     * The modules that return false will always be shown as outdated when they're downloaded.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can use check_updates. The promise should never be rejected.
     */
    async canUseCheckUpdates(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        // Teachers cannot use the WS because it doesn't check student submissions.
        try {
            const assign = await AddonModAssign.getAssignment(courseId, module.id);

            const data = await AddonModAssign.getSubmissions(assign.id, { cmId: module.id });
            if (data.canviewsubmissions) {
                return false;
            }

            // Check if the user can view their own submission.
            await AddonModAssign.getSubmissionStatus(assign.id, { cmId: module.id });

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with the list of files.
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const siteId = CoreSites.getCurrentSiteId();

        try {
            const assign = await AddonModAssign.getAssignment(courseId, module.id, { siteId });
            // Get intro files, attachments and activity files.
            let files: CoreWSFile[] = assign.introattachments || [];
            files = files.concat(this.getIntroFilesFromInstance(module, assign));
            files = files.concat(assign.activityattachments || []);

            // Now get the files in the submissions.
            const submissionData = await AddonModAssign.getSubmissions(assign.id, { cmId: module.id, siteId });

            if (submissionData.canviewsubmissions) {
                // Teacher, get all submissions.
                const submissions =
                    await AddonModAssignHelper.getSubmissionsUserData(assign, submissionData.submissions, 0, { siteId });

                // Get all the files in the submissions.
                const promises = submissions.map(async (submission) => {
                    try {
                        const submissionFiles = await this.getSubmissionFiles(
                            assign,
                            submission.submitid!,
                            !!submission.blindid,
                            true,
                            siteId,
                        );

                        files = files.concat(submissionFiles);
                    } catch (error) {
                        if (error && error.errorcode == 'nopermission') {
                            // The user does not have persmission to view this submission, ignore it.
                            return;
                        }

                        throw error;
                    }
                });

                await Promise.all(promises);
            } else {
                // Student, get only his/her submissions.
                const userId = CoreSites.getCurrentSiteUserId();
                const blindMarking = !!assign.blindmarking && !assign.revealidentities;

                const submissionFiles = await this.getSubmissionFiles(assign, userId, blindMarking, false, siteId);
                files = files.concat(submissionFiles);
            }

            return files;
        } catch {
            // Error getting data, return empty list.
            return [];
        }
    }

    /**
     * Get submission files.
     *
     * @param assign Assign.
     * @param submitId User ID of the submission to get.
     * @param blindMarking True if blind marking, false otherwise.
     * @param canViewAllSubmissions Whether the user can view all submissions.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with array of files.
     */
    protected async getSubmissionFiles(
        assign: AddonModAssignAssign,
        submitId: number,
        blindMarking: boolean,
        canViewAllSubmissions: boolean,
        siteId?: string,
    ): Promise<CoreWSFile[]> {

        const submissionStatus = await AddonModAssign.getSubmissionStatusWithRetry(assign, {
            userId: submitId,
            isBlind: blindMarking,
            siteId,
        });
        const userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(assign, submissionStatus.lastattempt);

        // Get intro and activity files from the submission status if it's a student.
        // It's ok if they were already obtained from the assignment instance, they won't be downloaded twice.
        const files: CoreWSFile[] = canViewAllSubmissions ?
            [] :
            (submissionStatus.assignmentdata?.attachments?.intro || [])
                .concat(submissionStatus.assignmentdata?.attachments?.activity || []);

        if (!submissionStatus.lastattempt || !userSubmission) {
            return files;
        }

        const promises: Promise<CoreWSFile[]>[] = [];

        if (userSubmission.plugins) {
            // Add submission plugin files.
            userSubmission.plugins.forEach((plugin) => {
                promises.push(AddonModAssignSubmissionDelegate.getPluginFiles(assign, userSubmission, plugin, siteId));
            });
        }

        if (submissionStatus.feedback && submissionStatus.feedback.plugins) {
            // Add feedback plugin files.
            submissionStatus.feedback.plugins.forEach((plugin) => {
                promises.push(AddonModAssignFeedbackDelegate.getPluginFiles(assign, userSubmission, plugin, siteId));
            });
        }

        const filesLists = await Promise.all(promises);

        return files.concat.apply(files, filesLists);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModAssign.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData): Promise<void> {
        return CoreCourse.invalidateModule(module.id);
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchAssign(module, courseId, siteId));
    }

    /**
     * Prefetch an assignment.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchAssign(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const userId = CoreSites.getCurrentSiteUserId();

        const options: CoreSitesCommonWSOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        const modOptions: CoreCourseCommonModWSOptions = {
            cmId: module.id,
            ...options,
        };

        // Get assignment to retrieve all its submissions.
        const assign = await AddonModAssign.getAssignment(courseId, module.id, options);
        const promises: Promise<unknown>[] = [];
        const blindMarking = assign.blindmarking && !assign.revealidentities;

        if (blindMarking) {
            promises.push(
                CorePromiseUtils.ignoreErrors(AddonModAssign.getAssignmentUserMappings(assign.id, -1, modOptions)),
            );
        }

        promises.push(this.prefetchSubmissions(assign, courseId, module.id, userId, siteId));

        promises.push(CoreCourse.getModuleBasicInfoByInstance(assign.id, ADDON_MOD_ASSIGN_MODNAME, { siteId }));
        // Get course data, needed to determine upload max size if it's configured to be course limit.
        promises.push(CorePromiseUtils.ignoreErrors(CoreCourses.getCourseByField('id', courseId, siteId)));

        // Download intro files and attachments. Do not call getFiles because it'd call some WS twice.
        let files: CoreWSFile[] = assign.introattachments || [];
        files = files.concat(this.getIntroFilesFromInstance(module, assign));

        promises.push(CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id));

        await Promise.all(promises);
    }

    /**
     * Prefetch assign submissions.
     *
     * @param assign Assign.
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when prefetched, rejected otherwise.
     */
    protected async prefetchSubmissions(
        assign: AddonModAssignAssign,
        courseId: number,
        moduleId: number,
        userId: number,
        siteId: string,
    ): Promise<void> {
        const modOptions: CoreCourseCommonModWSOptions = {
            cmId: moduleId,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        // Get submissions.
        const submissions = await AddonModAssign.getSubmissions(assign.id, modOptions);
        const promises: Promise<unknown>[] = [];

        promises.push(this.prefetchParticipantSubmissions(
            assign,
            submissions.canviewsubmissions,
            submissions.submissions,
            moduleId,
            courseId,
            userId,
            siteId,
        ));

        // Prefetch own submission, we need to do this for teachers too so the response with error is cached.
        promises.push(
            this.prefetchSubmission(
                assign,
                courseId,
                moduleId,
                {
                    userId,
                    readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                    siteId,
                },
                true,
            ),
        );

        await Promise.all(promises);
    }

    protected async prefetchParticipantSubmissions(
        assign: AddonModAssignAssign,
        canviewsubmissions: boolean,
        submissions: AddonModAssignSubmission[] = [],
        moduleId: number,
        courseId: number,
        userId: number,
        siteId: string,
    ): Promise<void> {

        const options: CoreSitesCommonWSOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        const modOptions: CoreCourseCommonModWSOptions = {
            cmId: moduleId,
            ...options,
        };

        // Always prefetch groupInfo.
        const groupInfo = await CoreGroups.getActivityGroupInfo(assign.cmid, false, undefined, siteId);
        if (!canviewsubmissions) {

            return;
        }

        // Teacher, prefetch all submissions.
        if (!groupInfo.groups || groupInfo.groups.length == 0) {
            groupInfo.groups = [{ id: 0, name: '' }];
        }

        const promises = groupInfo.groups.map((group) =>
            AddonModAssignHelper.getSubmissionsUserData(assign, submissions, group.id, options)
                .then((submissions: AddonModAssignSubmissionFormatted[]) => {

                    const subPromises: Promise<unknown>[] = submissions.map((submission) => {
                        const submissionOptions = {
                            userId: submission.submitid,
                            groupId: group.id,
                            isBlind: !!submission.blindid,
                            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                            siteId,
                        };

                        return this.prefetchSubmission(assign, courseId, moduleId, submissionOptions, true);
                    });

                    subPromises.push(AddonModAssign.getAssignmentGrades(assign.id, modOptions));

                    // Prefetch the submission of the current user even if it does not exist, this will be create it.
                    if (!submissions || !submissions.find((subm: AddonModAssignSubmissionFormatted) => subm.submitid == userId)) {
                        const submissionOptions = {
                            userId,
                            groupId: group.id,
                            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                            siteId,
                        };

                        subPromises.push(this.prefetchSubmission(assign, courseId, moduleId, submissionOptions));
                    }

                    return Promise.all(subPromises);
                }).then(async () => {
                    // Participiants already fetched, we don't need to ignore cache now.
                    const participants = await AddonModAssignHelper.getParticipants(assign, group.id, { siteId });

                    await CoreUser.prefetchUserAvatars(participants, 'profileimageurl', siteId);

                    return;
                }));

        await Promise.all(promises);
    }

    /**
     * Prefetch a submission.
     *
     * @param assign Assign.
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @param options Other options, see getSubmissionStatusWithRetry.
     * @param resolveOnNoPermission If true, will avoid throwing if a nopermission error is raised.
     */
    protected async prefetchSubmission(
        assign: AddonModAssignAssign,
        courseId: number,
        moduleId: number,
        options: AddonModAssignSubmissionStatusOptions = {},
        resolveOnNoPermission = false,
    ): Promise<void> {
        const submission = await AddonModAssign.getSubmissionStatusWithRetry(assign, options);
        const siteId = options.siteId!;
        const userId = options.userId;

        try {
            const promises: Promise<unknown>[] = [];
            const blindMarking = !!assign.blindmarking && !assign.revealidentities;
            let userIds: number[] = [];
            const userSubmission = AddonModAssign.getSubmissionObjectFromAttempt(assign, submission.lastattempt);

            if (submission.lastattempt) {
                // Get IDs of the members who need to submit.
                if (!blindMarking && submission.lastattempt.submissiongroupmemberswhoneedtosubmit) {
                    userIds = userIds.concat(submission.lastattempt.submissiongroupmemberswhoneedtosubmit);
                }

                if (userSubmission && userSubmission.id) {
                    // Prefetch submission plugins data.
                    if (userSubmission.plugins) {
                        userSubmission.plugins.forEach((plugin) => {
                            // Prefetch the plugin WS data.
                            promises.push(
                                AddonModAssignSubmissionDelegate.prefetch(assign, userSubmission, plugin, siteId),
                            );

                            // Prefetch the plugin files.
                            promises.push(
                                AddonModAssignSubmissionDelegate.getPluginFiles(assign, userSubmission, plugin, siteId)
                                    .then((files) =>
                                        CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id))
                                    .catch(() => {
                                        // Ignore errors.
                                    }),
                            );
                        });
                    }

                    // Get ID of the user who did the submission.
                    if (userSubmission.userid) {
                        userIds.push(userSubmission.userid);
                    }
                }

                if (assign.teamsubmission && submission.lastattempt.submissiongroup) {
                    // Prefetch group info.
                    promises.push(CoreGroups.getActivityAllowedGroups(assign.cmid));
                }
            }

            // Prefetch grade items.
            if (userId) {
                promises.push(CoreCourse.getModuleBasicGradeInfo(moduleId, siteId).then((gradeInfo) => {
                    if (gradeInfo) {
                        promises.push(
                            CoreGradesHelper.getGradeModuleItems(courseId, moduleId, userId, undefined, siteId, true),
                        );
                    }

                    return;
                }));
            }

            // Prefetch feedback.
            if (submission.feedback) {
                // Get profile and image of the grader.
                if (submission.feedback.grade && submission.feedback.grade.grader > 0) {
                    userIds.push(submission.feedback.grade.grader);
                }

                // Prefetch feedback plugins data.
                if (submission.feedback.plugins && userSubmission && userSubmission.id) {
                    submission.feedback.plugins.forEach((plugin) => {
                        // Prefetch the plugin WS data.
                        promises.push(AddonModAssignFeedbackDelegate.prefetch(assign, userSubmission, plugin, siteId));

                        // Prefetch the plugin files.
                        promises.push(
                            AddonModAssignFeedbackDelegate.getPluginFiles(assign, userSubmission, plugin, siteId)
                                .then((files) => CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id))
                                .catch(() => {
                                    // Ignore errors.
                                }),
                        );
                    });
                }
            }

            // Prefetch user profiles.
            promises.push(CoreUser.prefetchProfiles(userIds, courseId, siteId));

            await Promise.all(promises);
        } catch (error) {
            // Ignore if the user can't view their own submission.
            if (resolveOnNoPermission && error.errorcode != 'nopermission') {
                throw error;
            }
        }
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModAssignSyncResult> {
        return AddonModAssignSync.syncAssign(module.instance, siteId);
    }

}
export const AddonModAssignPrefetchHandler = makeSingleton(AddonModAssignPrefetchHandlerService);
