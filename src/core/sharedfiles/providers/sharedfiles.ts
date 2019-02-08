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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { Md5 } from 'ts-md5/dist/md5';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

/**
 * Service to share files with the app.
 */
@Injectable()
export class CoreSharedFilesProvider {
    static SHARED_FILES_FOLDER = 'sharedfiles';

    // Variables for the database.
    protected SHARED_FILES_TABLE = 'shared_files';
    protected tableSchema: SQLiteDBTableSchema = {
        name: this.SHARED_FILES_TABLE,
        columns: [
            {
                name: 'id',
                type: 'TEXT',
                primaryKey: true
            }
        ]
    };

    protected logger;
    protected appDB: SQLiteDB;

    constructor(logger: CoreLoggerProvider, private fileProvider: CoreFileProvider, appProvider: CoreAppProvider,
        private textUtils: CoreTextUtilsProvider, private mimeUtils: CoreMimetypeUtilsProvider,
        private sitesProvider: CoreSitesProvider, private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreSharedFilesProvider');

        this.appDB = appProvider.getDB();
        this.appDB.createTableFromSchema(this.tableSchema);
    }

    /**
     * Checks if there is a new file received in iOS. If more than one file is found, treat only the first one.
     * The file returned is marked as "treated" and will be deleted in the next execution.
     *
     * @return {Promise<any>} Promise resolved with a new file to be treated. If no new files found, promise is rejected.
     */
    checkIOSNewFiles(): Promise<any> {
        this.logger.debug('Search for new files on iOS');

        return this.fileProvider.getDirectoryContents('Inbox').then((entries) => {
            if (entries.length > 0) {
                const promises = [];
                let fileToReturn;

                entries.forEach((entry) => {
                    const fileId = this.getFileId(entry);

                    // Check if file was already treated.
                    promises.push(this.isFileTreated(fileId).then(() => {
                        // File already treated, delete it. Don't return delete promise, we'll ignore errors.
                        this.deleteInboxFile(entry);
                    }).catch(() => {
                        // File not treated before.
                        this.logger.debug('Found new file ' + entry.name + ' shared with the app.');
                        if (!fileToReturn) {
                            fileToReturn = entry;
                        }
                    }));
                });

                return Promise.all(promises).then(() => {
                    let fileId;

                    if (fileToReturn) {
                        // Mark it as "treated".
                        fileId = this.getFileId(fileToReturn);

                        return this.markAsTreated(fileId).then(() => {
                            this.logger.debug('File marked as "treated": ' + fileToReturn.name);

                            return fileToReturn;
                        });
                    } else {
                        return Promise.reject(null);
                    }
                });
            } else {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Deletes a file in the Inbox folder (shared with the app).
     *
     * @param {any} entry FileEntry.
     * @return {Promise<any>} Promise resolved when done, rejected otherwise.
     */
    deleteInboxFile(entry: any): Promise<any> {
        this.logger.debug('Delete inbox file: ' + entry.name);

        return this.fileProvider.removeFileByFileEntry(entry).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.unmarkAsTreated(this.getFileId(entry)).then(() => {
                this.logger.debug('"Treated" mark removed from file: ' + entry.name);
            }).catch((error) => {
                this.logger.debug('Error deleting "treated" mark from file: ' + entry.name, error);

                return Promise.reject(error);
            });
        });
    }

    /**
     * Get the ID of a file for managing "treated" files.
     *
     * @param {any} entry FileEntry.
     * @return {string} File ID.
     */
    protected getFileId(entry: any): string {
        return <string> Md5.hashAsciiStr(entry.name);
    }

    /**
     * Get the shared files stored in a site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [path] Path to search inside the site shared folder.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<any[]>} Promise resolved with the files.
     */
    getSiteSharedFiles(siteId?: string, path?: string, mimetypes?: string[]): Promise<any[]> {
        let pathToGet = this.getSiteSharedFilesDirPath(siteId);
        if (path) {
            pathToGet = this.textUtils.concatenatePaths(pathToGet, path);
        }

        return this.fileProvider.getDirectoryContents(pathToGet).then((files) => {
            if (mimetypes) {
                // Only show files with the right mimetype and the ones we cannot determine the mimetype.
                files = files.filter((file) => {
                    const extension = this.mimeUtils.getFileExtension(file.name),
                        mimetype = this.mimeUtils.getMimeType(extension);

                    return !mimetype || mimetypes.indexOf(mimetype) > -1;
                });
            }

            return files;
        }).catch(() => {
            // Directory not found, return empty list.
            return [];
        });
    }

    /**
     * Get the path to a site's shared files folder.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {string} Path.
     */
    getSiteSharedFilesDirPath(siteId?: string): string {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.fileProvider.getSiteFolder(siteId) + '/' + CoreSharedFilesProvider.SHARED_FILES_FOLDER;
    }

    /**
     * Check if a file has been treated already.
     *
     * @param {string} fileId File ID.
     * @return {Promise<any>} Resolved if treated, rejected otherwise.
     */
    protected isFileTreated(fileId: string): Promise<any> {
        return this.appDB.getRecord(this.SHARED_FILES_TABLE, { id: fileId });
    }

    /**
     * Mark a file as treated.
     *
     * @param {string} fileId File ID.
     * @return {Promise<any>} Promise resolved when marked.
     */
    protected markAsTreated(fileId: string): Promise<any> {
        // Check if it's already marked.
        return this.isFileTreated(fileId).catch(() => {
            // Doesn't exist, insert it.
            return this.appDB.insertRecord(this.SHARED_FILES_TABLE, { id: fileId });
        });
    }

    /**
     * Store a file in a site's shared folder.
     *
     * @param {any} entry File entry.
     * @param {string} [newName] Name of the new file. If not defined, use original file's name.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}Promise resolved when done.
     */
    storeFileInSite(entry: any, newName?: string, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!entry || !siteId) {
            return Promise.reject(null);
        }

        newName = newName || entry.name;

        const sharedFilesFolder = this.getSiteSharedFilesDirPath(siteId),
            newPath = this.textUtils.concatenatePaths(sharedFilesFolder, newName);

        // Create dir if it doesn't exist already.
        return this.fileProvider.createDir(sharedFilesFolder).then(() => {
            return this.fileProvider.moveExternalFile(entry.toURL(), newPath).then((newFile) => {
                this.eventsProvider.trigger(CoreEventsProvider.FILE_SHARED, { siteId: siteId, name: newName });

                return newFile;
            });
        });
    }

    /**
     * Unmark a file as treated.
     *
     * @param {string} fileId File ID.
     * @return {Promise<any>} Resolved when unmarked.
     */
    protected unmarkAsTreated(fileId: string): Promise<any> {
        return this.appDB.deleteRecords(this.SHARED_FILES_TABLE, { id: fileId });
    }
}
