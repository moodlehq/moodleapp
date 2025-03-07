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
import { CoreError } from '@classes/errors/error';
import { CoreUrl } from '@singletons/url';
import { CoreSites } from '@services/sites';
import { CoreFilepool } from '@services/filepool';
import { CoreWS } from '@services/ws';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { CoreCourseModuleContentFile } from '@features/course/services/course';
import { ADDON_MOD_PAGE_COMPONENT } from '../constants';

/**
 * Service that provides some features for page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModPageHelperProvider {

    /**
     * Gets the page HTML.
     *
     * @param contents The module contents.
     * @param moduleId The module ID.
     * @returns The HTML of the page.
     */
    async getPageHtml(contents: CoreCourseModuleContentFile[], moduleId: number): Promise<string> {
        let indexFile: CoreCourseModuleContentFile | undefined;
        const paths: Record<string, string> = {};

        // Extract the information about paths from the module contents.
        contents.forEach((content) => {
            if (this.isMainPage(content)) {
                // This seems to be the most reliable way to spot the index page.
                indexFile = content;
            } else {
                let key = content.filename;
                if (content.filepath !== '/') {
                    // Add the folders without the leading slash.
                    key = content.filepath.substring(1) + key;
                }
                paths[CoreUrl.decodeURIComponent(key)] = content.fileurl;
            }
        });

        // Promise handling when we are in a browser.
        if (!indexFile) {
            // If ever that happens.
            throw new CoreError('Could not locate the index page');
        }

        const url = await CoreFilepool.downloadUrl(
            CoreSites.getCurrentSiteId(),
            indexFile.fileurl,
            false,
            ADDON_MOD_PAGE_COMPONENT,
            moduleId,
            indexFile.timemodified,
        );

        const content = await CoreWS.getText(url);

        // Now that we have the content, we update the SRC to point back to the external resource.
        // That will be caught by core-format-text.
        return CoreDomUtils.restoreSourcesInHtml(content, paths);
    }

    /**
     * Returns whether the file is the main page of the module.
     *
     * @param file An object returned from WS containing file info.
     * @returns Whether the file is the main page or not.
     */
    protected isMainPage(file: CoreCourseModuleContentFile): boolean {
        const filename = file.filename || '';
        const fileurl = file.fileurl || '';
        const url = '/mod_page/content/index.html';
        const encodedUrl = encodeURIComponent(url);

        return (filename === 'index.html' && (fileurl.indexOf(url) > 0 || fileurl.indexOf(encodedUrl) > 0 ));
    }

}
export const AddonModPageHelper = makeSingleton(AddonModPageHelperProvider);
