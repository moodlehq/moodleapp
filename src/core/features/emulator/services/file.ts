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
import { File, Entry, DirectoryEntry, FileEntry, IWriteOptions, RemoveResult } from '@ionic-native/file/ngx';

import { CoreTextUtils } from '@services/utils/text';

/**
 * Implement the File Error because the ionic-native plugin doesn't implement it.
 */
class FileError {

    static readonly NOT_FOUND_ERR = 1;
    static readonly SECURITY_ERR = 2;
    static readonly ABORT_ERR = 3;
    static readonly NOT_READABLE_ERR = 4;
    static readonly ENCODING_ERR = 5;
    static readonly NO_MODIFICATION_ALLOWED_ERR = 6;
    static readonly INVALID_STATE_ERR = 7;
    static readonly SYNTAX_ERR = 8;
    static readonly INVALID_MODIFICATION_ERR = 9;
    static readonly QUOTA_EXCEEDED_ERR = 10;
    static readonly TYPE_MISMATCH_ERR = 11;
    static readonly PATH_EXISTS_ERR = 12;

    message?: string;

    constructor(
        public code: number,
    ) { }

}

/**
 * Emulates the Cordova File plugin in browser.
 * Most of the code is extracted from the File class of Ionic Native.
 */
@Injectable()
export class FileMock extends File {

    /**
     * Check if a directory exists in a certain path, directory.
     *
     * @param path Base FileSystem.
     * @param dir Name of directory to check
     * @return Returns a Promise that resolves to true if the directory exists or rejects with an error.
     */
    async checkDir(path: string, dir: string): Promise<boolean> {
        const fullPath = CoreTextUtils.concatenatePaths(path, dir);

        await this.resolveDirectoryUrl(fullPath);

        return true;
    }

    /**
     * Check if a file exists in a certain path, directory.
     *
     * @param path Base FileSystem.
     * @param file Name of file to check.
     * @return Returns a Promise that resolves with a boolean or rejects with an error.
     */
    async checkFile(path: string, file: string): Promise<boolean> {
        const entry = await this.resolveLocalFilesystemUrl(CoreTextUtils.concatenatePaths(path, file));

        if (entry.isFile) {
            return true;
        } else {
            const error = new FileError(13);
            error.message = 'input is not a file';

            throw error;
        }
    }

    /**
     * Copy a file or directory.
     *
     * @param srce The Entry to copy.
     * @param destDir The directory where to put the copy.
     * @param newName New name of the file/dir.
     * @return Returns a Promise that resolves to the new Entry object or rejects with an error.
     */
    private copyMock(srce: Entry, destDir: DirectoryEntry, newName: string): Promise<Entry> {
        return new Promise<Entry>((resolve, reject): void => {
            newName = newName.replace(/%20/g, ' '); // Replace all %20 with spaces.

            srce.copyTo(destDir, newName, (deste) => {
                resolve(deste);
            }, (err) => {
                this.fillErrorMessageMock(err);
                reject(err);
            });
        });
    }

    /**
     * Copy a directory in various methods. If destination directory exists, will fail to copy.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above.
     * @param dirName Name of directory to copy.
     * @param newPath Base FileSystem of new location.
     * @param newDirName New name of directory to copy to (leave blank to remain the same).
     * @return Returns a Promise that resolves to the new Entry object or rejects with an error.
     */
    copyDir(path: string, dirName: string, newPath: string, newDirName: string): Promise<Entry> {
        return this.copyFileOrDir(path, dirName, newPath, newDirName);
    }

    /**
     * Copy a file in various methods. If file exists, will fail to copy.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above
     * @param fileName Name of file to copy
     * @param newPath Base FileSystem of new location
     * @param newFileName New name of file to copy to (leave blank to remain the same)
     * @return Returns a Promise that resolves to an Entry or rejects with an error.
     */
    copyFile(path: string, fileName: string, newPath: string, newFileName: string): Promise<Entry> {
        return this.copyFileOrDir(path, fileName, newPath, newFileName || fileName);
    }

