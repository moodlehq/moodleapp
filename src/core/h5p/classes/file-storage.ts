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

import { CoreFile } from '@providers/file';
import { CoreFilepool } from '@providers/filepool';
import { CoreSites } from '@providers/sites';
import { CoreMimetypeUtils } from '@providers/utils/mimetype';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUtils } from '@providers/utils/utils';
import { CoreH5PProvider } from '../providers/h5p';
import { CoreH5PCore, CoreH5PDependencyAsset, CoreH5PContentDependencyData, CoreH5PDependenciesFiles } from './core';
import { CoreH5PLibrariesCachedAssetsDBData } from './framework';

/**
 * Equivalent to Moodle's implementation of H5PFileStorage.
 */
export class CoreH5PFileStorage {

    static CACHED_ASSETS_FOLDER_NAME = 'cachedassets';

    /**
     * Will concatenate all JavaScrips and Stylesheets into two files in order to improve page performance.
     *
     * @param files A set of all the assets required for content to display.
     * @param key Hashed key for cached asset.
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Promise resolved when done.
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
            const fileName = key + '.' + (type == 'scripts' ? 'js' : 'css');
            const path = CoreTextUtils.instance.concatenatePaths(cachedAssetsPath, fileName);

            // Store concatenated content.
            const content = await this.concatenateFiles(assets, type);

            await CoreFile.instance.writeFile(path, content);

            // Now update the files data.
            files[type] = [
                {
                    path: CoreTextUtils.instance.concatenatePaths(CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME, fileName),
                    version: ''
                }
            ];
        }));
    }

    /**
     * Adds all files of a type into one file.
     *
     * @param assets A list of files.
     * @param type The type of files in assets. Either 'scripts' or 'styles'
     * @return Promise resolved with all of the files content in one string.
     */
    protected async concatenateFiles(assets: CoreH5PDependencyAsset[], type: string): Promise<string> {
        const basePath = CoreFile.instance.convertFileSrc(CoreFile.instance.getBasePathInstant());
        let content = '';

        for (const i in assets) {
            const asset = assets[i];

            let fileContent: string = await CoreFile.instance.readFile(asset.path);

            if (type == 'scripts') {
                // No need to treat scripts, just append the content.
                content += fileContent + ';\n';
            } else {
                // Rewrite relative URLs used inside stylesheets.
                const matches = fileContent.match(/url\([\'"]?([^"\')]+)[\'"]?\)/ig);
                const assetPath = asset.path.replace(/(^\/|\/$)/g, ''); // Path without start/end slashes.
                const treated = {};

                if (matches && matches.length) {
                    matches.forEach((match) => {
                        let url = match.replace(/(url\(['"]?|['"]?\)$)/ig, '');

                        if (treated[url] || url.match(/^(data:|([a-z0-9]+:)?\/)/i)) {
                            return; // Not relative or already treated, skip.
                        }

                        const pathSplit = assetPath.split('/');
                        treated[url] = url;

                        /* Find "../" in the URL. If it exists, we have to remove "../" and switch the last folder in the
                           filepath for the first folder in the url. */
                        if (url.match(/^\.\.\//)) {
                            const urlSplit = url.split('/').filter((i) => {
                                return i; // Remove empty values.
                            });

                            // Remove the file name from the asset path.
                            pathSplit.pop();

                            // Remove the first element from the file URL: ../ .
                            urlSplit.shift();

                            // Put the url's first folder into the asset path.
                            pathSplit[pathSplit.length - 1] = urlSplit[0];
                            urlSplit.shift();

                            // Create the new URL and replace it in the file contents.
                            url = pathSplit.join('/') + '/' + urlSplit.join('/');

                        } else {
                            pathSplit[pathSplit.length - 1] = url; // Put the whole path to the end of the asset path.
                            url = pathSplit.join('/');
                        }

                        fileContent = fileContent.replace(new RegExp(CoreTextUtils.instance.escapeForRegex(match), 'g'),
                                    'url("' + CoreTextUtils.instance.concatenatePaths(basePath, url) + '")');
                    });
                }

                content += fileContent + '\n';
            }
        }

        return content;
    }

    /**
     * Delete cached assets from file system.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteCachedAssets(removedEntries: CoreH5PLibrariesCachedAssetsDBData[], siteId?: string): Promise<void> {

        const site = await CoreSites.instance.getSite(siteId);
        const promises = [];

        removedEntries.forEach((entry) => {

            const cachedAssetsFolder = this.getCachedAssetsFolderPath(entry.foldername, site.getId());

            ['js', 'css'].forEach((type) => {
                const path = CoreTextUtils.instance.concatenatePaths(cachedAssetsFolder, entry.hash + '.' + type);

                promises.push(CoreFile.instance.removeFile(path));
            });
        });

        try {
            await CoreUtils.instance.allPromises(promises);
        } catch (error) {
            // Ignore errors, maybe there's no cached asset of some type.
        }
    }

    /**
     * Deletes a content folder from the file system.
     *
     * @param folderName Folder name of the content.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteContentFolder(folderName: string, siteId?: string): Promise<void> {
        await CoreFile.instance.removeDir(this.getContentFolderPath(folderName, siteId));
    }

    /**
     * Delete content indexes from filesystem.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteContentIndex(folderName: string, siteId?: string): Promise<void> {
        await CoreFile.instance.removeFile(this.getContentIndexPath(folderName, siteId));
    }

    /**
     * Delete content indexes from filesystem.
     *
     * @param libraryId Library identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteContentIndexesForLibrary(libraryId: number, siteId?: string): Promise<void> {

        const site = await CoreSites.instance.getSite(siteId);

        const db = site.getDb();

        // Get the folder names of all the packages that use this library.
        const query = 'SELECT DISTINCT hc.foldername ' +
                    'FROM ' + CoreH5PProvider.CONTENTS_LIBRARIES_TABLE + ' hcl ' +
                    'JOIN ' + CoreH5PProvider.CONTENT_TABLE + ' hc ON hcl.h5pid = hc.id ' +
                    'WHERE hcl.libraryid = ?';
        const queryArgs = [];

        queryArgs.push(libraryId);

        const result = await db.execute(query, queryArgs);

        await Array.from(result.rows).map(async (entry: {foldername: string}) => {
            try {
                // Delete the index.html.
                await this.deleteContentIndex(entry.foldername, site.getId());
            } catch (error) {
                // Ignore errors.
            }
        });
    }

    /**
     * Deletes a library from the file system.
     *
     * @param libraryData The library data.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteLibraryFolder(libraryData: any, folderName?: string, siteId?: string): Promise<void> {
        await CoreFile.instance.removeDir(this.getLibraryFolderPath(libraryData, siteId, folderName));
    }

    /**
     * Will check if there are cache assets available for content.
     *
     * @param key Hashed key for cached asset
     * @return Promise resolved with the files.
     */
    async getCachedAssets(key: string): Promise<{scripts?: CoreH5PDependencyAsset[], styles?: CoreH5PDependencyAsset[]}> {

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
     * @return Promise resolved with the list of assets (only one), undefined if not found.
     */
    protected async getCachedAsset(key: string, extension: string): Promise<CoreH5PDependencyAsset[]> {

        try {
            const path = CoreTextUtils.instance.concatenatePaths(CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME, key + extension);

            const size = await CoreFile.instance.getFileSize(path);

            if (size > 0) {
                return [
                    {
                        path: path,
                        version: '',
                    },
                ];
            }
        } catch (error) {
            // Not found, nothing to do.
        }
    }

    /**
     * Get relative path to a content cached assets.
     *
     * @param folderName Name of the folder of the content the assets belong to.
     * @param siteId Site ID.
     * @return Path.
     */
    getCachedAssetsFolderPath(folderName: string, siteId: string): string {
        return CoreTextUtils.instance.concatenatePaths(
                this.getContentFolderPath(folderName, siteId), CoreH5PFileStorage.CACHED_ASSETS_FOLDER_NAME);
    }

    /**
     * Get a content folder name given the package URL.
     *
     * @param fileUrl Package URL.
     * @param siteId Site ID.
     * @return Promise resolved with the folder name.
     */
    async getContentFolderNameByUrl(fileUrl: string, siteId: string): Promise<string> {
        const path = await CoreFilepool.instance.getFilePathByUrl(siteId, fileUrl);

        const fileAndDir = CoreFile.instance.getFileAndDirectoryFromPath(path);

        return CoreMimetypeUtils.instance.removeExtension(fileAndDir.name);
    }

    /**
     * Get a package content path.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Folder path.
     */
    getContentFolderPath(folderName: string, siteId: string): string {
        return CoreTextUtils.instance.concatenatePaths(
                this.getExternalH5PFolderPath(siteId), 'packages/' + folderName + '/content');
    }

    /**
     * Get the content index file.
     *
     * @param fileUrl URL of the H5P package.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the file URL if exists, rejected otherwise.
     */
    async getContentIndexFileUrl(fileUrl: string, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const folderName = await this.getContentFolderNameByUrl(fileUrl, siteId);

        const file = await CoreFile.instance.getFile(this.getContentIndexPath(folderName, siteId));

        return file.toURL();
    }

    /**
     * Get the path to a content index.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Folder path.
     */
    getContentIndexPath(folderName: string, siteId: string): string {
        return CoreTextUtils.instance.concatenatePaths(this.getContentFolderPath(folderName, siteId), 'index.html');
    }

    /**
     * Get the path to the folder that contains the H5P core libraries.
     *
     * @return Folder path.
     */
    getCoreH5PPath(): string {
        return CoreTextUtils.instance.concatenatePaths(CoreFile.instance.getWWWPath(), '/h5p/');
    }

    /**
     * Get the path to the dependency.
     *
     * @param dependency Dependency library.
     * @return The path to the dependency library
     */
    getDependencyPath(dependency: CoreH5PContentDependencyData): string {
        return 'libraries/' + dependency.machineName + '-' + dependency.majorVersion + '.' + dependency.minorVersion;
    }

    /**
     * Get path to the folder containing H5P files extracted from packages.
     *
     * @param siteId The site ID.
     * @return Folder path.
     */
    getExternalH5PFolderPath(siteId: string): string {
        return CoreTextUtils.instance.concatenatePaths(CoreFile.instance.getSiteFolder(siteId), 'h5p');
    }

    /**
     * Get libraries folder path.
     *
     * @param siteId The site ID.
     * @return Folder path.
     */
    getLibrariesFolderPath(siteId: string): string {
        return CoreTextUtils.instance.concatenatePaths(this.getExternalH5PFolderPath(siteId), 'libraries');
    }

    /**
     * Get a library's folder path.
     *
     * @param libraryData The library data.
     * @param siteId The site ID.
     * @param folderName Folder name. If not provided, it will be calculated.
     * @return Folder path.
     */
    getLibraryFolderPath(libraryData: any, siteId: string, folderName?: string): string {
        if (!folderName) {
            folderName = CoreH5PCore.libraryToString(libraryData, true);
        }

        return CoreTextUtils.instance.concatenatePaths(this.getLibrariesFolderPath(siteId), folderName);
    }

    /**
     * Save the content in filesystem.
     *
     * @param contentPath Path to the current content folder (tmp).
     * @param folderName Name to put to the content folder.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    async saveContent(contentPath: string, folderName: string, siteId: string): Promise<void> {
        const folderPath = this.getContentFolderPath(folderName, siteId);

        // Delete existing content for this package.
        try {
            await CoreFile.instance.removeDir(folderPath);
        } catch (error) {
            // Ignore errors, maybe it doesn't exist.
        }

        // Copy the new one.
        await CoreFile.instance.moveDir(contentPath, folderPath);
    }

    /**
     * Save a library in filesystem.
     *
     * @param libraryData Library data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async saveLibrary(libraryData: any, siteId?: string): Promise<void> {
        const folderPath = this.getLibraryFolderPath(libraryData, siteId);

        // Delete existing library version.
        try {
            await CoreFile.instance.removeDir(folderPath);
        } catch (error) {
            // Ignore errors, maybe it doesn't exist.
        }

        // Copy the new one.
        await CoreFile.instance.moveDir(libraryData.uploadDirectory, folderPath, true);
    }
}
