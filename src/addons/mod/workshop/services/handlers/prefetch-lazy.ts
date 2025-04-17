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

import { AddonModDataSyncResult } from '@addons/mod/data/services/data-sync';
import { Injectable } from '@angular/core';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreUser } from '@features/user/services/user';
import { CoreFilepool } from '@services/filepool';
import { CoreGroup, CoreGroups } from '@services/groups';
import { CoreSites, CoreSitesReadingStrategy, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreObject } from '@singletons/object';
import { CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import {
    AddonModWorkshop,
    AddonModWorkshopGradesData,
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
} from '../workshop';
import { AddonModWorkshopHelper } from '../workshop-helper';
import { AddonModWorkshopSync } from '../workshop-sync';
import { AddonModWorkshopPrefetchHandlerService } from '@addons/mod/workshop/services/handlers/prefetch';
import { AddonModWorkshopPhase } from '../../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Handler to prefetch workshops.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopPrefetchHandlerLazyService extends AddonModWorkshopPrefetchHandlerService {

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const info = await this.getWorkshopInfoHelper(module, courseId, { omitFail: true });

        return info.files;
    }

    /**
     * Helper function to get all workshop info just once.
     *
     * @param module Module to get the files.
     * @param courseId Course ID the module belongs to.
     * @param options Other options.
     * @returns Promise resolved with the info fetched.
     */
    protected async getWorkshopInfoHelper(
        module: CoreCourseAnyModuleData,
        courseId: number,
        options: AddonModWorkshopGetInfoOptions = {},
    ): Promise<{ workshop?: AddonModWorkshopData; groups: CoreGroup[]; files: CoreWSFile[]}> {
        let groups: CoreGroup[] = [];
        let files: CoreWSFile[] = [];
        let workshop: AddonModWorkshopData;
        let access: AddonModWorkshopGetWorkshopAccessInformationWSResponse | undefined;

        const modOptions = {
            cmId: module.id,
            ...options, // Include all options.
        };

        const site = await CoreSites.getSite(options.siteId);
        options.siteId = options.siteId ?? site.getId();
        const userId = site.getUserId();

        try {
            workshop = await AddonModWorkshop.getWorkshop(courseId, module.id, options);
        }  catch (error) {
            if (options.omitFail) {
                // Any error, return the info we have.
                return {
                    groups: [],
                    files: [],
                };
            }

            throw error;
        }

        try {
            files = this.getIntroFilesFromInstance(module, workshop);
            files = files.concat(workshop.instructauthorsfiles || []).concat(workshop.instructreviewersfiles || []);

            access = await AddonModWorkshop.getWorkshopAccessInformation(workshop.id, modOptions);
            if (access.canviewallsubmissions) {
                const groupInfo = await CoreGroups.getActivityGroupInfo(module.id, false, undefined, options.siteId);
                if (!groupInfo.groups || groupInfo.groups.length == 0) {
                    groupInfo.groups = [{ id: 0, name: '' }];
                }
                groups = groupInfo.groups;
            }

            const phases = await AddonModWorkshop.getUserPlanPhases(workshop.id, modOptions);

            // Get submission phase info.
            const submissionPhase = phases[AddonModWorkshopPhase.PHASE_SUBMISSION];
            const canSubmit = AddonModWorkshopHelper.canSubmit(workshop, access, submissionPhase.tasks);
            const canAssess = AddonModWorkshopHelper.canAssess(workshop, access);

            const promises: Promise<void>[] = [];

            if (canSubmit) {
                promises.push(AddonModWorkshopHelper.getUserSubmission(workshop.id, {
                    userId,
                    cmId: module.id,
                }).then((submission) => {
                    if (submission) {
                        files = files.concat(submission.contentfiles || []).concat(submission.attachmentfiles || []);
                    }

                    return;
                }));
            }

            if (access.canviewallsubmissions && workshop.phase >= AddonModWorkshopPhase.PHASE_SUBMISSION) {
                promises.push(AddonModWorkshop.getSubmissions(workshop.id, modOptions).then(async (submissions) => {

                    await Promise.all(submissions.map(async (submission) => {
                        files = files.concat(submission.contentfiles || []).concat(submission.attachmentfiles || []);

                        const assessments = await AddonModWorkshop.getSubmissionAssessments(workshop.id, submission.id, {
                            cmId: module.id,
                        });

                        assessments.forEach((assessment) => {
                            files = files.concat(assessment.feedbackattachmentfiles)
                                .concat(assessment.feedbackcontentfiles);
                        });

                        if (workshop.phase >= AddonModWorkshopPhase.PHASE_ASSESSMENT && canAssess) {
                            await Promise.all(assessments.map((assessment) =>
                                AddonModWorkshopHelper.getReviewerAssessmentById(workshop.id, assessment.id)));
                        }
                    }));

                    return;
                }));
            }

            // Get assessment files.
            if (workshop.phase >= AddonModWorkshopPhase.PHASE_ASSESSMENT && canAssess) {
                promises.push(AddonModWorkshopHelper.getReviewerAssessments(workshop.id, modOptions).then((assessments) => {
                    assessments.forEach((assessment) => {
                        files = files.concat(<CoreWSExternalFile[]>assessment.feedbackattachmentfiles)
                            .concat(assessment.feedbackcontentfiles);
                    });

                    return;
                }));
            }

            await Promise.all(promises);

            return {
                workshop,
                groups,
                files: files.filter((file) => file !== undefined),
            };
        } catch (error) {
            if (options.omitFail) {
                // Any error, return the info we have.
                return {
                    workshop,
                    groups,
                    files: files.filter((file) => file !== undefined),
                };
            }

            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModWorkshop.invalidateContent(moduleId, courseId);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can be downloaded. The promise should never be rejected.
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const workshop = await AddonModWorkshop.getWorkshop(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
        });

        const accessData = await AddonModWorkshop.getWorkshopAccessInformation(workshop.id, { cmId: module.id });

        // Check if workshop is setup by phase.
        return accessData.canswitchphase || workshop.phase > AddonModWorkshopPhase.PHASE_SETUP;
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchWorkshop(module, courseId, siteId));
    }

    /**
     * Retrieves all the grades reports for all the groups and then returns only unique grades.
     *
     * @param workshopId Workshop ID.
     * @param groups Array of groups in the activity.
     * @param cmId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns All unique entries.
     */
    protected async getAllGradesReport(
        workshopId: number,
        groups: CoreGroup[],
        cmId: number,
        siteId: string,
    ): Promise<AddonModWorkshopGradesData[]> {
        const promises: Promise<AddonModWorkshopGradesData[]>[] = [];

        groups.forEach((group) => {
            promises.push(AddonModWorkshop.fetchAllGradeReports(workshopId, { groupId: group.id, cmId, siteId }));
        });

        const grades = await Promise.all(promises);
        const uniqueGrades: Record<number, AddonModWorkshopGradesData> = {};

        grades.forEach((groupGrades) => {
            groupGrades.forEach((grade) => {
                if (grade.submissionid) {
                    uniqueGrades[grade.submissionid] = grade;
                }
            });
        });

        return CoreObject.toArray(uniqueGrades);
    }

    /**
     * Prefetch a workshop.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchWorkshop(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const userIds: number[] = [];
        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        const site = await CoreSites.getSite(siteId);
        const currentUserId = site.getUserId();

        // Prefetch the workshop data.
        const info = await this.getWorkshopInfoHelper(module, courseId, commonOptions);
        if (!info.workshop) {
            // It would throw an exception so it would not happen.
            return;
        }

        const workshop = info.workshop;
        const promises: Promise<unknown>[] = [];
        const assessmentIds: number[] = [];

        promises.push(CoreFilepool.addFilesToQueue(siteId, info.files, this.component, module.id));

        promises.push(AddonModWorkshop.getWorkshopAccessInformation(workshop.id, modOptions).then(async (access) => {
            const phases = await AddonModWorkshop.getUserPlanPhases(workshop.id, modOptions);

            // Get submission phase info.
            const submissionPhase = phases[AddonModWorkshopPhase.PHASE_SUBMISSION];
            const canSubmit = AddonModWorkshopHelper.canSubmit(workshop, access, submissionPhase.tasks);
            const canAssess = AddonModWorkshopHelper.canAssess(workshop, access);
            const promises2: Promise<unknown>[] = [];

            if (canSubmit) {
                promises2.push(AddonModWorkshop.getSubmissions(workshop.id, modOptions));
                // Add userId to the profiles to prefetch.
                userIds.push(currentUserId);
            }

            let reportPromise: Promise<unknown> = Promise.resolve();
            if (access.canviewallsubmissions && workshop.phase >= AddonModWorkshopPhase.PHASE_SUBMISSION) {
                // eslint-disable-next-line promise/no-nesting
                reportPromise = this.getAllGradesReport(workshop.id, info.groups, module.id, siteId).then((grades) => {
                    grades.forEach((grade) => {
                        userIds.push(grade.userid);
                        grade.submissiongradeoverby && userIds.push(grade.submissiongradeoverby);

                        grade.reviewedby && grade.reviewedby.forEach((assessment) => {
                            userIds.push(assessment.userid);
                            assessmentIds[assessment.assessmentid] = assessment.assessmentid;
                        });

                        grade.reviewerof && grade.reviewerof.forEach((assessment) => {
                            userIds.push(assessment.userid);
                            assessmentIds[assessment.assessmentid] = assessment.assessmentid;
                        });
                    });

                    return;
                });
            }

            if (workshop.phase >= AddonModWorkshopPhase.PHASE_ASSESSMENT && canAssess) {
                // Wait the report promise to finish to override assessments array if needed.
                reportPromise = reportPromise.finally(async () => {
                    const revAssessments = await AddonModWorkshopHelper.getReviewerAssessments(workshop.id, {
                        userId: currentUserId,
                        cmId: module.id,
                        siteId,
                    });

                    let files: CoreWSExternalFile[] = []; // Files in each submission.

                    revAssessments.forEach((assessment) => {
                        if (assessment.submission?.authorid == currentUserId) {
                            promises.push(AddonModWorkshop.getAssessment(
                                workshop.id,
                                assessment.id,
                                modOptions,
                            ));
                        }
                        userIds.push(assessment.reviewerid);
                        userIds.push(assessment.gradinggradeoverby);
                        assessmentIds[assessment.id] = assessment.id;

                        files = files.concat(assessment.submission?.attachmentfiles || [])
                            .concat(assessment.submission?.contentfiles || []);
                    });

                    await CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id);
                });
            }

            reportPromise = reportPromise.finally(() => {
                if (assessmentIds.length > 0) {
                    return Promise.all(assessmentIds.map((assessmentId) =>
                        AddonModWorkshop.getAssessmentForm(workshop.id, assessmentId, modOptions)));
                }
            });
            promises2.push(reportPromise);

            if (workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED) {
                promises2.push(AddonModWorkshop.getGrades(workshop.id, modOptions));
                if (access.canviewpublishedsubmissions) {
                    promises2.push(AddonModWorkshop.getSubmissions(workshop.id, modOptions));
                }
            }

            await Promise.all(promises2);

            return;
        }));

        // Add Basic Info to manage links.
        promises.push(CoreCourse.getModuleBasicInfoByInstance(workshop.id, 'workshop', { siteId }));
        promises.push(CoreCourse.getModuleBasicGradeInfo(module.id, siteId));

        // Get course data, needed to determine upload max size if it's configured to be course limit.
        promises.push(CorePromiseUtils.ignoreErrors(CoreCourses.getCourseByField('id', courseId, siteId)));

        await Promise.all(promises);

        // Prefetch user profiles.
        await CoreUser.prefetchProfiles(userIds, courseId, siteId);
    }

    /**
     * @inheritdoc
     */
    async sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModDataSyncResult> {
        return AddonModWorkshopSync.syncWorkshop(module.instance, siteId);
    }

}
export const AddonModWorkshopPrefetchHandler = makeSingleton(AddonModWorkshopPrefetchHandlerLazyService);

/**
 * Options to pass to getWorkshopInfoHelper.
 */
export type AddonModWorkshopGetInfoOptions = CoreSitesCommonWSOptions & {
    omitFail?: boolean; // True to always return even if fails.
};
