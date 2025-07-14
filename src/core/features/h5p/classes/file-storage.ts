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

import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreMimetype } from '@singletons/mimetype';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CorePath } from '@singletons/path';
import {
    CoreH5PCore,
    CoreH5PDependencyAsset,
    CoreH5PContentDependencyData,
    CoreH5PDependenciesFiles,
    CoreH5PLibraryBasicData,
    CoreH5PContentMainLibraryData,
} from './core';
import { CONTENTS_LIBRARIES_TABLE_NAME, CONTENT_TABLE_NAME, CoreH5PLibraryCachedAssetsDBRecord } from '../services/database/h5p';
import { CoreH5PLibraryBeingSaved } from './storage';
import { CoreFileUtils } from '@singletons/file-utils';

/**
 * Equivalent to Moodle's implementation of H5PFileStorage.
 */
export class CoreH5PFileStorage {

    static readonly CACHED_ASSETS_FOLDER_NAME = 'cachedassets';

    /**
     * Will concatenate all JavaScrips and Stylesheets into two files in order to improve page performance.
     *
     * @param files A set of all the assets required for content to display.
     * @param key Hashed key for cached asset.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @returns Promise resolved when done.
     */
    async cacheAssets(files: CoreH5PDependenciesFiles, key: string, folderName: string, siteId: string): Promise<void> {

        const cachedAssetsPath = this.getCachedAssetsFolderPath(folderName, siteId);

        // Treat each type in the assets.
        await Promise.all(Object.keys(files).map(async (type) => {

            const assets: CoreH5PDependencyAsset[] = files[type];

            if (!assets || !assets.length) {
                return;
            }

            // Create new file for cached assets.
            const fileName = `${key}.${type == 'scripts' ? 'js' : 'css'}`;
            const path = CorePath.concatenatePaths(cachedAssetsPath, fileName);

            // Store concatenated content.
            const content = await this.concatenateFiles(assets, type, cachedAssetsPath);

            await CoreFile.writeFile(path, content);

            // Now update the files data.
            files[type] = [
                {
                    path: CorePath.concatenatePaths(CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME, fileName),
                    version: '',
                },
            ];
        }));
    }

