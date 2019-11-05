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
import { CoreCourseResourcePrefetchHandlerBase } from '@core/course/classes/resource-prefetch-handler';
import { AddonModLabelProvider } from './label';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch labels.
 */
@Injectable()
export class AddonModLabelPrefetchHandler extends CoreCourseResourcePrefetchHandlerBase {
    name = 'AddonModLabel';
    modName = 'label';
    component = AddonModLabelProvider.COMPONENT;
    updatesNames = /^.*files$/;
    skipListStatus = true;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected labelProvider: AddonModLabelProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Returns module intro files.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number, ignoreCache?: boolean): Promise<any[]> {
        let promise;

        if (this.labelProvider.isGetLabelAvailableForSite()) {
            promise = this.labelProvider.getLabel(courseId, module.id, false, ignoreCache);
        } else {
            promise = Promise.resolve();
        }

        return promise.then((label) => {
            return this.getIntroFilesFromInstance(module, label);
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.labelProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        const promises = [];

        promises.push(this.labelProvider.invalidateLabelData(courseId));
        promises.push(this.courseProvider.invalidateModule(module.id));

        return this.utils.allPromises(promises);
    }
}
