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

import { CoreFile, CoreFileProvider } from '@providers/file';
import { CoreSites } from '@providers/sites';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUtils } from '@providers/utils/utils';
import { CoreH5PCore } from './core';
import { CoreH5PFramework, CoreH5PLibraryDBData } from './framework';
import { CoreH5PMetadata } from './metadata';
import { CoreH5PMainJSONFilesData } from './validator';

/**
 * Equivalent to H5P's H5PStorage class.
 */
export class CoreH5PStorage {

    constructor(protected h5pCore: CoreH5PCore,
            protected h5pFramework: CoreH5PFramework) { }

    /**
     * Save libraries.
     *
     * @param librariesJsonData Data about libraries.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected async saveLibraries(librariesJsonData: any, folderName: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        // First of all, try to create the dir where the libraries are stored. This way we don't have to do it for each lib.
        await CoreFile.instance.createDir(this.h5pCore.h5pFS.getLibrariesFolderPath(siteId));

        const libraryIds = [];

        // Go through libraries that came with this package.
        await Promise.all(Object.keys(librariesJsonData).map(async (libString) => {
            const libraryData = librariesJsonData[libString];

            // Find local library identifier.
            let dbData: CoreH5PLibraryDBData;

            try {
                dbData = await this.h5pFramework.getLibraryByData(libraryData);
            } catch (error) {
                // Not found.
            }

            if (dbData) {
                // Library already installed.
                libraryData.libraryId = dbData.id;

                const isNewPatch = await this.h5pFramework.isPatchedLibrary(libraryData, dbData);

                if (!isNewPatch) {
                    // Same or older version, no need to save.
                    libraryData.saveDependencies = false;

                    return;
                }
            }

            libraryData.saveDependencies = true;

            // Convert metadataSettings values to boolean and json_encode it before saving.
            libraryData.metadataSettings = libraryData.metadataSettings ?
                    CoreH5PMetadata.boolifyAndEncodeSettings(libraryData.metadataSettings) : null;

            // Save the library data in DB.
            await this.h5pFramework.saveLibraryData(libraryData, siteId);

            // Now save it in FS.
            try {
                await this.h5pCore.h5pFS.saveLibrary(libraryData, siteId);
            } catch (error) {
                // An error occurred, delete the DB data because the lib FS data has been deleted.
                await this.h5pFramework.deleteLibrary(libraryData.libraryId, siteId);

                throw error;
            }

            if (typeof libraryData.libraryId != 'undefined') {
                const promises = [];

                // Remove all indexes of contents that use this library.
                promises.push(this.h5pCore.h5pFS.deleteContentIndexesForLibrary(libraryData.libraryId, siteId));

                if (this.h5pCore.aggregateAssets) {
                    // Remove cached assets that use this library.
                    const removedEntries = await this.h5pFramework.deleteCachedAssets(libraryData.libraryId, siteId);

                    await this.h5pCore.h5pFS.deleteCachedAssets(removedEntries, siteId);
                }

                await CoreUtils.instance.allPromises(promises);
            }
        }));

        // Go through the libraries again to save dependencies.
        await Promise.all(Object.keys(librariesJsonData).map(async (libString) => {
            const libraryData = librariesJsonData[libString];

            if (!libraryData.saveDependencies) {
                return;
            }

            libraryIds.push(libraryData.libraryId);

            // Remove any old dependencies.
            await this.h5pFramework.deleteLibraryDependencies(libraryData.libraryId, siteId);

            // Insert the different new ones.
            const promises = [];

            if (typeof libraryData.preloadedDependencies != 'undefined') {
                promises.push(this.h5pFramework.saveLibraryDependencies(libraryData.libraryId, libraryData.preloadedDependencies,
                        'preloaded'));
            }
            if (typeof libraryData.dynamicDependencies != 'undefined') {
                promises.push(this.h5pFramework.saveLibraryDependencies(libraryData.libraryId, libraryData.dynamicDependencies,
                        'dynamic'));
            }
            if (typeof libraryData.editorDependencies != 'undefined') {
                promises.push(this.h5pFramework.saveLibraryDependencies(libraryData.libraryId, libraryData.editorDependencies,
                        'editor'));
            }

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
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    async savePackage(data: CoreH5PMainJSONFilesData, folderName: string, fileUrl: string, skipContent?: boolean, siteId?: string)
            : Promise<any> {

        if (this.h5pCore.mayUpdateLibraries()) {
            // Save the libraries that were processed.
            await this.saveLibraries(data.librariesJsonData, folderName, siteId);
        }

        const content: any = {};

        if (!skipContent) {
            // Find main library version.
           if (data.mainJsonData.preloadedDependencies) {
               const mainLib = data.mainJsonData.preloadedDependencies.find((dependency) => {
                   return dependency.machineName === data.mainJsonData.mainLibrary;
               });

               if (mainLib) {
                    const id = await this.h5pFramework.getLibraryIdByData(mainLib);

                    mainLib.libraryId = id;
                    content.library = mainLib;
                }
            }

            content.params = JSON.stringify(data.contentJsonData);

            // Save the content data in DB.
            await this.h5pCore.saveContent(content, folderName, fileUrl, siteId);

            // Save the content files in their right place in FS.
            const destFolder = CoreTextUtils.instance.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);
            const contentPath = CoreTextUtils.instance.concatenatePaths(destFolder, 'content');

            try {
                await this.h5pCore.h5pFS.saveContent(contentPath, folderName, siteId);
            } catch (error) {
                // An error occurred, delete the DB data because the content files have been deleted.
                await this.h5pFramework.deleteContentData(content.id, siteId);

                throw error;
            }
        }

        return content;
    }
}
