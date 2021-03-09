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
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreWSExternalWarning, CoreWSExternalFile, CoreWS } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreCourse, CoreCourseModuleContentFile } from '@features/course/services/course';
import { CoreUtils } from '@services/utils/utils';
import { CoreFilepool } from '@services/filepool';
import { CoreTextUtils } from '@services/utils/text';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreFile } from '@services/file';
import { CoreError } from '@classes/errors/error';

/**
 * Constants to define how the chapters and subchapters of a book should be displayed in that table of contents.
 */
export const enum AddonModBookNumbering {
    NONE = 0,
    NUMBERS = 1,
    BULLETS = 2,
    INDENTED = 3,
}

/**
 * Constants to define the navigation style used within a book.
 */
export const enum AddonModBookNavStyle {
    TOC_ONLY = 0,
    IMAGE = 1,
    TEXT = 2,
}

const ROOT_CACHE_KEY = 'mmaModBook:';

/**
 * Service that provides some features for books.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookProvider {

    static readonly COMPONENT = 'mmaModBook';

    /**
     * Get a book by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the book is retrieved.
     */
    getBook(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModBookBookWSData> {
        return this.getBookByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a book with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the book is retrieved.
     */
    protected async getBookByField(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModBookBookWSData> {

        const site = await CoreSites.getSite(options.siteId);
        const params: AddonModBookGetBooksByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getBookDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModBookProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response: AddonModBookGetBooksByCoursesWSResponse = await site.read('mod_book_get_books_by_courses', params, preSets);

        // Search the book.
        const book = response.books.find((book) => book[key] == value);
        if (book) {
            return book;
        }

        throw new CoreError('Book not found');
    }

    /**
     * Get cache key for get book data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getBookDataCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'book:' + courseId;
    }

    /**
     * Gets a chapter contents.
     *
     * @param contentsMap Contents map returned by getContentsMap.
     * @param chapterId Chapter to retrieve.
     * @param moduleId The module ID.
     * @return Promise resolved with the contents.
     */
    async getChapterContent(contentsMap: AddonModBookContentsMap, chapterId: number, moduleId: number): Promise<string> {

        const indexUrl = contentsMap[chapterId] ? contentsMap[chapterId].indexUrl : undefined;
        if (!indexUrl) {
            // It shouldn't happen.
            throw new CoreError('Could not locate the index chapter.');
        }

        if (!CoreFile.isAvailable()) {
            // We return the live URL.
            return CoreSites.getCurrentSite()!.checkAndFixPluginfileURL(indexUrl);
        }

        const siteId = CoreSites.getCurrentSiteId();

        const url = await CoreFilepool.downloadUrl(siteId, indexUrl, false, AddonModBookProvider.COMPONENT, moduleId);

        const content = await CoreWS.getText(url);

        // Now that we have the content, we update the SRC to point back to the external resource.
        return CoreDomUtils.restoreSourcesInHtml(content, contentsMap[chapterId].paths);
    }

    /**
     * Convert an array of book contents into an object where contents are organized in chapters.
     * Each chapter has an indexUrl and the list of contents in that chapter.
     *
     * @param contents The module contents.
     * @return Contents map.
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
            const filepathIsChapter = content.filepath == '/' + chapter + '/';

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
                const split = content.fileurl.split('mod_book/chapter' + content.filepath);
                key = split[1] || content.filename; // Use filename if we couldn't find the path.
            } else {
                // Remove the chapter folder from the path and add the filename.
                key = content.filepath.replace('/' + chapter + '/', '') + content.filename;
            }

            map[chapter].paths[CoreTextUtils.decodeURIComponent(key)] = content.fileurl;
        });

        return map;
    }

    /**
     * Get the first chapter of a book.
     *
     * @param chapters The chapters list.
     * @return The chapter id.
     */
    getFirstChapter(chapters: AddonModBookTocChapter[]): number | undefined {
        if (!chapters || !chapters.length) {
            return;
        }

        return chapters[0].id;
    }

    /**
     * Get the next chapter to the given one.
     *
     * @param chapters The chapters list.
     * @param chapterId The current chapter.
     * @return The next chapter.
     */
    getNextChapter(chapters: AddonModBookTocChapter[], chapterId: number): AddonModBookTocChapter | undefined {
        const currentChapterIndex = chapters.findIndex((chapter) => chapter.id == chapterId);

        if (currentChapterIndex >= 0 && typeof chapters[currentChapterIndex + 1] != 'undefined') {
            return chapters[currentChapterIndex + 1];
        }
    }

    /**
     * Get the previous chapter to the given one.
     *
     * @param chapters The chapters list.
     * @param chapterId The current chapter.
     * @return The next chapter.
     */
    getPreviousChapter(chapters: AddonModBookTocChapter[], chapterId: number): AddonModBookTocChapter | undefined {
        const currentChapterIndex = chapters.findIndex((chapter) => chapter.id == chapterId);

        if (currentChapterIndex > 0) {
            return chapters[currentChapterIndex - 1];
        }
    }

    /**
     * Get the book toc as an array.
     *
     * @param contents The module contents.
     * @return The toc.
     */
    getToc(contents: CoreCourseModuleContentFile[]): AddonModBookTocChapterParsed[] {
        if (!contents || !contents.length || typeof contents[0].content == 'undefined') {
            return [];
        }

        return CoreTextUtils.parseJSON(contents[0].content, []);
    }

    /**
     * Get the book toc as an array of chapters (not nested).
     *
     * @param contents The module contents.
     * @return The toc as a list.
     */
    getTocList(contents: CoreCourseModuleContentFile[]): AddonModBookTocChapter[] {
        // Convenience function to get chapter info.
        const getChapterInfo = (
            chapter: AddonModBookTocChapterParsed,
            chapterNumber: number,
            previousNumber: string = '',
        ): AddonModBookTocChapter => {
            const hidden = !!parseInt(chapter.hidden, 10);

            const fullChapterNumber = previousNumber + (hidden ? 'x.' : chapterNumber + '.');

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

            chapterNumber++;
        });

        return chapters;
    }

    /**
     * Invalidates book data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateBookData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, AddonModBookProvider.COMPONENT, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId));

        return CoreUtils.allPromises(promises);
    }

    /**
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @param file File to check.
     * @return Whether it's downloadable.
     */
    isFileDownloadable(file: CoreCourseModuleContentFile): boolean {
        return file.type === 'file';
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
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
     * @param name Name of the book.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logView(id: number, chapterId?: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModBookViewBookWSParams = {
            bookid: id,
            chapterid: chapterId,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_book_view_book',
            params,
            AddonModBookProvider.COMPONENT,
            id,
            name,
            'book',
            { chapterid: chapterId },
            siteId,
        );
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
export type AddonModBookBookWSData = {
    id: number; // Book id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Book name.
    intro: string; // The Book intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    numbering: number; // Book numbering configuration.
    navstyle: number; // Book navigation style configuration.
    customtitles: number; // Book custom titles type.
    revision?: number; // Book revision.
    timecreated?: number; // Time of creation.
    timemodified?: number; // Time of last modification.
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
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
