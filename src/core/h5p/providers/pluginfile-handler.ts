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
import { CorePluginFileHandler } from '@providers/plugin-file-delegate';
import { CoreMimetypeUtils } from '@providers/utils/mimetype';
import { CoreUrlUtils } from '@providers/utils/url';
import { CoreUtils } from '@providers/utils/utils';
import { CoreH5P } from './h5p';
import { CoreSites } from '@providers/sites';
import { CoreWSExternalFile } from '@providers/ws';
import { FileEntry } from '@ionic-native/file';
import { Translate } from '@singletons/core.singletons';
import { CoreH5PHelper } from '../classes/helper';

/**
 * Handler to treat H5P files.
 */
@Injectable()
export class CoreH5PPluginFileHandler implements CorePluginFileHandler {
    name = 'CoreH5PPluginFileHandler';

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    fileDeleted(fileUrl: string, path: string, siteId?: string): Promise<any> {
        // If an h5p file is deleted, remove the contents folder.
        return CoreH5P.instance.h5pPlayer.deleteContentByUrl(fileUrl, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    async getDownloadableFile(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile> {
        const site = await CoreSites.instance.getSite(siteId);

        if (site.containsUrl(file.fileurl) && file.fileurl.match(/pluginfile\.php\/[^\/]+\/core_h5p\/export\//i)) {
            // It's already a deployed file, use it.
            return file;
        }

        return CoreH5P.instance.getTrustedH5PFile(file.fileurl, {}, false, siteId);
    }

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @return List of URLs.
     */
    getDownloadableFilesFromHTML(container: HTMLElement): string[] {
        const iframes = <HTMLIFrameElement[]> Array.from(container.querySelectorAll('iframe.h5p-iframe'));
        const urls = [];

        for (let i = 0; i < iframes.length; i++) {
            const params = CoreUrlUtils.instance.extractUrlParams(iframes[i].src);

            if (params.url) {
                urls.push(params.url);
            }
        }

        return urls;
    }

    /**
     * Get a file size.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the size.
     */
    async getFileSize(file: CoreWSExternalFile, siteId?: string): Promise<number> {
        try {
            const trustedFile = await this.getDownloadableFile(file, siteId);

            return trustedFile.filesize;
        } catch (error) {
            if (CoreUtils.instance.isWebServiceError(error)) {
                // WS returned an error, it means it cannot be downloaded.
                return 0;
            }

            throw error;
        }
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return CoreH5P.instance.canGetTrustedH5PFileInSite();
    }

    /**
     * Check if a file is downloadable.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a boolean and a reason why it isn't downloadable if needed.
     */
    async isFileDownloadable(file: CoreWSExternalFile, siteId?: string): Promise<{downloadable: boolean, reason?: string}> {
        const offlineDisabled = await CoreH5P.instance.isOfflineDisabled(siteId);

        if (offlineDisabled) {
            return {
                downloadable: false,
                reason: Translate.instance.instant('core.h5p.offlinedisabled'),
            };
        } else {
            return {
                downloadable: true,
            };
        }
    }

    /**
     * Check whether the file should be treated by this handler. It is used in functions where the component isn't used.
     *
     * @param file The file data.
     * @return Whether the file should be treated by this handler.
     */
    shouldHandleFile(file: CoreWSExternalFile): boolean {
        return CoreMimetypeUtils.instance.guessExtensionFromUrl(file.fileurl) == 'h5p';
    }

    /**
     * Treat a downloaded file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when done.
     */
    treatDownloadedFile(fileUrl: string, file: FileEntry, siteId?: string, onProgress?: (event: any) => any): Promise<void> {
        return CoreH5PHelper.saveH5P(fileUrl, file, siteId, onProgress);
    }
}
