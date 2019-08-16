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

import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';

/**
 * This file includes all the classes needed to emulate file system in NodeJS (desktop apps).
 */

/**
 * Emulate Entry object of the Cordova file plugin using NodeJS functions.
 * It includes fileSystem and nativeURL as the Cordova plugin does, but they aren't used.
 */
export class EntryMock {

    protected fs = require('fs');

    constructor(protected textUtils: CoreTextUtilsProvider, protected mimeUtils: CoreMimetypeUtilsProvider, public isFile: boolean,
            public isDirectory: boolean, public name: string = '', public fullPath: string = '', public fileSystem?: FileSystem,
            public nativeURL?: string) { }

    /**
     * Copy the file or directory.
     *
     * @param {Entry} parent The folder where to move the file to.
     * @param {string} newName The new name for the file.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    copyTo(parent: Entry, newName: string, successCallback: Function, errorCallback: Function): void {
        newName = newName || this.name;

        // There is no function to copy a file, read the source and write the dest.
        const srcPath = this.fullPath,
            destPath = this.textUtils.concatenatePaths(parent.fullPath, newName),
            reader = this.fs.createReadStream(srcPath),
            writer = this.fs.createWriteStream(destPath);

        // Use a promise to make sure only one callback is called.
        new Promise((resolve, reject): void => {
            reader.on('error', reject);

            writer.on('error', reject);

            writer.on('close', resolve);

            reader.pipe(writer);
        }).then(() => {
            const constructor = this.isDirectory ? DirectoryEntryMock : FileEntryMock;
            successCallback && successCallback(
                    new constructor(this.textUtils, this.mimeUtils, newName, destPath));
        }).catch((error) => {
            errorCallback && errorCallback(error);
        });
    }

    /**
     * Get the entry's metadata.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    getMetadata(successCallback: Function, errorCallback: Function): void {
        this.fs.stat(this.fullPath, (err, stats) => {
            if (err) {
                errorCallback && errorCallback(err);
            } else {
                successCallback && successCallback({
                    size: stats.size,
                    modificationTime: stats.mtime
                });
            }
        });
    }

    /**
     * Get the parent directory.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    getParent(successCallback: Function, errorCallback: Function): void {
        // Remove last slash if present and get the path of the parent.
        const fullPath = this.fullPath.slice(-1) == '/' ? this.fullPath.slice(0, -1) : this.fullPath,
            parentPath = fullPath.substr(0, fullPath.lastIndexOf('/'));

        // Check that parent exists.
        this.fs.stat(parentPath, (err, stats) => {
            if (err || !stats.isDirectory()) {
                errorCallback && errorCallback(err);
            } else {
                const fileName = parentPath.substr(parentPath.lastIndexOf('/') + 1);
                successCallback && successCallback(
                        new DirectoryEntryMock(this.textUtils, this.mimeUtils, fileName, parentPath));
            }
        });
    }

    /**
     * Move the file or directory.
     *
     * @param {Entry} parent The folder where to move the file to.
     * @param {string} newName The new name for the file.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    moveTo(parent: Entry, newName: string, successCallback: Function, errorCallback: Function): void {
        newName = newName || this.name;

        const srcPath = this.fullPath,
            destPath = this.textUtils.concatenatePaths(parent.fullPath, newName);

        this.fs.rename(srcPath, destPath, (err) => {
            if (err) {
                errorCallback && errorCallback(err);
            } else {
                const constructor = this.isDirectory ? DirectoryEntryMock : FileEntryMock;
                successCallback && successCallback(
                        new constructor(this.textUtils, this.mimeUtils, newName, destPath));
            }
        });
    }

    /**
     * Remove the entry.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    remove(successCallback: Function, errorCallback: Function): void {
        const removeFn = this.isDirectory ? this.fs.rmdir : this.fs.unlink;
        removeFn(this.fullPath, (err) => {
            if (err < 0) {
                errorCallback && errorCallback(err);
            } else {
                successCallback && successCallback();
            }
        });
    }

    /**
     * Set the entry's metadata.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     * @param {any} metadataObject The metadata to set.
     */
    setMetadata(successCallback: Function, errorCallback: Function, metadataObject: any): void {
        // Not supported.
        errorCallback && errorCallback('Not supported');
    }

