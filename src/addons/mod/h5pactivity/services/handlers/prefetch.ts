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
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreH5PHelper } from '@features/h5p/classes/helper';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreUser } from '@features/user/services/user';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModH5PActivity, AddonModH5PActivityData, AddonModH5PActivityProvider } from '../h5pactivity';

/**
 * Handler to prefetch h5p activity.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivityPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModH5PActivity';
    modName = 'h5pactivity';
    component = AddonModH5PActivityProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^tracks$|^usertracks$/;

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {

        const h5pActivity = await AddonModH5PActivity.getH5PActivity(courseId, module.id);

        const displayOptions = CoreH5PHelper.decodeDisplayOptions(h5pActivity.displayoptions);

        const deployedFile = await AddonModH5PActivity.getDeployedFile(h5pActivity, {
            displayOptions,
        });

        return [deployedFile].concat(this.getIntroFilesFromInstance(module, h5pActivity));
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(): Promise<void> {
        // No need to invalidate anything.
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(): Promise<boolean> {
        return !!CoreSites.getCurrentSite()?.canDownloadFiles() && !CoreH5P.isOfflineDisabledInSite();
    }

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModH5PActivity.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, this.prefetchActivity.bind(this, module, courseId));
    }

    /**
     * Prefetch an H5P activity.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected async prefetchActivity(
        module: CoreCourseAnyModuleData,
        courseId: number,
        siteId: string,
    ): Promise<void> {
        const h5pActivity = await AddonModH5PActivity.getH5PActivity(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        });

        const introFiles = this.getIntroFilesFromInstance(module, h5pActivity);

        await Promise.all([
            this.prefetchWSData(h5pActivity, siteId),
            CoreFilepool.addFilesToQueue(siteId, introFiles, AddonModH5PActivityProvider.COMPONENT, module.id),
            this.prefetchMainFile(module, h5pActivity, siteId),
        ]);
    }

    /**
     * Prefetch the deployed file of the activity.
     *
     * @param module Module.
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchMainFile(
        module: CoreCourseAnyModuleData,
        h5pActivity: AddonModH5PActivityData,
        siteId: string,
    ): Promise<void> {

        const displayOptions = CoreH5PHelper.decodeDisplayOptions(h5pActivity.displayoptions);

        const deployedFile = await AddonModH5PActivity.getDeployedFile(h5pActivity, {
            displayOptions: displayOptions,
            ignoreCache: true,
            siteId: siteId,
        });

        await CoreFilepool.addFilesToQueue(siteId, [deployedFile], AddonModH5PActivityProvider.COMPONENT, module.id);
    }

    /**
     * Prefetch all the WebService data.
     *
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchWSData(h5pActivity: AddonModH5PActivityData, siteId: string): Promise<void> {

        const accessInfo = await AddonModH5PActivity.getAccessInformation(h5pActivity.id, {
            cmId: h5pActivity.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        if (!accessInfo.canreviewattempts) {
            // Not a teacher, prefetch user attempts and the current user profile.
            const site = await CoreSites.getSite(siteId);

            const options = {
                cmId: h5pActivity.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId: siteId,
            };

            await Promise.all([
                AddonModH5PActivity.getAllAttemptsResults(h5pActivity.id, options),
                CoreUser.prefetchProfiles([site.getUserId()], h5pActivity.course, siteId),
            ]);
        }
    }

}

export const AddonModH5PActivityPrefetchHandler = makeSingleton(AddonModH5PActivityPrefetchHandlerService);
