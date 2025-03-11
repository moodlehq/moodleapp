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
import { CoreCourseModuleContentFile } from '@features/course/services/course';
import { makeSingleton } from '@singletons';

/**
 * Service that provides some features for folder.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFolderHelperProvider {

    /**
     * Format folder contents, creating directory structure.
     * Folders found in filepaths are added to the array. Each folder has the properties: name, fileicon,
     * type (folder), filepath and contents (array with files and subfolders).
     *
     * @param fileEntries Folder contents.
     * @returns Formatted contents.
     */
    formatContents(fileEntries: CoreCourseModuleContentFile[]): AddonModFolderFolderFormattedData {
        const rootFolder: AddonModFolderFolderFormattedData = {
            type: 'root',
            filename: '',
            filepath: '',
            folders: [],
            files: [],
        };

        fileEntries.forEach((fileEntry) => {
            // Root level. Just add.
            if (fileEntry.filepath === '/') {
                rootFolder.files.push(fileEntry);

                return;
            }

            // It's a file in a subfolder. Lets treat the path to add the subfolders to the array.
            let currentFolder = rootFolder; // Start at root level.
            let path = fileEntry.filepath;
            let completePath = '';

            // Remove first and last slash if needed.
            if (path.substring(0, 1) === '/') {
                path = path.substring(1);
            }
            if (path.substring(path.length - 1) === '/') {
                path = path.slice(0, -1);
            }

            const directories: string[] = path.split('/');

            directories.forEach((directory) => {
                completePath = `${completePath}/${directory}`;
                // Search if the directory is already stored in folders array.
                let subFolder = currentFolder.folders.find((list) => list.filename === directory);

                if (!subFolder) {
                    // Directory not found. Add it to the array.
                    subFolder = {
                        type: 'folder',
                        filename: directory,
                        filepath: completePath,
                        folders: [],
                        files: [],
                    };
                    currentFolder.folders.push(subFolder);
                }
                currentFolder = subFolder;
            });

            currentFolder.files.push(fileEntry);
        });

        return rootFolder;
    }

}
export const AddonModFolderHelper = makeSingleton(AddonModFolderHelperProvider);

export type AddonModFolderFolderFormattedData = {
    type: string; // A file or a folder or external link.
    filename: string;
    filepath: string;
    folders: AddonModFolderFolderFormattedData[];
    files: CoreCourseModuleContentFile[];
};
