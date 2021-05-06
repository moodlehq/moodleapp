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
import { Md5 } from 'ts-md5/dist/md5';

import { CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';
import { CoreSitePublicConfigResponse } from '@classes/site';
import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWS } from '@services/ws';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';

const SEPARATOR_35 = /\/\*\*? *3\.5(\.0)? *styles? *\*\//i; // A comment like "/* 3.5 styles */".
export const TMP_SITE_ID = 'tmpsite';

/**
 * Service to handle remote themes. A remote theme is a CSS sheet stored in the site that allows customising the Mobile app.
 */
@Injectable({ providedIn: 'root' })
export class AddonRemoteThemesProvider {

    static readonly COMPONENT = 'mmaRemoteStyles';

    protected logger: CoreLogger;
    protected stylesEls: {[siteId: string]: { element: HTMLStyleElement; hash: string }} = {};

    constructor() {
        this.logger = CoreLogger.getInstance('AddonRemoteThemesProvider');
    }

    /**
     * Initialize remote themes.
     */
    async initialize(): Promise<void> {
        this.listenEvents();

        // Preload the current site styles first, we want this to be fast.
        await this.preloadCurrentSite();

        // Preload the styles of the rest of sites.
        await this.preloadSites();
    }

    /**
     * Listen events.
     */
    protected listenEvents(): void {
        let addingSite: string | undefined;

        // When a new site is added to the app, add its styles.
        CoreEvents.on(CoreEvents.SITE_ADDED, async (data) => {
            addingSite = data.siteId;

            try {
                await this.addSite(data.siteId);

                if (addingSite == data.siteId) {
                    addingSite = undefined;
                }

                // User has logged in, remove tmp styles and enable loaded styles.
                if (data.siteId == CoreSites.getCurrentSiteId()) {
                    this.unloadTmpStyles();
                    this.enable(data.siteId);
                }
            } catch (error) {
                this.logger.error('Error adding remote styles for new site', error);
            }
        });

        // Update styles when current site is updated.
        CoreEvents.on(CoreEvents.SITE_UPDATED, (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.load(data.siteId).catch((error) => {
                    this.logger.error('Error loading site after site update', error);
                });
            }
        });

        // Enable styles of current site on login.
        CoreEvents.on(CoreEvents.LOGIN, (data) => {
            this.unloadTmpStyles();
            this.enable(data.siteId);
        });

