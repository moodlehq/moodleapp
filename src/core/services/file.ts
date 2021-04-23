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

import { FileEntry, DirectoryEntry, Entry, Metadata, IFile } from '@ionic-native/file/ngx';

import { CoreApp } from '@services/app';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';

import { CoreLogger } from '@singletons/logger';
import { makeSingleton, File, Zip, Platform, WebView } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';

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
    FORMATBINARYSTRING = 2,
    FORMATARRAYBUFFER = 3,
    FORMATJSON = 4,
}

/**
 * Factory to interact with the file system.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileProvider {

    // Formats to read a file.
    /**
     * @deprecated since 3.9.5, use CoreFileFormat directly.
     */
    static readonly FORMATTEXT = CoreFileFormat.FORMATTEXT;
    /**
     * @deprecated since 3.9.5, use CoreFileFormat directly.
     */
    static readonly FORMATDATAURL = CoreFileFormat.FORMATDATAURL;
    /**
     * @deprecated since 3.9.5, use CoreFileFormat directly.
     */
    static readonly FORMATBINARYSTRING = CoreFileFormat.FORMATBINARYSTRING;
    /**
     * @deprecated since 3.9.5, use CoreFileFormat directly.
     */
    static readonly FORMATARRAYBUFFER = CoreFileFormat.FORMATARRAYBUFFER;
    /**
     * @deprecated since 3.9.5, use CoreFileFormat directly.
     */
    static readonly FORMATJSON = CoreFileFormat.FORMATJSON;

    // Folders.
    static readonly SITESFOLDER = 'sites';
    static readonly TMPFOLDER = 'tmp';

    static readonly CHUNK_SIZE = 1048576; // 1 MB. Same chunk size as Ionic Native.

    protected logger: CoreLogger;
    protected initialized = false;
    protected basePath = '';
    protected isHTMLAPI = false;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFileProvider');

        // @todo: Check if redefining FileReader getters and setters is still needed in Android.
    }

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
     * @return True if uses HTML API, false otherwise.
     */
    usesHTMLAPI(): boolean {
        return this.isHTMLAPI;
    }

    /**
     * Initialize basePath based on the OS if it's not initialized already.
     *
     * @return Promise to be resolved when the initialization is finished.
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await Platform.ready();

        if (CoreApp.isAndroid()) {
            this.basePath = File.externalApplicationStorageDirectory || this.basePath;
        } else if (CoreApp.isIOS()) {
            this.basePath = File.documentsDirectory || this.basePath;
        } else if (!this.isAvailable() || this.basePath === '') {
            this.logger.error('Error getting device OS.');

            return Promise.reject(new CoreError('Error getting device OS to initialize file system.'));
        }

        this.initialized = true;
        this.logger.debug('FS initialized: ' + this.basePath);
    }

    /**
     * Check if the plugin is available.
     *
     * @return Whether the plugin is available.
     */
    isAvailable(): boolean {
        return typeof window.resolveLocalFileSystemURL !== 'undefined';
    }

    /**
     * Get a file.
     *
     * @param path Relative path to the file.
     * @return Promise resolved when the file is retrieved.
     */
    getFile(path: string): Promise<FileEntry> {
        return this.init().then(() => {
            this.logger.debug('Get file: ' + path);

            return File.resolveLocalFilesystemUrl(this.addBasePathIfNeeded(path));
        }).then((entry) => <FileEntry> entry);
    }

    /**
     * Get a directory.
     *
     * @param path Relative path to the directory.
     * @return Promise resolved when the directory is retrieved.
     */
    getDir(path: string): Promise<DirectoryEntry> {
        return this.init().then(() => {
            this.logger.debug('Get directory: ' + path);

            return File.resolveDirectoryUrl(this.addBasePathIfNeeded(path));
        });
    }

    /**
     * Get site folder path.
     *
     * @param siteId Site ID.
     * @return Site folder path.
     */
    getSiteFolder(siteId: string): string {
        return CoreFileProvider.SITESFOLDER + '/' + siteId;
    }

    /**
     * Create a directory or a file.
     *
     * @param isDirectory True if a directory should be created, false if it should create a file.
     * @param path Relative path to the dir/file.
     * @param failIfExists True if it should fail if the dir/file exists, false otherwise.
     * @param base Base path to create the dir/file in. If not set, use basePath.
     * @return Promise to be resolved when the dir/file is created.
     */
    protected async create(
        isDirectory: boolean,
        path: string,
        failIfExists?: boolean,
        base?: string,
    ): Promise<FileEntry | DirectoryEntry> {
        await this.init();

        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        base = base || this.basePath;

        if (path.indexOf('/') == -1) {
            if (isDirectory) {
                this.logger.debug('Create dir ' + path + ' in ' + base);

                return File.createDir(base, path, !failIfExists);
            } else {
                this.logger.debug('Create file ' + path + ' in ' + base);

                return File.createFile(base, path, !failIfExists);
            }
        } else {
            // The file plugin doesn't allow creating more than 1 level at a time (e.g. tmp/folder).
            // We need to create them 1 by 1.
            const firstDir = path.substr(0, path.indexOf('/'));
            const restOfPath = path.substr(path.indexOf('/') + 1);

            this.logger.debug('Create dir ' + firstDir + ' in ' + base);

            const newDirEntry = await File.createDir(base, firstDir, true);

            return this.create(isDirectory, restOfPath, failIfExists, newDirEntry.toURL());
        }
    }

    /**
     * Create a directory.
     *
     * @param path Relative path to the directory.
     * @param failIfExists True if it should fail if the directory exists, false otherwise.
     * @return Promise to be resolved when the directory is created.
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
     * @return Promise to be resolved when the file is created.
     */
    async createFile(path: string, failIfExists?: boolean): Promise<FileEntry> {
        const entry = <FileEntry> await this.create(false, path, failIfExists);

        return entry;
    }

    /**
     * Removes a directory and all its contents.
     *
     * @param path Relative path to the directory.
     * @return Promise to be resolved when the directory is deleted.
     */
    async removeDir(path: string): Promise<void> {
        await this.init();

        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        this.logger.debug('Remove directory: ' + path);

        await File.removeRecursively(this.basePath, path);
    }

    /**
     * Removes a file and all its contents.
     *
     * @param path Relative path to the file.
     * @return Promise to be resolved when the file is deleted.
     */
    async removeFile(path: string): Promise<void> {
        await this.init();

        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        this.logger.debug('Remove file: ' + path);

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
     * @param fileEntry File Entry.
     * @return Promise resolved when the file is deleted.
     */
    removeFileByFileEntry(entry: Entry): Promise<void> {
        return new Promise((resolve, reject) => entry.remove(resolve, reject));
    }

    /**
     * Retrieve the contents of a directory (not subdirectories).
     *
     * @param path Relative path to the directory.
     * @return Promise to be resolved when the contents are retrieved.
     */
    async getDirectoryContents(path: string): Promise<(FileEntry | DirectoryEntry)[]> {
        await this.init();

        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        this.logger.debug('Get contents of dir: ' + path);

        const result = await File.listDir(this.basePath, path);

        return <(FileEntry | DirectoryEntry)[]> result;
    }

    /**
     * Type guard to check if the param is a DirectoryEntry.
     *
     * @param entry Param to check.
     * @return Whether the param is a DirectoryEntry.
     */
    protected isDirectoryEntry(entry: FileEntry | DirectoryEntry): entry is DirectoryEntry {
        return entry.isDirectory === true;
    }

    /**
     * Calculate the size of a directory or a file.
     *
     * @param entry Directory or file.
     * @return Promise to be resolved when the size is calculated.
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
     * @return Promise to be resolved when the size is calculated.
     */
    getDirectorySize(path: string): Promise<number> {
        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));

        this.logger.debug('Get size of dir: ' + path);

        return this.getDir(path).then((dirEntry) => this.getSize(dirEntry));
    }

    /**
     * Calculate the size of a file.
     *
     * @param path Relative path to the file.
     * @return Promise to be resolved when the size is calculated.
     */
    getFileSize(path: string): Promise<number> {
        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));

        this.logger.debug('Get size of file: ' + path);

        return this.getFile(path).then((fileEntry) => this.getSize(fileEntry));
    }

    /**
     * Get file object from a FileEntry.
     *
     * @param path Relative path to the file.
     * @return Promise to be resolved when the file is retrieved.
     */
    getFileObjectFromFileEntry(entry: FileEntry): Promise<IFile> {
        return new Promise((resolve, reject): void => {
            this.logger.debug('Get file object of: ' + entry.fullPath);
            entry.file(resolve, reject);
        });
    }

    /**
     * Calculate the free space in the disk.
     * Please notice that this function isn't reliable and it's not documented in the Cordova File plugin.
     *
     * @return Promise resolved with the estimated free space in bytes.
     */
    calculateFreeSpace(): Promise<number> {
        return File.getFreeDiskSpace().then((size) => {
            if (CoreApp.isIOS()) {
                // In iOS the size is in bytes.
                return Number(size);
            }

            // The size is in KB, convert it to bytes.
            return Number(size) * 1024;
        });
    }

    /**
     * Normalize a filename that usually comes URL encoded.
     *
     * @param filename The file name.
     * @return The file name normalized.
     */
    normalizeFileName(filename: string): string {
        filename = CoreTextUtils.decodeURIComponent(filename);

        return filename;
    }

    /**
     * Read a file from local file system.
     *
     * @param path Relative path to the file.
     * @param format Format to read the file.
     * @param folder Absolute path to the folder where the file is. Use it to read files outside of the app's data folder.
     * @return Promise to be resolved when the file is read.
     */
    readFile(
        path: string,
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

            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
        }

        this.logger.debug(`Read file ${path} with format ${format} in folder ${folder}`);

        switch (format) {
            case CoreFileFormat.FORMATDATAURL:
                return File.readAsDataURL(folder, path);
            case CoreFileFormat.FORMATBINARYSTRING:
                return File.readAsBinaryString(folder, path);
            case CoreFileFormat.FORMATARRAYBUFFER:
                return File.readAsArrayBuffer(folder, path);
            case CoreFileFormat.FORMATJSON:
                return File.readAsText(folder, path).then((text) => {
                    const parsed = CoreTextUtils.parseJSON(text, null);

                    if (parsed == null && text != null) {
                        throw new CoreError('Error parsing JSON file: ' + path);
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
     * @return Promise to be resolved when the file is read.
     */
    readFileData(fileData: IFile, format: CoreFileFormat = CoreFileFormat.FORMATTEXT): Promise<string | ArrayBuffer | unknown> {
        format = format || CoreFileFormat.FORMATTEXT;
        this.logger.debug('Read file from file data with format ' + format);

        return new Promise((resolve, reject): void => {
            const reader = new FileReader();

            reader.onloadend = (event): void => {
                if (event.target?.result !== undefined && event.target.result !== null) {
                    if (format == CoreFileFormat.FORMATJSON) {
                        // Convert to object.
                        const parsed = CoreTextUtils.parseJSON(<string> event.target.result, null);

                        if (parsed == null) {
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
                case CoreFileFormat.FORMATBINARYSTRING:
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
     * @return Promise to be resolved when the file is written.
     */
    async writeFile(path: string, data: string | Blob, append?: boolean): Promise<FileEntry> {
        await this.init();

        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        this.logger.debug('Write file: ' + path);

        // Create file (and parent folders) to prevent errors.
        const fileEntry = await this.createFile(path);

        if (this.isHTMLAPI && (typeof data == 'string' || data.toString() == '[object ArrayBuffer]')) {
            // We need to write Blobs.
            const extension = CoreMimetypeUtils.getFileExtension(path);
            const type = extension ? CoreMimetypeUtils.getMimeType(extension) : '';
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
     * @return Promise resolved when done.
     */
    async writeFileDataInFile(
        file: Blob,
        path: string,
        onProgress?: CoreFileProgressFunction,
        offset: number = 0,
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
     * @return Promise to be resolved when the file is retrieved.
     */
    getExternalFile(fullPath: string): Promise<FileEntry> {
        return File.resolveLocalFilesystemUrl(fullPath).then((entry) => <FileEntry> entry);
    }

    /**
     * Calculate the size of a file.
     *
     * @param path Absolute path to the file.
     * @return Promise to be resolved when the size is calculated.
     */
    async getExternalFileSize(path: string): Promise<number> {
        const fileEntry = await this.getExternalFile(path);

        return this.getSize(fileEntry);
    }

    /**
     * Removes a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @return Promise to be resolved when the file is removed.
     */
    async removeExternalFile(fullPath: string): Promise<void> {
        const directory = fullPath.substring(0, fullPath.lastIndexOf('/'));
        const filename = fullPath.substr(fullPath.lastIndexOf('/') + 1);

        await File.removeFile(directory, filename);
    }

    /**
     * Get the base path where the application files are stored.
     *
     * @return Promise to be resolved when the base path is retrieved.
     */
    getBasePath(): Promise<string> {
        return this.init().then(() => {
            if (this.basePath.slice(-1) == '/') {
                return this.basePath;
            } else {
                return this.basePath + '/';
            }
        });
    }

    /**
     * Get the base path where the application files are stored in the format to be used for downloads.
     * iOS: Internal URL (cdvfile://).
     * Others: basePath (file://)
     *
     * @return Promise to be resolved when the base path is retrieved.
     */
    async getBasePathToDownload(): Promise<string> {
        await this.init();

        if (CoreApp.isIOS()) {
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
     * @return Base path. If the service hasn't been initialized it will return an invalid value.
     */
    getBasePathInstant(): string {
        if (!this.basePath) {
            return this.basePath;
        } else if (this.basePath.slice(-1) == '/') {
            return this.basePath;
        } else {
            return this.basePath + '/';
        }
    }

    /**
     * Move a dir.
     *
     * @param originalPath Path to the dir to move.
     * @param newPath New path of the dir.
     * @param destDirExists Set it to true if you know the directory where to put the dir exists. If false, the function will
     *                      try to create it (slower).
     * @return Promise resolved when the entry is moved.
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
     * @return Promise resolved when the entry is moved.
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
     * @return Promise resolved when the entry is copied.
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
     * @return Promise resolved when the entry is copied.
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
     * @return Promise resolved when the entry is copied.
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

        const moveCopyFn: MoveCopyFunction = copy ?
            (isDir ? File.copyDir.bind(File.instance) : File.copyFile.bind(File.instance)) :
            (isDir ? File.moveDir.bind(File.instance) : File.moveFile.bind(File.instance));

        await this.init();

        // Paths cannot start with "/". Remove basePath if present.
        from = this.removeStartingSlash(from.replace(this.basePath, ''));
        to = this.removeStartingSlash(to.replace(this.basePath, ''));

        const toFileAndDir = this.getFileAndDirectoryFromPath(to);

        if (toFileAndDir.directory && !destDirExists) {
            // Create the target directory if it doesn't exist.
            await this.createDir(toFileAndDir.directory);
        }

        try {
            const entry = await moveCopyFn(this.basePath, from, this.basePath, to);

            return entry;
        } catch (error) {
            // The copy can fail if the path has encoded characters. Try again if that's the case.
            const decodedFrom = decodeURI(from);
            const decodedTo = decodeURI(to);

            if (from != decodedFrom || to != decodedTo) {
                return moveCopyFn(this.basePath, decodedFrom, this.basePath, decodedTo);
            } else {
                return Promise.reject(error);
            }
        }
    }

    /**
     * Extract the file name and directory from a given path.
     *
     * @param path Path to be extracted.
     * @return Plain object containing the file name and directory.
     * @description
     * file.pdf         -> directory: '', name: 'file.pdf'
     * /file.pdf        -> directory: '', name: 'file.pdf'
     * path/file.pdf    -> directory: 'path', name: 'file.pdf'
     * path/            -> directory: 'path', name: ''
     * path             -> directory: '', name: 'path'
     */
    getFileAndDirectoryFromPath(path: string): {directory: string; name: string} {
        const file = {
            directory: '',
            name: '',
        };

        file.directory = path.substring(0, path.lastIndexOf('/'));
        file.name = path.substr(path.lastIndexOf('/') + 1);

        return file;
    }

    /**
     * Get the internal URL of a file.
     * Please notice that with WKWebView these URLs no longer work in mobile. Use fileEntry.toURL() along with convertFileSrc.
     *
     * @param fileEntry File Entry.
     * @return Internal URL.
     */
    getInternalURL(fileEntry: FileEntry): string {
        if (!fileEntry.toInternalURL) {
            // File doesn't implement toInternalURL, use toURL.
            return fileEntry.toURL();
        }

        return fileEntry.toInternalURL();
    }

    /**
     * Adds the basePath to a path if it doesn't have it already.
     *
     * @param path Path to treat.
     * @return Path with basePath added.
     */
    addBasePathIfNeeded(path: string): string {
        if (path.indexOf(this.basePath) > -1) {
            return path;
        } else {
            return CoreTextUtils.concatenatePaths(this.basePath, path);
        }
    }

    /**
     * Remove the base path from a path. If basePath isn't found, return false.
     *
     * @param path Path to treat.
     * @return Path without basePath if basePath was found, undefined otherwise.
     */
    removeBasePath(path: string): string {
        if (path.indexOf(this.basePath) > -1) {
            return path.replace(this.basePath, '');
        }

        return path;
    }

    /**
     * Unzips a file.
     *
     * @param path Path to the ZIP file.
     * @param destFolder Path to the destination folder. If not defined, a new folder will be created with the
     *                   same location and name as the ZIP file (without extension).
     * @param onProgress Function to call on progress.
     * @param recreateDir Delete the dest directory before unzipping. Defaults to true.
     * @return Promise resolved when the file is unzipped.
     */
    async unzipFile(
        path: string,
        destFolder?: string,
        onProgress?: (progress: ProgressEvent) => void,
        recreateDir: boolean = true,
    ): Promise<void> {
        // Get the source file.
        const fileEntry = await this.getFile(path);

        if (destFolder && recreateDir) {
            // Make sure the dest dir doesn't exist already.
            await CoreUtils.ignoreErrors(this.removeDir(destFolder));

            // Now create the dir, otherwise if any of the ancestor dirs doesn't exist the unzip would fail.
            await this.createDir(destFolder);
        }

        // If destFolder is not set, use same location as ZIP file. We need to use absolute paths (including basePath).
        destFolder = this.addBasePathIfNeeded(destFolder || CoreMimetypeUtils.removeExtension(path));

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
     * @return Promise resolved in success.
     */
    async replaceInFile(path: string, search: string | RegExp, newValue: string): Promise<void> {
        let content = <string> await this.readFile(path);

        if (typeof content == 'undefined' || content === null || !content.replace) {
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
     * @return Promise resolved with metadata.
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
     * @return Promise resolved with metadata.
     */
    getMetadataFromPath(path: string, isDir?: boolean): Promise<Metadata> {
        let promise;
        if (isDir) {
            promise = this.getDir(path);
        } else {
            promise = this.getFile(path);
        }

        return promise.then((entry) => this.getMetadata(entry));
    }

    /**
     * Remove the starting slash of a path if it's there. E.g. '/sites/filepool' -> 'sites/filepool'.
     *
     * @param path Path.
     * @return Path without a slash in the first position.
     */
    removeStartingSlash(path: string): string {
        if (path[0] == '/') {
            return path.substr(1);
        }

        return path;
    }

    /**
     * Convenience function to copy or move an external file.
     *
     * @param from Absolute path to the file to copy/move.
     * @param to Relative new path of the file (inside the app folder).
     * @param copy True to copy, false to move.
     * @return Promise resolved when the entry is copied/moved.
     */
    protected async copyOrMoveExternalFile(from: string, to: string, copy?: boolean): Promise<FileEntry> {
        // Get the file to copy/move.
        const fileEntry = await this.getExternalFile(from);

        // Create the destination dir if it doesn't exist.
        const dirAndFile = this.getFileAndDirectoryFromPath(to);

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
     * @return Promise resolved when the entry is copied.
     */
    copyExternalFile(from: string, to: string): Promise<FileEntry> {
        return this.copyOrMoveExternalFile(from, to, true);
    }

    /**
     * Move a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to move.
     * @param to Relative new path of the file (inside the app folder).
     * @return Promise resolved when the entry is moved.
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
     * @return Promise resolved with the unique file name.
     */
    async getUniqueNameInFolder(dirPath: string, fileName: string, defaultExt?: string): Promise<string> {
        // Get existing files in the folder.
        try {
            const entries = await this.getDirectoryContents(dirPath);

            const files = {};
            let fileNameWithoutExtension = CoreMimetypeUtils.removeExtension(fileName);
            let extension = CoreMimetypeUtils.getFileExtension(fileName) || defaultExt;

            // Clean the file name.
            fileNameWithoutExtension = CoreTextUtils.removeSpecialCharactersForFiles(
                CoreTextUtils.decodeURIComponent(fileNameWithoutExtension),
            );

            // Index the files by name.
            entries.forEach((entry) => {
                files[entry.name.toLowerCase()] = entry;
            });

            // Format extension.
            if (extension) {
                extension = '.' + extension;
            } else {
                extension = '';
            }

            return this.calculateUniqueName(files, fileNameWithoutExtension + extension);
        } catch (error) {
            // Folder doesn't exist, name is unique. Clean it and return it.
            return CoreTextUtils.removeSpecialCharactersForFiles(CoreTextUtils.decodeURIComponent(fileName));
        }
    }

    /**
     * Given a file name and a set of already used names, calculate a unique name.
     *
     * @param usedNames Object with names already used as keys.
     * @param name Name to check.
     * @return Unique name.
     */
    calculateUniqueName(usedNames: Record<string, unknown>, name: string): string {
        if (typeof usedNames[name.toLowerCase()] == 'undefined') {
            // No file with the same name.
            return name;
        }

        // Repeated name. Add a number until we find a free name.
        const nameWithoutExtension = CoreMimetypeUtils.removeExtension(name);
        let extension = CoreMimetypeUtils.getFileExtension(name);
        let num = 1;
        extension = extension ? '.' + extension : '';

        do {
            name = nameWithoutExtension + '(' + num + ')' + extension;
            num++;
        } while (typeof usedNames[name.toLowerCase()] != 'undefined');

        return name;
    }

    /**
     * Remove app temporary folder.
     *
     * @return Promise resolved when done.
     */
    async clearTmpFolder(): Promise<void> {
        // Ignore errors because the folder might not exist.
        await CoreUtils.ignoreErrors(this.removeDir(CoreFileProvider.TMPFOLDER));
    }

    /**
     * Given a folder path and a list of used files, remove all the files of the folder that aren't on the list of used files.
     *
     * @param dirPath Folder path.
     * @param files List of used files.
     * @return Promise resolved when done, rejected if failure.
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
        } catch (error) {
            // Ignore errors, maybe it doesn't exist.
        }
    }

    /**
     * Check if a file is inside the app's folder.
     *
     * @param path The absolute path of the file to check.
     * @return Whether the file is in the app's folder.
     */
    isFileInAppFolder(path: string): boolean {
        return path.indexOf(this.basePath) != -1;
    }

    /**
     * Get the path to the www folder at runtime based on the WebView URL.
     *
     * @return Path.
     */
    getWWWPath(): string {
        // Use current URL, removing the path.
        if (!window.location.pathname || window.location.pathname == '/') {
            return window.location.href;
        }

        const position = window.location.href.indexOf(window.location.pathname);

        if (position != -1) {
            return window.location.href.substr(0, position);
        }

        return window.location.href;
    }

    /**
     * Get the full path to the www folder.
     *
     * @return Path.
     */
    getWWWAbsolutePath(): string {
        if (window.cordova && cordova.file && cordova.file.applicationDirectory) {
            return CoreTextUtils.concatenatePaths(cordova.file.applicationDirectory, 'www');
        }

        // Cannot use Cordova to get it, use the WebView URL.
        return this.getWWWPath();
    }

    /**
     * Helper function to call Ionic WebView convertFileSrc only in the needed platforms.
     * This is needed to make files work with the Ionic WebView plugin.
     *
     * @param src Source to convert.
     * @return Converted src.
     */
    convertFileSrc(src: string): string {
        return CoreApp.isMobile() ? WebView.convertFileSrc(src) : src;
    }

    /**
     * Undo the conversion of convertFileSrc.
     *
     * @param src Source to unconvert.
     * @return Unconverted src.
     */
    unconvertFileSrc(src: string): string {
        if (!CoreApp.isMobile()) {
            return src;
        }

        const scheme = CoreApp.isIOS() ? CoreConstants.CONFIG.ioswebviewscheme : 'http';

        return src.replace(scheme + '://localhost/_app_file_', 'file://');
    }

    /**
     * Check if a certain path is in the app's folder (basePath).
     *
     * @param path Path to check.
     * @return Whether it's in the app folder.
     */
    protected isPathInAppFolder(path: string): boolean {
        return !path || !path.match(/^[a-z0-9]+:\/\//i) || path.indexOf(this.basePath) != -1;
    }

    /**
     * Get the file's name.
     *
     * @param file The file.
     * @return The file name.
     */
    getFileName(file: CoreFileEntry): string | undefined {
        return CoreUtils.isFileEntry(file) ? file.name : file.filename;
    }

}

export const CoreFile = makeSingleton(CoreFileProvider);

type MoveCopyFunction = (path: string, dirName: string, newPath: string, newDirName: string) => Promise<FileEntry | DirectoryEntry>;
