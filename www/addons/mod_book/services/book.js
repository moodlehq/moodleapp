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
.factory('$mmaModBook', function($mmFilepool, $mmSite, $mmFS, $http, $log, $q, mmaModBookComponent) {
    $log = $log.getInstance('$mmaModBook');

    var self = {};

    /**
     * Download all the content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#downloadAllContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    self.downloadAllContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.downloadPackage($mmSite.getId(), files, mmaModBookComponent, module.id, revision, timemod);
    };

    /**
     * Get event names of files being downloaded.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getDownloadingFilesEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Resolved with an array of event names.
     */
    self.getDownloadingFilesEventNames = function(module) {
        var promises = [],
            eventNames = [],
            siteid = $mmSite.getId();

        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (!self.isFileDownloadable(content)) {
                return;
            }
            promises.push($mmFilepool.isFileDownloadingByUrl(siteid, url).then(function() {
                return $mmFilepool.getFileEventNameByUrl(siteid, url).then(function(eventName) {
                    eventNames.push(eventName);
                });
            }, function() {
                // Ignore fails.
            }));
        });

        return $q.all(promises).then(function() {
            return eventNames;
        });
    };

    /**
     * Returns a list of file event names.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getFileEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Promise resolved with array of $mmEvent names.
     */
    self.getFileEventNames = function(module) {
        var promises = [];
        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (!self.isFileDownloadable(content)) {
                return;
            }
            promises.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
        });
        return $q.all(promises).then(function(eventNames) {
            return eventNames;
        });
    };

    /**
     * Returns a list of files that can be downloaded.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getDownloadableFiles
     * @param {Object} module The module object returned by WS.
     * @return {Object[]}     List of files.
     */
    self.getDownloadableFiles = function(module) {
        var files = [];

        angular.forEach(module.contents, function(content) {
            if (self.isFileDownloadable(content)) {
                files.push(content);
            }
        });

        return files;
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
     * @param {Object} contents     The module contents.
     * @param {String} chapterId    Chapter to retrieve.
     * @param {Integer} moduleId    The module ID.
     * @return {Promise}
     */
    self.getChapterContent = function(contents, chapterId, moduleId) {
        var indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content) {
            if (self.isFileDownloadable(content)) {
                var key,
                    url = content.fileurl;

                if (!indexUrl && content.filename == 'index.html') {
                    // First chapter, we don't have a chapter id.
                    if (content.filepath == "/" + chapterId + "/") {
                        indexUrl = url;
                    }
                } else {
                    key = content.filename;
                    paths[key] = url;
                }
            }
        });

        // Promise handling when we are in a browser.
        promise = (function() {
            var deferred;
            if (!indexUrl) {
                // If ever that happens.
                $log.debug('Could not locate the index chapter');
                return $q.reject();
            } else if ($mmFS.isAvailable()) {
                // The file system is available.
                return $mmFilepool.downloadUrl($mmSite.getId(), indexUrl, false, mmaModBookComponent, moduleId);
            } else {
                // We return the live URL.
                deferred = $q.defer();
                deferred.resolve($mmSite.fixPluginfileURL(indexUrl));
                return deferred.promise;
            }
        })();

        return promise.then(function(url) {
            // Fetch the URL content.
            return $http.get(url).then(function(response) {
                if (typeof response.data !== 'string') {
                    return $q.reject();
                } else {
                    // Now that we have the content, we update the SRC to point back to
                    // the external resource. That will be caught by mm-format-text.
                    var html = angular.element('<div>');
                    html.html(response.data);
                    angular.forEach(html.find('img'), function(img) {
                        var src = paths[decodeURIComponent(img.getAttribute('src'))];
                        if (typeof src !== 'undefined') {
                            img.setAttribute('src', src);
                        }
                    });
                    // We do the same for links.
                    angular.forEach(html.find('a'), function(anchor) {
                        var href = paths[decodeURIComponent(anchor.getAttribute('href'))];
                        if (typeof href !== 'undefined') {
                            anchor.setAttribute('href', href);
                        }
                    });
                    return html.html();
                }
            });
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#invalidateContent
     * @param {Object} moduleId The module ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId) {
        return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModBookComponent, moduleId);
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
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        var version = $mmSite.getInfo().version;
        // Require Moodle 2.9.
        return version && (parseInt(version) >= 2015051100) && $mmSite.canDownloadFiles();
    };

    /**
     * Report a book as being viewed.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                bookid: id
            };
            return $mmSite.write('mod_book_view_book', params);
        }
        return $q.reject();
    };

    /**
     * Prefetch the content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#prefetchContent
     * @param {Object} module The module object returned by WS.
     * @return {Promise}      Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    self.prefetchContent = function(module) {
        var files = self.getDownloadableFiles(module),
            revision = $mmFilepool.getRevisionFromFileList(module.contents),
            timemod = $mmFilepool.getTimemodifiedFromFileList(module.contents);
        return $mmFilepool.prefetchPackage($mmSite.getId(), files, mmaModBookComponent, module.id, revision, timemod);
    };

    return self;
});
