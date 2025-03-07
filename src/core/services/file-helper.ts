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

import { CoreNetwork } from '@services/network';
import { CoreFile } from '@services/file';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreWS, CoreWSFile } from '@services/ws';
import { CoreUrl } from '@singletons/url';
import { CoreOpener, CoreOpenerOpenFileOptions, OpenFileAction } from '@singletons/opener';
import { CoreConstants, DownloadStatus } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { makeSingleton, Translate } from '@singletons';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreConfig } from './config';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CorePlatform } from './platform';
import { CorePath } from '@singletons/path';
import { CoreText } from '@singletons/text';
import { CorePrompts } from './overlays/prompts';

/**
 * Provider to provide some helper functions regarding files and packages.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileHelperProvider {

    /**
     * Check if the default behaviour of the app is open file with picker.
     *
     * @returns Boolean.
     */
    defaultIsOpenWithPicker(): boolean {
        return CorePlatform.isIOS() && CoreConstants.CONFIG.iOSDefaultOpenFileAction === OpenFileAction.OPEN_WITH;
    }

    /**
     * Convenience function to open a file, downloading it if needed.
     *
     * @param file The file to download.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param state The file's state. If not provided, it will be calculated.
     * @param onProgress Function to call on progress.
     * @param siteId The site ID. If not defined, current site.
     * @param options Options to open the file.
     * @returns Resolved on success.
     */
    async downloadAndOpenFile(
        file: CoreWSFile,
        component?: string,
        componentId?: string | number,
        state?: DownloadStatus,
        onProgress?: CoreFileHelperOnProgress,
        siteId?: string,
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const fileUrl = CoreFileHelper.getFileUrl(file);
        const timemodified = this.getFileTimemodified(file);

        if (!this.isOpenableInApp(file)) {
            await this.showConfirmOpenUnsupportedFile(false, file);
        }

        let url = await this.downloadFileIfNeeded(
            file,
            fileUrl,
            component,
            componentId,
            timemodified,
            state,
            onProgress,
            siteId,
            options,
        );

        if (!url) {
            return;
        }

        if (!CoreUrl.isLocalFileUrl(url)) {
            /* In iOS, if we use the same URL in embedded browser and background download then the download only
               downloads a few bytes (cached ones). Add a hash to the URL so both URLs are different. */
            url = url + '#moodlemobile-embedded';

            try {
                await CoreOpener.openOnlineFile(url);

                return;
            } catch {
                // Error opening the file, some apps don't allow opening online files.
                // Get the state.
                if (!state) {
                    state = await CoreFilepool.getFileStateByUrl(siteId, fileUrl, timemodified);
                }

                if (state === DownloadStatus.DOWNLOADING) {
                    throw new CoreError(Translate.instant('core.erroropenfiledownloading'));
                }

                if (state === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
                    // File is not downloaded, download and then return the local URL.
                    url = await this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
                } else {
                    // File is outdated and can't be opened in online, return the local URL.
                    url = await CoreFilepool.getInternalUrlByUrl(siteId, fileUrl);
                }
            }
        }

        return CoreOpener.openFile(url, options);
    }

    /**
     * Download a file if it needs to be downloaded.
     *
     * @param file The file to download.
     * @param fileUrl The file URL.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param state The file's state. If not provided, it will be calculated.
     * @param onProgress Function to call on progress.
     * @param siteId The site ID. If not defined, current site.
     * @param options Options to open the file.
     * @returns Resolved with the URL to use on success.
     */
    protected async downloadFileIfNeeded(
        file: CoreWSFile,
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified?: number,
        state?: DownloadStatus,
        onProgress?: CoreFileHelperOnProgress,
        siteId?: string,
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(siteId);
        const fixedUrl = await site.checkAndFixPluginfileURL(fileUrl);

        if (!state) {
            // Calculate the state.
            state = await CoreFilepool.getFileStateByUrl(siteId, fileUrl, timemodified);
        }

        // The file system is available.
        const isWifi = CoreNetwork.isWifi();
        const isOnline = CoreNetwork.isOnline();

        if (state === DownloadStatus.DOWNLOADED) {
            // File is downloaded, get the local file URL.
            return CoreFilepool.getUrlByUrl(siteId, fileUrl, component, componentId, timemodified, false, false, file);
        } else {
            if (!isOnline && !this.isStateDownloaded(state)) {
                // Not downloaded and user is offline, reject.
                throw new CoreNetworkError();
            }

            if (onProgress) {
                // This call can take a while. Send a fake event to notify that we're doing some calculations.
                onProgress({ calculating: true });
            }

            const shouldDownloadFirst = await CoreFilepool.shouldDownloadFileBeforeOpen(fixedUrl, file.filesize || 0, options);
            if (shouldDownloadFirst) {
                // Download the file first.
                if (state === DownloadStatus.DOWNLOADING) {
                    // It's already downloading, stop.
                    return fixedUrl;
                }

                // Download and then return the local URL.
                return this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
            }

            // Start the download if in wifi, but return the URL right away so the file is opened.
            if (isWifi) {
                this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
            }

            if (!this.isStateDownloaded(state) || isOnline) {
                // Not downloaded or online, return the online URL.
                return fixedUrl;
            } else {
                // Outdated but offline, so we return the local URL.
                return CoreFilepool.getUrlByUrl(
                    siteId,
                    fileUrl,
                    component,
                    componentId,
                    timemodified,
                    false,
                    false,
                    file,
                );
            }
        }
    }

    /**
     * Download the file.
     *
     * @param fileUrl The file URL.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param onProgress Function to call on progress.
     * @param file The file to download.
     * @param siteId The site ID. If not defined, current site.
     * @returns Resolved with internal URL on success, rejected otherwise.
     */
    async downloadFile(
        fileUrl: string,
        component?: string,
        componentId?: string | number,
        timemodified?: number,
        onProgress?: (event: ProgressEvent) => void,
        file?: CoreWSFile,
        siteId?: string,
    ): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Get the site and check if it can download files.
        const site = await CoreSites.getSite(siteId);

        if (!site.canDownloadFiles()) {
            throw new CoreError(Translate.instant('core.cannotdownloadfiles'));
        }

        try {
            return await CoreFilepool.downloadUrl(
                siteId,
                fileUrl,
                false,
                component,
                componentId,
                timemodified,
                onProgress,
                undefined,
                file,
            );
        } catch (error) {
            // Download failed, check the state again to see if the file was downloaded before.
            const state = await CoreFilepool.getFileStateByUrl(siteId, fileUrl, timemodified);

            if (this.isStateDownloaded(state)) {
                return CoreFilepool.getInternalUrlByUrl(siteId, fileUrl);
            } else {
                throw error;
            }
        }
    }

    /**
     * Get the file's URL.
     *
     * @param file The file.
     * @returns File URL.
     */
    getFileUrl(file: CoreWSFile): string {
        return 'fileurl' in file ? file.fileurl : file.url;
    }

    /**
     * Get the file's timemodified.
     *
     * @param file The file.
     * @returns File modified timestamp, 0 if none.
     */
    getFileTimemodified(file: CoreWSFile): number {
        return file.timemodified || 0;
    }

    /**
     * Check if a state is downloaded or outdated.
     *
     * @param state The state to check.
     * @returns If file has been downloaded (or outdated).
     */
    isStateDownloaded(state: DownloadStatus): boolean {
        return state === DownloadStatus.DOWNLOADED || state === DownloadStatus.OUTDATED;
    }

    /**
     * Whether the file has to be opened in browser.
     *
     * @param file The file to check.
     * @returns Whether the file should be opened in browser.
     */
    shouldOpenInBrowser(file: CoreWSFile): boolean {
        if (!file.mimetype) {
            return false;
        }

        const mimetype = file.mimetype;

        if (!('isexternalfile' in file) || !file.isexternalfile) {
            return mimetype === 'application/vnd.android.package-archive'
                || CoreMimetypeUtils.getFileExtension(file.filename ?? '') === 'apk';
        }

        if (mimetype.indexOf('application/vnd.google-apps.') != -1) {
            // Google Docs file, always open in browser.
            return true;
        }

        if (file.repositorytype == 'onedrive') {
            // In OneDrive, open in browser the office docs
            return mimetype.indexOf('application/vnd.openxmlformats-officedocument') != -1 ||
                    mimetype == 'text/plain' || mimetype == 'document/unknown';
        }

        return false;
    }

    /**
     * Calculate the total size of the given files.
     *
     * @param files The files to check.
     * @returns Total files size.
     */
    async getTotalFilesSize(files: CoreFileEntry[]): Promise<number> {
        let totalSize = 0;

        for (const file of files) {
            totalSize += await this.getFileSize(file);
        }

        return totalSize;
    }

    /**
     * Calculate the file size.
     *
     * @param file The file to check.
     * @returns File size.
     */
    async getFileSize(file: CoreFileEntry): Promise<number> {
        if ('filesize' in file && (file.filesize || file.filesize === 0)) {
            return file.filesize;
        }

        // If it's a remote file. First check if we have the file downloaded since it's more reliable.
        if ('filename' in file) {
            const fileUrl = CoreFileHelper.getFileUrl(file);

            try {
                const siteId = CoreSites.getCurrentSiteId();

                const path = await CoreFilepool.getFilePathByUrl(siteId, fileUrl);
                const fileEntry = await CoreFile.getFile(path);
                const fileObject = await CoreFile.getFileObjectFromFileEntry(fileEntry);

                return fileObject.size;
            } catch (error) {
                // Error getting the file, maybe it's not downloaded. Get remote size.
                const size = await CoreWS.getRemoteFileSize(fileUrl);

                if (size === -1) {
                    throw new CoreError(`Couldn't determine file size: ${fileUrl}`);
                }

                return size;
            }
        }

        // If it's a local file, get its size.
        if ('name' in file) {
            const fileObject = await CoreFile.getFileObjectFromFileEntry(file);

            return fileObject.size;
        }

        throw new CoreError('Couldn\'t determine file size');
    }

    /**
     * Is the file openable in app.
     *
     * @param file The file to check.
     * @returns bool.
     */
    isOpenableInApp(file: {filename?: string; name?: string}): boolean {
        const regex = /(?:\.([^.]+))?$/;
        const regexResult = regex.exec(file.filename || file.name || '');

        if (!regexResult || !regexResult[1]) {
            // Couldn't find the extension. Assume it's openable.
            return true;
        }

        return !this.isFileTypeExcludedInApp(regexResult[1]);
    }

    /**
     * Show a confirm asking the user if we wants to open the file.
     *
     * @param onlyDownload Whether the user is only downloading the file, not opening it.
     * @param file The file that will be opened.
     * @returns Promise resolved if confirmed, rejected otherwise.
     */
    async showConfirmOpenUnsupportedFile(onlyDownload = false, file: {filename?: string; name?: string}): Promise<void> {
        file = file || {}; // Just in case some plugin doesn't pass it. This can be removed in the future, @since app 4.1.

        // Check if the user decided not to see the warning.
        const regex = /(?:\.([^.]+))?$/;
        const regexResult = regex.exec(file.filename || file.name || '');

        const configKey = 'CoreFileUnsupportedWarningDisabled-' + (regexResult?.[1] ?? 'unknown');
        const dontShowWarning = await CoreConfig.get(configKey, 0);
        if (dontShowWarning) {
            return;
        }

        const message = Translate.instant('core.cannotopeninapp' + (onlyDownload ? 'download' : ''));
        const okButton = Translate.instant(onlyDownload ? 'core.downloadfile' : 'core.openfile');

        try {
            const dontShowAgain = await CorePrompts.show(message, 'checkbox', {
                placeholderOrLabel: Translate.instant('core.dontshowagain'),
                buttons: { okText: okButton },
                cssClass: 'core-alert-force-on-top',
            });

            if (dontShowAgain) {
                CoreConfig.set(configKey, 1);
            }
        } catch {
            // User canceled.
            throw new CoreCanceledError('');
        }
    }

    /**
     * Is the file type excluded to open in app.
     *
     * @param fileType The file to check.
     * @returns If the file type is excluded in the app.
     */
    isFileTypeExcludedInApp(fileType: string): boolean {
        const currentSite = CoreSites.getCurrentSite();
        const fileTypeExcludeList = currentSite?.getStoredConfig('tool_mobile_filetypeexclusionlist');

        if (!fileTypeExcludeList) {
            return false;
        }

        const regEx = new RegExp('(,|^)' + fileType + '(,|$)', 'g');

        return !!fileTypeExcludeList.match(regEx);
    }

    /**
     * Extract filename from the path.
     *
     * @param file The file.
     * @returns The file name.
     */
    getFilenameFromPath(file: CoreFileEntry): string | undefined {
        const path = CoreFileUtils.isFileEntry(file) ? file.fullPath : file.filepath;

        if (path === undefined || path.length == 0) {
            return;
        }

        return path.split('\\').pop()?.split('/').pop();
    }

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @param files Files to extract the URL from. They need to have the URL in a 'url' or 'fileurl' attribute.
     * @returns Pluginfile URL, undefined if no files found.
     */
    getTextPluginfileUrl(files: CoreWSFile[]): string | undefined {
        if (files?.length) {
            const url = this.getFileUrl(files[0]);

            // Remove text after last slash (encoded or not).
            return url?.substring(0, Math.max(url.lastIndexOf('/'), url.lastIndexOf('%2F')));
        }

        return;
    }

    /**
     * Replace draftfile URLs with the equivalent pluginfile URL.
     *
     * @param siteUrl URL of the site.
     * @param text Text to treat, including draftfile URLs.
     * @param files List of files of the area, using pluginfile URLs.
     * @returns Treated text and map with the replacements.
     */
    replaceDraftfileUrls(
        siteUrl: string,
        text: string,
        files: CoreWSFile[],
    ): { text: string; replaceMap?: {[url: string]: string} } {

        if (!text || !files || !files.length) {
            return { text };
        }

        const draftfileUrl = CorePath.concatenatePaths(siteUrl, 'draftfile.php');
        const matches = text.match(new RegExp(CoreText.escapeForRegex(draftfileUrl) + '[^\'" ]+', 'ig'));

        if (!matches || !matches.length) {
            return { text };
        }

        // Index the pluginfile URLs by file name.
        const pluginfileMap: {[name: string]: string} = {};
        files.forEach((file) => {
            if (!file.filename) {
                return;
            }
            pluginfileMap[file.filename] = CoreFileHelper.getFileUrl(file);
        });

        // Replace each draftfile with the corresponding pluginfile URL.
        const replaceMap: {[url: string]: string} = {};
        matches.forEach((url) => {
            if (replaceMap[url]) {
                // URL already treated, same file embedded more than once.
                return;
            }

            // Get the filename from the URL.
            let filename = url.substring(url.lastIndexOf('/') + 1);
            if (filename.indexOf('?') != -1) {
                filename = filename.substring(0, filename.indexOf('?'));
            }
            filename = CoreUrl.decodeURIComponent(filename);

            if (pluginfileMap[filename]) {
                replaceMap[url] = pluginfileMap[filename];
                text = text.replace(new RegExp(CoreText.escapeForRegex(url), 'g'), pluginfileMap[filename]);
            }
        });

        return {
            text,
            replaceMap,
        };
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @param text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @returns Treated text.
     */
    replacePluginfileUrls(text: string, files: CoreWSFile[]): string {
        if (text && typeof text === 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(/@@PLUGINFILE@@/g, fileURL);
            }
        }

        return text;
    }

    /**
     * Restore original draftfile URLs.
     *
     * @param siteUrl Site URL.
     * @param treatedText Treated text with replacements.
     * @param originalText Original text.
     * @param files List of files to search and replace.
     * @returns Treated text.
     */
    restoreDraftfileUrls(siteUrl: string, treatedText: string, originalText: string, files: CoreWSFile[]): string {
        if (!treatedText || !files || !files.length) {
            return treatedText;
        }

        const draftfileUrl = CorePath.concatenatePaths(siteUrl, 'draftfile.php');
        const draftfileUrlRegexPrefix = CoreText.escapeForRegex(draftfileUrl) + '/[^/]+/[^/]+/[^/]+/[^/]+/';

        files.forEach((file) => {
            // Get the file name from the URL instead of using file.filename because the URL can have encoded characters.
            // encodeURIComponent doesn't encode parenthesis, so it's better to rely on the name from the URL.
            const url = CoreFileHelper.getFileUrl(file);
            let filename = url.substring(url.lastIndexOf('/') + 1);
            if (filename.indexOf('?') != -1) {
                filename = filename.substring(0, filename.indexOf('?'));
            }

            // Search the draftfile URL in the original text.
            const matches = originalText.match(
                new RegExp(draftfileUrlRegexPrefix + CoreText.escapeForRegex(filename) + '[^\'" ]*', 'i'),
            );

            if (!matches || !matches[0]) {
                return; // Original URL not found, skip.
            }

            treatedText = treatedText.replace(new RegExp(CoreText.escapeForRegex(url), 'g'), matches[0]);
        });

        return treatedText;
    }

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @param text Text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @returns Treated text.
     */
    restorePluginfileUrls(text: string, files: CoreWSFile[]): string {
        if (text && typeof text == 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(new RegExp(CoreText.escapeForRegex(fileURL), 'g'), '@@PLUGINFILE@@');
            }
        }

        return text;
    }

}

export const CoreFileHelper = makeSingleton(CoreFileHelperProvider);

export type CoreFileHelperOnProgress = (event?: ProgressEvent | { calculating: true }) => void;

export type CoreFileEntry = CoreWSFile | FileEntry;
