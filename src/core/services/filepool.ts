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
import { Md5 } from 'ts-md5/dist/md5';

import { CoreApp } from '@services/app';
import { CoreEventPackageStatusChanged, CoreEvents } from '@singletons/events';
import { CoreFile } from '@services/file';
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreWS, CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils, CoreUtilsOpenFileOptions, PromiseDefer } from '@services/utils/utils';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreError } from '@classes/errors/error';
import { CoreConstants } from '@/core/constants';
import { ApplicationInit, makeSingleton, Network, NgZone, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import {
    APP_SCHEMA,
    FILES_TABLE_NAME,
    QUEUE_TABLE_NAME,
    PACKAGES_TABLE_NAME,
    LINKS_TABLE_NAME,
    CoreFilepoolFileEntry,
    CoreFilepoolComponentLink,
    CoreFilepoolFileOptions,
    CoreFilepoolLinksRecord,
    CoreFilepoolPackageEntry,
    CoreFilepoolQueueEntry,
    CoreFilepoolQueueDBEntry,
} from '@services/database/filepool';
import { CoreFileHelper } from './file-helper';

/*
 * Factory for handling downloading files and retrieve downloaded files.
 *
 * @description
 * This factory is responsible for handling downloading files.
 *
 * The two main goals of this is to keep the content available offline, and improve the user experience by caching
 * the content locally.
 */
@Injectable({ providedIn: 'root' })
export class CoreFilepoolProvider {

    // Constants.
    protected static readonly QUEUE_PROCESS_INTERVAL = 0;
    protected static readonly FOLDER = 'filepool';
    protected static readonly WIFI_DOWNLOAD_THRESHOLD = 20971520; // 20MB.
    protected static readonly DOWNLOAD_THRESHOLD = 2097152; // 2MB.
    protected static readonly QUEUE_RUNNING = 'CoreFilepool:QUEUE_RUNNING';
    protected static readonly QUEUE_PAUSED = 'CoreFilepool:QUEUE_PAUSED';
    protected static readonly ERR_QUEUE_IS_EMPTY = 'CoreFilepoolError:ERR_QUEUE_IS_EMPTY';
    protected static readonly ERR_FS_OR_NETWORK_UNAVAILABLE = 'CoreFilepoolError:ERR_FS_OR_NETWORK_UNAVAILABLE';
    protected static readonly ERR_QUEUE_ON_PAUSE = 'CoreFilepoolError:ERR_QUEUE_ON_PAUSE';

    protected static readonly FILE_UPDATE_UNKNOWN_WHERE_CLAUSE =
        'isexternalfile = 1 OR ((revision IS NULL OR revision = 0) AND (timemodified IS NULL OR timemodified = 0))';

    protected logger: CoreLogger;
    protected queueState = CoreFilepoolProvider.QUEUE_PAUSED;
    protected urlAttributes: RegExp[] = [
        new RegExp('(\\?|&)token=([A-Za-z0-9]*)'),
        new RegExp('(\\?|&)forcedownload=[0-1]'),
        new RegExp('(\\?|&)preview=[A-Za-z0-9]+'),
        new RegExp('(\\?|&)offline=[0-1]', 'g'),
    ];

    // To handle file downloads using the queue.
    protected queueDeferreds: { [s: string]: { [s: string]: CoreFilepoolPromiseDefer } } = {};
    protected sizeCache: {[fileUrl: string]: number} = {}; // A "cache" to store file sizes.
    // Variables to prevent downloading packages/files twice at the same time.
    protected packagesPromises: { [s: string]: { [s: string]: Promise<void> } } = {};
    protected filePromises: { [s: string]: { [s: string]: Promise<string> } } = {};

    // Variables for DB.
    protected appDB: Promise<SQLiteDB>;
    protected resolveAppDB!: (appDB: SQLiteDB) => void;

    constructor() {
        this.appDB = new Promise(resolve => this.resolveAppDB = resolve);
        this.logger = CoreLogger.getInstance('CoreFilepoolProvider');

        this.init();
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        this.resolveAppDB(CoreApp.getDB());
    }

    /**
     * Init some properties.
     */
    protected async init(): Promise<void> {
        // Waiting for the app to be ready to start processing the queue.
        await ApplicationInit.donePromise;

        this.checkQueueProcessing();

        // Start queue when device goes online.
        Network.onConnect().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.checkQueueProcessing();
            });
        });
    }

    /**
     * Link a file with a component.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved on success.
     */
    protected async addFileLink(siteId: string, fileId: string, component: string, componentId?: string | number): Promise<void> {
        if (!component) {
            throw new CoreError('Cannot add link because component is invalid.');
        }

        componentId = this.fixComponentId(componentId);

        const db = await CoreSites.getSiteDb(siteId);
        const newEntry: CoreFilepoolLinksRecord = {
            fileId,
            component,
            componentId: componentId || '',
        };

        await db.insertRecord(LINKS_TABLE_NAME, newEntry);
    }

    /**
     * Link a file with a component by URL.
     *
     * @param siteId The site ID.
     * @param fileUrl The file Url.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved on success.
     * @description
     * Use this method to create a link between a URL and a component. You usually do not need to call this manually since
     * downloading a file automatically does this. Note that this method does not check if the file exists in the pool.
     */
    async addFileLinkByUrl(siteId: string, fileUrl: string, component: string, componentId?: string | number): Promise<void> {
        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        await this.addFileLink(siteId, fileId, component, componentId);
    }

    /**
     * Link a file with several components.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links Array of objects containing the component and optionally componentId.
     * @return Promise resolved on success.
     */
    protected async addFileLinks(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): Promise<void> {
        const promises = links.map((link) => this.addFileLink(siteId, fileId, link.component, link.componentId));

        await Promise.all(promises);
    }

    /**
     * Add files to queue using a URL.
     *
     * @param siteId The site ID.
     * @param files Array of files to add.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component (optional).
     * @return Resolved on success.
     */
    addFilesToQueue(siteId: string, files: CoreWSFile[], component?: string, componentId?: string | number): Promise<void> {
        return this.downloadOrPrefetchFiles(siteId, files, true, false, component, componentId);
    }

    /**
     * Add a file to the pool.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param data Additional information to store about the file (timemodified, url, ...). See FILES_TABLE schema.
     * @return Promise resolved on success.
     */
    protected async addFileToPool(siteId: string, fileId: string, data: Omit<CoreFilepoolFileEntry, 'fileId'>): Promise<void> {
        const record = {
            fileId,
            ...data,
        };

        const db = await CoreSites.getSiteDb(siteId);

        await db.insertRecord(FILES_TABLE_NAME, record);
    }

    /**
     * Adds a hash to a filename if needed.
     *
     * @param url The URL of the file, already treated (decoded, without revision, etc.).
     * @param filename The filename.
     * @return The filename with the hash.
     */
    protected addHashToFilename(url: string, filename: string): string {
        // Check if the file already has a hash. If a file is downloaded and re-uploaded with the app it will have a hash already.
        const matches = filename.match(/_[a-f0-9]{32}/g);

        if (matches && matches.length) {
            // There is at least 1 match. Get the last one.
            const hash = matches[matches.length - 1];
            const treatedUrl = url.replace(hash, ''); // Remove the hash from the URL.

            // Check that the hash is valid.
            if ('_' + Md5.hashAsciiStr('url:' + treatedUrl) == hash) {
                // The data found is a hash of the URL, don't need to add it again.
                return filename;
            }
        }

        return filename + '_' + Md5.hashAsciiStr('url:' + url);
    }

    /**
     * Add a file to the queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param url The absolute URL to the file.
     * @param priority The priority this file should get in the queue (range 0-999).
     * @param revision The revision of the file.
     * @param timemodified The time this file was modified. Can be used to check file state.
     * @param filePath Filepath to download the file to. If not defined, download to the filepool folder.
     * @param onProgress Function to call on progress.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param link The link to add for the file.
     * @return Promise resolved when the file is downloaded.
     */
    protected async addToQueue(
        siteId: string,
        fileId: string,
        url: string,
        priority: number,
        revision: number,
        timemodified: number,
        filePath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
        options: CoreFilepoolFileOptions = {},
        link?: CoreFilepoolComponentLink,
    ): Promise<void> {
        this.logger.debug(`Adding ${fileId} to the queue`);

        const db = await this.appDB;

        await db.insertRecord(QUEUE_TABLE_NAME, {
            siteId,
            fileId,
            url,
            priority,
            revision,
            timemodified,
            path: filePath,
            isexternalfile: options.isexternalfile ? 1 : 0,
            repositorytype: options.repositorytype,
            links: JSON.stringify(link ? [link] : []),
            added: Date.now(),
        });

        // Check if the queue is running.
        this.checkQueueProcessing();
        this.notifyFileDownloading(siteId, fileId, link ? [link] : []);

        return this.getQueuePromise(siteId, fileId, true, onProgress);
    }

    /**
     * Add an entry to queue using a URL.
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component (optional).
     * @param timemodified The time this file was modified. Can be used to check file state.
     * @param filePath Filepath to download the file to. If not defined, download to the filepool folder.
     * @param onProgress Function to call on progress.
     * @param priority The priority this file should get in the queue (range 0-999).
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @param alreadyFixed Whether the URL has already been fixed.
     * @return Resolved on success.
     */
    async addToQueueByUrl(
        siteId: string,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified: number = 0,
        filePath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
        priority: number = 0,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
        alreadyFixed?: boolean,
    ): Promise<void> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const site = await CoreSites.getSite(siteId);
        if (!site.canDownloadFiles()) {
            throw new CoreError('Site doesn\'t allow downloading files.');
        }

        if (!alreadyFixed) {
            // Fix the URL and use the fixed data.
            const file = await this.fixPluginfileURL(siteId, fileUrl);

            fileUrl = CoreFileHelper.getFileUrl(file);
            timemodified = file.timemodified || timemodified;
        }

        revision = revision || this.getRevisionFromUrl(fileUrl);
        const fileId = this.getFileIdByUrl(fileUrl);

        const primaryKey = { siteId, fileId };

        // Set up the component.
        const link = this.createComponentLink(component, componentId);

        // Retrieve the queue deferred now if it exists.
        // This is to prevent errors if file is removed from queue while we're checking if the file is in queue.
        const queueDeferred = this.getQueueDeferred(siteId, fileId, false, onProgress);
        let entry: CoreFilepoolQueueEntry;

        try {
            entry = await this.hasFileInQueue(siteId, fileId);
        } catch (error) {
            // Unsure why we could not get the record, let's add to the queue anyway.
            return this.addToQueue(siteId, fileId, fileUrl, priority, revision, timemodified, filePath, onProgress, options, link);
        }

        const newData: Partial<CoreFilepoolQueueDBEntry> = {};
        let foundLink = false;

        // We already have the file in queue, we update the priority and links.
        if (!entry.priority || entry.priority < priority) {
            newData.priority = priority;
        }
        if (revision && entry.revision !== revision) {
            newData.revision = revision;
        }
        if (timemodified && entry.timemodified !== timemodified) {
            newData.timemodified = timemodified;
        }
        if (filePath && entry.path !== filePath) {
            newData.path = filePath;
        }
        if (entry.isexternalfile !== options.isexternalfile && (entry.isexternalfile || options.isexternalfile)) {
            newData.isexternalfile = options.isexternalfile;
        }
        if (entry.repositorytype !== options.repositorytype && (entry.repositorytype || options.repositorytype)) {
            newData.repositorytype = options.repositorytype;
        }

        if (link) {
            // We need to add the new link if it does not exist yet.
            if (entry.linksUnserialized && entry.linksUnserialized.length) {
                foundLink = entry.linksUnserialized.some((fileLink) =>
                    fileLink.component == link.component && fileLink.componentId == link.componentId);
            }

            if (!foundLink) {
                const links = entry.linksUnserialized || [];
                links.push(link);
                newData.links = JSON.stringify(links);
            }
        }

        if (Object.keys(newData).length) {
            // Update only when required.
            this.logger.debug(`Updating file ${fileId} which is already in queue`);

            const db = await this.appDB;

            return db.updateRecords(QUEUE_TABLE_NAME, newData, primaryKey).then(() =>
                this.getQueuePromise(siteId, fileId, true, onProgress));
        }

        this.logger.debug(`File ${fileId} already in queue and does not require update`);
        if (queueDeferred) {
            // If we were able to retrieve the queue deferred before, we use that one.
            return queueDeferred.promise;
        } else {
            // Create a new deferred and return its promise.
            return this.getQueuePromise(siteId, fileId, true, onProgress);
        }
    }

    /**
     * Adds a file to the queue if the size is allowed to be downloaded.
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file, already fixed.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param checkSize True if we shouldn't download files if their size is big, false otherwise.
     * @param downloadUnknown True to download file in WiFi if their size is unknown, false otherwise.
     *                        Ignored if checkSize=false.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Promise resolved when the file is downloaded.
     */
    protected async addToQueueIfNeeded(
        siteId: string,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified: number = 0,
        checkSize: boolean = true,
        downloadUnknown?: boolean,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
    ): Promise<void> {
        if (!checkSize) {
            // No need to check size, just add it to the queue.
            await this.addToQueueByUrl(
                siteId,
                fileUrl,
                component,
                componentId,
                timemodified,
                undefined,
                undefined,
                0,
                options,
                revision,
                true,
            );
        }

        let size: number;

        if (typeof this.sizeCache[fileUrl] != 'undefined') {
            size = this.sizeCache[fileUrl];
        } else {
            if (!CoreApp.isOnline()) {
                // Cannot check size in offline, stop.
                throw new CoreError(Translate.instant('core.cannotconnect'));
            }

            size = await CoreWS.getRemoteFileSize(fileUrl);
        }

        // Calculate the size of the file.
        const isWifi = CoreApp.isWifi();
        const sizeUnknown = size <= 0;

        if (!sizeUnknown) {
            // Store the size in the cache.
            this.sizeCache[fileUrl] = size;
        }

        // Check if the file should be downloaded.
        if ((sizeUnknown && downloadUnknown && isWifi) || (!sizeUnknown && this.shouldDownload(size))) {
            await this.addToQueueByUrl(
                siteId,
                fileUrl,
                component,
                componentId,
                timemodified,
                undefined,
                undefined,
                0,
                options,
                revision,
                true,
            );
        }
    }

    /**
     * Check the queue processing.
     *
     * @description
     * In mose cases, this will enable the queue processing if it was paused.
     * Though, this will disable the queue if we are missing network or if the file system
     * is not accessible. Also, this will have no effect if the queue is already running.
     */
    protected checkQueueProcessing(): void {
        if (!CoreFile.isAvailable() || !CoreApp.isOnline()) {
            this.queueState = CoreFilepoolProvider.QUEUE_PAUSED;

            return;
        } else if (this.queueState === CoreFilepoolProvider.QUEUE_RUNNING) {
            return;
        }

        this.queueState = CoreFilepoolProvider.QUEUE_RUNNING;
        this.processQueue();
    }

    /**
     * Clear all packages status in a site.
     *
     * @param siteId Site ID.
     * @return Promise resolved when all status are cleared.
     */
    async clearAllPackagesStatus(siteId: string): Promise<void> {
        this.logger.debug('Clear all packages status for site ' + siteId);

        const site = await CoreSites.getSite(siteId);
        // Get all the packages to be able to "notify" the change in the status.
        const entries: CoreFilepoolPackageEntry[] = await site.getDb().getAllRecords(PACKAGES_TABLE_NAME);
        // Delete all the entries.
        await site.getDb().deleteRecords(PACKAGES_TABLE_NAME);

        entries.forEach((entry) => {
            // Trigger module status changed, setting it as not downloaded.
            this.triggerPackageStatusChanged(siteId, CoreConstants.NOT_DOWNLOADED, entry.component!, entry.componentId);
        });
    }

    /**
     * Clears the filepool. Use it only when all the files from a site are deleted.
     *
     * @param siteId ID of the site to clear.
     * @return Promise resolved when the filepool is cleared.
     */
    async clearFilepool(siteId: string): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        await Promise.all([
            db.deleteRecords(FILES_TABLE_NAME),
            db.deleteRecords(LINKS_TABLE_NAME),
        ]);
    }

    /**
     * Returns whether a component has files in the pool.
     *
     * @param siteId The site ID.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Resolved means yes, rejected means no.
     */
    async componentHasFiles(siteId: string, component: string, componentId?: string | number): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);
        const conditions = {
            component,
            componentId: this.fixComponentId(componentId),
        };

        const count = await db.countRecords(LINKS_TABLE_NAME, conditions);
        if (count <= 0) {
            throw new CoreError('Component doesn\'t have files');
        }
    }

    /**
     * Prepare a component link.
     *
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Link, null if nothing to link.
     */
    protected createComponentLink(component?: string, componentId?: string | number): CoreFilepoolComponentLink | undefined {
        if (typeof component != 'undefined' && component != null) {
            return { component, componentId: this.fixComponentId(componentId) };
        }
    }

    /**
     * Prepare list of links from component and componentId.
     *
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Links.
     */
    protected createComponentLinks(component?: string, componentId?: string | number): CoreFilepoolComponentLink[] {
        const link = this.createComponentLink(component, componentId);

        return link ? [link] : [];
    }

    /**
     * Given the current status of a list of packages and the status of one of the packages,
     * determine the new status for the list of packages. The status of a list of packages is:
     *     - CoreConstants.NOT_DOWNLOADABLE if there are no downloadable packages.
     *     - CoreConstants.NOT_DOWNLOADED if at least 1 package has status CoreConstants.NOT_DOWNLOADED.
     *     - CoreConstants.DOWNLOADED if ALL the downloadable packages have status CoreConstants.DOWNLOADED.
     *     - CoreConstants.DOWNLOADING if ALL the downloadable packages have status CoreConstants.DOWNLOADING or
     *                                     CoreConstants.DOWNLOADED, with at least 1 package with CoreConstants.DOWNLOADING.
     *     - CoreConstants.OUTDATED if ALL the downloadable packages have status CoreConstants.OUTDATED or CoreConstants.DOWNLOADED
     *                                     or CoreConstants.DOWNLOADING, with at least 1 package with CoreConstants.OUTDATED.
     *
     * @param current Current status of the list of packages.
     * @param packagestatus Status of one of the packages.
     * @return New status for the list of packages;
     */
    determinePackagesStatus(current: string, packageStatus: string): string {
        if (!current) {
            current = CoreConstants.NOT_DOWNLOADABLE;
        }

        if (packageStatus === CoreConstants.NOT_DOWNLOADED) {
            // If 1 package is not downloaded the status of the whole list will always be not downloaded.
            return CoreConstants.NOT_DOWNLOADED;
        } else if (packageStatus === CoreConstants.DOWNLOADED && current === CoreConstants.NOT_DOWNLOADABLE) {
            // If all packages are downloaded or not downloadable with at least 1 downloaded, status will be downloaded.
            return CoreConstants.DOWNLOADED;
        } else if (packageStatus === CoreConstants.DOWNLOADING &&
            (current === CoreConstants.NOT_DOWNLOADABLE || current === CoreConstants.DOWNLOADED)) {
            // If all packages are downloading/downloaded/notdownloadable with at least 1 downloading, status will be downloading.
            return CoreConstants.DOWNLOADING;
        } else if (packageStatus === CoreConstants.OUTDATED && current !== CoreConstants.NOT_DOWNLOADED) {
            // If there are no packages notdownloaded and there is at least 1 outdated, status will be outdated.
            return CoreConstants.OUTDATED;
        }

        // Status remains the same.
        return current;
    }

    /**
     * Downloads a URL and update or add it to the pool.
     *
     * This uses the file system, you should always make sure that it is accessible before calling this method.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @param options Extra options (revision, timemodified, isexternalfile, repositorytype).
     * @param filePath Filepath to download the file to. If defined, no extension will be added.
     * @param onProgress Function to call on progress.
     * @param poolFileObject When set, the object will be updated, a new entry will not be created.
     * @return Resolved with internal URL on success, rejected otherwise.
     */
    protected async downloadForPoolByUrl(
        siteId: string,
        fileUrl: string,
        options: CoreFilepoolFileOptions = {},
        filePath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
        poolFileObject?: CoreFilepoolFileEntry,
    ): Promise<string> {
        const fileId = this.getFileIdByUrl(fileUrl);
        const extension = CoreMimetypeUtils.guessExtensionFromUrl(fileUrl);
        const addExtension = typeof filePath == 'undefined';
        const path = filePath || (await this.getFilePath(siteId, fileId, extension));

        if (poolFileObject && poolFileObject.fileId !== fileId) {
            this.logger.error('Invalid object to update passed');

            throw new CoreError('Invalid object to update passed.');
        }

        const downloadId = this.getFileDownloadId(fileUrl, path);

        if (this.filePromises[siteId] && this.filePromises[siteId][downloadId]) {
            // There's already a download ongoing for this file in this location, return the promise.
            return this.filePromises[siteId][downloadId];
        } else if (!this.filePromises[siteId]) {
            this.filePromises[siteId] = {};
        }

        this.filePromises[siteId][downloadId] = CoreSites.getSite(siteId).then(async (site) => {
            if (!site.canDownloadFiles()) {
                throw new CoreError('Site doesn\'t allow downloading files.');
            }

            const entry = await CoreWS.downloadFile(fileUrl, path, addExtension, onProgress);
            const fileEntry = entry;
            await CorePluginFileDelegate.treatDownloadedFile(fileUrl, fileEntry, siteId, onProgress);

            await this.addFileToPool(siteId, fileId, {
                downloadTime: Date.now(),
                stale: 0,
                url: fileUrl,
                revision: options.revision,
                timemodified: options.timemodified,
                isexternalfile: options.isexternalfile ? 1 : 0,
                repositorytype: options.repositorytype,
                path: fileEntry.path,
                extension: fileEntry.extension,
            });

            return fileEntry.toURL();
        }).finally(() => {
            // Download finished, delete the promise.
            delete this.filePromises[siteId][downloadId];
        });

        return this.filePromises[siteId][downloadId];
    }

    /**
     * Download or prefetch several files into the filepool folder.
     *
     * @param siteId The site ID.
     * @param files Array of files to download.
     * @param prefetch True if should prefetch the contents (queue), false if they should be downloaded right now.
     * @param ignoreStale True if 'stale' should be ignored. Only if prefetch=false.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param dirPath Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                the files directly inside the filepool folder.
     * @return Resolved on success.
     */
    downloadOrPrefetchFiles(
        siteId: string,
        files: CoreWSFile[],
        prefetch: boolean,
        ignoreStale?: boolean,
        component?: string,
        componentId?: string | number,
        dirPath?: string,
    ): Promise<void> {
        const promises: Promise<unknown>[] = [];

        // Download files.
        files.forEach((file) => {
            const url = CoreFileHelper.getFileUrl(file);
            const timemodified = file.timemodified;
            const options = {
                isexternalfile: 'isexternalfile' in file ? file.isexternalfile : undefined,
                repositorytype: 'repositorytype' in file ? file.repositorytype : undefined,
            };
            let path: string | undefined;

            if (dirPath) {
                // Calculate the path to the file.
                path = file.filename;
                if (file.filepath && file.filepath !== '/') {
                    path = file.filepath.substr(1) + path;
                }
                path = CoreTextUtils.concatenatePaths(dirPath, path!);
            }

            if (prefetch) {
                promises.push(this.addToQueueByUrl(siteId, url, component, componentId, timemodified, path, undefined, 0, options));
            } else {
                promises.push(this.downloadUrl(
                    siteId,
                    url,
                    ignoreStale,
                    component,
                    componentId,
                    timemodified,
                    undefined,
                    path,
                    options,
                ));
            }
        });

        return CoreUtils.allPromises(promises);
    }

    /**
     * Downloads or prefetches a list of files as a "package".
     *
     * @param siteId The site ID.
     * @param fileList List of files to download.
     * @param prefetch True if should prefetch the contents (queue), false if they should be downloaded right now.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param extra Extra data to store for the package.
     * @param dirPath Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                the files directly inside the filepool folder.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when the package is downloaded.
     */
    downloadOrPrefetchPackage(
        siteId: string,
        fileList: CoreWSFile[],
        prefetch: boolean,
        component: string,
        componentId?: string | number,
        extra?: string,
        dirPath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> {
        const packageId = this.getPackageId(component, componentId);

        if (this.packagesPromises[siteId] && this.packagesPromises[siteId][packageId]) {
            // There's already a download ongoing for this package, return the promise.
            return this.packagesPromises[siteId][packageId];
        } else if (!this.packagesPromises[siteId]) {
            this.packagesPromises[siteId] = {};
        }

        // Set package as downloading.
        const promise = this.storePackageStatus(siteId, CoreConstants.DOWNLOADING, component, componentId).then(async () => {
            const promises: Promise<string | void>[] = [];
            let packageLoaded = 0;

            fileList.forEach((file) => {
                const fileUrl = CoreFileHelper.getFileUrl(file);
                const options = {
                    isexternalfile: 'isexternalfile' in file ? file.isexternalfile : undefined,
                    repositorytype: 'repositorytype' in file ? file.repositorytype : undefined,
                };
                let path: string | undefined;
                let promise: Promise<string | void>;
                let fileLoaded = 0;
                let onFileProgress: ((progress: ProgressEvent) => void) | undefined;

                if (onProgress) {
                    // There's a onProgress event, create a function to receive file download progress events.
                    onFileProgress = (progress: ProgressEvent): void => {
                        if (progress && progress.loaded) {
                            // Add the new size loaded to the package loaded.
                            packageLoaded = packageLoaded + (progress.loaded - fileLoaded);
                            fileLoaded = progress.loaded;
                            onProgress({
                                packageDownload: true,
                                loaded: packageLoaded,
                                fileProgress: progress,
                            });
                        }
                    };
                }

                if (dirPath) {
                    // Calculate the path to the file.
                    path = file.filename;
                    if (file.filepath && file.filepath !== '/') {
                        path = file.filepath.substr(1) + path;
                    }
                    path = CoreTextUtils.concatenatePaths(dirPath, path!);
                }

                if (prefetch) {
                    promise = this.addToQueueByUrl(
                        siteId,
                        fileUrl,
                        component,
                        componentId,
                        file.timemodified,
                        path,
                        undefined,
                        0,
                        options,
                    );
                } else {
                    promise = this.downloadUrl(
                        siteId,
                        fileUrl,
                        false,
                        component,
                        componentId,
                        file.timemodified,
                        onFileProgress,
                        path,
                        options,
                    );
                }

                // Using undefined for success & fail will pass the success/failure to the parent promise.
                promises.push(promise);
            });

            try {
                await Promise.all(promises);
                // Success prefetching, store package as downloaded.
                await this.storePackageStatus(siteId, CoreConstants.DOWNLOADED, component, componentId, extra);

                return;
            } catch (error) {
                // Error downloading, go back to previous status and reject the promise.
                await this.setPackagePreviousStatus(siteId, component, componentId);

                throw error;
            }
        }).finally(() => {
            // Download finished, delete the promise.
            delete this.packagesPromises[siteId][packageId];
        });

        this.packagesPromises[siteId][packageId] = promise;

        return promise;
    }

    /**
     * Downloads a list of files.
     *
     * @param siteId The site ID.
     * @param fileList List of files to download.
     * @param component The component to link the file to.
     * @param componentId An ID to identify the download.
     * @param extra Extra data to store for the package.
     * @param dirPath Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                the files directly inside the filepool folder.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when all files are downloaded.
     */
    downloadPackage(
        siteId: string,
        fileList: CoreWSFile[],
        component: string,
        componentId?: string | number,
        extra?: string,
        dirPath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> {
        return this.downloadOrPrefetchPackage(siteId, fileList, false, component, componentId, extra, dirPath, onProgress);
    }

    /**
     * Downloads a file on the spot.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @param ignoreStale Whether 'stale' should be ignored.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified. Can be used to check file state.
     * @param filePath Filepath to download the file to. If not defined, download to the filepool folder.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Resolved with internal URL on success, rejected otherwise.
     * @description
     * Downloads a file on the spot.
     *
     * This will also take care of adding the file to the pool if it's missing. However, please note that this will
     * not force a file to be re-downloaded if it is already part of the pool. You should mark a file as stale using
     * invalidateFileByUrl to trigger a download.
     */
    async downloadUrl(
        siteId: string,
        fileUrl: string,
        ignoreStale?: boolean,
        component?: string,
        componentId?: string | number,
        timemodified: number = 0,
        onProgress?: CoreFilepoolOnProgressCallback,
        filePath?: string,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
    ): Promise<string> {
        let alreadyDownloaded = true;

        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const file = await this.fixPluginfileURL(siteId, fileUrl);
        fileUrl = CoreFileHelper.getFileUrl(file);
        timemodified = file.timemodified || timemodified;

        options = Object.assign({}, options); // Create a copy to prevent modifying the original object.
        options.timemodified = timemodified || 0;
        options.revision = revision || this.getRevisionFromUrl(fileUrl);
        const fileId = this.getFileIdByUrl(fileUrl);

        const links = this.createComponentLinks(component, componentId);

        const finishSuccessfulDownload = (url: string): string => {
            if (typeof component != 'undefined') {
                CoreUtils.ignoreErrors(this.addFileLink(siteId, fileId, component, componentId));
            }

            if (!alreadyDownloaded) {
                this.notifyFileDownloaded(siteId, fileId, links);
            }

            return url;
        };

        try {
            const fileObject = await this.hasFileInPool(siteId, fileId);
            let url: string;

            if (!fileObject ||
                this.isFileOutdated(fileObject, options.revision, options.timemodified) &&
                CoreApp.isOnline() &&
                !ignoreStale
            ) {
                throw new CoreError('Needs to be downloaded');
            }

            // File downloaded and not outdated, return the file from disk.
            if (filePath) {
                url = await this.getInternalUrlByPath(filePath);
            } else {
                url = await this.getInternalUrlById(siteId, fileId);
            }

            return finishSuccessfulDownload(url);
        } catch (error) {
            // The file is not downloaded or it's outdated.
            this.notifyFileDownloading(siteId, fileId, links);
            alreadyDownloaded = false;

            try {
                const url = await this.downloadForPoolByUrl(siteId, fileUrl, options, filePath, onProgress);

                return finishSuccessfulDownload(url);
            } catch (error) {
                this.notifyFileDownloadError(siteId, fileId, links);

                throw error;
            }
        }
    }

    /**
     * Extract the downloadable URLs from an HTML code.
     *
     * @param html HTML code.
     * @return List of file urls.
     */
    extractDownloadableFilesFromHtml(html: string): string[] {
        let urls: string[] = [];

        const element = CoreDomUtils.convertToElement(html);
        const elements: AnchorOrMediaElement[] = Array.from(element.querySelectorAll('a, img, audio, video, source, track'));

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const url = 'href' in element ? element.href : element.src;

            if (url && CoreUrlUtils.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                urls.push(url);
            }

            // Treat video poster.
            if (element.tagName == 'VIDEO' && element.getAttribute('poster')) {
                const poster = element.getAttribute('poster');
                if (poster && CoreUrlUtils.isDownloadableUrl(poster) && urls.indexOf(poster) == -1) {
                    urls.push(poster);
                }
            }
        }

        // Now get other files from plugin file handlers.
        urls = urls.concat(CorePluginFileDelegate.getDownloadableFilesFromHTML(element));

        return urls;
    }

    /**
     * Extract the downloadable URLs from an HTML code and returns them in fake file objects.
     *
     * @param html HTML code.
     * @return List of fake file objects with file URLs.
     */
    extractDownloadableFilesFromHtmlAsFakeFileObjects(html: string): CoreWSExternalFile[] {
        const urls = this.extractDownloadableFilesFromHtml(html);

        // Convert them to fake file objects.
        return urls.map((url) => ({
            fileurl: url,
        }));
    }

    /**
     * Fill Missing Extension In the File Object if needed.
     * This is to migrate from old versions.
     *
     * @param fileObject File object to be migrated.
     * @param siteId SiteID to get migrated.
     * @return Promise resolved when done.
     */
    protected async fillExtensionInFile(entry: CoreFilepoolFileEntry, siteId: string): Promise<void> {
        if (typeof entry.extension != 'undefined') {
            // Already filled.
            return;
        }

        const db = await CoreSites.getSiteDb(siteId);
        const extension = CoreMimetypeUtils.getFileExtension(entry.path);
        if (!extension) {
            // Files does not have extension. Invalidate file (stale = true).
            // Minor problem: file will remain in the filesystem once downloaded again.
            this.logger.debug('Staled file with no extension ' + entry.fileId);

            await db.updateRecords(FILES_TABLE_NAME, { stale: 1 }, { fileId: entry.fileId });

            return;
        }

        // File has extension. Save extension, and add extension to path.
        const fileId = entry.fileId;
        entry.fileId = CoreMimetypeUtils.removeExtension(fileId);
        entry.extension = extension;

        await db.updateRecords(FILES_TABLE_NAME, entry, { fileId });
        if (entry.fileId == fileId) {
            // File ID hasn't changed, we're done.
            this.logger.debug('Removed extesion ' + extension + ' from file ' + entry.fileId);

            return;
        }

        // Now update the links.
        await db.updateRecords(LINKS_TABLE_NAME, { fileId: entry.fileId }, { fileId });
    }

    /**
     * Fix a component ID to always be a Number if possible.
     *
     * @param componentId The component ID.
     * @return The normalised component ID. -1 when undefined was passed.
     */
    protected fixComponentId(componentId?: string | number): string | number {
        if (typeof componentId == 'number') {
            return componentId;
        }

        if (typeof componentId == 'undefined' || componentId === null) {
            return -1;
        }

        // Try to convert it to a number.
        const id = parseInt(componentId, 10);
        if (isNaN(id)) {
            // Not a number.
            return componentId;
        }

        return id;
    }

    /**
     * Check whether the file can be downloaded, add the wstoken url and points to the correct script.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @param timemodified The timemodified of the file.
     * @return Promise resolved with the file data to use.
     */
    protected async fixPluginfileURL(siteId: string, fileUrl: string, timemodified: number = 0): Promise<CoreWSFile> {
        const file = await CorePluginFileDelegate.getDownloadableFile({ fileurl: fileUrl, timemodified });
        const site = await CoreSites.getSite(siteId);

        if ('fileurl' in file) {
            file.fileurl = await site.checkAndFixPluginfileURL(file.fileurl);
        } else {
            file.url = await site.checkAndFixPluginfileURL(file.url);
        }

        return file;
    }

    /**
     * Convenience function to get component files.
     *
     * @param db Site's DB.
     * @param component The component to get.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the files.
     */
    protected async getComponentFiles(
        db: SQLiteDB,
        component: string,
        componentId?: string | number,
    ): Promise<CoreFilepoolLinksRecord[]> {
        const conditions = {
            component,
            componentId: this.fixComponentId(componentId),
        };

        const items = await db.getRecords<CoreFilepoolLinksRecord>(LINKS_TABLE_NAME, conditions);
        items.forEach((item) => {
            item.componentId = this.fixComponentId(item.componentId);
        });

        return items;
    }

    /**
     * Returns the local URL of a directory.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved with the URL. Rejected otherwise.
     */
    async getDirectoryUrlByUrl(siteId: string, fileUrl: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));
        const filePath = await this.getFilePath(siteId, fileId, '');
        const dirEntry = await CoreFile.getDir(filePath);

        return dirEntry.toURL();
    }

    /**
     * Get the ID of a file download. Used to keep track of filePromises.
     *
     * @param fileUrl The file URL.
     * @param filePath The file destination path.
     * @return File download ID.
     */
    protected getFileDownloadId(fileUrl: string, filePath: string): string {
        return <string> Md5.hashAsciiStr(fileUrl + '###' + filePath);
    }

    /**
     * Get the name of the event used to notify download events (CoreEventsProvider).
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Event name.
     */
    protected getFileEventName(siteId: string, fileId: string): string {
        return 'CoreFilepoolFile:' + siteId + ':' + fileId;
    }

    /**
     * Get the name of the event used to notify download events (CoreEventsProvider).
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file.
     * @return Promise resolved with event name.
     */
    getFileEventNameByUrl(siteId: string, fileUrl: string): Promise<string> {
        return this.fixPluginfileURL(siteId, fileUrl).then((file) => {
            const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

            return this.getFileEventName(siteId, fileId);
        });
    }

    /**
     * Creates a unique ID based on a URL.
     *
     * This has a minimal handling of pluginfiles in order to generate a clean file ID which will not change if
     * pointing to the same pluginfile URL even if the token or extra attributes have changed.
     *
     * @param fileUrl The absolute URL to the file.
     * @return The file ID.
     */
    protected getFileIdByUrl(fileUrl: string): string {
        let url = fileUrl;

        // If site supports it, since 3.8 we use tokenpluginfile instead of pluginfile.
        // For compatibility with files already downloaded, we need to use pluginfile to calculate the file ID.
        url = url.replace(/\/tokenpluginfile\.php\/[^/]+\//, '/webservice/pluginfile.php/');

        // Remove the revision number from the URL so updates on the file aren't detected as a different file.
        url = this.removeRevisionFromUrl(url);

        // Decode URL.
        url = CoreTextUtils.decodeHTML(CoreTextUtils.decodeURIComponent(url));

        if (url.indexOf('/webservice/pluginfile') !== -1) {
            // Remove attributes that do not matter.
            this.urlAttributes.forEach((regex) => {
                url = url.replace(regex, '');
            });
        }

        // Try to guess the filename the target file should have.
        // We want to keep the original file name so people can easily identify the files after the download.
        const filename = this.guessFilenameFromUrl(url);

        return this.addHashToFilename(url, filename);
    }

    /**
     * Get the links of a file.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Promise resolved with the links.
     */
    protected async getFileLinks(siteId: string, fileId: string): Promise<CoreFilepoolLinksRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);
        const items = await db.getRecords<CoreFilepoolLinksRecord>(LINKS_TABLE_NAME, { fileId });

        items.forEach((item) => {
            item.componentId = this.fixComponentId(item.componentId);
        });

        return items;
    }

    /**
     * Get the path to a file. This does not check if the file exists or not.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param extension Previously calculated extension. Empty to not add any. Undefined to calculate it.
     * @return The path to the file relative to storage root.
     */
    protected async getFilePath(siteId: string, fileId: string, extension?: string): Promise<string> {
        let path = this.getFilepoolFolderPath(siteId) + '/' + fileId;

        if (typeof extension == 'undefined') {
            // We need the extension to be able to open files properly.
            try {
                const entry = await this.hasFileInPool(siteId, fileId);

                if (entry.extension) {
                    path += '.' + entry.extension;
                }
            } catch (error) {
                // If file not found, use the path without extension.
            }
        } else if (extension) {
            path += '.' + extension;
        }

        return path;
    }

    /**
     * Get the path to a file from its URL. This does not check if the file exists or not.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Promise resolved with the path to the file relative to storage root.
     */
    async getFilePathByUrl(siteId: string, fileUrl: string): Promise<string> {
        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        return this.getFilePath(siteId, fileId);
    }

    /**
     * Get site Filepool Folder Path
     *
     * @param siteId The site ID.
     * @return The root path to the filepool of the site.
     */
    getFilepoolFolderPath(siteId: string): string {
        return CoreFile.getSiteFolder(siteId) + '/' + CoreFilepoolProvider.FOLDER;
    }

    /**
     * Get all the matching files from a component. Returns objects containing properties like path, extension and url.
     *
     * @param siteId The site ID.
     * @param component The component to get.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the files on success.
     */
    async getFilesByComponent(siteId: string, component: string, componentId?: string | number): Promise<CoreFilepoolFileEntry[]> {
        const db = await CoreSites.getSiteDb(siteId);
        const items = await this.getComponentFiles(db, component, componentId);
        const files: CoreFilepoolFileEntry[] = [];

        await Promise.all(items.map(async (item) => {
            try {
                const fileEntry = await db.getRecord<CoreFilepoolFileEntry>(
                    FILES_TABLE_NAME,
                    { fileId: item.fileId },
                );

                if (!fileEntry) {
                    return;
                }

                files.push(fileEntry);
            } catch (error) {
                // File not found, ignore error.
            }
        }));

        return files;
    }

    /**
     * Get the size of all the files from a component.
     *
     * @param siteId The site ID.
     * @param component The component to get.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the size on success.
     */
    async getFilesSizeByComponent(siteId: string, component: string, componentId?: string | number): Promise<number> {
        const files = await this.getFilesByComponent(siteId, component, componentId);

        let size = 0;

        await Promise.all(files.map(async (file) => {
            try {
                const fileSize = await CoreFile.getFileSize(file.path);

                size += fileSize;
            } catch (error) {
                // Ignore failures, maybe some file was deleted.
            }
        }));

        return size;
    }

    /**
     * Returns the file state: mmCoreDownloaded, mmCoreDownloading, mmCoreNotDownloaded or mmCoreOutdated.
     *
     * @param siteId The site ID.
     * @param fileUrl File URL.
     * @param timemodified The time this file was modified.
     * @param filePath Filepath to download the file to. If defined, no extension will be added.
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Promise resolved with the file state.
     */
    async getFileStateByUrl(
        siteId: string,
        fileUrl: string,
        timemodified: number = 0,
        filePath?: string,
        revision?: number,
    ): Promise<string> {
        let file: CoreWSFile;

        try {
            file = await this.fixPluginfileURL(siteId, fileUrl, timemodified);
        } catch (e) {
            return CoreConstants.NOT_DOWNLOADABLE;
        }

        fileUrl = CoreFileHelper.getFileUrl(file);
        timemodified = file.timemodified || timemodified;
        revision = revision || this.getRevisionFromUrl(fileUrl);
        const fileId = this.getFileIdByUrl(fileUrl);

        try {
            // Check if the file is in queue (waiting to be downloaded).
            await this.hasFileInQueue(siteId, fileId);

            return CoreConstants.DOWNLOADING;
        } catch (e) {
            // Check if the file is being downloaded right now.
            const extension = CoreMimetypeUtils.guessExtensionFromUrl(fileUrl);
            filePath = filePath || (await this.getFilePath(siteId, fileId, extension));

            const downloadId = this.getFileDownloadId(fileUrl, filePath);

            if (this.filePromises[siteId] && this.filePromises[siteId][downloadId]) {
                return CoreConstants.DOWNLOADING;
            }

            try {
                // File is not being downloaded. Check if it's downloaded and if it's outdated.
                const entry = await this.hasFileInPool(siteId, fileId);

                if (this.isFileOutdated(entry, revision, timemodified)) {
                    return CoreConstants.OUTDATED;
                }

                return CoreConstants.DOWNLOADED;
            } catch (e) {
                return CoreConstants.NOT_DOWNLOADED;
            }
        }
    }

    /**
     * Returns an absolute URL to access the file URL.
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file.
     * @param mode The type of URL to return. Accepts 'url' or 'src'.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param checkSize True if we shouldn't download files if their size is big, false otherwise.
     * @param downloadUnknown True to download file in WiFi if their size is unknown, false otherwise.
     *                        Ignored if checkSize=false.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Resolved with the URL to use.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     *
     * This handles the queue and validity of the file. If there is a local file and it's valid, return the local URL.
     * If the file isn't downloaded or it's outdated, return the online URL and add it to the queue to be downloaded later.
     */
    protected async getFileUrlByUrl(
        siteId: string,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        mode: string = 'url',
        timemodified: number = 0,
        checkSize: boolean = true,
        downloadUnknown?: boolean,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
    ): Promise<string> {
        const addToQueue = (fileUrl: string): void => {
            // Add the file to queue if needed and ignore errors.
            CoreUtils.ignoreErrors(this.addToQueueIfNeeded(
                siteId,
                fileUrl,
                component,
                componentId,
                timemodified,
                checkSize,
                downloadUnknown,
                options,
                revision,
            ));
        };

        const file = await this.fixPluginfileURL(siteId, fileUrl, timemodified);

        fileUrl = CoreFileHelper.getFileUrl(file);
        timemodified = file.timemodified || timemodified;
        revision = revision || this.getRevisionFromUrl(fileUrl);
        const fileId = this.getFileIdByUrl(fileUrl);

        try {
            const entry = await this.hasFileInPool(siteId, fileId);

            if (typeof entry === 'undefined') {
                throw new CoreError('File not downloaded.');
            }

            if (this.isFileOutdated(entry, revision, timemodified) && CoreApp.isOnline()) {
                throw new CoreError('File is outdated');
            }
        } catch (error) {
            // The file is not downloaded or it's outdated. Add to queue and return the fixed URL.
            addToQueue(fileUrl);

            return fileUrl;
        }

        try {
            // We found the file entry, now look for the file on disk.
            if (mode === 'src') {
                return await this.getInternalSrcById(siteId, fileId);
            } else {
                return await this.getInternalUrlById(siteId, fileId);
            }
        } catch (error) {
            // The file is not on disk.
            // We could not retrieve the file, delete the entries associated with that ID.
            this.logger.debug('File ' + fileId + ' not found on disk');
            this.removeFileById(siteId, fileId);
            addToQueue(fileUrl);

            return fileUrl;
        }
    }

    /**
     * Returns the internal SRC of a file.
     *
     * The returned URL from this method is typically used with IMG tags.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Resolved with the internal URL. Rejected otherwise.
     */
    protected async getInternalSrcById(siteId: string, fileId: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const path = await this.getFilePath(siteId, fileId);
        const fileEntry = await CoreFile.getFile(path);

        return CoreFile.convertFileSrc(fileEntry.toURL());
    }

    /**
     * Returns the local URL of a file.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Resolved with the URL. Rejected otherwise.
     */
    protected async getInternalUrlById(siteId: string, fileId: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const path = await this.getFilePath(siteId, fileId);
        const fileEntry = await CoreFile.getFile(path);

        // This URL is usually used to launch files or put them in HTML.
        return fileEntry.toURL();
    }

    /**
     * Returns the local URL of a file.
     *
     * @param filePath The file path.
     * @return Resolved with the URL.
     */
    protected async getInternalUrlByPath(filePath: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const fileEntry = await CoreFile.getFile(filePath);

        return fileEntry.toURL();
    }

    /**
     * Returns the local URL of a file.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved with the URL. Rejected otherwise.
     */
    async getInternalUrlByUrl(siteId: string, fileUrl: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        return this.getInternalUrlById(siteId, fileId);
    }

    /**
     * Get the data stored for a package.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the data.
     */
    async getPackageData(siteId: string, component: string, componentId?: string | number): Promise<CoreFilepoolPackageEntry> {
        componentId = this.fixComponentId(componentId);

        const site = await CoreSites.getSite(siteId);
        const packageId = this.getPackageId(component, componentId);

        return site.getDb().getRecord(PACKAGES_TABLE_NAME, { id: packageId });
    }

    /**
     * Creates the name for a package directory (hash).
     *
     * @param url An URL to identify the package.
     * @return The directory name.
     */
    protected getPackageDirNameByUrl(url: string): string {
        let extension = '';

        url = this.removeRevisionFromUrl(url);

        if (url.indexOf('/webservice/pluginfile') !== -1) {
            // Remove attributes that do not matter.
            this.urlAttributes.forEach((regex) => {
                url = url.replace(regex, '');
            });

            // Guess the extension of the URL. This is for backwards compatibility.
            const candidate = CoreMimetypeUtils.guessExtensionFromUrl(url);
            if (candidate && candidate !== 'php') {
                extension = '.' + candidate;
            }
        }

        return Md5.hashAsciiStr('url:' + url) + extension;
    }

    /**
     * Get the path to a directory to store a package files. This does not check if the file exists or not.
     *
     * @param siteId The site ID.
     * @param url An URL to identify the package.
     * @return Promise resolved with the path of the package.
     */
    getPackageDirPathByUrl(siteId: string, url: string): Promise<string> {
        return this.fixPluginfileURL(siteId, url).then((file) => {
            const dirName = this.getPackageDirNameByUrl(CoreFileHelper.getFileUrl(file));

            return this.getFilePath(siteId, dirName, '');
        });
    }

    /**
     * Returns the local URL of a package directory.
     *
     * @param siteId The site ID.
     * @param url An URL to identify the package.
     * @return Resolved with the URL.
     */
    async getPackageDirUrlByUrl(siteId: string, url: string): Promise<string> {
        if (!CoreFile.isAvailable()) {
            throw new CoreError('File system cannot be used.');
        }

        const file = await this.fixPluginfileURL(siteId, url);
        const dirName = this.getPackageDirNameByUrl(CoreFileHelper.getFileUrl(file));
        const dirPath = await this.getFilePath(siteId, dirName, '');
        const dirEntry = await CoreFile.getDir(dirPath);

        return dirEntry.toURL();
    }

    /**
     * Get a download promise. If the promise is not set, return undefined.
     *
     * @param siteId Site ID.
     * @param component The component of the package.
     * @param componentId An ID to use in conjunction with the component.
     * @return Download promise or undefined.
     */
    getPackageDownloadPromise(siteId: string, component: string, componentId?: string | number): Promise<void> | undefined {
        const packageId = this.getPackageId(component, componentId);
        if (this.packagesPromises[siteId] && this.packagesPromises[siteId][packageId]) {
            return this.packagesPromises[siteId][packageId];
        }
    }

    /**
     * Get a package extra data.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the extra data.
     */
    getPackageExtra(siteId: string, component: string, componentId?: string | number): Promise<string | undefined> {
        return this.getPackageData(siteId, component, componentId).then((entry) => entry.extra);
    }

    /**
     * Get the ID of a package.
     *
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Package ID.
     */
    getPackageId(component: string, componentId?: string | number): string {
        return <string> Md5.hashAsciiStr(component + '#' + this.fixComponentId(componentId));
    }

    /**
     * Get a package previous status.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the status.
     */
    async getPackagePreviousStatus(siteId: string, component: string, componentId?: string | number): Promise<string> {
        try {
            const entry = await this.getPackageData(siteId, component, componentId);

            return entry.previous || CoreConstants.NOT_DOWNLOADED;
        } catch (error) {
            return CoreConstants.NOT_DOWNLOADED;
        }
    }

    /**
     * Get a package status.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved with the status.
     */
    async getPackageStatus(siteId: string, component: string, componentId?: string | number): Promise<string> {
        try {
            const entry = await this.getPackageData(siteId, component, componentId);

            return entry.status || CoreConstants.NOT_DOWNLOADED;
        } catch (error) {
            return CoreConstants.NOT_DOWNLOADED;
        }
    }

    /**
     * Return the array of arguments of the pluginfile url.
     *
     * @param url URL to get the args.
     * @return The args found, undefined if not a pluginfile.
     */
    protected getPluginFileArgs(url: string): string[] | undefined {
        if (!CoreUrlUtils.isPluginFileUrl(url)) {
            // Not pluginfile, return.
            return;
        }

        const relativePath = url.substr(url.indexOf('/pluginfile.php') + 16);
        const args = relativePath.split('/');

        if (args.length < 3) {
            // To be a plugin file it should have at least contextId, Component and Filearea.
            return;
        }

        return args;
    }

    /**
     * Get the deferred object for a file in the queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param create True if it should create a new deferred if it doesn't exist.
     * @param onProgress Function to call on progress.
     * @return Deferred.
     */
    protected getQueueDeferred(
        siteId: string,
        fileId: string,
        create: boolean = true,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): CoreFilepoolPromiseDefer | undefined {
        if (!this.queueDeferreds[siteId]) {
            if (!create) {
                return;
            }
            this.queueDeferreds[siteId] = {};
        }
        if (!this.queueDeferreds[siteId][fileId]) {
            if (!create) {
                return;
            }
            this.queueDeferreds[siteId][fileId] = CoreUtils.promiseDefer();
        }

        if (onProgress) {
            this.queueDeferreds[siteId][fileId].onProgress = onProgress;
        }

        return this.queueDeferreds[siteId][fileId];
    }

    /**
     * Get the on progress for a file in the queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return On progress function, undefined if not found.
     */
    protected getQueueOnProgress(siteId: string, fileId: string): CoreFilepoolOnProgressCallback | undefined {
        const deferred = this.getQueueDeferred(siteId, fileId, false);

        return deferred?.onProgress;
    }

    /**
     * Get the promise for a file in the queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param create True if it should create a new promise if it doesn't exist.
     * @param onProgress Function to call on progress.
     * @return Promise.
     */
    protected getQueuePromise(
        siteId: string,
        fileId: string,
        create: boolean = true,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> | undefined {
        const deferred = this.getQueueDeferred(siteId, fileId, create, onProgress);

        return deferred?.promise;
    }

    /**
     * Get a revision number from a list of files (highest revision).
     *
     * @param files Package files.
     * @return Highest revision.
     */
    getRevisionFromFileList(files: CoreWSFile[]): number {
        let revision = 0;

        files.forEach((file) => {
            const fileUrl = CoreFileHelper.getFileUrl(file);

            if (fileUrl) {
                const r = this.getRevisionFromUrl(fileUrl);
                if (r > revision) {
                    revision = r;
                }
            }
        });

        return revision;
    }

    /**
     * Get the revision number from a file URL.
     *
     * @param url URL to get the revision number.
     * @return Revision number.
     */
    protected getRevisionFromUrl(url: string): number {
        const args = this.getPluginFileArgs(url);
        if (!args) {
            // Not a pluginfile, no revision will be found.
            return 0;
        }

        const revisionRegex = CorePluginFileDelegate.getComponentRevisionRegExp(args);
        if (!revisionRegex) {
            return 0;
        }

        const matches = url.match(revisionRegex);
        if (matches && typeof matches[1] != 'undefined') {
            return parseInt(matches[1], 10);
        }

        return 0;
    }

    /**
     * Returns an absolute URL to use in IMG tags.
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file.
     * @param mode The type of URL to return. Accepts 'url' or 'src'.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param checkSize True if we shouldn't download files if their size is big, false otherwise.
     * @param downloadUnknown True to download file in WiFi if their size is unknown, false otherwise.
     *                        Ignored if checkSize=false.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Resolved with the URL to use.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     * The URL returned is compatible to use with IMG tags.
     */
    getSrcByUrl(
        siteId: string,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified: number = 0,
        checkSize: boolean = true,
        downloadUnknown?: boolean,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
    ): Promise<string> {
        return this.getFileUrlByUrl(
            siteId,
            fileUrl,
            component,
            componentId,
            'src',
            timemodified,
            checkSize,
            downloadUnknown,
            options,
            revision,
        );
    }

    /**
     * Get time modified from a list of files.
     *
     * @param files List of files.
     * @return Time modified.
     */
    getTimemodifiedFromFileList(files: CoreWSFile[]): number {
        let timemodified = 0;

        files.forEach((file) => {
            if (file.timemodified && file.timemodified > timemodified) {
                timemodified = file.timemodified;
            }
        });

        return timemodified;
    }

    /**
     * Returns an absolute URL to access the file.
     *
     * @param siteId The site ID.
     * @param fileUrl The absolute URL to the file.
     * @param mode The type of URL to return. Accepts 'url' or 'src'.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param checkSize True if we shouldn't download files if their size is big, false otherwise.
     * @param downloadUnknown True to download file in WiFi if their size is unknown, false otherwise.
     *                        Ignored if checkSize=false.
     * @param options Extra options (isexternalfile, repositorytype).
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Resolved with the URL to use.
     * @description
     * This will return a URL pointing to the content of the requested URL.
     * The URL returned is compatible to use with a local browser.
     */
    getUrlByUrl(
        siteId: string,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified: number = 0,
        checkSize: boolean = true,
        downloadUnknown?: boolean,
        options: CoreFilepoolFileOptions = {},
        revision?: number,
    ): Promise<string> {
        return this.getFileUrlByUrl(
            siteId,
            fileUrl,
            component,
            componentId,
            'url',
            timemodified,
            checkSize,
            downloadUnknown,
            options,
            revision,
        );
    }

    /**
     * Guess the filename of a file from its URL. This is very weak and unreliable.
     *
     * @param fileUrl The file URL.
     * @return The filename treated so it doesn't have any special character.
     */
    protected guessFilenameFromUrl(fileUrl: string): string {
        let filename = '';

        if (fileUrl.indexOf('/webservice/pluginfile') !== -1) {
            // It's a pluginfile URL. Search for the 'file' param to extract the name.
            const params = CoreUrlUtils.extractUrlParams(fileUrl);
            if (params.file) {
                filename = params.file.substr(params.file.lastIndexOf('/') + 1);
            } else {
                // 'file' param not found. Extract what's after the last '/' without params.
                filename = CoreUrlUtils.getLastFileWithoutParams(fileUrl);
            }
        } else if (CoreUrlUtils.isGravatarUrl(fileUrl)) {
            // Extract gravatar ID.
            filename = 'gravatar_' + CoreUrlUtils.getLastFileWithoutParams(fileUrl);
        } else if (CoreUrlUtils.isThemeImageUrl(fileUrl)) {
            // Extract user ID.
            const matches = fileUrl.match(/\/core\/([^/]*)\//);
            if (matches && matches[1]) {
                filename = matches[1];
            }
            // Attach a constant and the image type.
            filename = 'default_' + filename + '_' + CoreUrlUtils.getLastFileWithoutParams(fileUrl);
        } else {
            // Another URL. Just get what's after the last /.
            filename = CoreUrlUtils.getLastFileWithoutParams(fileUrl);
        }

        // If there are hashes in the URL, extract them.
        const index = filename.indexOf('#');
        let hashes: string[] | undefined;

        if (index != -1) {
            hashes = filename.split('#');

            // Remove the URL from the array.
            hashes.shift();

            filename = filename.substr(0, index);
        }

        // Remove the extension from the filename.
        filename = CoreMimetypeUtils.removeExtension(filename);

        if (hashes) {
            // Add hashes to the name.
            filename += '_' + hashes.join('_');
        }

        return CoreTextUtils.removeSpecialCharactersForFiles(filename);
    }

    /**
     * Check if the file is already in the pool. This does not check if the file is on the disk.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved with file object from DB on success, rejected otherwise.
     */
    protected async hasFileInPool(siteId: string, fileId: string): Promise<CoreFilepoolFileEntry> {
        const db = await CoreSites.getSiteDb(siteId);
        const entry = await db.getRecord<CoreFilepoolFileEntry>(FILES_TABLE_NAME, { fileId });

        if (typeof entry === 'undefined') {
            throw new CoreError('File not found in filepool.');
        }

        return entry;
    }

    /**
     * Check if the file is in the queue.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved with file object from DB on success, rejected otherwise.
     */
    protected async hasFileInQueue(siteId: string, fileId: string): Promise<CoreFilepoolQueueEntry> {
        const db = await this.appDB;
        const entry = await db.getRecord<CoreFilepoolQueueEntry>(QUEUE_TABLE_NAME, { siteId, fileId });

        if (typeof entry === 'undefined') {
            throw new CoreError('File not found in queue.');
        }
        // Convert the links to an object.
        entry.linksUnserialized = <CoreFilepoolComponentLink[]> CoreTextUtils.parseJSON(entry.links || '[]', []);

        return entry;
    }

    /**
     * Invalidate all the files in a site.
     *
     * @param siteId The site ID.
     * @param onlyUnknown True to only invalidate files from external repos or without revision/timemodified.
     *                    It is advised to set it to true to reduce the performance and data usage of the app.
     * @return Resolved on success.
     */
    async invalidateAllFiles(siteId: string, onlyUnknown: boolean = true): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        const where = onlyUnknown ? CoreFilepoolProvider.FILE_UPDATE_UNKNOWN_WHERE_CLAUSE : undefined;

        await db.updateRecordsWhere(FILES_TABLE_NAME, { stale: 1 }, where);
    }

    /**
     * Invalidate a file by URL.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved on success.
     * @description
     * Invalidates a file by marking it stale. It will not be added to the queue automatically, but the next time this file
     * is requested it will be added to the queue.
     * You can manully call addToQueueByUrl to add this file to the queue immediately.
     * Please note that, if a file is stale, the user will be presented the stale file if there is no network access.
     */
    async invalidateFileByUrl(siteId: string, fileUrl: string): Promise<void> {
        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        const db = await CoreSites.getSiteDb(siteId);

        await db.updateRecords(FILES_TABLE_NAME, { stale: 1 }, { fileId });
    }

    /**
     * Invalidate all the matching files from a component.
     *
     * @param siteId The site ID.
     * @param component The component to invalidate.
     * @param componentId An ID to use in conjunction with the component.
     * @param onlyUnknown True to only invalidate files from external repos or without revision/timemodified.
     *                It is advised to set it to true to reduce the performance and data usage of the app.
     * @return Resolved when done.
     */
    async invalidateFilesByComponent(
        siteId: string | undefined,
        component: string,
        componentId?: string | number,
        onlyUnknown: boolean = true,
    ): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        const items = await this.getComponentFiles(db, component, componentId);

        if (!items.length) {
            // Nothing to invalidate.
            return;
        }

        const fileIds = items.map((item) => item.fileId);

        const whereAndParams = db.getInOrEqual(fileIds);

        whereAndParams.sql = 'fileId ' + whereAndParams.sql;

        if (onlyUnknown) {
            whereAndParams.sql += ' AND (' + CoreFilepoolProvider.FILE_UPDATE_UNKNOWN_WHERE_CLAUSE + ')';
        }

        await db.updateRecordsWhere(FILES_TABLE_NAME, { stale: 1 }, whereAndParams.sql, whereAndParams.params);
    }

    /**
     * Whether a file action indicates a file was downloaded or deleted.
     *
     * @param data Event data.
     * @return Whether downloaded or deleted.
     */
    isFileEventDownloadedOrDeleted(data: CoreFilepoolFileEventData): boolean {
        return (data.action == CoreFilepoolFileActions.DOWNLOAD && data.success == true) ||
                data.action == CoreFilepoolFileActions.DELETED;
    }

    /**
     * Check whether a file is downloadable.
     *
     * @param siteId The site ID.
     * @param fileUrl File URL.
     * @param timemodified The time this file was modified.
     * @param filePath Filepath to download the file to. If defined, no extension will be added.
     * @param revision File revision. If not defined, it will be calculated using the URL.
     * @return Promise resolved with a boolean: whether a file is downloadable.
     */
    async isFileDownloadable(
        siteId: string,
        fileUrl: string,
        timemodified: number = 0,
        filePath?: string,
        revision?: number,
    ): Promise<boolean> {
        const state = await this.getFileStateByUrl(siteId, fileUrl, timemodified, filePath, revision);

        return state != CoreConstants.NOT_DOWNLOADABLE;
    }

    /**
     * Check if a file is downloading.
     *
     * @param siteId The site ID.
     * @param fileUrl File URL.
     * @param Promise resolved if file is downloading, rejected otherwise.
     */
    async isFileDownloadingByUrl(siteId: string, fileUrl: string): Promise<void> {
        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        await this.hasFileInQueue(siteId, fileId);
    }

    /**
     * Check if a file is outdated.
     *
     * @param entry Filepool entry.
     * @param revision File revision number.
     * @param timemodified The time this file was modified.
     * @param Whether the file is outdated.
     */
    protected isFileOutdated(entry: CoreFilepoolFileEntry, revision?: number, timemodified?: number): boolean {
        return !!entry.stale ||
            (revision !== undefined && (entry.revision === undefined || revision > entry.revision)) ||
            (timemodified !== undefined && (entry.timemodified === undefined || timemodified > entry.timemodified));
    }

    /**
     * Check if cannot determine if a file has been updated.
     *
     * @param entry Filepool entry.
     * @return Whether it cannot determine updates.
     */
    protected isFileUpdateUnknown(entry: CoreFilepoolFileEntry): boolean {
        return !!entry.isexternalfile || (!entry.revision && !entry.timemodified);
    }

    /**
     * Notify an action performed on a file to a list of components.
     *
     * @param siteId The site ID.
     * @param eventData The file event data.
     * @param links The links to the components.
     */
    protected notifyFileActionToComponents(
        siteId: string,
        eventData: CoreFilepoolFileEventData,
        links: CoreFilepoolComponentLink[],
    ): void {
        links.forEach((link) => {
            const data: CoreFilepoolComponentFileEventData = Object.assign({
                component: link.component,
                componentId: link.componentId,
            }, eventData);

            CoreEvents.trigger(CoreEvents.COMPONENT_FILE_ACTION, data, siteId);
        });
    }

    /**
     * Notify a file has been deleted.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links The links to components.
     */
    protected notifyFileDeleted(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): void {
        const data: CoreFilepoolFileEventData = {
            fileId,
            action: CoreFilepoolFileActions.DELETED,
        };

        CoreEvents.trigger(this.getFileEventName(siteId, fileId), data);
        this.notifyFileActionToComponents(siteId, data, links);
    }

    /**
     * Notify a file has been downloaded.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links The links to components.
     */
    protected notifyFileDownloaded(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): void {
        const data: CoreFilepoolFileEventData = {
            fileId,
            action: CoreFilepoolFileActions.DOWNLOAD,
            success: true,
        };

        CoreEvents.trigger(this.getFileEventName(siteId, fileId), data);
        this.notifyFileActionToComponents(siteId, data, links);
    }

    /**
     * Notify error occurred while downloading a file.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links The links to components.
     */
    protected notifyFileDownloadError(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): void {
        const data: CoreFilepoolFileEventData = {
            fileId,
            action: CoreFilepoolFileActions.DOWNLOAD,
            success: false,
        };

        CoreEvents.trigger(this.getFileEventName(siteId, fileId), data);
        this.notifyFileActionToComponents(siteId, data, links);
    }

    /**
     * Notify a file starts being downloaded or added to queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links The links to components.
     */
    protected notifyFileDownloading(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): void {
        const data: CoreFilepoolFileEventData = {
            fileId,
            action: CoreFilepoolFileActions.DOWNLOADING,
        };

        CoreEvents.trigger(this.getFileEventName(siteId, fileId), data);
        this.notifyFileActionToComponents(siteId, data, links);
    }

    /**
     * Notify a file has been outdated.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param links The links to components.
     */
    protected notifyFileOutdated(siteId: string, fileId: string, links: CoreFilepoolComponentLink[]): void {
        const data: CoreFilepoolFileEventData = {
            fileId,
            action: CoreFilepoolFileActions.OUTDATED,
        };

        CoreEvents.trigger(this.getFileEventName(siteId, fileId), data);
        this.notifyFileActionToComponents(siteId, data, links);
    }

    /**
     * Prefetches a list of files.
     *
     * @param siteId The site ID.
     * @param fileList List of files to download.
     * @param component The component to link the file to.
     * @param componentId An ID to identify the download.
     * @param extra Extra data to store for the package.
     * @param dirPath Name of the directory where to store the files (inside filepool dir). If not defined, store
     *                the files directly inside the filepool folder.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when all files are downloaded.
     */
    prefetchPackage(
        siteId: string,
        fileList: CoreWSFile[],
        component: string,
        componentId?: string | number,
        extra?: string,
        dirPath?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> {
        return this.downloadOrPrefetchPackage(siteId, fileList, true, component, componentId, extra, dirPath, onProgress);
    }

    /**
     * Process the queue.
     *
     * @description
     * This loops over itself to keep on processing the queue in the background.
     * The queue process is site agnostic.
     */
    protected async processQueue(): Promise<void> {
        try {
            if (this.queueState !== CoreFilepoolProvider.QUEUE_RUNNING) {
                // Silently ignore, the queue is on pause.
                throw CoreFilepoolProvider.ERR_QUEUE_ON_PAUSE;
            } else if (!CoreFile.isAvailable() || !CoreApp.isOnline()) {
                throw CoreFilepoolProvider.ERR_FS_OR_NETWORK_UNAVAILABLE;
            }

            await this.processImportantQueueItem();
        } catch (error) {
            // We had an error, in which case we pause the processing.
            if (error === CoreFilepoolProvider.ERR_FS_OR_NETWORK_UNAVAILABLE) {
                this.logger.debug('Filesysem or network unavailable, pausing queue processing.');
            } else if (error === CoreFilepoolProvider.ERR_QUEUE_IS_EMPTY) {
                this.logger.debug('Queue is empty, pausing queue processing.');
            }

            this.queueState = CoreFilepoolProvider.QUEUE_PAUSED;

            return;
        }

        // All good, we schedule next execution.
        setTimeout(() => {
            this.processQueue();
        }, CoreFilepoolProvider.QUEUE_PROCESS_INTERVAL);
    }

    /**
     * Process the most important queue item.
     *
     * @return Resolved on success. Rejected on failure.
     */
    protected async processImportantQueueItem(): Promise<void> {
        let items: CoreFilepoolQueueEntry[];
        const db = await this.appDB;

        try {
            items = await db.getRecords<CoreFilepoolQueueEntry>(
                QUEUE_TABLE_NAME,
                undefined,
                'priority DESC, added ASC',
                undefined,
                0,
                1,
            );
        } catch (err) {
            throw CoreFilepoolProvider.ERR_QUEUE_IS_EMPTY;
        }

        const item = items.pop();
        if (!item) {
            throw CoreFilepoolProvider.ERR_QUEUE_IS_EMPTY;
        }
        // Convert the links to an object.
        item.linksUnserialized = <CoreFilepoolComponentLink[]> CoreTextUtils.parseJSON(item.links, []);

        return this.processQueueItem(item);
    }

    /**
     * Process a queue item.
     *
     * @param item The object from the queue store.
     * @return Resolved on success. Rejected on failure.
     */
    protected async processQueueItem(item: CoreFilepoolQueueEntry): Promise<void> {
        // Cast optional fields to undefined instead of null.
        const siteId = item.siteId;
        const fileId = item.fileId;
        const fileUrl = item.url;
        const options = {
            revision: item.revision || undefined,
            timemodified: item.timemodified || undefined,
            isexternalfile: item.isexternalfile || undefined,
            repositorytype: item.repositorytype || undefined,
        };
        const filePath = item.path || undefined;
        const links = item.linksUnserialized || [];

        this.logger.debug('Processing queue item: ' + siteId + ', ' + fileId);

        let entry: CoreFilepoolFileEntry | undefined;

        // Check if the file is already in pool.
        try {
            entry = await this.hasFileInPool(siteId, fileId);
        } catch (error) {
            // File not in pool.
        }

        if (entry && !options.isexternalfile && !this.isFileOutdated(entry, options.revision, options.timemodified)) {
            // We have the file, it is not stale, we can update links and remove from queue.
            this.logger.debug('Queued file already in store, ignoring...');
            this.addFileLinks(siteId, fileId, links).catch(() => {
                // Ignore errors.
            });
            this.removeFromQueue(siteId, fileId).catch(() => {
                // Ignore errors.
            }).finally(() => {
                this.treatQueueDeferred(siteId, fileId, true);
            });

            return;
        }

        // The file does not exist, or is stale, ... download it.
        const onProgress = this.getQueueOnProgress(siteId, fileId);

        try {
            await this.downloadForPoolByUrl(siteId, fileUrl, options, filePath, onProgress, entry);

            // Success, we add links and remove from queue.
            CoreUtils.ignoreErrors(this.addFileLinks(siteId, fileId, links));

            this.treatQueueDeferred(siteId, fileId, true);
            this.notifyFileDownloaded(siteId, fileId, links);

            // Wait for the item to be removed from queue before resolving the promise.
            // If the item could not be removed from queue we still resolve the promise.
            await CoreUtils.ignoreErrors(this.removeFromQueue(siteId, fileId));
        } catch (errorObject) {
            // Whoops, we have an error...
            let dropFromQueue = false;

            if (errorObject && errorObject.source === fileUrl) {
                // This is most likely a FileTransfer error.
                if (errorObject.code === 1) { // FILE_NOT_FOUND_ERR.
                    // The file was not found, most likely a 404, we remove from queue.
                    dropFromQueue = true;
                } else if (errorObject.code === 2) { // INVALID_URL_ERR.
                    // The URL is invalid, we drop the file from the queue.
                    dropFromQueue = true;
                } else if (errorObject.code === 3) { // CONNECTION_ERR.
                    // If there was an HTTP status, then let's remove from the queue.
                    dropFromQueue = true;
                } else if (errorObject.code === 4) { // ABORTED_ERR.
                    // The transfer was aborted, we will keep the file in queue.
                } else if (errorObject.code === 5) { // NOT_MODIFIED_ERR.
                    // We have the latest version of the file, HTTP 304 status.
                    dropFromQueue = true;
                } else {
                    // Any error, let's remove the file from the queue to avoi locking down the queue.
                    dropFromQueue = true;
                }
            } else {
                dropFromQueue = true;
            }

            let errorMessage: string | undefined;
            // Some Android devices restrict the amount of usable storage using quotas.
            // If this quota would be exceeded by the download, it throws an exception.
            // We catch this exception here, and report a meaningful error message to the user.
            if (errorObject instanceof FileTransferError && errorObject.exception && errorObject.exception.includes('EDQUOT')) {
                errorMessage = 'core.course.insufficientavailablequota';
            }

            if (dropFromQueue) {
                this.logger.debug('Item dropped from queue due to error: ' + fileUrl, errorObject);

                await CoreUtils.ignoreErrors(this.removeFromQueue(siteId, fileId));

                this.treatQueueDeferred(siteId, fileId, false, errorMessage);
                this.notifyFileDownloadError(siteId, fileId, links);
            } else {
                // We considered the file as legit but did not get it, failure.
                this.treatQueueDeferred(siteId, fileId, false, errorMessage);
                this.notifyFileDownloadError(siteId, fileId, links);

                throw errorObject;
            }
        }
    }

    /**
     * Remove a file from the queue.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Resolved on success. Rejected on failure. It is advised to silently ignore failures.
     */
    protected async removeFromQueue(siteId: string, fileId: string): Promise<void> {
        const db = await this.appDB;

        await db.deleteRecords(QUEUE_TABLE_NAME, { siteId, fileId });
    }

    /**
     * Remove a file from the pool.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @return Resolved on success.
     */
    protected async removeFileById(siteId: string, fileId: string): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);
        // Get the path to the file first since it relies on the file object stored in the pool.
        // Don't use getFilePath to prevent performing 2 DB requests.
        let path = this.getFilepoolFolderPath(siteId) + '/' + fileId;
        let fileUrl: string | undefined;

        try {
            const entry = await this.hasFileInPool(siteId, fileId);

            fileUrl = entry.url;
            if (entry.extension) {
                path += '.' + entry.extension;
            }
        } catch (error) {
            // If file not found, use the path without extension.
        }

        const conditions = {
            fileId,
        };

        // Get links to components to notify them after remove.
        const links = await this.getFileLinks(siteId, fileId);
        const promises: Promise<unknown>[] = [];

        // Remove entry from filepool store.
        promises.push(db.deleteRecords(FILES_TABLE_NAME, conditions));

        // Remove links.
        promises.push(db.deleteRecords(LINKS_TABLE_NAME, conditions));

        // Remove the file.
        if (CoreFile.isAvailable()) {
            promises.push(CoreFile.removeFile(path).catch((error) => {
                if (error && error.code == 1) {
                    // Not found, ignore error since maybe it was deleted already.
                } else {
                    throw error;
                }
            }));
        }

        await Promise.all(promises);

        this.notifyFileDeleted(siteId, fileId, links);

        if (fileUrl) {
            await CoreUtils.ignoreErrors(CorePluginFileDelegate.fileDeleted(fileUrl, path, siteId));
        }
    }

    /**
     * Delete all the matching files from a component.
     *
     * @param siteId The site ID.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @return Resolved on success.
     */
    async removeFilesByComponent(siteId: string, component: string, componentId?: string | number): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);
        const items = await this.getComponentFiles(db, component, componentId);

        await Promise.all(items.map((item) => this.removeFileById(siteId, item.fileId)));
    }

    /**
     * Remove a file from the pool.
     *
     * @param siteId The site ID.
     * @param fileUrl The file URL.
     * @return Resolved on success, rejected on failure.
     */
    async removeFileByUrl(siteId: string, fileUrl: string): Promise<void> {
        const file = await this.fixPluginfileURL(siteId, fileUrl);
        const fileId = this.getFileIdByUrl(CoreFileHelper.getFileUrl(file));

        await this.removeFileById(siteId, fileId);
    }

    /**
     * Removes the revision number from a file URL.
     *
     * @param url URL to remove the revision number.
     * @return URL without revision number.
     * @description
     * The revision is used to know if a file has changed. We remove it from the URL to prevent storing a file per revision.
     */
    protected removeRevisionFromUrl(url: string): string {
        const args = this.getPluginFileArgs(url);
        if (!args) {
            // Not a pluginfile, no revision will be found.
            return url;
        }

        return CorePluginFileDelegate.removeRevisionFromUrl(url, args);
    }

    /**
     * Change the package status, setting it to the previous status.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved when the status is changed. Resolve param: new status.
     */
    async setPackagePreviousStatus(siteId: string, component: string, componentId?: string | number): Promise<string> {
        componentId = this.fixComponentId(componentId);
        this.logger.debug(`Set previous status for package ${component} ${componentId}`);

        const site = await CoreSites.getSite(siteId);
        const packageId = this.getPackageId(component, componentId);

        // Get current stored data, we'll only update 'status' and 'updated' fields.
        const entry = <CoreFilepoolPackageEntry> site.getDb().getRecord(PACKAGES_TABLE_NAME, { id: packageId });
        const newData: CoreFilepoolPackageEntry = {};
        if (entry.status == CoreConstants.DOWNLOADING) {
            // Going back from downloading to previous status, restore previous download time.
            newData.downloadTime = entry.previousDownloadTime;
        }
        newData.status = entry.previous || CoreConstants.NOT_DOWNLOADED;
        newData.updated = Date.now();
        this.logger.debug(`Set previous status '${entry.status}' for package ${component} ${componentId}`);

        await site.getDb().updateRecords(PACKAGES_TABLE_NAME, newData, { id: packageId });
        // Success updating, trigger event.
        this.triggerPackageStatusChanged(site.id!, newData.status, component, componentId);

        return newData.status;
    }

    /**
     * Check if a file should be downloaded based on its size.
     *
     * @param size File size.
     * @return Whether file should be downloaded.
     */
    shouldDownload(size: number): boolean {
        return size <= CoreFilepoolProvider.DOWNLOAD_THRESHOLD ||
            (CoreApp.isWifi() && size <= CoreFilepoolProvider.WIFI_DOWNLOAD_THRESHOLD);
    }

    /**
     * Convenience function to check if a file should be downloaded before opening it.
     *
     * @param url File online URL.
     * @param size File size.
     * @return Promise resolved if should download before open, rejected otherwise.
     * @ddeprecated since 3.9.5. Please use shouldDownloadFileBeforeOpen instead.
     */
    async shouldDownloadBeforeOpen(url: string, size: number): Promise<void> {
        if (size >= 0 && size <= CoreFilepoolProvider.DOWNLOAD_THRESHOLD) {
            // The file is small, download it.
            return;
        }

        const mimetype = await CoreUtils.getMimeTypeFromUrl(url);
        // If the file is streaming (audio or video) we reject.
        if (CoreMimetypeUtils.isStreamedMimetype(mimetype)) {
            throw new CoreError('File is audio or video.');
        }
    }

    /**
     * Convenience function to check if a file should be downloaded before opening it.
     *
     * @param url File online URL.
     * @param size File size.
     * @param options Options.
     * @return Promise resolved with boolean: whether file should be downloaded before opening it.
     * @description
     * Convenience function to check if a file should be downloaded before opening it.
     *
     * The default behaviour in the app is to download first and then open the local file in the following cases:
     *     - The file is small (less than DOWNLOAD_THRESHOLD).
     *     - The file cannot be streamed.
     * If the file is big and can be streamed, the promise returned by this function will be rejected.
     */
    async shouldDownloadFileBeforeOpen(url: string, size: number, options: CoreUtilsOpenFileOptions = {}): Promise<boolean> {
        if (size >= 0 && size <= CoreFilepoolProvider.DOWNLOAD_THRESHOLD) {
            // The file is small, download it.
            return true;
        }

        if (CoreUtils.shouldOpenWithDialog(options)) {
            // Open with dialog needs a local file.
            return true;
        }

        const mimetype = await CoreUtils.getMimeTypeFromUrl(url);

        // If the file is streaming (audio or video), return false.
        return !CoreMimetypeUtils.isStreamedMimetype(mimetype);
    }

    /**
     * Store package status.
     *
     * @param siteId Site ID.
     * @param status New package status.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @param extra Extra data to store for the package. If you want to store more than 1 value, use JSON.stringify.
     * @return Promise resolved when status is stored.
     */
    async storePackageStatus(
        siteId: string,
        status: string,
        component: string,
        componentId?: string | number,
        extra?: string,
    ): Promise<void> {
        this.logger.debug(`Set status '${status}' for package ${component} ${componentId}`);
        componentId = this.fixComponentId(componentId);

        const site = await CoreSites.getSite(siteId);
        const packageId = this.getPackageId(component, componentId);
        let downloadTime: number | undefined;
        let previousDownloadTime: number | undefined;

        if (status == CoreConstants.DOWNLOADING) {
            // Set download time if package is now downloading.
            downloadTime = CoreTimeUtils.timestamp();
        }

        let previousStatus: string | undefined;
        // Search current status to set it as previous status.
        try {
            const entry = await site.getDb().getRecord<CoreFilepoolPackageEntry>(PACKAGES_TABLE_NAME, { id: packageId });

            extra = extra ?? entry.extra;
            if (typeof downloadTime == 'undefined') {
                // Keep previous download time.
                downloadTime = entry.downloadTime;
                previousDownloadTime = entry.previousDownloadTime;
            } else {
                // The downloadTime will be updated, store current time as previous.
                previousDownloadTime = entry.downloadTime;
            }

            previousStatus = entry.status;
        } catch (error) {
            // No previous status.
        }

        const packageEntry: CoreFilepoolPackageEntry = {
            id: packageId,
            component,
            componentId,
            status,
            previous: previousStatus,
            updated: Date.now(),
            downloadTime,
            previousDownloadTime,
            extra,
        };

        if (previousStatus === status) {
            // The package already has this status, no need to change it.
            return;
        }

        await site.getDb().insertRecord(PACKAGES_TABLE_NAME, packageEntry);

        // Success inserting, trigger event.
        this.triggerPackageStatusChanged(siteId, status, component, componentId);
    }

    /**
     * Search for files in a CSS code and try to download them. Once downloaded, replace their URLs
     * and store the result in the CSS file.
     *
     * @param siteId Site ID.
     * @param fileUrl CSS file URL.
     * @param cssCode CSS code.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param revision Revision to use in all files. If not defined, it will be calculated using the URL of each file.
     * @return Promise resolved with the CSS code.
     */
    async treatCSSCode(
        siteId: string,
        fileUrl: string,
        cssCode: string,
        component?: string,
        componentId?: string | number,
        revision?: number,
    ): Promise<string> {
        const urls = CoreDomUtils.extractUrlsFromCSS(cssCode);
        let updated = false;

        // Get the path of the CSS file.
        const filePath = await this.getFilePathByUrl(siteId, fileUrl);

        // Download all files in the CSS.
        await Promise.all(urls.map(async (url) => {
            // Download the file only if it's an online URL.
            if (CoreUrlUtils.isLocalFileUrl(url)) {
                return;
            }

            try {
                const fileUrl = await this.downloadUrl(
                    siteId,
                    url,
                    false,
                    component,
                    componentId,
                    0,
                    undefined,
                    undefined,
                    undefined,
                    revision,
                );

                if (fileUrl != url) {
                    cssCode = cssCode.replace(new RegExp(CoreTextUtils.escapeForRegex(url), 'g'), fileUrl);
                    updated = true;
                }
            } catch (error) {
                this.logger.warn('Error treating file ', url, error);
            }
        }));

        // All files downloaded. Store the result if it has changed.
        if (updated) {
            await CoreFile.writeFile(filePath, cssCode);
        }

        return cssCode;
    }

    /**
     * Resolves or rejects a queue deferred and removes it from the list.
     *
     * @param siteId The site ID.
     * @param fileId The file ID.
     * @param resolve True if promise should be resolved, false if it should be rejected.
     * @param error String identifier for error message, if rejected.
     */
    protected treatQueueDeferred(siteId: string, fileId: string, resolve: boolean, error?: string): void {
        if (this.queueDeferreds[siteId] && this.queueDeferreds[siteId][fileId]) {
            if (resolve) {
                this.queueDeferreds[siteId][fileId].resolve();
            } else {
                this.queueDeferreds[siteId][fileId].reject(error);
            }
            delete this.queueDeferreds[siteId][fileId];
        }
    }

    /**
     * Trigger mmCoreEventPackageStatusChanged with the right data.
     *
     * @param siteId Site ID.
     * @param status New package status.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     */
    protected triggerPackageStatusChanged(siteId: string, status: string, component: string, componentId?: string | number): void {
        const data: CoreEventPackageStatusChanged = {
            component,
            componentId: this.fixComponentId(componentId),
            status,
        };

        CoreEvents.trigger(CoreEvents.PACKAGE_STATUS_CHANGED, data, siteId);
    }

    /**
     * Update the download time of a package. This doesn't modify the previous download time.
     * This function should be used if a package generates some new data during a download. Calling this function
     * right after generating the data in the download will prevent detecting this data as an update.
     *
     * @param siteId Site ID.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @return Promise resolved when status is stored.
     */
    async updatePackageDownloadTime(siteId: string, component: string, componentId?: string | number): Promise<void> {
        componentId = this.fixComponentId(componentId);

        const site = await CoreSites.getSite(siteId);
        const packageId = this.getPackageId(component, componentId);

        await site.getDb().updateRecords(
            PACKAGES_TABLE_NAME,
            { downloadTime: CoreTimeUtils.timestamp() },
            { id: packageId },
        );
    }

}

