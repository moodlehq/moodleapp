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

import { DownloadStatus } from '@/core/constants';
import { Injectable } from '@angular/core';

import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreH5PHelper } from '@features/h5p/classes/helper';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreUser } from '@features/user/services/user';
import { CoreXAPIOffline } from '@features/xapi/services/offline';
import { CoreXAPI } from '@features/xapi/services/xapi';
import { CoreFileHelper } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import {
    AddonModH5PActivity,
    AddonModH5PActivityAccessInfo,
    AddonModH5PActivityData,
} from '../h5pactivity';
import {
    ADDON_MOD_H5PACTIVITY_COMPONENT,
    ADDON_MOD_H5PACTIVITY_STATE_ID,
    ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT,
} from '../../constants';

/**
 * Handler to prefetch h5p activity.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivityPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModH5PActivity';
    modName = 'h5pactivity';
    component = ADDON_MOD_H5PACTIVITY_COMPONENT;
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
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchActivity(module, courseId, siteId));
    }

    /**
     * Prefetch an H5P activity.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
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
            CoreFilepool.addFilesToQueue(siteId, introFiles, ADDON_MOD_H5PACTIVITY_COMPONENT, module.id),
            this.prefetchMainFile(module, h5pActivity, siteId),
            CoreH5P.getCustomCssSrc(siteId),
        ]);
    }

    /**
     * Prefetch the deployed file of the activity.
     *
     * @param module Module.
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
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

        if (AddonModH5PActivity.isSaveStateEnabled(h5pActivity)) {
            // If the file needs to be downloaded, delete the states because it means the package has changed or user deleted it.
            const fileState = await CoreFilepool.getFileStateByUrl(siteId, CoreFileHelper.getFileUrl(deployedFile));

            if (fileState !== DownloadStatus.DOWNLOADED) {
                await CoreUtils.ignoreErrors(CoreXAPIOffline.deleteStates(ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT, {
                    itemId: h5pActivity.context,
                    siteId,
                }));
            }
        }

        await CoreFilepool.addFilesToQueue(siteId, [deployedFile], ADDON_MOD_H5PACTIVITY_COMPONENT, module.id);
    }

    /**
     * Prefetch all the WebService data.
     *
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchWSData(h5pActivity: AddonModH5PActivityData, siteId: string): Promise<void> {
        const accessInfo = await AddonModH5PActivity.getAccessInformation(h5pActivity.id, {
            cmId: h5pActivity.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        await Promise.all([
            this.prefetchAttempts(h5pActivity, accessInfo, siteId),
            this.prefetchState(h5pActivity, accessInfo, siteId),
        ]);
    }

    /**
     * Prefetch attempts.
     *
     * @param h5pActivity Activity instance.
     * @param accessInfo Access info.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchAttempts(
        h5pActivity: AddonModH5PActivityData,
        accessInfo: AddonModH5PActivityAccessInfo,
        siteId: string,
    ): Promise<void> {
        const options = {
            cmId: h5pActivity.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId: siteId,
        };

        if (!accessInfo.canreviewattempts) {
            if (!h5pActivity.enabletracking) {
                return;
            }

            // Not a teacher, prefetch user attempts and the current user profile.
            const site = await CoreSites.getSite(siteId);

            await Promise.all([
                AddonModH5PActivity.getAllAttemptsResults(h5pActivity.id, options),
                CoreUser.prefetchProfiles([site.getUserId()], h5pActivity.course, siteId),
            ]);
        } else {
            // It's a teacher, get all attempts if possible.
            const canGetUsers = await AddonModH5PActivity.canGetUsersAttempts(siteId);
            if (!canGetUsers) {
                return;
            }

            const users = await AddonModH5PActivity.getAllUsersAttempts(h5pActivity.id, options);

            const userIds = users.map(user => user.userid);
            await CoreUser.prefetchProfiles(userIds, h5pActivity.course, siteId);
        }
    }

    /**
     * Prefetch state.
     *
     * @param h5pActivity Activity instance.
     * @param accessInfo Access info.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchState(
        h5pActivity: AddonModH5PActivityData,
        accessInfo: AddonModH5PActivityAccessInfo,
        siteId: string,
    ): Promise<void> {
        if (!AddonModH5PActivity.isSaveStateEnabled(h5pActivity, accessInfo)) {
            return;
        }

        await CoreXAPI.getStateFromServer(
            ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT,
            h5pActivity.context,
            ADDON_MOD_H5PACTIVITY_STATE_ID,
            {
                appComponent: ADDON_MOD_H5PACTIVITY_COMPONENT,
                appComponentId: h5pActivity.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            },
        );
    }

}

export const AddonModH5PActivityPrefetchHandler = makeSingleton(AddonModH5PActivityPrefetchHandlerService);
