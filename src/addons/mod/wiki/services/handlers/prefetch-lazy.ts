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
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreFilepool } from '@services/filepool';
import { CoreGroups } from '@services/groups';
import { CoreFileSizeSum, CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModWiki, AddonModWikiSubwikiPage } from '../wiki';
import { AddonModWikiSync, AddonModWikiSyncWikiResult } from '../wiki-sync';
import { AddonModWikiPrefetchHandlerService } from '@addons/mod/wiki/services/handlers/prefetch';
import { ADDON_MOD_WIKI_MODNAME } from '../../constants';

/**
 * Handler to prefetch wikis.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiPrefetchHandlerLazyService extends AddonModWikiPrefetchHandlerService {

    /**
     * Returns a list of pages that can be downloaded.
     *
     * @param module The module object returned by WS.
     * @param courseId The course ID.
     * @param options Other options.
     * @returns List of pages.
     */
    protected async getAllPages(
        module: CoreCourseAnyModuleData,
        courseId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModWikiSubwikiPage[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        try {
            const wiki = await AddonModWiki.getWiki(courseId, module.id, options);

            return await AddonModWiki.getWikiPageList(wiki, options);
        } catch {
            // Wiki not found, return empty list.
            return [];
        }
    }

    /**
     * @inheritdoc
     */
    async getDownloadSize(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreFileSizeSum> {
        const promises: Promise<CoreFileSizeSum>[] = [];
        const siteId = CoreSites.getCurrentSiteId();

        promises.push(this.getFiles(module, courseId, single, siteId).then((files) =>
            CorePluginFileDelegate.getFilesDownloadSize(files)));

        promises.push(this.getAllPages(module, courseId, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        }).then((pages) => {
            let size = 0;

            pages.forEach((page) => {
                if (page.contentsize) {
                    size = size + page.contentsize;
                }
            });

            return { size: size, total: true };
        }));

        const sizes = await Promise.all(promises);

        return {
            size: sizes[0].size + sizes[1].size,
            total: sizes[0].total && sizes[1].total,
        };
    }

    /**
     * @inheritdoc
     */
    async getFiles(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single?: boolean,
        siteId?: string,
    ): Promise<CoreWSFile[]> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        try {
            const wiki = await AddonModWiki.getWiki(courseId, module.id, { siteId });

            const introFiles = this.getIntroFilesFromInstance(module, wiki);

            const files = await AddonModWiki.getWikiFileList(wiki, { siteId });

            return introFiles.concat(files);
        } catch {
            // Wiki not found, return empty list.
            return [];
        }
    }

    /**
     * @inheritdoc
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModWiki.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async prefetch(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<void> {
        // Get the download time of the package before starting the download (otherwise we'd always get current time).
        const siteId = CoreSites.getCurrentSiteId();

        const data = await CorePromiseUtils.ignoreErrors(CoreFilepool.getPackageData(siteId, this.component, module.id));

        const downloadTime = data?.downloadTime || 0;

        return this.prefetchPackage(
            module,
            courseId,
            (siteId) => this.prefetchWiki(module, courseId, !!single, downloadTime, siteId),
            siteId,
        );
    }

    /**
     * Prefetch a wiki.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param downloadTime The previous download time, 0 if no previous download.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchWiki(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single: boolean,
        downloadTime: number,
        siteId: string,
    ): Promise<void> {
        const userId = CoreSites.getCurrentSiteUserId();

        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        // Get the list of pages.
        const pages = await this.getAllPages(module, courseId, commonOptions);
        const promises: Promise<unknown>[] = [];

        pages.forEach((page) => {
            // Fetch page contents if it needs to be fetched.
            if (page.timemodified > downloadTime) {
                promises.push(AddonModWiki.getPageContents(page.id, modOptions));
            }
        });

        // Fetch group data.
        promises.push(CoreGroups.getActivityGroupInfo(module.id, false, userId, siteId));

        // Fetch info to provide wiki links.
        promises.push(AddonModWiki.getWiki(courseId, module.id, { siteId }).then((wiki) =>
            CoreCourse.getModuleBasicInfoByInstance(wiki.id, ADDON_MOD_WIKI_MODNAME, { siteId })));

        // Get related page files and fetch them.
        promises.push(this.getFiles(module, courseId, single, siteId).then((files) =>
            CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id)));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModWikiSyncWikiResult> {
        return AddonModWikiSync.syncWiki(module.instance, module.course, module.id, siteId);
    }

}

export const AddonModWikiPrefetchHandler = makeSingleton(AddonModWikiPrefetchHandlerLazyService);
