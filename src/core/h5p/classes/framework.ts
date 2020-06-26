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

import { CoreSites } from '@providers/sites';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreH5P, CoreH5PProvider } from '../providers/h5p';
import {
    CoreH5PCore, CoreH5PDisplayOptionBehaviour, CoreH5PContentDependencyData, CoreH5PLibraryData, CoreH5PLibraryAddonData,
    CoreH5PContentDepsTreeDependency
} from './core';

/**
 * Equivalent to Moodle's implementation of H5PFrameworkInterface.
 */
export class CoreH5PFramework {

    /**
     * Will clear filtered params for all the content that uses the specified libraries.
     * This means that the content dependencies will have to be rebuilt and the parameters re-filtered.
     *
     * @param libraryIds Array of library ids.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async clearFilteredParameters(libraryIds: number[], siteId?: string): Promise<void> {

        if (!libraryIds || !libraryIds.length) {
            return;
        }

        const db = await CoreSites.instance.getSiteDb(siteId);

        const whereAndParams = db.getInOrEqual(libraryIds);
        whereAndParams[0] = 'mainlibraryid ' + whereAndParams[0];

        return db.updateRecordsWhere(CoreH5PProvider.CONTENT_TABLE, { filtered: null }, whereAndParams[0], whereAndParams[1]);
    }

    /**
     * Delete cached assets from DB.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the removed entries.
     */
    async deleteCachedAssets(libraryId: number, siteId?: string): Promise<CoreH5PLibrariesCachedAssetsDBData[]> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        // Get all the hashes that use this library.
        const entries = await db.getRecords(CoreH5PProvider.LIBRARIES_CACHEDASSETS_TABLE, {libraryid: libraryId});

        const hashes = entries.map((entry) => entry.hash);

        if (hashes.length) {
            // Delete the entries from DB.
            await db.deleteRecordsList(CoreH5PProvider.LIBRARIES_CACHEDASSETS_TABLE, 'hash', hashes);
        }

