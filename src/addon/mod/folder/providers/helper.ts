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
import { CoreCourseProvider } from '@core/course/providers/course';

/**
 * Service that provides some features for folder.
 */
@Injectable()
export class AddonModFolderHelperProvider {

    constructor(private courseProvider: CoreCourseProvider) {
    }

    /**
     * Format folder contents, creating directory structure.
     * Folders found in filepaths are added to the array. Each folder has the properties: name, fileicon,
     * type (folder), filepath and contents (array with files and subfolders).
     *
     * @param contents Folder contents.
     * @return Formatted contents.
     */
    formatContents(contents: any[]): any[] {
        const files = [],
            folders = [],
            folderIcon = this.courseProvider.getModuleIconSrc('folder');

        contents.forEach((entry) => {
            if (entry.filepath !== '/') {
                // It's a file in a subfolder. Lets treat the path to add the subfolders to the array.
                let directories,
                    currentList = folders, // Start at root level.
                    path = entry.filepath,
                    subpath = '';

                // Remove first and last slash if needed.
                if (path.substr(0, 1) === '/') {
                    path = path.substr(1);
                }
                if (path.substr(path.length - 1) === '/') {
                    path = path.slice(0, -1);
                }

                directories = path.split('/');

                directories.forEach((directory) => {
                    subpath = subpath + '/' + directory;
                    // Search if the directory is already stored in folders array.
                    const foundList = currentList.find((list) => {
                        return list.name === directory;
                    });

                    if (foundList) {
                        currentList = foundList.contents;
                    } else {
                        // Directory not found. Add it to the array.
                        const newFolder = {
                            name: directory,
                            fileicon: folderIcon,
                            contents: [],
                            filepath: subpath,
                            type: 'folder'
                        };
                        currentList.push(newFolder);
                        currentList = newFolder.contents;
                    }
                });

                currentList.push(entry);
            } else {
                files.push(entry);
            }
        });

        return folders.concat(files);
    }
}
