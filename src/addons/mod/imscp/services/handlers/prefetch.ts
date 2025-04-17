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
import { CoreCourseResourcePrefetchHandlerBase } from '@features/course/classes/resource-prefetch-handler';
import {
    CoreCourse,
    CoreCourseAnyModuleData,
    CoreCourseModuleContentFile,
} from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModImscp } from '../imscp';
import { ADDON_MOD_IMSCP_COMPONENT } from '../../constants';

/**
 * Handler to prefetch IMSCPs.
 */
@Injectable( { providedIn: 'root' })
export class AddonModImscpPrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModImscp';
    modName = 'imscp';
    component = ADDON_MOD_IMSCP_COMPONENT;

    /**
     * @inheritdoc
     */
    async downloadOrPrefetch(module: CoreCourseModuleData, courseId: number, prefetch?: boolean): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        const dirPath = await CoreFilepool.getPackageDirPathByUrl(siteId, module.url!);
        const promises: Promise<unknown>[] = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch, dirPath));
        promises.push(AddonModImscp.getImscp(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        }));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        // If not found, use undefined so module description is used.
        const imscp = await CorePromiseUtils.ignoreErrors(AddonModImscp.getImscp(courseId, module.id));

        return this.getIntroFilesFromInstance(module, imscp);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModImscp.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModImscp.invalidateImscpData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModImscp.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    isFileDownloadable(file: CoreCourseModuleContentFile): boolean {
        return AddonModImscp.isFileDownloadable(file);
    }

}
export const AddonModImscpPrefetchHandler = makeSingleton(AddonModImscpPrefetchHandlerService);
