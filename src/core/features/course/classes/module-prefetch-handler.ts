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

import { CoreFilepool } from '@services/filepool';
import { CoreFileSizeSum, CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreWSFile } from '@services/ws';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseModuleContentFile } from '../services/course';
import { CoreCourseModulePrefetchHandler } from '../services/module-prefetch-delegate';

/**
 * Base prefetch handler to be registered in CoreCourseModulePrefetchDelegate. Prefetch handlers should inherit either
 * from CoreCourseModuleActivityPrefetchHandlerBase or CoreCourseModuleResourcePrefetchHandlerBase, depending on whether
 * they are an activity or a resource. It's not recommended to inherit from this class directly.
 */
export class CoreCourseModulePrefetchHandlerBase implements CoreCourseModulePrefetchHandler {

    /**
     * Name of the handler.
     */
    name = 'CoreCourseModulePrefetchHandler';

    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     */
    modName = 'default';

    /**
     * The handler's component.
     */
    component = 'core_module';

    /**
     * The RegExp to check updates. If a module has an update whose name matches this RegExp, the module will be marked
     * as outdated. This RegExp is ignored if hasUpdates function is defined.
     */
    updatesNames = /^.*files$/;

    /**
     * List of download promises to prevent downloading the module twice at the same time.
     */
    protected downloadPromises: { [s: string]: { [s: string]: Promise<void> } } = {};

    /**
     * Add an ongoing download to the downloadPromises list. When the promise finishes it will be removed.
     *
     * @param id Unique identifier per component.
     * @param promise Promise to add.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise of the current download.
     */
    async addOngoingDownload(id: number, promise: Promise<void>, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const uniqueId = this.getUniqueId(id);

        if (!this.downloadPromises[siteId]) {
            this.downloadPromises[siteId] = {};
        }

        this.downloadPromises[siteId][uniqueId] = promise;

        try {
            return await this.downloadPromises[siteId][uniqueId];
        } finally {
            delete this.downloadPromises[siteId][uniqueId];
        }
    }

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when all content is downloaded.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async download(module: CoreCourseAnyModuleData, courseId: number, dirPath?: string): Promise<void> {
        // To be overridden.
        return;
    }

    /**
     * Returns a list of content files that can be downloaded.
     *
     * @param module The module object returned by WS.
     * @returns List of files.
     */
    getContentDownloadableFiles(module: CoreCourseAnyModuleData): CoreCourseModuleContentFile[] {
        if (!module.contents?.length) {
            return [];
        }

        return module.contents.filter((content) => this.isFileDownloadable(content));
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved with the size.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getDownloadSize(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreFileSizeSum> {
        try {
            const files = await this.getFiles(module, courseId);

            return await CorePluginFileDelegate.getFilesDownloadSize(files);
        } catch {
            return { size: -1, total: false };
        }
    }

    /**
     * Get the downloaded size of a module. If not defined, we'll use getFiles to calculate it (it can be slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Size, or promise resolved with the size.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getDownloadedSize(module: CoreCourseAnyModuleData, courseId: number): Promise<number> {
        const siteId = CoreSites.getCurrentSiteId();

        return CoreFilepool.getFilesSizeByComponent(siteId, this.component, module.id);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved with the list of files.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getFiles(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreWSFile[]> {
        // To be overridden.
        return [];
    }

    /**
     * Returns module intro files.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved with list of intro files.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number, ignoreCache?: boolean): Promise<CoreWSFile[]> {
        return this.getIntroFilesFromInstance(module);
    }

    /**
     * Returns module intro files from instance.
     *
     * @param module The module object returned by WS.
     * @param instance The instance to get the intro files (book, assign, ...). If not defined, module will be used.
     * @returns List of intro files.
     */
    getIntroFilesFromInstance(module: CoreCourseAnyModuleData, instance?: ModuleInstance): CoreWSFile[] {
        if (instance) {
            if (instance.introfiles !== undefined) {
                return instance.introfiles;
            } else if (instance.intro) {
                return CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(instance.intro);
            }
        }

        if ('description' in module && module.description) {
            return CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(module.description);
        }

        return [];
    }

    /**
     * If there's an ongoing download for a certain identifier return it.
     *
     * @param id Unique identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise of the current download.
     */
    async getOngoingDownload(id: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (this.isDownloading(id, siteId)) {
            // There's already a download ongoing, return the promise.
            return this.downloadPromises[siteId][this.getUniqueId(id)];
        }
    }

    /**
     * Create unique identifier using component and id.
     *
     * @param id Unique ID inside component.
     * @returns Unique ID.
     */
    getUniqueId(id: number): string {
        return `${this.component}#${id}`;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        // To be overridden.
        return;
    }

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when invalidated.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return CoreCourse.invalidateModule(module.id);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can be downloaded. The promise should never be rejected.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        // By default, mark all instances as downloadable.
        return true;
    }

    /**
     * Check if a there's an ongoing download for the given identifier.
     *
     * @param id Unique identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @returns True if downloading, false otherwise.
     */
    isDownloading(id: number, siteId?: string): boolean {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return !!(this.downloadPromises[siteId] && this.downloadPromises[siteId][this.getUniqueId(id)]);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Check if a file is downloadable.
     *
     * @param file File to check.
     * @returns Whether the file is downloadable.
     */
    isFileDownloadable(file: CoreCourseModuleContentFile): boolean {
        return file.type === 'file';
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param module Module to load the contents.
     * @param courseId The course ID. Recommended to speed up the process and minimize data usage.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved when loaded.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async loadContents(module: CoreCourseAnyModuleData, courseId: number, ignoreCache?: boolean): Promise<void> {
        // To be overridden.
        return;
    }

    /**
     * Prefetch a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async prefetch(module: CoreCourseAnyModuleData, courseId?: number, single?: boolean, dirPath?: string): Promise<void> {
        // To be overridden.
        return;
    }

    /**
     * Remove module downloaded files. If not defined, we'll use getFiles to remove them (slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removeFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return CoreFilepool.removeFilesByComponent(CoreSites.getCurrentSiteId(), this.component, module.id);
    }

}

/**
 * Properties a module instance should have to be able to retrieve its intro files.
 */
type ModuleInstance = {
    introfiles?: CoreWSFile[];
    intro?: string;
};
