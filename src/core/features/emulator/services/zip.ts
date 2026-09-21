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
import { Zip } from '@features/native/plugins/zip';
import JSZip from 'jszip';
import { CorePath } from '@static/path';
import { CoreFile, CoreFileFormat } from '@services/file';

/**
 * Emulates the Cordova Zip plugin in browser.
 */
@Injectable()
export class ZipMock extends Zip {

    /**
     * Extracts files from a ZIP archive.
     *
     * @param source Path to the source ZIP file.
     * @param destination Destination folder.
     * @param onProgress Optional callback to be called on progress update
     * @returns Promise that resolves with a number. 0 is success, -1 is error.
     */
    async unzip(
        source: string,
        destination: string,
        onProgress?: (ev: { loaded: number; total: number }) => void,
    ): Promise<number> {
        // Replace all %20 with spaces.
        source = source.replace(/%20/g, ' ');
        destination = destination.replace(/%20/g, ' ');

        const zip = new JSZip();

        try {
            // Read the file first.
            const data = await CoreFile.readFile(source, CoreFileFormat.FORMATARRAYBUFFER);

            // Now load the file using the JSZip library.
            await zip.loadAsync(data);

            if (!zip.files || !Object.keys(zip.files).length) {
                // Nothing to extract.
                return 0;
            }

            // First of all, create the directory where the files will be unzipped.
            await CoreFile.createDir(destination);

            const total = Object.keys(zip.files).length;
            let loaded = 0;

            await Promise.all(Object.keys(zip.files).map(async (name) => {
                const file = zip.files[name];

                if (!file.dir) {
                    // It's a file.
                    const fileDir = name.substring(0, name.lastIndexOf('/'));
                    if (fileDir) {
                        // The file is in a subfolder, create it first.
                        await CoreFile.createDir(CorePath.concatenatePaths(destination, fileDir));
                    }

                    // Read the file contents as a Blob.
                    const fileData = await file.async('blob');

                    // File read and parent folder created, now write the file.
                    const filePath = CorePath.concatenatePaths(destination, name);

                    await CoreFile.writeFile(filePath, fileData);
                } else {
                    // It's a folder, create it if it doesn't exist.
                    await CoreFile.createDir(CorePath.concatenatePaths(destination, name));
                }

                // File unzipped, call the progress.
                loaded++;
                onProgress && onProgress({ loaded: loaded, total: total });
            }));

            return 0;
        } catch {
            // Error.
            return -1;
        }
    }

}
