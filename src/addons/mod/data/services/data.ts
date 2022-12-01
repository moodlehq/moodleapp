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
import { CoreError } from '@classes/errors/error';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreNetwork } from '@services/network';
import { CoreFileEntry } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModDataFieldsDelegate } from './data-fields-delegate';
import { AddonModDataOffline } from './data-offline';
import { AddonModDataAutoSyncData, AddonModDataSyncProvider } from './data-sync';

const ROOT_CACHE_KEY = 'mmaModData:';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [AddonModDataSyncProvider.AUTO_SYNCED]: AddonModDataAutoSyncData;
        [AddonModDataProvider.ENTRY_CHANGED]: AddonModDataEntryChangedEventData;
    }
}

export enum AddonModDataAction {
    ADD = 'add',
    EDIT = 'edit',
    DELETE = 'delete',
    APPROVE = 'approve',
    DISAPPROVE = 'disapprove',
    USER = 'user',
    USERPICTURE = 'userpicture',
    MORE = 'more',
    MOREURL = 'moreurl',
    COMMENTS = 'comments',
    TIMEADDED = 'timeadded',
    TIMEMODIFIED = 'timemodified',
    TAGS = 'tags',
    APPROVALSTATUS = 'approvalstatus',
    DELCHECK = 'delcheck', // Unused.
    EXPORT = 'export', // Unused.
}

export enum AddonModDataTemplateType {
    LIST_HEADER = 'listtemplateheader',
    LIST = 'listtemplate',
    LIST_FOOTER = 'listtemplatefooter',
    ADD = 'addtemplate',
    SEARCH = 'asearchtemplate',
    SINGLE = 'singletemplate',
}

export enum AddonModDataTemplateMode {
    LIST = 'list',
    EDIT = 'edit',
    SHOW = 'show',
    SEARCH = 'search',
}

