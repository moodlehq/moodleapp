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
import { CoreFileProvider } from '@providers/file';
import { CorePluginFileHandler } from '@providers/plugin-file-delegate';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreH5PProvider } from './h5p';
import { CoreWSExternalFile } from '@providers/ws';
import { FileEntry } from '@ionic-native/file';

/**
 * Handler to treat H5P files.
 */
@Injectable()
export class CoreH5PPluginFileHandler implements CorePluginFileHandler {
    name = 'CoreH5PPluginFileHandler';

    constructor(protected urlUtils: CoreUrlUtilsProvider,
            protected mimeUtils: CoreMimetypeUtilsProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected utils: CoreUtilsProvider,
            protected fileProvider: CoreFileProvider,
            protected h5pProvider: CoreH5PProvider) { }

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
        return this.h5pProvider.deleteContentByUrl(fileUrl, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    getDownloadableFile(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile> {
        return this.h5pProvider.getTrustedH5PFile(file.fileurl, {}, false, siteId);
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
            const params = this.urlUtils.extractUrlParams(iframes[i].src);

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
    getFileSize(file: CoreWSExternalFile, siteId?: string): Promise<number> {
        return this.h5pProvider.getTrustedH5PFile(file.fileurl, {}, false, siteId).then((file) => {
            return file.filesize;
        }).catch((error): any => {
            if (this.utils.isWebServiceError(error)) {
                // WS returned an error, it means it cannot be downloaded.
                return 0;
            }

            return Promise.reject(error);
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.h5pProvider.canGetTrustedH5PFileInSite();
    }

    /**
     * Check whether the file should be treated by this handler. It is used in functions where the component isn't used.
     *
     * @param file The file data.
     * @return Whether the file should be treated by this handler.
     */
    shouldHandleFile(file: CoreWSExternalFile): boolean {
        return this.mimeUtils.guessExtensionFromUrl(file.fileurl) == 'h5p';
    }

    /**
     * Treat a downloaded file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    treatDownloadedFile(fileUrl: string, file: FileEntry, siteId?: string): Promise<any> {
        return this.h5pProvider.extractH5PFile(fileUrl, file, siteId);
    }
}
