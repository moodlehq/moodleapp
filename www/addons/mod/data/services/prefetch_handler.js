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

angular.module('mm.addons.mod_data')

/**
 * Mod data prefetch handler.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataPrefetchHandler
 */
.factory('$mmaModDataPrefetchHandler', function($mmaModData, mmaModDataComponent, $mmFilepool, $q, $mmUtil, $mmPrefetchFactory,
        $mmSite, $mmGroups, $mmCourse, $mmComments) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModDataComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^entries$|^gradeitems$|^outcomes$|^comments$|^ratings/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Database cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#getFiles
     * @param  {Object} module    Module to get the files.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return getDatabaseInfoHelper(module, courseId, true, undefined, undefined, siteId).then(function(info) {
            return info.files;
        });
    };

    /**
     * Helper function to get all database info just once.
     *
     * @param  {Object}  module         Module to get the files.
     * @param  {Number}  courseId       Course ID the module belongs to.
     * @param  {Boolean} [omitFail]     True to always return even if fails. Default false.
     * @param  {Boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean} [ignoreCache]  True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}  siteId         Site ID.
     * @return {Promise}                Promise resolved with the info fetched.
     */
    function getDatabaseInfoHelper(module, courseId, omitFail, forceCache, ignoreCache, siteId) {
        var database,
            groups = [],
            entries = [],
            files = [];

        return $mmaModData.getDatabase(courseId, module.id, siteId, forceCache).then(function(data) {
            files = self.getIntroFilesFromInstance(module, data);

            database = data;
            return $mmGroups.getActivityGroupInfo(module.id, false, undefined, siteId).then(function(groupInfo) {
                if (!groupInfo.groups || groupInfo.groups.length == 0) {
                    groupInfo.groups = [{id: 0}];
                }
                groups = groupInfo.groups;

                return getAllUniqueEntries(database.id, groups, forceCache, ignoreCache, siteId);
            });
        }).then(function(uniqueEntries) {
            entries = uniqueEntries;
            files = files.concat(getEntriesFiles(entries));

            return {
                database: database,
                groups: groups,
                entries: entries,
                files: files
            };
        }).catch(function(message) {
            if (omitFail) {
                // Any error, return the info we have.
                return {
                    database: database,
                    groups: groups,
                    entries: entries,
                    files: files
                };
            }
            return $q.reject(message);
        });
    }

    /**
     * Retrieves all the entries for all the groups and then returns only unique entries.
     *
     * @param  {Number}  dataId         Database Id.
     * @param  {Array}   groups         Array of groups in the activity.
     * @param  {Boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean} [ignoreCache]  True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}  siteId         Site ID.
     * @return {Promise}                All unique entries.
     */
    function getAllUniqueEntries(dataId, groups, forceCache, ignoreCache, siteId) {
        var promises = [];

        angular.forEach(groups, function(group) {
            promises.push($mmaModData.fetchAllEntries(dataId, group.id, undefined, undefined, undefined, forceCache,
                ignoreCache, siteId));
        });

        return $q.all(promises).then(function(responses) {
            var uniqueEntries = {};

            angular.forEach(responses, function(groupEntries) {
                angular.forEach(groupEntries, function(entry) {
                    uniqueEntries[entry.id] = entry;
                });
            });

            return uniqueEntries;
        });
    }

    /**
     * Returns the file contained in the entries.
     *
     * @param  {Array} entries  List of entries to get files from.
     * @return {Array}          List of files.
     */
    function getEntriesFiles(entries) {
        var files = [];

        angular.forEach(entries, function(entry) {
            angular.forEach(entry.contents, function(content) {
                files = files.concat(content.files);
            });
        });

        return files;
    }

    /**
     * Returns database intro files.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModData.getDatabase(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(database) {
            return self.getIntroFilesFromInstance(module, database);
        });
    };

    /**
     * Get revision of a data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        // Data will always be controlled using the getCourseUpdates.
        return 0;
    };

    /**
     * Get timemodified of a data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#getTimemodified
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        var siteId = $mmSite.getId();

        return $mmaModData.getDatabase(courseId, module.id, siteId).then(function(database) {
            var files = self.getIntroFilesFromInstance(module, database);

            return Math.max(database.timemodified || 0, $mmFilepool.getTimemodifiedFromFileList(files));
        }).catch(function() {
            return 0;
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModData.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModData.invalidateDatabaseData(courseId);
    };

    /**
     * Check if a database is downloadable.
     * A database isn't downloadable if it's not open yet.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModData.getDatabase(courseId, module.id, false, true).then(function(database) {
            return $mmaModData.getDatabaseAccessInformation(database.id).then(function(accessData) {
                // Check if database is restricted by time.
                if (!accessData.timeavailable) {
                    var time = $mmUtil.timestamp();

                    // It is restricted, checking times.
                    if (database.timeavailablefrom && time < database.timeavailablefrom) {
                        return false;
                    }
                    if (database.timeavailableto && time > database.timeavailableto) {
                        return false;
                    }
                }
                return true;
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModData.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchDatabase);
    };

    /**
     * Prefetch a database.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchDatabase(module, courseId, single, siteId) {
        siteId = siteId || $mmSite.getId();

        // Prefetch the database data.
        return getDatabaseInfoHelper(module, courseId, false, false, true, siteId).then(function(info) {
            var database = info.database,
                promises = [];

            promises.push($mmaModData.getFields(database.id, false, true, siteId));

            promises.push($mmFilepool.addFilesToQueueByUrl(siteId, info.files, self.component, module.id));

            angular.forEach(info.groups, function(group) {
               promises.push($mmaModData.getDatabaseAccessInformation(database.id, group.id, false, true, siteId));
            });

            angular.forEach(info.entries, function(entry) {
                promises.push($mmaModData.getEntry(database.id, entry.id, siteId));
                if (database.comments) {
                    promises.push($mmComments.getComments('module', database.coursemodule, 'mod_data', entry.id, 'database_entry',
                        0, siteId));
                }
            });

            // Add Basic Info to manage links.
            promises.push($mmCourse.getModuleBasicInfoByInstance(database.id, 'data', siteId));

            return $q.all(promises);
        }).then(function() {
            // Get revision and timemodified.

            var promises = [];
            promises.push(self.getRevision(module, courseId));
            promises.push(self.getTimemodified(module, courseId));

            // Return revision and timemodified.
            return $q.all(promises).then(function(list) {
                return {
                    revision: list[0],
                    timemod: list[1]
                };
            });
        });
    }

    return self;
});
