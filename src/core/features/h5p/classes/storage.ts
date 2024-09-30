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

import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CorePath } from '@singletons/path';
import { CoreH5PCore, CoreH5PLibraryBasicData } from './core';
import { CoreH5PFramework } from './framework';
import { CoreH5PMetadata } from './metadata';
import {
    CoreH5PLibrariesJsonData,
    CoreH5PLibraryJsonData,
    CoreH5PLibraryMetadataSettings,
    CoreH5PMainJSONFilesData,
} from './validator';

/**
 * Equivalent to H5P's H5PStorage class.
 */
export class CoreH5PStorage {

    constructor(
        protected h5pCore: CoreH5PCore,
        protected h5pFramework: CoreH5PFramework,
    ) { }

    /**
     * Save libraries.
     *
     * @param librariesJsonData Data about libraries.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    protected async saveLibraries(librariesJsonData: CoreH5PLibrariesJsonData, folderName: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // First of all, try to create the dir where the libraries are stored. This way we don't have to do it for each lib.
        await CoreFile.createDir(this.h5pCore.h5pFS.getLibrariesFolderPath(siteId));

        const libraryIds: number[] = [];

        // Go through libraries that came with this package.
        await Promise.all(Object.keys(librariesJsonData).map(async (libString) => {
            const libraryData: CoreH5PLibraryBeingSaved = librariesJsonData[libString];

            // Find local library with same major + minor.
            const existingLibrary = await CoreUtils.ignoreErrors(this.h5pFramework.getLibraryByData(libraryData));

            if (existingLibrary) {
                // Library already installed.
                libraryData.libraryId = existingLibrary.id;

                const newerPatchVersion = existingLibrary.patchversion < libraryData.patchVersion;

                // Make sure the library is fully saved to the file system if it is present in the DB.
                // Some files might be missing if a previous library update was interrupted.
                if (!newerPatchVersion && await this.h5pCore.h5pFS.checkLibrary(libraryData, siteId)) {
                    // Same or older version, no need to save.
                    libraryData.saveDependencies = false;

                    return;
                }
            }

            libraryData.saveDependencies = true;

            // Convert metadataSettings values to boolean and json_encode it before saving.
            libraryData.metadataSettings = libraryData.metadataSettings ?
                CoreH5PMetadata.boolifyAndEncodeSettings(libraryData.metadataSettings) : undefined;

            // Save the library files before saving to DB, in case the app is closed while copying the files.
            await this.h5pCore.h5pFS.saveLibrary(libraryData, siteId);

            // Save the library data in DB.
            await this.h5pFramework.saveLibraryData(libraryData, siteId);

            if (libraryData.libraryId !== undefined) {
                const promises: Promise<void>[] = [];

                // Remove all indexes of contents that use this library.
                promises.push(this.h5pCore.h5pFS.deleteContentIndexesForLibrary(libraryData.libraryId, siteId));

                if (this.h5pCore.aggregateAssets) {
                    // Remove cached assets that use this library.
                    const removedEntries = await this.h5pFramework.deleteCachedAssets(libraryData.libraryId, siteId);

                    await this.h5pCore.h5pFS.deleteCachedAssets(removedEntries, siteId);
                }

                await CoreUtils.allPromises(promises);
            }
        }));

        // Go through the libraries again to save dependencies.
        await Promise.all(Object.keys(librariesJsonData).map(async (libString) => {
            const libraryData: CoreH5PLibraryBeingSaved = librariesJsonData[libString];

            if (!libraryData.saveDependencies || !libraryData.libraryId) {
                return;
            }

            libraryIds.push(libraryData.libraryId);

            // Remove any old dependencies.
            await this.h5pFramework.deleteLibraryDependencies(libraryData.libraryId, siteId);

            // Insert the different new ones.
            const promises: Promise<void>[] = [];

            if (libraryData.preloadedDependencies !== undefined) {
                promises.push(this.h5pFramework.saveLibraryDependencies(
                    libraryData,
                    libraryData.preloadedDependencies,
                    'preloaded',
                ));
            }
            if (libraryData.dynamicDependencies !== undefined) {
                promises.push(this.h5pFramework.saveLibraryDependencies(libraryData, libraryData.dynamicDependencies, 'dynamic'));
            }
            // Don't save editor dependencies, they are not used in the app.

            await Promise.all(promises);
        }));

        // Make sure dependencies, parameter filtering and export files get regenerated for content who uses these libraries.
        if (libraryIds.length) {
            await this.h5pFramework.clearFilteredParameters(libraryIds, siteId);
        }
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param data Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param skipContent Skip content.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the content data.
     */
    async savePackage(
        data: CoreH5PMainJSONFilesData,
        folderName: string,
        fileUrl: string,
        skipContent?: boolean,
        siteId?: string,
    ): Promise<CoreH5PContentBeingSaved> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (this.h5pCore.mayUpdateLibraries()) {
            // Save the libraries that were processed.
            await this.saveLibraries(data.librariesJsonData, folderName, siteId);
        }

        const content: CoreH5PContentBeingSaved = {};

        // Add the 'title' if exists from 'h5p.json' data to be able to add it to metadata later.
        if (typeof data.mainJsonData.title === 'string') {
            content.title = data.mainJsonData.title;
        }

        if (!skipContent) {
            // Find main library version.
            if (data.mainJsonData.preloadedDependencies) {
                const mainLib = data.mainJsonData.preloadedDependencies.find((dependency) =>
                    dependency.machineName === data.mainJsonData.mainLibrary);

                if (mainLib) {
                    const id = await this.h5pFramework.getLibraryIdByData(mainLib);

                    content.library = Object.assign(mainLib, { libraryId: id });
                }
            }

            content.params = JSON.stringify(data.contentJsonData);

            // Save the content files in their right place in FS.
            const destFolder = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);
            const contentPath = CorePath.concatenatePaths(destFolder, 'content');

            // Save the content files before saving to DB, in case the app is closed while copying the files.
            await this.h5pCore.h5pFS.saveContent(contentPath, folderName, siteId);

            // Save the content data in DB.
            await this.h5pCore.saveContent(content, folderName, fileUrl, siteId);
        }

        return content;
    }

}

/**
 * Library to save.
 */
export type CoreH5PLibraryBeingSaved = Omit<CoreH5PLibraryJsonData, 'metadataSettings'> & {
    libraryId?: number; // Library ID in the DB.
    saveDependencies?: boolean; // Whether to save dependencies.
    metadataSettings?: CoreH5PLibraryMetadataSettings | string; // Encoded metadata settings.
};

/**
 * Data about a content being saved.
 */
export type CoreH5PContentBeingSaved = {
    id?: number;
    params?: string;
    library?: CoreH5PContentLibrary;
    title?: string;
};

export type CoreH5PContentLibrary = CoreH5PLibraryBasicData & {
    libraryId?: number; // Library ID in the DB.
};
