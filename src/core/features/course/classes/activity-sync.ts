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

import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCourseAnyModuleData } from '../services/course';
import { CoreCourseModulePrefetchDelegate, CoreCourseModulePrefetchHandler } from '../services/module-prefetch-delegate';
import { CoreCourseModuleHelper } from '../services/course-module-helper';

/**
 * Base class to create activity sync providers. It provides some common functions.
 */
export class CoreCourseActivitySyncBaseProvider<T = void> extends CoreSyncBaseProvider<T> {

    protected componentTranslatableString = 'activity';

    /**
     * Convenience function to prefetch data after an update.
     *
     * @param prefetchHandler Prefetch Handler. It's not recommended to use this parameter, use module.modname instead.
     * @param module Module.
     * @param courseId Course ID.
     * @param preventDownloadRegex If regex matches, don't download the data. Defaults to check files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if prefetched, false if no need to prefetch.
     *
     * @deprecated since 5.0. Use CoreCourseModulePrefetchDelegate.prefetchModuleAfterUpdate instead.
     */
    async prefetchAfterUpdate(
        prefetchHandler: CoreCourseModulePrefetchHandler | undefined,
        module: CoreCourseAnyModuleData,
        courseId: number,
        preventDownloadRegex?: RegExp,
        siteId?: string,
    ): Promise<boolean> {
        if (prefetchHandler === undefined) {
            prefetchHandler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(module.modname);
        }

        if (!prefetchHandler) {
            return false;
        }

        // Get the module updates to check if the data was updated or not.
        const result = await CoreCourseModulePrefetchDelegate.getModuleUpdates(module, courseId, true, siteId);

        if (!result?.updates.length) {
            return false;
        }

        // Only prefetch if files haven't changed, to prevent downloading too much data automatically.
        const regex = preventDownloadRegex || /^.*files$/;
        const shouldDownload = !result.updates.find((entry) => entry.name.match(regex));

        if (shouldDownload) {
            await prefetchHandler.download(module, courseId);

            return true;
        }

        return false;
    }

    /**
     * Convenience function to prefetch data after an update.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param preventDownloadRegex If regex matches, don't download the data. Defaults to check files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if prefetched, false if no need to prefetch.
     */
    async prefetchModuleAfterUpdate(
        module: CoreCourseAnyModuleData,
        courseId: number,
        preventDownloadRegex?: RegExp,
        siteId?: string,
    ): Promise<boolean> {
        // eslint-disable-next-line deprecation/deprecation
        return this.prefetchAfterUpdate(undefined, module, courseId, preventDownloadRegex, siteId);
    }

    /**
     * @inheritdoc
     */
    protected get componentTranslate(): string {
        if (!this.componentTranslateInternal) {
            this.componentTranslateInternal = CoreCourseModuleHelper.translateModuleName(this.componentTranslatableString);
        }

        return this.componentTranslateInternal;
    }

}
