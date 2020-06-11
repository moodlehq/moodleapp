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
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { CoreWSExternalFile } from '@providers/ws';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CoreH5PHelper } from '@core/h5p/classes/helper';
import { CoreH5P } from '@core/h5p/providers/h5p';
import { CoreUser } from '@core/user/providers/user';
import { AddonModH5PActivity, AddonModH5PActivityProvider, AddonModH5PActivityData } from './h5pactivity';

/**
 * Handler to prefetch h5p activity.
 */
@Injectable()
export class AddonModH5PActivityPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModH5PActivity';
    modName = 'h5pactivity';
    component = AddonModH5PActivityProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^tracks$|^usertracks$/;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Get list of files.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the list of files.
     */
    async getFiles(module: any, courseId: number, single?: boolean): Promise<CoreWSExternalFile[]> {

        const h5pActivity = await AddonModH5PActivity.instance.getH5PActivity(courseId, module.id);

        const displayOptions = CoreH5PHelper.decodeDisplayOptions(h5pActivity.displayoptions);

        const deployedFile = await AddonModH5PActivity.instance.getDeployedFile(h5pActivity, {
            displayOptions: displayOptions,
        });

        return [deployedFile].concat(this.getIntroFilesFromInstance(module, h5pActivity));
    }

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    async invalidateModule(module: any, courseId: number): Promise<void> {
        // No need to invalidate anything.
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number): boolean | Promise<boolean> {
        return this.sitesProvider.getCurrentSite().canDownloadFiles() && !CoreH5P.instance.isOfflineDisabledInSite();
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return AddonModH5PActivity.instance.isPluginEnabled();
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
        return this.prefetchPackage(module, courseId, single, this.prefetchActivity.bind(this));
    }

    /**
     * Prefetch an H5P activity.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchActivity(module: any, courseId: number, single: boolean, siteId: string): Promise<void> {

        const h5pActivity = await AddonModH5PActivity.instance.getH5PActivity(courseId, module.id, true, siteId);

        const introFiles = this.getIntroFilesFromInstance(module, h5pActivity);

        await Promise.all([
            this.prefetchWSData(h5pActivity, siteId),
            this.filepoolProvider.addFilesToQueue(siteId, introFiles, AddonModH5PActivityProvider.COMPONENT, module.id),
            this.prefetchMainFile(module, h5pActivity, siteId),
        ]);
    }

    /**
     * Prefetch the deployed file of the activity.
     *
     * @param module Module.
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchMainFile(module: any, h5pActivity: AddonModH5PActivityData, siteId: string): Promise<void> {

        const displayOptions = CoreH5PHelper.decodeDisplayOptions(h5pActivity.displayoptions);

        const deployedFile = await AddonModH5PActivity.instance.getDeployedFile(h5pActivity, {
            displayOptions: displayOptions,
            ignoreCache: true,
            siteId: siteId,
        });

        await this.filepoolProvider.addFilesToQueue(siteId, [deployedFile], AddonModH5PActivityProvider.COMPONENT, module.id);
    }

    /**
     * Prefetch all the WebService data.
     *
     * @param h5pActivity Activity instance.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async prefetchWSData(h5pActivity: AddonModH5PActivityData, siteId: string): Promise<void> {

        const accessInfo = await AddonModH5PActivity.instance.getAccessInformation(h5pActivity.id, true, siteId);

        if (!accessInfo.canreviewattempts) {
            // Not a teacher, prefetch user attempts and the current user profile.
            const site = await this.sitesProvider.getSite(siteId);

            const options = {
                ignoreCache: true,
                siteId: siteId,
            };

            await Promise.all([
                AddonModH5PActivity.instance.getAllAttemptsResults(h5pActivity.id, options),
                CoreUser.instance.prefetchProfiles([site.getUserId()], h5pActivity.course, siteId),
            ]);
        }
    }
}
