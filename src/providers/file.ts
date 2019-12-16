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
import { Platform } from 'ionic-angular';
import { File, FileEntry, DirectoryEntry } from '@ionic-native/file';

import { CoreAppProvider } from './app';
import { CoreLoggerProvider } from './logger';
import { CoreMimetypeUtilsProvider } from './utils/mimetype';
import { CoreTextUtilsProvider } from './utils/text';
import { Zip } from '@ionic-native/zip';

/**
 * Progress event used when writing a file data into a file.
 */
export interface CoreFileProgressEvent {
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
}

/**
 * Factory to interact with the file system.
 */
@Injectable()
export class CoreFileProvider {
    // Formats to read a file.
    static FORMATTEXT = 0;
    static FORMATDATAURL = 1;
    static FORMATBINARYSTRING = 2;
    static FORMATARRAYBUFFER = 3;
    static FORMATJSON = 4;

    // Folders.
    static SITESFOLDER = 'sites';
    static TMPFOLDER = 'tmp';

    protected logger;
    protected initialized = false;
    protected basePath = '';
    protected isHTMLAPI = false;
    protected CHUNK_SIZE = 10485760; // 10 MB.

    constructor(logger: CoreLoggerProvider, private platform: Platform, private file: File, private appProvider: CoreAppProvider,
            private textUtils: CoreTextUtilsProvider, private zip: Zip, private mimeUtils: CoreMimetypeUtilsProvider) {
        this.logger = logger.getInstance('CoreFileProvider');

        if (platform.is('android') && !Object.getOwnPropertyDescriptor(FileReader.prototype, 'onloadend')) {
            // Cordova File plugin creates some getters and setter for FileReader, but Ionic's polyfills override them in Android.
            // Create the getters and setters again. This code comes from FileReader.js in cordova-plugin-file.
            this.defineGetterSetter(FileReader.prototype, 'readyState', function(): any {
                return this._localURL ? this._readyState : this._realReader.readyState;
            });

            this.defineGetterSetter(FileReader.prototype, 'error', function(): any {
                return this._localURL ? this._error : this._realReader.error;
            });

            this.defineGetterSetter(FileReader.prototype, 'result', function(): any {
                return this._localURL ? this._result : this._realReader.result;
            });

            this.defineEvent('onloadstart');
            this.defineEvent('onprogress');
            this.defineEvent('onload');
            this.defineEvent('onerror');
            this.defineEvent('onloadend');
            this.defineEvent('onabort');
        }
    }

    /**
     * Define an event for FileReader.
     *
     * @param eventName Name of the event.
     */
    protected defineEvent(eventName: string): void {
        this.defineGetterSetter(FileReader.prototype, eventName, function(): any {
            return this._realReader[eventName] || null;
        }, function(value: any): void {
            this._realReader[eventName] = value;
        });
    }

    /**
     * Define a getter and, optionally, a setter for a certain property in an object.
     *
     * @param obj Object to set the getter/setter for.
     * @param key Name of the property where to set them.
     * @param getFunc The getter function.
     * @param setFunc The setter function.
     */
    protected defineGetterSetter(obj: any, key: string, getFunc: Function, setFunc?: Function): void {
        if (Object.defineProperty) {
            const desc: any = {
                get: getFunc,
                configurable: true
            };

            if (setFunc) {
                desc.set = setFunc;
            }

            Object.defineProperty(obj, key, desc);
        } else {
            obj.__defineGetter__(key, getFunc);
            if (setFunc) {
                obj.__defineSetter__(key, setFunc);
            }
        }
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
    init(): Promise<void> {
        if (this.initialized) {
            return Promise.resolve();
        }

        return this.platform.ready().then(() => {

            if (this.platform.is('android')) {
                this.basePath = this.file.externalApplicationStorageDirectory || this.basePath;
            } else if (this.platform.is('ios')) {
                this.basePath = this.file.documentsDirectory || this.basePath;
            } else if (!this.isAvailable() || this.basePath === '') {
                this.logger.error('Error getting device OS.');

                return Promise.reject(null);
            }

            this.initialized = true;
            this.logger.debug('FS initialized: ' + this.basePath);
        });
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

            return this.file.resolveLocalFilesystemUrl(this.addBasePathIfNeeded(path));
        }).then((entry) => {
            return <FileEntry> entry;
        });
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