    /**
     * Get the internal URL of the Entry.
     *
     * @return {string} Internal URL.
     */
    toInternalURL(): string {
        return 'file://' + this.fullPath;
    }

    /**
     * Get the URL of the Entry.
     *
     * @return {string} URL.
     */
    toURL(): string {
        return this.fullPath;
    }
}

/**
 * Emulate DirectoryEntry object of the Cordova file plugin using NodeJS functions.
 */
export class DirectoryEntryMock extends EntryMock {

    constructor(textUtils: CoreTextUtilsProvider, mimeUtils: CoreMimetypeUtilsProvider, name: string = '', fullPath: string = '',
            fileSystem?: FileSystem, nativeURL?: string) {

        super(textUtils, mimeUtils, false, true, name, fullPath, fileSystem, nativeURL);

        // Add trailing slash if it is missing.
        if ((this.fullPath) && !/\/$/.test(this.fullPath)) {
            this.fullPath += '/';
        }
        if (this.nativeURL && !/\/$/.test(this.nativeURL)) {
            this.nativeURL += '/';
        }
    }

    /**
     * Create reader.
     *
     * @return {DirectoryReader} Reader.
     */
    createReader(): DirectoryReader {
        return new DirectoryReaderMock(this.textUtils, this.mimeUtils, this.fullPath);
    }

    /**
     * Delete an empty folder.
     *
     * @param {string} path Path of the folder.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    protected deleteEmptyFolder(path: string, successCallback: Function, errorCallback: Function): void {
        this.fs.rmdir(path, (err) => {
            if (err) {
                // Error removing directory.
                errorCallback && errorCallback(err);
            } else {
                successCallback && successCallback();
            }
        });
    }

    /**
     * Get a directory inside this directory entry.
     *
     * @param {string} path Path of the dir.
     * @param {any} options Options.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    getDirectory(path: string, options: any, successCallback: Function, errorCallback: Function): void {
        this.getDirOrFile(true, path, options, successCallback, errorCallback);
    }

    /**
     * Helper function for getDirectory and getFile.
     *
     * @param {boolean} isDir True if getting a directory, false if getting a file.
     * @param {string} path Path of the file or dir.
     * @param {any} options Options.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    protected getDirOrFile(isDir: boolean, path: string, options: any, successCallback: Function, errorCallback: Function): void {

        // Success, return the DirectoryEntry or FileEntry.
        const success = (): void => {
            const constructor = isDir ? DirectoryEntryMock : FileEntryMock;
            successCallback && successCallback(
                    new constructor(this.textUtils, this.mimeUtils, fileName, fileDirPath));
        };

        // Create the file/dir.
        const create = (done): void => {
            if (isDir) {
                this.fs.mkdir(fileDirPath, done);
            } else {
                this.fs.writeFile(fileDirPath, '', done);
            }
        };

        const fileName = path.substr(path.lastIndexOf('/') + 1),
            fileDirPath = this.textUtils.concatenatePaths(this.fullPath, path);

        // Check if file/dir exists.
        this.fs.stat(fileDirPath, (err) => {
            if (err) {
                if (options.create) {
                    // File/Dir probably doesn't exist, create it.
                    create((error2) => {
                        if (!error2) {
                            // File created successfully, return it.
                            success();
                        } else if (error2.code === 'EEXIST') {
                            // File exists, success.
                            success();
                        } else if (error2.code === 'ENOENT') {
                            // Seems like the parent doesn't exist, create it too.
                            const parent = fileDirPath.substring(0, fileDirPath.lastIndexOf('/'));

                            if (parent) {
                                this.getDirectory(parent, options, () => {
                                    // Parent created, try to create the child again.
                                    create((error3) => {
                                        if (!error3) {
                                            success();
                                        } else {
                                            errorCallback && errorCallback(error3);
                                        }
                                    });
                                }, errorCallback);
                            } else {
                                errorCallback && errorCallback(error2);
                            }
                        } else {
                            errorCallback && errorCallback(error2);
                        }
                    });
                } else {
                    errorCallback && errorCallback(err);
                }
            } else {
                success();
            }
        });
    }

    /**
     * Get a file inside this directory entry.
     *
     * @param {string} path Path of the dir.
     * @param {any} options Options.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    getFile(path: string, options: any, successCallback: Function, errorCallback: Function): void {
        this.getDirOrFile(false, path, options, successCallback, errorCallback);
    }

    /**
     * Remove the directory and all its contents.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    removeRecursively(successCallback: Function, errorCallback: Function): void {
        // Use a promise to make sure only one callback is called.
        new Promise((resolve, reject): void => {
            this.removeRecursiveFn(this.fullPath, resolve, reject);
        }).then(() => {
            successCallback && successCallback();
        }).catch((error) => {
            errorCallback && errorCallback(error);
        });
    }

    /**
     * Delete a file or folder recursively.
     *
     * @param {string} path Path of the folder.
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    protected removeRecursiveFn(path: string, successCallback: Function, errorCallback: Function): void {
        // Check if it exists.
        this.fs.stat(path, (err, stats) => {
            if (err) {
                // File not found, reject.
                errorCallback && errorCallback(err);
            } else if (stats.isFile()) {
                // It's a file, remove it.
                this.fs.unlink(path, (err) => {
                    if (err) {
                        // Error removing file, reject.
                        errorCallback && errorCallback(err);
                    } else {
                        successCallback && successCallback();
                    }
                });
            } else {
                // It's a directory, read the contents.
                this.fs.readdir(path, (err, files) => {
                    if (err) {
                        // Error reading directory contents, reject.
                        errorCallback && errorCallback(err);
                    } else if (!files.length) {
                        // No files to delete, delete the folder.
                        this.deleteEmptyFolder(path, successCallback, errorCallback);
                    } else {
                        // Remove all the files and directories.
                        let removed = 0;
                        files.forEach((filename) => {
                            this.removeRecursiveFn(this.textUtils.concatenatePaths(path, filename), () => {
                                // Success deleting the file/dir.
                                removed++;
                                if (removed == files.length) {
                                    // All files deleted, delete the folder.
                                    this.deleteEmptyFolder(path, successCallback, errorCallback);
                                }
                            }, errorCallback);
                        });
                    }
                });
            }
        });
    }
}

/**
 * Emulate FileEntry object of the Cordova file plugin using NodeJS functions.
 */
export class FileEntryMock extends EntryMock {

