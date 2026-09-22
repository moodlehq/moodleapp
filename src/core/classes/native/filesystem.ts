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

import { Encoding } from '@capacitor/filesystem';
import { Filesystem } from '@singletons';
import { CoreMimetype } from '@static/mimetype';
import { CorePath } from '@static/path';

/**
 * File or directory entry class to keep backwards compatibility with Cordova.
 */
export class Entry {

    isFile: boolean;
    isDirectory: boolean;
    name: string;

    /**
     * @deprecated since 6.0. Use toURL() instead. This property will be protected in the future.
     */
    nativeURL: string;

    /**
     * @deprecated since 6.0. Use toURL() instead.
     */
    fullPath: string;

    /**
     * @deprecated since 6.0. A stub is set to avoid crashes, but it won't work.
     */
    filesystem: unknown;

    /**
     * Create an Entry.
     *
     * @param isDirectory Whether this entry represents a directory.
     * @param absoluteUrl Absolute URL of the entry.
     */
    constructor(isDirectory: boolean, absoluteUrl: string) {
        this.isFile = !isDirectory;
        this.isDirectory = isDirectory;

        // Paths can be encoded. Make sure the name is decoded.
        const encodedName = absoluteUrl.substring(absoluteUrl.lastIndexOf('/') + 1);
        try {
            this.name = decodeURIComponent(encodedName);
        } catch {
            this.name = encodedName;
        }

        this.nativeURL = absoluteUrl; // eslint-disable-line @typescript-eslint/no-deprecated

        this.fullPath = absoluteUrl; // eslint-disable-line @typescript-eslint/no-deprecated
        this.filesystem = { // eslint-disable-line @typescript-eslint/no-deprecated
            name: 'persistent',
            root: null,
            toJSON: () => '',
            encodeURIPath: (path: string): string => encodeURI(path),
        };
    }

