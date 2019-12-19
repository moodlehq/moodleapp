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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { AddonModLtiProvider } from './lti';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch LTIs. LTIs cannot be prefetched, but the handler will be used to invalidate some data on course PTR.
 */
@Injectable()
export class AddonModLtiPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModLti';
    modName = 'lti';
    component = AddonModLtiProvider.COMPONENT;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected ltiProvider: AddonModLtiProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when all content is downloaded.
     */
    download(module: any, courseId: number, dirPath?: string): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        return this.ltiProvider.invalidateLti(courseId);
    }

    /**
     * Check if a module can be downloaded.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        return false; // LTIs aren't downloadable.
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
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return Promise.resolve();
    }
}
