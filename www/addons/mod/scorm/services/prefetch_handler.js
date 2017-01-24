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

angular.module('mm.addons.mod_scorm')

/**
 * Mod SCORM prefetch handler.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormPrefetchHandler
 */
.factory('$mmaModScormPrefetchHandler', function($mmaModScorm, $mmFS, $mmFilepool, $q, $mmSite, $mmPrefetchFactory, $mmLang,
    $mmaModScormOnline, mmaModScormComponent) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModScormComponent, false);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^tracks$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        return self.prefetchPackage(module, courseId, true, downloadOrPrefetchScorm, $mmSite.getId(), false);
    };

    /**
     * Download or prefetch a SCORM.
     *
     * @param  {Object} module    The module object returned by WS.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {Boolean} single   True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId    Site ID.
     * @param  {Boolean} prefetch True to prefetch, false to download right away.
     * @return {Promise}          Promise resolved with an object with 'revision' and 'timemod'.
     */
    function downloadOrPrefetchScorm(module, courseId, single, siteId, prefetch) {
        var scorm,
            deferred = $q.defer(); // Use a deferred to be able to notify.

        $mmaModScorm.getScorm(courseId, module.id, module.url, siteId).then(function(scormData) {
            scorm = scormData;

            var promises = [],
                introFiles = self.getIntroFilesFromInstance(module, scorm);

            // Download WS data.
            promises.push(self.downloadWSData(scorm, siteId).catch(function() {
                // If prefetchData fails we don't want to fail the whole download, so we'll ignore the error for now.
                // @todo Implement a warning system so the user knows which SCORMs have failed.
            }));

            // Download the package.
            promises.push(self._downloadOrPrefetchPackage(scorm, prefetch, siteId).then(undefined, undefined, deferred.notify));

            // Download intro files.
            angular.forEach(introFiles, function(file) {
                var promise;

                if (prefetch) {
                    promise = $mmFilepool.addToQueueByUrl(siteId, file.fileurl, self.component, module.id, file.timemodified);
                } else {
                    promise = $mmFilepool.downloadUrl(siteId, file.fileurl, false, self.component, module.id, file.timemodified);
                }

                promises.push(promise.catch(function() {
                    // Ignore errors for now.
                }));
            });

            return $q.all(promises);
        }).then(function() {
            // Return revision and timemodified.
            deferred.resolve({
                revision: scorm.sha1hash,
                timemod: 0
            });
        }).catch(deferred.reject);

        return deferred.promise;
    }

    /**
     * Downloads/Prefetches and unzips the SCORM package if it should be downloaded.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#_downloadOrPrefetchPackage
     * @param {Object} scorm     SCORM object returned by $mmaModScorm#getScorm.
     * @param {Boolean} prefetch True if prefetch, false otherwise.
     * @param {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the package is downloaded and unzipped. It will call notify in these cases:
     *                                   -File download in progress. Notify object will have these properties:
     *                                       packageDownload {Boolean} Always true.
     *                                       loaded {Number} Number of bytes of the package loaded.
     *                                       fileProgress {Object} FileTransfer's notify param for the current file.
     *                                   -Download or unzip starting. Notify object will have these properties:
     *                                       message {String} Message code related to the starting operation.
     *                                   -File unzip in progress. Notify object will have these properties:
     *                                       loaded {Number} Number of bytes unzipped.
     *                                       total {Number} Total of bytes of the ZIP file.
     * @protected
     */
    self._downloadOrPrefetchPackage = function(scorm, prefetch, siteId) {
        siteId = siteId || $mmSite.getId();

        var result = $mmaModScorm.isScormSupported(scorm);

        if (result !== true) {
            return $mmLang.translateAndReject(result);
        }

        // First verify that the file needs to be downloaded. It needs to be checked manually because the ZIP file
        // is deleted after unzipping, so the filepool will always download it.
        return $mmaModScorm.shouldDownloadMainFile(scorm, undefined, siteId).then(function(download) {
            if (download) {
                return downloadMainFile(scorm, prefetch, siteId);
            }
        });
    };

    /**
     * Downloads/Prefetches and unzips the SCORM package.
     *
     * @param {Object} scorm     SCORM object returned by $mmaModScorm#getScorm.
     * @param {Boolean} prefetch True if prefetch, false otherwise.
     * @param {String} siteId    Site ID.
     * @return {Promise}         Promise resolved when the file is downloaded and unzipped.
     *                           @see $mmaModScormPrefetchHandler#_downloadOrPrefetchPackage
     */
    function downloadMainFile(scorm, prefetch, siteId) {
        var dirPath,
            deferred = $q.defer(), // We use a deferred to be able to notify.
            packageUrl = $mmaModScorm.getPackageUrl(scorm);

        // Get the folder where the unzipped files will be.
        $mmaModScorm.getScormFolder(scorm.moduleurl).then(function(path) {
            dirPath = path;

            // Download the ZIP file to the filepool.
            // Using undefined for success & fail will pass the success/failure to the parent promise.
            deferred.notify({message: 'mm.core.downloading'});

            var promise;
            if (prefetch) {
                promise = $mmFilepool.addToQueueByUrl(siteId, packageUrl, self.component, scorm.coursemodule);
            } else {
                promise = $mmFilepool.downloadUrl(siteId, packageUrl, true, self.component, scorm.coursemodule);
            }

            return promise.then(undefined, undefined, function(progress) {
                // Format progress data.
                if (progress && progress.loaded) {
                    deferred.notify({
                        packageDownload: true,
                        loaded: progress.loaded,
                        fileProgress: progress
                    });
                }
            });
        }).then(function() {
            // Remove the destination folder to prevent having old unused files.
            return $mmFS.removeDir(dirPath).catch(function() {
                // Ignore errors, it might have failed because the folder doesn't exist.
            });
        }).then(function() {
            // Get the ZIP file path.
            return $mmFilepool.getFilePathByUrl(siteId, packageUrl);
        }).then(function(zippath) {
            // Unzip and delete the zip when finished.
            deferred.notify({message: 'mm.core.unzipping'});
            return $mmFS.unzipFile(zippath, dirPath).then(function() {
                return $mmFilepool.removeFileByUrl(siteId, packageUrl).catch(function() {
                    // Ignore errors.
                });
            }, undefined, deferred.notify);
        }).then(deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    /**
     * Downloads WS data for SCORM.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#downloadWSData
     * @param {Object} scorm    SCORM object returned by $mmaModScorm#getScorm.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is prefetched.
     */
    self.downloadWSData = function(scorm, siteId) {
        siteId = siteId || $mmSite.getId();
        var promises = [];

        // Prefetch number of attempts (including not completed).
        promises.push($mmaModScormOnline.getAttemptCount(siteId, scorm.id).catch(function() {
            // If it fails, assume we have no attempts.
            return 0;
        }).then(function(numAttempts) {
            if (numAttempts > 0) {
                // Get user data for each attempt.
                var datapromises = [],
                    attempts = [];

                // Fill an attempts array to be able to use forEach and prevent problems with attempt variable changing.
                for (var i = 1; i <= numAttempts; i++) {
                    attempts.push(i);
                }

                attempts.forEach(function(attempt) {
                    datapromises.push($mmaModScormOnline.getScormUserData(siteId, scorm.id, attempt).catch(function(err) {
                        // Ignore failures of all the attempts that aren't the last one.
                        if (attempt == numAttempts) {
                            return $q.reject(err);
                        }
                    }));
                });

                return $q.all(datapromises);
            } else {
                // No attempts. We'll still try to get user data to be able to identify SCOs not visible and so.
                return $mmaModScormOnline.getScormUserData(siteId, scorm.id, 0);
            }
        }));

        // Prefetch SCOs.
        promises.push($mmaModScorm.getScos(scorm.id, siteId));

        return $q.all(promises);
    };

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getDownloadSize
     * @param {Object}  module    Module to get the size.
     * @param {Number}  courseId  Course ID the module belongs to.
     * @return {Promise}          With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId) {
        return $mmaModScorm.getScorm(courseId, module.id, module.url).then(function(scorm) {
            if ($mmaModScorm.isScormSupported(scorm) !== true) {
                return {size: -1, total: false};
            } else if (!scorm.packagesize) {
                // We don't have package size, try to calculate it.
                return $mmaModScorm.calculateScormSize(scorm).then(function(size) {
                    return {size: size, total: true};
                });
            } else {
                return {size: scorm.packagesize, total: true};
            }
        });
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmaModScorm.getScorm(courseId, module.id, module.url).then(function(scorm) {
            // Get the folder where SCORM should be unzipped.
            return $mmaModScorm.getScormFolder(scorm.moduleurl);
        }).then(function(path) {
            return $mmFS.getDirectorySize(path);
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Promise}         Size.
     */
    self.getFiles = function(module, courseid) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
            return $mmaModScorm.getScormFileList(scorm);
        }).catch(function() {
            // SCORM not found, return empty list.
            return [];
        });
    };

    /**
     * Get revision of a SCORM (sha1hash).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getRevision = function(module, courseid) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
            return scorm.sha1hash;
        });
    };

    /**
     * Get timemodified of a SCORM. It always return 0, we don't use timemodified for SCORM packages.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getTimemodified = function(module, courseid) {
        return 0;
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModScorm.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModScorm.invalidateScormData(courseId);
    };

    /**
     * Check if a SCORM is downloadable.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModScorm.getScorm(courseId, module.id, module.url, false, true).then(function(scorm) {
            if (scorm.warningmessage) {
                // SCORM closed or not opened yet.
                return false;
            }
            if ($mmaModScorm.isScormSupported(scorm) !== true) {
                return false;
            }

            return true;
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModScorm.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId) {
        return self.prefetchPackage(module, courseId, true, downloadOrPrefetchScorm, $mmSite.getId(), true);
    };

    /**
     * Remove module downloaded files.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#removeFiles
     * @param {Object} module   Module to remove the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.removeFiles = function(module, courseId) {
        var siteId = $mmSite.getId(),
            scorm;

        return $mmaModScorm.getScorm(courseId, module.id, module.url).then(function(s) {
            scorm = s;

            // Get the folder where SCORM should be unzipped.
            return $mmaModScorm.getScormFolder(scorm.moduleurl);
        }).then(function(path) {
            var promises = [];

            // Remove the unzipped folder.
            promises.push($mmFS.removeDir(path).catch(function(error) {
                if (error && error.code == 1) {
                    // Not found, ignore error.
                } else {
                    return $q.reject(error);
                }
            }));

            // Maybe the ZIP wasn't deleted for some reason. Try to delete it too.
            promises.push($mmFilepool.removeFileByUrl(siteId, $mmaModScorm.getPackageUrl(scorm)).catch(function() {
                // Ignore errors.
            }));

            return $q.all(promises);
        });
    };

    return self;
});