    /**
     * Look up metadata.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.getMetadata instead.
     */
    getMetadata(successCallback: MetadataCallback, errorCallback?: ErrorCallback): void {
        // eslint-disable-next-line promise/always-return
        Filesystem.stat({ path: this.toURL() }).then((stat) => {
            successCallback({
                modificationTime: new Date(stat.mtime),
                size: stat.size,
            });
        }).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

    /**
     * Set metadata.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @param metadataObject Metadata values.
     * @deprecated since 6.0. This function won't work anymore.
     */
    setMetadata(successCallback: MetadataCallback, errorCallback: ErrorCallback, metadataObject: Metadata): void {
        void successCallback;
        void metadataObject;
        errorCallback(this.toFileError('setMetadata is not implemented.'));
    }

    /**
     * Move this entry to a new parent.
     *
     * @param parent Destination directory.
     * @param newName New name.
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.moveFile or CoreFile.moveDir instead.
     */
    moveTo(
        parent: DirectoryEntry,
        newName?: string,
        successCallback?: EntryCallback,
        errorCallback?: ErrorCallback,
    ): void {
        const targetNativeURL = CorePath.concatenatePaths(parent.toURL(), newName || this.name);

        Filesystem.rename({
            from: this.toURL(),
            to: targetNativeURL,
        }).then(() => {
            // eslint-disable-next-line promise/always-return
            successCallback?.(this.isDirectory ? new DirectoryEntry(targetNativeURL) : new FileEntry(targetNativeURL));
        }).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

    /**
     * Copy this entry to a new parent.
     *
     * @param parent Destination directory.
     * @param newName New name.
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.copyFile or CoreFile.copyDir instead.
     */
    copyTo(
        parent: DirectoryEntry,
        newName?: string,
        successCallback?: EntryCallback,
        errorCallback?: ErrorCallback,
    ): void {
        const targetNativeURL = CorePath.concatenatePaths(parent.toURL(), newName || this.name);

        Filesystem.copy({
            from: this.toURL(),
            to: targetNativeURL,
        }).then(() => {
            // eslint-disable-next-line promise/always-return
            successCallback?.(this.isDirectory ? new DirectoryEntry(targetNativeURL) : new FileEntry(targetNativeURL));
        }).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

    /**
     * Get a URL for this entry.
     *
     * @returns Entry URL.
     */
    toURL(): string {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return this.nativeURL;
    }

    /**
     * Get an internal URL for this entry.
     *
     * @returns Entry internal URL.
     * @deprecated since 6.0. Use toURL() instead.
     */
    toInternalURL(): string {
        return this.toURL();
    }

    /**
     * Remove this entry.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.removeFile or CoreFile.removeDir instead.
     */
    remove(successCallback: VoidCallback, errorCallback?: ErrorCallback): void {
        const removePromise = this.isDirectory
            ? Filesystem.rmdir({ path: this.toURL(), recursive: false })
            : Filesystem.deleteFile({ path: this.toURL() });

        removePromise.then(() => successCallback()).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

    /**
     * Get parent directory.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.getDir with the parent path instead.
     */
    getParent(successCallback: DirectoryEntryCallback, errorCallback?: ErrorCallback): void {
        const parentPath = this.getParentPath(this.toURL());

        // eslint-disable-next-line promise/always-return
        Filesystem.stat({ path: parentPath }).then(() => {
            successCallback(new DirectoryEntry(parentPath));
        }).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

    /**
     * Get the parent path for a given path.
     *
     * @param path Absolute or full path.
     * @returns Parent path.
     */
    protected getParentPath(path: string): string {
        const normalized = path.replace(/\/+$/, '');
        if (!normalized) {
            return '/';
        }

        if (!normalized.includes('/')) {
            return normalized;
        }

        const index = normalized.lastIndexOf('/');
        if (index <= 0) {
            return '/';
        }

        return normalized.substring(0, index);
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

}

/**
 * File entry class to keep backwards compatibility with Cordova.
 */
export class FileEntry extends Entry {

    /**
     * Create a FileEntry.
     *
     * @param absoluteUrl Absolute URL of the entry.
     */
    constructor(absoluteUrl: string) {
        super(false, absoluteUrl);
    }

    /**
     * Create a writer for this entry.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. This function won't work anymore. To write in a file, use CoreFile.writeFile.
     */
    createWriter(successCallback: () => void, errorCallback?: ErrorCallback): void {
        void successCallback;
        errorCallback?.(this.toFileError('createWriter is not implemented.'));
    }

    /**
     * Get this entry file object.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.getFileObjectFromFileEntry instead.
     */
    file(successCallback: FileCallback, errorCallback?: ErrorCallback): void {
        const extension = CoreMimetype.getFileExtension(this.name);
        const mimeType = (extension && CoreMimetype.getMimeType(extension)) || 'application/octet-stream';

        Promise.all([
            Filesystem.readFile({ path: this.toURL() }),
            Filesystem.stat({ path: this.toURL() }),
        ]).then(([readResult, stat]) => {
            const blobPromise = typeof readResult.data === 'string'
                ? Promise.resolve(base64ToBlob(readResult.data, mimeType))
                // eslint-disable-next-line promise/no-nesting
                : readResult.data.arrayBuffer().then((buffer) => new Blob([buffer], { type: mimeType }));

            return blobPromise.then((blob) => ({ blob, stat }));
        // eslint-disable-next-line promise/always-return
        }).then(({ blob, stat }) => {
            // @todo Capacitor: Test this after cordova plugin file has been removed, plugin overrides File class.
            const file = new File([blob], this.name, {
                type: blob.type,
                lastModified: stat.mtime,
            });

            Object.assign(file, {
                localURL: this.toURL(),
                start: 0,
                end: blob.size,
                lastModifiedDate: stat.mtime,
            });

            successCallback(file);
        }).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

}

/**
 * Directory entry class to keep backwards compatibility with Cordova.
 */
export class DirectoryEntry extends Entry {

    /**
     * Create a DirectoryEntry.
     *
     * @param absoluteUrl Absolute URL of the entry.
     */
    constructor(absoluteUrl: string) {
        super(true, absoluteUrl);
    }

    /**
     * Create a reader for this entry.
     *
     * @deprecated since 6.0. This function won't work anymore. To read a directory, use CoreFile.getDirectoryContents.
     */
    createReader(): never {
        throw new Error('createReader is not implemented.');
    }

    /**
     * Create or resolve a child file.
     *
     * @param path Child path.
     * @param options Create flags.
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.getFile instead.
     */
    getFile(path: string, options?: Flags, successCallback?: FileEntryCallback, errorCallback?: ErrorCallback): void {
        const childNativeURL = CorePath.concatenatePaths(this.toURL(), path);

        Filesystem.stat({ path: childNativeURL }).then((stat) => {
            if (stat.type !== 'file') {
                errorCallback?.(this.toFileError('Path points to a directory.'));

                return;
            }

            if (options?.create && options.exclusive) {
                errorCallback?.(this.toFileError('Path already exists.'));

                return;
            }

            // eslint-disable-next-line promise/always-return
            successCallback?.(new FileEntry(childNativeURL));
        }).catch(async (error) => {
            if (!options?.create) {
                errorCallback?.(this.toFileError(error));

                return;
            }

            try {
                await Filesystem.writeFile({
                    path: childNativeURL,
                    data: '',
                    encoding: Encoding.UTF8,
                    recursive: true,
                });

                successCallback?.(new FileEntry(childNativeURL));
            } catch (createError) {
                errorCallback?.(this.toFileError(createError));
            }
        });
    }

    /**
     * Create or resolve a child directory.
     *
     * @param path Child path.
     * @param options Create flags.
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.getDir instead.
     */
    getDirectory(
        path: string,
        options?: Flags,
        successCallback?: DirectoryEntryCallback,
        errorCallback?: ErrorCallback,
    ): void {
        const childNativeURL = CorePath.concatenatePaths(this.toURL(), path);

        Filesystem.stat({ path: childNativeURL }).then((stat) => {
            if (stat.type !== 'directory') {
                errorCallback?.(this.toFileError('Path points to a file.'));

                return;
            }

            if (options?.create && options.exclusive) {
                errorCallback?.(this.toFileError('Path already exists.'));

                return;
            }

            // eslint-disable-next-line promise/always-return
            successCallback?.(new DirectoryEntry(childNativeURL));
        }).catch(async (error) => {
            if (!options?.create) {
                errorCallback?.(this.toFileError(error));

                return;
            }

            try {
                await Filesystem.mkdir({
                    path: childNativeURL,
                    recursive: true,
                });

                successCallback?.(new DirectoryEntry(childNativeURL));
            } catch (createError) {
                errorCallback?.(this.toFileError(createError));
            }
        });
    }

    /**
     * Remove this directory recursively.
     *
     * @param successCallback Success callback.
     * @param errorCallback Error callback.
     * @deprecated since 6.0. Use CoreFile.removeDir instead.
     */
    removeRecursively(successCallback: VoidCallback, errorCallback?: ErrorCallback): void {
        Filesystem.rmdir({
            path: this.toURL(),
            recursive: true,
        }).then(() => successCallback()).catch((error) => {
            errorCallback?.(this.toFileError(error));
        });
    }

}

/**
 * Convert base64 data to Blob.
 *
 * @param base64 Base64 payload.
 * @param mimeType Blob mime type.
 * @returns Blob instance.
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
}

/**
 * Error object returned by the filesystem operations.
 */
export type FileError = {
    code: number | string;
    message: string;
};

/**
 * File metadata.
 */
export type Metadata = {
    /**
     * This is the time at which the file or directory was last modified.
     */
    modificationTime: Date;
    /**
     * The size of the file, in bytes. This must return 0 for directories.
     */
    size: number;
};

/**
 * Flags to indicate whether to create a missing file.
 */
type Flags = {
    /**
     * Used to indicate that the user wants to create a file or directory if it was not previously there.
     */
    create?: boolean;
    /**
     * By itself, exclusive must have no effect. Used with create, it must cause getFile and getDirectory to fail if the
     * target path already exists.
     */
    exclusive?: boolean;
};

type EntryCallback = (entry: Entry) => void;
type FileEntryCallback = (entry: FileEntry) => void;
type DirectoryEntryCallback = (entry: DirectoryEntry) => void;
type MetadataCallback = (metadata: Metadata) => void;
type FileCallback = (file: File) => void;
type VoidCallback = () => void;
type ErrorCallback = (err: FileError) => void;
