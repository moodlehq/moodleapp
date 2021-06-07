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
import { CoreConstants } from '@/core/constants';
import { CoreSitePublicConfigResponse } from '@classes/site';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreWS } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreStyleHandler, CoreStylesService } from '@features/styles/services/styles';
import { CoreLogger } from '@singletons/logger';
import { CoreUtils } from '@services/utils/utils';

const SEPARATOR_35 = /\/\*\*? *3\.5(\.0)? *styles? *\*\//i; // A comment like "/* 3.5 styles */".
const COMPONENT = 'mmaRemoteStyles';

/**
 * Service to handle remote themes.
 * A remote theme is a CSS sheet stored in the site that allows customising the Mobile app.
 */
@Injectable({ providedIn: 'root' })
export class AddonRemoteThemesHandlerService implements CoreStyleHandler {

    protected logger: CoreLogger;

    name = 'mobilecssurl';
    priority = 1000;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonRemoteThemes');
    }

    /**
     * @inheritDoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isEnabled(siteId: string, config?: CoreSitePublicConfigResponse): Promise<boolean> {
        return true;
    }

    /**
     * @inheritDoc
     */
    async getStyle(siteId: string, config?: CoreSitePublicConfigResponse): Promise<string> {
        if (siteId == CoreStylesService.TMP_SITE_ID) {
            if (!config) {
                return '';
            }

            // Config received, it's a temp site.
            return await this.get35Styles(config.mobilecssurl);
        }

        const site = await CoreSites.getSite(siteId);
        const infos = site.getInfo();

        if (!infos?.mobilecssurl) {
            if (infos?.mobilecssurl === '') {
                // CSS URL is empty. Delete downloaded files (if any).
                CoreFilepool.removeFilesByComponent(siteId, COMPONENT, 1);
            }

            return '';
        }

        let fileUrl = infos.mobilecssurl;

        if (CoreFile.isAvailable()) {
            // The file system is available. Download the file and remove old CSS files if needed.
            fileUrl = await this.downloadFileAndRemoveOld(siteId, fileUrl);
        }

        this.logger.debug('Loading styles from: ', fileUrl);

        // Get the CSS content using HTTP because we will treat the styles before saving them in the file.
        const style = await this.get35Styles(fileUrl);

        if (style != '') {
            // Treat the CSS.
            CoreUtils.ignoreErrors(
                CoreFilepool.treatCSSCode(siteId, fileUrl, style, COMPONENT, 2),
            );
        }

        return style;
    }

    /**
     * Check if the CSS code has a separator for 3.5 styles. If it does, get only the styles after the separator.
     *
     * @param url Url to get the code from.
     * @return The filtered styles.
     */
    protected async get35Styles(url?: string): Promise<string> {
        if (!url) {
            return '';
        }

        const cssCode = await CoreWS.getText(url);

        const separatorPos = cssCode.search(SEPARATOR_35);
        if (separatorPos > -1) {
            return cssCode.substr(separatorPos).replace(SEPARATOR_35, '');
        }

        return cssCode;
    }

    /**
     * Downloads a CSS file and remove old files if needed.
     *
     * @param siteId Site ID.
     * @param url File URL.
     * @return Promise resolved when the file is downloaded.
     */
    protected async downloadFileAndRemoveOld(siteId: string, url: string): Promise<string> {

        try {
            // Check if the file is downloaded.
            const state = await CoreFilepool.getFileStateByUrl(siteId, url);

            if (state == CoreConstants.NOT_DOWNLOADED) {
                // File not downloaded, URL has changed or first time. Delete downloaded CSS files.
                await CoreFilepool.removeFilesByComponent(siteId, COMPONENT, 1);
            }
        } catch {
            // An error occurred while getting state (shouldn't happen). Don't delete downloaded file.
        }

        return CoreFilepool.downloadUrl(siteId, url, false, COMPONENT, 1);
    }

}

export const AddonRemoteThemesHandler = makeSingleton(AddonRemoteThemesHandlerService);
