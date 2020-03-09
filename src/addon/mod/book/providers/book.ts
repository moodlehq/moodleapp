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
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSite } from '@classes/site';
import { CoreTagItem } from '@core/tag/providers/tag';
import { CoreWSProvider, CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

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

/**
 * Service that provides some features for books.
 */
@Injectable()
export class AddonModBookProvider {
    static COMPONENT = 'mmaModBook';

    protected ROOT_CACHE_KEY = 'mmaModBook:';
    protected logger;

    constructor(logger: CoreLoggerProvider,
            protected sitesProvider: CoreSitesProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected fileProvider: CoreFileProvider,
            protected filepoolProvider: CoreFilepoolProvider,
            protected wsProvider: CoreWSProvider,
            protected utils: CoreUtilsProvider,
            protected courseProvider: CoreCourseProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModBookProvider');
    }

    /**
     * Get a book by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the book is retrieved.
     */
    getBook(courseId: number, cmId: number, siteId?: string): Promise<AddonModBookBook> {
        return this.getBookByField(courseId, 'coursemodule', cmId, siteId);
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
    protected getBookByField(courseId: number, key: string, value: any, siteId?: string): Promise<AddonModBookBook> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getBookDataCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_book_get_books_by_courses', params, preSets)
                    .then((response: AddonModBookGetBooksByCoursesResult): any => {

                // Search the book.
                if (response && response.books) {
                    const book = response.books.find((book) => book[key] == value);
                    if (book) {
                        return book;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get book data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getBookDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'book:' + courseId;
    }

    /**
     * Gets a chapter contents.
     *
     * @param contentsMap Contents map returned by getContentsMap.
     * @param chapterId Chapter to retrieve.
     * @param moduleId The module ID.
     * @return Promise resolved with the contents.
     */
    getChapterContent(contentsMap: AddonModBookContentsMap, chapterId: string, moduleId: number): Promise<string> {
        const indexUrl = contentsMap[chapterId] ? contentsMap[chapterId].indexUrl : undefined,
            siteId = this.sitesProvider.getCurrentSiteId();
        let promise;

        if (!indexUrl) {
            // It shouldn't happen.
            this.logger.debug('Could not locate the index chapter');

            return Promise.reject(null);
        }

        if (this.fileProvider.isAvailable()) {
            promise = this.filepoolProvider.downloadUrl(siteId, indexUrl, false, AddonModBookProvider.COMPONENT, moduleId);
        } else {
            // We return the live URL.
            return this.sitesProvider.getCurrentSite().checkAndFixPluginfileURL(indexUrl);
        }

        return promise.then(async (url) => {
            const content = await this.wsProvider.getText(url);

            // Now that we have the content, we update the SRC to point back to the external resource.
            return this.domUtils.restoreSourcesInHtml(content, contentsMap[chapterId].paths);
        });
    }

    /**
     * Convert an array of book contents into an object where contents are organized in chapters.
     * Each chapter has an indexUrl and the list of contents in that chapter.
     *
     * @param contents The module contents.
     * @return Contents map.
     */
    getContentsMap(contents: any[]): AddonModBookContentsMap {
        const map: AddonModBookContentsMap = {};

        if (!contents) {
            return map;
        }

        contents.forEach((content) => {
            if (this.isFileDownloadable(content)) {
                let chapter,
                    matches,
                    split,
                    filepathIsChapter,
                    key;

                // Search the chapter number in the filepath.
                matches = content.filepath.match(/\/(\d+)\//);
                if (matches && matches[1]) {
                    chapter = matches[1];
                    filepathIsChapter = content.filepath == '/' + chapter + '/';

                    // Init the chapter if it's not defined yet.
                    map[chapter] = map[chapter] || { paths: {} };

                    if (content.filename == 'index.html' && filepathIsChapter) {
                        // Index of the chapter, set indexUrl and tags of the chapter.
                        map[chapter].indexUrl = content.fileurl;
                        map[chapter].tags = content.tags;
                    } else {
                        if (filepathIsChapter) {
                            // It's a file in the root folder OR the WS isn't returning the filepath as it should (MDL-53671).
                            // Try to get the path to the file from the URL.
                            split = content.fileurl.split('mod_book/chapter' + content.filepath);
                            key = split[1] || content.filename; // Use filename if we couldn't find the path.
                        } else {
                            // Remove the chapter folder from the path and add the filename.
                            key = content.filepath.replace('/' + chapter + '/', '') + content.filename;
                        }

                        map[chapter].paths[this.textUtils.decodeURIComponent(key)] = content.fileurl;
                    }
                }
            }
        });

        return map;
    }

    /**
     * Get the first chapter of a book.
     *
     * @param chapters The chapters list.
     * @return The chapter id.
     */
    getFirstChapter(chapters: AddonModBookTocChapter[]): string {
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
    getNextChapter(chapters: AddonModBookTocChapter[], chapterId: string): AddonModBookTocChapter {
        let next: AddonModBookTocChapter;

        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].id == chapterId) {
                if (typeof chapters[i + 1] != 'undefined') {
                    next = chapters[i + 1];
                    break;
                }
            }
        }

        return next;
    }

    /**
     * Get the previous chapter to the given one.
     *
     * @param chapters The chapters list.
     * @param chapterId The current chapter.
     * @return The next chapter.
     */
    getPreviousChapter(chapters: AddonModBookTocChapter[], chapterId: string): AddonModBookTocChapter {
        let previous: AddonModBookTocChapter;

        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].id == chapterId) {
                break;
            }
            previous = chapters[i];
        }

        return previous;
    }

    /**
     * Get the book toc as an array.
     *
     * @param contents The module contents.
     * @return The toc.
     */
    getToc(contents: any[]): any[] {
        if (!contents || !contents.length) {
            return [];
        }

        return this.textUtils.parseJSON(contents[0].content, []);
    }

    /**
     * Get the book toc as an array of chapters (not nested).
     *
     * @param contents The module contents.
     * @return The toc as a list.
     */
    getTocList(contents: any[]): AddonModBookTocChapter[] {
        // Convenience function to get chapter info.
        const getChapterInfo = (chapter: any, chapterNumber: number, previousNumber: string = ''): AddonModBookTocChapter => {
            chapter.hidden = !!parseInt(chapter.hidden, 10);

            const fullChapterNumber = previousNumber + (chapter.hidden ? 'x.' : chapterNumber + '.');

            return {
                id: chapter.href.replace('/index.html', ''),
                title: chapter.title,
                level: chapter.level,
                number: fullChapterNumber,
                hidden: chapter.hidden
            };
        };

        const chapters = [],
            toc = this.getToc(contents);

        let chapterNumber = 1;
        toc.forEach((chapter) => {
            const tocChapter = getChapterInfo(chapter, chapterNumber);

            // Add the chapter to the list.
            chapters.push(tocChapter);

            if (chapter.subitems) {
                let subChapterNumber = 1;
                // Add all the subchapters to the list.
                chapter.subitems.forEach((subChapter) => {
                    chapters.push(getChapterInfo(subChapter, subChapterNumber, tocChapter.number));
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
    invalidateBookData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getBookDataCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.invalidateBookData(courseId, siteId));
        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModBookProvider.COMPONENT, moduleId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @param file File to check.
     * @return Whether it's downloadable.
     */
    isFileDownloadable(file: any): boolean {
        return file.type === 'file';
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canDownloadFiles();
        });
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
    logView(id: number, chapterId: string, name?: string, siteId?: string): Promise<any> {
        const params = {
            bookid: id,
            chapterid: chapterId
        };

        return this.logHelper.logSingle('mod_book_view_book', params, AddonModBookProvider.COMPONENT, id, name, 'book',
                {chapterid: chapterId}, siteId);
    }
}

/**
 * A book chapter inside the toc list.
 */
export interface AddonModBookTocChapter {
    /**
     * ID to identify the chapter.
     */
    id: string;

    /**
     * Chapter's title.
     */
    title: string;

    /**
     * The chapter's level.
     */
    level: number;

    /**
     * The chapter is hidden.
     */
    hidden: boolean;

    /**
     * The chapter's number'.
     */
    number: string;
}

/**
 * Map of book contents. For each chapter it has its index URL and the list of paths of the files the chapter has. Each path
 * is identified by the relative path in the book, and the value is the URL of the file.
 */
export type AddonModBookContentsMap = {
    [chapter: string]: {
        indexUrl?: string,
        paths: {[path: string]: string},
        tags?: CoreTagItem[]
    }
};

/**
 * Book returned by mod_book_get_books_by_courses.
 */
export type AddonModBookBook = {
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
 * Result of WS mod_book_get_books_by_courses.
 */
export type AddonModBookGetBooksByCoursesResult = {
    books: AddonModBookBook[];
    warnings?: CoreWSExternalWarning[];
};
