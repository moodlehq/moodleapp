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

import { CoreFilepool, CoreFilepoolOnProgressCallback } from '@services/filepool';
import { CoreWSFile } from '@services/ws';
import { DownloadStatus } from '@/core/constants';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { makeSingleton } from '@singletons';
import { CoreSites } from './sites';
import { CoreFileHelper } from './file-helper';

/**
 * Delegate to register pluginfile information handlers.
 */
@Injectable({ providedIn: 'root' })
export class CorePluginFileDelegateService extends CoreDelegate<CorePluginFileHandler> {

    protected handlerNameProperty = 'component';

    constructor() {
        super('CorePluginFileDelegate');
    }

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async fileDeleted(fileUrl: string, path: string, siteId?: string): Promise<void> {
        const handler = this.getHandlerForFile({ fileurl: fileUrl });

        if (handler && handler.fileDeleted) {
            await handler.fileDeleted(fileUrl, path, siteId);
        }
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the file to use. Rejected if cannot download.
     */
    getDownloadableFile(file: CoreWSFile, siteId?: string): Promise<CoreWSFile> {
        const handler = this.getHandlerForFile(file);

        return this.getHandlerDownloadableFile(file, handler, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param handler The handler to use.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the file to use. Rejected if cannot download.
     */
    protected async getHandlerDownloadableFile(
        file: CoreWSFile,
        handler?: CorePluginFileHandler,
        siteId?: string,
    ): Promise<CoreWSFile> {
        const isDownloadable = await this.isFileDownloadable(file, siteId);

        if (!isDownloadable.downloadable) {
            throw isDownloadable.reason;
        }

        if (handler && handler.getDownloadableFile) {
            const newFile = await handler.getDownloadableFile(file, siteId);

            return newFile || file;
        }

        return file;
    }

    /**
     * Get the RegExp of the component and filearea described in the URL.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @returns RegExp to match the revision or undefined if not found.
     */
    getComponentRevisionRegExp(args: string[]): RegExp | void {
        // Get handler based on component (args[1]).
        const handler = this.getHandler(args[1], true);

        if (handler && handler.getComponentRevisionRegExp) {
            return handler.getComponentRevisionRegExp(args);
        }
    }

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @returns List of URLs.
     */
    getDownloadableFilesFromHTML(container: HTMLElement): string[] {
        let files: string[] = [];

        for (const component in this.enabledHandlers) {
            const handler = this.enabledHandlers[component];

            if (handler && handler.getDownloadableFilesFromHTML) {
                files = files.concat(handler.getDownloadableFilesFromHTML(container));
            }
        }

        return files;
    }

    /**
     * Sum the filesizes from a list if they are not downloaded.
     *
     * @param files List of files to sum its filesize.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with file size and a boolean to indicate if it is the total size or only partial.
     */
    async getFilesDownloadSize(files: CoreWSFile[], siteId?: string): Promise<CoreFileSizeSum> {
        const siteIdentifier = siteId || CoreSites.getCurrentSiteId();

        const filteredFiles: CoreWSFile[] = [];

        await Promise.all(files.map(async (file) => {
            const state = await CoreFilepool.getFileStateByUrl(siteIdentifier, CoreFileHelper.getFileUrl(file), file.timemodified);

            if (state !== DownloadStatus.DOWNLOADED && state !== DownloadStatus.NOT_DOWNLOADABLE) {
                filteredFiles.push(file);
            }
        }));

        return this.getFilesSize(filteredFiles, siteIdentifier);
    }

    /**
     * Sum the filesizes from a list of files checking if the size will be partial or totally calculated.
     *
     * @param files List of files to sum its filesize.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with file size and a boolean to indicate if it is the total size or only partial.
     */
    async getFilesSize(files: CoreWSFile[], siteId?: string): Promise<CoreFileSizeSum> {
        const result: CoreFileSizeSum = {
            size: 0,
            total: true,
        };

        await Promise.all(files.map(async (file) => {
            const size = await this.getFileSize(file, siteId);

            if (size === undefined) {
                // We don't have the file size, cannot calculate its total size.
                result.total = false;
            } else {
                result.size += size;
            }
        }));

        return result;
    }

    /**
     * Get a file size.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the size.
     */
    async getFileSize(file: CoreWSFile, siteId?: string): Promise<number> {
        const isDownloadable = await this.isFileDownloadable(file, siteId);

        if (!isDownloadable.downloadable) {
            return 0;
        }

        const handler = this.getHandlerForFile(file);

        // First of all check if file can be downloaded.
        const downloadableFile = await this.getHandlerDownloadableFile(file, handler, siteId);
        if (!downloadableFile) {
            return 0;
        }

        if (handler && handler.getFileSize) {
            try {
                return await handler.getFileSize(downloadableFile, siteId);
            } catch {
                // Ignore errors.
            }
        }

        return downloadableFile.filesize || 0;
    }

    /**
     * Get a handler to treat a certain file.
     *
     * @param file File data.
     * @returns Handler.
     */
    protected getHandlerForFile(file: CoreWSFile): CorePluginFileHandler | undefined {
        for (const component in this.enabledHandlers) {
            const handler = this.enabledHandlers[component];

            if (handler && handler.shouldHandleFile && handler.shouldHandleFile(file)) {
                return handler;
            }
        }
    }

    /**
     * Check if a file is downloadable.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise with the data.
     */
    async isFileDownloadable(file: CoreWSFile, siteId?: string): Promise<CorePluginFileDownloadableResult> {
        const handler = this.getHandlerForFile(file);

        if (handler && handler.isFileDownloadable) {
            return handler.isFileDownloadable(file, siteId);
        }

        // Default to true.
        return { downloadable: true };
    }

    /**
     * Removes the revision number from a file URL.
     *
     * @param url URL to be replaced.
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @returns Replaced URL without revision.
     */
    removeRevisionFromUrl(url: string, args: string[]): string {
        // Get handler based on component (args[1]).
        const handler = this.getHandler(args[1], true);

        if (handler && handler.getComponentRevisionRegExp && handler.getComponentRevisionReplace) {
            const revisionRegex = handler.getComponentRevisionRegExp(args);
            if (revisionRegex) {
                return url.replace(revisionRegex, handler.getComponentRevisionReplace(args));
            }
        }

        return url;
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
    async treatDownloadedFile(
        fileUrl: string,
        file: FileEntry,
        siteId?: string,
        onProgress?: CoreFilepoolOnProgressCallback,
    ): Promise<void> {
        const handler = this.getHandlerForFile({ fileurl: fileUrl });

        if (handler && handler.treatDownloadedFile) {
            await handler.treatDownloadedFile(fileUrl, file, siteId, onProgress);
        }
    }

}

export const CorePluginFileDelegate = makeSingleton(CorePluginFileDelegateService);

/**
 * Interface that all plugin file handlers must implement.
 */
export interface CorePluginFileHandler extends CoreDelegateHandler {

    /**
     * The "component" of the handler. It should match the "component" of pluginfile URLs.
     * It is used to treat revision from URLs.
     */
    component?: string;

    /**
     * Return the RegExp to match the revision on pluginfile URLs.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @returns RegExp to match the revision on pluginfile URLs.
     */
    getComponentRevisionRegExp?(args: string[]): RegExp | undefined;

    /**
     * Should return the string to remove the revision on pluginfile url.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @returns String to remove the revision on pluginfile url.
     */
    getComponentRevisionReplace?(args: string[]): string;

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    fileDeleted?(fileUrl: string, path: string, siteId?: string): Promise<void>;

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the file to use. Rejected if cannot download.
     */
    getDownloadableFile?(file: CoreWSFile, siteId?: string): Promise<CoreWSFile>;

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @returns List of URLs.
     */
    getDownloadableFilesFromHTML?(container: HTMLElement): string[];

    /**
     * Get a file size.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the size.
     */
    getFileSize?(file: CoreWSFile, siteId?: string): Promise<number>;

    /**
     * Check if a file is downloadable.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with a boolean and a reason why it isn't downloadable if needed.
     */
    isFileDownloadable?(file: CoreWSFile, siteId?: string): Promise<CorePluginFileDownloadableResult>;

    /**
     * Check whether the file should be treated by this handler. It is used in functions where the component isn't used.
     *
     * @param file The file data.
     * @returns Whether the file should be treated by this handler.
     */
    shouldHandleFile?(file: CoreWSFile): boolean;

    /**
     * Treat a downloaded file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @param onProgress Function to call on progress.
     * @returns Promise resolved when done.
     */
    treatDownloadedFile?(
        fileUrl: string,
        file: FileEntry,
        siteId?: string,
        onProgress?: CoreFilepoolOnProgressCallback):
    Promise<void>;
}

/**
 * Data about if a file is downloadable.
 */
export type CorePluginFileDownloadableResult = {
    /**
     * Whether it's downloadable.
     */
    downloadable: boolean;

    /**
     * If not downloadable, the reason why it isn't.
     */
    reason?: string;
};

/**
 * Sum of file sizes.
 */
export type CoreFileSizeSum = {
    size: number; // Sum of file sizes.
    total: boolean; // False if any file size is not available.
};