        return entries;
    }

    /**
     * Delete content data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteContentData(id: number, siteId?: string): Promise<void> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        await Promise.all([
            // Delete the content data.
            db.deleteRecords(CoreH5PProvider.CONTENT_TABLE, {id: id}),

            // Remove content library dependencies.
            this.deleteLibraryUsage(id, siteId),
        ]);
    }

    /**
     * Delete library data from DB.
     *
     * @param id Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteLibrary(id: number, siteId?: string): Promise<void> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        await db.deleteRecords(CoreH5PProvider.LIBRARIES_TABLE, {id: id});
    }

    /**
     * Delete all dependencies belonging to given library.
     *
     * @param libraryId Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteLibraryDependencies(libraryId: number, siteId?: string): Promise<void> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        await db.deleteRecords(CoreH5PProvider.LIBRARY_DEPENDENCIES_TABLE, {libraryid: libraryId});
    }

    /**
     * Delete what libraries a content item is using.
     *
     * @param id Package ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteLibraryUsage(id: number, siteId?: string): Promise<void> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        await db.deleteRecords(CoreH5PProvider.CONTENTS_LIBRARIES_TABLE, {h5pid: id});
    }

    /**
     * Get all conent data from DB.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of content data.
     */
    async getAllContentData(siteId?: string): Promise<CoreH5PContentDBData[]> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        return db.getAllRecords(CoreH5PProvider.CONTENT_TABLE);
    }

    /**
     * Get conent data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    async getContentData(id: number, siteId?: string): Promise<CoreH5PContentDBData> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        return db.getRecord(CoreH5PProvider.CONTENT_TABLE, {id: id});
    }

    /**
     * Get conent data from DB.
     *
     * @param fileUrl H5P file URL.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    async getContentDataByUrl(fileUrl: string, siteId?: string): Promise<CoreH5PContentDBData> {
        const site = await CoreSites.instance.getSite(siteId);

        const db = site.getDb();

        // Try to use the folder name, it should be more reliable than the URL.
        const folderName = await CoreH5P.instance.h5pCore.h5pFS.getContentFolderNameByUrl(fileUrl, site.getId());

        try {
            const contentData = await db.getRecord(CoreH5PProvider.CONTENT_TABLE, {foldername: folderName});

            return contentData;
        } catch (error) {
            // Cannot get folder name, the h5p file was probably deleted. Just use the URL.
            return db.getRecord(CoreH5PProvider.CONTENT_TABLE, {fileurl: fileUrl});
        }
    }

    /**
     * Get the latest library version.
     *
     * @param machineName The library's machine name.
     * @return Promise resolved with the latest library version data.
     */
    async getLatestLibraryVersion(machineName: string, siteId?: string): Promise<CoreH5PLibraryDBData> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        try {
            const records = await db.getRecords(CoreH5PProvider.LIBRARIES_TABLE, {machinename: machineName},
                    'majorversion DESC, minorversion DESC, patchversion DESC', '*', 0, 1);

            if (records && records[0]) {
                return this.parseLibDBData(records[0]);
            }
        } catch (error) {
            // Library not found.
        }

        throw `Missing required library: ${machineName}`;
    }

    /**
     * Get a library data stored in DB.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    protected async getLibrary(machineName: string, majorVersion?: string | number, minorVersion?: string | number,
            siteId?: string): Promise<CoreH5PLibraryDBData> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        const conditions = {
            machinename: machineName,
            majorversion: undefined,
            minorversion: undefined,
        };

        if (typeof majorVersion != 'undefined') {
            conditions.majorversion = majorVersion;
        }
        if (typeof minorVersion != 'undefined') {
            conditions.minorversion = minorVersion;
        }

        const libraries = await db.getRecords(CoreH5PProvider.LIBRARIES_TABLE, conditions);

        if (!libraries.length) {
            throw 'Libary not found.';
        }

        return this.parseLibDBData(libraries[0]);
    }

    /**
     * Get a library data stored in DB.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    getLibraryByData(libraryData: any, siteId?: string): Promise<CoreH5PLibraryDBData> {
        return this.getLibrary(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get a library data stored in DB by ID.
     *
     * @param id Library ID.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    async getLibraryById(id: number, siteId?: string): Promise<CoreH5PLibraryDBData> {
        const db = await CoreSites.instance.getSiteDb(siteId);

        const library = await db.getRecord(CoreH5PProvider.LIBRARIES_TABLE, {id: id});

        return this.parseLibDBData(library);
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param machineName Machine name.
     * @param majorVersion Major version number.
     * @param minorVersion Minor version number.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library ID, null if not found.
     */
    async getLibraryId(machineName: string, majorVersion?: string | number, minorVersion?: string | number, siteId?: string)
            : Promise<number> {

        try {
            const library = await this.getLibrary(machineName, majorVersion, minorVersion, siteId);

            return (library && library.id) || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library ID, null if not found.
     */
    getLibraryIdByData(libraryData: any, siteId?: string): Promise<number> {
        return this.getLibraryId(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get the default behaviour for the display option defined.
     *
     * @param name Identifier for the setting.
     * @param defaultValue Optional default value if settings is not set.
     * @return Return the value for this display option.
     */
    getOption(name: string, defaultValue: any = false): any {
        // For now, all them are disabled by default, so only will be rendered when defined in the display options.
        return CoreH5PDisplayOptionBehaviour.CONTROLLED_BY_AUTHOR_DEFAULT_OFF;
    }

    /**
     * Check whether the user has permission to execute an action.
     *
     * @param permission Permission to check.
     * @param id H5P package id.
     * @return Whether the user has permission to execute an action.
     */
    hasPermission(permission: number, id: number): boolean {
        // H5P capabilities have not been introduced.
        return null;
    }

    /**
     * Determines if content slug is used.
     *
     * @param slug The content slug.
     * @return Whether the content slug is used
     */
    isContentSlugAvailable(slug: string): boolean {
        // By default the slug should be available as it's currently generated as a unique value for each h5p content.
        return true;
    }

    /**
     * Check whether a library is a patched version of the one installed.
     *
     * @param library Library to check.
     * @param dbData Installed library. If not supplied it will be calculated.
     * @return Promise resolved with boolean: whether it's a patched library.
     */
    async isPatchedLibrary(library: any, dbData?: CoreH5PLibraryDBData): Promise<boolean> {
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
     * @return Library parameter values separated by ', '
     */
    libraryParameterValuesToCsv(libraryData: any, key: string, searchParam: string = 'path'): string {
        if (typeof libraryData[key] != 'undefined') {
            const parameterValues = [];

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
     * @return Promise resolved with the addon libraries.
     */
    async loadAddons(siteId?: string): Promise<CoreH5PLibraryAddonData[]> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        const query = 'SELECT l1.id AS libraryId, l1.machinename AS machineName, ' +
                        'l1.majorversion AS majorVersion, l1.minorversion AS minorVersion, ' +
                        'l1.patchversion AS patchVersion, l1.addto AS addTo, ' +
                        'l1.preloadedjs AS preloadedJs, l1.preloadedcss AS preloadedCss ' +
                    'FROM ' + CoreH5PProvider.LIBRARIES_TABLE + ' l1 ' +
                    'JOIN ' + CoreH5PProvider.LIBRARIES_TABLE + ' l2 ON l1.machinename = l2.machinename AND (' +
                        'l1.majorversion < l2.majorversion OR (l1.majorversion = l2.majorversion AND ' +
                        'l1.minorversion < l2.minorversion)) ' +
                    'WHERE l1.addto IS NOT NULL AND l2.machinename IS NULL';

        const result = await db.execute(query);

        const addons = [];

        for (let i = 0; i < result.rows.length; i++) {
            addons.push(this.parseLibAddonData(result.rows.item(i)));
        }

        return addons;
    }

    /**
     * Load content data from DB.
     *
     * @param id Content ID.
     * @param fileUrl H5P file URL. Required if id is not provided.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    async loadContent(id?: number, fileUrl?: string, siteId?: string): Promise<CoreH5PFrameworkContentData> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        let contentData: CoreH5PContentDBData;

        if (id) {
            contentData = await this.getContentData(id, siteId);
        } else if (fileUrl) {
            contentData = await this.getContentDataByUrl(fileUrl, siteId);
        } else {
            throw 'No id or fileUrl supplied to loadContent.';
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
            slug: CoreH5PCore.slugify(libData.title) + '-' + contentData.id,
            filtered: contentData.filtered,
            libraryId: libData.id,
            libraryName: libData.machinename,
            libraryMajorVersion: libData.majorversion,
            libraryMinorVersion: libData.minorversion,
            libraryEmbedTypes: libData.embedtypes,
            libraryFullscreen: libData.fullscreen,
            metadata: null,
        };

        const params = CoreTextUtils.instance.parseJSON(contentData.jsoncontent);
        if (!params.metadata) {
            params.metadata = {};
        }
        content.metadata = params.metadata;
        content.params = JSON.stringify(typeof params.params != 'undefined' && params.params != null ? params.params : params);

        return content;
    }

    /**
     * Load dependencies for the given content of the given type.
     *
     * @param id Content ID.
     * @param type The dependency type.
     * @return Content dependencies, indexed by machine name.
     */
    async loadContentDependencies(id: number, type?: string, siteId?: string)
            : Promise<{[machineName: string]: CoreH5PContentDependencyData}> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        let query = 'SELECT hl.id AS libraryId, hl.machinename AS machineName, ' +
                        'hl.majorversion AS majorVersion, hl.minorversion AS minorVersion, ' +
                        'hl.patchversion AS patchVersion, hl.preloadedcss AS preloadedCss, ' +
                        'hl.preloadedjs AS preloadedJs, hcl.dropcss AS dropCss, ' +
                        'hcl.dependencytype as dependencyType ' +
                    'FROM ' + CoreH5PProvider.CONTENTS_LIBRARIES_TABLE + ' hcl ' +
                    'JOIN ' + CoreH5PProvider.LIBRARIES_TABLE + ' hl ON hcl.libraryid = hl.id ' +
                    'WHERE hcl.h5pid = ?';
        const queryArgs = [];
        queryArgs.push(id);

        if (type) {
            query += ' AND hcl.dependencytype = ?';
            queryArgs.push(type);
        }

        query += ' ORDER BY hcl.weight';

        const result = await db.execute(query, queryArgs);

        const dependencies = {};

        for (let i = 0; i < result.rows.length; i++) {
            const dependency = result.rows.item(i);

            dependencies[dependency.machineName] = dependency;
        }

        return dependencies;
    }

    /**
     * Loads a library and its dependencies.
     *
     * @param machineName The library's machine name.
     * @param majorVersion The library's major version.
     * @param minorVersion The library's minor version.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data.
     */
    async loadLibrary(machineName: string, majorVersion: number, minorVersion: number, siteId?: string)
            : Promise<CoreH5PLibraryData> {

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
            preloadedJs: library.preloadedjs,
            preloadedCss: library.preloadedcss,
            dropLibraryCss: library.droplibrarycss,
            semantics: library.semantics,
            preloadedDependencies: [],
            dynamicDependencies: [],
            editorDependencies: []
        };

        // Now get the dependencies.
        const sql = 'SELECT hl.id, hl.machinename, hl.majorversion, hl.minorversion, hll.dependencytype ' +
                'FROM ' + CoreH5PProvider.LIBRARY_DEPENDENCIES_TABLE + ' hll ' +
                'JOIN ' + CoreH5PProvider.LIBRARIES_TABLE + ' hl ON hll.requiredlibraryid = hl.id ' +
                'WHERE hll.libraryid = ? ' +
                'ORDER BY hl.id ASC';

        const sqlParams = [
            library.id,
        ];

        const db = await CoreSites.instance.getSiteDb(siteId);

        const result = await db.execute(sql, sqlParams);

        for (let i = 0; i < result.rows.length; i++) {
            const dependency = result.rows.item(i);
            const key = dependency.dependencytype + 'Dependencies';

            libraryData[key].push({
                machineName: dependency.machinename,
                majorVersion: dependency.majorversion,
                minorVersion: dependency.minorversion
            });
        }

        return libraryData;
    }

    /**
     * Parse library addon data.
     *
     * @param library Library addon data.
     * @return Parsed library.
     */
    parseLibAddonData(library: any): CoreH5PLibraryAddonData {
        library.addto = CoreTextUtils.instance.parseJSON(library.addto, null);

        return library;
    }

    /**
     * Parse library DB data.
     *
     * @param library Library DB data.
     * @return Parsed library.
     */
    protected parseLibDBData(library: any): CoreH5PLibraryDBData {
        library.semantics = CoreTextUtils.instance.parseJSON(library.semantics, null);
        library.addto = CoreTextUtils.instance.parseJSON(library.addto, null);

        return library;
    }

    /**
     * Resets marked user data for the given content.
     *
     * @param contentId Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async resetContentUserData(conentId: number, siteId?: string): Promise<void> {
        // Currently, we do not store user data for a content.
    }

    /**
     * Stores hash keys for cached assets, aggregated JavaScripts and stylesheets, and connects it to libraries so that we
     * know which cache file to delete when a library is updated.
     *
     * @param key Hash key for the given libraries.
     * @param libraries List of dependencies used to create the key.
     * @param folderName The name of the folder that contains the H5P.
     * @param siteId The site ID.
     * @return Promise resolved when done.
     */
    async saveCachedAssets(hash: string, dependencies: {[machineName: string]: CoreH5PContentDependencyData},
            folderName: string, siteId?: string): Promise<void> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        await Promise.all(Object.keys(dependencies).map(async (key) => {
            const data = {
                hash: key,
                libraryid: dependencies[key].libraryId,
                foldername: folderName,
            };

            await db.insertRecord(CoreH5PProvider.LIBRARIES_CACHEDASSETS_TABLE, data);
        }));
    }

    /**
     * Save library data in DB.
     *
     * @param libraryData Library data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async saveLibraryData(libraryData: any, siteId?: string): Promise<void> {
        // Some special properties needs some checking and converting before they can be saved.
        const preloadedJS = this.libraryParameterValuesToCsv(libraryData, 'preloadedJs', 'path');
        const preloadedCSS = this.libraryParameterValuesToCsv(libraryData, 'preloadedCss', 'path');
        const dropLibraryCSS = this.libraryParameterValuesToCsv(libraryData, 'dropLibraryCss', 'machineName');

        if (typeof libraryData.semantics == 'undefined') {
            libraryData.semantics = '';
        }
        if (typeof libraryData.fullscreen == 'undefined') {
            libraryData.fullscreen = 0;
        }

        let embedTypes = '';
        if (typeof libraryData.embedTypes != 'undefined') {
            embedTypes = libraryData.embedTypes.join(', ');
        }

        const site = await CoreSites.instance.getSite(siteId);

        const db = site.getDb();
        const data = {
            id: undefined,
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
            semantics: typeof libraryData.semantics != 'undefined' ? JSON.stringify(libraryData.semantics) : null,
            addto: typeof libraryData.addTo != 'undefined' ? JSON.stringify(libraryData.addTo) : null,
        };

        if (libraryData.libraryId) {
            data.id = libraryData.libraryId;
        }

        await db.insertRecord(CoreH5PProvider.LIBRARIES_TABLE, data);

        if (!data.id) {
            // New library. Get its ID.
            const entry = await db.getRecord(CoreH5PProvider.LIBRARIES_TABLE, data);

            libraryData.libraryId = entry.id;
        } else {
            // Updated libary. Remove old dependencies.
            await this.deleteLibraryDependencies(data.id, site.getId());
        }
    }

    /**
     * Save what libraries a library is depending on.
     *
     * @param libraryId Library Id for the library we're saving dependencies for.
     * @param dependencies List of dependencies as associative arrays containing machineName, majorVersion, minorVersion.
     * @param dependencytype The type of dependency.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async saveLibraryDependencies(libraryId: number, dependencies: any[], dependencyType: string, siteId?: string): Promise<void> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        await Promise.all(dependencies.map(async (dependency) => {
            // Get the ID of the library.
            const dependencyId = await this.getLibraryIdByData(dependency, siteId);

            // Create the relation.
            const entry = {
                libraryid: libraryId,
                requiredlibraryid: dependencyId,
                dependencytype: dependencyType
            };

            await db.insertRecord(CoreH5PProvider.LIBRARY_DEPENDENCIES_TABLE, entry);
        }));
    }

    /**
     * Saves what libraries the content uses.
     *
     * @param id Id identifying the package.
     * @param librariesInUse List of libraries the content uses.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async saveLibraryUsage(id: number, librariesInUse: {[key: string]: CoreH5PContentDepsTreeDependency}, siteId?: string)
            : Promise<void> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        // Calculate the CSS to drop.
        const dropLibraryCssList = {};

        for (const key in librariesInUse) {
            const dependency = librariesInUse[key];

            if ((<CoreH5PLibraryData> dependency.library).dropLibraryCss) {
                const split = (<CoreH5PLibraryData> dependency.library).dropLibraryCss.split(', ');

                split.forEach((css) => {
                    dropLibraryCssList[css] = css;
                });
            }
        }

        // Now save the uusage.
        await Promise.all(Object.keys(librariesInUse).map((key) => {
            const dependency = librariesInUse[key];
            const data = {
                h5pid: id,
                libraryId: dependency.library.libraryId,
                dependencytype: dependency.type,
                dropcss: dropLibraryCssList[dependency.library.machineName] ? 1 : 0,
                weight: dependency.weight,
            };

            return db.insertRecord(CoreH5PProvider.CONTENTS_LIBRARIES_TABLE, data);
        }));
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with content ID.
     */
    async updateContent(content: any, folderName: string, fileUrl: string, siteId?: string): Promise<number> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        // If the libraryid declared in the package is empty, get the latest version.
        if (typeof content.library.libraryId == 'undefined') {
            const mainLibrary = await this.getLatestLibraryVersion(content.library.machineName, siteId);

            content.library.libraryId = mainLibrary.id;
        }

        const data: CoreH5PContentDBData = {
            id: undefined,
            jsoncontent: content.params,
            mainlibraryid: content.library.libraryId,
            timemodified: Date.now(),
            filtered: null,
            foldername: folderName,
            fileurl: fileUrl,
            timecreated: undefined,
        };

        if (typeof content.id != 'undefined') {
            data.id = content.id;
        } else {
            data.timecreated = data.timemodified;
        }

        await db.insertRecord(CoreH5PProvider.CONTENT_TABLE, data);

        if (!data.id) {
            // New content. Get its ID.
            const entry = await db.getRecord(CoreH5PProvider.CONTENT_TABLE, data);

            content.id = entry.id;
        }

        return content.id;
    }

    /**
     * This will update selected fields on the given content.
     *
     * @param id Content identifier.
     * @param fields Object with the fields to update.
     * @param siteId Site ID. If not defined, current site.
     */
    async updateContentFields(id: number, fields: {[name: string]: any}, siteId?: string): Promise<void> {

        const db = await CoreSites.instance.getSiteDb(siteId);

        const data = Object.assign({}, fields);
        delete data.slug; // Slug isn't stored in DB.

        await db.updateRecords(CoreH5PProvider.CONTENT_TABLE, data, {id: id});
    }
}

/**
 * Content data returned by loadContent.
 */
export type CoreH5PFrameworkContentData = {
    id: number; // The id of the content.
    params: string; // The content in json format.
    embedType: string; // Embed type to use.
    disable: number; // H5P Button display options.
    folderName: string; // Name of the folder that contains the contents.
    title: string; // Main library's title.
    slug: string; // Lib title and ID slugified.
    filtered: string; // Filtered version of json_content.
    libraryId: number; // Main library's ID.
    libraryName: string; // Main library's machine name.
    libraryMajorVersion: number; // Main library's major version.
    libraryMinorVersion: number; // Main library's minor version.
    libraryEmbedTypes: string; // Main library's list of supported embed types.
    libraryFullscreen: number; // Main library's display fullscreen button.
    metadata: any; // Content metadata.
};

/**
 * Content data stored in DB.
 */
export type CoreH5PContentDBData = {
    id: number; // The id of the content.
    jsoncontent: string; // The content in json format.
    mainlibraryid: number; // The library we first instantiate for this node.
    foldername: string; // Name of the folder that contains the contents.
    fileurl: string; // The online URL of the H5P package.
    filtered: string; // Filtered version of json_content.
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
};

/**
 * Library data stored in DB.
 */
export type CoreH5PLibraryDBData = {
    id: number; // The id of the library.
    machinename: string; // The library machine name.
    title: string; // The human readable name of this library.
    majorversion: number; // Major version.
    minorversion: number; // Minor version.
    patchversion: number; // Patch version.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedtypes: string; // List of supported embed types.
    preloadedjs?: string; // Comma separated list of scripts to load.
    preloadedcss?: string; // Comma separated list of stylesheets to load.
    droplibrarycss?: string; // List of libraries that should not have CSS included if this library is used. Comma separated list.
    semantics?: any; // The semantics definition.
    addto?: any; // Plugin configuration data.
};

/**
 * Library dependencies stored in DB.
 */
export type CoreH5PLibraryDependenciesDBData = {
    id: number; // Id.
    libraryid: number; // The id of an H5P library.
    requiredlibraryid: number; // The dependent library to load.
    dependencytype: string; // Type: preloaded, dynamic, or editor.
};

/**
 * Library cached assets stored in DB.
 */
export type CoreH5PLibrariesCachedAssetsDBData = {
    id: number; // Id.
    libraryid: number; // The id of an H5P library.
    hash: string; // The hash to identify the cached asset.
    foldername: string; // Name of the folder that contains the contents.
};