    constructor(textUtils: CoreTextUtilsProvider, mimeUtils: CoreMimetypeUtilsProvider, name: string = '', fullPath: string = '',
            fileSystem?: FileSystem, nativeURL?: string) {

        super(textUtils, mimeUtils, true, false, name, fullPath, fileSystem, nativeURL);

        // Remove trailing slash if it is present.
        if (this.fullPath && /\/$/.test(this.fullPath)) {
            this.fullPath = this.fullPath.substring(0, this.fullPath.length - 1);
        }
        if (this.nativeURL && /\/$/.test(this.nativeURL)) {
            this.nativeURL = this.nativeURL.substring(0, this.nativeURL.length - 1);
        }
    }

    /**
     * Create writer.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    createWriter(successCallback: Function, errorCallback: Function): void {
        this.file((file) => {
            successCallback && successCallback(new FileWriterMock(this.textUtils, this.mimeUtils, file));
        }, errorCallback);
    }

    /**
     * Get the file data.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    file(successCallback: Function, errorCallback: Function): void {
        // Get the metadata to know the time modified.
        this.getMetadata((metadata) => {
            // Read the file.
            this.fs.readFile(this.fullPath, (err, data) => {
                if (err) {
                    errorCallback && errorCallback(err);
                } else {
                    // Create a File instance and return it.
                    data = Uint8Array.from(data).buffer; // Convert the NodeJS Buffer to ArrayBuffer.

                    const file: any = new File([data], this.name || '', {
                        lastModified: metadata.modificationTime || null,
                        type: this.mimeUtils.getMimeType(this.mimeUtils.getFileExtension(this.name)) || null
                    });
                    file.localURL = this.fullPath;
                    file.start = 0;
                    file.end = file.size;

                    successCallback && successCallback(file);
                }
            });
        }, errorCallback);
    }
}

/**
 * Emulate DirectoryReader object of the Cordova file plugin using NodeJS functions.
 */
export class DirectoryReaderMock implements DirectoryReader {

    protected fs = require('fs');

    constructor(protected textUtils: CoreTextUtilsProvider, protected mimeUtils: CoreMimetypeUtilsProvider,
            protected localURL: string = null) { }

