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

import { CoreMimetype } from '@static/mimetype';
import { CoreFileUtils } from '@static/file-utils';
import { CoreBytesConstants, CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';

import { CoreLogger } from '@static/logger';
import { Filesystem, makeSingleton } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import { CoreText } from '@static/text';
import { CorePlatform } from '@services/platform';
import { CorePath } from '@static/path';
import { Zip } from '@features/native/plugins';
import { CoreUrl } from '@static/url';
import { CorePromiseUtils } from '@static/promise-utils';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding } from '@capacitor/filesystem';
import { DirectoryEntry, FileEntry, Entry, Metadata } from '@classes/native/filesystem';

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
            // Capacitor returns .../files for Directory.External. Use the parent to keep compatibility with Cordova paths.
            const { uri } = await Filesystem.getUri({ directory: Directory.External, path: '' });
            this.basePath = CoreText.addEndingSlash(uri.replace(/\/files\/?$/, ''));
        } else if (CorePlatform.isIOS()) {
            const { uri } = await Filesystem.getUri({ directory: Directory.Documents, path: '' });
            this.basePath = CoreText.addEndingSlash(uri);
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
        return true;
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

        const absolutePath = this.addBasePathIfNeeded(path);
        const stat = await Filesystem.stat({ path: absolutePath });

        if (stat.type !== 'file') {
            throw new CoreError(`Path is not a file: ${path}`);
        }

        // @todo: Encode needed?

        return new FileEntry(stat.uri);
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

        const absolutePath = this.addBasePathIfNeeded(path);
        const stat = await Filesystem.stat({ path: absolutePath });

        if (stat.type !== 'directory') {
            throw new CoreError(`Path is not a directory: ${path}`);
        }

        // @todo: encode needed?

        return new DirectoryEntry(stat.uri);
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

        const absolutePath = base ? CorePath.concatenatePaths(base, path) : this.addBasePathIfNeeded(path);

        this.logger.debug(`Create ${isDirectory ? 'dir' : 'file'} ${path}`);

        // Check if it already exists to honor failIfExists and to avoid overwriting existing files.
        const existing = await CorePromiseUtils.ignoreErrors(Filesystem.stat({ path: absolutePath }));

        if (existing) {
            if (failIfExists) {
                throw new CoreError(`Path already exists: ${path}`);
            }
            if (isDirectory && existing.type !== 'directory') {
                throw new CoreError(`Path exists and is not a directory: ${path}`);
            }
            if (!isDirectory && existing.type !== 'file') {
                throw new CoreError(`Path exists and is not a file: ${path}`);
            }

            return isDirectory ? new DirectoryEntry(existing.uri) : new FileEntry(existing.uri);
        }

        if (isDirectory) {
            await Filesystem.mkdir({ path: absolutePath, recursive: true });

            return new DirectoryEntry(absolutePath);
        }

        // Ensure parent directory exists.
        const parent = CoreFileUtils.getFileAndDirectoryFromPath(path).directory;
        if (parent) {
            await CorePromiseUtils.ignoreErrors(Filesystem.mkdir({
                path: this.addBasePathIfNeeded(parent),
                recursive: true,
            }));
        }

        // Create empty file.
        const { uri } = await Filesystem.writeFile({
            path: absolutePath,
            data: '',
            encoding: Encoding.UTF8,
        });

        return new FileEntry(uri);
    }

    /**
     * Create a directory.
     *
     * @param path Relative path to the directory.
     * @param failIfExists True if it should fail if the directory exists, false otherwise.
     * @returns Promise to be resolved when the directory is created.
     */
    async createDir(path: string, failIfExists?: boolean): Promise<DirectoryEntry> {
        const entry = <DirectoryEntry>await this.create(true, path, failIfExists);

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
        const entry = <FileEntry>await this.create(false, path, failIfExists);

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

        this.logger.debug(`Remove directory: ${path}`);

        await Filesystem.rmdir({ path: this.addBasePathIfNeeded(path), recursive: true });
    }

    /**
     * Removes a file and all its contents.
     *
     * @param path Relative path to the file.
     * @returns Promise to be resolved when the file is deleted.
     */
    async removeFile(path: string): Promise<void> {
        await this.init();

        this.logger.debug(`Remove file: ${path}`);

        await Filesystem.deleteFile({ path: this.addBasePathIfNeeded(path) });

        // @todo: Encode needed?
    }

    /**
     * Removes a file given its FileEntry.
     *
     * @param entry File Entry.
     * @returns Promise resolved when the file is deleted.
     */
    async removeFileByFileEntry(entry: Entry): Promise<void> {
        if (entry.isDirectory) {
            await this.removeDir(entry.toURL());
        } else {
            await this.removeFile(entry.toURL());
        }
    }

    /**
     * Retrieve the contents of a directory (not subdirectories).
     *
     * @param path Relative path to the directory.
     * @returns Promise to be resolved when the contents are retrieved.
     */
    async getDirectoryContents(path: string): Promise<(FileEntry | DirectoryEntry)[]> {
        await this.init();

        this.logger.debug(`Get contents of dir: ${path}`);

        const { files } = await Filesystem.readdir({ path: this.addBasePathIfNeeded(path) });

        return files.map((info) => info.type === 'directory'
            ? new DirectoryEntry(info.uri)
            : new FileEntry(info.uri));
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
    protected async getSize(entry: DirectoryEntry | FileEntry): Promise<number> {
        if (!this.isDirectoryEntry(entry)) {
            const stat = await Filesystem.stat({ path: this.addBasePathIfNeeded(entry.toURL()) });

            return stat.size;
        }

        const contents = await this.getDirectoryContents(entry.toURL());
        const sizes = await Promise.all(contents.map((child) => this.getSize(child)));

        return sizes.reduce((total, size) => total + size, 0);
    }

    /**
     * Calculate the size of a directory.
     *
     * @param path Relative path to the directory.
     * @returns Promise to be resolved when the size is calculated.
     */
    async getDirectorySize(path: string): Promise<number> {
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
    async getFileObjectFromFileEntry(entry: FileEntry): Promise<File> {
        // @todo Capacitor: evaluate if we want to deprecate this function and try to always work with paths or FileEntry objects.
        // File type is used a lot in file uploader, check this after FileTransfer has been migrated.
        this.logger.debug(`Get file object of: ${entry.toURL()}`);

        const uri = this.normalizePathForFilesystem(entry.toURL());

        // Guess extension from the extension, Capacitor doesn't provide a way to obtain the MIME type.
        const extension = CoreMimetype.getFileExtension(entry.name);
        const mimeType = (extension && CoreMimetype.getMimeType(extension)) || 'application/octet-stream';

        const [data, stat] = await Promise.all([
            this.readAsArrayBuffer(uri),
            Filesystem.stat({ path: uri }),
        ]);
        const blob = new Blob([data], { type: mimeType });
        const lastModified = stat.mtime ?? Date.now();

        // @todo Capacitor: Use the File class once cordova plugin file has been removed. Cordova plugin overrides File class.
        // return new File([blob], entry.name, { type: blob.type, lastModified: Date.now() });
        return Object.assign(blob, {
            name: entry.name,
            localURL: entry.toURL(),
            start: 0,
            end: blob.size,
            lastModifiedDate: lastModified,
            lastModified,
            webkitRelativePath: '',
        });
    }

    /**
     * Calculate the free space in the disk.
     * Please notice that this function isn't reliable and it's not documented in the Cordova File plugin.
     *
     * @returns Promise resolved with the estimated free space in bytes.
     */
    async calculateFreeSpace(): Promise<number> {
        // Capacitor Filesystem doesn't expose free disk space; use Storage Manager API as an estimate.
        // @todo Capacitor: this is not good enough. In a device this says 10GB when there's only 4.7GB available.
        if (typeof navigator.storage?.estimate !== 'function') {
            return Number.MAX_SAFE_INTEGER;
        }

        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota ?? 0;
        const usage = estimate.usage ?? 0;

        return Math.max(quota - usage, 0);
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
        if (folder) {
            path = CorePath.concatenatePaths(folder, path);
        }

        const absolutePath = this.addBasePathIfNeeded(path);

        this.logger.debug(`Read file ${absolutePath} with format ${format}`);

        switch (format) {
            case CoreFileFormat.FORMATDATAURL:
                return this.readAsDataUrl(absolutePath);
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            case CoreFileFormat.FORMATBINARYSTRING:
                return this.readAsBinaryString(absolutePath);
            case CoreFileFormat.FORMATARRAYBUFFER:
                return this.readAsArrayBuffer(absolutePath);
            case CoreFileFormat.FORMATJSON:
                return this.readAsText(absolutePath).then((text) => {
                    const parsed = CoreText.parseJSON(text, null);

                    if (parsed === null && text !== null) {
                        throw new CoreError(`Error parsing JSON file: ${path}`);
                    }

                    return parsed;
                });
            default:
                return this.readAsText(absolutePath);
        }
    }

    /**
     * Read a file as UTF-8 text.
     *
     * @param path File path.
     * @returns Promise resolved with the file contents.
     */
    protected async readAsText(path: string): Promise<string> {
        const { data } = await Filesystem.readFile({ path, encoding: Encoding.UTF8 });

        return typeof data === 'string' ? data : await data.text();
    }

    /**
     * Read a file and return its contents as an ArrayBuffer.
     *
     * @param path File path.
     * @returns Promise resolved with the file contents.
     */
    protected async readAsArrayBuffer(path: string): Promise<ArrayBuffer> {
        const { data } = await Filesystem.readFile({ path });

        if (typeof data !== 'string') {
            return data.arrayBuffer();
        }

        const binary = atob(data);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
            view[i] = binary.charCodeAt(i);
        }

        return buffer;
    }

    /**
     * Read a file and return its contents as a binary string.
     *
     * @param path File path.
     * @returns Promise resolved with the file contents.
     */
    protected async readAsBinaryString(path: string): Promise<string> {
        const { data } = await Filesystem.readFile({ path });

        if (typeof data === 'string') {
            return atob(data);
        }

        // Convert Blob → binary string via ArrayBuffer.
        const buffer = await data.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return binary;
    }

    /**
     * Read a file and return its contents as a base64 data URL.
     *
     * @param path File path.
     * @returns Promise resolved with the file contents.
     */
    protected async readAsDataUrl(path: string): Promise<string> {
        const { data } = await Filesystem.readFile({ path });
        const extension = CoreMimetype.getFileExtension(path);
        const mimeType = (extension && CoreMimetype.getMimeType(extension)) || 'application/octet-stream';

        if (typeof data === 'string') {
            return `data:${mimeType};base64,${data}`;
        }

        // Blob returned by the web implementation: read it as data URL.
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(<string>reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(data);
        });
    }

    /**
     * Read file contents from a file data object.
     *
     * @param fileData File's data.
     * @param format Format to read the file.
     * @returns Promise to be resolved when the file is read.
     */
    readFileData(fileData: File, format: CoreFileFormat = CoreFileFormat.FORMATTEXT): Promise<string | ArrayBuffer | unknown> {
        this.logger.debug(`Read file from file data with format ${format}`);

        return new Promise((resolve, reject): void => {
            // @todo Capacitor: Test this once cordova plugin file has been removed.
            const reader = new FileReader();

            reader.onloadend = (event): void => {
                if (event.target?.result !== undefined && event.target.result !== null) {
                    if (format === CoreFileFormat.FORMATJSON) {
                        // Convert to object.
                        const parsed = CoreText.parseJSON(<string>event.target.result, null);

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

        this.logger.debug(`Write file: ${path}`);

        const absolutePath = this.addBasePathIfNeeded(path);

        if (append) {
            // Ensure parent directory exists to prevent errors.
            const parent = CoreFileUtils.getFileAndDirectoryFromPath(path).directory;
            if (parent) {
                await CorePromiseUtils.ignoreErrors(Filesystem.mkdir({
                    path: this.addBasePathIfNeeded(parent),
                    recursive: true,
                }));
            }
        }

        if (typeof data === 'string') {
            if (append) {
                await Filesystem.appendFile({ path: absolutePath, data, encoding: Encoding.UTF8 });
            } else {
                await Filesystem.writeFile({ path: absolutePath, data, encoding: Encoding.UTF8, recursive: true });
            }
        } else {
            // @todo Capacitor: Test this once cordova plugin file has been removed.
            const base64 = await this.blobToBase64(data);

            if (append) {
                await Filesystem.appendFile({ path: absolutePath, data: base64 });
            } else {
                await Filesystem.writeFile({ path: absolutePath, data: base64, recursive: true });
            }
        }

        return new FileEntry(absolutePath);
    }

    /**
     * Read a Blob and return its base64-encoded contents (without the data URL prefix).
     *
     * @param blob Blob to encode.
     * @returns Promise resolved with the base64 representation.
     */
    protected blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = <string>reader.result;
                const commaIndex = result.indexOf(',');
                resolve(commaIndex === -1 ? result : result.substring(commaIndex + 1));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
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
        // @todo Capacitor: Test this once cordova plugin file has been removed.
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
     * @deprecated since 6.0. Use getFile with the absolute path instead.
     */
    async getExternalFile(fullPath: string): Promise<FileEntry> {
        const { uri } = await Filesystem.stat({ path: fullPath });

        return new FileEntry(uri);
    }

    /**
     * Calculate the size of a file.
     *
     * @param path Absolute path to the file.
     * @returns Promise to be resolved when the size is calculated.
     * @deprecated since 6.0. Use getFileSize with the absolute path instead.
     */
    async getExternalFileSize(path: string): Promise<number> {
        const stat = await Filesystem.stat({ path });

        return stat.size;
    }

    /**
     * Removes a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @returns Promise to be resolved when the file is removed.
     * @deprecated since 6.0. Use removeFile with the absolute path instead.
     */
    async removeExternalFile(fullPath: string): Promise<void> {
        await Filesystem.deleteFile({ path: fullPath });
    }

    /**
     * Get the base path where the application files are stored.
     *
     * @returns Promise to be resolved when the base path is retrieved.
     */
    async getBasePath(): Promise<string> {
        await this.init();

        return CoreText.addEndingSlash(this.basePath);
    }

    /**
     * Get the base path where the application files are stored in the format to be used for downloads.
     *
     * @returns Promise to be resolved when the base path is retrieved.
     * @deprecated since 6.0. Use getBasePathInstant() instead. Capacitor doesn't provide a cdvfile URL.
     */
    async getBasePathToDownload(): Promise<string> {
        await this.init();

        return this.getBasePathInstant();
    }

    /**
     * Get the base path where the application files are stored. Returns the value instantly, without waiting for it to be ready.
     *
     * @returns Base path. If the service hasn't been initialized it will return an invalid value.
     */
    getBasePathInstant(): string {
        return CoreText.addEndingSlash(this.basePath);
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

        return <DirectoryEntry>entry;
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

        return <FileEntry>entry;
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

        return <DirectoryEntry>entry;
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

        return <FileEntry>entry;
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

        await this.init();

        const toFileAndDir = CoreFileUtils.getFileAndDirectoryFromPath(to);

        if (toFileAndDir.directory && !destDirExists) {
            // Create the target directory if it doesn't exist.
            await this.createDir(toFileAndDir.directory);
        }

        const fromPath = this.addBasePathIfNeeded(from);
        const toPath = this.addBasePathIfNeeded(to);

        if (copy) {
            await Filesystem.copy({
                from: fromPath,
                to: toPath,
            });
        } else {
            await Filesystem.rename({
                from: fromPath,
                to: toPath,
            });
        }

        // @todo: Encode?

        return isDir ? new DirectoryEntry(toPath) : new FileEntry(toPath);
    }

    /**
     * Extract the file name and directory from a given path.
     *
     * @param path Path to be extracted.
     * @returns Plain object containing the file name and directory.
     * @deprecated since 5.0. Use CoreFileUtils.getFileAndDirectoryFromPath instead.
     */
    getFileAndDirectoryFromPath(path: string): { directory: string; name: string } {
        return CoreFileUtils.getFileAndDirectoryFromPath(path);
    }

    /**
     * Get the internal URL of a file.
     * Please notice that with WKWebView these URLs no longer work in mobile. Use fileEntry.toURL() along with convertFileSrc.
     *
     * @param fileEntry File Entry.
     * @returns Internal URL.
     * @deprecated since 6.0. Use toURL() from the FileEntry instance instead.
     */
    getInternalURL(fileEntry: FileEntry): string {
        return fileEntry.toURL();
    }

    /**
     * Get the URL (absolute path) of a file.
     * Use this function instead of doing fileEntry.toURL because the latter causes problems with WebView and other plugins.
     *
     * @param fileEntry File Entry.
     * @returns URL.
     * @deprecated since 6.0. Use toURL() from the FileEntry instance instead.
     */
    getFileEntryURL(fileEntry: Entry): string {
        return fileEntry.toURL();
    }

    /**
     * Adds the basePath to a path if it doesn't have it already.
     *
     * @param path Path to treat.
     * @returns Path with basePath added.
     */
    addBasePathIfNeeded(path: string): string {
        if (path.match(/^[a-z0-9]+:\/\//i)) {
            return path;
        }

        if (path.startsWith(this.basePath)) {
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

        const result = await Zip.unzip(fileEntry.toURL(), destFolder, onProgress);

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
    async getMetadata(fileEntry: Entry): Promise<Metadata> {
        const path = fileEntry.toURL();
        const stat = await Filesystem.stat({ path });

        return {
            modificationTime: new Date(stat.mtime),
            size: stat.size,
        };
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
        await this.init();

        // Create the destination dir if it doesn't exist.
        const dirAndFile = CoreFileUtils.getFileAndDirectoryFromPath(to);
        if (dirAndFile.directory) {
            await this.createDir(dirAndFile.directory);
        }

        to = this.addBasePathIfNeeded(to);

        if (copy) {
            await Filesystem.copy({ from, to });
        } else {
            await Filesystem.rename({ from, to });
        }

        return new FileEntry(to);
    }

    /**
     * Copy a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to copy.
     * @param to Relative new path of the file (inside the app folder).
     * @returns Promise resolved when the entry is copied.
     * @deprecated since 6.0. Use copyFile instead.
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
     * @deprecated since 6.0. Use moveFile instead.
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

            const files: Record<string, FileEntry | DirectoryEntry> = {};
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
     */
    async clearTmpFolder(): Promise<void> {
        // Ignore errors because the folder might not exist.
        await CorePromiseUtils.ignoreErrors(this.removeDir(CoreFileProvider.TMPFOLDER));
    }

    /**
     * Remove deleted sites folders.
     *
     * @param existingSiteNames List of existing site names. Folders with names not in this list will be deleted.
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
                if (file.isDirectory && !existingSiteNames.includes(file.name)) {
                    // Site does not exist, delete it.
                    await CorePromiseUtils.ignoreErrors(this.removeDir(file.toURL()));
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
     */
    async removeUnusedFiles(dirPath: string, files: CoreFileEntry[]): Promise<void> {
        // Get the directory contents.
        try {
            const contents = await this.getDirectoryContents(dirPath);

            if (!contents.length) {
                return;
            }

            const filesMap: { [fullPath: string]: FileEntry } = {};
            const promises: Promise<void>[] = [];

            // Index the received files by fullPath and ignore the invalid ones.
            files.forEach((file) => {
                if ('fullPath' in file) {
                    filesMap[file.toURL()] = file;
                }
            });

            // Check which of the content files aren't used anymore and delete them.
            contents.forEach((file) => {
                if (!filesMap[file.toURL()]) {
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
        return path.includes(this.basePath);
    }

    /**
     * Get the path to the www folder at runtime based on the WebView URL.
     *
     * @returns Path.
     */
    getWWWPath(): string {
        // Use current URL, removing the path.
        if (!window.location.pathname || window.location.pathname === '/') {
            return window.location.href;
        }

        const position = window.location.href.indexOf(window.location.pathname);

        if (position !== -1) {
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
        return CorePlatform.isMobile() ? Capacitor.convertFileSrc(src) : src;
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

        const scheme = CorePlatform.isIOS() ? CoreConstants.CONFIG.ioswebviewscheme : 'http';

        return src.replace(`${scheme}://localhost/_capacitor_file_`, 'file://')
            .replace(`${scheme}://localhost/_app_file_`, 'file://'); // @deprecated since 6.0. Keep Cordova value for now.
    }

    /**
     * Check if a certain path is in the app's folder (basePath).
     *
     * @param path Path to check.
     * @returns Whether it's in the app folder.
     */
    protected isPathInAppFolder(path: string): boolean {
        return !path || !path.match(/^[a-z0-9]+:\/\//i) || path.includes(this.basePath);
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
