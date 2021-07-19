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

import { CoreConstants } from '@/core/constants';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreCourse, CoreCourseAnyModuleData } from '../services/course';
import { CoreCourseModulePrefetchHandlerBase } from './module-prefetch-handler';

/**
 * Base prefetch handler to be registered in CoreCourseModulePrefetchDelegate. It is useful to minimize the amount of
 * functions that handlers need to implement. It also provides some helper features like preventing a module to be
 * downloaded twice at the same time.
 *
 * If your handler inherits from this service, you just need to override the functions that you want to change.
 *
 * This class should be used for ACTIVITIES. You must override the prefetch function, and it's recommended to call
 * prefetchPackage in there since it handles the package status.
 */
export class CoreCourseActivityPrefetchHandlerBase extends CoreCourseModulePrefetchHandlerBase {

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when all content is downloaded.
     */
    download(module: CoreCourseAnyModuleData, courseId: number, dirPath?: string): Promise<void> {
        // Same implementation for download and prefetch.
        return this.prefetch(module, courseId, false, dirPath);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async prefetch(module: CoreCourseAnyModuleData, courseId?: number, single?: boolean, dirPath?: string): Promise<void> {
        // To be overridden. It should call prefetchPackage
        return;
    }

    /**
     * Prefetch the module, setting package status at start and finish.
     *
     * Example usage from a child instance:
     *     return this.prefetchPackage(module, courseId, single, this.prefetchModule.bind(this, otherParam), siteId);
     *
     * Then the function "prefetchModule" will receive params:
     *     prefetchModule(module, courseId, single, siteId, someParam, anotherParam)
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param downloadFn Function to perform the prefetch. Please check the documentation of prefetchFunction.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the module has been downloaded. Data returned is not reliable.
     */
    async prefetchPackage(
        module: CoreCourseAnyModuleData,
        courseId: number,
        downloadFunction: (siteId: string) => Promise<string>,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreApp.isOnline()) {
            // Cannot prefetch in offline.
            throw new CoreNetworkError();
        }

        if (this.isDownloading(module.id, siteId)) {
            // There's already a download ongoing for this module, return the promise.
            return this.getOngoingDownload(module.id, siteId);
        }

        const prefetchPromise = this.changeStatusAndPrefetch(module, courseId, downloadFunction, siteId);

        return this.addOngoingDownload(module.id, prefetchPromise, siteId);
    }

    /**
     * Change module status and call the prefetch function.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param downloadFn Function to perform the prefetch. Please check the documentation of prefetchFunction.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the module has been downloaded. Data returned is not reliable.
     */
    protected async changeStatusAndPrefetch(
        module: CoreCourseAnyModuleData,
        courseId: number | undefined,
        downloadFunction: (siteId: string) => Promise<string>,
        siteId: string,
    ): Promise<void> {
        try {
            await this.setDownloading(module.id, siteId);

            // Package marked as downloading, get module info to be able to handle links. Get module filters too.
            await Promise.all([
                CoreCourse.getModuleBasicInfo(module.id, siteId),
                CoreCourse.getModule(module.id, courseId, undefined, false, true, siteId),
                CoreFilterHelper.getFilters('module', module.id, { courseId }),
            ]);

            // Call the download function.
            let extra = await downloadFunction(siteId);

            // Only accept string types.
            if (typeof extra != 'string') {
                extra = '';
            }

            // Prefetch finished, mark as downloaded.
            await this.setDownloaded(module.id, siteId, extra);
        } catch (error) {
            // Error prefetching, go back to previous status and reject the promise.
            await this.setPreviousStatus(module.id, siteId);

            throw error;
        }
    }

    /**
     * Mark the module as downloaded.
     *
     * @param id Unique identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @param extra Extra data to store.
     * @return Promise resolved when done.
     */
    setDownloaded(id: number, siteId?: string, extra?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return CoreFilepool.storePackageStatus(siteId, CoreConstants.DOWNLOADED, this.component, id, extra);
    }

    /**
     * Mark the module as downloading.
     *
     * @param id Unique identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    setDownloading(id: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return CoreFilepool.storePackageStatus(siteId, CoreConstants.DOWNLOADING, this.component, id);
    }

    /**
     * Set previous status and return a rejected promise.
     *
     * @param id Unique identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Rejected promise.
     */
    async setPreviousStatus(id: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await CoreFilepool.setPackagePreviousStatus(siteId, this.component, id);
    }

    /**
     * Set previous status and return a rejected promise.
     *
     * @param id Unique identifier per component.
     * @param error Error to throw.
     * @param siteId Site ID. If not defined, current site.
     * @return Rejected promise.
     * @deprecated since 3.9.5. Use setPreviousStatus instead.
     */
    async setPreviousStatusAndReject(id: number, error?: Error, siteId?: string): Promise<never> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await CoreFilepool.setPackagePreviousStatus(siteId, this.component, id);

        throw error;
    }

}
