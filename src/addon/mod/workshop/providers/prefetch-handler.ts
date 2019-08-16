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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModWorkshopProvider } from './workshop';
import { AddonModWorkshopSyncProvider } from './sync';
import { AddonModWorkshopHelperProvider } from './helper';

/**
 * Handler to prefetch workshops.
 */
@Injectable()
export class AddonModWorkshopPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModWorkshop';
    modName = 'workshop';
    component = AddonModWorkshopProvider.COMPONENT;
    updatesNames = new RegExp('^configuration$|^.*files$|^completion|^gradeitems$|^outcomes$|^submissions$|^assessments$' +
            '|^assessmentgrades$|^usersubmissions$|^userassessments$|^userassessmentgrades$|^userassessmentgrades$');

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            private groupsProvider: CoreGroupsProvider,
            private userProvider: CoreUserProvider,
            private workshopProvider: AddonModWorkshopProvider,
            private workshopHelper: AddonModWorkshopHelperProvider,
            private syncProvider: AddonModWorkshopSyncProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any[]>} Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean): Promise<any[]> {
        return this.getWorkshopInfoHelper(module, courseId, true).then((info) => {
            return info.files;
        });
    }

    /**
     * Helper function to get all workshop info just once.
     *
     * @param  {any}     module              Module to get the files.
     * @param  {number}  courseId            Course ID the module belongs to.
     * @param  {boolean} [omitFail=false]    True to always return even if fails. Default false.
     * @param  {boolean} [forceCache=false]  True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any>}                Promise resolved with the info fetched.
     */
    protected getWorkshopInfoHelper(module: any, courseId: number, omitFail: boolean = false, forceCache: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        let workshop,
            groups = [],
            files = [],
            access;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const userId = site.getUserId();

            return this.workshopProvider.getWorkshop(courseId, module.id, siteId, forceCache).then((data) => {
                files = this.getIntroFilesFromInstance(module, data);
                files = files.concat(data.instructauthorsfiles).concat(data.instructreviewersfiles);
                workshop = data;

                return this.workshopProvider.getWorkshopAccessInformation(workshop.id, false, true, siteId).then((accessData) => {
                    access = accessData;
                    if (access.canviewallsubmissions) {
                        return this.groupsProvider.getActivityGroupInfo(module.id, false, undefined, siteId).then((groupInfo) => {
                            if (!groupInfo.groups || groupInfo.groups.length == 0) {
                                groupInfo.groups = [{id: 0}];
                            }
                            groups = groupInfo.groups;
                        });
                    }
                });
            }).then(() => {
                return this.workshopProvider.getUserPlanPhases(workshop.id, false, true, siteId).then((phases) => {
                    // Get submission phase info.
                    const submissionPhase = phases[AddonModWorkshopProvider.PHASE_SUBMISSION],
                        canSubmit = this.workshopHelper.canSubmit(workshop, access, submissionPhase.tasks),
                        canAssess = this.workshopHelper.canAssess(workshop, access),
                        promises = [];

                    if (canSubmit) {
                        promises.push(this.workshopHelper.getUserSubmission(workshop.id, userId).then((submission) => {
                            if (submission) {
                                files = files.concat(submission.contentfiles).concat(submission.attachmentfiles);
                            }
                        }));
                    }

                    if (access.canviewallsubmissions && workshop.phase >= AddonModWorkshopProvider.PHASE_SUBMISSION) {
                        promises.push(this.workshopProvider.getSubmissions(workshop.id).then((submissions) => {
                            const promises2 = [];
                            submissions.forEach((submission) => {
                                files = files.concat(submission.contentfiles).concat(submission.attachmentfiles);
                                promises2.push(this.workshopProvider.getSubmissionAssessments(workshop.id, submission.id)
                                        .then((assessments) => {
                                    assessments.forEach((assessment) => {
                                        files = files.concat(assessment.feedbackattachmentfiles)
                                                .concat(assessment.feedbackcontentfiles);
                                    });
                                }));
                            });

                            return Promise.all(promises2);
                        }));
                    }

                    // Get assessment files.
                    if (workshop.phase >= AddonModWorkshopProvider.PHASE_ASSESSMENT && canAssess) {
                        promises.push(this.workshopHelper.getReviewerAssessments(workshop.id).then((assessments) => {
                            assessments.forEach((assessment) => {
                                files = files.concat(assessment.feedbackattachmentfiles).concat(assessment.feedbackcontentfiles);
                            });
                        }));
                    }

                    return Promise.all(promises);
                });
            });
        }).then(() => {
            return {
                workshop: workshop,
                groups: groups,
                files: files.filter((file) => typeof file !== 'undefined')
            };
        }).catch((message): any => {
            if (omitFail) {
                // Any error, return the info we have.
                return {
                    workshop: workshop,
                    groups: groups,
                    files: files.filter((file) => typeof file !== 'undefined')
                };
            }

            return Promise.reject(message);
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.workshopProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param  {any} module Module.
     * @param  {number} courseId Course ID the module belongs to.
     * @return {boolean|Promise<boolean>} Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        return this.workshopProvider.getWorkshop(courseId, module.id, undefined, true).then((workshop) => {
            return this.workshopProvider.getWorkshopAccessInformation(workshop.id).then((accessData) => {
                // Check if workshop is setup by phase.
                return accessData.canswitchphase || workshop.phase > AddonModWorkshopProvider.PHASE_SETUP;
            });
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.workshopProvider.isPluginEnabled();
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchWorkshop.bind(this));
    }

    /**
     * Retrieves all the grades reports for all the groups and then returns only unique grades.
     *
     * @param  {number}  workshopId Workshop ID.
     * @param  {any[]}   groups     Array of groups in the activity.
     * @param  {string}  siteId     Site ID. If not defined, current site.
     * @return {Promise<any[]>}       All unique entries.
     */
    protected getAllGradesReport(workshopId: number, groups: any[], siteId: string): Promise<any[]> {
        const promises = [];

        groups.forEach((group) => {
            promises.push(this.workshopProvider.fetchAllGradeReports(
                    workshopId, group.id, undefined, false, false, siteId));
        });

        return Promise.all(promises).then((grades) => {
            const uniqueGrades = {};

            grades.forEach((groupGrades) => {
                groupGrades.forEach((grade) => {
                    if (grade.submissionid) {
                        uniqueGrades[grade.submissionid] = grade;
                    }
                });
            });

            return this.utils.objectToArray(uniqueGrades);
        });
    }

    /**
     * Prefetch a workshop.
     *
     * @param  {any}     module   The module object returned by WS.
     * @param  {number}  courseId Course ID the module belongs to.
     * @param  {boolean} single   True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {string}  siteId   Site ID.
     * @return {Promise<any>}     Promise resolved when done.
     */
    protected prefetchWorkshop(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        const userIds = [];

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            const currentUserId = site.getUserId();

             // Prefetch the workshop data.
            return this.getWorkshopInfoHelper(module, courseId, false, false, true, siteId).then((info) => {
                const workshop = info.workshop,
                    promises = [],
                    assessments = [];

                promises.push(this.filepoolProvider.addFilesToQueue(siteId, info.files, this.component, module.id));
                promises.push(this.workshopProvider.getWorkshopAccessInformation(workshop.id, false, true, siteId)
                        .then((access) => {
                    return this.workshopProvider.getUserPlanPhases(workshop.id, false, true, siteId).then((phases) => {

                        // Get submission phase info.
                        const submissionPhase = phases[AddonModWorkshopProvider.PHASE_SUBMISSION],
                            canSubmit = this.workshopHelper.canSubmit(workshop, access, submissionPhase.tasks),
                            canAssess = this.workshopHelper.canAssess(workshop, access),
                            promises2 = [];

                        if (canSubmit) {
                            promises2.push(this.workshopProvider.getSubmissions(workshop.id));
                            // Add userId to the profiles to prefetch.
                            userIds.push(currentUserId);
                        }

                        let reportPromise = Promise.resolve();
                        if (access.canviewallsubmissions && workshop.phase >= AddonModWorkshopProvider.PHASE_SUBMISSION) {
                            reportPromise = this.getAllGradesReport(workshop.id, info.groups, siteId)
                                    .then((grades) => {
                                grades.forEach((grade) => {
                                    userIds.push(grade.userid);
                                    userIds.push(grade.gradeoverby);

                                    grade.reviewedby && grade.reviewedby.forEach((assessment) => {
                                        userIds.push(assessment.userid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.assessmentid] = assessment;
                                    });

                                    grade.reviewerof && grade.reviewerof.forEach((assessment) => {
                                        userIds.push(assessment.userid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.assessmentid] = assessment;
                                    });
                                });
                            });
                        }

                        if (workshop.phase >= AddonModWorkshopProvider.PHASE_ASSESSMENT && canAssess) {
                            // Wait the report promise to finish to override assessments array if needed.
                            reportPromise = reportPromise.finally(() => {
                                return this.workshopHelper.getReviewerAssessments(workshop.id, currentUserId, undefined,
                                        undefined, siteId).then((revAssessments) => {

                                    const promises = [];
                                    let files = []; // Files in each submission.

                                    revAssessments.forEach((assessment) => {
                                        if (assessment.submission.authorid == currentUserId) {
                                            promises.push(this.workshopProvider.getAssessment(workshop.id, assessment.id));
                                        }
                                        userIds.push(assessment.reviewerid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.id] = assessment;

                                        files = files.concat(assessment.submission.attachmentfiles || [])
                                                    .concat(assessment.submission.contentfiles || []);
                                    });

                                    promises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

                                    return Promise.all(promises);
                                });
                            });
                        }

                        reportPromise = reportPromise.finally(() => {
                            if (assessments.length > 0) {
                                return Promise.all(assessments.map((assessment, id) => {
                                    return this.workshopProvider.getAssessmentForm(workshop.id, id, undefined, undefined, undefined,
                                        siteId);
                                }));
                            }
                        });
                        promises2.push(reportPromise);

                        if (workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED) {
                            promises2.push(this.workshopProvider.getGrades(workshop.id));
                            if (access.canviewpublishedsubmissions) {
                                promises2.push(this.workshopProvider.getSubmissions(workshop.id));
                            }
                        }

                        return Promise.all(promises2);
                    });
                }));
                // Add Basic Info to manage links.
                promises.push(this.courseProvider.getModuleBasicInfoByInstance(workshop.id, 'workshop', siteId));
                promises.push(this.courseProvider.getModuleBasicGradeInfo(module.id, siteId));

                return Promise.all(promises);
            });
        }).then(() => {
            // Prefetch user profiles.
            return this.userProvider.prefetchProfiles(userIds, courseId, siteId).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Sync a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    sync(module: any, courseId: number, siteId?: any): Promise<any> {
        return this.syncProvider.syncWorkshop(module.instance, siteId);
    }
}
