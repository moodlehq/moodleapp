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
import { CoreFileEntry } from '@services/file-helper';

import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Helper to store some temporary data for file submission.
 *
 * It uses siteId and component name to index the files.
 * Every component can provide a File area identifier to indentify every file list on the session.
 * This value can be the activity id or a mix of name and numbers.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileSessionProvider {

    protected files: {[siteId: string]: {[component: string]: {[id: string]: CoreFileEntry[]}}} = {};

    /**
     * Add a file to the session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param file File to add.
     * @param siteId Site ID. If not defined, current site.
     */
    addFile(component: string, id: string | number, file: CoreFileEntry, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.initFileArea(component, id, siteId);

        this.files[siteId][component][id].push(file);
    }

    /**
     * Clear files stored in session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param siteId Site ID. If not defined, current site.
     */
    clearFiles(component: string, id: string | number, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id]) {
            this.files[siteId][component][id] = [];
        }
    }

    /**
     * Get files stored in session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param siteId Site ID. If not defined, current site.
     * @return Array of files in session.
     */
    getFiles(component: string, id: string | number, siteId?: string): CoreFileEntry[] {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id]) {
            return this.files[siteId][component][id];
        }

        return [];
    }

    /**
     * Initializes the filearea to store the file.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param siteId Site ID. If not defined, current site.
     */
    protected initFileArea(component: string, id: string | number, siteId: string): void {
        if (!this.files[siteId]) {
            this.files[siteId] = {};
        }

        if (!this.files[siteId][component]) {
            this.files[siteId][component] = {};
        }

        if (!this.files[siteId][component][id]) {
            this.files[siteId][component][id] = [];
        }
    }

    /**
     * Remove a file stored in session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param file File to remove. The instance should be exactly the same as the one stored in session.
     * @param siteId Site ID. If not defined, current site.
     */
    removeFile(component: string, id: string | number, file: CoreFileEntry, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id]) {
            const position = this.files[siteId][component][id].indexOf(file);
            if (position != -1) {
                this.files[siteId][component][id].splice(position, 1);
            }
        }
    }

    /**
     * Remove a file stored in session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param index Position of the file to remove.
     * @param siteId Site ID. If not defined, current site.
     */
    removeFileByIndex(component: string, id: string | number, index: number, siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id] && index >= 0 &&
            index < this.files[siteId][component][id].length) {
            this.files[siteId][component][id].splice(index, 1);
        }
    }

    /**
     * Set a group of files in the session.
     *
     * @param component Component Name.
     * @param id File area identifier.
     * @param newFiles Files to set.
     * @param siteId Site ID. If not defined, current site.
     */
    setFiles(component: string, id: string | number, newFiles: CoreFileEntry[], siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.initFileArea(component, id, siteId);

        this.files[siteId][component][id] = newFiles;
    }

}

export const CoreFileSession = makeSingleton(CoreFileSessionProvider);
