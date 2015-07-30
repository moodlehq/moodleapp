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
.factory('$mmaModResource', function($mmFilepool, $mmSite, $mmUtil, $mmFS, $http, $log, $q, $sce, $mmApp, mmaModResourceComponent) {
    $log = $log.getInstance('$mmaModResource');
    var self = {};

    /**
     * Download all the content. All the files are downloaded inside a folder in filepool, keeping their folder structure.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#downloadAllContent
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved when content is downloaded. Data returned is not reliable.
     */
    self.downloadAllContent = function(module) {
        var promises = [],
            siteId = $mmSite.getId();

        if (self.isDisplayedInIframe(module)) {
            // Get path of the module folder in filepool.
            return $mmFilepool.getFilePathByUrl(siteId, module.url).then(function(dirPath) {
                angular.forEach(module.contents, function(content) {
                    var fullpath,
                        url,
                        modified;
                    if (content.type !== 'file') {
                        return;
                    }

                    url = content.fileurl;
                    modified = content.timemodified;
                    fullpath = content.filename;
                    if (content.filepath !== '/') {
                        fullpath = content.filepath.substr(1) + fullpath;
                    }
                    fullpath = $mmFS.concatenatePaths(dirPath, fullpath);

                    promises.push($mmFilepool.downloadUrl(siteId, url, false, mmaModResourceComponent, module.id, modified, fullpath));
                });

                return $q.all(promises);
            });
        } else {
            // Usual filepool download, without folders.
            angular.forEach(module.contents, function(content) {
                var url = content.fileurl,
                    modified = content.timemodified;
                if (content.type !== 'file') {
                    return;
                }
                promises.push($mmFilepool.downloadUrl(siteId, url, false, mmaModResourceComponent, module.id, modified));
            });
            return $q.all(promises);
        }
    };

    /**
     * Get event names of files being downloaded.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getDownloadingFilesEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Resolved with an array of event names.
     */
    self.getDownloadingFilesEventNames = function(module) {
        var promises = [],
            eventNames = [],
            siteid = $mmSite.getId();

        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (content.type !== 'file') {
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
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getFileEventNames
     * @param {Object} module The module object returned by WS.
     * @return {Promise} Promise resolved with array of $mmEvent names.
     */
    self.getFileEventNames = function(module) {
        var promises = [];
        angular.forEach(module.contents, function(content) {
            var url = content.fileurl;
            if (content.type !== 'file') {
                return;
            }
            promises.push($mmFilepool.getFileEventNameByUrl($mmSite.getId(), url));
        });
        return $q.all(promises).then(function(eventNames) {
            return eventNames;
        });
    };

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getIframeSrc
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved with the iframe src.
     */
    self.getIframeSrc = function(module) {
        var mainFile = module.contents[0],
            mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        return $mmFilepool.getDirectoryUrlByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            return $mmFS.concatenatePaths(dirPath, mainFilePath);
        }, function() {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL.
            if ($mmApp.isOnline() && mainFile.fileurl) {
                // This URL is going to be injected in an iframe, we need this to make it work.
                return $sce.trustAsResourceUrl($mmSite.fixPluginfileURL(mainFile.fileurl));
            }
            return $q.reject();
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
            var url = content.fileurl,
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
                return $q.when($mmSite.fixPluginfileURL(indexUrl));
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
                        if (typeof url !== 'undefined') {
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
        var inline = self.isDisplayedInline(module);

        if (inline && $mmFS.isAvailable()) {
            for (var i = 0; i < module.contents.length; i++) {
                var ext = $mmUtil.getFileExtension(module.contents[i].filename);
                if (ext == 'js' || ext == 'swf' || ext == 'css') {
                    return true;
                }
            }
        }

        return false;
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
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                resourceid: id
            };
            return $mmSite.write('mod_resource_view_resource', params);
        }
        return $q.reject();
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
        var url = contents[0].fileurl,
            promise;

        if ($mmFS.isAvailable()) {
            // The file system is available.
            promise = $mmFilepool.downloadUrl($mmSite.getId(), url, false, mmaModResourceComponent, moduleId);
        } else {
            // We use the live URL.
            promise = $q.when($mmSite.fixPluginfileURL(url));
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
        if (self.isDisplayedInIframe(module)) {
            // Files need to be downloaded inside a folder in filepool, keeping their folder structure.
            var siteId = $mmSite.getId();
            // Get path of the module folder in filepool.
            $mmFilepool.getFilePathByUrl(siteId, module.url).then(function(dirPath) {
                angular.forEach(module.contents, function(content) {
                    var fullpath,
                        url,
                        modified;
                    if (content.type !== 'file') {
                        return;
                    }
                    url = content.fileurl;
                    modified = content.timemodified;
                    fullpath = content.filename;
                    if (content.filepath !== '/') {
                        fullpath = content.filepath.substr(1) + fullpath;
                    }
                    fullpath = $mmFS.concatenatePaths(dirPath, fullpath);

                    $mmFilepool.addToQueueByUrl(siteId, url, mmaModResourceComponent, module.id, modified, fullpath);
                });
            });
        } else {
            // Usual filepool download, without folders.
            angular.forEach(module.contents, function(content) {
                var url;
                if (content.type !== 'file') {
                    return;
                }
                url = content.fileurl;
                $mmFilepool.addToQueueByUrl($mmSite.getId(), url, mmaModResourceComponent, module.id);
            });
        }
    };

    return self;
});