    /**
     * Adds all files of a type into one file.
     *
     * @param assets A list of files.
     * @param type The type of files in assets. Either 'scripts' or 'styles'.
     * @param newFolder The new folder where the concatenated content will be stored.
     * @returns Promise resolved with all of the files content in one string.
     */
    protected async concatenateFiles(assets: CoreH5PDependencyAsset[], type: string, newFolder: string): Promise<string> {
        let content = '';

        for (const i in assets) {
            const asset = assets[i];

            let fileContent = await CoreFile.readFile(asset.path);

            if (type == 'scripts') {
                // No need to treat scripts, just append the content.
                content += `${fileContent};\n`;

                continue;
            }

            // Rewrite relative URLs used inside stylesheets.
            const matches = fileContent.match(/url\(['"]?([^"')]+)['"]?\)/ig);
            const assetPath = asset.path.replace(/(^\/|\/$)/g, ''); // Path without start/end slashes.
            const treated: Record<string, string> = {};

            if (matches && matches.length) {
                matches.forEach((match) => {
                    const url = match.replace(/(url\(['"]?|['"]?\)$)/ig, '');

                    if (treated[url] || url.match(/^(data:|([a-z0-9]+:)?\/)/i)) {
                        return; // Not relative or already treated, skip.
                    }

                    treated[url] = url;
                    const assetPathFolder = CoreFileUtils.getFileAndDirectoryFromPath(assetPath).directory;

                    fileContent = fileContent.replace(
                        new RegExp(CoreText.escapeForRegex(match), 'g'),
                        `url("${CorePath.changeRelativePath(assetPathFolder, url, newFolder)}")`,
                    );
                });
            }

            content += `${fileContent}\n`;
        }

        return content;
    }

    /**
     * Delete cached assets from file system.
     *
     * @param removedEntries Assets to remove.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteCachedAssets(removedEntries: CoreH5PLibraryCachedAssetsDBRecord[], siteId?: string): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const promises: Promise<void>[] = [];

        removedEntries.forEach((entry) => {
            const cachedAssetsFolder = this.getCachedAssetsFolderPath(entry.foldername, site.getId());

            ['js', 'css'].forEach((type) => {
                const path = CorePath.concatenatePaths(cachedAssetsFolder, `${entry.hash}.${type}`);

                promises.push(CoreFile.removeFile(path));
            });
        });

        // Ignore errors, maybe there's no cached asset of some type.
        await CorePromiseUtils.allPromisesIgnoringErrors(promises);
    }

    /**
     * Deletes a content folder from the file system.
     *
     * @param folderName Folder name of the content.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteContentFolder(folderName: string, siteId: string): Promise<void> {
        await CoreFile.removeDir(this.getContentFolderPath(folderName, siteId));
    }

    /**
     * Delete content indexes from filesystem.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteContentIndex(folderName: string, siteId: string): Promise<void> {
        await CoreFile.removeFile(this.getContentIndexPath(folderName, siteId));
    }

    /**
     * Delete content indexes from filesystem.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteContentIndexesForLibrary(libraryId: number, siteId?: string): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const db = site.getDb();

        // Get the folder names of all the packages that use this library.
        const query = 'SELECT DISTINCT hc.foldername ' +
                    `FROM ${CONTENTS_LIBRARIES_TABLE_NAME} hcl ` +
                    `JOIN ${CONTENT_TABLE_NAME} hc ON hcl.h5pid = hc.id ` +
                    'WHERE hcl.libraryid = ?';
        const queryArgs = [libraryId];

        const result = await db.execute(query, queryArgs);

        await Promise.all(Array.from(result.rows).map(async (entry: {foldername: string}) => {
            try {
                // Delete the index.html.
                await this.deleteContentIndex(entry.foldername, site.getId());
            } catch {
                // Ignore errors.
            }
        }));
    }

    /**
     * Deletes a library from the file system.
     *
     * @param libraryData The library data.
     * @param siteId Site ID.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @returns Promise resolved when done.
     */
    async deleteLibraryFolder(
        libraryData: CoreH5PLibraryBasicData | CoreH5PContentMainLibraryData,
        siteId: string,
        folderName?: string,
    ): Promise<void> {
        await CoreFile.removeDir(this.getLibraryFolderPath(libraryData, siteId, folderName));
    }

    /**
     * Will check if there are cache assets available for content.
     *
     * @param key Hashed key for cached asset
     * @returns Promise resolved with the files.
     */
    async getCachedAssets(key: string): Promise<{scripts?: CoreH5PDependencyAsset[]; styles?: CoreH5PDependencyAsset[]} | null> {

        // Get JS and CSS cached assets if they exist.
        const results = await Promise.all([
            this.getCachedAsset(key, '.js'),
            this.getCachedAsset(key, '.css'),
        ]);

        const files = {
            scripts: results[0],
            styles: results[1],
        };

        return files.scripts || files.styles ? files : null;
    }

    /**
     * Check if a cached asset file exists and, if so, return its data.
     *
     * @param key Key of the cached asset.
     * @param extension Extension of the file to get.
     * @returns Promise resolved with the list of assets (only one), undefined if not found.
     */
    protected async getCachedAsset(key: string, extension: string): Promise<CoreH5PDependencyAsset[] | undefined> {

        try {
            const path = CorePath.concatenatePaths(CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME, key + extension);

            const size = await CoreFile.getFileSize(path);

            if (size > 0) {
                return [
                    {
                        path: path,
                        version: '',
                    },
                ];
            }
        } catch {
            // Not found, nothing to do.
        }
    }

    /**
     * Get relative path to a content cached assets.
     *
     * @param folderName Name of the folder of the content the assets belong to.
     * @param siteId Site ID.
     * @returns Path.
     */
    getCachedAssetsFolderPath(folderName: string, siteId: string): string {
        return CorePath.concatenatePaths(
            this.getContentFolderPath(folderName, siteId),
            CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME,
        );
    }

    /**
     * Get a content folder name given the package URL.
     *
     * @param fileUrl Package URL.
     * @param siteId Site ID.
     * @returns Promise resolved with the folder name.
     */
    async getContentFolderNameByUrl(fileUrl: string, siteId: string): Promise<string> {
        const path = await CoreFilepool.getFilePathByUrl(siteId, fileUrl);

        const fileAndDir = CoreFileUtils.getFileAndDirectoryFromPath(path);

        return CoreMimetype.removeExtension(fileAndDir.name);
    }

    /**
     * Get a package content path.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @returns Folder path.
     */
    getContentFolderPath(folderName: string, siteId: string): string {
        return CorePath.concatenatePaths(
            this.getExternalH5PFolderPath(siteId),
            `packages/${folderName}/content`,
        );
    }

    /**
     * Get the content index file.
     *
     * @param fileUrl URL of the H5P package.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the file URL if exists, rejected otherwise.
     */
    async getContentIndexFileUrl(fileUrl: string, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const folderName = await this.getContentFolderNameByUrl(fileUrl, siteId);

        const file = await CoreFile.getFile(this.getContentIndexPath(folderName, siteId));

        return CoreFile.getFileEntryURL(file);
    }

    /**
     * Get the path to a content index.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @returns Folder path.
     */
    getContentIndexPath(folderName: string, siteId: string): string {
        return CorePath.concatenatePaths(this.getContentFolderPath(folderName, siteId), 'index.html');
    }

    /**
     * Get the path to the folder that contains the H5P core libraries.
     *
     * @returns Folder path.
     */
    getCoreH5PPath(): string {
        return CorePath.concatenatePaths(CoreFile.getWWWPath(), '/assets/lib/h5p/');
    }

    /**
     * Get the path to the dependency.
     *
     * @param dependency Dependency library.
     * @returns The path to the dependency library
     */
    getDependencyPath(dependency: CoreH5PContentDependencyData): string {
        return `libraries/${CoreH5PCore.libraryToFolderName(dependency)}`;
    }

    /**
     * Get path to the folder containing H5P files extracted from packages.
     *
     * @param siteId The site ID.
     * @returns Folder path.
     */
    getExternalH5PFolderPath(siteId: string): string {
        return CorePath.concatenatePaths(CoreFile.getSiteFolder(siteId), 'h5p');
    }

    /**
     * Get libraries folder path.
     *
     * @param siteId The site ID.
     * @returns Folder path.
     */
    getLibrariesFolderPath(siteId: string): string {
        return CorePath.concatenatePaths(this.getExternalH5PFolderPath(siteId), 'libraries');
    }

    /**
     * Get a library's folder path.
     *
     * @param libraryData The library data.
     * @param siteId The site ID.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @returns Folder path.
     */
    getLibraryFolderPath(
        libraryData: CoreH5PLibraryBasicData | CoreH5PContentMainLibraryData,
        siteId: string,
        folderName?: string,
    ): string {
        if (!folderName) {
            folderName = CoreH5PCore.libraryToFolderName(libraryData);
        }

        return CorePath.concatenatePaths(this.getLibrariesFolderPath(siteId), folderName);
    }

    /**
     * Save the content in filesystem.
     *
     * @param contentPath Path to the current content folder (tmp).
     * @param folderName Name to put to the content folder.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    async saveContent(contentPath: string, folderName: string, siteId: string): Promise<void> {
        const folderPath = this.getContentFolderPath(folderName, siteId);

        // Delete existing content for this package.
        await CorePromiseUtils.ignoreErrors(CoreFile.removeDir(folderPath));

        // Copy the new one.
        await CoreFile.moveDir(contentPath, folderPath);
    }

    /**
     * Save a library in filesystem.
     *
     * @param libraryData Library data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async saveLibrary(libraryData: CoreH5PLibraryBeingSaved, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const folderPath = this.getLibraryFolderPath(libraryData, siteId);

        // Delete existing library version.
        try {
            await CoreFile.removeDir(folderPath);
        } catch {
            // Ignore errors, maybe it doesn't exist.
        }

        if (libraryData.uploadDirectory) {
            // Copy the new one.
            await CoreFile.moveDir(libraryData.uploadDirectory, folderPath, true);
        }
    }

    /**
     * Check that library is fully saved to the file system.
     *
     * @param libraryData Library data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if all library files are present.
     */
    async checkLibrary(libraryData: CoreH5PLibraryBeingSaved, siteId?: string): Promise<boolean> {
        const getFileNames = async (baseDir: string, dirName = ''): Promise<string[]> => {
            const entries = await CoreFile.getDirectoryContents( baseDir + dirName);
            const fileNames: string[] = [];

            for (const entry of entries) {
                const name = `${dirName}/${entry.name}`;
                if (entry.isDirectory) {
                    fileNames.push(...(await getFileNames(baseDir, name)));
                } else  {
                    fileNames.push(name);
                }
            }

            return fileNames;
        };

        if (!libraryData.uploadDirectory) {
            return true;
        }

        siteId = siteId || CoreSites.getCurrentSiteId();
        const folderPath = this.getLibraryFolderPath(libraryData, siteId);

        const [sourceFiles, destFiles] = await Promise.all([
            getFileNames(libraryData.uploadDirectory),
            getFileNames(folderPath).catch(() => ([])).then(files => new Set(files)),
        ]);

        return sourceFiles.every(name => destFiles.has(name));
    }

}