    /**
     * Copy a file or dir to a given path.
     *
     * @param sourcePath Path of the file/dir to copy.
     * @param sourceName Name of file/dir to copy
     * @param destPath Path where to copy.
     * @param destName New name of file/dir.
     * @return Returns a Promise that resolves to the new Entry or rejects with an error.
     */
    async copyFileOrDir(sourcePath: string, sourceName: string, destPath: string, destName: string): Promise<Entry> {
        const destFixed = this.fixPathAndName(destPath, destName);

        const source = await this.resolveLocalFilesystemUrl(CoreTextUtils.concatenatePaths(sourcePath, sourceName));

        const destParentDir = await this.resolveDirectoryUrl(destFixed.path);

        return this.copyMock(source, destParentDir, destFixed.name);
    }

    /**
     * Creates a new directory in the specific path.
     * The replace boolean value determines whether to replace an existing directory with the same name.
     * If an existing directory exists and the replace value is false, the promise will fail and return an error.
     *
     * @param path Base FileSystem.
     * @param dirName Name of directory to create
     * @param replace If true, replaces file with same name. If false returns error
     * @return Returns a Promise that resolves with a DirectoryEntry or rejects with an error.
     */
    async createDir(path: string, dirName: string, replace: boolean): Promise<DirectoryEntry> {
        const options: Flags = {
            create: true,
        };

        if (!replace) {
            options.exclusive = true;
        }

        const parentDir = await this.resolveDirectoryUrl(path);

        return this.getDirectory(parentDir, dirName, options);
    }

    /**
     * Creates a new file in the specific path.
     * The replace boolean value determines whether to replace an existing file with the same name.
     * If an existing file exists and the replace value is false, the promise will fail and return an error.
     *
     * @param path Base FileSystem.
     * @param fileName Name of file to create.
     * @param replace If true, replaces file with same name. If false returns error.
     * @return Returns a Promise that resolves to a FileEntry or rejects with an error.
     */
    async createFile(path: string, fileName: string, replace: boolean): Promise<FileEntry> {
        const options: Flags = {
            create: true,
        };

        if (!replace) {
            options.exclusive = true;
        }

        const parentDir = await this.resolveDirectoryUrl(path);

        return this.getFile(parentDir, fileName, options);
    }

    /**
     * Create a file writer for a certain file.
     *
     * @param fe File entry object.
     * @return Promise resolved with the FileWriter.
     */
    private createWriterMock(fe: FileEntry): Promise<FileWriter> {
        return new Promise<FileWriter>((resolve, reject): void => {
            fe.createWriter((writer) => {
                resolve(writer);
            }, (err) => {
                this.fillErrorMessageMock(err);
                reject(err);
            });
        });
    }

    /**
     * Fill the message for an error.
     *
     * @param error Error.
     */
    private fillErrorMessageMock(error: FileError): void {
        try {
            error.message = this.cordovaFileError[error.code];
        } catch (e) {
            // Ignore errors.
        }
    }

    /**
     * Get a directory.
     *
     * @param directoryEntry Directory entry, obtained by resolveDirectoryUrl method
     * @param directoryName Directory name
     * @param flags Options
     */
    getDirectory(directoryEntry: DirectoryEntry, directoryName: string, flags: Flags): Promise<DirectoryEntry> {
        return new Promise<DirectoryEntry>((resolve, reject): void => {
            try {
                directoryName = directoryName.replace(/%20/g, ' '); // Replace all %20 with spaces.

                directoryEntry.getDirectory(directoryName, flags, (de) => {
                    resolve(de);
                }, (err) => {
                    this.fillErrorMessageMock(err);
                    reject(err);
                });
            } catch (xc) {
                this.fillErrorMessageMock(xc);
                reject(xc);
            }
        });
    }