    /**
     * Read entries inside a folder.
     *
     * @param {Function} successCallback Success callback.
     * @param {Function} errorCallback Error callback.
     */
    readEntries(successCallback: Function, errorCallback: Function): void {
        this.fs.readdir(this.localURL, (err, files) => {
            if (err) {
                errorCallback && errorCallback(err);
            } else {
                // Use try/catch because it includes sync calls.
                try {
                    const entries = [];

                    for (let i = 0; i < files.length; i++) {
                        const fileName = files[i],
                            filePath = this.textUtils.concatenatePaths(this.localURL, fileName),
                            stats = this.fs.statSync(filePath); // Use sync function to make code simpler.

                        if (stats.isDirectory()) {
                            entries.push(new DirectoryEntryMock(this.textUtils, this.mimeUtils, fileName,
                                    filePath));
                        } else if (stats.isFile()) {
                            entries.push(new FileEntryMock(this.textUtils, this.mimeUtils, fileName, filePath));
                        }
                    }

                    successCallback && successCallback(entries);
                } catch (ex) {
                    errorCallback && errorCallback(ex);
                }
            }
        });
    }
}

/**
 * Emulate FileWriter object of the Cordova file plugin using NodeJS functions.
 */
export class FileWriterMock {

    protected fs = require('fs');

    fileName = '';
    length = 0;
    localURL: string;
    size = 0;
    position = 0; // Default is to write at the beginning of the file.
    readyState = 0; // EMPTY.
    result: any = null;
    error: any = null;

    // Event handlers.
    onwritestart: (event?: ProgressEvent) => void; // When writing starts.
    onprogress: (event?: ProgressEvent) => void;   // While writing the file, and reporting partial file data.
    onwrite: (event?: ProgressEvent) => void;      // When the write has successfully completed.
    onwriteend: (event?: ProgressEvent) => void;   // When the request has completed (either in success or failure).
    onabort: (event?: ProgressEvent) => void;      // When the write has been aborted.
    onerror: (event?: ProgressEvent) => void;      // When the write has failed (see errors).

    constructor(protected textUtils: CoreTextUtilsProvider, protected mimeUtils: CoreMimetypeUtilsProvider, protected file: any) {

        if (file) {
            this.localURL = file.localURL || file;
            this.length = file.size || 0;
        }
    }

    /**
     * Terminate file operation.
     */
    abort(): void {
        // Not supported.
    }

    /**
     * The file position at which the next write will occur.
     *
     * @param {number} offset If nonnegative, an absolute byte offset into the file.
     *                        If negative, an offset back from the end of the file.
     */
    seek(offset: number): void {
        this.position = offset;
    }

    /**
     * Changes the length of the file to that specified. If shortening the file, data beyond the new length
     * will be discarded. If extending the file, the existing data will be zero-padded up to the new length.
     *
     * @param {number} size The size to which the length of the file is to be adjusted, measured in bytes.
     */
    truncate(size: number): void {
        this.size = size;
    }

    /**
     * Write some data into the file.
     *
     * @param {any} data The data to write.
     */
    write(data: any): void {
        if (data && data.toString() == '[object Blob]') {
            // Can't write Blobs, convert it to a Buffer.
            const reader = new FileReader();
            reader.onload = (): void => {
                if (reader.readyState == 2) {
                    this.writeFile(new Buffer(reader.result));
                }
            };
            reader.readAsArrayBuffer(data);
        } else if (data && data.toString() == '[object ArrayBuffer]') {
            // Convert it to a Buffer.
            data = new Uint8Array(data);
            this.writeFile(Buffer.from(data));
        } else {
            this.writeFile(data);
        }
    }

    /**
     * Write some data into the file.
     *
     * @param {Buffer} data The data to write.
     */
    protected writeFile(data: Buffer): void {
        /* Create a write stream so we can specify where to start writing. Node's Writable stream doesn't allow specifying the
           position once it's been created, that's why we need to create it everytime write is called. */
        const stream = this.fs.createWriteStream(this.localURL, {flags: 'r+', start: this.position});

        stream.on('error', (err) => {
            this.onerror && this.onerror(err);
        });

        stream.end(data, () => {
            // Update the position.
            this.position += data.length;

            this.onwrite && this.onwrite();
            this.onwriteend && this.onwriteend();

            stream.destroy();
        });

        this.onwritestart && this.onwritestart();
    }
}