            return this.file.resolveDirectoryUrl(this.addBasePathIfNeeded(path));
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
    protected create(isDirectory: boolean, path: string, failIfExists?: boolean, base?: string): Promise<any> {
        return this.init().then(() => {
            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
            base = base || this.basePath;

            if (path.indexOf('/') == -1) {
                if (isDirectory) {
                    this.logger.debug('Create dir ' + path + ' in ' + base);

                    return this.file.createDir(base, path, !failIfExists);
                } else {
                    this.logger.debug('Create file ' + path + ' in ' + base);

                    return this.file.createFile(base, path, !failIfExists);
                }
            } else {
                // The file plugin doesn't allow creating more than 1 level at a time (e.g. tmp/folder).
                // We need to create them 1 by 1.
                const firstDir = path.substr(0, path.indexOf('/')),
                    restOfPath = path.substr(path.indexOf('/') + 1);

                this.logger.debug('Create dir ' + firstDir + ' in ' + base);

                return this.file.createDir(base, firstDir, true).then((newDirEntry) => {
                    return this.create(isDirectory, restOfPath, failIfExists, newDirEntry.toURL());
                }).catch((error) => {
                    this.logger.error('Error creating directory ' + firstDir + ' in ' + base);

                    return Promise.reject(error);
                });
            }
        });
    }

    /**
     * Create a directory.
     *
     * @param path Relative path to the directory.
     * @param failIfExists True if it should fail if the directory exists, false otherwise.
     * @return Promise to be resolved when the directory is created.
     */
    createDir(path: string, failIfExists?: boolean): Promise<DirectoryEntry> {
        return this.create(true, path, failIfExists);
    }

    /**
     * Create a file.
     *
     * @param path Relative path to the file.
     * @param failIfExists True if it should fail if the file exists, false otherwise..
     * @return Promise to be resolved when the file is created.
     */
    createFile(path: string, failIfExists?: boolean): Promise<FileEntry> {
        return this.create(false, path, failIfExists);
    }

    /**
     * Removes a directory and all its contents.
     *
     * @param path Relative path to the directory.
     * @return Promise to be resolved when the directory is deleted.
     */
    removeDir(path: string): Promise<any> {
        return this.init().then(() => {
            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
            this.logger.debug('Remove directory: ' + path);

            return this.file.removeRecursively(this.basePath, path);
        });
    }

