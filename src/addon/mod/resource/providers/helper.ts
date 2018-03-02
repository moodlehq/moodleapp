// (C) Copyright 2015 Martin Dougiamas
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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModResourceProvider } from './resource';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreFileProvider } from '@providers/file';
import { CoreAppProvider } from '@providers/app';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreConstants } from '@core/constants';

/**
 * Service that provides helper functions for resources.
 */
@Injectable()
export class AddonModResourceHelperProvider {

    /* Constants to determine how a resource should be displayed in Moodle. */
    // Try the best way.
    protected DISPLAY_AUTO = 0;
    // Display using object tag.
    protected DISPLAY_EMBED = 1;
    // Display inside frame.
    protected DISPLAY_FRAME = 2;
    // Display normal link in new window.
    protected DISPLAY_NEW = 3;
    // Force download of file instead of display.
    protected DISPLAY_DOWNLOAD = 4;
    // Open directly.
    protected DISPLAY_OPEN = 5;
    // Open in "emulated" pop-up without navigation.
    protected DISPLAY_POPUP = 6;

    constructor(private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private resourceProvider: AddonModResourceProvider,
            private textUtils: CoreTextUtilsProvider, private mimetypeUtils: CoreMimetypeUtilsProvider,
            private fileProvider: CoreFileProvider, private appProvider: CoreAppProvider,
            private filepoolProvider: CoreFilepoolProvider, private utils: CoreUtilsProvider,
            private sitesProvider: CoreSitesProvider, private translate: TranslateService) {
    }

    /**
     * Get the HTML to display an embedded resource.
     *
     * @param {any} module The module object.
     * @return {Promise<any>}      Promise resolved with the iframe src.
     * @since 3.3
     */
    getEmbeddedHtml(module: any): Promise<any> {
        if (!module.contents || !module.contents.length) {
            return Promise.reject(null);
        }

        const file = module.contents[0];

        return this.treatResourceMainFile(file, module.id).then((result) => {
            const ext = this.mimetypeUtils.getFileExtension(file.filename),
                type = this.mimetypeUtils.getExtensionType(ext),
                mimeType = this.mimetypeUtils.getMimeType(ext);

            if (type == 'image') {
                return '<img src="' + result.path + '"></img>';
            }

            if (type == 'audio' || type == 'video') {
                return '<' + type + ' controls title="' + file.filename + '"" src="' + result.path + '">' +
                    '<source src="' + result.path + '" type="' + mimeType + '">' +
                    '</' + type + '>';
            }

            // Shouldn't reach here, the user should have called $mmFS#canBeEmbedded.
            return '';
        });
    }

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @param {any} module The module object.
     * @return {Promise<any>} Promise resolved with the iframe src.
     */
    getIframeSrc(module: any): Promise<any> {
        if (!module.contents.length) {
            return Promise.reject(null);
        }

        const mainFile = module.contents[0];
        let mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        return this.filepoolProvider.getPackageDirUrlByUrl(this.sitesProvider.getCurrentSiteId(), module.url).then((dirPath) => {
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return this.textUtils.concatenatePaths(dirPath, mainFilePath);
        }).catch(() => {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL.
            if (this.appProvider.isOnline() && mainFile.fileurl) {
                // This URL is going to be injected in an iframe, we need this to make it work.
                return Promise.resolve(this.sitesProvider.getCurrentSite().fixPluginfileURL(mainFile.fileurl));
            }

            return Promise.reject(null);
        });
    }

    /**
     * Whether the resource has to be displayed embedded.
     *
     * @param {any} module    The module object.
     * @param {number} [display] The display mode (if available).
     * @return {boolean}         Whether the resource should be displayed in an iframe.
     * @since 3.3
     */
    isDisplayedEmbedded(module: any, display: number): boolean {
        if (!module.contents.length || !this.fileProvider.isAvailable()) {
            return false;
        }

        const ext = this.mimetypeUtils.getFileExtension(module.contents[0].filename);

        return (display == this.DISPLAY_EMBED || display == this.DISPLAY_AUTO) && this.mimetypeUtils.canBeEmbedded(ext);
    }

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @param {any} module The module object.
     * @return {boolean}   Whether the resource should be displayed in an iframe.
     */
    isDisplayedInIframe(module: any): boolean {
        if (!module.contents.length || !this.fileProvider.isAvailable()) {
            return false;
        }

        const ext = this.mimetypeUtils.getFileExtension(module.contents[0].filename),
            mimetype = this.mimetypeUtils.getMimeType(ext);

        return mimetype == 'text/html';
    }

