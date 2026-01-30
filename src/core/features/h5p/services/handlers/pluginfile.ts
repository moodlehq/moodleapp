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

import {
    CorePluginFileDownloadableResult,
    CorePluginFileHandler,
    CorePluginFileTreatDownloadedFileOptions,
} from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreMimetype } from '@static/mimetype';
import { CoreUrl } from '@static/url';
import { CoreWSError } from '@classes/errors/wserror';
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
     * @inheritdoc
     */
    async fileDeleted(fileUrl: string, path: string, siteId?: string): Promise<void> {
        // If an h5p file is deleted, remove the contents folder.
        await CoreH5P.h5pPlayer.deleteContentByUrl(fileUrl, siteId);
    }

    /**
     * @inheritdoc
     */
    async getDownloadableFile(file: CoreWSFile, siteId?: string): Promise<CoreWSFile> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        const fileUrl = CoreFileHelper.getFileUrl(file);

        const isTrusted = await CoreH5P.isTrustedUrl(fileUrl, siteId);
        if (isTrusted) {
            // It's already a deployed file, use it.
            return file;
        }

        return CoreH5P.getTrustedH5PFile(fileUrl, {}, false, siteId);
    }

    /**
     * @inheritdoc
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
     * @inheritdoc
     */
    async getFileSize(file: CoreWSFile, siteId?: string): Promise<number> {
        try {
            const trustedFile = await this.getDownloadableFile(file, siteId);

            return trustedFile.filesize || 0;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // WS returned an error, it means it cannot be downloaded.
                return 0;
            }

            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CoreH5P.canGetTrustedH5PFileInSite();
    }

    /**
     * @inheritdoc
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
     * @inheritdoc
     */
    shouldHandleFile(file: CoreWSFile): boolean {
        return CoreMimetype.guessExtensionFromUrl(CoreFileHelper.getFileUrl(file)) == 'h5p';
    }

    /**
     * @inheritdoc
     */
    treatDownloadedFile(
        fileUrl: string,
        file: FileEntry,
        options: CorePluginFileTreatDownloadedFileOptions = {},
    ): Promise<void> {
        return CoreH5PHelper.saveH5P(fileUrl, file, options);
    }

}

export const CoreH5PPluginFileHandler = makeSingleton(CoreH5PPluginFileHandlerService);
