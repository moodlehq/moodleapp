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
import { CoreLoggerProvider } from './logger';
import { CoreWSExternalFile } from '@providers/ws';
import { FileEntry } from '@ionic-native/file';

/**
 * Interface that all plugin file handlers must implement.
 */
export interface CorePluginFileHandler {
    /**
     * A name to identify the handler.
     */
    name: string;

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
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    canDownloadFile?(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile>;

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
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreDomUtilsProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @return {string[]} List of URLs.
     */
    getDownloadableFiles?(container: HTMLElement): string[];

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
export class CorePluginFileDelegate {
    protected logger;
    protected handlers: { [s: string]: CorePluginFileHandler } = {};

    constructor(logger: CoreLoggerProvider) {
        this.logger = logger.getInstance('CorePluginFileDelegate');
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    canDownloadFile(file: CoreWSExternalFile, siteId?: string): Promise<CoreWSExternalFile> {
        const handler = this.getHandlerForFile(file);

        return this.canHandlerDownloadFile(file, handler, siteId);
    }

    /**
     * Check whether a file can be downloaded. If so, return the file to download.
     *
     * @param file The file data.
     * @param handler The handler to use.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file to use. Rejected if cannot download.
     */
    protected canHandlerDownloadFile(file: CoreWSExternalFile, handler: CorePluginFileHandler, siteId?: string)
            : Promise<CoreWSExternalFile> {

        if (handler && handler.canDownloadFile) {
            return handler.canDownloadFile(file, siteId).then((newFile) => {
                return newFile || file;
            });
        }

        return Promise.resolve(file);
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
     * Get the handler for a certain pluginfile url.
     *
     * @param component Component of the plugin.
     * @return Handler. Undefined if no handler found for the plugin.
     */
    protected getPluginHandler(component: string): CorePluginFileHandler {
        if (typeof this.handlers[component] != 'undefined') {
            return this.handlers[component];
        }
    }

    /**
     * Get the RegExp of the component and filearea described in the URL.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return RegExp to match the revision or undefined if not found.
     */
    getComponentRevisionRegExp(args: string[]): RegExp {
        // Get handler based on component (args[1]).
        const handler = this.getPluginHandler(args[1]);

        if (handler && handler.getComponentRevisionRegExp) {
            return handler.getComponentRevisionRegExp(args);
        }
    }

    /**
     * Given an HTML element, get the URLs of the files that should be downloaded and weren't treated by
     * CoreDomUtilsProvider.extractDownloadableFilesFromHtml.
     *
     * @param container Container where to get the URLs from.
     * @return List of URLs.
     */
    getDownloadableFiles(container: HTMLElement): string[] {
        let files = [];

        for (const component in this.handlers) {
            const handler = this.handlers[component];

            if (handler && handler.getDownloadableFiles) {
                files = files.concat(handler.getDownloadableFiles(container));
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
        return this.canHandlerDownloadFile(file, handler, siteId).then((canDownload) => {
            if (!canDownload) {
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
        for (const component in this.handlers) {
            const handler = this.handlers[component];

            if (handler && handler.shouldHandleFile && handler.shouldHandleFile(file)) {
                return handler;
            }
        }
    }

    /**
     * Register a handler.
     *
     * @param handler The handler to register.
     * @return True if registered successfully, false otherwise.
     */
    registerHandler(handler: CorePluginFileHandler): boolean {
        if (typeof this.handlers[handler.component || handler.name] !== 'undefined') {
            this.logger.log(`Handler '${handler.component}' already registered`);

            return false;
        }

        this.logger.log(`Registered handler '${handler.component}'`);
        this.handlers[handler.component || handler.name] = handler;

        return true;
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
        const handler = this.getPluginHandler(args[1]);

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
