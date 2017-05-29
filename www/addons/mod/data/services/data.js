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
 * Data service.
 *
 * @module mm.addons.mod_data
 * @ngdoc controller
 * @name $mmaModData
 */
.factory('$mmaModData', function($q, $mmSitesManager, mmaModDataComponent, $mmFilepool) {
    var self = {};

    /**
     * Get cache key for database data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getDatabaseDataCacheKey(courseId) {
        return 'mmaModData:data:' + courseId;
    }

    /**
     * Get prefix cache key for all database activity data WS calls.
     *
     * @param {Number} dataId   Data ID.
     * @return {String}         Cache key.
     */
    function getDatabaseDataPrefixCacheKey(dataId) {
        return 'mmaModData:' + dataId;
    }

    /**
     * Get cache key for database access information data WS calls.
     *
     * @param {Number} dataId   Data ID.
     * @return {String}         Cache key.
     */
    function getDatabaseAccessInformationDataCacheKey(dataId) {
        return getDatabaseDataPrefixCacheKey(dataId) + ':access';
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the database WS are available.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_data_get_databases_by_courses') &&
                site.wsAvailable('mod_data_get_data_access_information');
        });
    };

    /**
     * Get a database with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {String}     [siteId]        Site ID. If not defined, current site.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the database is retrieved.
     */
    function getDatabase(courseId, key, value, siteId, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getDatabaseDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_data_get_databases_by_courses', params, preSets).then(function(response) {
                if (response && response.databases) {
                    for (var x in response.databases) {
                        if (response.databases[x][key] == value) {
                            return response.databases[x];
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a database by course module ID.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getDatabase
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmId            Course module ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getDatabase = function(courseId, cmId, siteId, forceCache) {
        return getDatabase(courseId, 'coursemodule', cmId, siteId, forceCache);
    };

    /**
     * Get a database by ID.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getDatabaseById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    id              Data ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getDatabaseById = function(courseId, id, siteId, forceCache) {
        return getDatabase(courseId, 'id', id, siteId, forceCache);
    };

    /**
     * Invalidates database data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateDatabaseData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the database is invalidated.
     */
    self.invalidateDatabaseData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getDatabaseDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates database data except files and module info.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateDatabaseWSData
     * @param  {Number} databaseId   Data ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateDatabaseWSData = function(databaseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getDatabaseDataPrefixCacheKey(databaseId));

        });
    };

    /**
     * Get  access information for a given database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getDatabaseAccessInformation
     * @param   {Number}    dataId          Data ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getDatabaseAccessInformation = function(dataId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    databaseid: dataId
                },
                preSets = {
                    cacheKey: getDatabaseAccessInformationDataCacheKey(dataId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_data_get_data_access_information', params, preSets);
        });
    };

    /**
     * Invalidates database access information data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateDatabaseAccessInformationData
     * @param {Number} dataId       Data ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateDatabaseAccessInformationData = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getDatabaseAccessInformationDataCacheKey(dataId));
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModData#invalidateFiles.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getDatabase(courseId, moduleId, siteId, true).then(function(data) {
            var ps = [];
            // Do not invalidate database data before getting database info, we need it!
            ps.push(self.invalidateDatabaseData(courseId, siteId));
            ps.push(self.invalidateDatabaseWSData(data.id, siteId));

            return $q.all(ps);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateFiles
     * @param {Number} moduleId  The module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the files are invalidated.
     */
    self.invalidateFiles = function(moduleId, siteId) {
        return $mmFilepool.invalidateFilesByComponent(siteId, mmaModDataComponent, moduleId);
    };

    /**
     * Report the database as being viewed.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#logView
     * @param {String}  id       Data ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                databaseid: id
            };
            return site.write('mod_data_view_database', params);
        });
    };

    return self;
});
