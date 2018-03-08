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
.factory('$mmaModResource', function($mmFilepool, $mmSite, $mmUtil, $mmFS, $http, $log, $q, $sce, $mmApp, $mmSitesManager, $mmLang,
            $mmText, mmaModResourceComponent, mmCoreNotDownloaded, mmCoreDownloading, mmCoreDownloaded, $mmCourse) {
    $log = $log.getInstance('$mmaModResource');

    var self = {};

    /* Constants to determine how a resource should be displayed in Moodle. */
    // Try the best way.
    self.DISPLAY_AUTO = 0;
    // Display using object tag.
    self.DISPLAY_EMBED = 1;
    // Display inside frame.
    self.DISPLAY_FRAME = 2;
    // Display normal link in new window.
    self.DISPLAY_NEW = 3;
    // Force download of file instead of display.
    self.DISPLAY_DOWNLOAD = 4;
    // Open directly.
    self.DISPLAY_OPEN = 5;
    // Open in "emulated" pop-up without navigation.
    self.DISPLAY_POPUP = 6;

    /**
     * Get the HTML to display an embedded resource.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getEmbeddedHtml
     * @param {Object} module The module object.
     * @return {Promise}      Promise resolved with the iframe src.
     * @since 3.3
     */
    self.getEmbeddedHtml = function(module) {
        if (!module.contents || !module.contents.length) {
            return $q.reject();
        }

        var file = module.contents[0],
            ext = $mmFS.getFileExtension(file.filename);

        return treatResourceMainFile(file, module.id).then(function(result) {
            var type = $mmFS.getExtensionType(ext),
                mimeType = $mmFS.getMimeType(ext);

            if (type == 'image') {
                return '<img src="' + result.path + '"></img>';
            } else if (type == 'audio' || type == 'video') {
                return '<' + type + ' controls title="' + file.filename +'"" src="' + result.path + '">' +
                    '<source src="' + result.path + '" type="' + mimeType + '">' +
                    '</' + type +'>';
            } else {
                // Shouldn't reach here, the user should have called $mmFS#canBeEmbedded.
                return '';
            }
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
        if (!module.contents.length) {
            return $q.reject();
        }

        var mainFile = module.contents[0],
            mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        return $mmFilepool.getPackageDirUrlByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return $sce.trustAsResourceUrl($mmFS.concatenatePaths(dirPath, mainFilePath));
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
     *
     * @deprecated since version 2.10
     * This function was used to show resources inline
     */
    self.getResourceHtml = function(contents, moduleId, target) {
        var indexUrl,
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
                paths[$mmText.decodeURIComponent(fullpath)] = url;
            }
        });

        // Promise handling when we are in a browser.
        promise = (function() {
            if (!indexUrl) {
                // If ever that happens.
                $log.debug('Could not locate the index page');
                return $q.reject();
            }
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
                    return $mmUtil.restoreSourcesInHtml(response.data, paths, function(anchor, href) {
                        var ext = $mmFS.getFileExtension(href);
                        if (ext == 'html' || ext == 'html') {
                            anchor.setAttribute('mma-mod-resource-html-link', 1);
                            anchor.setAttribute('data-href', href);
                        }
                    });
                }
            });
        });
    };

    /**
     * Check if the file in the resource is an external file.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#hasExternalFile
     * @param {Object} module The module object.
     * @return {Boolean}      Whether it's a external file.
     */
    self.hasExternalFile = function(module) {
        return module && module.contents && module.contents[0] && module.contents[0].isexternalfile;
    };

    /**
     * Whether the resource has to be displayed embedded.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedEmbedded
     * @param {Object} module    The module object.
     * @param {Number} [display] The display mode (if available).
     * @return {Boolean}         Whether the resource should be displayed in an iframe.
     * @since 3.3
     */
    self.isDisplayedEmbedded = function(module, display) {
        if (!module.contents.length || !$mmFS.isAvailable()) {
            return false;
        }

        var ext = $mmFS.getFileExtension(module.contents[0].filename);
        return (display == self.DISPLAY_EMBED || display == self.DISPLAY_AUTO) && $mmFS.canBeEmbedded(ext);
    };

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedInIframe
     * @param {Object} module The module object.
     * @return {Boolean}      Whether the resource should be displayed in an iframe.
     */
    self.isDisplayedInIframe = function(module) {
        if (!module.contents.length || !$mmFS.isAvailable()) {
            return false;
        }

        var ext = $mmFS.getFileExtension(module.contents[0].filename),
            mimetype = $mmFS.getMimeType(ext);

        return mimetype == 'text/html';
    };

    /**
     * Whether the resource is to be displayed inline (HTML).
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedInline
     * @param {Object} module The module object.
     * @return {Boolean}
     *
     * @deprecated since version 2.10
     */
    self.isDisplayedInline = function(module) {
        return self.isDisplayedInIframe(module);
    };

    /**
     * Check if resource plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.canDownloadFiles();
        });
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
        if (!contents || !contents.length) {
            return $q.reject();
        }

        var siteId = $mmSite.getId(),
            file = contents[0],
            files = [file],
            component = mmaModResourceComponent,
            revision,
            timeMod;

        if (self.shouldOpenInBrowser(contents[0])) {
            if ($mmApp.isOnline()) {
                // Open in browser.
                var fixedUrl = $mmSite.fixPluginfileURL(file.fileurl).replace('&offline=1', '');
                fixedUrl = fixedUrl.replace(/forcedownload=\d+&/, ''); // Remove forcedownload when followed by another param.
                fixedUrl = fixedUrl.replace(/[\?|\&]forcedownload=\d+/, ''); // Remove forcedownload when not followed by any param.
                $mmUtil.openInBrowser(fixedUrl);

                if ($mmFS.isAvailable()) {
                    // Download the file if needed (file outdated or not downloaded).
                    // Download will be in background, don't return the promise.
                    revision = $mmFilepool.getRevisionFromFileList(files);
                    timeMod = $mmFilepool.getTimemodifiedFromFileList(files);
                    $mmFilepool.downloadPackage(siteId, files, component, moduleId, revision, timeMod);
                }

                return $q.when();
            } else {
                // Not online, get the offline file. It will fail if not found.
                return $mmFilepool.getInternalUrlByUrl(siteId, file.fileurl).then(function(path) {
                    return $mmUtil.openFile(path);
                }).catch(function() {
                    return $mmLang.translateAndReject('mm.core.networkerrormsg');
                });
            }
        }

        return treatResourceMainFile(file, moduleId).then(function(result) {
            if (result.path.indexOf('http') === 0) {
                return $mmUtil.openOnlineFile(result.path).catch(function(error) {
                    // Error opening the file, some apps don't allow opening online files.
                    if (!$mmFS.isAvailable()) {
                        return $q.reject(error);
                    }

                    var subPromise;
                    if (result.status === mmCoreDownloading) {
                        subPromise = $mmLang.translateAndReject('mm.core.erroropenfiledownloading');
                    } else if (result.status === mmCoreNotDownloaded) {
                        subPromise = $mmFilepool.downloadPackage(siteId, files, mmaModResourceComponent,
                                moduleId, result.revision, result.timemodified).then(function() {
                            return $mmFilepool.getInternalUrlByUrl(siteId, file.fileurl);
                        });
                    } else {
                        // File is outdated or stale and can't be opened in online, return the local URL.
                        subPromise = $mmFilepool.getInternalUrlByUrl(siteId, url);
                    }

                    return subPromise.then(function(path) {
                        return $mmUtil.openFile(path);
                    });
                });
            } else {
                return $mmUtil.openFile(result.path);
            }
        });
    };

    /**
     * Returns whether or not getResource WS available or not.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isGetResourceWSAvailable
     * @return {Boolean}
     */
    self.isGetResourceWSAvailable = function() {
        return $mmSite.wsAvailable('mod_resource_get_resources_by_courses');
    };

    /**
     * Get a resource data.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getResourceData
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @param  {String} key     Name of the property to check.
     * @param  {Mixed}  value   Value to search.
     * @return {Promise}        Promise resolved when the resource is retrieved.
     */
    function getResourceData(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getResourceCacheKey(courseId)
                };

            return site.read('mod_resource_get_resources_by_courses', params, preSets).then(function(response) {
                if (response && response.resources) {
                    var currentResource;
                    angular.forEach(response.resources, function(resource) {
                        if (!currentResource && resource[key] == value) {
                            currentResource = resource;
                        }
                    });
                    if (currentResource) {
                        return currentResource;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a resource by course module ID.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#getResource
     * @param {Number} courseId Course ID.
     * @param {Number} cmId     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the book is retrieved.
     */
    self.getResourceData = function(courseId, cmId, siteId) {
        return getResourceData(siteId, courseId, 'coursemodule', cmId);
    };

    /**
     * Get cache key for resource data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getResourceCacheKey(courseid) {
        return 'mmaModResource:resource:' + courseid;
    }

     /**
     * Invalidates resource data.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#invalidateResourceData
     * @param {Number} courseid Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateResourceData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getResourceCacheKey(courseId));
        });
    };

     /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [];

        promises.push(self.invalidateResourceData(courseId, siteId));
        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModResourceComponent, moduleId));
        promises.push($mmCourse.invalidateModule(moduleId, siteId));

        return $mmUtil.allPromises(promises);
    };

    /**
     * Whether the resource has to be opened in browser.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#shouldOpenInBrowser
     * @param {Object} file Module's main file.
     * @return {Boolean}    Whether the resource should be opened in browser.
     * @since 3.3
     */
    self.shouldOpenInBrowser = function(file) {
        if (!file || !file.isexternalfile || !file.mimetype) {
            return false;
        }

        var mimetype = file.mimetype;
        if (mimetype.indexOf('application/vnd.google-apps.') != -1) {
            // Google Docs file, always open in browser.
            return true;
        }

        if (file.repositorytype == 'onedrive') {
            // In OneDrive, open in browser the office docs
            return mimetype.indexOf('application/vnd.openxmlformats-officedocument') != -1 ||
                    mimetype == 'text/plain' || mimetype == 'document/unknown';
        }

        return false;
    };

    /**
     * Treat the main file of a resource, downloading it if needed and returning the URL to use and the status of the resource.
     *
     * @param  {Object} file     Resource's main file.
     * @param  {Number} moduleId The module ID.
     * @return {Promise}         Promise resolved with an object containing:
     *                               * fixedurl: The online URL of the main file, ready to be used.
     *                               * path: The URL to use; can be an online URL or an offline path.
     *                               * status: The status of the resource.
     *                               * revision: The resource revision.
     *                               * timemodified: The resource timemodified.
     */
    function treatResourceMainFile(file, moduleId) {
        var files = [file],
            siteId = $mmSite.getId(),
            revision = $mmFilepool.getRevisionFromFileList(files),
            timeMod = $mmFilepool.getTimemodifiedFromFileList(files),
            component = mmaModResourceComponent,
            url = file.fileurl,
            fixedUrl = $mmSite.fixPluginfileURL(url),
            result = {
                fixedurl: fixedUrl,
                revision: revision,
                timemodified: timeMod
            };

        if ($mmFS.isAvailable()) {
            // The file system is available.
            return $mmFilepool.getPackageStatus(siteId, component, moduleId, revision, timeMod).then(function(status) {
                result.status = status;

                var isWifi = !$mmApp.isNetworkAccessLimited(),
                    isOnline = $mmApp.isOnline();

                if (status === mmCoreDownloaded) {
                    // Get the local file URL.
                    return $mmFilepool.getInternalUrlByUrl(siteId, url);
                } else if (status === mmCoreDownloading && !$mmApp.isDesktop()) {
                    // Return the online URL.
                    return fixedUrl;
                } else {
                    if (!isOnline && status === mmCoreNotDownloaded) {
                        // Not downloaded and we're offline, reject.
                        return $q.reject();
                    }

                    return $mmFilepool.shouldDownloadBeforeOpen(fixedUrl, file.filesize).then(function() {
                        // Download and then return the local URL.
                        return $mmFilepool.downloadPackage(siteId, files, component, moduleId, revision, timeMod).then(function() {
                            return $mmFilepool.getInternalUrlByUrl(siteId, url);
                        });
                    }, function() {
                        // Start the download if in wifi, but return the URL right away so the file is opened.
                        if (isWifi && isOnline) {
                            $mmFilepool.downloadPackage(siteId, files, component, moduleId, revision, timeMod);
                        }

                        if (status === mmCoreNotDownloaded || isOnline) {
                            // Not downloaded or outdated and online, return the online URL.
                            return fixedUrl;
                        } else {
                            // Outdated but offline, so we return the local URL.
                            return $mmFilepool.getUrlByUrl(siteId, url, component, moduleId, timeMod, false, false, file);
                        }
                    });
                }
            }).then(function(path) {
                result.path = path;
                return result;
            });
        } else {
            // We use the live URL.
            result.path = fixedUrl;
            return $q.when(result);
        }
    }

    return self;
});
