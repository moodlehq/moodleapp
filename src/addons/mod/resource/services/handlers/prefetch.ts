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
import { CoreCourseResourcePrefetchHandlerBase } from '@features/course/classes/resource-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonModResource } from '../resource';
import { AddonModResourceHelper } from '../resource-helper';
import { ADDON_MOD_RESOURCE_COMPONENT, ADDON_MOD_RESOURCE_COMPONENT_LEGACY, ADDON_MOD_RESOURCE_MODNAME } from '../../constants';

/**
 * Handler to prefetch resources.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourcePrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = ADDON_MOD_RESOURCE_COMPONENT;
    modName = ADDON_MOD_RESOURCE_MODNAME;
    component = ADDON_MOD_RESOURCE_COMPONENT_LEGACY;

    /**
     * @inheritdoc
     */
    determineStatus(module: CoreCourseAnyModuleData, status: DownloadStatus): DownloadStatus {
        if (status === DownloadStatus.DOWNLOADED && module) {
            // If the main file is an external file, always display the module as outdated.
            if ('contentsinfo' in module && module.contentsinfo) {
                if (module.contentsinfo.repositorytype) {
                    // It's an external file.
                    return DownloadStatus.OUTDATED;
                }
            } else if (module.contents) {
                const mainFile = module.contents[0];
                if (mainFile && mainFile.isexternalfile) {
                    return DownloadStatus.OUTDATED;
                }
            }
        }

        return status;
    }

    /**
     * @inheritdoc
     */
    async downloadOrPrefetch(module: CoreCourseModuleData, courseId: number, prefetch?: boolean): Promise<void> {
        let dirPath: string | undefined;

        if (AddonModResourceHelper.isDisplayedInIframe(module) && module.url !== undefined) {
            dirPath = await CoreFilepool.getPackageDirPathByUrl(CoreSites.getCurrentSiteId(), module.url);
        }

        const promises: Promise<unknown>[] = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch, dirPath));
        promises.push(AddonModResource.getResourceData(courseId, module.id));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModResource.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModResource.invalidateResourceData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id, undefined, this.modName));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        if (CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.7')) {
            // Nextcloud files are downloadable from 3.7 onwards.
            return true;
        }

        // Don't allow downloading Nextcloud files in older sites.
        await this.loadContents(module, courseId, false);

        return !AddonModResourceHelper.isNextcloudFile(module);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonModResource.isPluginEnabled();
    }

}
export const AddonModResourcePrefetchHandler = makeSingleton(AddonModResourcePrefetchHandlerService);
