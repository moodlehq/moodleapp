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
import { CoreSitesProvider } from './sites';

/**
 * Helper to store some temporary data for file submission.
 *
 * It uses siteId and component name to index the files.
 * Every component can provide a File area identifier to indentify every file list on the session.
 * This value can be the activity id or a mix of name and numbers.
 */
@Injectable()
export class CoreFileSessionProvider {
    protected files = {};

    constructor(private sitesProvider: CoreSitesProvider) { }

    /**
     * Add a file to the session.
     *
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {any} file File to add.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    addFile(component: string, id: string | number, file: any, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.initFileArea(component, id, siteId);

        this.files[siteId][component][id].push(file);
    }

    /**
     * Clear files stored in session.
     *
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    clearFiles(component: string, id: string | number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id]) {
            this.files[siteId][component][id] = [];
        }
    }

    /**
     * Get files stored in session.
     *
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {any[]} Array of files in session.
     */
    getFiles(component: string, id: string | number, siteId?: string): any[] {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id]) {
            return this.files[siteId][component][id];
        }

        return [];
    }

    /**
     * Initializes the filearea to store the file.
     *
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    protected initFileArea(component: string, id: string | number, siteId?: string): void {
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
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {any} file File to remove. The instance should be exactly the same as the one stored in session.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    removeFile(component: string, id: string | number, file: any, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
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
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {number} index Position of the file to remove.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    removeFileByIndex(component: string, id: string | number, index: number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (this.files[siteId] && this.files[siteId][component] && this.files[siteId][component][id] && index >= 0 &&
            index < this.files[siteId][component][id].length) {
            this.files[siteId][component][id].splice(index, 1);
        }
    }

    /**
     * Set a group of files in the session.
     *
     * @param {string} component Component Name.
     * @param {string|number} id File area identifier.
     * @param {any[]} newFiles Files to set.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    setFiles(component: string, id: string | number, newFiles: any[], siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.initFileArea(component, id, siteId);

        this.files[siteId][component][id] = newFiles;
    }
}
