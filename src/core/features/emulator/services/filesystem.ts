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

/* eslint-disable @typescript-eslint/no-deprecated */

import { CoreBytesConstants } from '@/core/constants';
import type { PluginListenerHandle } from '@capacitor/core';
import {
    type AppendFileOptions,
    type CopyOptions,
    type CopyResult,
    type DeleteFileOptions,
    type DownloadFileOptions,
    type DownloadFileResult,
    Encoding,
    type FilesystemPlugin,
    type GetUriOptions,
    type GetUriResult,
    type MkdirOptions,
    type PermissionStatus,
    type ProgressListener,
    type ReadFileInChunksCallback,
    type ReadFileInChunksOptions,
    type ReadFileOptions,
    type ReadFileResult,
    type ReaddirOptions,
    type ReaddirResult,
    type RenameOptions,
    type RmdirOptions,
    type StatOptions,
    type StatResult,
    type WriteFileOptions,
    type WriteFileResult,
} from '@capacitor/filesystem';
import { type FileError } from '@/core/classes/native/filesystem';

/**
 * Native APIs used in webkit window.
 *
 * @deprecated since 4.4
 * The requestFileSystem functions are deprecated and not supported in all browsers.
 * But we decided to keep them for now because:
 *
 * -Capacitor implementation uses IndexedDB, which can cause problems with big files or when embedding files (we would need to
 * convert every embedded file to base64).
 * -The recommended alternative is OPFS, but we cannot use it with the --disable-web-security flag in Chrome 147+.
 *
 * We could explore using the File System Access API, where the user picks the folder to grant access to.
 */
interface WebkitWindow {

    /**
     * @deprecated since 4.4
     * @see https://www.w3.org/TR/2012/WD-file-system-api-20120417/
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    LocalFileSystem: {
        readonly TEMPORARY: number; // eslint-disable-line @typescript-eslint/naming-convention
        readonly PERSISTENT: number; // eslint-disable-line @typescript-eslint/naming-convention
    };

    /**
     * @deprecated since 4.4
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestFileSystem
     */
    requestFileSystem(
        type: LocalFileSystem,
        size: number,
        successCallback: (fileSystem: FileSystemWithToURL) => void,
        errorCallback?: (fileError: FileError) => void,
    ): void;

    /**
     * @deprecated since 4.4
     */
    webkitRequestFileSystem(
        type: LocalFileSystem,
        size: number,
        successCallback: (fileSystem: FileSystemWithToURL) => void,
        errorCallback?: (fileError: FileError) => void,
    ): void;

    /**
     * @deprecated since 4.4
     * @see https://www.w3.org/TR/2012/WD-file-system-api-20120417/
     */
    resolveLocalFileSystemURL(
        url: string,
        successCallback: (entry: Entry) => void,
        errorCallback?: (fileError: FileError) => void,
    ): void;

    /**
     * @deprecated since 4.4
     */
    webkitResolveLocalFileSystemURL(
        url: string,
        successCallback: (entry: Entry) => void,
        errorCallback?: (fileError: FileError) => void,
    ): void;

}

type FileSystemWithToURL = Omit<FileSystem, 'root'> & {
    root: FileSystemDirectoryEntryWithToURL;
};

type FileSystemDirectoryEntryWithToURL = FileSystemDirectoryEntry & {
    toURL(): string;
};

/**
 * Emulates the Capacitor Filesystem plugin in browser.
 */
export class FilesystemMock implements FilesystemPlugin {

    protected loadingPromise?: Promise<string>;

    /**
     * Check read/write permissions.
     *
     * @returns Permission status.
     */
    async checkPermissions(): Promise<PermissionStatus> {
        return {
            publicStorage: 'granted',
        };
    }

    /**
     * Request read/write permissions.
     *
     * @returns Permission status.
     */
    async requestPermissions(): Promise<PermissionStatus> {
        return {
            publicStorage: 'granted',
        };
    }

    /**
     * Read a file from disk.
     *
     * @param options Read options.
     * @returns File contents.
     */
    async readFile(options: ReadFileOptions): Promise<ReadFileResult> {
        if (this.isTextEncoding(options.encoding)) {
            return {
                data: await this.readFileAs<string>(options.path, 'Text'),
            };
        }

        const dataUrl = await this.readFileAs<string>(options.path, 'DataURL');

        return {
            data: this.extractBase64(dataUrl),
        };
    }

