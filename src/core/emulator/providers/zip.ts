// (C) Copyright 2015 Martin Dougiamas
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
import { JSZip } from 'jszip';
import { File } from '@ionic-native/file';
import { CoreMimetypeUtilsProvider } from '../../../providers/utils/mimetype';

/**
 * Emulates the Cordova Zip plugin in desktop apps and in browser.
 */
@Injectable()
export class ZipMock extends Zip {

    constructor(private file: File, private mimeUtils: CoreMimetypeUtilsProvider) {
        super();
    }

    /**
     * Extracts files from a ZIP archive.
     *
     * @param {string} source Path to the source ZIP file.
     * @param {string} destination Destination folder.
     * @param {Function} [onProgress] Optional callback to be called on progress update
     * @return {Promise<number>} Promise that resolves with a number. 0 is success, -1 is error.
     */
    unzip(source: string, destination: string, onProgress?: Function): Promise<number> {
        // Replace all %20 with spaces.
        source = source.replace(/%20/g, ' ');
        destination = destination.replace(/%20/g, ' ');

        const sourceDir = source.substring(0, source.lastIndexOf('/')),
            sourceName = source.substr(source.lastIndexOf('/') + 1);

        return this.file.readAsArrayBuffer(sourceDir, sourceName).then((data) => {
            const zip = new JSZip(data),
                promises = [],
                total = Object.keys(zip.files).length;
            let loaded = 0;

            if (!zip.files || !zip.files.length) {
                // Nothing to extract.
                return 0;
            }

            zip.files.forEach((file, name) => {
                let type,
                    promise;

                if (!file.dir) {
                    // It's a file. Get the mimetype and write the file.
                    type = this.mimeUtils.getMimeType(this.mimeUtils.getFileExtension(name));
                    promise = this.file.writeFile(destination, name, new Blob([file.asArrayBuffer()], { type: type }));
                } else {
                    // It's a folder, create it if it doesn't exist.
                    promise = this.file.createDir(destination, name, false);
                }

                promises.push(promise.then(() => {
                    // File unzipped, call the progress.
                    loaded++;
                    onProgress && onProgress({ loaded: loaded, total: total });
                }));
            });

            return Promise.all(promises).then(() => {
                return 0;
            });
        }).catch(() => {
            // Error.
            return -1;
        });
    }
}
