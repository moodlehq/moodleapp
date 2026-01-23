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

import { FileEntry, DirectoryEntry, Entry, Metadata, IFile } from '@awesome-cordova-plugins/file/ngx';

import { CoreMimetype } from '@singletons/mimetype';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreBytesConstants, CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';

import { CoreLogger } from '@singletons/logger';
import { makeSingleton, File, WebView } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import { CoreText } from '@singletons/text';
import { CorePlatform } from '@services/platform';
import { CorePath } from '@singletons/path';
import { Zip } from '@features/native/plugins';
import { CoreUrl } from '@singletons/url';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Progress event used when writing a file data into a file.
 */
export type CoreFileProgressEvent = {
    /**
     * Whether the values are reliabñe.
     */
    lengthComputable?: boolean;

    /**
     * Number of treated bytes.
     */
    loaded?: number;

    /**
     * Total of bytes.
     */
    total?: number;
};

/**
 * Progress function.
 */
export type CoreFileProgressFunction = (event: CoreFileProgressEvent) => void;

/**
 * Constants to define the format to read a file.
 */
export const enum CoreFileFormat {
    FORMATTEXT = 0,
    FORMATDATAURL = 1,
    /**
     * @deprecated since 5.1. This is related to Javascript API deprecation and it's not safe
     * to use it. When readAsBinaryString is finally removed this format could be deleted from the app.
     * For more information, read
     * https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsBinaryString
     */
    FORMATBINARYSTRING = 2,
    FORMATARRAYBUFFER = 3,
    FORMATJSON = 4,
}