    /**
     * Read a file from disk, in chunks.
     *
     * @param options Read options.
     * @param callback Callback to receive read chunks.
     * @returns Callback ID.
     */
    async readFileInChunks(options: ReadFileInChunksOptions, callback: ReadFileInChunksCallback): Promise<string> {
        const callbackId = `mock-${Date.now()}`;

        try {
            const result = await this.readFile(options);
            callback(result);
            callback(null);
        } catch (error) {
            callback(null, error);
        }

        return callbackId;
    }

    /**
     * Write a new file to the desired location.
     *
     * @param options Write options.
     * @returns Result containing the file URI.
     */
    async writeFile(options: WriteFileOptions): Promise<WriteFileResult> {
        const fileEntry = await this.getFileOrDir(options.path, true, {
            create: true,
            recursive: options.recursive,
        });

        const writeData = this.isTextEncoding(options.encoding)
            ? options.data
            : this.base64ToBlob(options.data);

        await this.writeFileEntry(fileEntry, writeData, false);

        return {
            uri: fileEntry.toURL(),
        };
    }

    /**
     * Append to a file on disk in the specified location.
     *
     * @param options Append options.
     */
    async appendFile(options: AppendFileOptions): Promise<void> {
        const fileEntry = await this.getFileOrDir(options.path, true, {
            create: true,
        });

        const writeData = this.isTextEncoding(options.encoding)
            ? options.data
            : this.base64ToBlob(options.data);

        await this.writeFileEntry(fileEntry, writeData, true);
    }

    /**
     * Delete a file from disk.
     *
     * @param options Delete options.
     */
    async deleteFile(options: DeleteFileOptions): Promise<void> {
        let fileEntry: FileEntry;
        try {
            fileEntry = await this.getFileOrDir(options.path, true, { create: false });
        } catch {
            return;
        }

        await this.removeEntry(fileEntry);
    }

    /**
     * Create a directory.
     *
     * @param options Mkdir options.
     */
    async mkdir(options: MkdirOptions): Promise<void> {
        await this.getFileOrDir(options.path, true, { create: true, recursive: options.recursive });
    }

    /**
     * Remove a directory.
     *
     * @param options Rmdir options.
     */
    async rmdir(options: RmdirOptions): Promise<void> {

        let dirEntry: DirectoryEntry;
        try {
            dirEntry = await this.getFileOrDir(options.path, false, { create: false });
        } catch {
            return;
        }

        if (options.recursive) {
            await this.removeRecursively(dirEntry);
        } else {
            await this.removeEntry(dirEntry);
        }
    }

    /**
     * Return a list of files from the directory (not recursive).
     *
     * @param options Readdir options.
     * @returns Files in the directory.
     */
    async readdir(options: ReaddirOptions): Promise<ReaddirResult> {
        const dirEntry = await this.getFileOrDir(options.path, false, { create: false });

        const entries = await this.readEntries(dirEntry.createReader());

        const files = await Promise.all(entries.map((entry) => this.stat({ path: entry.toURL() })));

        return { files };
    }

    /**
     * Return full file URI for a path and directory.
     *
     * @param options GetUri options.
     * @returns URI.
     */
    async getUri(options: GetUriOptions): Promise<GetUriResult> {
        return { uri: options.path };
    }

    /**
     * Return data about a file.
     *
     * @param options Stat options.
     * @returns File information.
     */
    async stat(options: StatOptions): Promise<StatResult> {
        const entry = await this.resolveLocalFilesystemUrl(options.path);
        const metadata = await this.getMetadata(entry);

        return {
            name: entry.name,
            type: entry.isDirectory ? 'directory' : 'file',
            size: metadata.size,
            ctime: metadata.modificationTime.getTime(),
            mtime: metadata.modificationTime.getTime(),
            uri: entry.toURL(),
        };
    }

    /**
     * Rename a file or directory.
     *
     * @param options Rename options.
     */
    async rename(options: RenameOptions): Promise<void> {
        const source = await this.resolveLocalFilesystemUrl(options.from);

        const { directory, name } = this.splitPath(options.to);

        const destParentDir = await this.getFileOrDir(directory, false, { create: true });

        await this.moveEntry(source, destParentDir, name);
    }

    /**
     * Copy a file or directory.
     *
     * @param options Copy options.
     * @returns Copy result.
     */
    async copy(options: CopyOptions): Promise<CopyResult> {
        const source = await this.resolveLocalFilesystemUrl(options.from);

        const { directory, name } = this.splitPath(options.to);

        const destParentDir = await this.getFileOrDir(directory, false, { create: true });

        const entry = await this.copyEntry(source, destParentDir, name);

        return {
            uri: entry.toURL(),
        };
    }

