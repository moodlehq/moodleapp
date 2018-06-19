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
import { AddonModFeedbackProvider } from './feedback';
import { AddonModFeedbackHelperProvider } from './helper';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Handler to prefetch feedbacks.
 */
@Injectable()
export class AddonModFeedbackPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModFeedback';
    modName = 'feedback';
    component = AddonModFeedbackProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^attemptsfinished|^attemptsunfinished$/;

    constructor(translate: TranslateService, appProvider: CoreAppProvider, utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider, filepoolProvider: CoreFilepoolProvider, sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider, protected feedbackProvider: AddonModFeedbackProvider,
            protected userProvider: CoreUserProvider, protected feedbackHelper: AddonModFeedbackHelperProvider,
            protected timeUtils: CoreTimeUtilsProvider, protected groupsProvider: CoreGroupsProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Get the list of downloadable files.
     *
     * @param  {any} module       Module to get the files.
     * @param  {number} courseId  Course ID the module belongs to.
     * @param  {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any>}     Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean): Promise<any[]> {
        let files = [];

        return this.feedbackProvider.getFeedback(courseId, module.id).then((feedback) => {

            // Get intro files and page after submit files.
            files = feedback.pageaftersubmitfiles || [];
            files = files.concat(this.getIntroFilesFromInstance(module, feedback));

            return this.feedbackProvider.getItems(feedback.id);
        }).then((response) => {
            response.items.forEach((item) => {
                files = files.concat(item.itemfiles);
            });

            return files;
        }).catch(() => {
            // Any error, return the list we have.
            return files;
        });
    }

    /**
     * Returns feedback intro files.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @return {Promise<any[]>} Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number): Promise<any[]> {
        return this.feedbackProvider.getFeedback(courseId, module.id).catch(() => {
            // Not found, return undefined so module description is used.
        }).then((feedback) => {
            return this.getIntroFilesFromInstance(module, feedback);
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.feedbackProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        return this.feedbackProvider.invalidateFeedbackData(courseId);
    }

    /**
     * Check if a feedback is downloadable.
     * A feedback isn't downloadable if it's not open yet.
     * Closed feedback are downloadable because teachers can always see the results.
     *
     * @param {any} module    Module to check.
     * @param {number} courseId  Course ID the module belongs to.
     * @return {Promise<any>}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        return this.feedbackProvider.getFeedback(courseId, module.id, undefined, true).then((feedback) => {
            const now = this.timeUtils.timestamp();

            // Check time first if available.
            if (feedback.timeopen && feedback.timeopen > now) {
                return false;
            }
            if (feedback.timeclose && feedback.timeclose < now) {
                return false;
            }

            return this.feedbackProvider.getFeedbackAccessInformation(feedback.id).then((accessData) => {
                return accessData.isopen;
            });
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.feedbackProvider.isPluginEnabled();
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
        return this.prefetchPackage(module, courseId, single, this.prefetchFeedback.bind(this));
    }

    /**
     * Prefetch a feedback.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {String} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchFeedback(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        // Prefetch the feedback data.
        return this.feedbackProvider.getFeedback(courseId, module.id).then((feedback) => {
            const p1 = [];

            p1.push(this.getFiles(module, courseId).then((files) => {
                return this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id);
            }));

            p1.push(this.feedbackProvider.getFeedbackAccessInformation(feedback.id, false, true, siteId).then((accessData) => {
                const p2 = [];
                if (accessData.canedititems || accessData.canviewreports) {
                    // Get all groups analysis.
                    p2.push(this.feedbackProvider.getAnalysis(feedback.id, undefined, siteId));
                    p2.push(this.groupsProvider.getActivityGroupInfo(feedback.coursemodule, true, undefined, siteId)
                            .then((groupInfo) => {
                        const p3 = [],
                            userIds = [];

                        if (!groupInfo.groups || groupInfo.groups.length == 0) {
                            groupInfo.groups = [{id: 0}];
                        }
                        groupInfo.groups.forEach((group) => {
                            p3.push(this.feedbackProvider.getAnalysis(feedback.id, group.id, siteId));
                            p3.push(this.feedbackProvider.getAllResponsesAnalysis(feedback.id, group.id, siteId)
                                    .then((responses) => {
                                responses.attempts.forEach((attempt) => {
                                    userIds.push(attempt.userid);
                                });
                            }));

                            if (!accessData.isanonymous) {
                                p3.push(this.feedbackProvider.getAllNonRespondents(feedback.id, group.id, siteId)
                                        .then((responses) => {
                                    responses.users.forEach((user) => {
                                        userIds.push(user.userid);
                                    });
                                }));
                            }
                        });

                        return Promise.all(p3).then(() => {
                            // Prefetch user profiles.
                            return this.userProvider.prefetchProfiles(userIds, courseId, siteId);
                        });
                    }));
                }

                p2.push(this.feedbackProvider.getItems(feedback.id, siteId));

                if (accessData.cancomplete && accessData.cansubmit && !accessData.isempty) {
                    // Send empty data, so it will recover last completed feedback attempt values.
                    p2.push(this.feedbackProvider.processPageOnline(feedback.id, 0, {}, undefined, siteId).finally(() => {
                        const p4 = [];

                        p4.push(this.feedbackProvider.getCurrentValues(feedback.id, false, true, siteId));
                        p4.push(this.feedbackProvider.getResumePage(feedback.id, false, true, siteId));

                        return Promise.all(p4);
                    }));
                }

                return Promise.all(p2);
            }));

            return Promise.all(p1);
        });
    }
}
