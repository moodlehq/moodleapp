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
import { File } from '@ionic-native/file/ngx';
import { Zip } from '@ionic-native/zip/ngx';
import * as JSZip from 'jszip';

import { CoreTextUtils } from '@services/utils/text';

/**
 * Emulates the Cordova Zip plugin in browser.
 */
@Injectable()
export class ZipMock extends Zip {

    constructor(private file: File) {
        super();
    }

    /**
     * Create a directory. It creates all the foldes in dirPath 1 by 1 to prevent errors.
     *
     * @param destination Destination parent folder.
     * @param dirPath Relative path to the folder.
     * @return Promise resolved when done.
     */
    protected async createDir(destination: string, dirPath: string): Promise<void> {
        // Create all the folders 1 by 1 in order, otherwise it fails.
        const folders = dirPath.split('/');

        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];

            await this.file.createDir(destination, folder, true);

            // Folder created, add it to the destination path.
            destination = CoreTextUtils.concatenatePaths(destination, folder);
        }
    }

    /**
     * Extracts files from a ZIP archive.
     *
     * @param source Path to the source ZIP file.
     * @param destination Destination folder.
     * @param onProgress Optional callback to be called on progress update
     * @return Promise that resolves with a number. 0 is success, -1 is error.
     */
    async unzip(source: string, destination: string, onProgress?: (ev: {loaded: number; total: number}) => void): Promise<number> {

        // Replace all %20 with spaces.
        source = source.replace(/%20/g, ' ');
        destination = destination.replace(/%20/g, ' ');

        const sourceDir = source.substring(0, source.lastIndexOf('/'));
        const sourceName = source.substr(source.lastIndexOf('/') + 1);
        const zip = new JSZip();

        try {
            // Read the file first.
            const data = await this.file.readAsArrayBuffer(sourceDir, sourceName);

            // Now load the file using the JSZip library.
            await zip.loadAsync(data);

            if (!zip.files || !Object.keys(zip.files).length) {
                // Nothing to extract.
                return 0;
            }

            // First of all, create the directory where the files will be unzipped.
            const destParent = destination.substring(0, destination.lastIndexOf('/'));
            const destFolderName = destination.substr(destination.lastIndexOf('/') + 1);

            await this.file.createDir(destParent, destFolderName, true);

            const total = Object.keys(zip.files).length;
            let loaded = 0;

            await Promise.all(Object.keys(zip.files).map(async (name) => {
                const file = zip.files[name];

                if (!file.dir) {
                    // It's a file.
                    const fileDir = name.substring(0, name.lastIndexOf('/'));
                    const fileName = name.substr(name.lastIndexOf('/') + 1);

                    if (fileDir) {
                        // The file is in a subfolder, create it first.
                        await this.createDir(destination, fileDir);
                    }

                    // Read the file contents as a Blob.
                    const fileData = await file.async('blob');

                    // File read and parent folder created, now write the file.
                    const parentFolder = CoreTextUtils.concatenatePaths(destination, fileDir);

                    await this.file.writeFile(parentFolder, fileName, fileData, { replace: true });
                } else {
                    // It's a folder, create it if it doesn't exist.
                    await this.createDir(destination, name);
                }

                // File unzipped, call the progress.
                loaded++;
                onProgress && onProgress({ loaded: loaded, total: total });
            }));

            return 0;
        } catch (error) {
            // Error.
            return -1;
        }
    }

}