export const CoreFilepool = makeSingleton(CoreFilepoolProvider);

/**
 * File actions.
 */
export const enum CoreFilepoolFileActions {
    DOWNLOAD = 'download',
    DOWNLOADING = 'downloading',
    DELETED = 'deleted',
    OUTDATED = 'outdated',
}

/**
 * Data sent to file events.
 */
export type CoreFilepoolFileEventData = {
    /**
     * The file ID.
     */
    fileId: string;

    /**
     * The file ID.
     */
    action: CoreFilepoolFileActions;

    /**
     * Whether the action was a success. Only for DOWNLOAD action.
     */
    success?: boolean;
};

/**
 * Data sent to component file events.
 */
export type CoreFilepoolComponentFileEventData = CoreFilepoolFileEventData & {
    /**
     * The component.
     */
    component: string;

    /**
     * The component ID.
     */
    componentId?: string | number;
};

/**
 * Function called when file download progress ocurred.
 */
export type CoreFilepoolOnProgressCallback<T = unknown> = (event: T) => void;

/**
 * Deferred promise for file pool. It's similar to the result of $q.defer() in AngularJS.
 */
type CoreFilepoolPromiseDefer = PromiseDefer<void> & {
    onProgress?: CoreFilepoolOnProgressCallback; // On Progress function.
};

type AnchorOrMediaElement =
    HTMLAnchorElement | HTMLImageElement | HTMLAudioElement | HTMLVideoElement | HTMLSourceElement | HTMLTrackElement;
