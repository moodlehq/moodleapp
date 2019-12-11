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
import { CoreEventsProvider } from './events';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider } from './sites';
import { CoreWSExternalFile } from '@providers/ws';
import { FileEntry } from '@ionic-native/file';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

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
     * @return RegExp to match the revision on pluginfile URLs.
     */
    getComponentRevisionRegExp?(args: string[]): RegExp;

    /**
     * Should return the string to remove the revision on pluginfile url.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return String to remove the revision on pluginfile url.
     */
    getComponentRevisionReplace?(args: string[]): string;

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    fileDeleted?(fileUrl: string, path: string, siteId?: string): Promise<any>;

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    getDownloadableFile?(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile>;

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @return List of URLs.
     */
    getDownloadableFilesFromHTML?(container: HTMLElement): string[];

    /**
     * Get a file size.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the size.
     */
    getFileSize?(file: CoreWSExternalFile, siteId?: string): Promise<number>;

    /**
     * Check whether the file should be treated by this handler. It is used in functions where the component isn't used.
     *
     * @param file The file data.
     * @return Whether the file should be treated by this handler.
     */
    shouldHandleFile?(file: CoreWSExternalFile): boolean;

    /**
     * Treat a downloaded file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    treatDownloadedFile?(fileUrl: string, file: FileEntry, siteId?: string): Promise<any>;
}

/**
 * Delegate to register pluginfile information handlers.
 */
@Injectable()
export class CorePluginFileDelegate extends CoreDelegate {
    protected handlerNameProperty = 'component';

    constructor(loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            eventsProvider: CoreEventsProvider) {
        super('CorePluginFileDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * React to a file being deleted.
     *
     * @param fileUrl The file URL used to download the file.
     * @param path The path of the deleted file.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    fileDeleted(fileUrl: string, path: string, siteId?: string): Promise<any> {
        const handler = this.getHandlerForFile({fileurl: fileUrl});

        if (handler && handler.fileDeleted) {
            return handler.fileDeleted(fileUrl, path, siteId);
        }

        return Promise.resolve();
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    getDownloadableFile(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile> {
        const handler = this.getHandlerForFile(file);

        return this.getHandlerDownloadableFile(file, handler, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param handler The handler to use.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    protected getHandlerDownloadableFile(file: CoreWSExternalFile, handler: CorePluginFileHandler, siteId?: string)
            : Promise<CoreWSExternalFile> {

        if (handler && handler.getDownloadableFile) {
            return handler.getDownloadableFile(file, siteId).then((newFile) => {
                return newFile || file;
            });
        }

        return Promise.resolve(file);
    }

    /**
     * Get the RegExp of the component and filearea described in the URL.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return RegExp to match the revision or undefined if not found.
     */
    getComponentRevisionRegExp(args: string[]): RegExp {
        // Get handler based on component (args[1]).
        const handler = <CorePluginFileHandler> this.getHandler(args[1], true);

        if (handler && handler.getComponentRevisionRegExp) {
            return handler.getComponentRevisionRegExp(args);
        }
    }

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreFilepoolProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @return List of URLs.
     */
    getDownloadableFilesFromHTML(container: HTMLElement): string[] {
        let files = [];

        for (const component in this.enabledHandlers) {
            const handler = <CorePluginFileHandler> this.enabledHandlers[component];

            if (handler && handler.getDownloadableFilesFromHTML) {
                files = files.concat(handler.getDownloadableFilesFromHTML(container));
            }
        }

        return files;
    }

    /**
     * Sum the filesizes from a list of files checking if the size will be partial or totally calculated.
     *
     * @param files List of files to sum its filesize.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with file size and a boolean to indicate if it is the total size or only partial.
     */
    getFilesSize(files: CoreWSExternalFile[], siteId?: string): Promise<{ size: number, total: boolean }> {
        const promises = [],
            result = {
                size: 0,
                total: true
            };

        files.forEach((file) => {
            promises.push(this.getFileSize(file, siteId).then((size) => {
                if (typeof size == 'undefined') {
                    // We don't have the file size, cannot calculate its total size.
                    result.total = false;
                } else {
                    result.size += size;
                }
            }));
        });

        return Promise.all(promises).then(() => {
            return result;
        });
    }

    /**
     * Get a file size.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the size.
     */
    getFileSize(file: CoreWSExternalFile, siteId?: string): Promise<number> {
        const handler = this.getHandlerForFile(file);

        // First of all check if file can be downloaded.
        return this.getHandlerDownloadableFile(file, handler, siteId).then((file) => {
            if (!file) {
                return 0;
            }

            if (handler && handler.getFileSize) {
                return handler.getFileSize(file, siteId).catch(() => {
                    return file.filesize;
                });
            }

            return Promise.resolve(file.filesize);
        });
    }

    /**
     * Get a handler to treat a certain file.
     *
     * @param file File data.
     * @return Handler.
     */
    protected getHandlerForFile(file: CoreWSExternalFile): CorePluginFileHandler {
        for (const component in this.enabledHandlers) {
            const handler = <CorePluginFileHandler> this.enabledHandlers[component];

            if (handler && handler.shouldHandleFile && handler.shouldHandleFile(file)) {
                return handler;
            }
        }
    }

    /**
     * Removes the revision number from a file URL.
     *
     * @param url URL to be replaced.
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return Replaced URL without revision.
     */
    removeRevisionFromUrl(url: string, args: string[]): string {
        // Get handler based on component (args[1]).
        const handler = <CorePluginFileHandler> this.getHandler(args[1], true);

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
     * @return Promise resolved when done.
     */
    treatDownloadedFile(fileUrl: string, file: FileEntry, siteId?: string): Promise<any> {
        const handler = this.getHandlerForFile({fileurl: fileUrl});

        if (handler && handler.treatDownloadedFile) {
            return handler.treatDownloadedFile(fileUrl, file, siteId);
        }

        return Promise.resolve();
    }
}
