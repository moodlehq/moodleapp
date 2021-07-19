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

import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreWSFile } from '@services/ws';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseWSModule } from '../services/course';
import { CoreCourseModulePrefetchHandlerBase } from './module-prefetch-handler';

/**
 * Base prefetch handler to be registered in CoreCourseModulePrefetchDelegate. It is useful to minimize the amount of
 * functions that handlers need to implement. It also provides some helper features like preventing a module to be
 * downloaded twice at the same time.
 *
 * If your handler inherits from this service, you just need to override the functions that you want to change.
 *
 * This class should be used for RESOURCES whose main purpose is downloading files present in module.contents.
 */
export class CoreCourseResourcePrefetchHandlerBase extends CoreCourseModulePrefetchHandlerBase {

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when all content is downloaded.
     */
    download(module: CoreCourseWSModule, courseId: number, dirPath?: string): Promise<void> {
        return this.downloadOrPrefetch(module, courseId, false, dirPath);
    }

    /**
     * Download or prefetch the content.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files. This is to keep the files
     *                relative paths and make the package work in an iframe. Undefined to download the files
     *                in the filepool root folder.
     * @return Promise resolved when all content is downloaded.
     */
    async downloadOrPrefetch(module: CoreCourseWSModule, courseId: number, prefetch?: boolean, dirPath?: string): Promise<void> {
        if (!CoreApp.isOnline()) {
            // Cannot download in offline.
            throw new CoreNetworkError();
        }

        const siteId = CoreSites.getCurrentSiteId();

        if (this.isDownloading(module.id, siteId)) {
            // There's already a download ongoing for this module, return the promise.
            return this.getOngoingDownload(module.id, siteId);
        }

        // Get module info to be able to handle links.
        const prefetchPromise = this.performDownloadOrPrefetch(siteId, module, courseId, !!prefetch, dirPath);

        return this.addOngoingDownload(module.id, prefetchPromise, siteId);
    }

    /**
     * Download or prefetch the content.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when all content is downloaded.
     */
    protected async performDownloadOrPrefetch(
        siteId: string,
        module: CoreCourseWSModule,
        courseId: number,
        prefetch: boolean,
        dirPath?: string,
    ): Promise<void> {
        // Get module info to be able to handle links.
        await CoreCourse.getModuleBasicInfo(module.id, siteId);

        // Load module contents (ignore cache so we always have the latest data).
        await this.loadContents(module, courseId, true);

        // Get the intro files.
        const introFiles = await this.getIntroFiles(module, courseId, true);

        const contentFiles = this.getContentDownloadableFiles(module);
        const promises: Promise<unknown>[] = [];

        if (dirPath) {
            // Download intro files in filepool root folder.
            promises.push(
                CoreFilepool.downloadOrPrefetchFiles(siteId, introFiles, prefetch, false, this.component, module.id),
            );

            // Download content files inside dirPath.
            promises.push(CoreFilepool.downloadOrPrefetchPackage(
                siteId,
                contentFiles,
                prefetch,
                this.component,
                module.id,
                undefined,
                dirPath,
            ));
        } else {
            // No dirPath, download everything in filepool root folder.
            promises.push(CoreFilepool.downloadOrPrefetchPackage(
                siteId,
                introFiles.concat(contentFiles),
                prefetch,
                this.component,
                module.id,
            ));
        }

        promises.push(CoreFilterHelper.getFilters('module', module.id, { courseId }));

        await Promise.all(promises);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the list of files.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getFiles(module: CoreCourseWSModule, courseId: number, single?: boolean): Promise<CoreWSFile[]> {
        // Load module contents if needed.
        await this.loadContents(module, courseId);

        const files = await this.getIntroFiles(module, courseId);

        return files.concat(this.getContentDownloadableFiles(module));
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        await Promise.all([
            CoreCourse.invalidateModule(moduleId),
            CoreFilepool.invalidateFilesByComponent(siteId, this.component, moduleId),
        ]);
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param module Module to load the contents.
     * @param courseId The course ID. Recommended to speed up the process and minimize data usage.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise resolved when loaded.
     */
    loadContents(module: CoreCourseAnyModuleData, courseId: number, ignoreCache?: boolean): Promise<void> {
        return CoreCourse.loadModuleContents(module, courseId, undefined, false, ignoreCache);
    }

    /**
     * Prefetch a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when done.
     */
    prefetch(module: CoreCourseWSModule, courseId: number, single?: boolean, dirPath?: string): Promise<void> {
        return this.downloadOrPrefetch(module, courseId, true, dirPath);
    }

}
