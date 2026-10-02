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

import { CoreFileEntry } from '@services/file-helper';
import { FileEntry } from '@classes/native/filesystem';
import { Translate } from '@singletons';

/**
 *  Helpers to interact with the file system.
 */
export class CoreFileUtils {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Check if a file is a FileEntry
     *
     * @param file File.
     * @returns Type guard indicating if the file is a FileEntry.
     */
    static isFileEntry(file: CoreFileEntry): file is FileEntry {
        return 'isFile' in file;
    }

    /**
     * Check if an unknown value is a FileEntry.
     *
     * @param file Object to check.
     * @returns Type guard indicating if the file is a FileEntry.
     */
    static valueIsFileEntry(file: unknown): file is FileEntry {
        // We cannot use instanceof because FileEntry is a type. Check some of the properties.
        return !!(file && typeof file === 'object' && 'isFile' in file && 'filesystem' in file &&
            'toInternalURL' in file && 'copyTo' in file);
    }

    /**
     * Given a list of files, check if there are repeated names.
     *
     * @param files List of files.
     * @returns String with error message if repeated, false if no repeated.
     */
    static hasRepeatedFilenames(files: CoreFileEntry[]): string | false {
        if (!files || !files.length) {
            return false;
        }

        const names: string[] = [];

        // Check if there are 2 files with the same name.
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = (CoreFileUtils.isFileEntry(file) ? file.name : file.filename) || '';

            if (names.includes(name)) {
                return Translate.instant('core.filenameexist', { $a: name });
            }

            names.push(name);
        }

        return false;
    }

    /**
     * Extract the file name and directory from a given path.
     *
     * @param path Path to be extracted.
     * @returns Plain object containing the file name and directory.
     * @description
     * file.pdf         -> directory: '', name: 'file.pdf'
     * /file.pdf        -> directory: '', name: 'file.pdf'
     * path/file.pdf    -> directory: 'path', name: 'file.pdf'
     * path/            -> directory: 'path', name: ''
     * path             -> directory: '', name: 'path'
     */
    static getFileAndDirectoryFromPath(path: string): { directory: string; name: string } {
        const file = {
            directory: '',
            name: '',
        };

        file.directory = path.substring(0, path.lastIndexOf('/'));
        file.name = path.substring(path.lastIndexOf('/') + 1);

        return file;
    }

    /**
     * Transform a file object to Blob.
     *
     * @param fileEntry File to transform.
     * @returns Promise resolved with the Blob.
     */
    static filetoBlob(fileEntry: File): Promise<Blob> {
        // @todo Capacitor: Still needed? File inherits from Blob. Check after remove cordova plugin.
        return new Promise((resolve, reject): void => {
            const reader = new FileReader();
            reader.onload = () => {
                if (!reader.result) {
                    reject(new Error('FileReader returned no result.'));

                    return;
                }
                resolve(new Blob([new Uint8Array(reader.result as ArrayBuffer)], { type: fileEntry.type }));
            };
            reader.onerror = reject;

            return reader.readAsArrayBuffer(fileEntry);
        });
    }

    /**
     * Converts base64-encoded data to binary data.
     *
     * @param base64 Base64-encoded data.
     * @returns Decoded binary data.
     */
    static base64ToBinaryData(base64?: string): Uint8Array<ArrayBuffer> {
        if (!base64) {
            return new Uint8Array(0);
        }

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
    }

    /**
     * Converts an ArrayBuffer to a binary string.
     *
     * @param buffer ArrayBuffer to convert.
     * @returns Binary string representation of the ArrayBuffer.
     */
    static arrayBufferToBinaryString(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return binary;
    }

    /**
     * Read a Blob as text or as a data URL.
     *
     * @param blob Blob to read.
     * @param format Result format.
     * @returns Promise resolved with the Blob contents.
     */
    static readBlobAsString(blob: Blob, format: 'text' | 'data-url'): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') {
                    reject(new Error('FileReader returned no string result.'));

                    return;
                }

                resolve(String(reader.result || ''));
            };
            reader.onerror = () => reject(reader.error ?? new Error('FileReader failed to read the Blob.'));
            reader.onabort = () => reject(reader.error ?? new Error('FileReader was aborted.'));

            if (format === 'text') {
                reader.readAsText(blob);
            } else {
                reader.readAsDataURL(blob);
            }
        });
    }

    /**
     * Convert a file path to a file URL.
     *
     * @param path File path to convert.
     * @returns File URL.
     */
    static convertToFileUrl(path: string): string {
        return path.startsWith('file://') ? path : `file://${path}`;
    }

    /**
     * Is file URL.
     *
     * @param path File path to check.
     * @returns Whether the path is a file URL.
     */
    static isFileUrl(path: string): boolean {
        return path.startsWith('file://');
    }

}