        // Disable added styles on logout.
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.clear();
        });

        // Remove site styles when a site is deleted.
        CoreEvents.on(CoreEvents.SITE_DELETED, (site) => {
            this.removeSite(site.getId());
        });

        // Load temporary styles when site config is checked in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_CHECKED, (data) => {
            this.loadTmpStylesForSiteConfig(data.config).catch((error) => {
                this.logger.error('Error loading tmp styles', error);
            });
        });

        // Unload temporary styles when site config is "unchecked" in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_UNCHECKED, (data) => {
            if (data.siteId && data.siteId === addingSite) {
                // The tmp styles are from a site that is being added permanently.
                // Wait for the final site styles to be loaded before removing the tmp styles so there is no blink effect.
                return;
            }

            // The tmp styles are from a site that wasn't added in the end. Just remove them.
            this.unloadTmpStyles();
        });
    }

    /**
     * Add a style element for a site and load the styles for that element. The style will be disabled.
     *
     * @param siteId Site ID.
     * @return Promise resolved when added and loaded.
     */
    async addSite(siteId?: string): Promise<void> {
        if (!siteId || this.stylesEls[siteId]) {
            // Invalid site ID or style already added.
            return;
        }

        // Create the style and add it to the header.
        this.initSiteStyleElement(siteId, true);

        try {
            await this.load(siteId, true);
        } catch (error) {
            this.logger.error('Error loading site after site init', error);
        }
    }

    /**
     * Clear styles added to the DOM, disabling them all.
     */
    clear(): void {
        // Disable all the styles.
        this.disableElementsBySelector('style[id*=mobilecssurl]');

        // Set StatusBar properties.
        CoreApp.setStatusBarColor();
    }

    /**
     * Create a style element.
     *
     * @param id ID to set to the element.
     * @param disabled Whether the element should be disabled.
     * @return New element.
     */
    protected createStyleElement(id: string, disabled: boolean): HTMLStyleElement {
        const styleEl = document.createElement('style');

        styleEl.setAttribute('id', id);
        this.disableElement(styleEl, disabled);

        return styleEl;
    }

    /**
     * Enabled or disable a certain style element.
     *
     * @param element The element to enable or disable.
     * @param disable Whether to disable or enable the element.
     */
    disableElement(element: HTMLStyleElement, disable: boolean): void {
        // Setting disabled should be enough, but we also set the attribute so it can be seen in the DOM which ones are disabled.
        // Cast to any because the HTMLStyleElement type doesn't define the disabled attribute.
        (<any> element).disabled = !!disable; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (disable) {
            element.setAttribute('disabled', 'true');
        } else {
            element.removeAttribute('disabled');

            if (element.innerHTML != '') {
                CoreApp.setStatusBarColor();
            }
        }
    }

    /**
     * Disable all the style elements based on a query selector.
     *
     * @param selector The selector to get the style elements.
     */
    protected disableElementsBySelector(selector: string): void {
        const styles = <HTMLStyleElement[]> Array.from(document.querySelectorAll(selector));

        styles.forEach((style) => {
            this.disableElement(style, true);
        });
    }

    /**
     * Downloads a CSS file and remove old files if needed.
     *
     * @param siteId Site ID.
     * @param url File URL.
     * @return Promise resolved when the file is downloaded.
     */
    protected async downloadFileAndRemoveOld(siteId: string, url: string): Promise<string> {

        try {
            // Check if the file is downloaded.
            const state = await CoreFilepool.getFileStateByUrl(siteId, url);

            if (state == CoreConstants.NOT_DOWNLOADED) {
                // File not downloaded, URL has changed or first time. Delete downloaded CSS files.
                await CoreFilepool.removeFilesByComponent(siteId, AddonRemoteThemesProvider.COMPONENT, 1);
            }
        } catch {
            // An error occurred while getting state (shouldn't happen). Don't delete downloaded file.
        }

        return CoreFilepool.downloadUrl(siteId, url, false, AddonRemoteThemesProvider.COMPONENT, 1);
    }

    /**
     * Enable the styles of a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    enable(siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (this.stylesEls[siteId]) {
            this.disableElement(this.stylesEls[siteId].element, false);
        }
    }

    /**
     * Get remote styles of a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the styles and the URL of the CSS file,
     *         resolved with undefined if no styles to load.
     */
    async get(siteId?: string): Promise<{fileUrl: string; styles: string} | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(siteId);
        const infos = site.getInfo();

        if (!infos?.mobilecssurl) {
            if (infos?.mobilecssurl === '') {
                // CSS URL is empty. Delete downloaded files (if any).
                CoreFilepool.removeFilesByComponent(siteId, AddonRemoteThemesProvider.COMPONENT, 1);
            }

            return;
        }

        let fileUrl = infos.mobilecssurl;

        if (CoreFile.isAvailable()) {
            // The file system is available. Download the file and remove old CSS files if needed.
            fileUrl = await this.downloadFileAndRemoveOld(siteId, fileUrl);
        }

        this.logger.debug('Loading styles from: ', fileUrl);

        // Get the CSS content using HTTP because we will treat the styles before saving them in the file.
        const text = await CoreWS.getText(fileUrl);

        return { fileUrl, styles: this.get35Styles(text) };
    }

    /**
     * Check if the CSS code has a separator for 3.5 styles. If it does, get only the styles after the separator.
     *
     * @param cssCode The CSS code to check.
     * @return The filtered styles.
     */
    protected get35Styles(cssCode: string): string {
        const separatorPos = cssCode.search(SEPARATOR_35);
        if (separatorPos > -1) {
            return cssCode.substr(separatorPos).replace(SEPARATOR_35, '');
        }

        return cssCode;
    }

    /**
     * Init the style element for a site.
     *
     * @param siteId Site ID.
     * @param disabled Whether the element should be disabled.
     */
    protected initSiteStyleElement(siteId: string, disabled: boolean): void {
        if (this.stylesEls[siteId]) {
            // Already initialized, ignore.
            return;
        }

        // Create the style and add it to the header.
        const styleEl = this.createStyleElement('mobilecssurl-' + siteId, disabled);

        document.head.appendChild(styleEl);
        this.stylesEls[siteId] = {
            element: styleEl,
            hash: '',
        };
    }

    /**
     * Load styles for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param disabled Whether loaded styles should be disabled.
     * @return Promise resolved when styles are loaded.
     */
    async load(siteId?: string, disabled?: boolean): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        disabled = !!disabled;

        if (!siteId || !this.stylesEls[siteId]) {
            throw new CoreError('Cannot load remote styles, site not found: ${siteId}');
        }

        this.logger.debug('Load site', siteId, disabled);

        // Enable or disable the styles.
        this.disableElement(this.stylesEls[siteId].element, disabled);

        const data = await this.get(siteId);

        if (typeof data == 'undefined') {
            // Nothing to load.
            return;
        }

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
        CoreUtils.ignoreErrors(
            CoreFilepool.treatCSSCode(siteId, data.fileUrl, data.styles, AddonRemoteThemesProvider.COMPONENT, 2),
        );
    }

    /**
     * Load styles for a temporary site. These styles aren't prefetched.
     *
     * @param url URL to get the styles from.
     * @return Promise resolved when loaded.
     */
    async loadTmpStyles(url?: string): Promise<void> {
        if (!url) {
            return;
        }

        let text = await CoreWS.getText(url);

        text = this.get35Styles(text);

        this.initSiteStyleElement(TMP_SITE_ID, false);
        this.stylesEls[TMP_SITE_ID].element.innerHTML = text;
    }

    /**
     * Load styles for a temporary site, given its public config. These styles aren't prefetched.
     *
     * @param config Site public config.
     * @return Promise resolved when loaded.
     */
    loadTmpStylesForSiteConfig(config: CoreSitePublicConfigResponse): Promise<void> {
        return this.loadTmpStyles(config.mobilecssurl);
    }

    /**
     * Preload the styles of the current site (stored in DB).
     *
     * @return Promise resolved when loaded.
     */
    async preloadCurrentSite(): Promise<void> {
        const siteId = await CoreUtils.ignoreErrors(CoreSites.getStoredCurrentSiteId());

        if (!siteId) {
            // No current site stored.
            return;
        }

        return this.addSite(siteId);
    }

    /**
     * Preload the styles of all the stored sites.
     *
     * @return Promise resolved when loaded.
     */
    async preloadSites(): Promise<void> {
        const ids = await CoreSites.getSitesIds();

        await CoreUtils.allPromises(ids.map((siteId) => this.addSite(siteId)));
    }

    /**
     * Remove the styles of a certain site.
     *
     * @param siteId Site ID.
     */
    removeSite(siteId: string): void {
        if (siteId && this.stylesEls[siteId]) {
            document.head.removeChild(this.stylesEls[siteId].element);
            delete this.stylesEls[siteId];
        }
    }

    /**
     * Unload styles for a temporary site.
     */
    unloadTmpStyles(): void {
        return this.removeSite(TMP_SITE_ID);
    }

}

export const AddonRemoteThemes = makeSingleton(AddonRemoteThemesProvider);