/**
 * Service that provides some features for databases.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataProvider {

    static readonly COMPONENT = 'mmaModData';
    static readonly PER_PAGE = 25;
    static readonly ENTRY_CHANGED = 'addon_mod_data_entry_changed';

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
     * @returns Promise resolved when the action is done.
     */
    async addEntry(
        dataId: number,
        entryId: number,
        courseId: number,
        contents: AddonModDataEntryWSField[],
        groupId: number = 0,
        fields: AddonModDataField[],
        siteId?: string,
        forceOffline: boolean = false,
    ): Promise<AddonModDataAddEntryResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<AddonModDataAddEntryResult> => {
            const entry = await AddonModDataOffline.saveEntry(
                dataId,
                entryId,
                AddonModDataAction.ADD,
                courseId,
                groupId,
                contents,
                undefined,
                siteId,
            );

            return {
                // Return provissional entry Id.
                newentryid: entry.entryid,
                sent: false,
            };
        };

        // Checks to store offline.
        if (!CoreNetwork.isOnline() || forceOffline) {
            const notifications = this.checkFields(fields, contents);
            if (notifications.length > 0) {
                return { fieldnotifications: notifications };
            }
        }

        // Remove unnecessary not synced actions.
        await this.deleteEntryOfflineAction(dataId, entryId, AddonModDataAction.ADD, siteId);

        // App is offline, store the action.
        if (!CoreNetwork.isOnline() || forceOffline) {
            return storeOffline();
        }

        try {
            const result: AddonModDataAddEntryResult = await this.addEntryOnline(dataId, contents, groupId, siteId);
            result.sent = true;

            return result;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
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
     * @returns Promise resolved when the action is done.
     */
    async addEntryOnline(
        dataId: number,
        data: AddonModDataEntryWSField[],
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModDataAddEntryWSResponse> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModDataAddEntryWSParams = {
            databaseid: dataId,
            data,
        };

        if (groupId !== undefined) {
            params.groupid = groupId;
        }

        return site.write<AddonModDataAddEntryWSResponse>('mod_data_add_entry', params);
    }

    /**
     * Approves or unapproves an entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param approve Whether to approve (true) or unapprove the entry.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the action is done.
     */
    async approveEntry(
        dataId: number,
        entryId: number,
        approve: boolean,
        courseId: number,
        siteId?: string,
    ): Promise<AddonModDataApproveEntryResult | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<AddonModDataApproveEntryResult> => {
            const action = approve ? AddonModDataAction.APPROVE : AddonModDataAction.DISAPPROVE;

            await AddonModDataOffline.saveEntry(dataId, entryId, action, courseId, undefined, undefined, undefined, siteId);

            return {
                sent: false,
            };
        };

        // Get if the opposite action is not synced.
        const oppositeAction = approve ? AddonModDataAction.DISAPPROVE : AddonModDataAction.APPROVE;

        const found = await this.deleteEntryOfflineAction(dataId, entryId, oppositeAction, siteId);
        if (found) {
            // Offline action has been found and deleted. Stop here.
            return;
        }

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await this.approveEntryOnline(entryId, approve, siteId);

            return {
                sent: true,
            };
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
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
     * @returns Promise resolved when the action is done.
     */
    async approveEntryOnline(entryId: number, approve: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModDataApproveEntryWSParams = {
            entryid: entryId,
            approve,
        };

        await site.write('mod_data_approve_entry', params);
    }

    /**
     * Convenience function to check fields requeriments here named "notifications".
     *
     * @param fields The fields that define the contents.
     * @param contents The contents data of the fields.
     * @returns Array of notifications if any or false.
     */
    protected checkFields(fields: AddonModDataField[], contents: AddonModDataSubfieldData[]): AddonModDataFieldNotification[] {
        const notifications: AddonModDataFieldNotification[] = [];
        const contentsIndexed = CoreUtils.arrayToObjectMultiple(contents, 'fieldid');

        // App is offline, check required fields.
        fields.forEach((field) => {
            const notification = AddonModDataFieldsDelegate.getFieldsNotifications(field, contentsIndexed[field.id]);

            if (notification) {
                notifications.push({
                    fieldname: field.name,
                    notification,
                });
            }
        });

        return notifications;
    }

    /**
     * Deletes an entry.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the action is done.
     */
    async deleteEntry(dataId: number, entryId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<void> => {
            await AddonModDataOffline.saveEntry(
                dataId,
                entryId,
                AddonModDataAction.DELETE,
                courseId,
                undefined,
                undefined,
                undefined,
                siteId,
            );
        };

        // Check if the opposite action is not synced and just delete it.
        const addedOffline = await this.deleteEntryOfflineAction(dataId, entryId, AddonModDataAction.ADD, siteId);
        if (addedOffline) {
            // Offline add action found and deleted. Stop here.
            return;
        }

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await this.deleteEntryOnline(entryId, siteId);
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
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
     * @returns Promise resolved when the action is done.
     */
    async deleteEntryOnline(entryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModDataDeleteEntryWSParams = {
            entryid: entryId,
        };

        await site.write('mod_data_delete_entry', params);
    }

    /**
     * Delete entry offline action.
     *
     * @param dataId Database ID.
     * @param entryId Entry ID.
     * @param action Action name to delete.
     * @param siteId Site ID.
     * @returns Resolved with true if the action has been found and deleted.
     */
    protected async deleteEntryOfflineAction(
        dataId: number,
        entryId: number,
        action: AddonModDataAction,
        siteId: string,
    ): Promise<boolean> {
        try {
            // Get other not not synced actions.
            await AddonModDataOffline.getEntry(dataId, entryId, action, siteId);
            await AddonModDataOffline.deleteEntry(dataId, entryId, action, siteId);

            return true;
        } catch {
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
     * @returns Promise resolved when the action is done.
     */
    async editEntry(
        dataId: number,
        entryId: number,
        courseId: number,
        contents: AddonModDataEntryWSField[],
        fields: AddonModDataField[],
        siteId?: string,
        forceOffline: boolean = false,
    ): Promise<AddonModDataEditEntryResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a data to be synchronized later.
        const storeOffline = async (): Promise<AddonModDataEditEntryResult> => {
            await AddonModDataOffline.saveEntry(
                dataId,
                entryId,
                AddonModDataAction.EDIT,
                courseId,
                undefined,
                contents,
                undefined,
                siteId,
            );

            return {
                updated: true,
                sent: false,
            };
        };

        if (!CoreNetwork.isOnline() || forceOffline) {
            const notifications = this.checkFields(fields, contents);
            if (notifications.length > 0) {
                return { fieldnotifications: notifications };
            }
        }

        // Remove unnecessary not synced actions.
        await this.deleteEntryOfflineAction(dataId, entryId, AddonModDataAction.EDIT, siteId);

        if (!CoreNetwork.isOnline() || forceOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            const result: AddonModDataEditEntryResult = await this.editEntryOnline(entryId, contents, siteId);
            result.sent = true;

            return result;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
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
     * @returns Promise resolved when the action is done.
     */
    async editEntryOnline(
        entryId: number,
        data: AddonModDataEntryWSField[],
        siteId?: string,
    ): Promise<AddonModDataUpdateEntryWSResponse> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModDataUpdateEntryWSParams = {
            entryid: entryId,
            data,
        };

        return site.write<AddonModDataUpdateEntryWSResponse>('mod_data_update_entry', params);
    }

    /**
     * Performs the whole fetch of the entries in the database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    fetchAllEntries(dataId: number, options: AddonModDataGetEntriesOptions = {}): Promise<AddonModDataEntry[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();
        options = Object.assign({
            page: 0,
            perPage: AddonModDataProvider.PER_PAGE,
        }, options);

        return this.fetchEntriesRecursive(dataId, [], options);
    }

    /**
     * Recursive call on fetch all entries.
     *
     * @param dataId Data ID.
     * @param entries Entries already fetch (just to concatenate them).
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    protected async fetchEntriesRecursive(
        dataId: number,
        entries: AddonModDataEntry[],
        options: AddonModDataGetEntriesOptions,
    ): Promise<AddonModDataEntry[]> {
        const result = await this.getEntries(dataId, options);
        entries = entries.concat(result.entries);

        const canLoadMore = options.perPage! > 0 && ((options.page! + 1) * options.perPage!) < result.totalcount;
        if (canLoadMore) {
            options.page!++;

            return this.fetchEntriesRecursive(dataId, entries, options);
        }

        return entries;
    }

    /**
     * Get cache key for data data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getDatabaseDataCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'data:' + courseId;
    }

    /**
     * Get prefix cache key for all database activity data WS calls.
     *
     * @param dataId Data ID.
     * @returns Cache key.
     */
    protected getDatabaseDataPrefixCacheKey(dataId: number): string {
        return ROOT_CACHE_KEY + dataId;
    }

    /**
     * Get a database data. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the data is retrieved.
     */
    protected async getDatabaseByKey(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModDataData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModDataGetDatabasesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getDatabaseDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModDataProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        const response =
            await site.read<AddonModDataGetDatabasesByCoursesWSResponse>('mod_data_get_databases_by_courses', params, preSets);

        const currentData = response.databases.find((data) => data[key] == value);
        if (currentData) {
            return currentData;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get a data by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the data is retrieved.
     */
    getDatabase(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModDataData> {
        return this.getDatabaseByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a data by ID.
     *
     * @param courseId Course ID.
     * @param id Data ID.
     * @param options Other options.
     * @returns Promise resolved when the data is retrieved.
     */
    getDatabaseById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModDataData> {
        return this.getDatabaseByKey(courseId, 'id', id, options);
    }

    /**
     * Get prefix cache key for all database access information data WS calls.
     *
     * @param dataId Data ID.
     * @returns Cache key.
     */
    protected getDatabaseAccessInformationDataPrefixCacheKey(dataId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':access:';
    }

    /**
     * Get cache key for database access information data WS calls.
     *
     * @param dataId Data ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getDatabaseAccessInformationDataCacheKey(dataId: number, groupId: number = 0): string {
        return this.getDatabaseAccessInformationDataPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get access information for a given database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @returns Promise resolved when the database is retrieved.
     */
    async getDatabaseAccessInformation(
        dataId: number,
        options: AddonModDataAccessInfoOptions = {},
    ): Promise<AddonModDataGetDataAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        options.groupId = options.groupId || 0;

        const params: AddonModDataGetDataAccessInformationWSParams = {
            databaseid: dataId,
            groupid: options.groupId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getDatabaseAccessInformationDataCacheKey(dataId, options.groupId),
            component: AddonModDataProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read<AddonModDataGetDataAccessInformationWSResponse>('mod_data_get_data_access_information', params, preSets);
    }

    /**
     * Get entries for a specific database and group.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @returns Promise resolved when the database is retrieved.
     */
    async getEntries(dataId: number, options: AddonModDataGetEntriesOptions = {}): Promise<AddonModDataEntries> {
        options = Object.assign({
            groupId: 0,
            sort: 0,
            order: 'DESC',
            page: 0,
            perPage: AddonModDataProvider.PER_PAGE,
        }, options);

        const site = await CoreSites.getSite(options.siteId);
        // Always use sort and order params to improve cache usage (entries are identified by params).
        const params: AddonModDataGetEntriesWSParams = {
            databaseid: dataId,
            returncontents: true,
            page: options.page,
            perpage: options.perPage,
            groupid: options.groupId,
            sort: options.sort,
            order: options.order,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesCacheKey(dataId, options.groupId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModDataProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModDataGetEntriesWSResponse>('mod_data_get_entries', params, preSets);

        const entriesFormatted = response.entries.map((entry) => this.formatEntryContents(entry));

        return Object.assign(response, {
            entries: entriesFormatted,
        });
    }

    /**
     * Get cache key for database entries data WS calls.
     *
     * @param dataId Data ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getEntriesCacheKey(dataId: number, groupId: number = 0): string {
        return this.getEntriesPrefixCacheKey(dataId) + groupId;
    }

    /**
     * Get prefix cache key for database all entries data WS calls.
     *
     * @param dataId Data ID.
     * @returns Cache key.
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
     * @returns Promise resolved when the entry is retrieved.
     */
    async getEntry(
        dataId: number,
        entryId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModDataGetEntryFormatted> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModDataGetEntryWSParams = {
            entryid: entryId,
            returncontents: true,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntryCacheKey(dataId, entryId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModDataProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModDataGetEntryWSResponse>('mod_data_get_entry', params, preSets);

        return Object.assign(response, {
            entry: this.formatEntryContents(response.entry),
        });
    }

    /**
     * Formats the contents of an entry.
     *
     * @param entry Original WS entry.
     * @returns Entry with contents formatted.
     */
    protected formatEntryContents(entry: AddonModDataEntryWS): AddonModDataEntry {
        return Object.assign(entry, {
            contents: CoreUtils.arrayToObject(entry.contents, 'fieldid'),
        });
    }

    /**
     * Get cache key for database entry data WS calls.
     *
     * @param dataId Data ID for caching purposes.
     * @param entryId Entry ID.
     * @returns Cache key.
     */
    protected getEntryCacheKey(dataId: number, entryId: number): string {
        return this.getDatabaseDataPrefixCacheKey(dataId) + ':entry:' + entryId;
    }

    /**
     * Get the list of configured fields for the given database.
     *
     * @param dataId Data ID.
     * @param options Other options.
     * @returns Promise resolved when the fields are retrieved.
     */
    async getFields(dataId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModDataField[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModDataGetFieldsWSParams = {
            databaseid: dataId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFieldsCacheKey(dataId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModDataProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModDataGetFieldsWSResponse>('mod_data_get_fields', params, preSets);
        if (response.fields) {
            return response.fields;
        }

        throw new CoreError('No fields were returned.');
    }

    /**
     * Get cache key for database fields data WS calls.
     *
     * @param dataId Data ID.
     * @returns Cache key.
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
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.getDatabase(courseId, moduleId).then(async (database) => {
            const ps: Promise<void>[] = [];

            // Do not invalidate module data before getting module info, we need it!
            ps.push(this.invalidateDatabaseData(courseId, siteId));
            ps.push(this.invalidateDatabaseWSData(database.id, siteId));
            ps.push(this.invalidateFieldsData(database.id, siteId));

            await Promise.all(ps);

            return;
        }));

        promises.push(this.invalidateFiles(moduleId, siteId));

        await CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates database access information data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDatabaseAccessInformationData(dataId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getDatabaseAccessInformationDataPrefixCacheKey(dataId));
    }

    /**
     * Invalidates database entries data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateEntriesData(dataId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getEntriesPrefixCacheKey(dataId));
    }

    /**
     * Invalidates database fields data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateFieldsData(dataId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getFieldsCacheKey(dataId));
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param moduleId The module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the files are invalidated.
     */
    async invalidateFiles(moduleId: number, siteId?: string): Promise<void> {
        await CoreFilepool.invalidateFilesByComponent(siteId, AddonModDataProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates database data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDatabaseData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getDatabaseDataCacheKey(courseId));
    }

    /**
     * Invalidates database data except files and module info.
     *
     * @param databaseId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDatabaseWSData(databaseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getDatabaseDataPrefixCacheKey(databaseId));
    }

    /**
     * Invalidates database entry data.
     *
     * @param dataId Data ID for caching purposes.
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateEntryData(dataId: number, entryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getEntryCacheKey(dataId, entryId));
    }

    /**
     * Report the database as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModDataViewDatabaseWSParams = {
            databaseid: id,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_data_view_database',
            params,
            AddonModDataProvider.COMPONENT,
            id,
            name,
            'data',
            {},
            siteId,
        );
    }

    /**
     * Performs search over a database.
     *
     * @param dataId The data instance id.
     * @param options Other options.
     * @returns Promise resolved when the action is done.
     */
    async searchEntries(dataId: number, options: AddonModDataSearchEntriesOptions = {}): Promise<AddonModDataEntries> {
        const site = await CoreSites.getSite(options.siteId);

        options.groupId = options.groupId || 0;
        options.sort = options.sort || 0;
        options.order = options.order || 'DESC';
        options.page = options.page || 0;
        options.perPage = options.perPage || AddonModDataProvider.PER_PAGE;
        options.readingStrategy = options.readingStrategy || CoreSitesReadingStrategy.PREFER_NETWORK;

        const params: AddonModDataSearchEntriesWSParams = {
            databaseid: dataId,
            groupid: options.groupId,
            returncontents: true,
            page: options.page,
            perpage: options.perPage,
        };
        const preSets: CoreSiteWSPreSets = {
            component: AddonModDataProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        if (options.sort !== undefined) {
            params.sort = options.sort;
        }
        if (options.order !== undefined) {
            params.order = options.order;
        }
        if (options.search !== undefined) {
            params.search = options.search;
        }
        if (options.advSearch !== undefined) {
            params.advsearch = options.advSearch;
        }
        const response = await site.read<AddonModDataSearchEntriesWSResponse>('mod_data_search_entries', params, preSets);

        const entriesFormatted = response.entries.map((entry) => this.formatEntryContents(entry));

        return Object.assign(response, {
            entries: entriesFormatted,
        });
    }

}
export const AddonModData = makeSingleton(AddonModDataProvider);

/**
 * Params of mod_data_view_database WS.
 */
type AddonModDataViewDatabaseWSParams = {
    databaseid: number; // Data instance id.
};

/**
 * Params of mod_data_search_entries WS.
 */
type AddonModDataSearchEntriesWSParams = {
    databaseid: number; // Data instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    returncontents?: boolean; // Whether to return contents or not.
    search?: string; // Search string (empty when using advanced).
    advsearch?: AddonModDataSearchEntriesAdvancedField[];
    sort?: number; // Sort the records by this field id, reserved ids are:
    // 0: timeadded
    // -1: firstname
    // -2: lastname
    // -3: approved
    // -4: timemodified.
    // Empty for using the default database setting.
    order?: string; // The direction of the sorting: 'ASC' or 'DESC'. Empty for using the default database setting.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
};

/**
 * Data returned by mod_data_search_entries WS.
 */
export type AddonModDataSearchEntriesWSResponse = {
    entries: AddonModDataEntryWS[];
    totalcount: number; // Total count of records returned by the search.
    maxcount?: number; // Total count of records that the user could see in the database (if all the search criterias were removed).
    listviewcontents?: string; // The list view contents as is rendered in the site.
    warnings?: CoreWSExternalWarning[];
};

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
    advSearch?: AddonModDataSearchEntriesAdvancedField[];
};

/**
 * Database entry (online or offline).
 */
export type AddonModDataEntry = Omit<AddonModDataEntryWS, 'contents'> & {
    contents: AddonModDataEntryFields; // The record contents.
    tags?: CoreTagItem[]; // Tags.
    // Calculated data.
    deleted?: boolean; // Entry is deleted offline.
    hasOffline?: boolean; // Entry has offline actions.
};

/**
 * Database entry data from WS.
 */
export type AddonModDataEntryWS = {
    id: number; // Record id.
    userid: number; // The id of the user who created the record.
    groupid: number; // The group id this record belongs to (0 for no groups).
    dataid: number; // The database id this record belongs to.
    timecreated: number; // Time the record was created.
    timemodified: number; // Last time the record was modified.
    approved: boolean; // Whether the entry has been approved (if the database is configured in that way).
    canmanageentry: boolean; // Whether the current user can manage this entry.
    fullname?: string; // The user who created the entry fullname.
    contents?: AddonModDataEntryField[];
    tags?: CoreTagItem[]; // Tags.
};

/**
 * Entry field content.
 */
export type AddonModDataEntryField = {
    id: number; // Content id.
    fieldid: number; // The field type of the content.
    recordid: number; // The record this content belongs to.
    content: string; // Contents.
    content1: string | null; // Contents.
    content2: string | null; // Contents.
    content3: string | null; // Contents.
    content4: string | null; // Contents.
    files: CoreFileEntry[];
};

/**
 * Entry contents indexed by field id.
 */
export type AddonModDataEntryFields = {
    [fieldid: number]: AddonModDataEntryField;
};

/**
 * List of entries returned by web service and helper functions.
 */
export type AddonModDataEntries = {
    entries: AddonModDataEntry[]; // Online entries.
    totalcount: number; // Total count of online entries or found entries.
    maxcount?: number; // Total count of online entries. Only returned when searching.
    offlineEntries?: AddonModDataEntry[]; // Offline entries.
    hasOfflineActions?: boolean; // Whether the database has offline data.
    hasOfflineRatings?: boolean; // Whether the database has offline ratings.
};

/**
 * Subfield form data.
 */
export type AddonModDataSubfieldData = {
    fieldid: number;
    subfield?: string;
    value?: unknown; // Value encoded in JSON.
    files?: CoreFileEntry[];
};

/**
 * Params of mod_data_get_data_access_information WS.
 */
type AddonModDataGetDataAccessInformationWSParams = {
    databaseid: number; // Database instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
};

/**
 * Data returned by mod_data_get_data_access_information WS.
 */
export type AddonModDataGetDataAccessInformationWSResponse = {
    groupid: number; // User current group id (calculated).
    canaddentry: boolean; // Whether the user can add entries or not.
    canmanageentries: boolean; // Whether the user can manage entries or not.
    canapprove: boolean; // Whether the user can approve entries or not.
    timeavailable: boolean; // Whether the database is available or not by time restrictions.
    inreadonlyperiod: boolean; // Whether the database is in read mode only.
    numentries: number; // The number of entries the current user added.
    entrieslefttoadd: number; // The number of entries left to complete the activity.
    entrieslefttoview: number; // The number of entries left to view other users entries.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_data_get_databases_by_courses WS.
 */
type AddonModDataGetDatabasesByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_data_get_databases_by_courses WS.
 */
type AddonModDataGetDatabasesByCoursesWSResponse = {
    databases: AddonModDataData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Database data returned by mod_assign_get_assignments.
 */
export type AddonModDataData = {
    id: number; // Database id.
    course: number; // Course id.
    name: string; // Database name.
    intro: string; // The Database intro.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    comments: boolean; // Comments enabled.
    timeavailablefrom: number; // Timeavailablefrom field.
    timeavailableto: number; // Timeavailableto field.
    timeviewfrom: number; // Timeviewfrom field.
    timeviewto: number; // Timeviewto field.
    requiredentries: number; // Requiredentries field.
    requiredentriestoview: number; // Requiredentriestoview field.
    maxentries: number; // Maxentries field.
    rssarticles: number; // Rssarticles field.
    singletemplate: string; // Singletemplate field.
    listtemplate: string; // Listtemplate field.
    listtemplateheader: string; // Listtemplateheader field.
    listtemplatefooter: string; // Listtemplatefooter field.
    addtemplate: string; // Addtemplate field.
    rsstemplate: string; // Rsstemplate field.
    rsstitletemplate: string; // Rsstitletemplate field.
    csstemplate: string; // Csstemplate field.
    jstemplate: string; // Jstemplate field.
    asearchtemplate: string; // Asearchtemplate field.
    approval: boolean; // Approval field.
    manageapproved: boolean; // Manageapproved field.
    scale?: number; // Scale field.
    assessed?: number; // Assessed field.
    assesstimestart?: number; // Assesstimestart field.
    assesstimefinish?: number; // Assesstimefinish field.
    defaultsort: number; // Defaultsort field.
    defaultsortdir: number; // Defaultsortdir field.
    editany?: boolean; // Editany field (not used any more).
    notification?: number; // Notification field (not used any more).
    timemodified?: number; // Time modified.
    coursemodule: number; // Coursemodule.
    introfiles?: CoreWSExternalFile[];
};

/**
 * Params of mod_data_add_entry WS.
 */
type AddonModDataAddEntryWSParams = {
    databaseid: number; // Data instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    data: AddonModDataEntryWSField[]; // The fields data to be created.
};

/**
 * Data returned by mod_data_add_entry WS.
 */
export type AddonModDataAddEntryWSResponse = {
    newentryid: number; // True new created entry id. 0 if the entry was not created.
    generalnotifications: string[];
    fieldnotifications: AddonModDataFieldNotification[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_data_approve_entry WS.
 */
type AddonModDataApproveEntryWSParams = {
    entryid: number; // Record entry id.
    approve?: boolean; // Whether to approve (true) or unapprove the entry.
};

/**
 * Params of mod_data_delete_entry WS.
 */
type AddonModDataDeleteEntryWSParams = {
    entryid: number; // Record entry id.
};

/**
 * Params of mod_data_update_entry WS.
 */
type AddonModDataUpdateEntryWSParams = {
    entryid: number; // The entry record id.
    data: AddonModDataEntryWSField[]; // The fields data to be updated.
};

/**
 * Data returned by mod_data_update_entry WS.
 */
export type AddonModDataUpdateEntryWSResponse = {
    updated: boolean; // True if the entry was successfully updated, false other wise.
    generalnotifications: string[];
    fieldnotifications: AddonModDataFieldNotification[];
    warnings?: CoreWSExternalWarning[];
};

// The fields data to be created or updated.
export type AddonModDataEntryWSField = {
    fieldid: number; // The field id. AddonModDataSubfieldData
    subfield?: string; // The subfield name (if required).
    value: string; // The contents for the field always JSON encoded.
};

/**
 * Params of mod_data_get_entries WS.
 */
type AddonModDataGetEntriesWSParams = {
    databaseid: number; // Data instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    returncontents?: boolean; // Whether to return contents or not. This will return each entry raw contents and the complete list
    // view(using the template).
    sort?: number; // Sort the records by this field id, reserved ids are:
    // 0: timeadded
    // -1: firstname
    // -2: lastname
    // -3: approved
    // -4: timemodified.
    // Empty for using the default database setting.
    order?: string; // The direction of the sorting: 'ASC' or 'DESC'. Empty for using the default database setting.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
};

/**
 * Data returned by mod_data_get_entries WS.
 */
export type AddonModDataGetEntriesWSResponse = {
    entries: AddonModDataEntryWS[];
    totalcount: number; // Total count of records.
    totalfilesize: number; // Total size (bytes) of the files included in the records.
    listviewcontents?: string; // The list view contents as is rendered in the site.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_data_get_entry WS.
 */
type AddonModDataGetEntryWSParams = {
    entryid: number; // Record entry id.
    returncontents?: boolean; // Whether to return contents or not.
};

/**
 * Data returned by mod_data_get_entry WS.
 */
type AddonModDataGetEntryWSResponse = {
    entry: AddonModDataEntryWS;
    entryviewcontents?: string; // The entry as is rendered in the site.
    ratinginfo?: CoreRatingInfo; // Rating information.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_data_get_entry WS.
 */
export type AddonModDataGetEntryFormatted = {
    entry: AddonModDataEntry;
    entryviewcontents?: string; // The entry as is rendered in the site.
    ratinginfo?: CoreRatingInfo; // Rating information.
    warnings?: CoreWSExternalWarning[];
};

export type AddonModDataFieldNotification = {
    fieldname: string; // The field name.
    notification: string; // The notification for the field.
};

/**
 * Params of mod_data_get_fields WS.
 */
type AddonModDataGetFieldsWSParams = {
    databaseid: number; // Database instance id.
};

/**
 * Data returned by mod_data_get_fields WS.
 */
type AddonModDataGetFieldsWSResponse = {
    fields: AddonModDataField[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Field data returned by mod_data_get_fields WS.
 */
export type AddonModDataField = {
    id: number; // Field id.
    dataid: number; // The field type of the content.
    type: string; // The field type.
    name: string; // The field name.
    description: string; // The field description.
    required: boolean; // Whether is a field required or not.
    param1: string; // Field parameters.
    param2: string; // Field parameters.
    param3: string; // Field parameters.
    param4: string; // Field parameters.
    param5: string; // Field parameters.
    param6: string; // Field parameters.
    param7: string; // Field parameters.
    param8: string; // Field parameters.
    param9: string; // Field parameters.
    param10: string; // Field parameters.
};

export type AddonModDataEntryChangedEventData = {
    dataId: number;
    entryId?: number;
    deleted?: boolean;
};

/**
 * Advanced search field.
 */
export type AddonModDataSearchEntriesAdvancedField = {
    name: string; // Field key for search. Use fn or ln for first or last name.
    value: string; // JSON encoded value for search.
};

/**
 * Advanced search field.
 */
export type AddonModDataSearchEntriesAdvancedFieldFormatted = {
    name: string; // Field key for search. Use fn or ln for first or last name.
    value: unknown; // JSON encoded value for search.
};

export type AddonModDataAddEntryResult = Partial<AddonModDataAddEntryWSResponse> & {
    sent?: boolean; // True if sent, false if stored offline.
};

export type AddonModDataApproveEntryResult = {
    sent?: boolean; // True if sent, false if stored offline.
};

export type AddonModDataEditEntryResult = Partial<AddonModDataUpdateEntryWSResponse> & {
    sent?: boolean; // True if sent, false if stored offline.
};
