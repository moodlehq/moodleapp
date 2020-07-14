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
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { AddonModGlossaryProvider } from './glossary';
import { AddonModGlossarySyncProvider } from './sync';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Handler to prefetch forums.
 */
@Injectable()
export class AddonModGlossaryPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModGlossary';
    modName = 'glossary';
    component = AddonModGlossaryProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^entries$/;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected glossaryProvider: AddonModGlossaryProvider,
            protected commentsProvider: CoreCommentsProvider,
            protected syncProvider: AddonModGlossarySyncProvider,
            protected userProvider: CoreUserProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean): Promise<any[]> {
        return this.glossaryProvider.getGlossary(courseId, module.id).then((glossary) => {
            return this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByLetter, [glossary.id, 'ALL'])
                .then((entries) => {
                    return this.getFilesFromGlossaryAndEntries(module, glossary, entries);
                });
        }).catch(() => {
            // Glossary not found, return empty list.
            return [];
        });
    }

    /**
     * Get the list of downloadable files. It includes entry embedded files.
     *
     * @param module Module to get the files.
     * @param glossary Glossary
     * @param entries Entries of the Glossary.
     * @return List of Files.
     */
    protected getFilesFromGlossaryAndEntries(module: any, glossary: any, entries: any[]): any[] {
        let files = this.getIntroFilesFromInstance(module, glossary);
        const getInlineFiles = this.sitesProvider.getCurrentSite() &&
                this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.2');

        // Get entries files.
        entries.forEach((entry) => {
            files = files.concat(entry.attachments);

            if (getInlineFiles && entry.definitioninlinefiles && entry.definitioninlinefiles.length) {
                files = files.concat(entry.definitioninlinefiles);
            } else if (entry.definition && !getInlineFiles) {
                files = files.concat(this.filepoolProvider.extractDownloadableFilesFromHtmlAsFakeFileObjects(entry.definition));
            }
        });

        return files;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.glossaryProvider.invalidateContent(moduleId, courseId);
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
        return this.prefetchPackage(module, courseId, single, this.prefetchGlossary.bind(this));
    }

    /**
     * Prefetch a glossary.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected prefetchGlossary(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Prefetch the glossary data.
        return this.glossaryProvider.getGlossary(courseId, module.id, siteId).then((glossary) => {
            const promises = [];

            glossary.browsemodes.forEach((mode) => {
                switch (mode) {
                    case 'letter': // Always done. Look bellow.
                        break;
                    case 'cat': // Not implemented.
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByCategory,
                            [glossary.id, AddonModGlossaryProvider.SHOW_ALL_CATEGORIES], false, false, siteId));
                        break;
                    case 'date':
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByDate,
                            [glossary.id, 'CREATION', 'DESC'], false, false, siteId));
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByDate,
                            [glossary.id, 'UPDATE', 'DESC'], false, false, siteId));
                        break;
                    case 'author':
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByAuthor,
                            [glossary.id, 'ALL', 'LASTNAME', 'ASC'], false, false, siteId));
                        break;
                    default:
                }
            });

            // Fetch all entries to get information from.
            promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByLetter,
                    [glossary.id, 'ALL'], false, false, siteId).then((entries) => {
                const promises = [];
                const commentsEnabled = !this.commentsProvider.areCommentsDisabledInSite();

                entries.forEach((entry) => {
                    // Don't fetch individual entries, it's too many WS calls.

                    if (glossary.allowcomments && commentsEnabled) {
                        promises.push(this.commentsProvider.getComments('module', glossary.coursemodule, 'mod_glossary', entry.id,
                            'glossary_entry', 0, siteId));
                    }
                });

                const files = this.getFilesFromGlossaryAndEntries(module, glossary, entries);
                promises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

                // Prefetch user avatars.
                promises.push(this.userProvider.prefetchUserAvatars(entries, 'userpictureurl', siteId));

                return Promise.all(promises);
            }));

            // Get all categories.
            promises.push(this.glossaryProvider.getAllCategories(glossary.id, siteId));

            // Prefetch data for link handlers.
            promises.push(this.courseProvider.getModuleBasicInfo(module.id, siteId));
            promises.push(this.courseProvider.getModuleBasicInfoByInstance(glossary.id, 'glossary', siteId));

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
        const promises = [
            this.syncProvider.syncGlossaryEntries(module.instance, undefined, siteId),
            this.syncProvider.syncRatings(module.id, undefined, siteId)
        ];

        return Promise.all(promises).then((results) => {
            return results.reduce((a, b) => ({
                updated: a.updated || b.updated,
                warnings: (a.warnings || []).concat(b.warnings || []),
            }), {updated: false});
        });
    }
}