    /**
     * Download a file and save it in the target path.
     *
     * @param options Download options.
     * @returns Download result.
     */
    async downloadFile(options: DownloadFileOptions): Promise<DownloadFileResult> {
        // @todo Capacitor: Evaluate when migrating File-Transfer.
        void options;
        throw new Error('downloadFile not implemented.');
    }

    /**
     * Add a listener for file download progress events.
     *
     * @param eventName Event name.
     * @param listenerFunc Listener callback.
     * @returns Listener handle.
     */
    async addListener(eventName: 'progress', listenerFunc: ProgressListener): Promise<PluginListenerHandle> {
        // @todo Capacitor: Evaluate when migrating File-Transfer.
        void eventName;
        void listenerFunc;
        throw new Error('addListener not implemented.');
    }

    /**
     * Remove all listeners for this plugin.
     */
    async removeAllListeners(): Promise<void> {
        // @todo Capacitor: Evaluate when migrating File-Transfer.
        return;
    }

    /**
     * Creates a new directory in a directory. The parent directory must exist.
     *
     * @param parentDirPath The parent directory where to create the new directory.
     * @param name Name of directory to create.
     * @returns New DirectoryEntry object.
     */
    protected async createDir(parentDirPath: string, name: string): Promise<DirectoryEntry> {
        const parentDir = await this.resolveDirectoryUrl(parentDirPath);

        return new Promise<DirectoryEntry>((resolve, reject): void => {
            parentDir.getDirectory(name, { create: true }, (dirEntry) => {
                resolve(dirEntry);
            }, (dirError) => {
                reject(this.toFileError(dirError));
            });
        });
    }

    /**
     * Creates a new file in a directory. The directory must exist.
     *
     * @param parentDirPath Directory path.
     * @param name Name of file to create.
     * @returns FileEntry.
     */
    protected async createFile(parentDirPath: string, name: string): Promise<FileEntry> {
        const parentDir = await this.resolveDirectoryUrl(parentDirPath);

        return new Promise<FileEntry>((resolve, reject): void => {
            parentDir.getFile(name, { create: true }, (fileEntry) => {
                resolve(fileEntry);
            }, (fileError) => {
                reject(this.toFileError(fileError));
            });
        });
    }

    /**
     * Copy a file or directory.
     *
     * @param srce The Entry to copy.
     * @param destDir The directory where to put the copy.
     * @param newName New name of the file/dir.
     * @returns Returns a Promise that resolves to the new Entry object or rejects with an error.
     */
    protected copyEntry(srce: Entry, destDir: DirectoryEntry, newName: string): Promise<Entry> {
        return new Promise<Entry>((resolve, reject): void => {
            newName = newName.replace(/%20/g, ' '); // Replace all %20 with spaces.

            srce.copyTo(destDir, newName, (deste) => {
                resolve(deste);
            }, (err) => {
                reject(this.toFileError(err));
            });
        });
    }

    /**
     * Create a file writer for a certain file.
     *
     * @param fe File entry object.
     * @returns Promise resolved with the FileWriter.
     */
    protected createWriter(fe: FileEntry): Promise<FileWriter> {
        return new Promise<FileWriter>((resolve, reject): void => {
            fe.createWriter((writer) => {
                resolve(writer);
            }, (err) => {
                reject(this.toFileError(err));
            });
        });
    }

    /**
     * Convert a value to a FileError-shaped object.
     *
     * @param error Error value.
     * @returns FileError-like object.
     */
    protected toFileError(error: unknown): FileError {
        let code: string | number = -1;
        let message = 'Unknown error.';

        if (error && typeof error === 'object') {
            const maybeFileError = error as Partial<FileError>;

            code = 'code' in maybeFileError ? maybeFileError.code ?? code : code;
            message = 'message' in maybeFileError ? maybeFileError.message ?? message : message;
        } else if (typeof error === 'string') {
            message = error;
        }

        return {
            code,
            message,
        };
    }

    /**
     * Get a file entry or directory entry.
     *
     * @param path File path.
     * @param isFile Whether to get a file (true) or directory (false).
     * @param options Options for creating the file.
     * @returns Promise resolved with the file entry.
     */
    protected async getFileOrDir(path: string, isFile: true, options?: GetFileOrDirOptions): Promise<FileEntry>;
    protected async getFileOrDir(path: string, isFile: false, options?: GetFileOrDirOptions): Promise<DirectoryEntry>;
    protected async getFileOrDir(
        path: string,
        isFile?: boolean,
        options?: GetFileOrDirOptions,
    ): Promise<FileEntry|DirectoryEntry> {
        path = path.replace(/%20/g, ' '); // Replace all %20 with spaces.

        try {
            const entry = await this.resolveLocalFilesystemUrl(path);

            if (isFile && entry.isDirectory) {
                throw new Error('Expected a file but found a directory.');
            } else if (!isFile && entry.isFile) {
                throw new Error('Expected a directory but found a file.');
            }

            return entry;
        } catch (error) {
            if (!options?.create) {
                throw error;
            }

            const { directory, name } = this.splitPath(path);

            if (!name) {
                throw error;
            }

            if (options?.recursive && directory && directory !== '/') {
                await this.getFileOrDir(directory, false, { create: true, recursive: true });
            }

            if (isFile) {
                return await this.createFile(directory, name);
            } else {
                return await this.createDir(directory, name);
            }

        }
    }

