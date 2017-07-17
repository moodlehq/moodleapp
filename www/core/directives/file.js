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

angular.module('mm.core')

/**
 * Directive to handle a file (my files, attachments, etc.). The file is not downloaded automatically.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmFile
 * @description
 * Directive to handle files (my files, attachments, etc.). Shows the file name, icon (depending on mimetype) and a button
 * to download/refresh it.
 *
 * Attributes:
 * @param {Object} file                Required. Object with the following attributes:
 *                                         'filename': Name of the file.
 *                                         'fileurl' or 'url': File URL.
 *                                         'filesize': Optional. Size of the file.
 * @param {String} [component]         Component the file belongs to.
 * @param {Number} [componentId]       Component ID.
 * @param {Boolean} [timemodified]     If set, the value will be used to check if the file is outdated.
 * @param {Boolean} [canDelete]        True if file can be deleted, false otherwise.
 * @param {Function} [onDelete]        Function to call when the delete button is clicked.
 * @param {Boolean} [alwaysDownload]   True if refresh button should be shown even if the file is not outdated. Defaults to false.
 *                                     Use it for files that you cannot determine if they're outdated or not.
 * @param {Boolean} [canDownload=true] True if file can be downloaded, false otherwise. Defaults to true.
 * @param {Boolean} [noBorder=false]   True if want to show file entry without borders. Defaults to false.
 */
