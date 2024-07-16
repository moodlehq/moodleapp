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
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFilepoolOnProgressCallback } from '@services/filepool';
import { CorePluginFileDownloadableResult, CorePluginFileHandler } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { CoreH5P } from '../h5p';
import { Translate, makeSingleton } from '@singletons';
import { CoreH5PHelper } from '../../classes/helper';
import { CoreFileHelper } from '@services/file-helper';

/**
 * Handler to treat H5P files.
 */
@Injectable({ providedIn: 'root' })
export class CoreH5PPluginFileHandlerService implements CorePluginFileHandler {

    name = 'CoreH5PPluginFileHandler';

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async fileDeleted(fileUrl: string, path: string, siteId?: string): Promise<void> {
        // If an h5p file is deleted, remove the contents folder.
        await CoreH5P.h5pPlayer.deleteContentByUrl(fileUrl, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the file to use. Rejected if cannot download.
     */
    async getDownloadableFile(file: CoreWSFile, siteId?: string): Promise<CoreWSFile> {
        const site = await CoreSites.getSite(siteId);

        const fileUrl = CoreFileHelper.getFileUrl(file);

        if (site.containsUrl(fileUrl) && fileUrl.match(/pluginfile\.php\/[^/]+\/core_h5p\/export\//i)) {
            // It's already a deployed file, use it.
            return file;
        }

        return CoreH5P.getTrustedH5PFile(fileUrl, {}, false, siteId);
    }

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @returns List of URLs.
     */
    getDownloadableFilesFromHTML(container: HTMLElement): string[] {
        const iframes = <HTMLIFrameElement[]> Array.from(container.querySelectorAll('iframe.h5p-iframe'));
        const urls: string[] = [];

        for (let i = 0; i < iframes.length; i++) {
            const params = CoreUrl.extractUrlParams(iframes[i].src);

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
     * @returns Promise resolved with the size.
     */
    async getFileSize(file: CoreWSFile, siteId?: string): Promise<number> {
        try {
            const trustedFile = await this.getDownloadableFile(file, siteId);

            return trustedFile.filesize || 0;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // WS returned an error, it means it cannot be downloaded.
                return 0;
            }

            throw error;
        }
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return CoreH5P.canGetTrustedH5PFileInSite();
    }

    /**
     * Check if a file is downloadable.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with a boolean and a reason why it isn't downloadable if needed.
     */
    async isFileDownloadable(file: CoreWSFile, siteId?: string): Promise<CorePluginFileDownloadableResult> {
        const offlineDisabled = await CoreH5P.isOfflineDisabled(siteId);

        if (offlineDisabled) {
            return {
                downloadable: false,
                reason: Translate.instant('core.h5p.offlinedisabled'),
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
     * @returns Whether the file should be treated by this handler.
     */
    shouldHandleFile(file: CoreWSFile): boolean {
        return CoreMimetypeUtils.guessExtensionFromUrl(CoreFileHelper.getFileUrl(file)) == 'h5p';
    }

    /**
     * Treat a downloaded file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @param onProgress Function to call on progress.
     * @returns Promise resolved when done.
     */
    treatDownloadedFile(
        fileUrl: string,
        file: FileEntry,
        siteId?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> {
        return CoreH5PHelper.saveH5P(fileUrl, file, siteId, onProgress);
    }

}

export const CoreH5PPluginFileHandler = makeSingleton(CoreH5PPluginFileHandlerService);
