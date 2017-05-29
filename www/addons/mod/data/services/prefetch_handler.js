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
.factory('$mmaModDataPrefetchHandler', function($mmaModData, mmaModDataComponent, $mmFilepool, $q, $mmUtil, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModDataComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^entries|^gradeitems$|^outcomes$|^comments$|^ratings/;

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
        var files = [];
        return $mmaModData.getDatabase(courseId, module.id, siteId).then(function(database) {
            // Get intro files.
            files = self.getIntroFilesFromInstance(module, database);
            return files;
        }).catch(function() {
            // Any error, return the list we have.
            return files;
        });
    };

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
        // Prefetch the database data.
        return $mmaModData.getDatabase(courseId, module.id, siteId).then(function(database) {
            var promises = [];

            promises.push(self.getFiles(module, courseId, siteId).then(function(files) {
                return $mmFilepool.addFilesToQueueByUrl(siteId, files, self.component, module.id);
            }));

            promises.push($mmaModData.getDatabaseAccessInformation(database.id, false, true, siteId));

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