.directive('mmFile', function($q, $mmUtil, $mmFilepool, $mmSite, $mmApp, $mmEvents, $mmFS, mmCoreDownloaded, mmCoreDownloading,
            mmCoreNotDownloaded, mmCoreOutdated, $mmLang) {

    /**
     * Convenience function to get the file state and set scope variables based on it.
     *
     * @param  {Object} scope           Directive's scope.
     * @param  {String} siteId          Site ID.
     * @param  {String} fileUrl         File URL.
     * @param  {Number} [timeModified]  File's timemodified.
     * @param  {Boolean} alwaysDownload True to show refresh button even if the file is not outdated.
     * @return {Void}
     */
    function getState(scope, siteId, fileUrl, timeModified, alwaysDownload) {
        return $mmFilepool.getFileStateByUrl(siteId, fileUrl, timeModified).then(function(state) {
            var canDownload = $mmSite.canDownloadFiles();
            scope.isDownloaded = state === mmCoreDownloaded || state === mmCoreOutdated;
            scope.isDownloading = canDownload && state === mmCoreDownloading;
            scope.showDownload = canDownload && (state === mmCoreNotDownloaded || state === mmCoreOutdated ||
                    (alwaysDownload && state === mmCoreDownloaded));
        });
    }

    /**
     * Convenience function to download a file.
     *
     * @param  {Object} scope           Directive's scope.
     * @param  {String} siteId          Site ID.
     * @param  {String} fileUrl         File URL.
     * @param  {String} component       Component the file belongs to.
     * @param  {Number} componentId     Component ID.
     * @param  {Number} [timeModified]  File's timemodified.
     * @param  {Boolean} alwaysDownload True to show refresh button even if the file is not outdated.
     * @return {Promise}                Promise resolved when file is downloaded.
     */
    function downloadFile(scope, siteId, fileUrl, component, componentId, timeModified, alwaysDownload) {
        if (!$mmSite.canDownloadFiles()) {
            $mmUtil.showErrorModal('mm.core.cannotdownloadfiles', true);
            return $q.reject();
        }

        scope.isDownloading = true;
        return $mmFilepool.downloadUrl(siteId, fileUrl, false, component, componentId, timeModified, undefined, scope.file)
                .then(function(localUrl) {
            return localUrl;
        }).catch(function() {
            // Call getState to make sure we have the right state.
            return getState(scope, siteId, fileUrl, timeModified, alwaysDownload).then(function() {
                if (scope.isDownloaded) {
                    return $mmFilepool.getInternalUrlByUrl(siteId, fileUrl);
                } else {
                    return $q.reject();
                }
            });
        });
    }

    /**
     * Convenience function to open a file, downloading it if needed.
     *
     * @param  {Object} scope           Directive's scope.
     * @param  {String} siteId          Site ID.
     * @param  {String} fileUrl         File URL.
     * @param  {String} fileSize        File size.
     * @param  {String} component       Component the file belongs to.
     * @param  {Number} componentId     Component ID.
     * @param  {Number} [timeModified]  File's timemodified.
     * @param  {Boolean} alwaysDownload True to show refresh button even if the file is not outdated.
     * @return {Promise}               Promise resolved when file is opened.
     */
    function openFile(scope, siteId, fileUrl, fileSize, component, componentId, timeModified, alwaysDownload) {
        var fixedUrl = $mmSite.fixPluginfileURL(fileUrl),
            promise;

        if ($mmFS.isAvailable()) {
            promise = $q.when().then(function() {
                // The file system is available.
                var isWifi = !$mmApp.isNetworkAccessLimited(),
                    isOnline = $mmApp.isOnline();

                if (scope.isDownloaded && !scope.showDownload) {
                    // Get the local file URL.
                    return $mmFilepool.getUrlByUrl(siteId, fileUrl, component, componentId, timeModified, false, false, scope.file);
                } else {
                    if (!isOnline && !scope.isDownloaded) {
                        // Not downloaded and we're offline, reject.
                        return $q.reject();
                    }

                    var isDownloading = scope.isDownloading;
                    scope.isDownloading = true; // This check could take a while, show spinner.
                    return $mmFilepool.shouldDownloadBeforeOpen(fixedUrl, fileSize).then(function() {
                        if (isDownloading) {
                            // It's already downloading, stop.
                            return;
                        }
                        // Download and then return the local URL.
                        return downloadFile(scope, siteId, fileUrl, component, componentId, timeModified, alwaysDownload);
                    }, function() {
                        // Start the download if in wifi, but return the URL right away so the file is opened.
                        if (isWifi && isOnline) {
                            downloadFile(scope, siteId, fileUrl, component, componentId, timeModified, alwaysDownload);
                        }

                        if (isDownloading || !scope.isDownloaded || isOnline) {
                            // Not downloaded or outdated and online, return the online URL.
                            return fixedUrl;
                        } else {
                            // Outdated but offline, so we return the local URL.
                            return $mmFilepool.getUrlByUrl(siteId, fileUrl, component, componentId, timeModified,
                                    false, false, scope.file);
                        }
                    });
                }
            });
        } else {
            // We use the live URL.
            promise = $q.when(fixedUrl);
        }

        return promise.then(function(url) {
            if (!url) {
                return;
            }

            if (url.indexOf('http') === 0) {
                return $mmUtil.openOnlineFile(url).catch(function(error) {
                    // Error opening the file, some apps don't allow opening online files.
                    if (!$mmFS.isAvailable()) {
                        return $q.reject(error);
                    }

                    var subPromise;
                    if (scope.isDownloading) {
                        subPromise = $mmLang.translateAndReject('mm.core.erroropenfiledownloading');
                    } else if (status === mmCoreNotDownloaded) {
                        // File is not downloaded, download and then return the local URL.
                        subPromise = downloadFile(scope, siteId, fileUrl, component, componentId, timeModified, alwaysDownload);
                    } else {
                        // File is outdated and can't be opened in online, return the local URL.
                        subPromise = $mmFilepool.getInternalUrlByUrl(siteId, fileUrl);
                    }

                    return subPromise.then(function(url) {
                        return $mmUtil.openFile(url);
                    });
                });
            } else {
                return $mmUtil.openFile(url);
            }
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/file.html',
        scope: {
            file: '=',
            canDelete: '@?',
            onDelete: '&?',
            canDownload: '@?',
            noBorder : '@?'
        },
        link: function(scope, element, attrs) {
            var fileUrl = scope.file.fileurl || scope.file.url,
                fileName = scope.file.filename,
                fileSize = scope.file.filesize,
                timeModified = attrs.timemodified || 0,
                siteId = $mmSite.getId(),
                component = attrs.component,
                componentId = attrs.componentId,
                alwaysDownload = attrs.alwaysDownload && attrs.alwaysDownload !== 'false',
                canDownload = scope.canDownload !== false && scope.canDownload !== 'false',
                observer;

            if (!fileName) {
                // Invalid data received.
                return;
            }

            if (scope.file.isexternalfile) {
                alwaysDownload = true; // Always show the download button in external files.
            }

            scope.filename = fileName;
            scope.fileicon = $mmFS.getFileIcon(fileName);

            if (canDownload) {
                getState(scope, siteId, fileUrl, timeModified, alwaysDownload);

                // Update state when receiving events about this file.
                $mmFilepool.getFileEventNameByUrl(siteId, fileUrl).then(function(eventName) {
                    observer = $mmEvents.on(eventName, function() {
                        getState(scope, siteId, fileUrl, timeModified, alwaysDownload);
                    });
                });
            }

            scope.download = function(e, openAfterDownload) {
                e.preventDefault();
                e.stopPropagation();
                var promise;

                if (scope.isDownloading && !openAfterDownload) {
                    return;
                }

                if (!$mmApp.isOnline() && (!openAfterDownload || (openAfterDownload && !scope.isDownloaded))) {
                    $mmUtil.showErrorModal('mm.core.networkerrormsg', true);
                    return;
                }

                if (openAfterDownload) {
                    // File needs to be opened now. If file needs to be downloaded, skip the queue.
                    openFile(scope, siteId, fileUrl, fileSize, component, componentId, timeModified, alwaysDownload)
                            .catch(function(error) {
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                    });
                } else {
                    // File doesn't need to be opened (it's a prefetch). Show confirm modal if file size is defined and it's big.
                    promise = fileSize ? $mmUtil.confirmDownloadSize({size: fileSize, total: true}) : $q.when();
                    promise.then(function() {
                        // User confirmed, add the file to queue.
                        $mmFilepool.invalidateFileByUrl(siteId, fileUrl).finally(function() {
                            scope.isDownloading = true;
                            $mmFilepool.addToQueueByUrl(siteId, fileUrl, component, componentId, timeModified,
                                    undefined, 0, scope.file).catch(function(error) {
                                $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                            });
                        });
                    });
                }
            };

            if (scope.canDelete) {
                scope.delete = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (scope.onDelete) {
                        scope.onDelete();
                    }
                };
            }

            scope.$on('$destroy', function() {
                if (observer && observer.off) {
                    observer.off();
                }
            });
        }
    };
});
