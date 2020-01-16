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
import { Zip } from '@ionic-native/zip';
import * as JSZip from 'jszip';
import { File } from '@ionic-native/file';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Emulates the Cordova Zip plugin in desktop apps and in browser.
 */
@Injectable()
export class ZipMock extends Zip {

    constructor(private file: File, private textUtils: CoreTextUtilsProvider) {
        super();
    }

    /**
     * Create a directory. It creates all the foldes in dirPath 1 by 1 to prevent errors.
     *
     * @param destination Destination parent folder.
     * @param dirPath Relative path to the folder.
     * @return Promise resolved when done.
     */
    protected createDir(destination: string, dirPath: string): Promise<void> {
        // Create all the folders 1 by 1 in order, otherwise it fails.
        const folders = dirPath.split('/');
        let promise = Promise.resolve();

        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];

            promise = promise.then(() => {
                return this.file.createDir(destination, folder, true).then(() => {
                    // Folder created, add it to the destination path.
                    destination = this.textUtils.concatenatePaths(destination, folder);
                });
            });
        }

        return promise;
    }

    /**
     * Extracts files from a ZIP archive.
     *
     * @param source Path to the source ZIP file.
     * @param destination Destination folder.
     * @param onProgress Optional callback to be called on progress update
     * @return Promise that resolves with a number. 0 is success, -1 is error.
     */
    unzip(source: string, destination: string, onProgress?: Function): Promise<number> {

        // Replace all %20 with spaces.
        source = source.replace(/%20/g, ' ');
        destination = destination.replace(/%20/g, ' ');

        const sourceDir = source.substring(0, source.lastIndexOf('/')),
            sourceName = source.substr(source.lastIndexOf('/') + 1),
            zip = new JSZip();

        // Read the file first.
        return this.file.readAsArrayBuffer(sourceDir, sourceName).then((data) => {

            // Now load the file using the JSZip library.
            return zip.loadAsync(data);
        }).then((): any => {

            if (!zip.files || !Object.keys(zip.files).length) {
                // Nothing to extract.
                return 0;
            }

            // First of all, create the directory where the files will be unzipped.
            const destParent = destination.substring(0, destination.lastIndexOf('/')),
                destFolderName = destination.substr(destination.lastIndexOf('/') + 1);

            return this.file.createDir(destParent, destFolderName, true);
        }).then(() => {

            const promises = [],
                total = Object.keys(zip.files).length;
            let loaded = 0;

            for (const name in zip.files) {
                const file = zip.files[name];
                let promise;

                if (!file.dir) {
                    // It's a file.
                    const fileDir = name.substring(0, name.lastIndexOf('/')),
                        fileName = name.substr(name.lastIndexOf('/') + 1),
                        filePromises = [];
                    let fileData;

                    if (fileDir) {
                        // The file is in a subfolder, create it first.
                        filePromises.push(this.createDir(destination, fileDir));
                    }

                    // Read the file contents as a Blob.
                    filePromises.push(file.async('blob').then((data) => {
                        fileData = data;
                    }));

                    promise = Promise.all(filePromises).then(() => {
                        // File read and parent folder created, now write the file.
                        const parentFolder = this.textUtils.concatenatePaths(destination, fileDir);

                        return this.file.writeFile(parentFolder, fileName, fileData, {replace: true});
                    });
                } else {
                    // It's a folder, create it if it doesn't exist.
                    promise = this.createDir(destination, name);
                }

                promises.push(promise.then(() => {
                    // File unzipped, call the progress.
                    loaded++;
                    onProgress && onProgress({ loaded: loaded, total: total });
                }));
            }

            return Promise.all(promises).then(() => {
                return 0;
            });
        }).catch(() => {
            // Error.
            return -1;
        });
    }
}
