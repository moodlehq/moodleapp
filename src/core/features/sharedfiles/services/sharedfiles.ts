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
import { FileEntry, DirectoryEntry } from '@awesome-cordova-plugins/file/ngx';
import { Md5 } from 'ts-md5/dist/md5';

import { CoreLogger } from '@singletons/logger';
import { CoreAppDB } from '@services/app-db';
import { CoreFile } from '@services/file';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreSites } from '@services/sites';
import { CoreEvents } from '@singletons/events';
import { makeSingleton } from '@singletons';
import { APP_SCHEMA, CoreSharedFilesDBRecord, SHARED_FILES_TABLE_NAME } from './database/sharedfiles';
import { CorePath } from '@singletons/path';
import { asyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';

/**
 * Service to share files with the app.
 */
@Injectable({ providedIn: 'root' })
export class CoreSharedFilesProvider {

    static readonly SHARED_FILES_FOLDER = 'sharedfiles';

    protected logger: CoreLogger;
    protected sharedFilesTable = asyncInstance<CoreDatabaseTable<CoreSharedFilesDBRecord>>();

    constructor() {
        this.logger = CoreLogger.getInstance('CoreSharedFilesProvider');
    }

    /**
     * Initialize database.
     *
     * @returns Promise resolved when done.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        const database = CoreAppDB.getDB();
        const sharedFilesTable = new CoreDatabaseTableProxy<CoreSharedFilesDBRecord>(
            { cachingStrategy: CoreDatabaseCachingStrategy.None },
            database,
            SHARED_FILES_TABLE_NAME,
        );

        await sharedFilesTable.initialize();

        this.sharedFilesTable.setInstance(sharedFilesTable);
    }

    /**
     * Checks if there is a new file received in iOS. If more than one file is found, treat only the first one.
     * The file returned is marked as "treated" and will be deleted in the next execution.
     *
     * @returns Promise resolved with a new file to be treated. If no new files found, resolved with undefined.
     */
    async checkIOSNewFiles(): Promise<FileEntry | undefined> {
        this.logger.debug('Search for new files on iOS');

        const entries = await CorePromiseUtils.ignoreErrors(CoreFile.getDirectoryContents('Inbox'));

        if (!entries || !entries.length) {
            return;
        }

        let fileToReturn: FileEntry | undefined;

        for (let i = 0; i < entries.length; i++) {
            if (entries[i].isDirectory) {
                continue;
            }

            const fileEntry = <FileEntry> entries[i];
            const fileId = this.getFileId(fileEntry);

            try {
                // Check if file was already treated.
                await this.isFileTreated(fileId);

                // File already treated, delete it. No need to block the execution for this.
                this.deleteInboxFile(fileEntry);
            } catch {
                // File not treated before.
                this.logger.debug(`Found new file ${fileEntry.name} shared with the app.`);
                fileToReturn = fileEntry;
                break;
            }
        }

        if (!fileToReturn) {
            return;
        }

        // Mark it as "treated".
        const fileId = this.getFileId(fileToReturn);

        await this.markAsTreated(fileId);

        this.logger.debug(`File marked as "treated": ${fileToReturn.name}`);

        return fileToReturn;
    }

    /**
     * Deletes a file in the Inbox folder (shared with the app).
     *
     * @param entry FileEntry.
     * @returns Promise resolved when done, rejected otherwise.
     */
    async deleteInboxFile(entry: FileEntry): Promise<void> {
        this.logger.debug(`Delete inbox file: ${entry.name}`);

        await CorePromiseUtils.ignoreErrors(CoreFile.removeFileByFileEntry(entry));

        try {
            await this.unmarkAsTreated(this.getFileId(entry));

            this.logger.debug(`"Treated" mark removed from file: ${entry.name}`);
        } catch (error) {
            this.logger.debug(`Error deleting "treated" mark from file: ${entry.name}`, error);

            throw error;
        }
    }

    /**
     * Get the ID of a file for managing "treated" files.
     *
     * @param entry FileEntry.
     * @returns File ID.
     */
    protected getFileId(entry: FileEntry): string {
        return Md5.hashAsciiStr(entry.name);
    }

    /**
     * Get the shared files stored in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param path Path to search inside the site shared folder.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved with the files.
     */
    async getSiteSharedFiles(siteId?: string, path?: string, mimetypes?: string[]): Promise<(FileEntry | DirectoryEntry)[]> {
        let pathToGet = this.getSiteSharedFilesDirPath(siteId);
        if (path) {
            pathToGet = CorePath.concatenatePaths(pathToGet, path);
        }

        try {
            let entries = await CoreFile.getDirectoryContents(pathToGet);

            if (mimetypes) {
                // Get only files with the right mimetype and the ones we cannot determine the mimetype.
                entries = entries.filter((entry) => {
                    const extension = CoreMimetypeUtils.getFileExtension(entry.name);
                    const mimetype = CoreMimetypeUtils.getMimeType(extension);

                    return !mimetype || mimetypes.indexOf(mimetype) > -1;
                });
            }

            return entries;
        } catch {
            // Directory not found, return empty list.
            return [];
        }
    }

    /**
     * Get the path to a site's shared files folder.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Path.
     */
    getSiteSharedFilesDirPath(siteId?: string): string {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return `${CoreFile.getSiteFolder(siteId)}/${CoreSharedFilesProvider.SHARED_FILES_FOLDER}`;
    }

    /**
     * Check if a file has been treated already.
     *
     * @param fileId File ID.
     * @returns Resolved if treated, rejected otherwise.
     */
    protected async isFileTreated(fileId: string): Promise<CoreSharedFilesDBRecord> {
        const sharedFile = await this.sharedFilesTable.getOneByPrimaryKey({ id: fileId });

        return sharedFile;
    }

    /**
     * Mark a file as treated.
     *
     * @param fileId File ID.
     * @returns Promise resolved when marked.
     */
    protected async markAsTreated(fileId: string): Promise<void> {
        try {
            // Check if it's already marked.
            await this.isFileTreated(fileId);
        } catch (err) {
            // Doesn't exist, insert it.
            await this.sharedFilesTable.insert({ id: fileId });
        }
    }

    /**
     * Store a file in a site's shared folder.
     *
     * @param entry File entry.
     * @param newName Name of the new file. If not defined, use original file's name.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async storeFileInSite(entry: FileEntry, newName?: string, siteId?: string): Promise<FileEntry | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!entry || !siteId) {
            return;
        }

        newName = newName || entry.name;

        const sharedFilesFolder = this.getSiteSharedFilesDirPath(siteId);
        const newPath = CorePath.concatenatePaths(sharedFilesFolder, newName);

        // Create dir if it doesn't exist already.
        await CoreFile.createDir(sharedFilesFolder);

        const newFile = await CoreFile.moveExternalFile(CoreFile.getFileEntryURL(entry), newPath);

        CoreEvents.trigger(CoreEvents.FILE_SHARED, { siteId, name: newName });

        return newFile;
    }

    /**
     * Unmark a file as treated.
     *
     * @param fileId File ID.
     * @returns Resolved when unmarked.
     */
    protected async unmarkAsTreated(fileId: string): Promise<void> {
        await this.sharedFilesTable.deleteByPrimaryKey({ id: fileId });
    }

}

export const CoreSharedFiles = makeSingleton(CoreSharedFilesProvider);
