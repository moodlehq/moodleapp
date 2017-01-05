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

angular.module('mm.addons.mod_book')

/**
 * Book factory.
 *
 * @module mm.addons.mod_book
 * @ngdoc service
 * @name $mmaModBook
 */
.factory('$mmaModBook', function($mmFilepool, $mmSite, $mmFS, $http, $log, $q, $mmSitesManager, $mmUtil, mmaModBookComponent,
            $mmCourse) {
    $log = $log.getInstance('$mmaModBook');

    var self = {};

    /**
     * Get cache key for book data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getBookDataCacheKey(courseId) {
        return 'mmaModBook:book:' + courseId;
    }

    /**
     * Get a book with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId    Site ID.
     * @param  {Number} courseId  Course ID.
     * @param  {String} key       Name of the property to check.
     * @param  {Mixed}  value     Value to search.
     * @return {Promise}          Promise resolved when the book is retrieved.
     */
    function getBook(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getBookDataCacheKey(courseId)
                };

            return site.read('mod_book_get_books_by_courses', params, preSets).then(function(response) {
                if (response && response.books) {
                    var currentBook;
                    angular.forEach(response.books, function(book) {
                        if (!currentBook && book[key] == value) {
                            currentBook = book;
                        }
                    });
                    if (currentBook) {
                        return currentBook;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a book by course module ID.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getBook
     * @param {Number} courseId Course ID.
     * @param {Number} cmId     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the book is retrieved.
     */
    self.getBook = function(courseId, cmId, siteId) {
        siteId = siteId || $mmSite.getId();
        return getBook(siteId, courseId, 'coursemodule', cmId);
    };

    /**
     * Get the book toc as an array.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getToc
     * @param  {array} contents The module contents.
     * @return {Array}          The toc.
     * @protected
     */
    self.getToc = function(contents) {
        if (!contents || !contents.length) {
            return [];
        }
        return JSON.parse(contents[0].content);
    };

    /**
     * Get the book toc as an array of chapters (no nested).
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getTocList
     * @param  {array} contents The module contents.
     * @return {Array}          The toc as a list.
     * @protected
     */
    self.getTocList = function(contents) {
        var chapters = [];
        var toc = self.getToc(contents);
        angular.forEach(toc, function(el) {
            var chapterId = el.href.replace('/index.html', '');
            chapters.push({id: chapterId, title: el.title, level: el.level});
            angular.forEach(el.subitems, function(sel) {
                chapterId = sel.href.replace('/index.html', '');
                chapters.push({id: chapterId, title: sel.title, level: sel.level});
            });
        });
        return chapters;
    };

    /**
     * Get the first chapter of a book.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getFirstChapter
     * @param  {array} chapters  The chapters list.
     * @return {String}          The chapter id.
     * @protected
     */
    self.getFirstChapter = function(chapters) {
        if (!chapters || !chapters.length) {
            return;
        }
        return chapters[0].id;
    };

    /**
     * Get the previous chapter to the given one.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getPreviousChapter
     * @param  {array} chapters     The chapters list.
     * @param  {String} chapterId   The current chapter.
     * @return {String}             The previous chapter id.
     * @protected
     */
    self.getPreviousChapter = function(chapters, chapterId) {
        var previous = 0;

        for (var i = 0, len = chapters.length; i < len; i++) {
            if (chapters[i].id == chapterId) {
                break;
            }
            previous = chapters[i].id;
        }

        return previous;
    };

    /**
     * Get the next chapter to the given one.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getNextChapter
     * @param  {array} chapters     The chapters list.
     * @param  {String} chapterId   The current chapter.
     * @return {String}             The next chapter id.
     * @protected
     */
    self.getNextChapter = function(chapters, chapterId) {
        var next = 0;

        for (var i = 0, len = chapters.length; i < len; i++) {
            if (chapters[i].id == chapterId) {
                if (typeof chapters[i + 1] != 'undefined') {
                    next = chapters[i + 1].id;
                    break;
                }
            }
        }
        return next;
    };

    /**
     * Gets a chapter contents from the book.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getChapterContent
     * @param {Object} contentsMap  Contents map returned by $mmaModBook#getContentsMap.
     * @param {String} chapterId    Chapter to retrieve.
     * @param {Integer} moduleId    The module ID.
     * @return {Promise}
     */
    self.getChapterContent = function(contentsMap, chapterId, moduleId) {
        var indexUrl = contentsMap[chapterId] ? contentsMap[chapterId].indexUrl : undefined,
            promise;

        if (!indexUrl) {
            // If ever that happens.
            $log.debug('Could not locate the index chapter');
            return $q.reject();
        }

        if ($mmFS.isAvailable()) {
            promise = $mmFilepool.downloadUrl($mmSite.getId(), indexUrl, false, mmaModBookComponent, moduleId);
        } else {
            // We return the live URL.
            return $q.when($mmSite.fixPluginfileURL(indexUrl));
        }

        return promise.then(function(url) {
            // Fetch the URL content.
            return $http.get(url).then(function(response) {
                if (typeof response.data !== 'string') {
                    return $q.reject();
                } else {
                    // Now that we have the content, we update the SRC to point back to
                    // the external resource. That will be caught by mm-format-text.
                    return $mmUtil.restoreSourcesInHtml(response.data, contentsMap[chapterId].paths);
                }
            });
        });
    };

    /**
     * Convert an array of book contents into an object where contents are organized in chapters.
     * Each chapter has an indexUrl and the list of contents in that chapter.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getContentsMap
     * @param {Object} contents The module contents.
     * @return {Object}         Contents map.
     */
    self.getContentsMap = function(contents) {
        var map = {};

        angular.forEach(contents, function(content) {
            if (self.isFileDownloadable(content)) {
                var chapter,
                    matches,
                    split,
                    filepathIsChapter;

                // Search the chapter number in the filepath.
                matches = content.filepath.match(/\/(\d+)\//);
                if (matches && matches[1]) {
                    chapter = matches[1];
                    filepathIsChapter = content.filepath == '/' + chapter + '/';

                    // Init the chapter if it's not defined yet.
                    map[chapter] = map[chapter] || { paths: {} };

                    if (content.filename == 'index.html' && filepathIsChapter) {
                        map[chapter].indexUrl = content.fileurl;
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
                        map[chapter].paths[decodeURIComponent(key)] = content.fileurl;
                    }
                }
            }
        });

        return map;
    };

    /**
     * Invalidates book data.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#invalidateBookData
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateBookData = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getBookDataCacheKey(courseId));
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [];

        promises.push(self.invalidateBookData(courseId, siteId));
        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModBookComponent, moduleId));
        promises.push($mmCourse.invalidateModule(moduleId, siteId));

        return $mmUtil.allPromises(promises);
    };

    /**
     * Check if a file is downloadable. The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return file.type === 'file';
    };

    /**
     * Return whether or not the plugin is enabled.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var version = site.getInfo().version;
            // Require Moodle 2.9.
            return version && (parseInt(version) >= 2015051100) && site.canDownloadFiles();
        });
    };

    /**
     * Report a book as being viewed.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#logView
     * @param {Number} id        Module ID.
     * @param {Number} chapterId Chapter ID.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logView = function(id, chapterId) {
        if (id) {
            var params = {
                bookid: id,
                chapterid: chapterId
            };
            return $mmSite.write('mod_book_view_book', params).then(function(response) {
                if (!response.status) {
                    return $q.reject();
                }
            });
        }
        return $q.reject();
    };

    return self;
});
