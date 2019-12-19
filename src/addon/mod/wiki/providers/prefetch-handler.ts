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
import { CoreGroupsProvider } from '@providers/groups';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModWikiProvider } from './wiki';
import { AddonModWikiSyncProvider } from './wiki-sync';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch wikis.
 */
@Injectable()
export class AddonModWikiPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModWiki';
    modName = 'wiki';
    component = AddonModWikiProvider.COMPONENT;
    updatesNames = /^.*files$|^pages$/;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected wikiProvider: AddonModWikiProvider,
            protected userProvider: CoreUserProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected courseHelper: CoreCourseHelperProvider,
            protected groupsProvider: CoreGroupsProvider,
            protected gradesHelper: CoreGradesHelperProvider,
            protected syncProvider: AddonModWikiSyncProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Returns a list of pages that can be downloaded.
     *
     * @param module The module object returned by WS.
     * @param courseId The course ID.
     * @param offline Whether it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return List of pages.
     */
    protected getAllPages(module: any, courseId: number, offline?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any[]> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.wikiProvider.getWiki(courseId, module.id, offline, siteId).then((wiki) => {
            return this.wikiProvider.getWikiPageList(wiki, offline, ignoreCache, siteId);
        }).catch(() => {
            // Wiki not found, return empty list.
            return [];
        });
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the size and a boolean indicating if it was able
     *         to calculate the total size.
     */
    getDownloadSize(module: any, courseId: number, single?: boolean): Promise<{ size: number, total: boolean }> {
        const promises = [],
            siteId = this.sitesProvider.getCurrentSiteId();

        promises.push(this.getFiles(module, courseId, single, siteId).then((files) => {
            return this.pluginFileDelegate.getFilesSize(files);
        }));

        promises.push(this.getAllPages(module, courseId, false, true, siteId).then((pages) => {
            let size = 0;

            pages.forEach((page) => {
                if (page.contentsize) {
                    size = size + page.contentsize;
                }
            });

            return {size: size, total: true};
        }));

        return Promise.all(promises).then((sizes) => {
            // Sum values in the array.
            return sizes.reduce((a, b) => {
                return {size: a.size + b.size, total: a.total && b.total};
            }, {size: 0, total: true});
        });
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean, siteId?: string): Promise<any[]> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.wikiProvider.getWiki(courseId, module.id, false, siteId).then((wiki) => {
            const introFiles = this.getIntroFilesFromInstance(module, wiki);

            return this.wikiProvider.getWikiFileList(wiki, false, false, siteId).then((files) => {
                return introFiles.concat(files);
            });
        }).catch(() => {
            // Wiki not found, return empty list.
            return [];
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.wikiProvider.invalidateContent(moduleId, courseId);
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
        // Get the download time of the package before starting the download (otherwise we'd always get current time).
        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.filepoolProvider.getPackageData(siteId, this.component, module.id).catch(() => {
            // No package data yet.
        }).then((data) => {
            const downloadTime = (data && data.downloadTime) || 0;

            return this.prefetchPackage(module, courseId, single, this.prefetchWiki.bind(this), siteId, [downloadTime]);
        });
    }

    /**
     * Prefetch a wiki.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @param downloadTime The previous download time, 0 if no previous download.
     * @return Promise resolved when done.
     */
    protected prefetchWiki(module: any, courseId: number, single: boolean, siteId: string, downloadTime: number): Promise<any> {
        const userId = this.sitesProvider.getCurrentSiteUserId();

        // Get the list of pages.
        return this.getAllPages(module, courseId, false, true, siteId).then((pages) => {
            const promises = [];

            pages.forEach((page) => {
                // Fetch page contents if it needs to be fetched.
                if (page.timemodified > downloadTime) {
                    promises.push(this.wikiProvider.getPageContents(page.id, false, true, siteId));
                }
            });

            // Fetch group data.
            promises.push(this.groupsProvider.getActivityGroupInfo(module.id, false, userId, siteId));

            // Fetch info to provide wiki links.
            promises.push(this.wikiProvider.getWiki(courseId, module.id, false, siteId).then((wiki) => {
                return this.courseHelper.getModuleCourseIdByInstance(wiki.id, 'wiki', siteId);
            }));

            // Get related page files and fetch them.
            promises.push(this.getFiles(module, courseId, single, siteId).then((files) => {
                return this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id);
            }));

            return Promise.all(promises);
        });
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
        return this.syncProvider.syncWiki(module.instance, module.course, module.id, siteId);
    }
}
