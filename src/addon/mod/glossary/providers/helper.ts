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
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreFileProvider } from '@providers/file';
import { AddonModGlossaryProvider } from './glossary';
import { AddonModGlossaryOfflineProvider } from './offline';

/**
 * Helper to gather some common functions for glossary.
 */
@Injectable()
export class AddonModGlossaryHelperProvider {

    constructor(private fileProvider: CoreFileProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private glossaryOffline: AddonModGlossaryOfflineProvider) {}

    /**
     * Delete stored attachment files for a new entry.
     *
     * @param glossaryId Glossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted.
     */
    deleteStoredFiles(glossaryId: number, entryName: string, timeCreated: number, siteId?: string): Promise<any> {
        return this.glossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        });
    }

    /**
     * Get a list of stored attachment files for a new entry. See AddonModGlossaryHelperProvider#storeFiles.
     *
     * @param glossaryId lossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getStoredFiles(glossaryId: number, entryName: string, timeCreated: number, siteId?: string): Promise<any[]> {
        return this.glossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFiles(folderPath);
        });
    }

    /**
     * Check if the data of an entry has changed.
     *
     * @param entry Current data.
     * @param files Files attached.
     * @param original Original content.
     * @return True if data has changed, false otherwise.
     */
    hasEntryDataChanged(entry: any, files: any[], original: any): boolean {
        if (!original || typeof original.concept == 'undefined') {
            // There is no original data.
            return entry.definition || entry.concept || files.length > 0;
        }

        if (original.definition != entry.definition || original.concept != entry.concept) {
            return true;
        }

        return this.uploaderProvider.areFileListDifferent(files, original.files);
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param glossaryId Glossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    storeFiles(glossaryId: number, entryName: string, timeCreated: number, files: any[], siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.glossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId).then((folderPath) => {
            return this.uploaderProvider.storeFilesToUpload(folderPath, files);
        });
    }

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @param glossaryId Glossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
     */
    uploadOrStoreFiles(glossaryId: number, entryName: string, timeCreated: number, files: any[], offline: boolean,
            siteId?: string): Promise<any> {
        if (offline) {
            return this.storeFiles(glossaryId, entryName, timeCreated, files, siteId);
        } else {
            return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModGlossaryProvider.COMPONENT, glossaryId, siteId);
        }
    }
}
