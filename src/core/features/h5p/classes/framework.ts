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

import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreH5P } from '@features/h5p/services/h5p';
import {
    CoreH5PCore,
    CoreH5PDisplayOptionBehaviour,
    CoreH5PContentDependencyData,
    CoreH5PLibraryData,
    CoreH5PLibraryAddonData,
    CoreH5PContentDepsTreeDependency,
    CoreH5PLibraryBasicData,
    CoreH5PLibraryBasicDataWithPatch,
    CoreH5PMissingLibrary,
} from './core';
import {
    CONTENT_TABLE_NAME,
    LIBRARIES_CACHEDASSETS_TABLE_NAME,
    CoreH5PLibraryCachedAssetsDBRecord,
    LIBRARIES_TABLE_NAME,
    LIBRARY_DEPENDENCIES_TABLE_NAME,
    CONTENTS_LIBRARIES_TABLE_NAME,
    CoreH5PContentDBRecord,
    CoreH5PLibraryDBRecord,
    CoreH5PLibraryDependencyDBRecord,
    CoreH5PContentsLibraryDBRecord,
    CoreH5PMissingDependencyDBRecord,
    MISSING_DEPENDENCIES_TABLE_NAME,
    MISSING_DEPENDENCIES_PRIMARY_KEYS,
    CoreH5PMissingDependencyDBPrimaryKeys,
} from '../services/database/h5p';
import { CoreError } from '@classes/errors/error';
import { CoreH5PSemantics } from './content-validator';
import { CoreH5PContentBeingSaved, CoreH5PLibraryBeingSaved } from './storage';
import { CoreH5PLibraryAddTo, CoreH5PLibraryMetadataSettings } from './validator';
import { CoreH5PMetadata } from './metadata';
import { Translate } from '@singletons';
import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import { LazyMap, lazyMap } from '@/core/utils/lazy-map';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { SubPartial } from '@/core/utils/types';
import { CoreH5PMissingDependenciesError } from './errors/missing-dependencies-error';
import { CoreFilepool } from '@services/filepool';
import { CoreFileHelper } from '@services/file-helper';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreArray } from '@singletons/array';

/**
 * Equivalent to Moodle's implementation of H5PFrameworkInterface.
 */
export class CoreH5PFramework {

    protected contentTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreH5PContentDBRecord>>>;
    protected librariesTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreH5PLibraryDBRecord>>>;
    protected libraryDependenciesTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreH5PLibraryDependencyDBRecord>>>;
    protected contentsLibrariesTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreH5PContentsLibraryDBRecord>>>;
    protected librariesCachedAssetsTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreH5PLibraryCachedAssetsDBRecord>>>;
    protected missingDependenciesTables: LazyMap<
        AsyncInstance<CoreDatabaseTable<CoreH5PMissingDependencyDBRecord, CoreH5PMissingDependencyDBPrimaryKeys>>
    >;

