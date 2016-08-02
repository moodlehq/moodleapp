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

angular.module('mm.addons.mod_choice')

/**
 * Mod choice prefetch handler.
 *
 * @module mm.addons.mod_choice
 * @ngdoc service
 * @name $mmaModChoicePrefetchHandler
 */
.factory('$mmaModChoicePrefetchHandler', function($mmaModChoice, mmaModChoiceComponent, $mmFilepool, $mmSite, $q, $mmUtil,
            mmCoreDownloading, mmCoreDownloaded, mmCoreOutdated, $mmUser) {

    var self = {},
        downloadPromises = {}; // Store download promises to prevent duplicate requests.

    self.component = mmaModChoiceComponent;

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#determineStatus
     * @param {String} status Current status.
     * @return {String}       Status to show.
     */
    self.determineStatus = function(status) {
        if (status === mmCoreDownloaded) {
            // Choice are always marked as outdated because we can't tell if there's something new without
            // having to call all the WebServices. This will be improved in the future.
            return mmCoreOutdated;
        } else {
            return status;
        }
    };

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getDownloadSize
     * @param {Object} module   Module to get the size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadSize = function(module, courseId) {
        return self.getFiles(module, courseId).then(function(files) {
            var size = 1; // We start with 1 because 0 is treated as cannot calculate.

            for (var i = 0, len = files.length; i < len; i++) {
                var file = files[i];
                if (typeof file.filesize == 'undefined') {
                    // We don't have the file size, cannot calculate the size.
                    return 0;
                } else {
                    size += file.filesize;
                }
            }

            return size;
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        return $mmaModChoice.getChoice(courseId, module.id).then(function(choice) {
            return getFilesFromChoice(choice);
        }).catch(function() {
            // Choice not found, return empty list.
            return [];
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @param {Object} choice Choice.
     * @return {Object[]}     Files.
     */
    function getFilesFromChoice(choice) {
        if (typeof choice.introfiles != 'undefined') {
            return choice.introfiles;
        } else if (choice.intro) {
            return $mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(choice.intro);
        }
        return [];
    }

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModChoice.invalidateChoiceData(courseId);
    };

    /**
     * Check if a choice is downloadable.
     * A choice isn't downloadable if it's not open yet.
     * Closed choices are downloadable because teachers can always see the results.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModChoice.getChoice(courseId, module.id).then(function(choice) {
            var now = $mmUtil.timestamp();
            if (choice.timeopen && choice.timeopen > now) {
                return false;
            }
            return true;
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModChoice.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        var siteId = $mmSite.getId(),
            prefetchPromise,
            deleted = false,
            component = mmaModChoiceComponent;

        if (downloadPromises[siteId] && downloadPromises[siteId][module.id]) {
            // There's already a download ongoing for this package, return the promise.
            return downloadPromises[siteId][module.id];
        } else if (!downloadPromises[siteId]) {
            downloadPromises[siteId] = {};
        }

        // Mark package as downloading.
        prefetchPromise = $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloading).then(function() {
            // Now we can prefetch the choice data.
            return $mmaModChoice.getChoice(courseId, module.id);
        }).then(function(choice) {
            var promises = [],
                files = getFilesFromChoice(choice);

            // Prefetch files.
            angular.forEach(files, function(file) {
                promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, component, module.id, file.timemodified));
            });

            // Get the options and results.
            promises.push($mmaModChoice.getOptions(choice.id));
            promises.push($mmaModChoice.getResults(choice.id).then(function(options) {
                // If we can see the users that answered, prefetch their profile and avatar.
                var subPromises = [];
                angular.forEach(options, function(option) {
                    angular.forEach(option.userresponses, function(response) {
                        if (response.userid) {
                            subPromises.push($mmUser.getProfile(response.userid, courseId));
                        }
                        if (response.profileimageurl) {
                            subPromises.push($mmFilepool.addToQueueByUrl(siteId, response.profileimageurl).catch(function() {
                                // Ignore failures.
                            }));
                        }
                    });
                });
                return $q.all(subPromises);
            }));

            return $q.all(promises);
        }).then(function() {
            // Prefetch finished, mark as downloaded. We don't store revision and timemodified because
            // we'll always show choices as outdated since we cannot determine the right status without calling all WS.
            return $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloaded);
        }).catch(function(error) {
            // Error prefetching, go back to previous status and reject the promise.
            return $mmFilepool.setPackagePreviousStatus(siteId, component, module.id).then(function() {
                return $q.reject(error);
            });
        }).finally(function() {
            deleted = true;
            delete downloadPromises[siteId][module.id];
        });

        if (!deleted) {
            downloadPromises[siteId][module.id] = prefetchPromise;
        }
        return prefetchPromise;
    };

    return self;
});
