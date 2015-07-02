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
     * Fixes the URL before use.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#_fixUrl
     * @param  {String} url The URL to be fixed.
     * @return {String}     The fixed URL.
     * @protected
     */
    self._fixUrl = function(url) {
        url = $mmSite.fixPluginfileURL(url);
        return url;
    };

    /**
     * Returns a list of file event names.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#getFileEventNames
     * @param {Object} module The module object returned by WS.
     * @return {String[]} Array of $mmEvent names.
     */
    self.getFileEventNames = function(module) {
        var eventNames = [];
        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            url = self._fixUrl(content.fileurl);
            eventNames.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
        });
        return eventNames;
    };

    /**
     * Check the status of the files.
     *
     * Return those status in order of priority:
     * - $mmFilepool.FILENOTDOWNLOADED
     * - $mmFilepool.FILEDOWNLOADING
     * - $mmFilepool.FILEOUTDATED
     * - $mmFilepool.FILEDOWNLOADED
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModPage#getFilesStatus
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Resolved with an object containing the status and a list of event to observe.
     */
    self.getFilesStatus = function(module) {
        var promises = [],
            eventNames = [],
            notDownloaded = 0,
            downloading = 0,
            outdated = 0,
            downloaded = 0,
            fileCount = 0;

        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            fileCount++;
            url = self._fixUrl(content.fileurl);
            promises.push($mmFilepool.getFileStateByUrl($mmSite.getId(), url).then(function(state) {
                if (state == $mmFilepool.FILENOTDOWNLOADED) {
                    notDownloaded++;
                } else if (state == $mmFilepool.FILEDOWNLOADING) {
                    downloading++;
                    eventNames.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
                } else if (state == $mmFilepool.FILEDOWNLOADED) {
                    downloaded++;
                } else if (state == $mmFilepool.FILEOUTDATED) {
                    outdated++;
                }
            }));
        });

        function prepareResult() {
            var status = $mmFilepool.FILENOTDOWNLOADED;
            if (notDownloaded > 0) {
                status = $mmFilepool.FILENOTDOWNLOADED;
            } else if (downloading > 0) {
                status = $mmFilepool.FILEDOWNLOADING;
            } else if (outdated > 0) {
                status = $mmFilepool.FILEOUTDATED;
            } else if (downloaded == fileCount) {
                status = $mmFilepool.FILEDOWNLOADED;
            }
            return {status: status, eventNames: eventNames};
        }

        return $q.all(promises).then(function() {
            return prepareResult();
        }, function() {
            return prepareResult();
        });
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
        var deferred = $q.defer(),
            indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content) {
            if (content.type == 'file') {
                var key,
                    url = self._fixUrl(content.fileurl);

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
                deferred.resolve(indexUrl);
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
     * Prefetch the content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBook#prefetchContent
     * @param {Object} module The module object returned by WS.
     * @return {Void}
     */
    self.prefetchContent = function(module) {
        angular.forEach(module.contents, function(content) {
            var url;
            if (content.type !== 'file') {
                return;
            }
            url = self._fixUrl(content.fileurl);
            $mmFilepool.addToQueueByUrl($mmSite.getId(), url, mmaModBookComponent, module.id);
        });
    };

    return self;
});