    /**
     * Removes a file and all its contents.
     *
     * @param path Relative path to the file.
     * @return Promise to be resolved when the file is deleted.
     */
    removeFile(path: string): Promise<any> {
        return this.init().then(() => {
            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
            this.logger.debug('Remove file: ' + path);

            return this.file.removeFile(this.basePath, path).catch((error) => {
                // The delete can fail if the path has encoded characters. Try again if that's the case.
                const decodedPath = decodeURI(path);

                if (decodedPath != path) {
                    return this.file.removeFile(this.basePath, decodedPath);
                } else {
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Removes a file given its FileEntry.
     *
     * @param fileEntry File Entry.
     * @return Promise resolved when the file is deleted.
     */
    removeFileByFileEntry(fileEntry: any): Promise<any> {
        return new Promise((resolve, reject): void => {
            fileEntry.remove(resolve, reject);
        });
    }

    /**
     * Retrieve the contents of a directory (not subdirectories).
     *
     * @param path Relative path to the directory.
     * @return Promise to be resolved when the contents are retrieved.
     */
    getDirectoryContents(path: string): Promise<any> {
        return this.init().then(() => {
            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
            this.logger.debug('Get contents of dir: ' + path);

            return this.file.listDir(this.basePath, path);
        });
    }

    /**
     * Calculate the size of a directory or a file.
     *
     * @param entry Directory or file.
     * @return Promise to be resolved when the size is calculated.
     */
    protected getSize(entry: any): Promise<number> {
        return new Promise((resolve, reject): void => {
            if (entry.isDirectory) {
                const directoryReader = entry.createReader();
                directoryReader.readEntries((entries) => {

                    const promises = [];
                    for (let i = 0; i < entries.length; i++) {
                        promises.push(this.getSize(entries[i]));
                    }

                    Promise.all(promises).then((sizes) => {

                        let directorySize = 0;
                        for (let i = 0; i < sizes.length; i++) {
                            const fileSize = parseInt(sizes[i]);
                            if (isNaN(fileSize)) {
                                reject();

                                return;
                            }
                            directorySize += fileSize;
                        }
                        resolve(directorySize);

                    }, reject);

                }, reject);

            } else if (entry.isFile) {
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

        return this.getDir(path).then((dirEntry) => {
            return this.getSize(dirEntry);
        });
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

        return this.getFile(path).then((fileEntry) => {
            return this.getSize(fileEntry);
        });
    }

    /**
     * Get file object from a FileEntry.
     *
     * @param path Relative path to the file.
     * @return Promise to be resolved when the file is retrieved.
     */
    getFileObjectFromFileEntry(entry: FileEntry): Promise<any> {
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
        return this.file.getFreeDiskSpace().then((size) => {
            if (this.platform.is('ios')) {
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
        filename = this.textUtils.decodeURIComponent(filename);

        return filename;
    }

    /**
     * Read a file from local file system.
     *
     * @param path Relative path to the file.
     * @param format Format to read the file. Must be one of:
     *               FORMATTEXT
     *               FORMATDATAURL
     *               FORMATBINARYSTRING
     *               FORMATARRAYBUFFER
     *               FORMATJSON
     * @return Promise to be resolved when the file is read.
     */
    readFile(path: string, format: number = CoreFileProvider.FORMATTEXT): Promise<any> {
        // Remove basePath if it's in the path.
        path = this.removeStartingSlash(path.replace(this.basePath, ''));
        this.logger.debug('Read file ' + path + ' with format ' + format);

        switch (format) {
            case CoreFileProvider.FORMATDATAURL:
                return this.file.readAsDataURL(this.basePath, path);
            case CoreFileProvider.FORMATBINARYSTRING:
                return this.file.readAsBinaryString(this.basePath, path);
            case CoreFileProvider.FORMATARRAYBUFFER:
                return this.file.readAsArrayBuffer(this.basePath, path);
            case CoreFileProvider.FORMATJSON:
                return this.file.readAsText(this.basePath, path).then((text) => {
                    const parsed = this.textUtils.parseJSON(text, null);

                    if (parsed == null && text != null) {
                        return Promise.reject('Error parsing JSON file: ' + path);
                    }

                    return parsed;
                });
            default:
                return this.file.readAsText(this.basePath, path);
        }
    }

    /**
     * Read file contents from a file data object.
     *
     * @param fileData File's data.
     * @param format Format to read the file. Must be one of:
     *               FORMATTEXT
     *               FORMATDATAURL
     *               FORMATBINARYSTRING
     *               FORMATARRAYBUFFER
     *               FORMATJSON
     * @return Promise to be resolved when the file is read.
     */
    readFileData(fileData: any, format: number = CoreFileProvider.FORMATTEXT): Promise<any> {
        format = format || CoreFileProvider.FORMATTEXT;
        this.logger.debug('Read file from file data with format ' + format);

        return new Promise((resolve, reject): void => {
            const reader = new FileReader();

            reader.onloadend = (evt): void => {
                const target = <any> evt.target; // Convert to <any> to be able to use non-standard properties.
                if (target.result !== undefined || target.result !== null) {
                    if (format == CoreFileProvider.FORMATJSON) {
                        // Convert to object.
                        const parsed = this.textUtils.parseJSON(target.result, null);

                        if (parsed == null) {
                            reject('Error parsing JSON file.');
                        }

                        resolve(parsed);
                    } else {
                        resolve(target.result);
                    }
                } else if (target.error !== undefined || target.error !== null) {
                    reject(target.error);
                } else {
                    reject({ code: null, message: 'READER_ONLOADEND_ERR' });
                }
            };

            // Check if the load starts. If it doesn't start in 3 seconds, reject.
            // Sometimes in Android the read doesn't start for some reason, so the promise never finishes.
            let hasStarted = false;
            reader.onloadstart = (evt): void => {
                hasStarted = true;
            };
            setTimeout(() => {
                if (!hasStarted) {
                    reject('Upload cannot start.');
                }
            }, 3000);

            switch (format) {
                case CoreFileProvider.FORMATDATAURL:
                    reader.readAsDataURL(fileData);
                    break;
                case CoreFileProvider.FORMATBINARYSTRING:
                    reader.readAsBinaryString(fileData);
                    break;
                case CoreFileProvider.FORMATARRAYBUFFER:
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
    writeFile(path: string, data: any, append?: boolean): Promise<any> {
        return this.init().then(() => {
            // Remove basePath if it's in the path.
            path = this.removeStartingSlash(path.replace(this.basePath, ''));
            this.logger.debug('Write file: ' + path);

            // Create file (and parent folders) to prevent errors.
            return this.createFile(path).then((fileEntry) => {
                if (this.isHTMLAPI && !this.appProvider.isDesktop() &&
                    (typeof data == 'string' || data.toString() == '[object ArrayBuffer]')) {
                    // We need to write Blobs.
                    const type = this.mimeUtils.getMimeType(this.mimeUtils.getFileExtension(path));
                    data = new Blob([data], { type: type || 'text/plain' });
                }

                return this.file.writeFile(this.basePath, path, data, { replace: !append, append: !!append }).then(() => {
                    return fileEntry;
                });
            });
        });
    }

    /**
     * Write some file data into a filesystem file.
     * It's done in chunks to prevent crashing the app for big files.
     *
     * @param file The data to write.
     * @param path Path where to store the data.
     * @param onProgress Function to call on progress.
     * @param offset Offset where to start reading from.
     * @param append Whether to append the data to the end of the file.
     * @return Promise resolved when done.
     */
    writeFileDataInFile(file: any, path: string, onProgress?: (event: CoreFileProgressEvent) => any, offset: number = 0,
            append?: boolean): Promise<any> {

        offset = offset || 0;

        // Get the chunk to read.
        const blob = file.slice(offset, Math.min(offset + this.CHUNK_SIZE, file.size));

        return this.writeFileDataInFileChunk(blob, path, append).then((fileEntry) => {
            offset += this.CHUNK_SIZE;

            onProgress && onProgress({
                lengthComputable: true,
                loaded: offset,
                total: file.size
            });

            if (offset >= file.size) {
                // Done, stop.
                return fileEntry;
            }

            // Read the next chunk.
            return this.writeFileDataInFile(file, path, onProgress, offset, true);
        });
    }

    /**
     * Write a chunk of data into a file.
     *
     * @param chunkData The chunk of data.
     * @param path Path where to store the data.
     * @param append Whether to append the data to the end of the file.
     * @return Promise resolved when done.
     */
    protected writeFileDataInFileChunk(chunkData: any, path: string, append?: boolean): Promise<any> {
        // Read the chunk data.
        return this.readFileData(chunkData, CoreFileProvider.FORMATARRAYBUFFER).then((fileData) => {
            // Write the data in the file.
            return this.writeFile(path, fileData, append);
        });
    }

    /**
     * Gets a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @return Promise to be resolved when the file is retrieved.
     */
    getExternalFile(fullPath: string): Promise<FileEntry> {
        return this.file.resolveLocalFilesystemUrl(fullPath).then((entry) => {
            return <FileEntry> entry;
        });
    }

    /**
     * Removes a file that might be outside the app's folder.
     *
     * @param fullPath Absolute path to the file.
     * @return Promise to be resolved when the file is removed.
     */
    removeExternalFile(fullPath: string): Promise<any> {
        const directory = fullPath.substring(0, fullPath.lastIndexOf('/')),
            filename = fullPath.substr(fullPath.lastIndexOf('/') + 1);

        return this.file.removeFile(directory, filename);
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
    getBasePathToDownload(): Promise<string> {
        return this.init().then(() => {
            if (this.platform.is('ios')) {
                // In iOS we want the internal URL (cdvfile://localhost/persistent/...).
                return this.file.resolveDirectoryUrl(this.basePath).then((dirEntry) => {
                    return dirEntry.toInternalURL();
                });
            } else {
                // In the other platforms we use the basePath as it is (file://...).
                return this.basePath;
            }
        });
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
    moveDir(originalPath: string, newPath: string, destDirExists?: boolean): Promise<any> {
        return this.moveFileOrDir(originalPath, newPath, true, destDirExists);
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
    moveFile(originalPath: string, newPath: string, destDirExists?: boolean): Promise<any> {
        return this.moveFileOrDir(originalPath, newPath, false, destDirExists);
    }

    /**
     * Move a file/dir.
     *
     * @param originalPath Path to the file/dir to move.
     * @param newPath New path of the file/dir.
     * @param isDir Whether it's a dir or a file.
     * @param destDirExists Set it to true if you know the directory where to put the file/dir exists. If false, the function will
     *                      try to create it (slower).
     * @return Promise resolved when the entry is moved.
     */
    protected moveFileOrDir(originalPath: string, newPath: string, isDir?: boolean, destDirExists?: boolean): Promise<any> {
        const moveFn = isDir ? this.file.moveDir.bind(this.file) : this.file.moveFile.bind(this.file);

        return this.init().then(() => {
            // Remove basePath if it's in the paths.
            originalPath = this.removeStartingSlash(originalPath.replace(this.basePath, ''));
            newPath = this.removeStartingSlash(newPath.replace(this.basePath, ''));

            const newPathFileAndDir = this.getFileAndDirectoryFromPath(newPath);

            if (newPathFileAndDir.directory && !destDirExists) {
                // Create the target directory if it doesn't exist.
                return this.createDir(newPathFileAndDir.directory);
            }
        }).then(() => {

            if (this.isHTMLAPI) {
                // In Cordova API we need to calculate the longest matching path to make it work.
                // The function this.file.moveFile('a/', 'b/c.ext', 'a/', 'b/d.ext') doesn't work.
                // The function this.file.moveFile('a/b/', 'c.ext', 'a/b/', 'd.ext') works.
                const dirsA = originalPath.split('/'),
                    dirsB = newPath.split('/');
                let commonPath = this.basePath;

                for (let i = 0; i < dirsA.length; i++) {
                    let dir = dirsA[i];
                    if (dirsB[i] === dir) {
                        // Found a common folder, add it to common path and remove it from each specific path.
                        dir = dir + '/';
                        commonPath = this.textUtils.concatenatePaths(commonPath, dir);
                        originalPath = originalPath.replace(dir, '');
                        newPath = newPath.replace(dir, '');
                    } else {
                        // Folder doesn't match, stop searching.
                        break;
                    }
                }

                return moveFn(commonPath, originalPath, commonPath, newPath);
            } else {
                return moveFn(this.basePath, originalPath, this.basePath, newPath).catch((error) => {
                    // The move can fail if the path has encoded characters. Try again if that's the case.
                    const decodedOriginal = decodeURI(originalPath),
                        decodedNew = decodeURI(newPath);

                    if (decodedOriginal != originalPath || decodedNew != newPath) {
                        return moveFn(this.basePath, decodedOriginal, this.basePath, decodedNew);
                    } else {
                        return Promise.reject(error);
                    }
                });
            }
        });
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
    copyDir(from: string, to: string, destDirExists?: boolean): Promise<any> {
        return this.copyFileOrDir(from, to, true, destDirExists);
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
    copyFile(from: string, to: string, destDirExists?: boolean): Promise<any> {
        return this.copyFileOrDir(from, to, false, destDirExists);
    }

    /**
     * Copy a file or a directory.
     *
     * @param from Path to the file/dir to move.
     * @param to New path of the file/dir.
     * @param isDir Whether it's a dir or a file.
     * @param destDirExists Set it to true if you know the directory where to put the file/dir exists. If false, the function will
     *                      try to create it (slower).
     * @return Promise resolved when the entry is copied.
     */
    protected copyFileOrDir(from: string, to: string, isDir?: boolean, destDirExists?: boolean): Promise<any> {
        let fromFileAndDir,
            toFileAndDir;
        const copyFn = isDir ? this.file.copyDir.bind(this.file) : this.file.copyFile.bind(this.file);

        return this.init().then(() => {
            // Paths cannot start with "/". Remove basePath if present.
            from = this.removeStartingSlash(from.replace(this.basePath, ''));
            to = this.removeStartingSlash(to.replace(this.basePath, ''));

            fromFileAndDir = this.getFileAndDirectoryFromPath(from);
            toFileAndDir = this.getFileAndDirectoryFromPath(to);

            if (toFileAndDir.directory && !destDirExists) {
                // Create the target directory if it doesn't exist.
                return this.createDir(toFileAndDir.directory);
            }
        }).then(() => {
            if (this.isHTMLAPI) {
                // In HTML API, the file name cannot include a directory, otherwise it fails.
                const fromDir = this.textUtils.concatenatePaths(this.basePath, fromFileAndDir.directory),
                    toDir = this.textUtils.concatenatePaths(this.basePath, toFileAndDir.directory);

                return copyFn(fromDir, fromFileAndDir.name, toDir, toFileAndDir.name);
            } else {
                return copyFn(this.basePath, from, this.basePath, to).catch((error) => {
                    // The copy can fail if the path has encoded characters. Try again if that's the case.
                    const decodedFrom = decodeURI(from),
                        decodedTo = decodeURI(to);

                    if (from != decodedFrom || to != decodedTo) {
                        return copyFn(this.basePath, decodedFrom, this.basePath, decodedTo);
                    } else {
                        return Promise.reject(error);
                    }
                });
            }
        });
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
    getFileAndDirectoryFromPath(path: string): any {
        const file = {
            directory: '',
            name: ''
        };

        file.directory = path.substring(0, path.lastIndexOf('/'));
        file.name = path.substr(path.lastIndexOf('/') + 1);

        return file;
    }

    /**
     * Get the internal URL of a file.
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
            return this.textUtils.concatenatePaths(this.basePath, path);
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
    unzipFile(path: string, destFolder?: string, onProgress?: Function, recreateDir: boolean = true): Promise<any> {
        // Get the source file.
        let fileEntry: FileEntry;

        return this.getFile(path).then((fe) => {
            fileEntry = fe;

            if (destFolder && recreateDir) {
                // Make sure the dest dir doesn't exist already.
                return this.removeDir(destFolder).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    // Now create the dir, otherwise if any of the ancestor dirs doesn't exist the unzip would fail.
                    return this.createDir(destFolder);
                });
            }
        }).then(() => {
            // If destFolder is not set, use same location as ZIP file. We need to use absolute paths (including basePath).
            destFolder = this.addBasePathIfNeeded(destFolder || this.mimeUtils.removeExtension(path));

            return this.zip.unzip(fileEntry.toURL(), destFolder, onProgress);
        }).then((result) => {
            if (result == -1) {
                return Promise.reject('Unzip failed.');
            }
        });
    }

    /**
     * Search a string or regexp in a file contents and replace it. The result is saved in the same file.
     *
     * @param path Path to the file.
     * @param search Value to search.
     * @param newValue New value.
     * @return Promise resolved in success.
     */
    replaceInFile(path: string, search: string | RegExp, newValue: string): Promise<any> {
        return this.readFile(path).then((content) => {
            if (typeof content == 'undefined' || content === null || !content.replace) {
                return Promise.reject(null);
            }

            if (content.match(search)) {
                content = content.replace(search, newValue);

                return this.writeFile(path, content);
            }
        });
    }

    /**
     * Get a file/dir metadata given the file's entry.
     *
     * @param fileEntry FileEntry retrieved from getFile or similar.
     * @return Promise resolved with metadata.
     */
    getMetadata(fileEntry: Entry): Promise<any> {
        if (!fileEntry || !fileEntry.getMetadata) {
            return Promise.reject(null);
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
    getMetadataFromPath(path: string, isDir?: boolean): Promise<any> {
        let promise;
        if (isDir) {
            promise = this.getDir(path);
        } else {
            promise = this.getFile(path);
        }

        return promise.then((entry) => {
            return this.getMetadata(entry);
        });
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
    protected copyOrMoveExternalFile(from: string, to: string, copy?: boolean): Promise<any> {
        // Get the file to copy/move.
        return this.getExternalFile(from).then((fileEntry) => {
            // Create the destination dir if it doesn't exist.
            const dirAndFile = this.getFileAndDirectoryFromPath(to);

            return this.createDir(dirAndFile.directory).then((dirEntry) => {
                // Now copy/move the file.
                return new Promise((resolve, reject): void => {
                    if (copy) {
                        fileEntry.copyTo(dirEntry, dirAndFile.name, resolve, reject);
                    } else {
                        fileEntry.moveTo(dirEntry, dirAndFile.name, resolve, reject);
                    }
                });
            });
        });
    }

    /**
     * Copy a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to copy.
     * @param to Relative new path of the file (inside the app folder).
     * @return Promise resolved when the entry is copied.
     */
    copyExternalFile(from: string, to: string): Promise<any> {
        return this.copyOrMoveExternalFile(from, to, true);
    }

    /**
     * Move a file from outside of the app folder to somewhere inside the app folder.
     *
     * @param from Absolute path to the file to move.
     * @param to Relative new path of the file (inside the app folder).
     * @return Promise resolved when the entry is moved.
     */
    moveExternalFile(from: string, to: string): Promise<any> {
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
    getUniqueNameInFolder(dirPath: string, fileName: string, defaultExt?: string): Promise<string> {
        // Get existing files in the folder.
        return this.getDirectoryContents(dirPath).then((entries) => {
            const files = {};
            let num = 1,
                fileNameWithoutExtension = this.mimeUtils.removeExtension(fileName),
                extension = this.mimeUtils.getFileExtension(fileName) || defaultExt,
                newName;

            // Clean the file name.
            fileNameWithoutExtension = this.textUtils.removeSpecialCharactersForFiles(
                this.textUtils.decodeURIComponent(fileNameWithoutExtension));

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

            newName = fileNameWithoutExtension + extension;
            if (typeof files[newName.toLowerCase()] == 'undefined') {
                // No file with the same name.
                return newName;
            } else {
                // Repeated name. Add a number until we find a free name.
                do {
                    newName = fileNameWithoutExtension + '(' + num + ')' + extension;
                    num++;
                } while (typeof files[newName] != 'undefined');

                // Ask the user what he wants to do.
                return newName;
            }
        }).catch(() => {
            // Folder doesn't exist, name is unique. Clean it and return it.
            return this.textUtils.removeSpecialCharactersForFiles(this.textUtils.decodeURIComponent(fileName));
        });
    }

    /**
     * Remove app temporary folder.
     *
     * @return Promise resolved when done.
     */
    clearTmpFolder(): Promise<any> {
        return this.removeDir(CoreFileProvider.TMPFOLDER).catch(() => {
            // Ignore errors because the folder might not exist.
        });
    }

    /**
     * Given a folder path and a list of used files, remove all the files of the folder that aren't on the list of used files.
     *
     * @param dirPath Folder path.
     * @param files List of used files.
     * @return Promise resolved when done, rejected if failure.
     */
    removeUnusedFiles(dirPath: string, files: any[]): Promise<any> {
        // Get the directory contents.
        return this.getDirectoryContents(dirPath).then((contents) => {
            if (!contents.length) {
                return;
            }

            const filesMap = {},
                promises = [];

            // Index the received files by fullPath and ignore the invalid ones.
            files.forEach((file) => {
                if (file.fullPath) {
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

            return Promise.all(promises);
        }).catch(() => {
            // Ignore errors, maybe it doesn't exist.
        });
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
     * Get the full path to the www folder at runtime.
     *
     * @return Path.
     */
    getWWWPath(): string {
        const position = window.location.href.indexOf('index.html');

        if (position != -1) {
            return window.location.href.substr(0, position);
        }

        return window.location.href;
    }
}
