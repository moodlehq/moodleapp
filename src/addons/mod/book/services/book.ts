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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreWSExternalWarning, CoreWS } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreCourse, CoreCourseModuleContentFile } from '@features/course/services/course';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreFilepool } from '@services/filepool';
import { CoreText } from '@singletons/text';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreError } from '@classes/errors/error';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ADDON_MOD_BOOK_COMPONENT } from '../constants';
import { CoreUrl } from '@singletons/url';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreCourseModuleHelper, CoreCourseModuleStandardElements } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for books.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModBook:';

    /**
     * Get a book by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the book is retrieved.
     */
    async getBook(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModBookBookWSData> {
        const site = await CoreSites.getSite(options.siteId);
        const params: AddonModBookGetBooksByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getBookDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_BOOK_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response: AddonModBookGetBooksByCoursesWSResponse = await site.read('mod_book_get_books_by_courses', params, preSets);

        return CoreCourseModuleHelper.getActivityByCmId(response.books, cmId);
    }

    /**
     * Get cache key for get book data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getBookDataCacheKey(courseId: number): string {
        return `${AddonModBookProvider.ROOT_CACHE_KEY}book:${courseId}`;
    }

    /**
     * Gets a chapter contents.
     *
     * @param contentsMap Contents map returned by getContentsMap.
     * @param chapterId Chapter to retrieve.
     * @param moduleId The module ID.
     * @returns Promise resolved with the contents.
     */
    async getChapterContent(contentsMap: AddonModBookContentsMap, chapterId: number, moduleId: number): Promise<string> {

        const indexUrl = contentsMap[chapterId] ? contentsMap[chapterId].indexUrl : undefined;
        if (!indexUrl) {
            // It shouldn't happen.
            throw new CoreError('Could not locate the index chapter.');
        }

        const siteId = CoreSites.getCurrentSiteId();

        const url = await CoreFilepool.downloadUrl(siteId, indexUrl, false, ADDON_MOD_BOOK_COMPONENT, moduleId);

        const content = await CoreWS.getText(url);

        // Now that we have the content, we update the SRC to point back to the external resource.
        return CoreDomUtils.restoreSourcesInHtml(content, contentsMap[chapterId].paths);
    }

    /**
     * Convert an array of book contents into an object where contents are organized in chapters.
     * Each chapter has an indexUrl and the list of contents in that chapter.
     *
     * @param contents The module contents.
     * @returns Contents map.
     */
    getContentsMap(contents: CoreCourseModuleContentFile[]): AddonModBookContentsMap {
        const map: AddonModBookContentsMap = {};

        if (!contents) {
            return map;
        }

        contents.forEach((content) => {
            if (!this.isFileDownloadable(content)) {
                return;
            }

            // Search the chapter number in the filepath.
            const matches = content.filepath.match(/\/(\d+)\//);
            if (!matches || !matches[1]) {
                return;
            }
            let key: string;
            const chapter: string = matches[1];
            const filepathIsChapter = content.filepath == `/${chapter}/`;

            // Init the chapter if it's not defined yet.
            map[chapter] = map[chapter] || { paths: {} };

            if (content.filename == 'index.html' && filepathIsChapter) {
                // Index of the chapter, set indexUrl and tags of the chapter.
                map[chapter].indexUrl = content.fileurl;
                map[chapter].tags = content.tags;

                return;
            }

            if (filepathIsChapter) {
                // It's a file in the root folder OR the WS isn't returning the filepath as it should (MDL-53671).
                // Try to get the path to the file from the URL.
                const split = content.fileurl.split(`mod_book/chapter${content.filepath}`);
                key = split[1] || content.filename; // Use filename if we couldn't find the path.
            } else {
                // Remove the chapter folder from the path and add the filename.
                key = content.filepath.replace(`/${chapter}/`, '') + content.filename;
            }

            map[chapter].paths[CoreUrl.decodeURIComponent(key)] = content.fileurl;
        });

        return map;
    }

    /**
     * Get the first chapter of a book.
     *
     * @param chapters The chapters list.
     * @returns The chapter id.
     */
    getFirstChapter(chapters: AddonModBookTocChapter[]): number | undefined {
        if (!chapters || !chapters.length) {
            return;
        }

        return chapters[0].id;
    }

    /**
     * Get last chapter viewed in the app for a book.
     *
     * @param id Book instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with last chapter viewed, undefined if none.
     */
    async getLastChapterViewed(id: number, siteId?: string): Promise<number | undefined> {
        const site = await CoreSites.getSite(siteId);
        const entry = await site.getLastViewed(ADDON_MOD_BOOK_COMPONENT, id);

        const chapterId = Number(entry?.value);

        return isNaN(chapterId) ? undefined : chapterId;
    }

    /**
     * Get the book toc as an array.
     *
     * @param contents The module contents.
     * @returns The toc.
     */
    getToc(contents: CoreCourseModuleContentFile[]): AddonModBookTocChapterParsed[] {
        if (!contents || !contents.length || contents[0].content === undefined) {
            return [];
        }

        return CoreText.parseJSON(contents[0].content, []);
    }

    /**
     * Get the book toc as an array of chapters (not nested).
     *
     * @param contents The module contents.
     * @returns The toc as a list.
     */
    getTocList(contents: CoreCourseModuleContentFile[]): AddonModBookTocChapter[] {
        // Convenience function to get chapter info.
        const getChapterInfo = (
            chapter: AddonModBookTocChapterParsed,
            chapterNumber: number,
            previousNumber: string = '',
        ): AddonModBookTocChapter => {
            const hidden = !!parseInt(chapter.hidden, 10);

            const fullChapterNumber = previousNumber + (hidden ? 'x.' : `${chapterNumber}.`);

            return {
                id: parseInt(chapter.href.replace('/index.html', ''), 10),
                title: chapter.title,
                level: chapter.level,
                indexNumber: fullChapterNumber,
                hidden: hidden,
            };
        };

        const chapters: AddonModBookTocChapter[] = [];
        const toc = this.getToc(contents);

        let chapterNumber = 1;
        toc.forEach((chapter) => {
            const tocChapter = getChapterInfo(chapter, chapterNumber);

            // Add the chapter to the list.
            chapters.push(tocChapter);

            if (chapter.subitems) {
                let subChapterNumber = 1;
                // Add all the subchapters to the list.
                chapter.subitems.forEach((subChapter) => {
                    chapters.push(getChapterInfo(subChapter, subChapterNumber, tocChapter.indexNumber));
                    subChapterNumber++;
                });
            }

            if (!parseInt(chapter.hidden, 10)) {
                chapterNumber++;
            }
        });

        return chapters;
    }

    /**
     * Invalidates book data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateBookData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getBookDataCacheKey(courseId));
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateBookData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_BOOK_COMPONENT, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId));

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @param file File to check.
     * @returns Whether it's downloadable.
     */
    isFileDownloadable(file: CoreCourseModuleContentFile): boolean {
        return file.type === 'file';
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canDownloadFiles();
    }

    /**
     * Report a book as being viewed.
     *
     * @param id Module ID.
     * @param chapterId Chapter ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, chapterId?: number, siteId?: string): Promise<void> {
        const params: AddonModBookViewBookWSParams = {
            bookid: id,
            chapterid: chapterId,
        };

        await CoreCourseLogHelper.log(
            'mod_book_view_book',
            params,
            ADDON_MOD_BOOK_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Store last chapter viewed in the app for a book.
     *
     * @param id Book instance ID.
     * @param chapterId Chapter ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with last chapter viewed, undefined if none.
     */
    async storeLastChapterViewed(id: number, chapterId: number, courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.storeLastViewed(ADDON_MOD_BOOK_COMPONENT, id, chapterId, { data: String(courseId) });
    }

}

export const AddonModBook = makeSingleton(AddonModBookProvider);

/**
 * A book chapter inside the toc list.
 */
export type AddonModBookTocChapter = {
    id: number; // ID to identify the chapter.
    title: string; // Chapter's title.
    level: number; // The chapter's level.
    hidden: boolean; // The chapter is hidden.
    indexNumber: string; // The chapter's number'.
};

/**
 * A book chapter parsed from JSON.
 */
type AddonModBookTocChapterParsed = {
    title: string; // Chapter's title.
    level: number; // The chapter's level.
    hidden: string; // The chapter is hidden.
    href: string;
    subitems: AddonModBookTocChapterParsed[];
};

/**
 * Map of book contents. For each chapter it has its index URL and the list of paths of the files the chapter has. Each path
 * is identified by the relative path in the book, and the value is the URL of the file.
 */
export type AddonModBookContentsMap = {
    [chapter: string]: {
        indexUrl?: string;
        paths: {[path: string]: string};
        tags?: CoreTagItem[];
    };
};

/**
 * Book returned by mod_book_get_books_by_courses.
 */
export type AddonModBookBookWSData = CoreCourseModuleStandardElements & {
    numbering: number; // Book numbering configuration.
    navstyle: number; // Book navigation style configuration.
    customtitles: number; // Book custom titles type.
    revision?: number; // Book revision.
    timecreated?: number; // Time of creation.
    timemodified?: number; // Time of last modification.
};

/**
 * Params of mod_book_get_books_by_courses WS.
 */
type AddonModBookGetBooksByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_book_get_books_by_courses WS.
 */
type AddonModBookGetBooksByCoursesWSResponse = {
    books: AddonModBookBookWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_book_view_book WS.
 */
type AddonModBookViewBookWSParams = {
    bookid: number; // Book instance id.
    chapterid?: number; // Chapter id.
};
