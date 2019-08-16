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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFilepoolProvider } from '@providers/filepool';
import { AddonModPageProvider } from './page';
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider } from '@providers/sites';
import { Http, Response } from '@angular/http';

/**
 * Service that provides some features for page.
 */
@Injectable()
export class AddonModPageHelperProvider {

    protected logger;

    constructor(logger: CoreLoggerProvider, private domUtils: CoreDomUtilsProvider, private filepoolProvider: CoreFilepoolProvider,
            private fileProvider: CoreFileProvider, private textUtils: CoreTextUtilsProvider, private http: Http,
            private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AddonModPageHelperProvider');
    }

    /**
     * Gets the page HTML.
     *
     * @param {any} contents The module contents.
     * @param {number} moduleId The module ID.
     * @return {Promise<string>} The HTML of the page.
     */
    getPageHtml(contents: any, moduleId: number): Promise<string> {
        let indexUrl,
            promise;
        const paths = {};

        // Extract the information about paths from the module contents.
        contents.forEach((content) => {
            const url = content.fileurl;

            if (this.isMainPage(content)) {
                // This seems to be the most reliable way to spot the index page.
                indexUrl = url;
            } else {
                let key = content.filename;
                if (content.filepath !== '/') {
                    // Add the folders without the leading slash.
                    key = content.filepath.substr(1) + key;
                }
                paths[this.textUtils.decodeURIComponent(key)] = url;
            }
        });

        // Promise handling when we are in a browser.
        if (!indexUrl) {
            // If ever that happens.
            this.logger.debug('Could not locate the index page');
            promise = Promise.reject(null);
        } else if (this.fileProvider.isAvailable()) {
            // The file system is available.
            promise = this.filepoolProvider.downloadUrl(this.sitesProvider.getCurrentSiteId(), indexUrl, false,
                AddonModPageProvider.COMPONENT, moduleId);
        } else {
            // We return the live URL.
            promise = Promise.resolve(this.sitesProvider.getCurrentSite().fixPluginfileURL(indexUrl));
        }

        return promise.then((url) => {

            // Fetch the URL content.
            const promise = this.http.get(url).toPromise();

            return promise.then((response: Response): any => {
                const content = response.text();
                if (typeof content !== 'string') {
                    return Promise.reject(null);
                }

                // Now that we have the content, we update the SRC to point back to the external resource.
                // That will be caught by core-format-text.
                return this.domUtils.restoreSourcesInHtml(content, paths);
            });
        });
    }

    /**
     * Returns whether the file is the main page of the module.
     *
     * @param {any} file An object returned from WS containing file info.
     * @return {boolean}  Whether the file is the main page or not.
     */
    protected isMainPage(file: any): boolean {
        const filename = file.filename || '',
            fileurl = file.fileurl || '',
            url = '/mod_page/content/index.html',
            encodedUrl = encodeURIComponent(url);

        return (filename === 'index.html' && (fileurl.indexOf(url) > 0 || fileurl.indexOf(encodedUrl) > 0 ));
    }
}
