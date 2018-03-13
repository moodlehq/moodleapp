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
import { Http } from '@angular/http';
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreConstants } from '@core/constants';
import { Md5 } from 'ts-md5/dist/md5';

/**
 * Service to handle remote themes. A remote theme is a CSS sheet stored in the site that allows customising the Mobile app.
 */
@Injectable()
export class AddonRemoteThemesProvider {
    static COMPONENT = 'mmaRemoteStyles';

    protected logger;
    protected stylesEls: {[siteId: string]: {element: HTMLStyleElement, hash: string}} = {};

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private fileProvider: CoreFileProvider,
            private filepoolProvider: CoreFilepoolProvider, private http: Http, private utils: CoreUtilsProvider,
            private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('AddonRemoteThemesProvider');
    }

    /**
     * Add a style element for a site and load the styles for that element. The style will be disabled.
     *
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when added and loaded.
     */
    addSite(siteId: string): Promise<any> {
        if (!siteId || this.stylesEls[siteId]) {
            // Invalid site ID or style already added.
            return Promise.resolve();
        }

        // Create the style and add it to the header.
        const styleEl = document.createElement('style');
        styleEl.setAttribute('id', 'mobilecssurl-' + siteId);
        this.disableElement(styleEl, true);

        document.head.appendChild(styleEl);
        this.stylesEls[siteId] = {
            element: styleEl,
            hash: ''
        };

        return this.load(siteId, true);
    }

    /**
     * Clear styles added to the DOM, disabling them all.
     */
    clear(): void {
        // Disable all the styles.
        const styles = <HTMLStyleElement[]> Array.from(document.querySelectorAll('style[id*=mobilecssurl]'));
        styles.forEach((style) => {
            this.disableElement(style, true);
        });
    }

    /**
     * Enabled or disable a certain style element.
     *
     * @param {HTMLStyleElement} element The element to enable or disable.
     * @param {boolean} disable Whether to disable or enable the element.
     */
    disableElement(element: HTMLStyleElement, disable: boolean): void {
        // Setting disabled should be enough, but we also set the attribute so it can be seen in the DOM which ones are disabled.
        if (disable) {
            element.disabled = true;
            element.setAttribute('disabled', 'disabled');
        } else {
            element.disabled = false;
            element.removeAttribute('disabled');
        }
    }

    /**
     * Downloads a CSS file and remove old files if needed.
     *
     * @param {string} siteId Site ID.
     * @param {string} url File URL.
     * @return {Promise<any>} Promise resolved when the file is downloaded.
     */
    protected downloadFileAndRemoveOld(siteId: string, url: string): Promise<any> {
        // Check if the file is downloaded.
        return this.filepoolProvider.getFileStateByUrl(siteId, url).then((state) => {
            return state !== CoreConstants.NOT_DOWNLOADED;
        }).catch(() => {
            return true; // An error occurred while getting state (shouldn't happen). Don't delete downloaded file.
        }).then((isDownloaded) => {
            if (!isDownloaded) {
                // File not downloaded, URL has changed or first time. Delete downloaded CSS files.
                return this.filepoolProvider.removeFilesByComponent(siteId, AddonRemoteThemesProvider.COMPONENT, 1);
            }
        }).then(() => {

            return this.filepoolProvider.downloadUrl(siteId, url, false, AddonRemoteThemesProvider.COMPONENT, 1);
        });
    }

    /**
     * Enable the styles of a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    enable(siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.stylesEls[siteId]) {
            this.disableElement(this.stylesEls[siteId].element, false);
        }
    }

    /**
     * Get remote styles of a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{fileUrl: string, styles: string}>} Promise resolved with the styles and the URL of the CSS file.
     */
    get(siteId?: string): Promise<{fileUrl: string, styles: string}> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let fileUrl;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const infos = site.getInfo();
            if (infos && infos.mobilecssurl) {
                fileUrl = infos.mobilecssurl;

                if (this.fileProvider.isAvailable()) {
                    // The file system is available. Download the file and remove old CSS files if needed.
                    return this.downloadFileAndRemoveOld(siteId, fileUrl);
                } else {
                    // Return the online URL.
                    return fileUrl;
                }
            } else {
                if (infos.mobilecssurl === '') {
                    // CSS URL is empty. Delete downloaded files (if any).
                    this.filepoolProvider.removeFilesByComponent(siteId, AddonRemoteThemesProvider.COMPONENT, 1);
                }

                return Promise.reject(null);
            }
        }).then((url) => {
            this.logger.debug('Loading styles from: ', url);

            // Get the CSS content using HTTP because we will treat the styles before saving them in the file.
            return this.http.get(url).toPromise();
        }).then((response): any => {
            const text = response && response.text();
            if (typeof text == 'string') {
                return {fileUrl: fileUrl, styles: text};
            } else {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Load styles for a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [disabled] Whether loaded styles should be disabled.
     * @return {Promise<any>} Promise resolved when styles are loaded.
     */
    load(siteId?: string, disabled?: boolean): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        disabled = !!disabled;

        this.logger.debug('Load site', siteId, disabled);

        if (siteId && this.stylesEls[siteId]) {
            // Enable or disable the styles.
            this.disableElement(this.stylesEls[siteId].element, disabled);

            return this.get(siteId).then((data) => {
                const hash = <string> Md5.hashAsciiStr(data.styles);

                // Update the styles only if they have changed.
                if (this.stylesEls[siteId].hash !== hash) {
                    this.stylesEls[siteId].element.innerHTML = data.styles;
                    this.stylesEls[siteId].hash = hash;

                    // Adding styles to a style element automatically enables it. Disable it again.
                    if (disabled) {
                        this.disableElement(this.stylesEls[siteId].element, true);
                    }
                }

                // Styles have been loaded, now treat the CSS.
                this.treatCSSCode(siteId, data.fileUrl, data.styles).catch(() => {
                    // Ignore errors.
                });
            });
        }

        return Promise.reject(null);
    }

    /**
     * Load styles for a temporary site. These styles aren't prefetched.
     *
     * @param {string} url URL to get the styles from.
     * @return {Promise<any>} Promise resolved when loaded.
     */
    loadTmpStyles(url: string): Promise<any> {
        if (!url) {
            return Promise.resolve();
        }

        return this.http.get(url).toPromise().then((response) => {
            const text = response && response.text();
            if (typeof text == 'string') {
                const styleEl = document.createElement('style');
                styleEl.setAttribute('id', 'mobilecssurl-tmpsite');
                styleEl.innerHTML = text;

                document.head.appendChild(styleEl);
                this.stylesEls.tmpsite = {
                    element: styleEl,
                    hash: ''
                };
            } else {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Preload the styles of the current site (stored in DB).
     *
     * @return {Promise<any>} Promise resolved when loaded.
     */
    preloadCurrentSite(): Promise<any> {
        return this.sitesProvider.getStoredCurrentSiteId().then((siteId) => {
            return this.addSite(siteId);
        });
    }

    /**
     * Preload the styles of all the stored sites.
     *
     * @return {Promise<any>} Promise resolved when loaded.
     */
    preloadSites(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((ids) => {
            const promises = [];
            ids.forEach((siteId) => {
                promises.push(this.addSite(siteId));
            });

            return this.utils.allPromises(promises);
        });
    }

    /**
     * Remove the styles of a certain site.
     *
     * @param {string} siteId Site ID.
     */
    removeSite(siteId: string): void {
        if (siteId && this.stylesEls[siteId]) {
            document.head.removeChild(this.stylesEls[siteId].element);
            delete this.stylesEls[siteId];
        }
    }

    /**
     * Search for files in a CSS code and try to download them. Once downloaded, replace their URLs
     * and store the result in the CSS file.
     *
     * @param {string} siteId  Site ID.
     * @param {string} fileUrl CSS file URL.
     * @param {string} cssCode CSS code.
     * @return {Promise<string>} Promise resolved with the CSS code.
     */
    protected treatCSSCode(siteId: string, fileUrl: string, cssCode: string): Promise<string> {
        if (!this.fileProvider.isAvailable()) {
            return Promise.reject(null);
        }

        const urls = this.domUtils.extractUrlsFromCSS(cssCode),
            promises = [];
        let filePath,
            updated = false;

        // Get the path of the CSS file.
        promises.push(this.filepoolProvider.getFilePathByUrl(siteId, fileUrl).then((path) => {
            filePath = path;
        }));

        urls.forEach((url) => {
            // Download the file only if it's an online URL.
            if (url.indexOf('http') == 0) {
                promises.push(this.filepoolProvider.downloadUrl(siteId, url, false, AddonRemoteThemesProvider.COMPONENT, 2)
                        .then((fileUrl) => {
                    if (fileUrl != url) {
                        cssCode = cssCode.replace(new RegExp(this.textUtils.escapeForRegex(url), 'g'), fileUrl);
                        updated = true;
                    }
                }).catch((error) => {
                    // It shouldn't happen. Ignore errors.
                    this.logger.warn('Error treating file ', url, error);
                }));
            }
        });

        return Promise.all(promises).then(() => {
            // All files downloaded. Store the result if it has changed.
            if (updated) {
                return this.fileProvider.writeFile(filePath, cssCode);
            }
        }).then(() => {
            return cssCode;
        });
    }

    /**
     * Unload styles for a temporary site.
     */
    unloadTmpStyles(): void {
        return this.removeSite('tmpsite');
    }
}
