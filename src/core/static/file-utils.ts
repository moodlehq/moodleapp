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
import { FileEntry, IFile } from '@awesome-cordova-plugins/file/ngx';
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

            if (names.indexOf(name) > -1) {
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
    static filetoBlob(fileEntry: IFile): Promise<Blob> {
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

}
