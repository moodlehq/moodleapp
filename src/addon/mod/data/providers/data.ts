// (C) Copyright 2015 Moodle Pty Ltd.
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
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModDataOfflineProvider } from './offline';
import { AddonModDataFieldsDelegate } from './fields-delegate';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { CoreSite } from '@classes/site';
import { CoreCourseCommonModWSOptions } from '@core/course/providers/course';

/**
 * Database entry (online or offline).
 */
export interface AddonModDataEntry {
    id: number; // Negative for offline entries.
    userid: number;
    groupid: number;
    dataid: number;
    timecreated: number;
    timemodified: number;
    approved: boolean;
    canmanageentry: boolean;
    fullname: string;
    contents: AddonModDataEntryFields;
    deleted?: boolean; // Entry is deleted offline.
    hasOffline?: boolean; // Entry has offline actions.
}

/**
 * Entry field content.
 */
export interface AddonModDataEntryField {
    fieldid: number;
    content: string;
    content1: string;
    content2: string;
    content3: string;
    content4: string;
    files: any[];
}

/**
 * Entry contents indexed by field id.
 */
export interface AddonModDataEntryFields {
    [fieldid: number]: AddonModDataEntryField;
}

/**
 * List of entries returned by web service and helper functions.
 */
export interface AddonModDataEntries {
    entries: AddonModDataEntry[]; // Online entries.
    totalcount: number; // Total count of online entries or found entries.
    maxcount?: number; // Total count of online entries. Only returned when searching.
    offlineEntries?: AddonModDataEntry[]; // Offline entries.
    hasOfflineActions?: boolean; // Whether the database has offline data.
    hasOfflineRatings?: boolean; // Whether the database has offline ratings.
}

/**
 * Subfield form data.
 */
