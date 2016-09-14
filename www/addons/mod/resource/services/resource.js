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
.factory('$mmaModResource', function($mmFilepool, $mmSite, $mmUtil, $mmFS, $http, $log, $q, $sce, $mmApp, $mmSitesManager,
            mmaModResourceComponent, mmCoreNotDownloaded, mmCoreDownloading, mmCoreDownloaded) {
    $log = $log.getInstance('$mmaModResource');

    var self = {};

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
                paths[decodeURIComponent(fullpath)] = url;
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
     * Whether the resource has to be displayed in an iframe.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResource#isDisplayedInIframe
     * @param {Object} module The module object.
     * @return {Boolean}
     */
    self.isDisplayedInIframe = function(module) {
        if (!module.contents.length) {
            return false;
        }
        var ext = $mmFS.getFileExtension(module.contents[0].filename);

        return (ext === 'htm' || ext === 'html') && $mmFS.isAvailable();
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
        siteId = siteId || $mmSite.getId();

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

        var files = [contents[0]],
            siteId = $mmSite.getId(),
            revision = $mmFilepool.getRevisionFromFileList(files),
            timeMod = $mmFilepool.getTimemodifiedFromFileList(files),
            component = mmaModResourceComponent,
            url = contents[0].fileurl,
            fixedUrl = $mmSite.fixPluginfileURL(url),
            promise;

        if ($mmFS.isAvailable()) {
            // The file system is available.
            promise = $mmFilepool.getPackageStatus(siteId, component, moduleId, revision, timeMod).then(function(status) {
                var isWifi = !$mmApp.isNetworkAccessLimited(),
                    isOnline = $mmApp.isOnline();

                if (status === mmCoreDownloaded) {
                    // Get the local file URL.
                    return $mmFilepool.getUrlByUrl(siteId, url, component, moduleId, timeMod);
                } else if (status === mmCoreDownloading) {
                    // Return the online URL.
                    return fixedUrl;
                } else {
                    if (!isOnline && status === mmCoreNotDownloaded) {
                        // Not downloaded and we're offline, reject.
                        return $q.reject();
                    }

                    return $mmFilepool.shouldDownloadBeforeOpen(fixedUrl, contents[0].filesize).then(function() {
                        // Download and then return the local URL.
                        return $mmFilepool.downloadPackage(siteId, files, component, moduleId, revision, timeMod).then(function() {
                            return $mmFilepool.getUrlByUrl(siteId, url, component, moduleId, timeMod);
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
                            return $mmFilepool.getUrlByUrl(siteId, url, component, moduleId, timeMod);
                        }
                    });
                }
            });
        } else {
            // We use the live URL.
            promise = $q.when(fixedUrl);
        }

        return promise.then(function(url) {
            if (url.indexOf('http') === 0) {
                return $mmUtil.openOnlineFile(url);
            } else {
                return $mmUtil.openFile(url);
            }
        });
    };

    return self;
});
