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
.factory('$mmaModData', function($q, $mmSitesManager, mmaModDataComponent, $mmFilepool, $mmSite) {
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
     * Get prefix cache key for all database access information data WS calls.
     *
     * @param {Number} dataId   Data ID.
     * @return {String}         Cache key.
     */
    function getDatabaseAccessInformationDataPrefixCacheKey(dataId) {
        return getDatabaseDataPrefixCacheKey(dataId) + ':access:';
    }

    /**
     * Get cache key for database access information data WS calls.
     *
     * @param {Number} dataId   Data ID.
     * @param {Number} [groupId]  Group ID.
     * @return {String}         Cache key.
     */
    function getDatabaseAccessInformationDataCacheKey(dataId, groupId) {
        groupId = groupId || 0;
        return getDatabaseAccessInformationDataPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get prefix cache key for database all entries data WS calls.
     *
     * @param {Number} dataId     Data ID.
     * @return {String}           Cache key.
     */
    function getEntriesPrefixCacheKey(dataId) {
        return getDatabaseDataPrefixCacheKey(dataId) + ':entries:';
    }

    /**
     * Get cache key for database entries data WS calls.
     *
     * @param {Number} dataId     Data ID.
     * @param {Number} [groupId]  Group ID.
     * @return {String}           Cache key.
     */
    function getEntriesCacheKey(dataId, groupId) {
        groupId = groupId || 0;
        return getEntriesPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get cache key for database entry data WS calls.
     *
     * @param {Number} dataId     Data ID for caching purposes.
     * @param {Number} entryId    Entry ID.
     * @return {String}           Cache key.
     */
    function getEntryCacheKey(dataId, entryId) {
        return getDatabaseDataPrefixCacheKey(dataId) + ':entry:' + entryId;
    }

    /**
     * Get cache key for database fields data WS calls.
     *
     * @param {Number} dataId     Data ID.
     * @return {String}           Cache key.
     */
    function getFieldsCacheKey(dataId) {
        return getDatabaseDataPrefixCacheKey(dataId) + ':fields';
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
     * @param   {Number}    [groupId]       Group ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getDatabaseAccessInformation = function(dataId, groupId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    databaseid: dataId
                },
                preSets = {
                    cacheKey: getDatabaseAccessInformationDataCacheKey(dataId, groupId)
                };

            if (typeof groupId !== "undefined") {
                params.groupid = groupId;
            }

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
            return site.invalidateWsCacheForKeyStartingWith(getDatabaseAccessInformationDataPrefixCacheKey(dataId));
        });
    };

    /**
     * Get entries for a specific database and group.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getEntries
     * @param   {Number}    dataId          Data ID.
     * @param   {Number}    [groupId]       Group ID.
     * @param   {Number}    [sort]          Sort the records by this field id, reserved ids are:
     *                                          0: timeadded
     *                                          -1: firstname
     *                                          -2: lastname
     *                                          -3: approved
     *                                          -4: timemodified.
     *                                          Empty for using the default database setting.
     * @param   {String}    [order]         The direction of the sorting: 'ASC' or 'DESC'.
     *                                          Empty for using the default database setting.
     * @param   {Number}    [page]          Page of records to return.
     * @param   {Number}    [perPage]       Number of records to return per page.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param   {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getEntries = function(dataId, groupId, sort, order, page, perPage, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    databaseid: dataId,
                    returncontents: 1,
                    page: page || 0,
                    perpage: perPage || 0,
                    groupid: groupId || 0
                },
                preSets = {
                    cacheKey: getEntriesCacheKey(dataId, groupId)
                };

            if (typeof sort != "undefined") {
                params.sort = sort;
            }

            if (typeof order !== "undefined") {
                params.order = order;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_data_get_entries', params, preSets);
        });
    };

    /**
     * Invalidates database entries data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateEntriesData
     * @param {Number} dataId       Data ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateEntriesData = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getEntriesPrefixCacheKey(dataId));
        });
    };

    /**
     * Get an entry of the database activity.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getEntry
     * @param   {Number}    dataId          Data ID for caching purposes.
     * @param   {Number}    entryId         Entry ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the database entry is retrieved.
     */
    self.getEntry = function(dataId, entryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    entryid: entryId,
                    returncontents: 1
                },
                preSets = {
                    cacheKey: getEntryCacheKey(dataId, entryId)
                };

            return site.read('mod_data_get_entry', params, preSets);
        });
    };

    /**
     * Invalidates database entry data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateEntryData
     * @param  {Number}  dataId     Data ID for caching purposes.
     * @param  {Number}  entryId    Entry ID.
     * @param  {String}  [siteId]   Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateEntryData = function(dataId, entryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getEntryCacheKey(dataId, entryId));
        });
    };

    /**
     * Get the list of configured fields for the given database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#getFields
     * @param   {Number}    dataId          Data ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the database is retrieved.
     */
    self.getFields = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    databaseid: dataId
                },
                preSets = {
                    cacheKey: getFieldsCacheKey(dataId)
                };

            return site.read('mod_data_get_fields', params, preSets).then(function(response) {
                if (response && response.fields) {
                    return response.fields;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates database fields data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModData#invalidateFieldsData
     * @param {Number} dataId       Data ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateFieldsData = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getFieldsCacheKey(dataId));
        });
    };

    /**
     * Performs the whole fetch of the entries in the database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataPrefetchHandler#fetchAllEntries
     * @param  {Number}    dataId          Data ID.
     * @param  {Number}    [groupId]       Group ID.
     * @param  {Number}    [sort]          Sort the records by this field id. See $mmaModData#getEntries for more information.
     * @param  {String}    [order]         The direction of the sorting.  See $mmaModData#getEntries for more information.
     * @param  {Number}    [perPage]       Number of records to return per page. Default 10.
     * @param  {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}    [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                   Promise resolved when done.
     */
    self.fetchAllEntries = function(dataId, groupId, sort, order, perPage, forceCache, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();
        return fetchEntriesRecursive(dataId, groupId, sort, order, perPage, forceCache, ignoreCache, [], 0, siteId);
    };

    /**
     * Recursive call on fetch all entries.
     *
     * @param  {Number}    dataId          Data ID.
     * @param  {Number}    groupId         Group ID.
     * @param  {Number}    sort            Sort the records by this field id. See $mmaModData#getEntries for more information.
     * @param  {String}    order           The direction of the sorting.  See $mmaModData#getEntries for more information.
     * @param  {Number}    perPage         Number of records to return per page.
     * @param  {Boolean}   forceCache      True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {Array}     entries         Entries already fetch (just to concatenate them).
     * @param  {Number}    page            Page of records to return.
     * @param  {String}    siteId          Site ID.
     * @return {Promise}                   Promise resolved when done.
     */
    function fetchEntriesRecursive(dataId, groupId, sort, order, perPage, forceCache, ignoreCache, entries, page, siteId) {
        return self.getEntries(dataId, groupId, sort, order, page, perPage, forceCache, ignoreCache, siteId).then(function(result) {
            entries = entries.concat(result.entries);

            var canLoadMore = ((page + 1) * perPage) < result.totalcount;
            if (perPage && canLoadMore) {
                return fetchEntriesRecursive(dataId, groupId, sort, order, perPage, forceCache, ignoreCache, entries, page + 1,
                    siteId);
            }
            return entries;
        });
    }

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
