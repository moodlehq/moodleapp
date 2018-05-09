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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFilepoolProvider } from '@providers/filepool';
import { AddonModDataOfflineProvider } from './offline';
import { CoreAppProvider } from '@providers/app';

/**
 * Service that provides some features for databases.
 */
@Injectable()
export class AddonModDataProvider {
    static COMPONENT = 'mmaModData';
    static PER_PAGE = 25;
    static ENTRY_CHANGED = 'addon_mod_data_entry_changed';

    protected ROOT_CACHE_KEY = AddonModDataProvider.COMPONENT + ':';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider, private dataOffline: AddonModDataOfflineProvider,
            private appProvider: CoreAppProvider) {
        this.logger = logger.getInstance('AddonModDataProvider');
    }

    /**
     * Adds a new entry to a database. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param   {number} dataId     Database ID.
     * @param   {any}    data       The fields data to be created.
     * @param   {number} [groupId]  Group id, 0 means that the function will determine the user group.
     * @param   {string} [siteId]   Site ID. If not defined, current site.
     * @return  {Promise<any>}      Promise resolved when the action is done.
     */
    addEntryOnline(dataId: number, data: any, groupId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    databaseid: dataId,
                    data: data
                };

            if (typeof groupId !== 'undefined') {
                params['groupid'] = groupId;
            }

            return site.write('mod_data_add_entry', params);
        });
    }

    /**
     * Approves or unapproves an entry.
     *
     * @param   {number}    dataId      Database ID.
     * @param   {number}    entryId     Entry ID.
     * @param   {boolean}   approve     Whether to approve (true) or unapprove the entry.
     * @param   {number}    courseId    Course ID.
     * @param   {string}    [siteId]    Site ID. If not defined, current site.
     * @return  {Promise<any>}          Promise resolved when the action is done.
     */
    approveEntry(dataId: number, entryId: number, approve: boolean, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = (): Promise<any> => {
            const action = approve ? 'approve' : 'disapprove';

            return this.dataOffline.saveEntry(dataId, entryId, action, courseId, null, null, null, siteId);
        };

        // Get if the opposite action is not synced.
        const oppositeAction = approve ? 'disapprove' : 'approve';

        return this.dataOffline.getEntry(dataId, entryId, oppositeAction, siteId).then(() => {
            // Found. Just delete the action.
            return this.dataOffline.deleteEntry(dataId, entryId, oppositeAction, siteId);
        }).catch(() => {

            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.approveEntryOnline(entryId, approve, siteId).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return storeOffline();
            });
        });
    }

    /**
     * Approves or unapproves an entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param   {number}    entryId  Entry ID.
     * @param   {boolean}   approve  Whether to approve (true) or unapprove the entry.
     * @param   {string}    [siteId] Site ID. If not defined, current site.
     * @return  {Promise<any>}       Promise resolved when the action is done.
     */
    approveEntryOnline(entryId: number, approve: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    entryid: entryId,
                    approve: approve ? 1 : 0
                };

            return site.write('mod_data_approve_entry', params);
        });
    }

    /**
     * Deletes an entry.
     *
     * @param   {number}    dataId     Database ID.
     * @param   {number}    entryId    Entry ID.
     * @param   {number}    courseId   Course ID.
     * @param   {string}    [siteId]   Site ID. If not defined, current site.
     * @return  {Promise<any>}         Promise resolved when the action is done.
     */
    deleteEntry(dataId: number, entryId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.dataOffline.saveEntry(dataId, entryId, 'delete', courseId, null, null, null, siteId);
        };

        let justAdded = false;

        // Check if the opposite action is not synced and just delete it.
        return this.dataOffline.getEntryActions(dataId, entryId, siteId).then((entries) => {
            if (entries && entries.length) {
                // Found. Delete other actions first.
                const proms = entries.map((entry) => {
                    if (entry.action == 'add') {
                        justAdded = true;
                    }

                    return this.dataOffline.deleteEntry(dataId, entryId, entry.action, siteId);
                });

                return Promise.all(proms);
            }
        }).then(() => {
            if (justAdded) {
                // The field was added offline, delete and stop.
                return;
            }

            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.deleteEntryOnline(entryId, siteId).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means that responses cannot be submitted.
                    return Promise.reject(error);
                }

                // Couldn't connect to server, store in offline.
                return storeOffline();
            });
        });
    }

    /**
     * Deletes an entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param   {number}  entryId  Entry ID.
     * @param   {string}  [siteId] Site ID. If not defined, current site.
     * @return  {Promise<any>}     Promise resolved when the action is done.
     */
    deleteEntryOnline(entryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    entryid: entryId
                };

            return site.write('mod_data_delete_entry', params);
        });
    }

    /**
     * Updates an existing entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param   {number}  entryId  Entry ID.
     * @param   {any}     data     The fields data to be updated.
     * @param   {string}  [siteId] Site ID. If not defined, current site.
     * @return  {Promise<any>}     Promise resolved when the action is done.
     */
    editEntryOnline(entryId: number, data: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    entryid: entryId,
                    data: data
                };

            return site.write('mod_data_update_entry', params);
        });
    }

    /**
     * Get cache key for data data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getDatabaseDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'data:' + courseId;
    }

    /**
     * Get prefix cache key for all database activity data WS calls.
     *
     * @param {number} dataId   Data ID.
     * @return {string}         Cache key.
     */
    protected getDatabaseDataPrefixCacheKey(dataId: number): string {
        return this.ROOT_CACHE_KEY + dataId;
    }

    /**
     * Get a database data. If more than one is found, only the first will be returned.
     *
     * @param {number}   courseId           Course ID.
     * @param {string}   key                Name of the property to check.
     * @param {any}      value              Value to search.
     * @param {string}   [siteId]           Site ID. If not defined, current site.
     * @param {boolean}  [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}  Promise resolved when the data is retrieved.
     */
    protected getDatabaseByKey(courseId: number, key: string, value: any, siteId?: string, forceCache: boolean = false):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getDatabaseDataCacheKey(courseId)
                };
            if (forceCache) {
                preSets['omitExpires'] = true;
            }

            return site.read('mod_data_get_databases_by_courses', params, preSets).then((response) => {
                if (response && response.databases) {
                    const currentData = response.databases.find((data) => data[key] == value);
                    if (currentData) {
                        return currentData;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a data by course module ID.
     *
     * @param {number}   courseId           Course ID.
     * @param {number}   cmId               Course module ID.
     * @param {string}   [siteId]           Site ID. If not defined, current site.
     * @param {boolean}  [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>} Promise resolved when the data is retrieved.
     */
    getDatabase(courseId: number, cmId: number, siteId?: string, forceCache: boolean = false): Promise<any> {
        return this.getDatabaseByKey(courseId, 'coursemodule', cmId, siteId, forceCache);
    }

    /**
     * Get a data by ID.
     *
     * @param {number}   courseId           Course ID.
     * @param {number}   id                 Data ID.
     * @param {string}   [siteId]           Site ID. If not defined, current site.
     * @param {boolean}  [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}         Promise resolved when the data is retrieved.
     */
    getDatabaseById(courseId: number, id: number, siteId?: string, forceCache: boolean = false): Promise<any> {
        return this.getDatabaseByKey(courseId, 'id', id, siteId, forceCache);
    }

    /**
     * Get prefix cache key for all database access information data WS calls.
     *
     * @param {number} dataId   Data ID.
     * @return {string}         Cache key.
     */
    protected getDatabaseAccessInformationDataPrefixCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':access:';
    }

    /**
     * Get cache key for database access information data WS calls.
     *
     * @param {number} dataId       Data ID.
     * @param {number} [groupId=0]  Group ID.
     * @return {string}             Cache key.
     */
    protected getDatabaseAccessInformationDataCacheKey(dataId: number, groupId: number = 0): string {
        return this.getDatabaseAccessInformationDataPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get  access information for a given database.
     *
     * @param   {number}    dataId              Data ID.
     * @param   {number}    [groupId]           Group ID.
     * @param   {boolean}   [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param   {boolean}   [ignoreCache=false] True if it should ignore cached data (it'll always fail in offline or server down).
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                  Promise resolved when the database is retrieved.
     */
    getDatabaseAccessInformation(dataId: number, groupId?: number, offline: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    databaseid: dataId
                },
                preSets = {
                    cacheKey: this.getDatabaseAccessInformationDataCacheKey(dataId, groupId)
                };

            if (typeof groupId !== 'undefined') {
                params['groupid'] = groupId;
            }

            if (offline) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_data_get_data_access_information', params, preSets);
        });
    }

    /**
     * Get entries for a specific database and group.
     *
     * @param   {number}    dataId             Data ID.
     * @param   {number}    [groupId=0]        Group ID.
     * @param   {string}    [sort=0]           Sort the records by this field id, reserved ids are:
     *                                            0: timeadded
     *                                           -1: firstname
     *                                           -2: lastname
     *                                           -3: approved
     *                                           -4: timemodified.
     *                                          Empty for using the default database setting.
     * @param   {string}    [order=DESC]        The direction of the sorting: 'ASC' or 'DESC'.
     *                                          Empty for using the default database setting.
     * @param   {number}    [page=0]            Page of records to return.
     * @param   {number}    [perPage=PER_PAGE]  Records per page to return. Default on PER_PAGE.
     * @param   {boolean}   [forceCache=false]  True to always get the value from cache, false otherwise. Default false.
     * @param   {boolean}   [ignoreCache=false] True if it should ignore cached data (it'll always fail in offline or server down).
     * @param   {string}    [siteId]            Site ID. If not defined, current site.
     * @return  {Promise<any>}                  Promise resolved when the database is retrieved.
     */
    getEntries(dataId: number, groupId: number = 0, sort: string = '0', order: string = 'DESC', page: number = 0,
            perPage: number = AddonModDataProvider.PER_PAGE, forceCache: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Always use sort and order params to improve cache usage (entries are identified by params).
            const params = {
                    databaseid: dataId,
                    returncontents: 1,
                    page: page,
                    perpage: perPage,
                    groupid: groupId,
                    sort: sort,
                    order: order
                },
                preSets = {
                    cacheKey: this.getEntriesCacheKey(dataId, groupId)
                };

            if (forceCache) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_data_get_entries', params, preSets);
        });
    }

    /**
     * Get cache key for database entries data WS calls.
     *
     * @param {number} dataId       Data ID.
     * @param {number} [groupId=0]  Group ID.
     * @return {string}             Cache key.
     */
    protected getEntriesCacheKey(dataId: number, groupId: number = 0): string {
        return this.getEntriesPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get prefix cache key for database all entries data WS calls.
     *
     * @param {number} dataId     Data ID.
     * @return {string}           Cache key.
     */
    protected getEntriesPrefixCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':entries:';
    }

    /**
     * Get an entry of the database activity.
     *
     * @param   {number}    dataId    Data ID for caching purposes.
     * @param   {number}    entryId   Entry ID.
     * @param   {string}    [siteId]  Site ID. If not defined, current site.
     * @return  {Promise<any>}        Promise resolved when the database entry is retrieved.
     */
    getEntry(dataId: number, entryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    entryid: entryId,
                    returncontents: 1
                },
                preSets = {
                    cacheKey: this.getEntryCacheKey(dataId, entryId)
                };

            return site.read('mod_data_get_entry', params, preSets);
        });
    }

    /**
     * Get cache key for database entry data WS calls.
     *
     * @param {number} dataId     Data ID for caching purposes.
     * @param {number} entryId    Entry ID.
     * @return {string}           Cache key.
     */
    protected getEntryCacheKey(dataId: number, entryId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':entry:' + entryId;
    }

    /**
     * Get the list of configured fields for the given database.
     *
     * @param  {number} dataId               Data ID.
     * @param  {boolean} [forceCache=false]  True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string} [siteId]             Site ID. If not defined, current site.
     * @return {Promise<any>}                Promise resolved when the fields are retrieved.
     */
    getFields(dataId: number, forceCache: boolean = false, ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    databaseid: dataId
                },
                preSets = {
                    cacheKey: this.getFieldsCacheKey(dataId)
                };

            if (forceCache) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return site.read('mod_data_get_fields', params, preSets).then((response) => {
                if (response && response.fields) {
                    return response.fields;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for database fields data WS calls.
     *
     * @param {number} dataId     Data ID.
     * @return {string}           Cache key.
     */
    protected getFieldsCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':fields';
    }

    /**
     * Invalidate the prefetched content.
     * To invalidate files, use AddonDataProvider#invalidateFiles.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID of the module.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.getDatabase(courseId, moduleId).then((data) => {
            const ps = [];

            // Do not invalidate module data before getting module info, we need it!
            ps.push(this.invalidateDatabaseData(courseId, siteId));
            ps.push(this.invalidateDatabaseWSData(data.id, siteId));

            return Promise.all(ps);
        }));

        promises.push(this.invalidateFiles(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates database access information data.
     *
     * @param {number} dataId     Data ID.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>}     Promise resolved when the data is invalidated.
     */
    invalidateDatabaseAccessInformationData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDatabaseAccessInformationDataPrefixCacheKey(dataId));
        });
    }

    /**
     * Invalidates database entries data.
     *
     * @param {number} dataId       Data ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateEntriesData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getEntriesPrefixCacheKey(dataId));
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param {number} moduleId  The module ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number, siteId?: string): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModDataProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates database data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the data is invalidated.
     */
    invalidateDatabaseData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getDatabaseDataCacheKey(courseId));
        });
    }

    /**
     * Invalidates database data except files and module info.
     *
     * @param  {number} databaseId   Data ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateDatabaseWSData(databaseId: number, siteId: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDatabaseDataPrefixCacheKey(databaseId));
        });
    }

    /**
     * Invalidates database entry data.
     *
     * @param  {number}  dataId     Data ID for caching purposes.
     * @param  {number}  entryId    Entry ID.
     * @param  {string}  [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise resolved when the data is invalidated.
     */
    invalidateEntryData(dataId: number, entryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEntryCacheKey(dataId, entryId));
        });
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the database WS are available.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>}  Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     * @since 3.3
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('mod_data_get_data_access_information');
        });
    }

    /**
     * Report the database as being viewed.
     *
     * @param {number} id      Module ID.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number): Promise<any> {
        const params = {
            databaseid: id
        };

        return this.sitesProvider.getCurrentSite().write('mod_data_view_database', params);
    }

    /**
     * Performs search over a database.
     *
     * @param {number} dataId             The data instance id.
     * @param {number} [groupId=0]        Group id, 0 means that the function will determine the user group.
     * @param {string} [search]           Search text. It will be used if advSearch is not defined.
     * @param {any}    [advSearch]        Advanced search data.
     * @param {string} [sort]             Sort by this field.
     * @param {string} [order]            The direction of the sorting.
     * @param {number} [page=0]           Page of records to return.
     * @param {number} [perPage=PER_PAGE] Records per page to return. Default on AddonModDataProvider.PER_PAGE.
     * @param {string} [siteId]           Site ID. If not defined, current site.
     * @return  {Promise<any>}            Promise resolved when the action is done.
     */
    searchEntries(dataId: number, groupId: number = 0, search?: string, advSearch?: any, sort?: string, order?: string,
            page: number = 0, perPage: number = AddonModDataProvider.PER_PAGE, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    databaseid: dataId,
                    groupid: groupId,
                    returncontents: 1,
                    page: page,
                    perpage: perPage
                },
                preSets = {
                    getFromCache: false,
                    saveToCache: true,
                    emergencyCache: true
                };

            if (typeof sort != 'undefined') {
                params['sort'] = sort;
            }

            if (typeof order !== 'undefined') {
                params['order'] = order;
            }

            if (typeof search !== 'undefined') {
                params['search'] = search;
            }

            if (typeof advSearch !== 'undefined') {
                params['advsearch'] = advSearch;
            }

            return site.read('mod_data_search_entries', params, preSets);
        });
    }
}
