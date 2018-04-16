// (C) Copyright 2015 Martin Dougiamas
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
import { CoreCourseModulePrefetchHandlerBase } from '@core/course/classes/module-prefetch-handler';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModChoiceProvider } from './choice';

/**
 * Handler to prefetch choices.
 */
@Injectable()
export class AddonModChoicePrefetchHandler extends CoreCourseModulePrefetchHandlerBase {
    name = 'AddonModChoice';
    modName = 'choice';
    component = AddonModChoiceProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^answers$/;

    constructor(injector: Injector, protected choiceProvider: AddonModChoiceProvider, private userProvider: CoreUserProvider) {
        super(injector);
    }

    /**
     * Download or prefetch the content.
     *
     * @param  {any}     module     The module object returned by WS.
     * @param  {number}  courseId   Course ID.
     * @param  {boolean} [prefetch] True to prefetch, false to download right away.
     * @param  {string}  [dirPath]  Path of the directory where to store all the content files. This is to keep the files
     *                              relative paths and make the package work in an iframe. Undefined to download the files
     *                              in the filepool root choice.
     * @return {Promise<any>} Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    downloadOrPrefetch(module: any, courseId: number, prefetch?: boolean, dirPath?: string): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId();
        const promises = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch));
        promises.push(this.choiceProvider.getChoice(courseId, module.id, siteId).then((choice) => {
            const promises = [];

            // Get the options and results.
            promises.push(this.choiceProvider.getOptions(choice.id, siteId));
            promises.push(this.choiceProvider.getResults(choice.id, siteId).then((options) => {
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

            return Promise.all(promises);
        }));

        return Promise.all(promises);
    }

    /**
     * Returns choice intro files.
     *
     * @param  {any}    module   The module object returned by WS.
     * @param  {number} courseId Course ID.
     * @return {Promise<any[]>} Promise resolved with list of intro files.
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
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.choiceProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param  {any}    module   Module.
     * @param  {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        return this.choiceProvider.invalidateChoiceData(courseId);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
