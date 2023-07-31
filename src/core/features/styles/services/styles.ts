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
import { CoreError } from '@classes/errors/error';
import { CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { Md5 } from 'ts-md5';
import { CoreLogger } from '../../../singletons/logger';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Interface that all style handlers must implement.
 */
export interface CoreStyleHandler {

    /**
     * Source name.
     */
    name: string;

    /**
     * Priority of application.
     */
    priority: number;

    /**
     * Wether the handler should be enabled for the site.
     *
     * @param siteId Site Id.
     * @param config Site public config for temp sites.
     * @returns Wether the handler should be enabled for the site.
     */
    isEnabled(siteId: string, config?: CoreSitePublicConfigResponse): boolean | Promise<boolean>;

    /**
     * Get the style for the site.
     *
     * @param siteId Site Id.
     * @param config Site public config for temp sites.
     * @returns CSS to apply.
     */
    getStyle(siteId?: string, config?: CoreSitePublicConfigResponse): string | Promise<string>;
}

/**
 * Singleton with helper functions to style the app.
 */
@Injectable({ providedIn: 'root' })
export class CoreStylesService {

    protected logger: CoreLogger;

    protected stylesEls: {
        [siteId: string]: {
            [sourceName: string]: string; // Hashes
        };
    } = {};

    protected styleHandlers: CoreStyleHandler[] = [];

    static readonly TMP_SITE_ID = 'tmpsite';

    constructor() {
        this.logger = CoreLogger.getInstance('CoreStyles');
    }

    /**
     * Initialize styles.
     */
    async initialize(): Promise<void> {
        this.listenEvents();

        // Preload the current site styles first, we want this to be fast.
        await this.preloadCurrentSite();

        // Preload the styles of the rest of sites.
        await this.preloadSites();
    }

    /**
     * Register a new style handler.
     *
     * @param styleHandler Style handler to be registered.
     */
    registerStyleHandler(styleHandler: CoreStyleHandler): void {
        this.styleHandlers.push(styleHandler);

        // Sort them by priority, greatest go last because style loaded last it's more important.
        this.styleHandlers = this.styleHandlers.sort((a, b) => a.priority >= b.priority ? 1 : -1);
    }

    /**
     * Listen events.
     */
    protected listenEvents(): void {
        // When a new site is added to the app, add its styles.
        CoreEvents.on(CoreEvents.SITE_ADDED, async (data) => {
            try {
                await this.addSite(data.siteId);

                // User has logged in, remove tmp styles and enable loaded styles.
                if (data.siteId == CoreSites.getCurrentSiteId()) {
                    this.unloadTmpStyles();
                    this.enableSiteStyles(data.siteId);
                    this.setStudiumCurrentSite(data.siteurl);
                }
            } catch (error) {
                this.logger.error('Error adding styles for new site', error);
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
            this.enableSiteStyles(data.siteId);
            const currentsite = CoreSites.getCurrentSite();
            if (currentsite !== undefined) {
                this.setStudiumCurrentSite(currentsite.getURL());
            }
        });

        // Disable added styles on logout.
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.clear();
            this.setStudiumDefaultSite();
        });

        // Remove site styles when a site is deleted.
        CoreEvents.on(CoreEvents.SITE_DELETED, (site) => {
            this.removeSite(site.getId());
        });

        // Load temporary styles when site config is checked in login/reconnect.
        CoreEvents.on(CoreEvents.LOGIN_SITE_CHECKED, (data) => {
            if (data.siteId) {
                // Reconnecting to a site, enable the site styles.
                this.enableSiteStyles(data.siteId);

                return;
            }

            this.setStudiumCurrentSite(data.config.httpswwwroot);
            this.loadTmpStyles(data.config).catch((error) => {
                this.logger.error('Error loading tmp styles', error);
            });
        });

        // Unload temporary styles when site config is "unchecked" in login.
        CoreEvents.on(CoreEvents.LOGIN_SITE_UNCHECKED, ({ loginSuccessful }) => {
            if (loginSuccessful) {
                // The tmp styles have been added for a site we've logged into, so we'll wait for the final
                // site styles to be loaded before removing the tmp styles so there is no blink effect.
                return;
            } else {
                this.setStudiumDefaultSite();
            }

            // User didn't access the site, unload tmp styles and site styles if any.
            this.unloadTmpStyles();
            this.clear();
        });
    }

    /**
     * Create a style element for a site.
     *
     * @param siteId Site Id.
     * @param disabled Whether the element should be disabled.
     */
    protected createStyleElements(siteId: string, disabled: boolean): void {
        this.stylesEls[siteId] = {};

        this.styleHandlers.forEach((handler) => {

            const styleElementId = this.getStyleId(siteId, handler.name);

            let styleEl: HTMLStyleElement | null = document.head.querySelector(`style#${styleElementId}`);

            if (!styleEl) {
                // Create the style and add it to the header.
                styleEl = document.createElement('style');

                styleEl.setAttribute('id', styleElementId);
                this.disableStyleElement(styleEl, disabled);

                this.stylesEls[siteId][handler.name] = '';
                document.head.appendChild(styleEl);
            }
        });
    }

    /**
     * Set StudiUM current site.
     *
     * @param url Site url.
     */
    protected setStudiumCurrentSite(url: string): void {
        let currentsite = CoreConstants.STUDIUM;
        const currentLangRegEx = new RegExp('(.*' + CoreConstants.STUDIUMFC + '.*)', 'g');
        if (url.match(currentLangRegEx)) {
            currentsite = CoreConstants.STUDIUMFC;
        }
        CoreDomUtils.toggleModeClass(CoreConstants.STUDIUM, false);
        CoreDomUtils.toggleModeClass(CoreConstants.STUDIUMFC, false);
        CoreDomUtils.toggleModeClass(currentsite, true);
        CoreConfig.set(CoreConstants.CURRENT_STUDIUM_SITE, currentsite);
    }

    /**
     * Set StudiUM default site.
     *
     */
    setStudiumDefaultSite(): void {
        CoreDomUtils.toggleModeClass(CoreConstants.STUDIUM, true);
        CoreDomUtils.toggleModeClass(CoreConstants.STUDIUMFC, false);
        CoreConfig.set(CoreConstants.CURRENT_STUDIUM_SITE, CoreConstants.STUDIUM);
    }

    /**
     * Set the content of an style element.
     *
     * @param siteId Site Id.
     * @param handler Style handler.
     * @param config Site public config.
     * @returns New element.
     */
    protected async setStyle(
        siteId: string,
        handler: CoreStyleHandler,
        config?: CoreSitePublicConfigResponse,
    ): Promise<void> {
        let contents = '';

        const enabled = await handler.isEnabled(siteId, config);
        if (enabled) {
            contents = (await handler.getStyle(siteId, config)).trim();
        }

        const hash = Md5.hashAsciiStr(contents);

        // Update the styles only if they have changed.
        if (this.stylesEls[siteId][handler.name] === hash) {
            return;
        }

        const styleElementId = this.getStyleId(siteId, handler.name);

        const styleEl: HTMLStyleElement | null = document.head.querySelector(`style#${styleElementId}`);

        if (!styleEl) {
            this.stylesEls[siteId][handler.name] = '';

            return;
        }

        const isDisabled = this.isStylElementDisabled(styleEl);
        styleEl.innerHTML = contents;
        this.stylesEls[siteId][handler.name] = hash;

        // Adding styles to a style element automatically enables it. Disable it again if needed.
        this.disableStyleElement(styleEl, isDisabled);
    }

    /**
     * Add a style element for a site and load the styles for that element. The style will be disabled.
     *
     * @param siteId Site ID.
     * @returns Promise resolved when added and loaded.
     */
    protected async addSite(siteId?: string): Promise<void> {
        if (!siteId || this.stylesEls[siteId]) {
            // Invalid site ID or style already added.
            return;
        }

        // Create the style and add it to the header.
        this.createStyleElements(siteId, true);

        try {
            await this.load(siteId, true);
        } catch (error) {
            this.logger.error('Error loading site after site init', error);
        }
    }

    /**
     * Clear styles added to the DOM, disabling them all.
     */
    protected clear(): void {
        let styles: HTMLStyleElement[] = [];
        // Disable all the styles.
        this.styleHandlers.forEach((handler) => {
            styles = styles.concat(Array.from(document.querySelectorAll(`style[id*=${handler.name}]`)));
        });

        styles.forEach((style) => {
            this.disableStyleElement(style, true);
        });

        CoreApp.setSystemUIColors();
    }

    /**
     * Returns style element Id based on site and source.
     *
     * @param siteId Site Id.
     * @param sourceName Source or handler name.
     * @returns Element Id.
     */
    protected getStyleId(siteId: string, sourceName: string): string {
        return `${sourceName}-${siteId}`;
    }

    /**
     * Disabled an element based on site and source name.
     *
     * @param siteId Site Id.
     * @param sourceName Source or handler name.
     * @param disable Whether to disable or enable the element.
     */
    protected disableStyleElementByName(siteId: string, sourceName: string, disable: boolean): void {
        const styleElementId = this.getStyleId(siteId, sourceName);

        const styleEl: HTMLStyleElement | null = document.head.querySelector(`style#${styleElementId}`);

        if (styleEl) {
            this.disableStyleElement(styleEl, disable);
        }
    }

    /**
     * Enabled or disable a certain style element.
     *
     * @param element The element to enable or disable.
     * @param disable Whether to disable or enable the element.
     */
    protected disableStyleElement(element: HTMLStyleElement, disable: boolean): void {
        // Setting disabled should be enough, but we also set the attribute so it can be seen in the DOM which ones are disabled.
        // Cast to any because the HTMLStyleElement type doesn't define the disabled attribute.
        (<any> element).disabled = !!disable; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (disable) {
            element.setAttribute('media', 'disabled');
        } else {
            element.removeAttribute('media');
        }
    }

    /**
     * Check if a style element is disabled.
     *
     * @param element Element to check.
     * @returns True if it's disabled.
     */
    protected isStylElementDisabled(element: HTMLStyleElement): boolean {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (<any> element).disabled ?? element.getAttribute('media') === 'disabled';
    }

    /**
     * Enable the styles of a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    protected enableSiteStyles(siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (this.stylesEls[siteId]) {
            for (const sourceName in this.stylesEls[siteId]) {
                this.disableStyleElementByName(siteId, sourceName, false);
            }

            CoreApp.setSystemUIColors();
        }
    }

    /**
     * Load styles for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param disabled Whether loaded styles should be disabled.
     * @returns Promise resolved when styles are loaded.
     */
    protected async load(siteId?: string, disabled = false): Promise<void> {
        const siteIdentifier = siteId || CoreSites.getCurrentSiteId();

        if (!siteIdentifier || !this.stylesEls[siteIdentifier]) {
            throw new CoreError('Cannot load styles, site not found: ${siteId}');
        }

        this.logger.debug('Load site', siteIdentifier, disabled);

        // Enable or disable the styles.
        for (const sourceName in this.stylesEls[siteIdentifier]) {
            this.disableStyleElementByName(siteIdentifier, sourceName, disabled);
        }

        await CorePromiseUtils.allPromises(this.styleHandlers.map(async (handler) => {
            await this.setStyle(siteIdentifier, handler);
        }));

        if (!disabled) {
            CoreApp.setSystemUIColors();
        }
    }

    /**
     * Load styles for a temporary site, given its public config. These styles aren't prefetched.
     *
     * @param config Site public config.
     * @returns Promise resolved when loaded.
     */
    protected async loadTmpStyles(config: CoreSitePublicConfigResponse): Promise<void> {
        // Create the style and add it to the header.
        this.createStyleElements(CoreStylesService.TMP_SITE_ID, true);

        await CorePromiseUtils.allPromises(this.styleHandlers.map(async (handler) => {
            await this.setStyle(CoreStylesService.TMP_SITE_ID, handler, config);
        }));

        CoreApp.setSystemUIColors();
    }

    /**
     * Preload the styles of the current site (stored in DB).
     *
     * @returns Promise resolved when loaded.
     */
    protected async preloadCurrentSite(): Promise<void> {
        const siteId = await CorePromiseUtils.ignoreErrors(CoreSites.getStoredCurrentSiteId());

        if (!siteId) {
            // No current site stored.
            return;
        }

        return this.addSite(siteId);
    }

    /**
     * Preload the styles of all the stored sites.
     *
     * @returns Promise resolved when loaded.
     */
    protected async preloadSites(): Promise<void> {
        const ids = await CoreSites.getSitesIds();

        await CorePromiseUtils.allPromises(ids.map((siteId) => this.addSite(siteId)));
    }

    /**
     * Remove the styles of a certain site.
     *
     * @param siteId Site ID.
     */
    protected removeSite(siteId: string): void {
        if (siteId && this.stylesEls[siteId]) {
            for (const sourceName in this.stylesEls[siteId]) {
                const styleElementId = this.getStyleId(siteId, sourceName);

                const styleEl: HTMLStyleElement | null = document.head.querySelector(`style#${styleElementId}`);

                if (styleEl) {
                    document.head.removeChild(styleEl);
                }
            }
            delete this.stylesEls[siteId];

            CoreApp.setSystemUIColors();
        }
    }

    /**
     * Unload styles for a temporary site.
     */
    protected unloadTmpStyles(): void {
        this.removeSite(CoreStylesService.TMP_SITE_ID);
    }

}

export const CoreStyles = makeSingleton(CoreStylesService);
