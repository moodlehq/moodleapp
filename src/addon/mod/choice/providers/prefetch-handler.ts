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

import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModChoiceSyncProvider } from './sync';
import { AddonModChoiceProvider } from './choice';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch choices.
 */
@Injectable()
export class AddonModChoicePrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModChoice';
    modName = 'choice';
    component = AddonModChoiceProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^answers$/;

    protected syncProvider: AddonModChoiceSyncProvider; // It will be injected later to prevent circular dependencies.

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected choiceProvider: AddonModChoiceProvider,
            protected userProvider: CoreUserProvider,
            protected injector: Injector) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
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
        return this.prefetchPackage(module, courseId, single, this.prefetchChoice.bind(this));
    }

    /**
     * Prefetch a choice.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected prefetchChoice(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        return this.choiceProvider.getChoice(courseId, module.id, siteId, false, true).then((choice) => {
            const promises = [];

            // Get the options and results.
            promises.push(this.choiceProvider.getOptions(choice.id, true, siteId));
            promises.push(this.choiceProvider.getResults(choice.id, true, siteId).then((options) => {
                // If we can see the users that answered, prefetch their profile and avatar.
                const subPromises = [];
                options.forEach((option) => {
                    option.userresponses.forEach((response) => {
                        if (response.userid) {
                            subPromises.push(this.userProvider.getProfile(response.userid, courseId, false, siteId));
                        }
                        if (response.profileimageurl) {
                            subPromises.push(this.filepoolProvider.addToQueueByUrl(siteId, response.profileimageurl).catch(() => {
                                // Ignore failures.
                            }));
                        }
                    });
                });

                return Promise.all(subPromises);
            }));

            // Get the intro files.
            const introFiles = this.getIntroFilesFromInstance(module, choice);
            promises.push(this.filepoolProvider.addFilesToQueue(siteId, introFiles, AddonModChoiceProvider.COMPONENT, module.id));

            return Promise.all(promises);
        });
    }

    /**
     * Returns choice intro files.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @return Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number): Promise<any[]> {
        return this.choiceProvider.getChoice(courseId, module.id).catch(() => {
            // Not found, return undefined so module description is used.
        }).then((choice) => {
            return this.getIntroFilesFromInstance(module, choice);
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
        return this.choiceProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        return this.choiceProvider.invalidateChoiceData(courseId);
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    sync(module: any, courseId: number, siteId?: any): Promise<any> {
        if (!this.syncProvider) {
            this.syncProvider = this.injector.get(AddonModChoiceSyncProvider);
        }

        return this.syncProvider.syncChoice(module.instance, undefined, siteId);
    }
}
