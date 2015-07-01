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

angular.module('mm.addons.mod_resource')

/**
 * Resource factory.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResource
 */
.factory('$mmaModResource', function($mmFilepool, $mmSite, $mmUtil, $mmFS, $http, $log, $q, mmaModResourceComponent) {
    $log = $log.getInstance('$mmaModResource');
    var self = {};

    /**
     * Download all the content.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#downloadAllContent
     * @param {Object} module The module object.
     * @return {Object}       Where keys are resource filepaths, and values are relative local paths.
     * @protected
     */
    self.downloadAllContent = function(module) {
        var promises = [];

        angular.forEach(module.contents, function(content) {
            var url,
                fullpath;
            if (content.type !== 'file') {
                return;
            }

            fullpath = content.filename;
            if (content.filepath !== '/') {
                fullpath = content.filepath.substr(1) + fullpath;
            }

            url = self._fixUrl(content.fileurl);
            promises.push($mmFilepool.downloadUrl($mmSite.getId(), url, false, mmaModResourceComponent, module.id)
            .then(function(internalUrl) {
                return [fullpath, $mmFilepool.getFilePathByUrl($mmSite.getId(), url)];
            }));
        });

        return $q.all(promises).then(function(files) {
            var filePaths = {};
            angular.forEach(files, function(file) {
                filePaths[file[0]] = file[1];
            });
            return filePaths;
        });
    };

    /**
     * Fixes the URL before use.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#_fixUrl
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
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getFileEventNames
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
     * @module mm.addons.mod_resource
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
     * Prepare the view of the module in an iframe, and returns the src.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getIframeSrc
     * @param {Object} module The module object.
     * @return {Promise}
     */
    self.getIframeSrc = function(module) {
        var mainFile = module.contents[0],
            mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        return self.downloadAllContent(module).then(function(filePaths) {
            return $mmUtil.getIframeSrc(filePaths, mainFilePath);
        });
    };

    /**
     * Gets the resource HTML.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getResourceHtml
     * @param {Object[]} contents Array of content objects.
     * @param {Number} moduleId The module ID.
     * @param {String} [target] The HTML file that the user wants to open, if not defined uses the main file.
     * @return {Promise}
     */
    self.getResourceHtml = function(contents, moduleId, target) {
        var deferred = $q.defer(),
            indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content, index) {
            var url = self._fixUrl(content.fileurl),
                fullpath = content.filename;

            if (content.filepath !== '/') {
                fullpath = content.filepath.substr(1) + fullpath;
            }

            if (typeof target !== 'undefined' && target == fullpath) {
                // We use another index.
                indexUrl = url;
            } else if (typeof target === 'undefined' && index === 0) {
                // We use the main page, it should always be the first one.
                indexUrl = url;
            } else {
                // Any other file in the resource.
                paths[fullpath] = url;
            }
        });

        // Promise handling when we are in a browser.
        promise = (function() {
            var deferred;
            if ($mmFS.isAvailable()) {
                // The file system is available.
                return $mmFilepool.downloadUrl($mmSite.getId(), indexUrl, false, mmaModResourceComponent, moduleId);
            } else {
                // We return the live URL.
                return $q.when(indexUrl);
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
                        html.append(response.data);

                    angular.forEach(html.find('img'), function(img) {
                        var src = paths[decodeURIComponent(img.getAttribute('src'))];
                        if (typeof src !== 'undefined') {
                            img.setAttribute('src', src);
                        }
                    });
                    // We do the same for links.
                    angular.forEach(html.find('a'), function(anchor) {
                        var href = decodeURIComponent(anchor.getAttribute('href')),
                            url = paths[href],
                            ext = $mmUtil.getFileExtension(href);
                        if (typeof href !== 'undefined') {
                            anchor.setAttribute('href', url);
                            if (ext == 'html' || ext == 'html') {
                                anchor.setAttribute('mma-mod-resource-html-link', 1);
                                anchor.setAttribute('data-href', href);
                            }
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
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#invalidateContent
     * @param {Number} moduleId The module ID.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId) {
        return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModResourceComponent, moduleId);
    };

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedInIframe
     * @param {Object} module The module object.
     * @return {Boolean}
     */
    self.isDisplayedInIframe = function(module) {
        var inline = self.isDisplayedInline(module),
            iframe = false;

        if (inline && $mmFS.isAvailable()) {
            angular.forEach(module.contents, function(file) {
                var ext = $mmUtil.getFileExtension(file.filename);
                iframe = iframe || (ext == 'js' || ext == 'swf' || ext == 'css');
            });
        }

        return iframe;
    };

    /**
     * Whether the resource is to be displayed inline (HTML).
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedInline
     * @param {Object} module The module object.
     * @return {Boolean}
     */
    self.isDisplayedInline = function(module) {
        var ext = $mmUtil.getFileExtension(module.contents[0].filename);
        return ext === 'htm' || ext === 'html';
    };

    /**
     * Report the resource as being viewed.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#logView
     * @param {Number} instanceId The instance ID of the module.
     * @return {Void}
     */
    self.logView = function(instanceId) {
        if (instanceId) {
            $mmSite.write('mod_resource_view_resource', {
                resourceid: instanceId
            });
        }
    };

    /**
     * Download and open the file from the resource.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#openFile
     * @param {Object[]} contents Array of content objects.
     * @param {Number} moduleId The module ID.
     * @return {Promise}
     */
    self.openFile = function(contents, moduleId) {
        var url = self._fixUrl(contents[0].fileurl),
            promise;

        if ($mmFS.isAvailable()) {
            // The file system is available.
            promise = $mmFilepool.downloadUrl($mmSite.getId(), url, false, mmaModResourceComponent, moduleId);
        } else {
            // We use the live URL.
            promise = $q.when(url);
        }

        return promise.then(function(localUrl) {
            $mmUtil.openFile(localUrl);
        });
    };

    /**
     * Prefetch the content.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#prefetchContent
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
            $mmFilepool.addToQueueByUrl($mmSite.getId(), url, mmaModResourceComponent, module.id);
        });
    };

    return self;
});
