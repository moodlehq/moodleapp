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
import { BlobReader, BlobWriter, ZipReader, type Entry } from '@zip.js/zip.js';
import { CorePath } from '@static/path';
import { CoreFile, CoreFileFormat } from '@services/file';
import type { CapacitorZipPlugin, UnzipOptions, ZipOptions, ZipProgressEvent } from '@capgo/capacitor-zip';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Emulates the Capacitor Zip plugin in browser.
 */
@Injectable()
export class ZipMock implements CapacitorZipPlugin {

    /**
     * @inheritdoc
     */
    async addListener(eventName: 'progress', listenerFunc: (event: ZipProgressEvent) => void): Promise<PluginListenerHandle> {
        void eventName;
        void listenerFunc;
        throw new Error('Not implemented in the browser mock.');

    }

    /**
     * @inheritdoc
     */
    async unzip(options: UnzipOptions): Promise<void> {
        // Capacitor Zip plugin uses zip.js to handle ZIP file operations in the browser but it downloads
        // the files without structure in the download folder.

        let { source, destination } = options;

        // Replace all %20 with spaces.
        source = source.replace(/%20/g, ' ');
        destination = destination.replace(/%20/g, ' ');

        // Read the file first.
        const data = await CoreFile.readFile(source, CoreFileFormat.FORMATARRAYBUFFER);

        let zipReader: ZipReader<unknown> | undefined;

        try {
            zipReader = new ZipReader(new BlobReader(new Blob([data])));
            const entries = await zipReader.getEntries();

            if (!entries.length) {
                options.onProgress?.({
                    operationId: options.operationId,
                    operation: 'unzip',
                    source: options.source,
                    destination: options.destination,
                    loaded: 0,
                    total: 0,
                    lengthComputable: false,
                    progress: 1,
                    filesCompleted: 0,
                    filesTotal: 0,
                });

                // Nothing to extract.
                return;
            }

            const normalisedEntries = entries.map((entry) => {
                const filename = entry.filename.replace(/\\/g, '/');
                let decodedFilename = filename;

                try {
                    decodedFilename = decodeURIComponent(filename);
                } catch {
                    // Keep invalid percent sequences literal; CoreFile encodes them before filesystem access.
                }

                decodedFilename = decodedFilename.replace(/\\/g, '/');

                if (
                    !filename ||
                    decodedFilename.startsWith('/') ||
                    /^[a-z]:/i.test(decodedFilename) ||
                    decodedFilename.split('/').includes('..')
                ) {
                    throw new Error(`Invalid ZIP entry path: ${entry.filename}`);
                }

                return { entry, filename };
            });

            // First of all, create the directory where the files will be unzipped.
            await CoreFile.createDir(destination);

            const files = normalisedEntries.filter(({ entry }) => !entry.directory);
            const totalSizeKnown = files.every(({ entry }) => entry.uncompressedSize !== undefined);
            const total = totalSizeKnown
                ? files.reduce((total, { entry }) => total + (entry.uncompressedSize ?? 0), 0)
                : 0;
            const lengthComputable = total > 0 || entries.length > 0;
            let loaded = 0;
            let filesCompleted = 0;
            const emitProgress = (entry: Entry): void => {
                if (!options.onProgress) {
                    return;
                }

                const progress = total > 0 ? loaded / total : filesCompleted / entries.length;
                const event: ZipProgressEvent = {
                    operationId: options.operationId,
                    operation: 'unzip',
                    source: options.source,
                    destination: options.destination,
                    loaded,
                    total: lengthComputable ? total : 0,
                    lengthComputable,
                    progress,
                    currentFile: entry.filename,
                    filesCompleted,
                    filesTotal: entries.length,
                };

                options.onProgress(event);
            };

            await Promise.all(normalisedEntries.map(async ({ entry, filename }) => {
                let entryLoaded = 0;
                const updateLoaded = (bytes: number): void => {
                    loaded += bytes - entryLoaded;
                    entryLoaded = bytes;
                };

                if (!entry.directory) {
                    // It's a file.
                    const fileDir = filename.substring(0, filename.lastIndexOf('/'));
                    if (fileDir) {
                        // The file is in a subfolder, create it first.
                        await CoreFile.createDir(CorePath.concatenatePaths(destination, fileDir));
                    }

                    // Read the file contents as a Blob.
                    const fileData = await entry.getData(new BlobWriter(), {
                        password: options.password,
	                    onprogress: (compressedLoaded, compressedTotal) => {
                            const bytes = compressedTotal > 0 && entry.uncompressedSize !== undefined
                                ? Math.min(compressedLoaded / compressedTotal, 1) * entry.uncompressedSize
                                : 0;
                            updateLoaded(bytes);
                            emitProgress(entry);
                        },
                    });

                    // File read and parent folder created, now write the file.
                    const filePath = CorePath.concatenatePaths(destination, filename);

                    await CoreFile.writeFile(filePath, fileData);
                    updateLoaded(entry.uncompressedSize ?? fileData.size);
                } else {
                    // It's a folder, create it if it doesn't exist.
                    await CoreFile.createDir(CorePath.concatenatePaths(destination, filename));
                }

                filesCompleted++;
                emitProgress(entry);
            }));
        } finally {
            if (zipReader) {
                await zipReader.close();
            }
        }
    }

    /**
     * @inheritdoc
     */
    zip(options: ZipOptions): Promise<void> {
        void options;

        // Not implemented in the browser mock.
        throw new Error('Not implemented in the browser mock.');
    }

    /**
     * @inheritdoc
     */
    getPluginVersion(): Promise<{ version: string }> {
        // Not implemented in the browser mock.
        throw new Error('Not implemented in the browser mock.');
    }

}
