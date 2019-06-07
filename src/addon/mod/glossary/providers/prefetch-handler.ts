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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { AddonModGlossaryProvider } from './glossary';
import { AddonModGlossarySyncProvider } from './sync';

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
            private glossaryProvider: AddonModGlossaryProvider,
            private syncProvider: AddonModGlossarySyncProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any[]>} Promise resolved with the list of files.
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
     * @param  {any}   module   Module to get the files.
     * @param  {any}   glossary Glossary
     * @param  {any[]} entries  Entries of the Glossary.
     * @return {any[]}          List of Files.
     */
    protected getFilesFromGlossaryAndEntries(module: any, glossary: any, entries: any[]): any[] {
        let files = this.getIntroFilesFromInstance(module, glossary);
        const getInlineFiles = this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.2');

        // Get entries files.
        entries.forEach((entry) => {
            files = files.concat(entry.attachments);

            if (getInlineFiles && entry.definitioninlinefiles && entry.definitioninlinefiles.length) {
                files = files.concat(entry.definitioninlinefiles);
            } else if (entry.definition && !getInlineFiles) {
                files = files.concat(this.domUtils.extractDownloadableFilesFromHtmlAsFakeFileObjects(entry.definition));
            }
        });

        return files;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.glossaryProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchGlossary.bind(this));
    }

    /**
     * Prefetch a glossary.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
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
                            [glossary.id, AddonModGlossaryProvider.SHOW_ALL_CATERGORIES], false, siteId));
                        break;
                    case 'date':
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByDate,
                            [glossary.id, 'CREATION', 'DESC'], false, siteId));
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByDate,
                            [glossary.id, 'UPDATE', 'DESC'], false, siteId));
                        break;
                    case 'author':
                        promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByAuthor,
                            [glossary.id, 'ALL', 'LASTNAME', 'ASC'], false, siteId));
                        break;
                    default:
                }
            });

            // Fetch all entries to get information from.
            promises.push(this.glossaryProvider.fetchAllEntries(this.glossaryProvider.getEntriesByLetter,
                    [glossary.id, 'ALL'], false, siteId).then((entries) => {
                const promises = [];
                const avatars = {}; // List of user avatars, preventing duplicates.

                entries.forEach((entry) => {
                    // Fetch individual entries.
                    promises.push(this.glossaryProvider.getEntry(entry.id, siteId));

                    if (entry.userpictureurl) {
                        avatars[entry.userpictureurl] = true;
                    }
                });

                // Prefetch intro files, entries files and user avatars.
                const avatarFiles = Object.keys(avatars).map((url) => {
                    return { fileurl: url };
                });
                const files = this.getFilesFromGlossaryAndEntries(module, glossary, entries).concat(avatarFiles);
                promises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

                return Promise.all(promises);
            }));

            return Promise.all(promises);
        });
    }

    /**
     * Sync a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
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