export interface AddonModDataSubfieldData {
    fieldid: number;
    subfield?: string;
    value?: string; // Value encoded in JSON.
    files?: any[];
}

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
            private appProvider: CoreAppProvider, private fieldsDelegate: AddonModDataFieldsDelegate,
            private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModDataProvider');
    }

    /**
     * Adds a new entry to a database.
     *
     * @param dataId Data instance ID.
     * @param entryId EntryId or provisional entry ID when offline.
     * @param courseId Course ID.
     * @param contents The fields data to be created.
     * @param groupId Group id, 0 means that the function will determine the user group.
     * @param fields The fields that define the contents.
     * @param siteId Site ID. If not defined, current site.
     * @param forceOffline Force editing entry in offline.
     * @return Promise resolved when the action is done.
     */
    async addEntry(dataId: number, entryId: number, courseId: number, contents: AddonModDataSubfieldData[], groupId: number = 0,
            fields: any, siteId?: string, forceOffline: boolean = false): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<any> => {
            const entry = await this.dataOffline.saveEntry(dataId, entryId, 'add', courseId, groupId, contents, undefined, siteId);

            return {
                // Return provissional entry Id.
                newentryid: entry,
                sent: false,
            };
        };

        // Checks to store offline.
        if (!this.appProvider.isOnline() || forceOffline) {
            const notifications = this.checkFields(fields, contents);
            if (notifications) {
                return { fieldnotifications: notifications };
            }
        }

        // Remove unnecessary not synced actions.
        await this.deleteEntryOfflineAction(dataId, entryId, 'add', siteId);

        // App is offline, store the action.
        if (!this.appProvider.isOnline() || forceOffline) {
            return storeOffline();
        }

        try {
            const result = await this.addEntryOnline(dataId, contents, groupId, siteId);
            result.sent = true;

            return result;
        } catch (error) {
            if (this.utils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Adds a new entry to a database. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param dataId Database ID.
     * @param data The fields data to be created.
     * @param groupId Group id, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
     */
    addEntryOnline(dataId: number, data: AddonModDataSubfieldData[], groupId?: number, siteId?: string): Promise<any> {
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
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param approve Whether to approve (true) or unapprove the entry.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
     */
    async approveEntry(dataId: number, entryId: number, approve: boolean, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<any> => {
            const action = approve ? 'approve' : 'disapprove';

            await this.dataOffline.saveEntry(dataId, entryId, action, courseId, undefined, undefined, undefined, siteId);

            return {
                sent: false,
            };
        };

        // Get if the opposite action is not synced.
        const oppositeAction = approve ? 'disapprove' : 'approve';

        const found = await this.deleteEntryOfflineAction(dataId, entryId, oppositeAction, siteId);
        if (found) {
            // Offline action has been found and deleted. Stop here.
            return;
        }

        if (!this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await this.approveEntryOnline(entryId, approve, siteId);

            return {
                sent: true,
            };
        } catch (error) {
            if (this.utils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Approves or unapproves an entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param entryId Entry ID.
     * @param approve Whether to approve (true) or unapprove the entry.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
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
     * Convenience function to check fields requeriments here named "notifications".
     *
     * @param fields The fields that define the contents.
     * @param contents The contents data of the fields.
     * @return Array of notifications if any or false.
     */
    protected checkFields(fields: any, contents: AddonModDataSubfieldData[]): any[] | false {
        const notifications = [],
            contentsIndexed = {};

        contents.forEach((content) => {
            if (typeof contentsIndexed[content.fieldid] == 'undefined') {
                contentsIndexed[content.fieldid] = [];
            }
            contentsIndexed[content.fieldid].push(content);
        });

        // App is offline, check required fields.
        Object.keys(fields).forEach((key) => {
            const field = fields[key],
                notification = this.fieldsDelegate.getFieldsNotifications(field, contentsIndexed[field.id]);
            if (notification) {
                notifications.push({
                    fieldname: field.name,
                    notification: notification
                });
            }
        });

        return notifications.length ? notifications : false;
    }

    /**
     * Deletes an entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
     */
    async deleteEntry(dataId: number, entryId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<any> => {
            await this.dataOffline.saveEntry(dataId, entryId, 'delete', courseId, undefined, undefined, undefined, siteId);

            return {
                sent: false,
            };
        };

        // Check if the opposite action is not synced and just delete it.
        const addedOffline = await this.deleteEntryOfflineAction(dataId, entryId, 'add', siteId);
        if (addedOffline) {
            // Offline add action found and deleted. Stop here.
            return;
        }

        if (!this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await this.deleteEntryOnline(entryId, siteId);

            return {
                sent: true,
            };
        } catch (error) {
            if (this.utils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Deletes an entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
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
     * Delete entry offline action.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param action Action name to delete.
     * @param siteId Site ID.
     * @return Resolved with true if the action has been found and deleted.
     */
    protected async deleteEntryOfflineAction(dataId: number, entryId: number, action: string, siteId: string): Promise<boolean> {
        // Get other not not synced actions.
        try {
            await this.dataOffline.getEntry(dataId, entryId, action, siteId);

            await this.dataOffline.deleteEntry(dataId, entryId, action, siteId);

            return true;
        } catch (error) {
            // Not found.
            return false;
        }
    }

    /**
     * Updates an existing entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param courseId Course ID.
     * @param contents The contents data to be updated.
     * @param fields The fields that define the contents.
     * @param siteId Site ID. If not defined, current site.
     * @param forceOffline Force editing entry in offline.
     * @return Promise resolved when the action is done.
     */
    async editEntry(dataId: number, entryId: number, courseId: number, contents: AddonModDataSubfieldData[], fields: any,
            siteId?: string, forceOffline: boolean = false): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<any> => {
            await this.dataOffline.saveEntry(dataId, entryId, 'edit', courseId, undefined, contents, undefined, siteId);

            return {
                updated: true,
                sent: false,
            };
        };

        if (!this.appProvider.isOnline() || forceOffline) {
            const notifications = this.checkFields(fields, contents);
            if (notifications) {
                return { fieldnotifications: notifications };
            }
        }

        // Remove unnecessary not synced actions.
        await this.deleteEntryOfflineAction(dataId, entryId, 'edit', siteId);

        if (!this.appProvider.isOnline() || forceOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            const result = await this.editEntryOnline(entryId, contents, siteId);
            result.sent = true;

            return result;
        } catch (error) {
            if (this.utils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
}

    /**
     * Updates an existing entry. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param entryId Entry ID.
     * @param data The fields data to be updated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the action is done.
     */
    editEntryOnline(entryId: number, data: AddonModDataSubfieldData[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    entryid: entryId,
                    data: data
                };

            return site.write('mod_data_update_entry', params);
        });
    }

    /**
     * Performs the whole fetch of the entries in the database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @return Promise resolved when done.
     */
    fetchAllEntries(dataId: number, options: AddonModDataGetEntriesOptions = {}): Promise<AddonModDataEntry[]> {
        options.siteId = options.siteId || this.sitesProvider.getCurrentSiteId();
        options.page = 0;

        return this.fetchEntriesRecursive(dataId, [], options);
    }

    /**
     * Recursive call on fetch all entries.
     *
     * @param dataId Data ID.
     * @param entries Entries already fetch (just to concatenate them).
     * @param options Other options.
     * @return Promise resolved when done.
     */
    protected fetchEntriesRecursive(dataId: number, entries: any, options: AddonModDataGetEntriesOptions = {})
            : Promise<AddonModDataEntry[]> {
        return this.getEntries(dataId, options).then((result) => {
            entries = entries.concat(result.entries);

            const canLoadMore = options.perPage > 0 && ((options.page + 1) * options.perPage) < result.totalcount;
            if (canLoadMore) {
                options.page++;

                return this.fetchEntriesRecursive(dataId, entries, options);
            }

            return entries;
        });
    }

    /**
     * Get cache key for data data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getDatabaseDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'data:' + courseId;
    }

    /**
     * Get prefix cache key for all database activity data WS calls.
     *
     * @param dataId Data ID.
     * @return Cache key.
     */
    protected getDatabaseDataPrefixCacheKey(dataId: number): string {
        return this.ROOT_CACHE_KEY + dataId;
    }

    /**
     * Get a database data. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @return Promise resolved when the data is retrieved.
     */
    protected getDatabaseByKey(courseId: number, key: string, value: any, options: CoreSitesCommonWSOptions = {}):
            Promise<any> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                courseids: [courseId],
            };
            const preSets = {
                cacheKey: this.getDatabaseDataCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                component: AddonModDataProvider.COMPONENT,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

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
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the data is retrieved.
     */
    getDatabase(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<any> {
        return this.getDatabaseByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a data by ID.
     *
     * @param courseId Course ID.
     * @param id Data ID.
     * @param options Other options.
     * @return Promise resolved when the data is retrieved.
     */
    getDatabaseById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<any> {
        return this.getDatabaseByKey(courseId, 'id', id, options);
    }

    /**
     * Get prefix cache key for all database access information data WS calls.
     *
     * @param dataId Data ID.
     * @return Cache key.
     */
    protected getDatabaseAccessInformationDataPrefixCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':access:';
    }

    /**
     * Get cache key for database access information data WS calls.
     *
     * @param dataId Data ID.
     * @param groupId Group ID.
     * @return Cache key.
     */
    protected getDatabaseAccessInformationDataCacheKey(dataId: number, groupId: number = 0): string {
        return this.getDatabaseAccessInformationDataPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get  access information for a given database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @return Promise resolved when the database is retrieved.
     */
    getDatabaseAccessInformation(dataId: number, options: AddonModDataAccessInfoOptions = {}): Promise<any> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            options.groupId = options.groupId || 0;

            const params = {
                databaseid: dataId,
                groupid: options.groupId,
            };
            const preSets = {
                cacheKey: this.getDatabaseAccessInformationDataCacheKey(dataId, options.groupId),
                component: AddonModDataProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_data_get_data_access_information', params, preSets);
        });
    }

    /**
     * Get entries for a specific database and group.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @return Promise resolved when the database is retrieved.
     */
    getEntries(dataId: number, options: AddonModDataGetEntriesOptions = {}): Promise<AddonModDataEntries> {
        options.groupId = options.groupId || 0;
        options.sort = options.sort || 0;
        options.order = options.order || 'DESC';
        options.page = options.page || 0;
        options.perPage = options.perPage || AddonModDataProvider.PER_PAGE;

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            // Always use sort and order params to improve cache usage (entries are identified by params).
            const params = {
                databaseid: dataId,
                returncontents: 1,
                page: options.page,
                perpage: options.perPage,
                groupid: options.groupId,
                sort: options.sort,
                order: options.order,
            };
            const preSets = {
                cacheKey: this.getEntriesCacheKey(dataId, options.groupId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModDataProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_data_get_entries', params, preSets).then((response) => {
                response.entries.forEach((entry) => {
                    entry.contents = this.utils.arrayToObject(entry.contents, 'fieldid');
                });

                return response;
            });
        });
    }

    /**
     * Get cache key for database entries data WS calls.
     *
     * @param dataId Data ID.
     * @param groupId Group ID.
     * @return Cache key.
     */
    protected getEntriesCacheKey(dataId: number, groupId: number = 0): string {
        return this.getEntriesPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get prefix cache key for database all entries data WS calls.
     *
     * @param dataId Data ID.
     * @return Cache key.
     */
    protected getEntriesPrefixCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':entries:';
    }

    /**
     * Get an entry of the database activity.
     *
     * @param dataId Data ID for caching purposes.
     * @param entryId Entry ID.
     * @param options Other options.
     * @return Promise resolved when the entry is retrieved.
     */
    getEntry(dataId: number, entryId: number, options: CoreCourseCommonModWSOptions = {}):
             Promise<{entry: AddonModDataEntry, ratinginfo: CoreRatingInfo}> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                entryid: entryId,
                returncontents: 1,
            };
            const preSets = {
                cacheKey: this.getEntryCacheKey(dataId, entryId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModDataProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_data_get_entry', params, preSets).then((response) => {
                response.entry.contents = this.utils.arrayToObject(response.entry.contents, 'fieldid');

                return response;
            });
        });
    }

    /**
     * Get cache key for database entry data WS calls.
     *
     * @param dataId Data ID for caching purposes.
     * @param entryId Entry ID.
     * @return Cache key.
     */
    protected getEntryCacheKey(dataId: number, entryId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':entry:' + entryId;
    }

    /**
     * Get the list of configured fields for the given database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @return Promise resolved when the fields are retrieved.
     */
    getFields(dataId: number, options: CoreCourseCommonModWSOptions = {}): Promise<any> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                databaseid: dataId,
            };
            const preSets = {
                cacheKey: this.getFieldsCacheKey(dataId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                component: AddonModDataProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

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
     * @param dataId Data ID.
     * @return Cache key.
     */
    protected getFieldsCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':fields';
    }

    /**
     * Invalidate the prefetched content.
     * To invalidate files, use AddonModDataProvider#invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.getDatabase(courseId, moduleId).then((data) => {
            const ps = [];

            // Do not invalidate module data before getting module info, we need it!
            ps.push(this.invalidateDatabaseData(courseId, siteId));
            ps.push(this.invalidateDatabaseWSData(data.id, siteId));
            ps.push(this.invalidateFieldsData(data.id, siteId));

            return Promise.all(ps);
        }));

        promises.push(this.invalidateFiles(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates database access information data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDatabaseAccessInformationData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDatabaseAccessInformationDataPrefixCacheKey(dataId));
        });
    }

    /**
     * Invalidates database entries data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateEntriesData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getEntriesPrefixCacheKey(dataId));
        });
    }

    /**
     * Invalidates database fields data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateFieldsData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFieldsCacheKey(dataId));
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param moduleId The module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number, siteId?: string): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModDataProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates database data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDatabaseData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getDatabaseDataCacheKey(courseId));
        });
    }

    /**
     * Invalidates database data except files and module info.
     *
     * @param databaseId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDatabaseWSData(databaseId: number, siteId: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDatabaseDataPrefixCacheKey(databaseId));
        });
    }

    /**
     * Invalidates database entry data.
     *
     * @param dataId Data ID for caching purposes.
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateEntryData(dataId: number, entryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEntryCacheKey(dataId, entryId));
        });
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the database WS are available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
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
     * @param id Module ID.
     * @param name Name of the data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            databaseid: id
        };

        return this.logHelper.logSingle('mod_data_view_database', params, AddonModDataProvider.COMPONENT, id, name, 'data', {},
                    siteId);
    }

    /**
     * Performs search over a database.
     *
     * @param dataId The data instance id.
     * @param options Other options.
     * @return Promise resolved when the action is done.
     */
    searchEntries(dataId: number, options: AddonModDataSearchEntriesOptions = {}): Promise<AddonModDataEntries> {
        options.groupId = options.groupId || 0;
        options.sort = options.sort || 0;
        options.order || options.order || 'DESC';
        options.page = options.page || 0;
        options.perPage = options.perPage || AddonModDataProvider.PER_PAGE;
        options.readingStrategy = options.readingStrategy || CoreSitesReadingStrategy.PreferNetwork;

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                databaseid: dataId,
                groupid: options.groupId,
                returncontents: 1,
                page: options.page,
                perpage: options.perPage,
            };
            const preSets = {
                component: AddonModDataProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            if (typeof options.sort != 'undefined') {
                params['sort'] = options.sort;
            }

            if (typeof options.order !== 'undefined') {
                params['order'] = options.order;
            }

            if (typeof options.search !== 'undefined') {
                params['search'] = options.search;
            }

            if (typeof options.advSearch !== 'undefined') {
                params['advsearch'] = options.advSearch;
            }

            return site.read('mod_data_search_entries', params, preSets).then((response) => {
                response.entries.forEach((entry) => {
                    entry.contents = this.utils.arrayToObject(entry.contents, 'fieldid');
                });

                return response;
            });
        });
    }
}

/**
 * Options to pass to get access info.
 */
export type AddonModDataAccessInfoOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // Group Id.
};

/**
 * Options to pass to get entries.
 */
export type AddonModDataGetEntriesOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // Group Id.
    sort?: number; // Sort the records by this field id, defaults to 0. Reserved ids are:
                   // 0: timeadded
                   // -1: firstname
                   // -2: lastname
                   // -3: approved
                   // -4: timemodified
    order?: string; // The direction of the sorting: 'ASC' or 'DESC'. Defaults to 'DESC'.
    page?: number; // Page of records to return. Defaults to 0.
    perPage?: number; // Records per page to return. Defaults to AddonModDataProvider.PER_PAGE.
};

/**
 * Options to pass to search entries.
 */
export type AddonModDataSearchEntriesOptions = AddonModDataGetEntriesOptions & {
    search?: string; // Search text. It will be used if advSearch is not defined.
    advSearch?: any; // Advanced search data.
};
