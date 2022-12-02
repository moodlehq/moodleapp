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
import { FileEntry } from '@ionic-native/file/ngx';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreUtils } from '@services/utils/utils';
import { AddonModGlossaryOffline } from './glossary-offline';
import { AddonModGlossaryNewEntry, AddonModGlossaryNewEntryWithFiles } from './glossary';
import { makeSingleton } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';

/**
 * Helper to gather some common functions for glossary.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryHelperProvider {

    /**
     * Delete stored attachment files for a new entry.
     *
     * @param glossaryId Glossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted.
     */
    async deleteStoredFiles(glossaryId: number, entryName: string, timeCreated: number, siteId?: string): Promise<void> {
        const folderPath = await AddonModGlossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId);

        await CoreUtils.ignoreErrors(CoreFile.removeDir(folderPath));
    }

    /**
     * Get a list of stored attachment files for a new entry. See AddonModGlossaryHelperProvider#storeFiles.
     *
     * @param glossaryId lossary ID.
     * @param entryName The name of the entry.
     * @param timeCreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getStoredFiles(glossaryId: number, entryName: string, timeCreated: number, siteId?: string): Promise<FileEntry[]> {
        const folderPath = await AddonModGlossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId);

        return CoreFileUploader.getStoredFiles(folderPath);
    }

    /**
     * Check if the data of an entry has changed.
     *
     * @param entry Current data.
     * @param files Files attached.
     * @param original Original content.
     * @returns True if data has changed, false otherwise.
     */
    hasEntryDataChanged(
        entry: AddonModGlossaryNewEntry,
        files: CoreFileEntry[],
        original?: AddonModGlossaryNewEntryWithFiles,
    ): boolean {
        if (!original || original.concept === undefined) {
            // There is no original data.
            return !!(entry.definition || entry.concept || files.length > 0);
        }

        if (original.definition != entry.definition || original.concept != entry.concept) {
            return true;
        }

        return CoreFileUploader.areFileListDifferent(files, original.files);
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
     * @returns Promise resolved if success, rejected otherwise.
     */
    async storeFiles(
        glossaryId: number,
        entryName: string,
        timeCreated: number,
        files: CoreFileEntry[],
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModGlossaryOffline.getEntryFolder(glossaryId, entryName, timeCreated, siteId);

        return CoreFileUploader.storeFilesToUpload(folderPath, files);
    }

}

export const AddonModGlossaryHelper = makeSingleton(AddonModGlossaryHelperProvider);