    /**
     * Get a file.
     *
     * @param directoryEntry Directory entry, obtained by resolveDirectoryUrl method
     * @param fileName File name
     * @param flags Options
     */
    getFile(directoryEntry: DirectoryEntry, fileName: string, flags: Flags): Promise<FileEntry> {
        return new Promise<FileEntry>((resolve, reject): void => {
            try {
                fileName = fileName.replace(/%20/g, ' '); // Replace all %20 with spaces.

                directoryEntry.getFile(fileName, flags, resolve, (err) => {
                    this.fillErrorMessageMock(err);
                    reject(err);
                });
            } catch (xc) {
                this.fillErrorMessageMock(xc);
                reject(xc);
            }
        });
    }

    /**
     * Get free disk space.
     *
     * @return Promise resolved with the free space.
     */
    async getFreeDiskSpace(): Promise<number> {
        // Request a file system instance with a minimum size until we get an error.
        if (window.requestFileSystem) {
            let iterations = 0;
            let maxIterations = 50;
            const calculateByRequest = (size: number, ratio: number): Promise<number> =>
                new Promise((resolve): void => {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, size, () => {
                        iterations++;
                        if (iterations > maxIterations) {
                            resolve(size);

                            return;
                        }
                        // eslint-disable-next-line promise/catch-or-return
                        calculateByRequest(size * ratio, ratio).then(resolve);
                    }, () => {
                        resolve(size / ratio);
                    });
                });

            // General calculation, base 1MB and increasing factor 1.3.
            let size = await calculateByRequest(1048576, 1.3);

            // More accurate. Factor is 1.1.
            iterations = 0;
            maxIterations = 10;

            size = await calculateByRequest(size, 1.1);

            return size / 1024; // Return size in KB.

        } else {
            throw new Error('File system not available.');
        }
    }

    /**
     * List files and directory from a given path.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above
     * @param dirName Name of directory
     * @return Returns a Promise that resolves to an array of Entry objects or rejects with an error.
     */
    async listDir(path: string, dirName: string): Promise<Entry[]> {
        const parentDir = await this.resolveDirectoryUrl(path);

        const dirEntry = await this.getDirectory(parentDir, dirName, { create: false, exclusive: false });

        return this.readEntriesMock(dirEntry.createReader());
    }

    /**
     * Loads an initialize the API for browser.
     *
     * @return Promise resolved when loaded.
     */
    load(): Promise<string> {
        return new Promise((resolve, reject): void => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const win = <any> window; // Convert to <any> to be able to use non-standard properties.

            if (typeof win.requestFileSystem == 'undefined') {
                win.requestFileSystem = win.webkitRequestFileSystem;
            }
            if (typeof win.resolveLocalFileSystemURL == 'undefined') {
                win.resolveLocalFileSystemURL = win.webkitResolveLocalFileSystemURL;
            }
            win.LocalFileSystem = {
                PERSISTENT: 1, // eslint-disable-line @typescript-eslint/naming-convention
            };

            // Request a quota to use. Request 500MB.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> navigator).webkitPersistentStorage.requestQuota(500 * 1024 * 1024, (granted) => {
                window.requestFileSystem(LocalFileSystem.PERSISTENT, granted, (entry) => {
                    resolve(entry.root.toURL());
                }, reject);
            }, reject);
        });
    }

    /**
     * Move a file or directory.
     *
     * @param srce The Entry to copy.
     * @param destDir The directory where to move the file/dir.
     * @param newName New name of the file/dir.
     * @return Returns a Promise that resolves to the new Entry object or rejects with an error.
     */
    private moveMock(srce: Entry, destDir: DirectoryEntry, newName: string): Promise<Entry> {
        return new Promise<Entry>((resolve, reject): void => {
            newName = newName.replace(/%20/g, ' '); // Replace all %20 with spaces.

            srce.moveTo(destDir, newName, (deste) => {
                resolve(deste);
            }, (err) => {
                this.fillErrorMessageMock(err);
                reject(err);
            });
        });
    }

    /**
     * Move a directory to a given path.
     *
     * @param path The source path to the directory.
     * @param dirName The source directory name.
     * @param newPath The destionation path to the directory.
     * @param newDirName The destination directory name.
     * @return Returns a Promise that resolves to the new DirectoryEntry object or rejects with
     *         an error.
     */
    moveDir(path: string, dirName: string, newPath: string, newDirName: string): Promise<DirectoryEntry | Entry> {
        return this.moveFileOrDir(path, dirName, newPath, newDirName);
    }

    /**
     * Move a file to a given path.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above
     * @param fileName Name of file to move
     * @param newPath Base FileSystem of new location
     * @param newFileName New name of file to move to (leave blank to remain the same)
     * @return Returns a Promise that resolves to the new Entry or rejects with an error.
     */
    moveFile(path: string, fileName: string, newPath: string, newFileName: string): Promise<Entry> {
        return this.moveFileOrDir(path, fileName, newPath, newFileName || fileName);
    }

    /**
     * Move a file or dir to a given path.
     *
     * @param sourcePath Path of the file/dir to copy.
     * @param sourceName Name of file/dir to copy
     * @param destPath Path where to copy.
     * @param destName New name of file/dir.
     * @return Returns a Promise that resolves to the new Entry or rejects with an error.
     */
    async moveFileOrDir(sourcePath: string, sourceName: string, destPath: string, destName: string): Promise<Entry> {
        const destFixed = this.fixPathAndName(destPath, destName);

        const source = await this.resolveLocalFilesystemUrl(CoreTextUtils.concatenatePaths(sourcePath, sourceName));

        const destParentDir = await this.resolveDirectoryUrl(destFixed.path);

        return this.moveMock(source, destParentDir, destFixed.name);
    }

    /**
     * Fix a path and name, making sure the name doesn't contain any folder. If it does, the folder will be moved to the path.
     *
     * @param path Path to fix.
     * @param name Name to fix.
     * @return Fixed values.
     */
    protected fixPathAndName(path: string, name: string): {path: string; name: string} {

        const fullPath = CoreTextUtils.concatenatePaths(path, name);

        return {
            path: fullPath.substring(0, fullPath.lastIndexOf('/')),
            name: fullPath.substr(fullPath.lastIndexOf('/') + 1),
        };
    }

    /**
     * Read file and return data as an ArrayBuffer.
     *
     * @param path Base FileSystem.
     * @param file Name of file, relative to path.
     * @return Returns a Promise that resolves with the contents of the file as ArrayBuffer or rejects
     *         with an error.
     */
    readAsArrayBuffer(path: string, file: string): Promise<ArrayBuffer> {
        return this.readFileMock<ArrayBuffer>(path, file, 'ArrayBuffer');
    }

    /**
     * Read file and return data as a binary data.
     *
     * @param path Base FileSystem.
     * @param file Name of file, relative to path.
     * @return Returns a Promise that resolves with the contents of the file as string rejects with an error.
     */
    readAsBinaryString(path: string, file: string): Promise<string> {
        return this.readFileMock<string>(path, file, 'BinaryString');
    }

    /**
     * Read file and return data as a base64 encoded data url.
     * A data url is of the form:
     *      data: [<mediatype>][;base64],<data>
     *
     * @param path Base FileSystem.
     * @param file Name of file, relative to path.
     * @return Returns a Promise that resolves with the contents of the file as data URL or rejects
     *         with an error.
     */
    readAsDataURL(path: string, file: string): Promise<string> {
        return this.readFileMock<string>(path, file, 'DataURL');
    }

    /**
     * Read the contents of a file as text.
     *
     * @param path Base FileSystem.
     * @param file Name of file, relative to path.
     * @return Returns a Promise that resolves with the contents of the file as string or rejects with an error.
     */
    readAsText(path: string, file: string): Promise<string> {
        return this.readFileMock<string>(path, file, 'Text');
    }

    /**
     * Read all the files and directories inside a directory.
     *
     * @param directoryReader The directory reader.
     * @return Promise resolved with the list of files/dirs.
     */
    private readEntriesMock(directoryReader: DirectoryReader): Promise<Entry[]> {
        return new Promise<Entry[]>((resolve, reject): void => {
            directoryReader.readEntries((entries: Entry[]) => {
                resolve(entries);
            }, (error: FileError) => {
                this.fillErrorMessageMock(error);
                reject(error);
            });
        });
    }

    /**
     * Read the contents of a file.
     *
     * @param path Base FileSystem.
     * @param file Name of file, relative to path.
     * @param readAs Format to read as.
     * @return Returns a Promise that resolves with the contents of the file or rejects with an error.
     */
    private async readFileMock<T>(
        path: string,
        file: string,
        readAs: 'ArrayBuffer' | 'BinaryString' | 'DataURL' | 'Text',
    ): Promise<T> {
        const directoryEntry = await this.resolveDirectoryUrl(path);

        const fileEntry = await this.getFile(directoryEntry, file, { create: false });

        const reader = new FileReader();

        return new Promise<T>((resolve, reject): void => {
            reader.onloadend = (): void => {
                if (reader.result !== undefined || reader.result !== null) {
                    resolve(<T> <unknown> reader.result);
                } else if (reader.error !== undefined || reader.error !== null) {
                    reject(reader.error);
                } else {
                    reject({ code: null, message: 'READER_ONLOADEND_ERR' });
                }
            };

            fileEntry.file((file) => {
                reader[`readAs${readAs}`].call(reader, file);
            }, (error) => {
                reject(error);
            });
        });
    }

    /**
     * Delete a file.
     *
     * @param entry The file to remove.
     * @return Promise resolved when done.
     */
    private removeMock(entry: Entry): Promise<RemoveResult> {
        return new Promise<RemoveResult>((resolve, reject): void => {
            entry.remove(() => {
                resolve({ success: true, fileRemoved: entry });
            }, (err) => {
                this.fillErrorMessageMock(err);
                reject(err);
            });
        });
    }

    /**
     * Remove a directory at a given path.
     *
     * @param path The path to the directory.
     * @param dirName The directory name.
     * @return Returns a Promise that resolves to a RemoveResult or rejects with an error.
     */
    async removeDir(path: string, dirName: string): Promise<RemoveResult> {
        const parentDir = await this.resolveDirectoryUrl(path);

        const dirEntry = await this.getDirectory(parentDir, dirName, { create: false });

        return this.removeMock(dirEntry);
    }

    /**
     * Removes a file from a desired location.
     *
     * @param path Base FileSystem.
     * @param fileName Name of file to remove.
     * @return Returns a Promise that resolves to a RemoveResult or rejects with an error.
     */
    async removeFile(path: string, fileName: string): Promise<RemoveResult> {
        const parentDir = await this.resolveDirectoryUrl(path);

        const fileEntry = await this.getFile(parentDir, fileName, { create: false });

        return this.removeMock(fileEntry);
    }

    /**
     * Removes all files and the directory from a desired location.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above
     * @param dirName Name of directory
     * @return Returns a Promise that resolves with a RemoveResult or rejects with an error.
     */
    async removeRecursively(path: string, dirName: string): Promise<RemoveResult> {
        const parentDir = await this.resolveDirectoryUrl(path);

        const dirEntry = await this.getDirectory(parentDir, dirName, { create: false });

        return this.rimrafMock(dirEntry);
    }

    /**
     * Resolves a local directory url.
     *
     * @param directoryUrl directory system url
     */
    async resolveDirectoryUrl(directoryUrl: string): Promise<DirectoryEntry> {
        const dirEntry = await this.resolveLocalFilesystemUrl(directoryUrl);

        if (dirEntry.isDirectory) {
            return <DirectoryEntry> dirEntry;
        } else {
            const error = new FileError(13);
            error.message = 'input is not a directory';

            throw error;
        }
    }

    /**
     * Resolves a local file system URL.
     *
     * @param fileUrl file system url
     */
    resolveLocalFilesystemUrl(fileUrl: string): Promise<Entry> {
        return new Promise<Entry>((resolve, reject): void => {
            try {
                window.resolveLocalFileSystemURL(fileUrl, (entry: Entry) => {
                    resolve(entry);
                }, (error: FileError) => {
                    this.fillErrorMessageMock(error);
                    reject(error);
                });
            } catch (error) {
                this.fillErrorMessageMock(error);
                reject(error);
            }
        });
    }

    /**
     * Remove a directory and all its contents.
     *
     * @param de Directory to remove.
     * @return Promise resolved when done.
     */
    private rimrafMock(de: DirectoryEntry): Promise<RemoveResult> {
        return new Promise<RemoveResult>((resolve, reject): void => {
            de.removeRecursively(() => {
                resolve({ success: true, fileRemoved: de });
            }, (err) => {
                this.fillErrorMessageMock(err);
                reject(err);
            });
        });
    }

    /**
     * Write some data in a file.
     *
     * @param writer File writer.
     * @param data The data to write.
     * @return Promise resolved when done.
     */
    protected writeMock(writer: FileWriter, data: string | Blob | ArrayBuffer): Promise<void> {
        if (data instanceof Blob) {
            return this.writeFileInChunksMock(writer, data);
        }

        if (data instanceof ArrayBuffer) {
            // Convert to string.
            data = String.fromCharCode.apply(null, new Uint8Array(data));
        }

        return new Promise<void>((resolve, reject) => {
            writer.onwriteend = (): void => {
                if (writer.error) {
                    reject(writer.error);
                } else {
                    resolve();
                }
            };
            writer.write(<string> data);
        });
    }

    /**
     * Write to an existing file.
     *
     * @param path Base FileSystem.
     * @param fileName path relative to base path.
     * @param text content or blob to write.
     * @return Returns a Promise that resolves or rejects with an error.
     */
    async writeExistingFile(path: string, fileName: string, text: string | Blob): Promise<void> {
        await this.writeFile(path, fileName, text, { replace: true });
    }

    /**
     * Write a new file to the desired location.
     *
     * @param path Base FileSystem. Please refer to the iOS and Android filesystems above
     * @param fileName path relative to base path
     * @param text content or blob to write
     * @param options replace file if set to true. See WriteOptions for more information.
     * @return Returns a Promise that resolves to updated file entry or rejects with an error.
     */
    async writeFile(
        path: string,
        fileName: string,
        text: string | Blob | ArrayBuffer,
        options: IWriteOptions = {},
    ): Promise<FileEntry> {
        const getFileOpts: Flags = {
            create: !options.append,
            exclusive: !options.replace,
        };

        const parentDir = await this.resolveDirectoryUrl(path);

        const fileEntry = await this.getFile(parentDir, fileName, getFileOpts);

        return this.writeFileEntryMock(fileEntry, text, options);
    }

    /**
     * Write content to FileEntry.
     *
     * @param fe File entry object.
     * @param text Content or blob to write.
     * @param options replace file if set to true. See WriteOptions for more information.
     * @return Returns a Promise that resolves to updated file entry or rejects with an error.
     */
    private writeFileEntryMock(
        fileEntry: FileEntry,
        text: string | Blob | ArrayBuffer,
        options: IWriteOptions,
    ): Promise<FileEntry> {
        return this.createWriterMock(fileEntry).then((writer) => {
            if (options.append) {
                writer.seek(writer.length);
            }

            if (options.truncate) {
                writer.truncate(options.truncate);
            }

            return this.writeMock(writer, text);
        }).then(() => fileEntry);
    }

    /**
     * Write a file in chunks.
     *
     * @param writer File writer.
     * @param data Data to write.
     * @return Promise resolved when done.
     */
    private writeFileInChunksMock(writer: FileWriter, data: Blob): Promise<void> {
        let writtenSize = 0;
        const BLOCK_SIZE = 1024 * 1024;
        const writeNextChunk = () => {
            const size = Math.min(BLOCK_SIZE, data.size - writtenSize);
            const chunk = data.slice(writtenSize, writtenSize + size);

            writtenSize += size;
            writer.write(chunk);
        };

        return new Promise<void>((resolve, reject): void => {
            writer.onerror = reject;
            writer.onwriteend = (): void => {
                if (writtenSize < data.size) {
                    writeNextChunk();
                } else {
                    resolve();
                }
            };
            writeNextChunk();
        });
    }

}