    /**
     * Opens a file of the resource activity.
     *
     * @param  {any} module        Module where to get the contents.
     * @param  {number} courseId   Course Id, used for completion purposes.
     * @return {Promise<any>}      Resolved when done.
     */
    openModuleFile(module: any, courseId: number): Promise<any> {
        const modal = this.domUtils.showModalLoading();

        return this.openFile(module.contents, module.id).then(() => {
            this.resourceProvider.logView(module.instance).then(() => {
                this.courseProvider.checkModuleCompletion(courseId, module.completionstatus);
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_resource.errorwhileloadingthecontent', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Download and open the file from the resource.
     *
     * @param {any} contents Array of content objects.
     * @param {number} moduleId The module ID.
     * @return {Promise<any>}
     */
    protected openFile(contents: any, moduleId: number): Promise<any> {
        if (!contents || !contents.length) {
            return Promise.reject(null);
        }

        const siteId = this.sitesProvider.getCurrentSiteId(),
            file = contents[0],
            files = [file],
            component = AddonModResourceProvider.COMPONENT;

        if (this.shouldOpenInBrowser(contents[0])) {
            if (this.appProvider.isOnline()) {
                // Open in browser.
                let fixedUrl = this.sitesProvider.getCurrentSite().fixPluginfileURL(file.fileurl).replace('&offline=1', '');
                fixedUrl = fixedUrl.replace(/forcedownload=\d+&/, ''); // Remove forcedownload when followed by another param.
                fixedUrl = fixedUrl.replace(/[\?|\&]forcedownload=\d+/, ''); // Remove forcedownload when not followed by any param.
                this.utils.openInBrowser(fixedUrl);

                if (this.fileProvider.isAvailable()) {
                    // Download the file if needed (file outdated or not downloaded).
                    // Download will be in background, don't return the promise.
                    this.filepoolProvider.downloadPackage(siteId, files, component, moduleId);
                }

                return Promise.resolve();
            }

            // Not online, get the offline file. It will fail if not found.
            return this.filepoolProvider.getInternalUrlByUrl(siteId, file.fileurl).then((path) => {
                return this.utils.openFile(path);
            }).catch(() => {
                return Promise.reject(this.translate.instant('core.networkerrormsg'));
            });
        }

        return this.treatResourceMainFile(file, moduleId).then((result) => {
            if (result.path.indexOf('http') === 0) {
                return this.utils.openOnlineFile(result.path).catch((error) => {
                    // Error opening the file, some apps don't allow opening online files.
                    if (!this.fileProvider.isAvailable()) {
                        return Promise.reject(error);
                    }

                    let subPromise;
                    if (result.status === CoreConstants.DOWNLOADING) {
                        subPromise = Promise.reject(this.translate.instant('core.erroropenfiledownloading'));
                    } else if (result.status === CoreConstants.NOT_DOWNLOADED) {
                        subPromise = this.filepoolProvider.downloadPackage(siteId, files, AddonModResourceProvider.COMPONENT,
                                moduleId).then(() => {
                            return this.filepoolProvider.getInternalUrlByUrl(siteId, file.fileurl);
                        });
                    } else {
                        // File is outdated or stale and can't be opened in online, return the local URL.
                        subPromise = this.filepoolProvider.getInternalUrlByUrl(siteId, file.fileurl);
                    }

                    return subPromise.then((path) => {
                        return this.utils.openFile(path);
                    });
                });
            }

            return this.utils.openFile(result.path);
        });
    }

    /**
     * Treat the main file of a resource, downloading it if needed and returning the URL to use and the status of the resource.
     *
     * @param  {any} file     Resource's main file.
     * @param  {number} moduleId The module ID.
     * @return {Promise<any>}         Promise resolved with an object containing:
     *                               * path: The URL to use; can be an online URL or an offline path.
     *                               * status: The status of the resource.
     */
    protected treatResourceMainFile(file: any, moduleId: number): Promise<any> {
        const files = [file],
            url = file.fileurl,
            fixedUrl = this.sitesProvider.getCurrentSite().fixPluginfileURL(url),
            result = {
                status: '',
                path: fixedUrl
            };

        if (!this.fileProvider.isAvailable()) {
            // We use the live URL.
            return Promise.resolve(result);
        }

        const siteId = this.sitesProvider.getCurrentSiteId(),
            component = AddonModResourceProvider.COMPONENT;

        // The file system is available.
        return this.filepoolProvider.getPackageStatus(siteId, component, moduleId).then((status) => {
            result.status = status;

            const isWifi = !this.appProvider.isNetworkAccessLimited(),
                isOnline = this.appProvider.isOnline();

            if (status === CoreConstants.DOWNLOADED) {
                // Get the local file URL.
                return this.filepoolProvider.getInternalUrlByUrl(siteId, url);
            }

            if (status === CoreConstants.DOWNLOADING && !this.appProvider.isDesktop()) {
                // Return the online URL.
                return fixedUrl;
            }

            if (!isOnline && status === CoreConstants.NOT_DOWNLOADED) {
                // Not downloaded and we're offline, reject.
                return Promise.reject(null);
            }

            return this.filepoolProvider.shouldDownloadBeforeOpen(fixedUrl, file.filesize).then(() => {
                // Download and then return the local URL.
                return this.filepoolProvider.downloadPackage(siteId, files, component, moduleId).then(() => {
                    return this.filepoolProvider.getInternalUrlByUrl(siteId, url);
                });
            }).catch(() => {
                // Start the download if in wifi, but return the URL right away so the file is opened.
                if (isWifi && isOnline) {
                    this.filepoolProvider.downloadPackage(siteId, files, component, moduleId);
                }

                if (status === CoreConstants.NOT_DOWNLOADED || isOnline) {
                    // Not downloaded or outdated and online, return the online URL.
                    return fixedUrl;
                }

                const timeMod = this.filepoolProvider.getTimemodifiedFromFileList(files);

                // Outdated but offline, so we return the local URL.
                return this.filepoolProvider.getUrlByUrl(siteId, url, component, moduleId, timeMod, false, false, file);
            });
        }).then((path) => {
            result.path = path;

            return result;
        });
    }

    /**
     * Whether the resource has to be opened in browser.
     *
     * @param {any} file Module's main file.
     * @return {boolean}    Whether the resource should be opened in browser.
     * @since 3.3
     */
    shouldOpenInBrowser(file: any): boolean {
        if (!file || !file.isexternalfile || !file.mimetype) {
            return false;
        }

        const mimetype = file.mimetype;
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
}