/**
 * Factory to interact with the file system.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileProvider {

    // Folders.
    static readonly SITESFOLDER = 'sites';
    static readonly TMPFOLDER = 'tmp';
    static readonly NO_SITE_FOLDER = 'nosite';

    static readonly CHUNK_SIZE = CoreBytesConstants.MEGABYTE; // Same chunk size as Ionic Native.

    protected static readonly IOS_FREE_SPACE_THRESHOLD = 500 * CoreBytesConstants.MEGABYTE;

    static readonly MINIMUM_FREE_SPACE = 10 * CoreBytesConstants.MEGABYTE;
    static readonly WIFI_DOWNLOAD_DEFAULT_CONFIRMATION_THRESHOLD = 100 * CoreBytesConstants.MEGABYTE;
    static readonly DOWNLOAD_DEFAULT_CONFIRMATION_THRESHOLD = 10 * CoreBytesConstants.MEGABYTE;

    protected logger = CoreLogger.getInstance('CoreFileProvider');
    protected initialized = false;
    protected basePath = '';
    protected isHTMLAPI = false;

    /**
     * Sets basePath to use with HTML API. Reserved for core use.
     *
     * @param path Base path to use.
     */
    setHTMLBasePath(path: string): void {
        this.isHTMLAPI = true;
        this.basePath = path;
    }

    /**
     * Checks if we're using HTML API.
     *
     * @returns True if uses HTML API, false otherwise.
     */
    usesHTMLAPI(): boolean {
        return this.isHTMLAPI;
    }

    /**
     * Initialize basePath based on the OS if it's not initialized already.
     *
     * @returns Promise to be resolved when the initialization is finished.
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await CorePlatform.ready();

        if (CorePlatform.isAndroid()) {
            this.basePath = File.externalApplicationStorageDirectory || this.basePath;
        } else if (CorePlatform.isIOS()) {
            this.basePath = File.documentsDirectory || this.basePath;
        } else if (this.basePath === '') {
            this.logger.error('Error getting device OS.');

            return Promise.reject(new CoreError('Error getting device OS to initialize file system.'));
        }

        this.initialized = true;
        this.logger.debug(`FS initialized: ${this.basePath}`);
    }

    /**
     * Check if the plugin is available.
     *
     * @returns Whether the plugin is available.
     * @deprecated since 5.0. Not necessary anymore.
     */
    isAvailable(): boolean {
        return window.resolveLocalFileSystemURL !== undefined;
    }

    /**
     * Get a file.
     *
     * @param path Relative path to the file.
     * @returns Promise resolved when the file is retrieved.
     */
    async getFile(path: string): Promise<FileEntry> {
        await this.init();
        this.logger.debug(`Get file: ${path}`);

        try {
            return <FileEntry> await File.resolveLocalFilesystemUrl(this.addBasePathIfNeeded(path));
        } catch (error) {
            if (error && (error.code === FileError.NOT_FOUND_ERR || error.code === FileError.ENCODING_ERR)) {
                // Cannot read some files if the path contains the % character and it's not an encoded char. Try encoding it.
                const encodedPath = encodeURI(path);
                if (encodedPath !== path) {
                    return <FileEntry> await File.resolveLocalFilesystemUrl(this.addBasePathIfNeeded(encodedPath));
                }
            }

            throw error;
        }
    }

    /**
     * Get a directory.
     *
     * @param path Relative path to the directory.
     * @returns Promise resolved when the directory is retrieved.
     */
    async getDir(path: string): Promise<DirectoryEntry> {
        await this.init();

        this.logger.debug(`Get directory: ${path}`);

        try {
            return await File.resolveDirectoryUrl(this.addBasePathIfNeeded(path));
        } catch (error) {
            if (error && (error.code === FileError.NOT_FOUND_ERR || error.code === FileError.ENCODING_ERR)) {
                // Cannot read some files if the path contains the % character and it's not an encoded char. Try encoding it.
                const encodedPath = encodeURI(path);
                if (encodedPath !== path) {
                    return await File.resolveDirectoryUrl(this.addBasePathIfNeeded(encodedPath));
                }
            }

            throw error;
        }
    }

    /**
     * Get site folder path.
     *
     * @param siteId Site ID.
     * @returns Site folder path.
     */
    getSiteFolder(siteId: string): string {
        return `${CoreFileProvider.SITESFOLDER}/${siteId}`;
    }

    /**
     * Create a directory or a file.
     *
     * @param isDirectory True if a directory should be created, false if it should create a file.
     * @param path Relative path to the dir/file.
     * @param failIfExists True if it should fail if the dir/file exists, false otherwise.
     * @param base Base path to create the dir/file in. If not set, use basePath.
     * @returns Promise to be resolved when the dir/file is created.
     */
    protected async create(
        isDirectory: boolean,
        path: string,
        failIfExists?: boolean,
        base?: string,
    ): Promise<FileEntry | DirectoryEntry> {
        await this.init();

        path = this.removeBasePath(path);
        base = base || this.basePath;

        if (path.indexOf('/') == -1) {
            if (isDirectory) {
                this.logger.debug(`Create dir ${path} in ${base}`);

                return File.createDir(base, path, !failIfExists);
            } else {
                this.logger.debug(`Create file ${path} in ${base}`);

                return File.createFile(base, path, !failIfExists);
            }
        } else {
            // The file plugin doesn't allow creating more than 1 level at a time (e.g. tmp/folder).
            // We need to create them 1 by 1.
            const firstDir = path.substring(0, path.indexOf('/'));
            const restOfPath = path.substring(path.indexOf('/') + 1);

            this.logger.debug(`Create dir ${firstDir} in ${base}`);

            const newDirEntry = await File.createDir(base, firstDir, true);

            return this.create(isDirectory, restOfPath, failIfExists, this.getFileEntryURL(newDirEntry));
        }
    }

    /**
     * Create a directory.
     *
     * @param path Relative path to the directory.
     * @param failIfExists True if it should fail if the directory exists, false otherwise.
     * @returns Promise to be resolved when the directory is created.
     */
    async createDir(path: string, failIfExists?: boolean): Promise<DirectoryEntry> {
        const entry = <DirectoryEntry> await this.create(true, path, failIfExists);

        return entry;
    }

    /**
     * Create a file.
     *
     * @param path Relative path to the file.
     * @param failIfExists True if it should fail if the file exists, false otherwise..
     * @returns Promise to be resolved when the file is created.
     */
    async createFile(path: string, failIfExists?: boolean): Promise<FileEntry> {
        const entry = <FileEntry> await this.create(false, path, failIfExists);

        return entry;
    }

    /**
     * Removes a directory and all its contents.
     *
     * @param path Relative path to the directory.
     * @returns Promise to be resolved when the directory is deleted.
     */
    async removeDir(path: string): Promise<void> {
        await this.init();

        path = this.removeBasePath(path);
        this.logger.debug(`Remove directory: ${path}`);

        await File.removeRecursively(this.basePath, path);
    }

    /**
     * Removes a file and all its contents.
     *
     * @param path Relative path to the file.
     * @returns Promise to be resolved when the file is deleted.
     */
    async removeFile(path: string): Promise<void> {
        await this.init();

        path = this.removeBasePath(path);
        this.logger.debug(`Remove file: ${path}`);

        try {
            await File.removeFile(this.basePath, path);
        } catch (error) {
            // The delete can fail if the path has encoded characters. Try again if that's the case.
            const decodedPath = decodeURI(path);

            if (decodedPath != path) {
                await File.removeFile(this.basePath, decodedPath);
            } else {
                throw error;
            }
        }
    }

    /**
     * Removes a file given its FileEntry.
     *
     * @param entry File Entry.
     * @returns Promise resolved when the file is deleted.
     */
    removeFileByFileEntry(entry: Entry): Promise<void> {
        return new Promise((resolve, reject) => entry.remove(resolve, reject));
    }

    /**
     * Retrieve the contents of a directory (not subdirectories).
     *
     * @param path Relative path to the directory.
     * @returns Promise to be resolved when the contents are retrieved.
     */
    async getDirectoryContents(path: string): Promise<(FileEntry | DirectoryEntry)[]> {
        await this.init();

        path = this.removeBasePath(path);
        this.logger.debug(`Get contents of dir: ${path}`);

        const result = await File.listDir(this.basePath, path);

        return <(FileEntry | DirectoryEntry)[]> result;
    }

    /**
     * Type guard to check if the param is a DirectoryEntry.
     *
     * @param entry Param to check.
     * @returns Whether the param is a DirectoryEntry.
     */
    protected isDirectoryEntry(entry: FileEntry | DirectoryEntry): entry is DirectoryEntry {
        return entry.isDirectory === true;
    }

    /**
     * Calculate the size of a directory or a file.
     *
     * @param entry Directory or file.
     * @returns Promise to be resolved when the size is calculated.
     */
    protected getSize(entry: DirectoryEntry | FileEntry): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            if (this.isDirectoryEntry(entry)) {
                const directoryReader = entry.createReader();

                directoryReader.readEntries(async (entries: (DirectoryEntry | FileEntry)[]) => {
                    const promises: Promise<number>[] = [];
                    for (let i = 0; i < entries.length; i++) {
                        promises.push(this.getSize(entries[i]));
                    }

                    try {
                        const sizes = await Promise.all(promises);

                        let directorySize = 0;
                        for (let i = 0; i < sizes.length; i++) {
                            const fileSize = Number(sizes[i]);
                            if (isNaN(fileSize)) {
                                reject();

                                return;
                            }
                            directorySize += fileSize;
                        }
                        resolve(directorySize);
                    } catch (error) {
                        reject(error);
                    }
                }, reject);
            } else {
                entry.file((file) => {
                    resolve(file.size);
                }, reject);
            }
        });
    }

    /**
     * Calculate the size of a directory.
     *
     * @param path Relative path to the directory.
     * @returns Promise to be resolved when the size is calculated.
     */
    async getDirectorySize(path: string): Promise<number> {
        path = this.removeBasePath(path);

        this.logger.debug(`Get size of dir: ${path}`);

        const dirEntry = await this.getDir(path);

        return this.getSize(dirEntry);
    }

    /**
     * Calculate the size of a file.
     *
     * @param path Relative path to the file.
     * @returns Promise to be resolved when the size is calculated.
     */
    async getFileSize(path: string): Promise<number> {
        path = this.removeBasePath(path);

        this.logger.debug(`Get size of file: ${path}`);

        const fileEntry = await this.getFile(path);

        return this.getSize(fileEntry);
    }

    /**
     * Get file object from a FileEntry.
     *
     * @param entry Relative path to the file.
     * @returns Promise to be resolved when the file is retrieved.
     */
    getFileObjectFromFileEntry(entry: FileEntry): Promise<IFile> {
        return new Promise((resolve, reject): void => {
            this.logger.debug(`Get file object of: ${entry.fullPath}`);
            entry.file(resolve, reject);
        });
    }

    /**
     * Calculate the free space in the disk.
     * Please notice that this function isn't reliable and it's not documented in the Cordova File plugin.
     *
     * @returns Promise resolved with the estimated free space in bytes.
     */
    async calculateFreeSpace(): Promise<number> {
        const size = await File.getFreeDiskSpace();

        if (CorePlatform.isIOS()) {
            // In iOS the size is in bytes.
            return Number(size);
        }

        return Number(size) * CoreBytesConstants.KILOBYTE;
    }

    /**
     * Calculates and returns the available free space in bytes, with platform-specific logic.
     *
     * On Android, always returns the calculated available bytes.
     * On iOS, returns the available bytes only if the free space is below a certain threshold
     * (`IOS_FREE_SPACE_THRESHOLD`) or if the requested size is more than half of the available space.
     * Otherwise, returns `null` to indicate that the calculation may not be accurate.
     *
     * @param size - The size in bytes that is intended to be used or downloaded.
     * @returns A promise that resolves to the number of available bytes, or `null` if the value is not reliable.
     */
    async getPlatformAvailableBytes(size: number): Promise<number | null> {
        const availableBytes = await CoreFile.calculateFreeSpace();

        if (CorePlatform.isAndroid()) {
            return availableBytes;
        }

        // Space calculation is not accurate on iOS, but it gets more accurate when space is lower.
        // We'll only use it when space is <500MB, or we're downloading more than twice the reported space.
        if (availableBytes < CoreFileProvider.IOS_FREE_SPACE_THRESHOLD || size > availableBytes / 2) {
            return availableBytes;
        } else {
            return null;
        }
    }

    /**
     * Normalize a filename that usually comes URL encoded.
     *
     * @param filename The file name.
     * @returns The file name normalized.
     *
     * @deprecated since 5.0. Not used anymore.
     */
    normalizeFileName(filename: string): string {
        return CoreUrl.decodeURIComponent(filename);
    }

    /**
     * Read a file from local file system.
     *
     * @param path Relative path to the file.
     * @param format Format to read the file.
     * @param folder Absolute path to the folder where the file is. Use it to read files outside of the app's data folder.
     * @returns Promise to be resolved when the file is read.
     */
    readFile(
        path: string,
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        format?: CoreFileFormat.FORMATTEXT | CoreFileFormat.FORMATDATAURL | CoreFileFormat.FORMATBINARYSTRING,
        folder?: string,
    ): Promise<string>;
    readFile(path: string, format: CoreFileFormat.FORMATARRAYBUFFER, folder?: string): Promise<ArrayBuffer>;
    readFile<T = unknown>(path: string, format: CoreFileFormat.FORMATJSON, folder?: string): Promise<T>;
    readFile(
        path: string,
        format: CoreFileFormat = CoreFileFormat.FORMATTEXT,
        folder?: string,
    ): Promise<string | ArrayBuffer | unknown> {
        if (!folder) {
            folder = this.basePath;

            path = this.removeBasePath(path);
        }

        this.logger.debug(`Read file ${path} with format ${format} in folder ${folder}`);

        switch (format) {
            case CoreFileFormat.FORMATDATAURL:
                return File.readAsDataURL(folder, path);
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            case CoreFileFormat.FORMATBINARYSTRING:
                // This internally uses deprecated FileReader.readAsBinaryString for webapp.
                return File.readAsBinaryString(folder, path);
            case CoreFileFormat.FORMATARRAYBUFFER:
                return File.readAsArrayBuffer(folder, path);
            case CoreFileFormat.FORMATJSON:
                return File.readAsText(folder, path).then((text) => {
                    const parsed = CoreText.parseJSON(text, null);

                    if (parsed === null && text !== null) {
                        throw new CoreError(`Error parsing JSON file: ${path}`);
                    }

                    return parsed;
                });
            default:
                return File.readAsText(folder, path);
        }
    }

    /**
     * Read file contents from a file data object.
     *
     * @param fileData File's data.
     * @param format Format to read the file.
     * @returns Promise to be resolved when the file is read.
     */
    readFileData(fileData: IFile, format: CoreFileFormat = CoreFileFormat.FORMATTEXT): Promise<string | ArrayBuffer | unknown> {
        this.logger.debug(`Read file from file data with format ${format}`);

        return new Promise((resolve, reject): void => {
            const reader = new FileReader();

            reader.onloadend = (event): void => {
                if (event.target?.result !== undefined && event.target.result !== null) {
                    if (format === CoreFileFormat.FORMATJSON) {
                        // Convert to object.
                        const parsed = CoreText.parseJSON(<string> event.target.result, null);

                        if (parsed === null) {
                            reject('Error parsing JSON file.');
                        }

                        resolve(parsed);
                    } else {
                        resolve(event.target.result);
                    }
                } else if (event.target?.error !== undefined && event.target.error !== null) {
                    reject(event.target.error);
                } else {
                    reject({ code: null, message: 'READER_ONLOADEND_ERR' });
                }
            };

            // Check if the load starts. If it doesn't start in 3 seconds, reject.
            // Sometimes in Android the read doesn't start for some reason, so the promise never finishes.
            let hasStarted = false;
            reader.onloadstart = () => {
                hasStarted = true;
            };
            setTimeout(() => {
                if (!hasStarted) {
                    reject('Upload cannot start.');
                }
            }, 3000);

            switch (format) {
                case CoreFileFormat.FORMATDATAURL:
                    reader.readAsDataURL(fileData);
                    break;
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                case CoreFileFormat.FORMATBINARYSTRING:
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    reader.readAsBinaryString(fileData);
                    break;
                case CoreFileFormat.FORMATARRAYBUFFER:
                    reader.readAsArrayBuffer(fileData);
                    break;
                default:
                    reader.readAsText(fileData);
            }
        });
    }

    /**
     * Writes some data in a file.
     *
     * @param path Relative path to the file.
     * @param data Data to write.
     * @param append Whether to append the data to the end of the file.
     * @returns Promise to be resolved when the file is written.
     */
    async writeFile(path: string, data: string | Blob, append?: boolean): Promise<FileEntry> {
        await this.init();

        path = this.removeBasePath(path);
        this.logger.debug(`Write file: ${path}`);

        // Create file (and parent folders) to prevent errors.
        const fileEntry = await this.createFile(path);

        if (this.isHTMLAPI && (typeof data === 'string' || data.toString() === '[object ArrayBuffer]')) {
            // We need to write Blobs.
            const extension = CoreMimetype.getFileExtension(path);
            const type = extension ? CoreMimetype.getMimeType(extension) : '';
            data = new Blob([data], { type: type || 'text/plain' });
        }

        await File.writeFile(this.basePath, path, data, { replace: !append, append: !!append });

        return fileEntry;
    }

    /**
     * Write some file data into a filesystem file.
     * It's done in chunks to prevent crashing the app for big files.
     * Please notice Ionic Native writeFile function already splits by chunks, but it doesn't have an onProgress function.
     *
     * @param file The data to write.
     * @param path Path where to store the data.
     * @param onProgress Function to call on progress.
     * @param offset Offset where to start reading from.
     * @param append Whether to append the data to the end of the file.
     * @returns Promise resolved when done.
     */
    async writeFileDataInFile(
        file: Blob,
        path: string,
        onProgress?: CoreFileProgressFunction,
        offset = 0,
        append?: boolean,
    ): Promise<FileEntry> {
        offset = offset || 0;

        try {
            // Get the chunk to write.
            const chunk = file.slice(offset, Math.min(offset + CoreFileProvider.CHUNK_SIZE, file.size));

            const fileEntry = await this.writeFile(path, chunk, append);

            offset += CoreFileProvider.CHUNK_SIZE;

            onProgress && onProgress({
                lengthComputable: true,
                loaded: offset,
                total: file.size,
            });

            if (offset >= file.size) {
                // Done, stop.
                return fileEntry;
            }

            // Read the next chunk.
            return this.writeFileDataInFile(file, path, onProgress, offset, true);
        } catch (error) {
            if (error && error.target && error.target.error) {
                // Error returned by the writer, throw the "real" error.
                throw error.target.error;
            }

            throw error;
        }
    }

    /**
     * Gets a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @returns Promise to be resolved when the file is retrieved.
     */
    async getExternalFile(fullPath: string): Promise<FileEntry> {
        const entry = await File.resolveLocalFilesystemUrl(fullPath);

        return <FileEntry>entry;
    }

    /**
     * Calculate the size of a file.
     *
     * @param path Absolute path to the file.
     * @returns Promise to be resolved when the size is calculated.
     */
    async getExternalFileSize(path: string): Promise<number> {
        const fileEntry = await this.getExternalFile(path);

        return this.getSize(fileEntry);
    }

    /**
     * Removes a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @returns Promise to be resolved when the file is removed.
     */
    async removeExternalFile(fullPath: string): Promise<void> {
        const directory = fullPath.substring(0, fullPath.lastIndexOf('/'));
        const filename = fullPath.substring(fullPath.lastIndexOf('/') + 1);

        await File.removeFile(directory, filename);
    }

    /**
     * Get the base path where the application files are stored.
     *
     * @returns Promise to be resolved when the base path is retrieved.
     */
    async getBasePath(): Promise<string> {
        await this.init();

        if (this.basePath.slice(-1) === '/') {
            return this.basePath;
        } else {
            return `${this.basePath}/`;
        }
    }

    /**
     * Get the base path where the application files are stored in the format to be used for downloads.
     * iOS: Internal URL (cdvfile://).
     * Others: basePath (file://)
     *
     * @returns Promise to be resolved when the base path is retrieved.
     */
    async getBasePathToDownload(): Promise<string> {
        await this.init();

        if (CorePlatform.isIOS()) {
            // In iOS we want the internal URL (cdvfile://localhost/persistent/...).
            const dirEntry = await File.resolveDirectoryUrl(this.basePath);

            return dirEntry.toInternalURL();
        } else {
            // In the other platforms we use the basePath as it is (file://...).
            return this.basePath;
        }
    }

    /**
     * Get the base path where the application files are stored. Returns the value instantly, without waiting for it to be ready.
     *
     * @returns Base path. If the service hasn't been initialized it will return an invalid value.
     */
    getBasePathInstant(): string {
        if (!this.basePath) {
            return this.basePath;
        } else if (this.basePath.slice(-1) == '/') {
            return this.basePath;
        } else {
            return `${this.basePath}/`;
        }
    }

    /**
     * Move a dir.
     *
     * @param originalPath Path to the dir to move.
     * @param newPath New path of the dir.
     * @param destDirExists Set it to true if you know the directory where to put the dir exists. If false, the function will
     *                      try to create it (slower).
     * @returns Promise resolved when the entry is moved.
     */
    async moveDir(originalPath: string, newPath: string, destDirExists?: boolean): Promise<DirectoryEntry> {
        const entry = await this.copyOrMoveFileOrDir(originalPath, newPath, true, false, destDirExists);

        return <DirectoryEntry> entry;
    }

    /**
     * Move a file.
     *
     * @param originalPath Path to the file to move.
     * @param newPath New path of the file.
     * @param destDirExists Set it to true if you know the directory where to put the file exists. If false, the function will
     *                      try to create it (slower).
     * @returns Promise resolved when the entry is moved.
     */
    async moveFile(originalPath: string, newPath: string, destDirExists?: boolean): Promise<FileEntry> {
        const entry = await this.copyOrMoveFileOrDir(originalPath, newPath, false, false, destDirExists);

        return <FileEntry> entry;
    }

    /**
     * Copy a directory.
     *
     * @param from Path to the directory to move.
     * @param to New path of the directory.
     * @param destDirExists Set it to true if you know the directory where to put the dir exists. If false, the function will
     *                      try to create it (slower).
     * @returns Promise resolved when the entry is copied.
     */
    async copyDir(from: string, to: string, destDirExists?: boolean): Promise<DirectoryEntry> {
        const entry = await this.copyOrMoveFileOrDir(from, to, true, true, destDirExists);

        return <DirectoryEntry> entry;
    }

    /**
     * Copy a file.
     *
     * @param from Path to the file to move.
     * @param to New path of the file.
     * @param destDirExists Set it to true if you know the directory where to put the file exists. If false, the function will
     *                      try to create it (slower).
     * @returns Promise resolved when the entry is copied.
     */
    async copyFile(from: string, to: string, destDirExists?: boolean): Promise<FileEntry> {
        const entry = await this.copyOrMoveFileOrDir(from, to, false, true, destDirExists);

        return <FileEntry> entry;
    }

    /**
     * Copy or move a file or a directory.
     *
     * @param from Path to the file/dir to move.
     * @param to New path of the file/dir.
     * @param isDir Whether it's a dir or a file.
     * @param copy Whether to copy. If false, it will move the file.
     * @param destDirExists Set it to true if you know the directory where to put the file/dir exists. If false, the function will
     *                      try to create it (slower).
     * @returns Promise resolved when the entry is copied.
     */
    protected async copyOrMoveFileOrDir(
        from: string,
        to: string,
        isDir?: boolean,
        copy?: boolean,
        destDirExists?: boolean,
    ): Promise<FileEntry | DirectoryEntry> {
        const fileIsInAppFolder = this.isPathInAppFolder(from);

        if (!fileIsInAppFolder) {
            return this.copyOrMoveExternalFile(from, to, copy);
        }

        const moveCopyFn: MoveCopyFunction = (...args) => copy ?
            (isDir ? File.copyDir(...args) : File.copyFile(...args)) :
            (isDir ? File.moveDir(...args) : File.moveFile(...args));

        await this.init();

        from = this.removeBasePath(from);
        to = this.removeBasePath(to);

        const toFileAndDir = CoreFileUtils.getFileAndDirectoryFromPath(to);

        if (toFileAndDir.directory && !destDirExists) {
            // Create the target directory if it doesn't exist.
            await this.createDir(toFileAndDir.directory);
        }

        try {
            const entry = await moveCopyFn(this.basePath, from, this.basePath, to);

            return <FileEntry | DirectoryEntry> entry;
        } catch (error) {
            try {
                // The copy/move can fail if the final path contains the % character and it's not an encoded char. Try encoding it.
                const encodedTo = encodeURI(to);
                if (to !== encodedTo) {
                    const entry = await moveCopyFn(this.basePath, from, this.basePath, encodedTo);

                    return <FileEntry | DirectoryEntry> entry;
                }
            } catch {
                // Still failing, continue with next fallback.
            }

            // The copy/move can fail if the path has encoded characters. Try again if that's the case.
            const decodedFrom = decodeURI(from);
            const decodedTo = decodeURI(to);

            if (from != decodedFrom || to != decodedTo) {
                const entry = await moveCopyFn(this.basePath, decodedFrom, this.basePath, decodedTo);

                return <FileEntry | DirectoryEntry> entry;
            } else {
                return Promise.reject(error);
            }
        }
    }

    /**
     * Extract the file name and directory from a given path.
     *
     * @param path Path to be extracted.
     * @returns Plain object containing the file name and directory.
     * @deprecated since 5.0. Use CoreFileUtils.getFileAndDirectoryFromPath instead.
     */
    getFileAndDirectoryFromPath(path: string): {directory: string; name: string} {
        return CoreFileUtils.getFileAndDirectoryFromPath(path);
    }

    /**
     * Get the internal URL of a file.
     * Please notice that with WKWebView these URLs no longer work in mobile. Use fileEntry.toURL() along with convertFileSrc.
     *
     * @param fileEntry File Entry.
     * @returns Internal URL.
     */
    getInternalURL(fileEntry: FileEntry): string {
        if (!fileEntry.toInternalURL) {
            // File doesn't implement toInternalURL, use toURL.
            return this.getFileEntryURL(fileEntry);
        }

        return fileEntry.toInternalURL();
    }

    /**
     * Get the URL (absolute path) of a file.
     * Use this function instead of doing fileEntry.toURL because the latter causes problems with WebView and other plugins.
     *
     * @param fileEntry File Entry.
     * @returns URL.
     */
    getFileEntryURL(fileEntry: Entry): string {
        if (CorePlatform.isAndroid()) {
            // Cordova plugin file v7 changed the format returned by toURL, the new format it's not compatible with
            // Ionic WebView or FileTransfer plugin.
            return fileEntry.nativeURL;
        }

        return fileEntry.toURL();
    }

    /**
     * Adds the basePath to a path if it doesn't have it already.
     *
     * @param path Path to treat.
     * @returns Path with basePath added.
     */
    addBasePathIfNeeded(path: string): string {
        if (path.indexOf(this.basePath) > -1) {
            return path;
        } else {
            return CorePath.concatenatePaths(this.basePath, path);
        }
    }

    /**
     * Remove the base path from a path.
     *
     * @param path Path to treat.
     * @returns Path without basePath.
     */
    removeBasePath(path: string): string {
        return CoreText.removeStartingSlash(path.replace(this.basePath, ''));
    }

    /**
     * Unzips a file.
     *
     * @param path Path to the ZIP file.
     * @param destFolder Path to the destination folder. If not defined, a new folder will be created with the
     *                   same location and name as the ZIP file (without extension).
     * @param onProgress Function to call on progress.
     * @param recreateDir Delete the dest directory before unzipping. Defaults to true.
     * @returns Promise resolved when the file is unzipped.
     */
    async unzipFile(
        path: string,
        destFolder?: string,
        onProgress?: (progress: ProgressEvent) => void,
        recreateDir = true,
    ): Promise<void> {
        // Get the source file.
        const fileEntry = await this.getFile(path);

        if (destFolder && recreateDir) {
            // Make sure the dest dir doesn't exist already.
            await CorePromiseUtils.ignoreErrors(this.removeDir(destFolder));

            // Now create the dir, otherwise if any of the ancestor dirs doesn't exist the unzip would fail.
            await this.createDir(destFolder);
        }

        // If destFolder is not set, use same location as ZIP file. We need to use absolute paths (including basePath).
        destFolder = this.addBasePathIfNeeded(destFolder || CoreMimetype.removeExtension(path));

        const result = await Zip.unzip(this.getFileEntryURL(fileEntry), destFolder, onProgress);

        if (result == -1) {
            throw new CoreError('Unzip failed.');
        }
    }

    /**
     * Search a string or regexp in a file contents and replace it. The result is saved in the same file.
     *
     * @param path Path to the file.
     * @param search Value to search.
     * @param newValue New value.
     * @returns Promise resolved in success.
     */
    async replaceInFile(path: string, search: string | RegExp, newValue: string): Promise<void> {
        let content = <string> await this.readFile(path);

        if (content === undefined || content === null || !content.replace) {
            throw new CoreError(`Error reading file ${path}`);
        }

        if (content.match(search)) {
            content = content.replace(search, newValue);

            await this.writeFile(path, content);
        }
    }

    /**
     * Get a file/dir metadata given the file's entry.
     *
     * @param fileEntry FileEntry retrieved from getFile or similar.
     * @returns Promise resolved with metadata.
     */
    getMetadata(fileEntry: Entry): Promise<Metadata> {
        if (!fileEntry || !fileEntry.getMetadata) {
            return Promise.reject(new CoreError('Cannot get metadata from file entry.'));
        }

        return new Promise((resolve, reject): void => {
            fileEntry.getMetadata(resolve, reject);
        });
    }

    /**
     * Get a file/dir metadata given the path.
     *
     * @param path Path to the file/dir.
     * @param isDir True if directory, false if file.
     * @returns Promise resolved with metadata.
     */
    async getMetadataFromPath(path: string, isDir?: boolean): Promise<Metadata> {
        const entry = isDir ? await this.getDir(path) : await this.getFile(path);

        return this.getMetadata(entry);
    }

    /**
     * Convenience function to copy or move an external file.
     *
     * @param from Absolute path to the file to copy/move.
     * @param to Relative new path of the file (inside the app folder).
     * @param copy True to copy, false to move.
     * @returns Promise resolved when the entry is copied/moved.
     */
    protected async copyOrMoveExternalFile(from: string, to: string, copy?: boolean): Promise<FileEntry> {
        // Get the file to copy/move.
        const fileEntry = await this.getExternalFile(from);

        // Create the destination dir if it doesn't exist.
        const dirAndFile = CoreFileUtils.getFileAndDirectoryFromPath(to);

        const dirEntry = await this.createDir(dirAndFile.directory);

        // Now copy/move the file.
        return new Promise((resolve, reject): void => {
            if (copy) {
                fileEntry.copyTo(dirEntry, dirAndFile.name, (entry: FileEntry) => resolve(entry), reject);
            } else {
                fileEntry.moveTo(dirEntry, dirAndFile.name, (entry: FileEntry) => resolve(entry), reject);
            }
        });
    }

    /**
     * Copy a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to copy.
     * @param to Relative new path of the file (inside the app folder).
     * @returns Promise resolved when the entry is copied.
     */
    copyExternalFile(from: string, to: string): Promise<FileEntry> {
        return this.copyOrMoveExternalFile(from, to, true);
    }

    /**
     * Move a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to move.
     * @param to Relative new path of the file (inside the app folder).
     * @returns Promise resolved when the entry is moved.
     */
    moveExternalFile(from: string, to: string): Promise<FileEntry> {
        return this.copyOrMoveExternalFile(from, to, false);
    }

    /**
     * Get a unique file name inside a folder, adding numbers to the file name if needed.
     *
     * @param dirPath Path to the destination folder.
     * @param fileName File name that wants to be used.
     * @param defaultExt Default extension to use if no extension found in the file.
     * @returns Promise resolved with the unique file name.
     */
    async getUniqueNameInFolder(dirPath: string, fileName: string, defaultExt?: string): Promise<string> {
        // Get existing files in the folder.
        try {
            const entries = await this.getDirectoryContents(dirPath);

            const files = {};
            let fileNameWithoutExtension = CoreMimetype.removeExtension(fileName);
            let extension = CoreMimetype.getFileExtension(fileName) || defaultExt;

            // Clean the file name.
            fileNameWithoutExtension = CoreText.removeSpecialCharactersForFiles(
                CoreUrl.decodeURIComponent(fileNameWithoutExtension),
            );

            // Index the files by name.
            entries.forEach((entry) => {
                files[entry.name.toLowerCase()] = entry;
            });

            // Format extension.
            if (extension) {
                extension = `.${extension}`;
            } else {
                extension = '';
            }

            return this.calculateUniqueName(files, fileNameWithoutExtension + extension);
        } catch {
            // Folder doesn't exist, name is unique. Clean it and return it.
            return CoreText.removeSpecialCharactersForFiles(CoreUrl.decodeURIComponent(fileName));
        }
    }

    /**
     * Given a file name and a set of already used names, calculate a unique name.
     *
     * @param usedNames Object with names already used as keys.
     * @param name Name to check.
     * @returns Unique name.
     */
    calculateUniqueName(usedNames: Record<string, unknown>, name: string): string {
        if (usedNames[name.toLowerCase()] === undefined) {
            // No file with the same name.
            return name;
        }

        // Repeated name. Add a number until we find a free name.
        const nameWithoutExtension = CoreMimetype.removeExtension(name);
        let extension = CoreMimetype.getFileExtension(name);
        let num = 1;
        extension = extension ? `.${extension}` : '';

        do {
            name = `${nameWithoutExtension}(${num})${extension}`;
            num++;
        } while (usedNames[name.toLowerCase()] !== undefined);

        return name;
    }

    /**
     * Remove app temporary folder.
     *
     * @returns Promise resolved when done.
     */
    async clearTmpFolder(): Promise<void> {
        // Ignore errors because the folder might not exist.
        await CorePromiseUtils.ignoreErrors(this.removeDir(CoreFileProvider.TMPFOLDER));
    }

    /**
     * Remove deleted sites folders.
     *
     * @returns Promise resolved when done.
     */
    async clearDeletedSitesFolder(existingSiteNames: string[]): Promise<void> {
        // Ignore errors because the folder might not exist.
        const dirPath = CoreFileProvider.SITESFOLDER;

        // Get the directory contents.
        try {
            const contents = await this.getDirectoryContents(dirPath);

            if (!contents.length) {
                return;
            }

            const promises: Promise<void>[] = contents.map(async (file) => {
                if (file.isDirectory) {
                    if (!existingSiteNames.includes(file.name)) {
                        // Site does not exist... delete it.
                        await CorePromiseUtils.ignoreErrors(this.removeDir(this.getSiteFolder(file.name)));
                    }
                }
            });

            await Promise.all(promises);
        } catch {
            // Ignore errors, maybe it doesn't exist.
        }
    }

    /**
     * Given a folder path and a list of used files, remove all the files of the folder that aren't on the list of used files.
     *
     * @param dirPath Folder path.
     * @param files List of used files.
     * @returns Promise resolved when done, rejected if failure.
     */
    async removeUnusedFiles(dirPath: string, files: CoreFileEntry[]): Promise<void> {
        // Get the directory contents.
        try {
            const contents = await this.getDirectoryContents(dirPath);

            if (!contents.length) {
                return;
            }

            const filesMap: {[fullPath: string]: FileEntry} = {};
            const promises: Promise<void>[] = [];

            // Index the received files by fullPath and ignore the invalid ones.
            files.forEach((file) => {
                if ('fullPath' in file) {
                    filesMap[file.fullPath] = file;
                }
            });

            // Check which of the content files aren't used anymore and delete them.
            contents.forEach((file) => {
                if (!filesMap[file.fullPath]) {
                    // File isn't used, delete it.
                    promises.push(this.removeFileByFileEntry(file));
                }
            });

            await Promise.all(promises);
        } catch {
            // Ignore errors, maybe it doesn't exist.
        }
    }

    /**
     * Check if a file is inside the app's folder.
     *
     * @param path The absolute path of the file to check.
     * @returns Whether the file is in the app's folder.
     */
    isFileInAppFolder(path: string): boolean {
        return path.indexOf(this.basePath) != -1;
    }

    /**
     * Get the path to the www folder at runtime based on the WebView URL.
     *
     * @returns Path.
     */
    getWWWPath(): string {
        // Use current URL, removing the path.
        if (!window.location.pathname || window.location.pathname == '/') {
            return window.location.href;
        }

        const position = window.location.href.indexOf(window.location.pathname);

        if (position != -1) {
            return window.location.href.substring(0, position);
        }

        return window.location.href;
    }

    /**
     * Get the full path to the www folder.
     *
     * @returns Path.
     */
    getWWWAbsolutePath(): string {
        if (window.cordova && cordova.file && cordova.file.applicationDirectory) {
            return CorePath.concatenatePaths(cordova.file.applicationDirectory, 'www');
        }

        // Cannot use Cordova to get it, use the WebView URL.
        return this.getWWWPath();
    }

    /**
     * Helper function to call Ionic WebView convertFileSrc only in the needed platforms.
     * This is needed to make files work with the Ionic WebView plugin.
     *
     * @param src Source to convert.
     * @returns Converted src.
     */
    convertFileSrc(src: string): string {
        return CorePlatform.isMobile() ? WebView.convertFileSrc(src) : src;
    }

    /**
     * Undo the conversion of convertFileSrc.
     *
     * @param src Source to unconvert.
     * @returns Unconverted src.
     */
    unconvertFileSrc(src: string): string {
        if (!CorePlatform.isMobile()) {
            return src;
        }

        if (CorePlatform.isIOS()) {
            return src.replace(`${CoreConstants.CONFIG.ioswebviewscheme}://localhost/_app_file_`, 'file://');
        }

        return src.replace('http://localhost/_app_file_', 'file://');
    }

    /**
     * Check if a certain path is in the app's folder (basePath).
     *
     * @param path Path to check.
     * @returns Whether it's in the app folder.
     */
    protected isPathInAppFolder(path: string): boolean {
        return !path || !path.match(/^[a-z0-9]+:\/\//i) || path.indexOf(this.basePath) != -1;
    }

    /**
     * Get the file's name.
     *
     * @param file The file.
     * @returns The file name.
     */
    getFileName(file: CoreFileEntry): string | undefined {
        return CoreFileUtils.isFileEntry(file) ? file.name : file.filename;
    }

}

export const CoreFile = makeSingleton(CoreFileProvider);

type MoveCopyFunction = (path: string, name: string, newPath: string, newName: string) => Promise<Entry>;
