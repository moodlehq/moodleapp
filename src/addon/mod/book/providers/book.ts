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
import { Http, Response } from '@angular/http';
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

/**
 * A book chapter inside the toc list.
 */
export interface AddonModBookTocChapter {
    /**
     * ID to identify the chapter.
     * @type {string}
     */
    id: string;

    /**
     * Chapter's title.
     * @type {string}
     */
    title: string;

    /**
     * The chapter's level.
     * @type {number}
     */
    level: number;
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
 * Service that provides some features for books.
 */
@Injectable()
export class AddonModBookProvider {
    static COMPONENT = 'mmaModBook';

    protected ROOT_CACHE_KEY = 'mmaModBook:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private fileProvider: CoreFileProvider, private filepoolProvider: CoreFilepoolProvider, private http: Http,
            private utils: CoreUtilsProvider, private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModBookProvider');
    }

    /**
     * Get a book by course module ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the book is retrieved.
     */
    getBook(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.getBookByField(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Get a book with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the book is retrieved.
     */
    protected getBookByField(courseId: number, key: string, value: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getBookDataCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_book_get_books_by_courses', params, preSets).then((response) => {
                // Search the book.
                if (response && response.books) {
                    for (const i in response.books) {
                        const book = response.books[i];
                        if (book[key] == value) {
                            return book;
                        }
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get book data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getBookDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'book:' + courseId;
    }

    /**
     * Gets a chapter contents.
     *
     * @param {AddonModBookContentsMap} contentsMap Contents map returned by getContentsMap.
     * @param {string} chapterId Chapter to retrieve.
     * @param {number} moduleId The module ID.
     * @return {Promise<string>} Promise resolved with the contents.
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
            return Promise.resolve(this.sitesProvider.getCurrentSite().fixPluginfileURL(indexUrl));
        }

        return promise.then((url) => {
            // Fetch the URL content.
            const promise = this.http.get(url).toPromise();

            return promise.then((response: Response): any => {
                const content = response.text();
                if (typeof content !== 'string') {
                    return Promise.reject(null);
                } else {
                    // Now that we have the content, we update the SRC to point back to the external resource.
                    return this.domUtils.restoreSourcesInHtml(content, contentsMap[chapterId].paths);
                }
            });
        });
    }

    /**
     * Convert an array of book contents into an object where contents are organized in chapters.
     * Each chapter has an indexUrl and the list of contents in that chapter.
     *
     * @param {any[]} contents The module contents.
     * @return {AddonModBookContentsMap} Contents map.
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
     * @param {AddonModBookTocChapter[]} chapters The chapters list.
     * @return {string} The chapter id.
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
     * @param {AddonModBookTocChapter[]} chapters The chapters list.
     * @param {string} chapterId The current chapter.
     * @return {string} The next chapter id.
     */
    getNextChapter(chapters: AddonModBookTocChapter[], chapterId: string): string {
        let next = '0';

        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].id == chapterId) {
                if (typeof chapters[i + 1] != 'undefined') {
                    next = chapters[i + 1].id;
                    break;
                }
            }
        }

        return next;
    }

    /**
     * Get the previous chapter to the given one.
     *
     * @param {AddonModBookTocChapter[]} chapters The chapters list.
     * @param {string} chapterId The current chapter.
     * @return {string} The next chapter id.
     */
    getPreviousChapter(chapters: AddonModBookTocChapter[], chapterId: string): string {
        let previous = '0';

        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].id == chapterId) {
                break;
            }
            previous = chapters[i].id;
        }

        return previous;
    }

    /**
     * Get the book toc as an array.
     *
     * @param {any[]} contents The module contents.
     * @return {any[]} The toc.
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
     * @param {any[]} contents The module contents.
     * @return {AddonModBookTocChapter[]} The toc as a list.
     */
    getTocList(contents: any[]): AddonModBookTocChapter[] {
        const chapters = [],
            toc = this.getToc(contents);

        toc.forEach((chapter) => {
            // Add the chapter to the list.
            let chapterId = chapter.href.replace('/index.html', '');
            chapters.push({id: chapterId, title: chapter.title, level: chapter.level});

            if (chapter.subitems) {
                // Add all the subchapters to the list.
                chapter.subitems.forEach((subChapter) => {
                    chapterId = subChapter.href.replace('/index.html', '');
                    chapters.push({id: chapterId, title: subChapter.title, level: subChapter.level});
                });
            }
        });

        return chapters;
    }

    /**
     * Invalidates book data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateBookData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getBookDataCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId Course ID of the module.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
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
     * @param {any} file File to check.
     * @return {boolean} Whether it's downloadable.
     */
    isFileDownloadable(file: any): boolean {
        return file.type === 'file';
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canDownloadFiles();
        });
    }

    /**
     * Report a book as being viewed.
     *
     * @param {number} id Module ID.
     * @param {string} chapterId Chapter ID.
     * @param {string} [name] Name of the book.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
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
