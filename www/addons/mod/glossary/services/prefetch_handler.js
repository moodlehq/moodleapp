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

angular.module('mm.addons.mod_glossary')

/**
 * Mod glossary prefetch handler.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryPrefetchHandler
 */
.factory('$mmaModGlossaryPrefetchHandler', function($mmaModGlossary, mmaModGlossaryComponent, $mmFilepool, $mmSite, $q, $mmUser,
            mmCoreDownloading, mmCoreDownloaded, mmCoreOutdated, mmaModGlossaryLimitEntriesNum, $mmUtil, md5) {

    var self = {},
        downloadPromises = {}; // Store download promises to prevent duplicate requests.

    self.component = mmaModGlossaryComponent;

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#determineStatus
     * @param {String} status Current status.
     * @return {String}       Status to show.
     */
    self.determineStatus = function(status) {
        if (status === mmCoreDownloaded) {
            // Glossary are always marked as outdated because we can't tell if there's something new without
            // having to call all the WebServices. This will be improved in the future.
            return mmCoreOutdated;
        } else {
            return status;
        }
    };

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getDownloadSize
     * @param {Object} module   Module to get the size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId) {
        return self.getFiles(module, courseId).then(function(files) {
            return $mmUtil.sumFileSizes(files);
        }).catch(function() {
            return {size: -1, total: false};
        });
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), self.component, module.id);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        return $mmaModGlossary.getGlossary(courseId, module.id).then(function(glossary) {
            return $mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByLetter, [glossary.id, 'ALL'])
                    .then(function(entries) {
                return getFilesFromGlossaryEntries(glossary, entries);
            });
        }).catch(function() {
            // Glossary not found, return empty list.
            return [];
        });
    };

    /**
     * Get glossary intro files.
     *
     * @param  {Object}     glossary Glossary.
     * @return {Object[]}       Attachments.
     */
    function getIntroFiles(glossary) {
        if (typeof glossary.introfiles != 'undefined') {
            return glossary.introfiles;
        } else if (glossary.intro) {
            return $mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(glossary.intro);
        }
        return [];
    }

    /**
     * Get the list of downloadable files. It does not include entry embedded files.
     *
     * @param {Object}  glossary    Glossary
     * @param {Array}   entries     Entries of the Glossary.
     * @return {Array}              List of Files.
     */
    function getFilesFromGlossaryEntries(glossary, entries) {
        var files = getIntroFiles(glossary);
        // Get entries to get related files.
        angular.forEach(entries, function(entry) {
            files = files.concat($mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(entry.definition));
            files = files.concat(entry.attachments);
        });
        return files;
    }

    /**
     * Get revision of a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {String}         Revision.
     */
    self.getRevision = function(module, courseId) {
        // Right now glossaries are always shown as outdated because determining their status requires too many WS calls.
        // Return a fake revision since it won't be used. This will be improved in the future.
        return "0";
    };

    /**
     * Get timemodified of a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        // Right now glossaries are always shown as outdated because determining their status requires too many WS calls.
        // Return a fake timemodified since it won't be used. This will be improved in the future.
        return 0;
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return self.getGlossary(courseId, module.id).then(function(glossary) {
            var promises = [];

            promises.push(self.invalidateEntriesByLetter(glossary.id, 'ALL'));
            promises.push(self.invalidateCourseGlossaries(courseId));

            return $q.all(promises);
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModGlossary.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        var siteId = $mmSite.getId(),
            prefetchPromise,
            deleted = false,
            component = mmaModGlossaryComponent,
            revision,
            timemod;

        if (downloadPromises[siteId] && downloadPromises[siteId][module.id]) {
            // There's already a download ongoing for this package, return the promise.
            return downloadPromises[siteId][module.id];
        } else if (!downloadPromises[siteId]) {
            downloadPromises[siteId] = {};
        }

        // Mark package as downloading.
        prefetchPromise = $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloading).then(function() {

            // Now we can prefetch the glossary data.
            return $mmaModGlossary.getGlossary(courseId, module.id).then(function(glossary) {
                var promises = [];

                angular.forEach(glossary.browsemodes, function(mode) {
                    switch(mode) {
                        case 'letter': // Always done. Look bellow.
                        case 'cat': // Not implemented.
                            break;
                        case 'date':
                            promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByDate,
                                [glossary.id, 'CREATION', 'DESC']));
                            promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByDate,
                                [glossary.id, 'UPDATE', 'DESC']));
                            break;
                        case 'author':
                            promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByAuthor,
                                [glossary.id, 'ALL', 'LASTNAME', 'ASC']));
                            break;
                    }
                });

                // Fetch all entries to get information from.
                promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByLetter,[glossary.id, 'ALL'])
                        .then(function(entries) {
                    var promises = [],
                        files = getFilesFromGlossaryEntries(glossary, entries);

                    // Fetch user avatars.
                    angular.forEach(entries, function(entry) {
                        // Fetch individual entries.
                        promises.push($mmaModGlossary.getEntry(entry.id));

                        promises.push($mmUser.getProfile(entry.userid, courseId).then(function(profile) {
                            if (profile.profileimageurl) {
                                $mmFilepool.addToQueueByUrl(siteId, profile.profileimageurl);
                            }
                        }));
                    });

                    angular.forEach(files, function(file) {
                        promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, component, module.id, file.timemodified));
                    });

                    return $q.all(promises);
                }));

                // Get revision and timemodified.
                revision = self.getRevision(module, courseId);
                timemod = self.getTimemodified(module, courseId);

                return $q.all(promises);
            });
        }).then(function() {
            // Prefetch finished, mark as downloaded.
            return $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloaded, revision, timemod);
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

    /**
     * Remove module downloaded files.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#removeFiles
     * @param {Object} module   Module to remove the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.removeFiles = function(module, courseId) {
        return $mmFilepool.removeFilesByComponent($mmSite.getId(), self.component, module.id);
    };

    return self;
});