    /**
     * Loads an initialize the API for browser.
     *
     * @returns Promise resolved when loaded.
     */
    load(): Promise<string> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = new Promise((resolve, reject): void => {
            const window = this.getEmulatorWindow();

            if (window.requestFileSystem === undefined) {
                window.requestFileSystem = window.webkitRequestFileSystem;
            }
            if (window.resolveLocalFileSystemURL === undefined) {
                window.resolveLocalFileSystemURL = window.webkitResolveLocalFileSystemURL;
            }
            window.LocalFileSystem = {
                TEMPORARY: 0, // eslint-disable-line @typescript-eslint/naming-convention
                PERSISTENT: 1, // eslint-disable-line @typescript-eslint/naming-convention
            };

            // Request a quota to use.
            navigator.storage.estimate().then((estimated) => {
                const quota = estimated.quota;
                if (!quota) {
                    reject();

                    return;
                }

                window.requestFileSystem(window.LocalFileSystem.PERSISTENT, quota, (fileSystem) => {
                    resolve(fileSystem.root.toURL());
                }, reject);

                return;
            }).catch(() => {
                reject();
            });
        });

        return this.loadingPromise;
    }

    /**
     * Move a file or directory.
     *
     * @param srce The Entry to copy.
     * @param destDir The directory where to move the file/dir.
     * @param newName New name of the file/dir.
     * @returns Returns a Promise that resolves to the new Entry object or rejects with an error.
     */
    protected moveEntry(srce: Entry, destDir: DirectoryEntry, newName: string): Promise<Entry> {
        return new Promise<Entry>((resolve, reject): void => {
            newName = newName.replace(/%20/g, ' '); // Replace all %20 with spaces.

            srce.moveTo(destDir, newName, (deste) => {
                resolve(deste);
            }, (err) => {
                reject(this.toFileError(err));
            });
        });
    }

    /**
     * Read all the files and directories inside a directory.
     *
     * @param directoryReader The directory reader.
     * @returns Promise resolved with the list of files/dirs.
     */
    protected readEntries(directoryReader: DirectoryReader): Promise<Entry[]> {
        return new Promise<Entry[]>((resolve, reject): void => {
            directoryReader.readEntries((entries: Entry[]) => {
                resolve(entries);
            }, (error) => {
                reject(this.toFileError(error));
            });
        });
    }

    /**
     * Read the contents of a file with a certain format.
     *
     * @param path File path.
     * @param readAs Format to read as.
     * @returns Returns a Promise that resolves with the contents of the file or rejects with an error.
     */
    protected async readFileAs<T>(
        path: string,
        readAs: 'ArrayBuffer' | 'BinaryString' | 'DataURL' | 'Text',
    ): Promise<T> {
        const fileEntry = await this.resolveLocalFilesystemUrl(path) as FileEntry;

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
     * Delete a file or directory.
     *
     * @param entry The entry to remove.
     * @returns Promise resolved when done.
     */
    protected removeEntry(entry: Entry): Promise<void> {
        return new Promise((resolve, reject): void => {
            entry.remove(() => resolve(), (err) => {
                reject(this.toFileError(err));
            });
        });
    }

    /**
     * Delete a directory and its contents recursively.
     *
     * @param entry The directory to remove.
     * @returns Promise resolved when done.
     */
    protected removeRecursively(entry: DirectoryEntry): Promise<void> {
        return new Promise((resolve, reject): void => {
            entry.removeRecursively(() => resolve(), (err) => {
                reject(this.toFileError(err));
            });
        });
    }

    /**
     * Resolves a local directory url.
     *
     * @param directoryUrl Directory system url.
     * @returns Promise resolved with the file system Entry referred to by local URL
     */
    protected async resolveDirectoryUrl(directoryUrl: string): Promise<DirectoryEntry> {
        const dirEntry = await this.resolveLocalFilesystemUrl(directoryUrl);

        if (dirEntry.isDirectory) {
            return <DirectoryEntry> dirEntry;
        } else {
            throw this.toFileError('input is not a directory');
        }
    }

    /**
     * Resolves a local file system URL.
     *
     * @param fileUrl file system url.
     * @returns Promise resolved with the file system Entry referred to by local URL
     */
    protected resolveLocalFilesystemUrl(fileUrl: string): Promise<FileEntry|DirectoryEntry> {
        return new Promise((resolve, reject): void => {
            try {
                this.getEmulatorWindow().resolveLocalFileSystemURL(fileUrl, (entry) => {
                    resolve(<FileEntry|DirectoryEntry> entry);
                }, (error: FileError) => {
                    reject(this.toFileError(error));
                });
            } catch (error) {
                reject(this.toFileError(error));
            }
        });
    }

    /**
     * Write some data in a file using an existing writer.
     *
     * @param writer File writer.
     * @param data The data to write.
     * @returns Promise resolved when done.
     */
    protected writeFileWithWriter(writer: FileWriter, data: string | Blob | ArrayBuffer): Promise<void> {
        if (data instanceof Blob) {
            return this.writeFileWithWriterInChunks(writer, data);
        }

        if (data instanceof ArrayBuffer) {
            // Convert to string.
            data = String.fromCharCode(...new Uint8Array(data));
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
     * Write content to FileEntry.
     *
     * @param fileEntry File entry object.
     * @param text Content or blob to write.
     * @param append Whether to append file contents.
     * @returns Returns a Promise that resolves to updated file entry or rejects with an error.
     */
    protected async writeFileEntry(
        fileEntry: FileEntry,
        text: string | Blob | ArrayBuffer,
        append = false,
    ): Promise<FileEntry> {
        const writer = await this.createWriter(fileEntry);

        if (append) {
            writer.seek(writer.length);
        }

        await this.writeFileWithWriter(writer, text);

        return fileEntry;
    }

    /**
     * Split a full path into directory path and name.
     *
     * @param fullPath Full path.
     * @returns Directory path and name.
     */
    protected splitPath(fullPath: string): { directory: string; name: string } {
        const normalizedPath = fullPath.replace(/\/+$/, '');
        const separatorIndex = normalizedPath.lastIndexOf('/');

        if (separatorIndex === -1) {
            return {
                directory: '',
                name: normalizedPath,
            };
        }

        if (separatorIndex === 0) {
            return {
                directory: '/',
                name: normalizedPath.substring(1),
            };
        }

        return {
            directory: normalizedPath.substring(0, separatorIndex),
            name: normalizedPath.substring(separatorIndex + 1),
        };
    }

    /**
     * Check whether the encoding should be treated as text.
     *
     * @param encoding Encoding value.
     * @returns Whether the payload should be treated as text.
     */
    protected isTextEncoding(encoding?: Encoding): boolean {
        return encoding === Encoding.UTF8 || encoding === Encoding.ASCII || encoding === Encoding.UTF16;
    }

    /**
     * Get metadata from an entry.
     *
     * @param entry Entry.
     * @returns Metadata.
     */
    protected getMetadata(entry: Entry): Promise<Metadata> {
        return new Promise((resolve, reject): void => {
            entry.getMetadata(resolve, reject);
        });
    }

    /**
     * Extract base64 payload from a data URL.
     *
     * @param dataUrl Data URL.
     * @returns Base64 payload.
     */
    protected extractBase64(dataUrl: string): string {
        const commaIndex = dataUrl.indexOf(',');

        return commaIndex === -1 ? dataUrl : dataUrl.substring(commaIndex + 1);
    }

    /**
     * Convert base64 data to a Blob.
     *
     * @param data Base64 string or Blob.
     * @returns Blob with the decoded data.
     */
    protected base64ToBlob(data: string | Blob): Blob {
        if (data instanceof Blob) {
            return data;
        }

        const base64 = this.extractBase64(data);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes]);
    }

    /**
     * Write a file using an existing writer in chunks.
     *
     * @param writer File writer.
     * @param data Data to write.
     * @returns Promise resolved when done.
     */
    protected writeFileWithWriterInChunks(writer: FileWriter, data: Blob): Promise<void> {
        let writtenSize = 0;
        const BLOCK_SIZE = CoreBytesConstants.MEGABYTE;
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

    /**
     * Get emulator window.
     *
     * @returns Emulator window.
     */
    protected getEmulatorWindow(): WebkitWindow {
        return window as unknown as WebkitWindow;
    }

}

type GetFileOrDirOptions = {
    /**
     * Whether to create the file or directory if it doesn't exist.
     */
    create?: boolean;

    /**
     * Whether to create parent directories if they don't exist.
     */
    recursive?: boolean;
};
