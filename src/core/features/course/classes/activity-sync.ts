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
import { CoreCourse, CoreCourseAnyModuleData } from '../services/course';
import { CoreCourseModulePrefetchDelegate } from '../services/module-prefetch-delegate';
import { CoreCourseModulePrefetchHandlerBase } from './module-prefetch-handler';

/**
 * Base class to create activity sync providers. It provides some common functions.
 */
export class CoreCourseActivitySyncBaseProvider<T = void> extends CoreSyncBaseProvider<T> {

    protected componentTranslatableString = 'activity';

    /**
     * Conveniece function to prefetch data after an update.
     *
     * @param prefetchHandler Prefetch Handler.
     * @param module Module.
     * @param courseId Course ID.
     * @param preventDownloadRegex If regex matches, don't download the data. Defaults to check files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if prefetched, false if no need to prefetch.
     */
    async prefetchAfterUpdate(
        prefetchHandler: CoreCourseModulePrefetchHandlerBase,
        module: CoreCourseAnyModuleData,
        courseId: number,
        preventDownloadRegex?: RegExp,
        siteId?: string,
    ): Promise<boolean> {
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
     * @inheritdoc
     */
    protected get componentTranslate(): string {
        if (!this.componentTranslateInternal) {
            this.componentTranslateInternal = CoreCourse.translateModuleName(this.componentTranslatableString);
        }

        return this.componentTranslateInternal;
    }

}