    constructor() {
        this.contentTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    CONTENT_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.contentTables[siteId],
                    },
                ),
            ),
        );
        this.librariesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    LIBRARIES_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.librariesTables[siteId],
                    },
                ),
            ),
        );
        this.libraryDependenciesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    LIBRARY_DEPENDENCIES_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.libraryDependenciesTables[siteId],
                    },
                ),
            ),
        );
        this.contentsLibrariesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    CONTENTS_LIBRARIES_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.contentsLibrariesTables[siteId],
                    },
                ),
            ),
        );
        this.librariesCachedAssetsTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    LIBRARIES_CACHEDASSETS_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.librariesCachedAssetsTables[siteId],
                    },
                ),
            ),
        );
        this.missingDependenciesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(
                    MISSING_DEPENDENCIES_TABLE_NAME,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.missingDependenciesTables[siteId],
                        primaryKeyColumns: [...MISSING_DEPENDENCIES_PRIMARY_KEYS],
                    },
                ),
            ),
        );
    }

    /**
     * Given a list of missing dependencies DB records, create a missing dependencies error.
     *
     * @param missingDependencies List of missing dependencies.
     * @returns Error instance.
     */
    buildMissingDependenciesErrorFromDBRecords(
        missingDependencies: CoreH5PMissingDependencyDBRecord[],
    ): CoreH5PMissingDependenciesError {
        const missingLibraries = missingDependencies.map(dep => ({
            machineName: dep.machinename,
            majorVersion: dep.majorversion,
            minorVersion: dep.minorversion,
            libString: dep.requiredby,
        }));

        const errorMessage = Translate.instant('core.h5p.missingdependency', { $a: {
            lib: missingLibraries[0].libString,
            dep: CoreH5PCore.libraryToString(missingLibraries[0]),
        } });

        return new CoreH5PMissingDependenciesError(errorMessage, missingLibraries);
    }

    /**
     * Will clear filtered params for all the content that uses the specified libraries.
     * This means that the content dependencies will have to be rebuilt and the parameters re-filtered.
     *
     * @param libraryIds Array of library ids.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async clearFilteredParameters(libraryIds: number[], siteId?: string): Promise<void> {
        if (!libraryIds || !libraryIds.length) {
            return;
        }

        siteId ??= CoreSites.getCurrentSiteId();

        await this.contentTables[siteId].updateWhere(
            { filtered: null },
            {
                sql: `mainlibraryid IN (${libraryIds.map(() => '?').join(', ')})`,
                sqlParams: libraryIds,
                js: record => libraryIds.includes(record.mainlibraryid),
            },
        );
    }

    /**
     * Delete cached assets from DB.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the removed entries.
     */
    async deleteCachedAssets(libraryId: number, siteId?: string): Promise<CoreH5PLibraryCachedAssetsDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        // Get all the hashes that use this library.
        const entries = await this.librariesCachedAssetsTables[siteId].getMany({ libraryid: libraryId });
        const hashes = entries.map((entry) => entry.hash);

        if (hashes.length) {
            // Delete the entries from DB.
            await this.librariesCachedAssetsTables[siteId].deleteWhere({
                sql: hashes.length === 1 ? 'hash = ?' : `hash IN (${hashes.map(() => '?').join(', ')})`,
                sqlParams: hashes,
                js: (record) => hashes.includes(record.hash),
            });
        }

        return entries;
    }

    /**
     * Delete content data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteContentData(id: number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        // The user content should be reset (instead of removed), because this method is called when H5P content needs
        // to be updated too (and the previous states must be kept, but reset).
        await this.resetContentUserData(id, siteId);

        await Promise.all([
            // Delete the content data.
            this.contentTables[siteId].deleteByPrimaryKey({ id }),

            // Remove content library dependencies.
            this.deleteLibraryUsage(id, siteId),
        ]);
    }

    /**
     * Delete library data from DB.
     *
     * @param id Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteLibrary(id: number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.librariesTables[siteId].deleteByPrimaryKey({ id });
    }

    /**
     * Delete all dependencies belonging to given library.
     *
     * @param libraryId Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteLibraryDependencies(libraryId: number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.libraryDependenciesTables[siteId].delete({ libraryid: libraryId });
    }

    /**
     * Delete what libraries a content item is using.
     *
     * @param id Package ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteLibraryUsage(id: number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.contentsLibrariesTables[siteId].delete({ h5pid: id });
    }

    /**
     * Delete missing dependencies stored for a certain component and componentId.
     *
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID.
     */
    async deleteMissingDependenciesForComponent(component: string, componentId: string | number, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.missingDependenciesTables[siteId].delete({ component, componentId });
    }

    /**
     * Delete all the missing dependencies related to a certain library version.
     *
     * @param libraryData Library.
     * @param siteId Site ID.
     */
    protected async deleteMissingDependenciesForLibrary(libraryData: CoreH5PLibraryBasicData, siteId: string): Promise<void> {
        await this.missingDependenciesTables[siteId].delete({
            machinename: libraryData.machineName,
            majorversion: libraryData.majorVersion,
            minorversion: libraryData.minorVersion,
        });
    }

    /**
     * Get all conent data from DB.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of content data.
     */
    async getAllContentData(siteId?: string): Promise<CoreH5PContentDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        return this.contentTables[siteId].getMany();
    }

    /**
     * Get conent data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the content data.
     */
    async getContentData(id: number, siteId?: string): Promise<CoreH5PContentDBRecord> {
        siteId ??= CoreSites.getCurrentSiteId();

        return this.contentTables[siteId].getOneByPrimaryKey({ id });
    }

    /**
     * Get conent data from DB.
     *
     * @param fileUrl H5P file URL.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the content data.
     */
    async getContentDataByUrl(fileUrl: string, siteId?: string): Promise<CoreH5PContentDBRecord> {
        siteId ??= CoreSites.getCurrentSiteId();

        // Try to use the folder name, it should be more reliable than the URL.
        const folderName = await CoreH5P.h5pCore.h5pFS.getContentFolderNameByUrl(fileUrl, siteId);

        try {
            return await this.contentTables[siteId].getOne({ foldername: folderName });
        } catch {
            // Cannot get folder name, the h5p file was probably deleted. Just use the URL.
            return await this.contentTables[siteId].getOne({ fileurl: fileUrl });
        }
    }

    /**
     * Get an identifier for a file URL, used to store missing dependencies.
     *
     * @param fileUrl File URL.
     * @param siteId Site ID. If not defined, current site.
     * @returns An identifier for the file.
     */
    async getFileIdForMissingDependencies(fileUrl: string, siteId?: string): Promise<string> {
        siteId ??= CoreSites.getCurrentSiteId();

        const isTrusted = await CoreH5P.isTrustedUrl(fileUrl, siteId);
        if (!isTrusted) {
            // Fix the URL, we need to URL of the trusted package.
            const file = await CoreFilepool.fixPluginfileURL(siteId, fileUrl);

            fileUrl = CoreFileHelper.getFileUrl(file);
        }

        // Remove all params from the URL except the time modified. We don't want the id to depend on changing params like
        // the language or the token.
        const urlParams = CoreUrl.extractUrlParams(fileUrl);
        fileUrl = CoreUrl.addParamsToUrl(
            CoreUrl.removeUrlParts(fileUrl, [CoreUrlPartNames.Query]),
            { modified: urlParams.modified },
        );

        // Only return the file args, that way the id doesn't depend on the endpoint to obtain the file.
        const fileArgs = CoreUrl.getPluginFileArgs(fileUrl);

        return fileArgs ? fileArgs.join('/') : fileUrl;
    }

    /**
     * Get the latest library version.
     *
     * @param machineName The library's machine name.
     * @returns Promise resolved with the latest library version data.
     */
    async getLatestLibraryVersion(machineName: string, siteId?: string): Promise<CoreH5PLibraryParsedDBRecord> {
        siteId ??= CoreSites.getCurrentSiteId();

        try {
            const records = await this.librariesTables[siteId].getMany(
                { machinename: machineName },
                {
                    limit: 1,
                    sorting: [
                        { majorversion: 'desc' },
                        { minorversion: 'desc' },
                        { patchversion: 'desc' },
                    ],
                },
            );

            if (records && records[0]) {
                return this.parseLibDBData(records[0]);
            }
        } catch {
            // Library not found.
        }

        throw new CoreError(`Missing required library: ${machineName}`);
    }

    /**
     * Get a library data stored in DB.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library data, rejected if not found.
     */
    protected async getLibrary(
        machineName: string,
        majorVersion?: string | number,
        minorVersion?: string | number,
        siteId?: string,
    ): Promise<CoreH5PLibraryParsedDBRecord> {
        siteId ??= CoreSites.getCurrentSiteId();

        const libraries = await this.librariesTables[siteId].getMany({
            machinename: machineName,
            majorversion: majorVersion !== undefined ? Number(majorVersion) : undefined,
            minorversion: minorVersion !== undefined ? Number(minorVersion) : undefined,
        });

        if (!libraries.length) {
            throw new CoreError('Libary not found.');
        }

        return this.parseLibDBData(libraries[0]);
    }

    /**
     * Get a library data stored in DB.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library data, rejected if not found.
     */
    getLibraryByData(libraryData: CoreH5PLibraryBasicData, siteId?: string): Promise<CoreH5PLibraryParsedDBRecord> {
        return this.getLibrary(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get a library data stored in DB by ID.
     *
     * @param id Library ID.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library data, rejected if not found.
     */
    async getLibraryById(id: number, siteId?: string): Promise<CoreH5PLibraryParsedDBRecord> {
        siteId ??= CoreSites.getCurrentSiteId();

        const library = await this.librariesTables[siteId].getOneByPrimaryKey({ id });

        return this.parseLibDBData(library);
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library ID, null if not found.
     */
    async getLibraryId(
        machineName: string,
        majorVersion?: string | number,
        minorVersion?: string | number,
        siteId?: string,
    ): Promise<number | undefined> {
        try {
            const library = await this.getLibrary(machineName, majorVersion, minorVersion, siteId);

            return library.id || undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library ID, null if not found.
     */
    getLibraryIdByData(libraryData: CoreH5PLibraryBasicData, siteId?: string): Promise<number | undefined> {
        return this.getLibraryId(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get missing dependencies stored for a certain component and componentId.
     *
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID.
     * @returns List of missing dependencies. Empty list if no missing dependencies stored for the file.
     */
    async getMissingDependenciesForComponent(
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<CoreH5PMissingDependencyDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        try {
            return await this.missingDependenciesTables[siteId].getMany({ component, componentId });
        } catch {
            return [];
        }
    }

    /**
     * Get missing dependencies stored for a certain file.
     *
     * @param fileUrl File URL.
     * @param siteId Site ID.
     * @returns List of missing dependencies. Empty list if no missing dependencies stored for the file.
     */
    async getMissingDependenciesForFile(fileUrl: string, siteId?: string): Promise<CoreH5PMissingDependencyDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        try {
            const fileId = await this.getFileIdForMissingDependencies(fileUrl, siteId);

            return await this.missingDependenciesTables[siteId].getMany({ fileid: fileId });
        } catch {
            return [];
        }
    }

    /**
     * Get the default behaviour for the display option defined.
     *
     * @param name Identifier for the setting.
     * @param defaultValue Optional default value if settings is not set.
     * @returns Return the value for this display option.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getOption(name: string, defaultValue: unknown): unknown {
        // For now, all them are disabled by default, so only will be rendered when defined in the display options.
        return CoreH5PDisplayOptionBehaviour.CONTROLLED_BY_AUTHOR_DEFAULT_OFF;
    }

    /**
     * Check whether the user has permission to execute an action.
     *
     * @param permission Permission to check.
     * @param id H5P package id.
     * @returns Whether the user has permission to execute an action.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasPermission(permission: number, id: number): boolean {
        // H5P capabilities have not been introduced.
        return true;
    }

    /**
     * Determines if content slug is used.
     *
     * @param slug The content slug.
     * @returns Whether the content slug is used
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isContentSlugAvailable(slug: string): boolean {
        // By default the slug should be available as it's currently generated as a unique value for each h5p content.
        return true;
    }

    /**
     * Check whether a library is a patched version of the one installed.
     *
     * @param library Library to check.
     * @param dbData Installed library. If not supplied it will be calculated.
     * @returns Promise resolved with boolean: whether it's a patched library.
     */
    async isPatchedLibrary(library: CoreH5PLibraryBasicDataWithPatch, dbData?: CoreH5PLibraryParsedDBRecord): Promise<boolean> {
        if (!dbData) {
            dbData = await this.getLibraryByData(library);
        }

        return library.patchVersion > dbData.patchversion;
    }

    /**
     * Convert list of library parameter values to csv.
     *
     * @param libraryData Library data as found in library.json files.
     * @param key Key that should be found in libraryData.
     * @param searchParam The library parameter (Default: 'path').
     * @returns Library parameter values separated by ', '
     */
    libraryParameterValuesToCsv(libraryData: CoreH5PLibraryBeingSaved, key: string, searchParam = 'path'): string {
        if (libraryData[key] !== undefined) {
            const parameterValues: string[] = [];

            libraryData[key].forEach((file) => {
                for (const index in file) {
                    if (index === searchParam) {
                        parameterValues.push(file[index]);
                    }
                }
            });

            return parameterValues.join(',');
        }

        return '';
    }

    /**
     * Load addon libraries.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the addon libraries.
     */
    async loadAddons(siteId?: string): Promise<CoreH5PLibraryAddonData[]> {

        const db = await CoreSites.getSiteDb(siteId);

        const query = 'SELECT l1.id AS libraryId, l1.machinename AS machineName, ' +
                        'l1.majorversion AS majorVersion, l1.minorversion AS minorVersion, ' +
                        'l1.patchversion AS patchVersion, l1.addto AS addTo, ' +
                        'l1.preloadedjs AS preloadedJs, l1.preloadedcss AS preloadedCss ' +
                    `FROM ${LIBRARIES_TABLE_NAME} l1 ` +
                    `LEFT JOIN ${LIBRARIES_TABLE_NAME} l2 ON l1.machinename = l2.machinename AND (` +
                        'l1.majorversion < l2.majorversion OR (l1.majorversion = l2.majorversion AND ' +
                        'l1.minorversion < l2.minorversion)) ' +
                    'WHERE l1.addto IS NOT NULL AND l2.machinename IS NULL';

        return await db.getRecordsSql<CoreH5PLibraryAddonData>(query);
    }

    /**
     * Load content data from DB.
     *
     * @param id Content ID.
     * @param fileUrl H5P file URL. Required if id is not provided.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the content data.
     */
    async loadContent(id?: number, fileUrl?: string, siteId?: string): Promise<CoreH5PFrameworkContentData> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        let contentData: CoreH5PContentDBRecord;

        if (id) {
            contentData = await this.getContentData(id, siteId);
        } else if (fileUrl) {
            contentData = await this.getContentDataByUrl(fileUrl, siteId);
        } else {
            throw new CoreError('No id or fileUrl supplied to loadContent.');
        }

        // Load the main library data.
        const libData = await this.getLibraryById(contentData.mainlibraryid, siteId);

        // Map the values to the names used by the H5P core (it's the same Moodle web does).
        const content = {
            id: contentData.id,
            params: contentData.jsoncontent,
            embedType: 'iframe', // Always use iframe.
            disable: null,
            folderName: contentData.foldername,
            title: libData.title,
            slug: `${CoreH5PCore.slugify(libData.title)}-${contentData.id}`,
            filtered: contentData.filtered,
            libraryId: libData.id,
            libraryName: libData.machinename,
            libraryMajorVersion: libData.majorversion,
            libraryMinorVersion: libData.minorversion,
            libraryEmbedTypes: libData.embedtypes,
            libraryFullscreen: libData.fullscreen,
            metadata: null,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params = CoreText.parseJSON<any>(contentData.jsoncontent);
        if (!params.metadata) {
            params.metadata = {};
        }
        // Add title to metadata.
        if (typeof params.title === 'string' && !params.metadata.title) {
            params.metadata.title = params.title;
        }
        content.metadata = params.metadata;
        content.params = JSON.stringify(params.params !== undefined && params.params != null ? params.params : params);

        return content;
    }

    /**
     * Load dependencies for the given content of the given type.
     *
     * @param id Content ID.
     * @param type The dependency type.
     * @returns Content dependencies, indexed by machine name.
     */
    async loadContentDependencies(
        id: number,
        type?: string,
        siteId?: string,
    ): Promise<{[machineName: string]: CoreH5PContentDependencyData}> {

        const db = await CoreSites.getSiteDb(siteId);

        let query = `SELECT
            hl.id AS libraryId,
            hl.machinename AS machineName,
            hl.majorversion AS majorVersion,
            hl.minorversion AS minorVersion,
            hl.patchversion AS patchVersion,
            hl.preloadedcss AS preloadedCss,
            hl.preloadedjs AS preloadedJs,
            hcl.dropcss AS dropCss,
            hcl.dependencytype as dependencyType
        FROM ${CONTENTS_LIBRARIES_TABLE_NAME} hcl
        JOIN ${LIBRARIES_TABLE_NAME} hl ON hcl.libraryid = hl.id
        WHERE hcl.h5pid = ?`;

        const queryArgs: (string | number)[] = [];
        queryArgs.push(id);

        if (type) {
            query += ' AND hcl.dependencytype = ?';
            queryArgs.push(type);
        }

        query += ' ORDER BY hcl.weight';

        const dependencies = await db.getRecordsSql<CoreH5PContentDependencyData>(query, queryArgs);

        return CoreArray.toObject(dependencies, 'machineName');
    }

    /**
     * Loads a library and its dependencies.
     *
     * @param machineName The library's machine name.
     * @param majorVersion The library's major version.
     * @param minorVersion The library's minor version.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library data.
     */
    async loadLibrary(
        machineName: string,
        majorVersion: number,
        minorVersion: number,
        siteId?: string,
    ): Promise<CoreH5PLibraryData> {

        // First get the library data from DB.
        const library = await this.getLibrary(machineName, majorVersion, minorVersion, siteId);

        const libraryData: CoreH5PLibraryData = {
            libraryId: library.id,
            title: library.title,
            machineName: library.machinename,
            majorVersion: library.majorversion,
            minorVersion: library.minorversion,
            patchVersion: library.patchversion,
            runnable: library.runnable,
            fullscreen: library.fullscreen,
            embedTypes: library.embedtypes,
            preloadedJs: library.preloadedjs || undefined,
            preloadedCss: library.preloadedcss || undefined,
            dropLibraryCss: library.droplibrarycss || undefined,
            semantics: library.semantics || undefined,
            preloadedDependencies: [],
            dynamicDependencies: [],
            editorDependencies: [],
        };

        // Now get the dependencies.
        const sql = `SELECT
            hl.id,
            hl.machinename,
            hl.majorversion,
            hl.minorversion,
            hll.dependencytype
        FROM ${LIBRARY_DEPENDENCIES_TABLE_NAME} hll
        JOIN ${LIBRARIES_TABLE_NAME} hl ON hll.requiredlibraryid = hl.id
        WHERE hll.libraryid = ?
        ORDER BY hl.id ASC`;

        const sqlParams = [
            library.id,
        ];

        const db = await CoreSites.getSiteDb(siteId);

        const dependencies = await db.getRecordsSql<LibraryDependency>(sql, sqlParams);

        dependencies.forEach((dependency) => {
            const key = `${dependency.dependencytype}Dependencies`;

            libraryData[key].push({
                machineName: dependency.machinename,
                majorVersion: dependency.majorversion,
                minorVersion: dependency.minorversion,
            });
        });

        return libraryData;
    }

    /**
     * Parse library addon data.
     *
     * @param library Library addon data.
     * @returns Parsed library.
     */
    parseLibAddonData(library: LibraryAddonDBData): CoreH5PLibraryAddonData {
        const parsedLib = <CoreH5PLibraryAddonData> library;
        parsedLib.addTo = CoreText.parseJSON<CoreH5PLibraryAddTo | null>(library.addTo, null);

        return parsedLib;
    }

    /**
     * Parse library DB data.
     *
     * @param library Library DB data.
     * @returns Parsed library.
     */
    protected parseLibDBData(library: CoreH5PLibraryDBRecord): CoreH5PLibraryParsedDBRecord {
        return Object.assign(library, {
            semantics: library.semantics ? CoreText.parseJSON(library.semantics, null) : null,
            addto: library.addto ? CoreText.parseJSON(library.addto, null) : null,
            metadatasettings: library.metadatasettings ? CoreText.parseJSON(library.metadatasettings, null) : null,
        });
    }

    /**
     * Resets marked user data for the given content.
     *
     * @param contentId Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async resetContentUserData(contentId: number, siteId?: string): Promise<void> {
        // In LMS, all the states of the component are deleted here.
        // This isn't possible in the app because we lack the course ID, which is needed for example by h5pactivity.
    }

    /**
     * Stores hash keys for cached assets, aggregated JavaScripts and stylesheets, and connects it to libraries so that we
     * know which cache file to delete when a library is updated.
     *
     * @param hash Hash key for the given libraries.
     * @param dependencies List of dependencies used to create the key.
     * @param folderName The name of the folder that contains the H5P.
     * @param siteId The site ID.
     * @returns Promise resolved when done.
     */
    async saveCachedAssets(
        hash: string,
        dependencies: {[machineName: string]: CoreH5PContentDependencyData},
        folderName: string,
        siteId?: string,
    ): Promise<void> {
        const targetSiteId = siteId ?? CoreSites.getCurrentSiteId();

        await Promise.all(Object.keys(dependencies).map(async (key) => {
            await this.librariesCachedAssetsTables[targetSiteId].insert({
                hash,
                libraryid: dependencies[key].libraryId,
                foldername: folderName,
            });
        }));
    }

    /**
     * Save library data in DB.
     *
     * @param libraryData Library data to save.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async saveLibraryData(libraryData: CoreH5PLibraryBeingSaved, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        // Some special properties needs some checking and converting before they can be saved.
        const preloadedJS = this.libraryParameterValuesToCsv(libraryData, 'preloadedJs', 'path');
        const preloadedCSS = this.libraryParameterValuesToCsv(libraryData, 'preloadedCss', 'path');
        const dropLibraryCSS = this.libraryParameterValuesToCsv(libraryData, 'dropLibraryCss', 'machineName');

        if (libraryData.semantics === undefined) {
            libraryData.semantics = [];
        }
        if (libraryData.fullscreen === undefined) {
            libraryData.fullscreen = 0;
        }

        let embedTypes = '';
        if (libraryData.embedTypes !== undefined) {
            embedTypes = libraryData.embedTypes.join(', ');
        }

        const data: SubPartial<CoreH5PLibraryDBRecord, 'id'> = {
            title: libraryData.title,
            machinename: libraryData.machineName,
            majorversion: libraryData.majorVersion,
            minorversion: libraryData.minorVersion,
            patchversion: libraryData.patchVersion,
            runnable: libraryData.runnable,
            fullscreen: libraryData.fullscreen,
            embedtypes: embedTypes,
            preloadedjs: preloadedJS,
            preloadedcss: preloadedCSS,
            droplibrarycss: dropLibraryCSS,
            semantics: libraryData.semantics !== undefined ? JSON.stringify(libraryData.semantics) : null,
            addto: libraryData.addTo !== undefined ? JSON.stringify(libraryData.addTo) : null,
            metadatasettings: libraryData.metadataSettings !== undefined ?
                CoreH5PMetadata.boolifyAndEncodeSettings(libraryData.metadataSettings) : null,
        };

        if (libraryData.libraryId) {
            data.id = libraryData.libraryId;
        }

        const libraryId = await this.librariesTables[siteId].insert(data);

        if (!data.id) {
            // New library. Get its ID.
            libraryData.libraryId = libraryId;
        } else {
            // Updated libary. Remove old dependencies.
            await this.deleteLibraryDependencies(data.id, siteId);
        }

        // Delete missing dependencies related to this library. Don't block the execution for this.
        CorePromiseUtils.ignoreErrors(this.deleteMissingDependenciesForLibrary(libraryData, siteId));
    }

    /**
     * Save what libraries a library is depending on.
     *
     * @param library Library data for the library we're saving dependencies for.
     * @param dependencies List of dependencies as associative arrays containing machineName, majorVersion, minorVersion.
     * @param dependencyType The type of dependency.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async saveLibraryDependencies(
        library: CoreH5PLibraryBeingSaved,
        dependencies: CoreH5PLibraryBasicData[],
        dependencyType: string,
        siteId?: string,
    ): Promise<void> {
        const targetSiteId = siteId ?? CoreSites.getCurrentSiteId();
        const libString = CoreH5PCore.libraryToString(library);

        await Promise.all(dependencies.map(async (dependency) => {
            // Get the ID of the library.
            const dependencyId = await this.getLibraryIdByData(dependency, siteId);

            if (!dependencyId) {
                // Missing dependency. It should have been detected before installing the package.
                throw new CoreH5PMissingDependenciesError(Translate.instant('core.h5p.missingdependency', { $a: {
                    lib: CoreH5PCore.libraryToString(library),
                    dep: CoreH5PCore.libraryToString(dependency),
                } }), [{ ...dependency, libString }]);
            }

            // Create the relation.
            if (typeof library.libraryId !== 'number') {
                throw new CoreError('Attempted to create dependencies of library without id');
            }

            await this.libraryDependenciesTables[targetSiteId].insert({
                libraryid: library.libraryId,
                requiredlibraryid: dependencyId,
                dependencytype: dependencyType,
            });
        }));
    }

    /**
     * Saves what libraries the content uses.
     *
     * @param id Id identifying the package.
     * @param librariesInUse List of libraries the content uses.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async saveLibraryUsage(
        id: number,
        librariesInUse: {[key: string]: CoreH5PContentDepsTreeDependency},
        siteId?: string,
    ): Promise<void> {
        const targetSiteId = siteId ?? CoreSites.getCurrentSiteId();

        // Calculate the CSS to drop.
        const dropLibraryCssList: Record<string, string> = {};

        for (const key in librariesInUse) {
            const dependency = librariesInUse[key];

            if ('dropLibraryCss' in dependency.library && dependency.library.dropLibraryCss) {
                const split = dependency.library.dropLibraryCss.split(', ');

                split.forEach((css) => {
                    dropLibraryCssList[css] = css;
                });
            }
        }

        // Now save the usage.
        await Promise.all(Object.keys(librariesInUse).map((key) => {
            const dependency = librariesInUse[key];

            return this.contentsLibrariesTables[targetSiteId].insert({
                h5pid: id,
                libraryid: dependency.library.libraryId,
                dependencytype: dependency.type,
                dropcss: dropLibraryCssList[dependency.library.machineName] ? 1 : 0,
                weight: dependency.weight ?? 0,
            });
        }));
    }

    /**
     * Store missing dependencies in DB.
     *
     * @param fileUrl URL of the package that has missing dependencies.
     * @param missingDependencies List of missing dependencies.
     * @param options Other options.
     */
    async storeMissingDependencies(
        fileUrl: string,
        missingDependencies: CoreH5PMissingLibrary[],
        options: StoreMissingDependenciesOptions = {},
    ): Promise<void> {
        const targetSiteId = options.siteId ?? CoreSites.getCurrentSiteId();

        const fileId = await this.getFileIdForMissingDependencies(fileUrl, targetSiteId);

        await Promise.all(missingDependencies.map((missingLibrary) => this.missingDependenciesTables[targetSiteId].insert({
            fileid: fileId,
            machinename: missingLibrary.machineName,
            majorversion: missingLibrary.majorVersion,
            minorversion: missingLibrary.minorVersion,
            requiredby: missingLibrary.libString,
            filetimemodified: options.fileTimemodified ?? 0,
            component: options.component,
            componentId: options.componentId,
        })));
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with content ID.
     */
    async updateContent(content: CoreH5PContentBeingSaved, folderName: string, fileUrl: string, siteId?: string): Promise<number> {
        siteId ??= CoreSites.getCurrentSiteId();

        // If the libraryid declared in the package is empty, get the latest version.
        if (content.library && content.library.libraryId === undefined) {
            const mainLibrary = await this.getLatestLibraryVersion(content.library.machineName, siteId);

            content.library.libraryId = mainLibrary.id;
        }

        // Add title to 'params' to be able to add it to metadata later.
        if (typeof content.title === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params = CoreText.parseJSON<any>(content.params || '{}');
            params.title = content.title;
            content.params = JSON.stringify(params);
        }

        if (typeof content.library?.libraryId !== 'number') {
            throw new CoreError('Attempted to create content of library without id');
        }

        const data: SubPartial<CoreH5PContentDBRecord, 'id'> = {
            jsoncontent: content.params ?? '{}',
            mainlibraryid: content.library?.libraryId,
            timemodified: Date.now(),
            filtered: null,
            foldername: folderName,
            fileurl: fileUrl,
            timecreated: Date.now(),
        };
        let contentId: number | undefined;

        if (content.id !== undefined) {
            data.id = content.id;
            contentId = content.id;
        }

        const newContentId = await this.contentTables[siteId].insert(data);

        if (!contentId) {
            // New content. Get its ID.
            content.id = newContentId;
            contentId = content.id;
        }

        return contentId;
    }

    /**
     * This will update selected fields on the given content.
     *
     * @param id Content identifier.
     * @param fields Object with the fields to update.
     * @param siteId Site ID. If not defined, current site.
     */
    async updateContentFields(id: number, fields: Partial<CoreH5PContentDBRecord>, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        await this.contentTables[siteId].update(fields, { id });
    }

}

/**
 * Content data returned by loadContent.
 */
export type CoreH5PFrameworkContentData = {
    id: number; // The id of the content.
    params: string; // The content in json format.
    embedType: string; // Embed type to use.
    disable: number | null; // H5P Button display options.
    folderName: string; // Name of the folder that contains the contents.
    title: string; // Main library's title.
    slug: string; // Lib title and ID slugified.
    filtered: string | null; // Filtered version of json_content.
    libraryId: number; // Main library's ID.
    libraryName: string; // Main library's machine name.
    libraryMajorVersion: number; // Main library's major version.
    libraryMinorVersion: number; // Main library's minor version.
    libraryEmbedTypes: string; // Main library's list of supported embed types.
    libraryFullscreen: number; // Main library's display fullscreen button.
    metadata: unknown; // Content metadata.
};

export type CoreH5PLibraryParsedDBRecord = Omit<CoreH5PLibraryDBRecord, 'semantics'|'addto'|'metadatasettings'> & {
    semantics: CoreH5PSemantics[] | null;
    addto: CoreH5PLibraryAddTo | null;
    metadatasettings: CoreH5PLibraryMetadataSettings | null;
};

type LibraryDependency = {
    id: number;
    machinename: string;
    majorversion: number;
    minorversion: number;
    dependencytype: string;
};

type LibraryAddonDBData = Omit<CoreH5PLibraryAddonData, 'addTo'> & {
    addTo: string;
};

/**
 * Options for storeMissingDependencies.
 */
type StoreMissingDependenciesOptions = {
    component?: string;
    componentId?: string | number;
    fileTimemodified?: number;
    siteId?: string;
};
