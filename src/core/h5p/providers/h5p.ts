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
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreH5PUtilsProvider } from './utils';

/**
 * Service to provide H5P functionalities.
 */
@Injectable()
export class CoreH5PProvider {

    protected CONTENT_TABLE = 'h5p_content'; // H5P content.
    protected LIBRARIES_TABLE = 'h5p_libraries'; // Installed libraries.
    protected LIBRARY_DEPENDENCIES_TABLE = 'h5p_library_dependencies'; // Library dependencies.

    protected siteSchema: CoreSiteSchema = {
        name: 'CoreH5PProvider',
        version: 1,
        tables: [
            {
                name: this.CONTENT_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'jsoncontent',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'mainlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'displayoptions',
                        type: 'INTEGER'
                    },
                    {
                        name: 'foldername',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'filtered',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            },
            {
                name: this.LIBRARIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'machinename',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'title',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'majorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'minorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'patchversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'runnable',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'fullscreen',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'embedtypes',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'preloadedjs',
                        type: 'TEXT'
                    },
                    {
                        name: 'preloadedcss',
                        type: 'TEXT'
                    },
                    {
                        name: 'droplibrarycss',
                        type: 'TEXT'
                    },
                    {
                        name: 'semantics',
                        type: 'TEXT'
                    },
                    {
                        name: 'addto',
                        type: 'TEXT'
                    }
                ]
            },
            {
                name: this.LIBRARY_DEPENDENCIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'requiredlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'dependencytype',
                        type: 'TEXT',
                        notNull: true
                    }
                ]
            }
        ]
    };

    protected ROOT_CACHE_KEY = 'mmH5P:';

    protected logger;

    constructor(logger: CoreLoggerProvider,
            eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private fileProvider: CoreFileProvider,
            private mimeUtils: CoreMimetypeUtilsProvider,
            private h5pUtils: CoreH5PUtilsProvider) {

        this.logger = logger.getInstance('CoreH5PProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);

        eventsProvider.on(CoreEventsProvider.SITE_STORAGE_DELETED, (data) => {
            this.deleteAllData(data.siteId).catch((error) => {
                this.logger.error('Error deleting all H5P data from site.', error);
            });
        });
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFile(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canGetTrustedH5PFileInSite(site);
        });
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFileInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_h5p_get_trusted_h5p_file');
    }

    /**
     * Will clear filtered params for all the content that uses the specified libraries.
     * This means that the content dependencies will have to be rebuilt and the parameters re-filtered.
     *
     * @param libraryIds Array of library ids.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected clearFilteredParameters(libraryIds: number[], siteId?: string): Promise<any> {

        if (!libraryIds || !libraryIds.length) {
            return Promise.resolve();
        }

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const whereAndParams = db.getInOrEqual(libraryIds);
            whereAndParams[0] = 'mainlibraryid ' + whereAndParams[0];

            return db.updateRecordsWhere(this.CONTENT_TABLE, { filtered: null }, whereAndParams[0], whereAndParams[1]);
        });
    }

    /**
     * Delete all the H5P data from the DB of a certain site.
     *
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected deleteAllData(siteId: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return Promise.all([
                db.deleteRecords(this.CONTENT_TABLE),
                db.deleteRecords(this.LIBRARIES_TABLE),
                db.deleteRecords(this.LIBRARY_DEPENDENCIES_TABLE)
            ]);
        });
    }

    /**
     * Delete content data from DB.
     *
     * @param id Content ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteContentData(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.CONTENT_TABLE, {id: id});
        });
    }

    /**
     * Delete library data from DB.
     *
     * @param id Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryData(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.LIBRARIES_TABLE, {id: id});
        });
    }

    /**
     * Delete all dependencies belonging to given library.
     *
     * @param libraryId Library ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteLibraryDependencies(libraryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(this.LIBRARY_DEPENDENCIES_TABLE, {libraryid: libraryId});
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
    deleteLibraryFolder(libraryData: any, folderName?: string, siteId?: string): Promise<any> {
        return this.fileProvider.removeDir(this.getLibraryFolderPath(libraryData, siteId, folderName));
    }

    /**
     * Extract an H5P file. Some of this code was copied from the isValidPackage function in Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    extractH5PFile(fileUrl: string, file: FileEntry, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Unzip the file.
        const folderName = this.mimeUtils.removeExtension(file.name),
            destFolder = this.textUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);

        // Make sure the dest dir doesn't exist already.
        return this.fileProvider.removeDir(destFolder).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fileProvider.createDir(destFolder);
        }).then(() => {
            return this.fileProvider.unzipFile(file.toURL(), destFolder);
        }).then(() => {
            // Read the contents of the unzipped dir.
            return this.fileProvider.getDirectoryContents(destFolder);
        }).then((contents) => {
            return this.processH5PFiles(destFolder, contents).then((data) => {
                const content: any = {};

                // Save the libraries that were processed.
                return this.saveLibraries(data.librariesJsonData, siteId).then(() => {
                    // Now treat contents.

                    // Find main library version
                    for (const i in data.mainJsonData.preloadedDependencies) {
                        const dependency = data.mainJsonData.preloadedDependencies[i];

                        if (dependency.machineName === data.mainJsonData.mainLibrary) {
                            return this.getLibraryIdByData(dependency).then((id) => {
                                dependency.libraryId = id;
                                content.library = dependency;
                            });
                        }
                    }
                }).then(() => {
                    // Save the content data in DB.
                    content.params = JSON.stringify(data.contentJsonData);

                    return this.saveContentData(content, folderName, siteId);
                }).then(() => {
                    // Save the content files in their right place.
                    const contentPath = this.textUtils.concatenatePaths(destFolder, 'content');

                    return this.saveContentInFS(contentPath, folderName, siteId).catch((error) => {
                        // An error occurred, delete the DB data because the content data has been deleted.
                        return this.deleteContentData(content.id, siteId).catch(() => {
                            // Ignore errors.
                        }).then(() => {
                            return Promise.reject(error);
                        });
                    });
                }).then(() => {
                    // Remove tmp folder.
                    return this.fileProvider.removeDir(destFolder).catch(() => {
                        // Ignore errors, it will be deleted eventually.
                    });
                });

                // @todo: Load content? It's done in the player construct.
            });
        });
    }

    /**
     * Get a package content path.
     *
     * @param folderName Name of the folder of the H5P package.
     * @param siteId The site ID.
     * @return Folder path.
     */
    getContentFolderPath(folderName: string, siteId: string): string {
        return this.textUtils.concatenatePaths(this.fileProvider.getSiteFolder(siteId), 'h5p/packages/' + folderName + '/content');
    }

    /**
     * Get library data. This code is based on the getLibraryData from Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param libDir Directory where the library files are.
     * @param libPath Path to the directory where the library files are.
     * @param h5pDir Path to the directory where this h5p files are.
     * @return Library data.
     */
    protected getLibraryData(libDir: DirectoryEntry, libPath: string, h5pDir: string): any {
        const libraryJsonPath = this.textUtils.concatenatePaths(libPath, 'library.json'),
            semanticsPath = this.textUtils.concatenatePaths(libPath, 'semantics.json'),
            langPath = this.textUtils.concatenatePaths(libPath, 'language'),
            iconPath = this.textUtils.concatenatePaths(libPath, 'icon.svg'),
            promises = [];
        let h5pData,
            semanticsData,
            langData,
            hasIcon;

        // Read the library json file.
        promises.push(this.fileProvider.readFile(libraryJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            h5pData = data;
        }));

        // Get library semantics if it exists.
        promises.push(this.fileProvider.readFile(semanticsPath, CoreFileProvider.FORMATJSON).then((data) => {
            semanticsData = data;
        }).catch(() => {
            // Probably doesn't exist, ignore.
        }));

        // Get language data if it exists.
        promises.push(this.fileProvider.getDirectoryContents(langPath).then((entries) => {
            const subPromises = [];
            langData = {};

            entries.forEach((entry) => {
                const langFilePath = this.textUtils.concatenatePaths(langPath, entry.name);

                subPromises.push(this.fileProvider.readFile(langFilePath, CoreFileProvider.FORMATJSON).then((data) => {
                    const parts = entry.name.split('.'); // The language code is in parts[0].
                    langData[parts[0]] = data;
                }));
            });
        }).catch(() => {
            // Probably doesn't exist, ignore.
        }));

        // Check if it has icon.
        promises.push(this.fileProvider.getFile(iconPath).then(() => {
            hasIcon = true;
        }).catch(() => {
            hasIcon = false;
        }));

        return Promise.all(promises).then(() => {
            h5pData.semantics = semanticsData;
            h5pData.language = langData;
            h5pData.hasIcon = hasIcon;

            return h5pData;
        });
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
    protected getLibrary(machineName: string, majorVersion?: string | number, minorVersion?: string | number, siteId?: string)
            : Promise<CoreH5PLibraryDBData> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            const conditions: any = {
                machinename: machineName
            };

            if (typeof majorVersion != 'undefined') {
                conditions.majorversion = majorVersion;
            }
            if (typeof minorVersion != 'undefined') {
                conditions.minorversion = minorVersion;
            }

            return db.getRecords(this.LIBRARIES_TABLE, conditions);
        }).then((libraries) => {
            if (!libraries.length) {
                return Promise.reject(null);
            }

            return libraries[0];
        });
    }

    /**
     * Get a library data stored in DB.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data, rejected if not found.
     */
    protected getLibraryByData(libraryData: any, siteId?: string): Promise<CoreH5PLibraryDBData> {
        return this.getLibrary(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
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
    protected getLibraryId(machineName: string, majorVersion?: string | number, minorVersion?: string | number, siteId?: string)
            : Promise<number> {

        return this.getLibrary(machineName, majorVersion, minorVersion, siteId).then((library) => {
            return (library && library.id) || null;
        }).catch(() => {
            return null;
        });
    }

    /**
     * Get a library ID. If not found, return null.
     *
     * @param libraryData Library data.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library ID, null if not found.
     */
    protected getLibraryIdByData(libraryData: any, siteId?: string): Promise<number> {
        return this.getLibraryId(libraryData.machineName, libraryData.majorVersion, libraryData.minorVersion, siteId);
    }

    /**
     * Get libraries folder path.
     *
     * @param siteId The site ID.
     * @return Folder path.
     */
    getLibrariesFolderPath(siteId: string): string {
        return this.textUtils.concatenatePaths(this.fileProvider.getSiteFolder(siteId), 'h5p/lib');
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
            folderName = this.libraryToString(libraryData, true);
        }

        return this.textUtils.concatenatePaths(this.getLibrariesFolderPath(siteId), folderName);
    }

    /**
     * Get a trusted H5P file.
     *
     * @param url The file URL.
     * @param options Options.
     * @param ignoreCache Whether to ignore cache..
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file data.
     */
    getTrustedH5PFile(url: string, options?: CoreH5PGetTrustedFileOptions, ignoreCache?: boolean, siteId?: string)
            : Promise<CoreWSExternalFile> {

        options = options || {};

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data = {
                    url: this.treatH5PUrl(url, site.getURL()),
                    frame: options.frame ? 1 : 0,
                    export: options.export ? 1 : 0,
                    embed: options.embed ? 1 : 0,
                    copyright: options.copyright ? 1 : 0,
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getTrustedH5PFileCacheKey(url),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_h5p_get_trusted_h5p_file', data, preSets).then((result: CoreH5PGetTrustedH5PFileResult): any => {
                if (result.warnings && result.warnings.length) {
                    return Promise.reject(result.warnings[0]);
                }

                if (result.files && result.files.length) {
                    return result.files[0];
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for trusted H5P file WS calls.
     *
     * @param url The file URL.
     * @return Cache key.
     */
    protected getTrustedH5PFileCacheKey(url: string): string {
        return this.getTrustedH5PFilePrefixCacheKey() + url;
    }

    /**
     * Get prefixed cache key for trusted H5P file WS calls.
     *
     * @return Cache key.
     */
    protected getTrustedH5PFilePrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'trustedH5PFile:';
    }

    /**
     * Invalidates all trusted H5P file WS calls.
     *
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllGetTrustedH5PFile(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getTrustedH5PFilePrefixCacheKey());
        });
    }

    /**
     * Invalidates get trusted H5P file WS call.
     *
     * @param url The URL of the file.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContexts(url: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getTrustedH5PFileCacheKey(url));
        });
    }

    /**
     * Writes library data as string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryData Library data.
     * @param folderName Use hyphen instead of space in returned string.
     * @return String on the form {machineName} {majorVersion}.{minorVersion}.
     */
    protected libraryToString(libraryData: any, folderName?: boolean): string {
        return (libraryData.machineName ? libraryData.machineName : libraryData.name) + (folderName ? '-' : ' ') +
                libraryData.majorVersion + '.' + libraryData.minorVersion;
    }

    /**
     * Process libraries from an H5P library, getting the required data to save them.
     * This code was copied from the isValidPackage function in Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected processH5PFiles(destFolder: string, entries: (DirectoryEntry | FileEntry)[])
            : Promise<{librariesJsonData: any, mainJsonData: any, contentJsonData: any}> {

        const promises = [],
            libraries: any = {};
        let contentJsonData,
            mainH5PData;

        // Read the h5p.json file.
        const h5pJsonPath = this.textUtils.concatenatePaths(destFolder, 'h5p.json');
        promises.push(this.fileProvider.readFile(h5pJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            mainH5PData = data;
        }));

        // Read the content.json file.
        const contentJsonPath = this.textUtils.concatenatePaths(destFolder, 'content/content.json');
        promises.push(this.fileProvider.readFile(contentJsonPath, CoreFileProvider.FORMATJSON).then((data) => {
            contentJsonData = data;
        }));

        // Treat libraries.
        entries.forEach((entry) => {
            if (entry.name[0] == '.' || entry.name[0] == '_' || entry.name == 'content' || entry.isFile) {
                // Skip files, the content folder and any folder starting with a . or _.
                return;
            }

            const libDirPath = this.textUtils.concatenatePaths(destFolder, entry.name);

            promises.push(this.getLibraryData(<DirectoryEntry> entry, libDirPath, destFolder).then((libraryH5PData) => {
                libraryH5PData.uploadDirectory = libDirPath;
                libraries[this.libraryToString(libraryH5PData)] = libraryH5PData;
            }));
        });

        return Promise.all(promises).then(() => {
            return {
                librariesJsonData: libraries,
                mainJsonData: mainH5PData,
                contentJsonData: contentJsonData
            };
        });
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @return Promise resolved with content ID.
     */
    protected saveContentData(content: any, folderName: string, siteId?: string): Promise<number> {
        // Save in DB.
        return this.sitesProvider.getSiteDb(siteId).then((db) => {

            const data: any = {
                jsoncontent: content.params,
                displayoptions: content.disable,
                mainlibraryid: content.library.libraryId,
                timemodified: Date.now(),
                filtered: null,
                foldername: folderName
            };

            if (typeof content.id != 'undefined') {
                data.id = content.id;
            } else {
                data.timecreated = data.timemodified;
            }

            return db.insertRecord(this.CONTENT_TABLE, data).then(() => {
                if (!data.id) {
                    // New content. Get its ID.
                    return db.getRecord(this.CONTENT_TABLE, data).then((entry) => {
                        content.id = entry.id;
                    });
                }
            });
        }).then(() => {
            // If resetContentUserData is implemented in the future, it should be called in here.
            return content.id;
        });
    }

    /**
     * Save the content in filesystem.
     *
     * @param contentPath Path to the current content folder (tmp).
     * @param folderName Name to put to the content folder.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected saveContentInFS(contentPath: string, folderName: string, siteId: string): Promise<any> {
        const folderPath = this.getContentFolderPath(folderName, siteId);

        // Delete existing content for this package.
        return this.fileProvider.removeDir(folderPath).catch(() => {
            // Ignore errors, maybe it doesn't exist.
        }).then(() => {
            // Copy the new one.
            return this.fileProvider.moveDir(contentPath, folderPath);
        });
    }

    /**
     * Save libraries. This code is based on the saveLibraries function from Moodle's H5PStorage.
     *
     * @param librariesJsonData Data about libraries.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraries(librariesJsonData: any, siteId?: string): Promise<any> {
        const libraryIds = [];

        // First of all, try to create the dir where the libraries are stored. This way we don't have to do it for each lib.
        return this.fileProvider.createDir(this.getLibrariesFolderPath(siteId)).then(() => {
            const promises = [];

            // Go through libraries that came with this package.
            for (const libString in librariesJsonData) {
                const libraryData = librariesJsonData[libString];

                // Find local library identifier
                promises.push(this.getLibraryByData(libraryData).catch(() => {
                    // Not found.
                }).then((dbData) => {
                    if (dbData) {
                        // Library already installed.
                        libraryData.libraryId = dbData.id;

                        if (libraryData.patchVersion <= dbData.patchversion) {
                            // Same or older version, no need to save.
                            libraryData.saveDependencies = false;

                            return;
                        }
                    }

                    libraryData.saveDependencies = true;

                    // Convert metadataSettings values to boolean and json_encode it before saving.
                    libraryData.metadataSettings = libraryData.metadataSettings ?
                            this.h5pUtils.boolifyAndEncodeMetadataSettings(libraryData.metadataSettings) : null;

                    // Save the library data in DB.
                    return this.saveLibraryData(libraryData, siteId).then(() => {
                        // Now save it in FS.
                        return this.saveLibraryInFS(libraryData, siteId).catch((error) => {
                            // An error occurred, delete the DB data because the lib FS data has been deleted.
                            return this.deleteLibraryData(libraryData.libraryId, siteId).catch(() => {
                                // Ignore errors.
                            }).then(() => {
                                return Promise.reject(error);
                            });
                        });
                    }).then(() => {
                        // @todo: Remove cached asses that use this library.
                    });
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            // Go through the libraries again to save dependencies.
            const promises = [];

            for (const libString in librariesJsonData) {
                const libraryData = librariesJsonData[libString];
                if (!libraryData.saveDependencies) {
                    continue;
                }

                libraryIds.push(libraryData.libraryId);

                // Remove any old dependencies.
                promises.push(this.deleteLibraryDependencies(libraryData.libraryId).then(() => {
                    // Insert the different new ones.
                    const subPromises = [];

                    if (typeof libraryData.preloadedDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.preloadedDependencies,
                                'preloaded'));
                    }
                    if (typeof libraryData.dynamicDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.dynamicDependencies,
                                'dynamic'));
                    }
                    if (typeof libraryData.editorDependencies != 'undefined') {
                        subPromises.push(this.saveLibraryDependencies(libraryData.libraryId, libraryData.editorDependencies,
                                'editor'));
                    }

                    return Promise.all(subPromises);
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            // Make sure dependencies, parameter filtering and export files get regenerated for content who uses these libraries.
            if (libraryIds.length) {
                return this.clearFilteredParameters(libraryIds, siteId);
            }
        });
    }

    /**
     * Save a library in filesystem.
     *
     * @param libraryData Library data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraryInFS(libraryData: any, siteId?: string): Promise<any> {
        const folderPath = this.getLibraryFolderPath(libraryData, siteId);

        // Delete existing library version.
        return this.fileProvider.removeDir(folderPath).catch(() => {
            // Ignore errors, maybe it doesn't exist.
        }).then(() => {
            // Copy the new one.
            return this.fileProvider.moveDir(libraryData.uploadDirectory, folderPath, true);
        });
    }

    /**
     * Save library data in DB.
     *
     * @param libraryData Library data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected saveLibraryData(libraryData: any, siteId?: string): Promise<any> {
        // Some special properties needs some checking and converting before they can be saved.
        const preloadedJS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'preloadedJs', 'path'),
            preloadedCSS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'preloadedCss', 'path'),
            dropLibraryCSS = this.h5pUtils.libraryParameterValuesToCsv(libraryData, 'dropLibraryCss', 'machineName');

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

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                data: any = {
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
                    semantics: libraryData.semantics,
                    addto: typeof libraryData.addTo != 'undefined' ? JSON.stringify(libraryData.addTo) : null,
                };

            if (libraryData.libraryId) {
                data.id = libraryData.libraryId;
            }

            return db.insertRecord(this.LIBRARIES_TABLE, data).then(() => {
                if (!data.id) {
                    // New library. Get its ID.
                    return db.getRecord(this.LIBRARIES_TABLE, data).then((entry) => {
                        libraryData.libraryId = entry.id;
                    });
                } else {
                    // Updated libary. Remove old dependencies.
                    return this.deleteLibraryDependencies(data.id, site.getId());
                }
            });
        });
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
    protected saveLibraryDependencies(libraryId: number, dependencies: any[], dependencyType: string, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSiteDb(siteId).then((db) => {

            const promises = [];

            dependencies.forEach((dependency) => {
                // Get the ID of the library.
                promises.push(this.getLibraryIdByData(dependency, siteId).then((dependencyId) => {
                    // Create the relation.
                    const entry = {
                        libraryid: libraryId,
                        requiredlibraryid: dependencyId,
                        dependencytype: dependencyType
                    };

                    return db.insertRecord(this.LIBRARY_DEPENDENCIES_TABLE, entry);
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Treat an H5P url before sending it to WS.
     *
     * @param url H5P file URL.
     * @param siteUrl Site URL.
     * @return Treated url.
     */
    protected treatH5PUrl(url: string, siteUrl: string): string {
        if (url.indexOf(this.textUtils.concatenatePaths(siteUrl, '/webservice/pluginfile.php')) === 0) {
            url = url.replace('/webservice/pluginfile', '/pluginfile');
        }

        return url;
    }
}

/**
 * Options for core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedFileOptions = {
    frame?: boolean; // Whether to show the bar options below the content.
    export?: boolean; // Whether to allow to download the package.
    embed?: boolean; // Whether to allow to copy the code to your site.
    copyright?: boolean; // The copyright option.
};

/**
 * Result of core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedH5PFileResult = {
    files: CoreWSExternalFile[]; // Files.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Content data stored in DB.
 */
export type CoreH5PContentDBData = {
    id: number; // The id of the content.
    jsoncontent: string; // The content in json format.
    mainlibraryid: number; // The library we first instantiate for this node.
    displayoptions: number; // H5P Button display options.
    foldername: string; // Name of the folder that contains the contents.
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
    semantics?: string; // The semantics definition in json format.
    addto?: string; // Plugin configuration data.
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
