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
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreFilepool } from '@services/filepool';
import { CoreGroups } from '@services/groups';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import {
    AddonModFeedback,
    AddonModFeedbackGetFeedbackAccessInformationWSResponse,
    AddonModFeedbackProvider,
    AddonModFeedbackWSFeedback,
} from '../feedback';
import { AddonModFeedbackSync, AddonModFeedbackSyncResult } from '../feedback-sync';

/**
 * Handler to prefetch feedbacks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModFeedback';
    modName = 'feedback';
    component = AddonModFeedbackProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^attemptsfinished|^attemptsunfinished$/;

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        let files: CoreWSFile[] = [];

        const feedback = await AddonModFeedback.getFeedback(courseId, module.id);

        // Get intro files and page after submit files.
        files = feedback.pageaftersubmitfiles || [];
        files = files.concat(this.getIntroFilesFromInstance(module, feedback));

        try {
            const response = await AddonModFeedback.getItems(feedback.id);

            response.items.forEach((item) => {
                files = files.concat(item.itemfiles);
            });
        } catch (e) {
            // Ignore errors.
        }

        return files;
    }

    /**
     * @inheritdoc
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const feedback = await CoreUtils.ignoreErrors(AddonModFeedback.getFeedback(courseId, module.id));

        return this.getIntroFilesFromInstance(module, feedback);
    }

    /**
     * @inheritdoc
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModFeedback.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return AddonModFeedback.invalidateFeedbackData(courseId);
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const feedback = await AddonModFeedback.getFeedback(courseId, module.id);

        const now = CoreTimeUtils.timestamp();

        // Check time first if available.
        if (feedback.timeopen && feedback.timeopen > now) {
            return false;
        }
        if (feedback.timeclose && feedback.timeclose < now) {
            return false;
        }

        const accessData = await AddonModFeedback.getFeedbackAccessInformation(feedback.id, { cmId: module.id });

        return accessData.isopen;
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchFeedback(module, courseId, siteId));
    }

    /**
     * Prefetch a feedback.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchFeedback(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        // Prefetch the feedback data.
        const feedback = await AddonModFeedback.getFeedback(courseId, module.id, commonOptions);

        let files: CoreWSFile[] = feedback.pageaftersubmitfiles || [];
        files = files.concat(this.getIntroFilesFromInstance(module, feedback));

        const accessData = await AddonModFeedback.getFeedbackAccessInformation(feedback.id, modOptions);

        const promises: Promise<unknown>[] = [];

        if (accessData.canedititems || accessData.canviewreports) {
            // Get all groups analysis.
            promises.push(AddonModFeedback.getAnalysis(feedback.id, modOptions));
            promises.push(this.prefetchAllGroupsAnalysis(feedback, accessData, modOptions));
        }

        promises.push(AddonModFeedback.getItems(feedback.id, commonOptions).then((response) => {
            response.items.forEach((item) => {
                files = files.concat(item.itemfiles);
            });

            return CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id);
        }));

        if (accessData.cancomplete && accessData.cansubmit && !accessData.isempty) {
            // Send empty data, so it will recover last completed feedback attempt values.
            promises.push(AddonModFeedback.processPageOnline(feedback.id, 0, {}, false, siteId).then(() => Promise.all([
                AddonModFeedback.getCurrentValues(feedback.id, modOptions),
                AddonModFeedback.getResumePage(feedback.id, modOptions),
            ])));
        }

        await Promise.all(promises);
    }

    /**
     * Prefetch all groups analysis.
     *
     * @param feedback Feedback.
     * @param accessData Access info.
     * @param modOptions Options.
     */
    protected async prefetchAllGroupsAnalysis(
        feedback: AddonModFeedbackWSFeedback,
        accessData: AddonModFeedbackGetFeedbackAccessInformationWSResponse,
        modOptions: CoreCourseCommonModWSOptions,
    ): Promise<void> {
        const groupInfo = await CoreGroups.getActivityGroupInfo(feedback.coursemodule, true, undefined, modOptions.siteId, true);

        const promises: Promise<unknown>[] = [];

        if (!groupInfo.groups || groupInfo.groups.length == 0) {
            groupInfo.groups = [{ id: 0, name: '' }];
        }

        groupInfo.groups.forEach((group) => {
            const groupOptions = {
                groupId: group.id,
                ...modOptions, // Include all mod options.
            };

            promises.push(AddonModFeedback.getAnalysis(feedback.id, groupOptions));
            promises.push(AddonModFeedback.getAllResponsesAnalysis(feedback.id, groupOptions));

            if (!accessData.isanonymous) {
                promises.push(AddonModFeedback.getAllNonRespondents(feedback.id, groupOptions));
            }
        });

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModFeedbackSyncResult> {
        return AddonModFeedbackSync.syncFeedback(module.instance, siteId);
    }

}

export const AddonModFeedbackPrefetchHandler = makeSingleton(AddonModFeedbackPrefetchHandlerService);
