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

import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreSitePlugins, CoreSitePluginsCourseModuleHandlerData } from '@features/siteplugins/services/siteplugins';
import { CoreFilepool } from '@services/filepool';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Handler to prefetch a module site plugin.
 */
export class CoreSitePluginsModulePrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {

    protected isResource: boolean;

    constructor(
        component: string,
        name: string,
        modName: string,
        protected handlerSchema: CoreSitePluginsCourseModuleHandlerData,
    ) {
        super();

        this.component = component;
        this.name = name;
        this.modName = modName;
        this.isResource = !!handlerSchema.isresource;

        if (handlerSchema.updatesnames) {
            try {
                this.updatesNames = new RegExp(handlerSchema.updatesnames);
            } catch {
                // Ignore errors.
            }
        }
    }

    /**
     * @inheritdoc
     */
    download(module: CoreCourseAnyModuleData, courseId: number, dirPath?: string): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        return this.prefetchPackage(
            module,
            courseId,
            (siteId) => this.downloadPrefetchPlugin(module, courseId, false, dirPath, siteId),
            siteId,
        );
    }

    /**
     * Download or prefetch the plugin, downloading the files and calling the needed WS.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    protected async downloadPrefetchPlugin(
        module: CoreCourseAnyModuleData,
        courseId: number,
        prefetch: boolean,
        dirPath?: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const args = {
            courseid: courseId,
            cmid: module.id,
            userid: site.getUserId(),
        };

        await Promise.all([
            // Download the files (if any).
            this.downloadOrPrefetchFiles(site.getId(), module, courseId, prefetch, dirPath),

            // Call all the offline functions.
            CoreSitePlugins.prefetchFunctions(
                this.component,
                args,
                this.handlerSchema,
                courseId,
                module,
                prefetch,
                dirPath,
                site,
            ),
        ]);
    }

    /**
     * Download or prefetch the plugin files.
     *
     * @param siteId Site ID.
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when done.
     */
    protected async downloadOrPrefetchFiles(
        siteId: string,
        module: CoreCourseAnyModuleData,
        courseId: number,
        prefetch: boolean,
        dirPath?: string,
    ): Promise<void> {
        // Load module contents (ignore cache so we always have the latest data).
        await this.loadContents(module, courseId, true);

        // Get the intro files.
        const introFiles = await this.getIntroFiles(module, courseId);

        const contentFiles = this.getContentDownloadableFiles(module);

        if (dirPath) {
            await Promise.all([
                // Download intro files in filepool root folder.
                CoreFilepool.downloadOrPrefetchFiles(siteId, introFiles, prefetch, false, this.component, module.id),

                // Download content files inside dirPath.
                CoreFilepool.downloadOrPrefetchFiles(
                    siteId,
                    contentFiles,
                    prefetch,
                    false,
                    this.component,
                    module.id,
                    dirPath,
                ),
            ]);
        } else {
            // No dirPath, download everything in filepool root folder.
            await CoreFilepool.downloadOrPrefetchFiles(
                siteId,
                introFiles.concat(contentFiles),
                prefetch,
                false,
                this.component,
                module.id,
            );
        }
    }

    /**
     * @inheritdoc
     */
    async getDownloadSize(): Promise<CoreFileSizeSum> {
        // In most cases, to calculate the size we'll have to do all the WS calls. Just return unknown size.
        return { size: -1, total: false };
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return;
        }

        const promises: Promise<void>[] = [];
        const siteId = currentSite.getId();
        const args = {
            courseid: courseId,
            cmid: moduleId,
            userid: currentSite.getUserId(),
        };

        // Invalidate files and the module.
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, this.component, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId));

        // Also invalidate all the WS calls.
        for (const method in this.handlerSchema.offlinefunctions) {
            if (currentSite.wsAvailable(method)) {
                // The method is a WS.
                promises.push(currentSite.invalidateWsCacheForKey(CoreSitePlugins.getCallWSCacheKey(method, args)));
            } else {
                // It's a method to get content.
                promises.push(CoreSitePlugins.invalidateContent(this.component, method, args, siteId));
            }
        }

        return CorePromiseUtils.allPromises(promises);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async loadContents(module: CoreCourseAnyModuleData, courseId: number, ignoreCache?: boolean): Promise<void> {
        if (this.isResource) {
            return CoreCourse.loadModuleContents(module, courseId, undefined, false, ignoreCache);
        }
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number, single?: boolean, dirPath?: string): Promise<void> {
        return this.prefetchPackage(
            module,
            courseId,
            (siteId) => this.downloadPrefetchPlugin(module, courseId, true, dirPath, siteId),
        );
    }

}
