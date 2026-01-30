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

import { CoreSiteInfo, CoreSiteInfoResponse } from '@classes/sites/unauthenticated-site';
import { CoreSites } from '@services/sites';
import { CoreUrl } from './url';
import { CoreConstants } from '../constants';
import { ScrollDetail } from '@ionic/angular';
import { CoreDom } from './dom';

/**
 * Static class with helper functions to manage HTML classes.
 */
export class CoreHTMLClasses {

    protected static readonly MOODLE_SITE_URL_PREFIX = 'url-';
    protected static readonly MOODLE_VERSION_PREFIX = 'version-';
    protected static readonly MOODLEAPP_VERSION_PREFIX = 'moodleapp-';
    protected static readonly MOODLE_SITE_THEME_PREFIX = 'theme-site-';

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Initialize HTML classes.
     */
    static initialize(): void {
        CoreHTMLClasses.toggleModeClass('ionic8', true);
        CoreHTMLClasses.toggleModeClass('development', CoreConstants.BUILD.isDevelopment);
        CoreHTMLClasses.addVersionClass(
            CoreHTMLClasses.MOODLEAPP_VERSION_PREFIX,
            CoreConstants.CONFIG.versionname,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window;

        // Listen to scroll to add style when scroll is not 0.
        win.addEventListener('ionScroll', async ({ detail, target }: CustomEvent<ScrollDetail>) => {
            if ((target as HTMLElement).tagName !== 'ION-CONTENT') {
                return;
            }
            const content = (target as HTMLIonContentElement);

            const page = content.closest('.ion-page');
            if (!page) {
                return;
            }

            page.querySelector<HTMLIonHeaderElement>('ion-header')?.classList.toggle('core-header-shadow', detail.scrollTop > 0);

            const scrollElement = await content.getScrollElement();
            content.classList.toggle('core-footer-shadow', !CoreDom.scrollIsBottom(scrollElement));
        });
    }

    /**
     * Convenience function to add version to html classes.
     *
     * @param prefix Prefix to add to the class.
     * @param release Current release number of the site.
     */
    static addVersionClass(prefix: string, release: string): void {
        const parts = release.split('.', 3);

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        CoreHTMLClasses.toggleModeClass(prefix + parts[0], true);
        CoreHTMLClasses.toggleModeClass(`${prefix + parts[0]  }-${parts[1]}`, true);
        CoreHTMLClasses.toggleModeClass(`${prefix + parts[0]  }-${parts[1]}-${parts[2]}`, true);
    }

    /**
     * Convenience function to remove all mode classes form body.
     *
     * @param prefixes Prefixes of the class mode to be removed.
     */
    static removeModeClasses(prefixes: string[]): void {
        for (const modeClass of CoreHTMLClasses.getModeClasses()) {
            if (!prefixes.some((prefix) => modeClass.startsWith(prefix))) {
                continue;
            }

            CoreHTMLClasses.toggleModeClass(modeClass, false);
        }
    }

    /**
     * Convenience function to add site classes to html.
     *
     * @param siteInfo Site Info.
     */
    static addSiteClasses(siteInfo: CoreSiteInfo | CoreSiteInfoResponse): void {
        // Add version classes to html tag.
        CoreHTMLClasses.removeSiteClasses();

        CoreHTMLClasses.addVersionClass(CoreHTMLClasses.MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(siteInfo.release || ''));
        CoreHTMLClasses.addSiteUrlClass(siteInfo.siteurl);

        if (siteInfo.theme) {
            CoreHTMLClasses.toggleModeClass(CoreHTMLClasses.MOODLE_SITE_THEME_PREFIX + siteInfo.theme, true);
        }
    }

    /**
     * Convenience function to remove all site mode classes form html.
     */
    static removeSiteClasses(): void {
        // Remove version classes from html tag.
        CoreHTMLClasses.removeModeClasses(
            [
                CoreHTMLClasses.MOODLE_VERSION_PREFIX,
                CoreHTMLClasses.MOODLE_SITE_URL_PREFIX,
                CoreHTMLClasses.MOODLE_SITE_THEME_PREFIX,
            ],
        );
    }

    /**
     * Converts the provided URL into a CSS class that be used within the page.
     * This is primarily used to add the siteurl to the body tag as a CSS class.
     * Extracted from LMS url_to_class_name function.
     *
     * @param url Url.
     * @returns Class name
     */
    protected static urlToClassName(url: string): string {
        const parsedUrl = CoreUrl.parse(url);

        if (!parsedUrl) {
            return '';
        }

        let className = parsedUrl.domain?.replace(/\./g, '-') || '';

        if (parsedUrl.port) {
            className += `--${parsedUrl.port}`;
        }
        if (parsedUrl.path) {
            const leading = new RegExp('^/+');
            const trailing = new RegExp('/+$');
            const path = parsedUrl.path.replace(leading, '').replace(trailing, '');
            if (path) {
                className += `--${path.replace(/\//g, '-')}`;
            }
        }

        return className;
    }

    /**
     * Convenience function to add site url to html classes.
     *
     * @param siteUrl Site url.
     */
    static addSiteUrlClass(siteUrl: string): void {
        const className = CoreHTMLClasses.urlToClassName(siteUrl);

        CoreHTMLClasses.toggleModeClass(CoreHTMLClasses.MOODLE_SITE_URL_PREFIX + className, true);
    }

    /**
     * Check whether a CSS class indicating an app mode is set.
     *
     * @param className Class name.
     * @returns Whether the CSS class is set.
     */
    static hasModeClass(className: string): boolean {
        return document.documentElement.classList.contains(className);
    }

    /**
     * Get active mode CSS classes.
     *
     * @returns Mode classes.
     */
    static getModeClasses(): string[] {
        return Array.from(document.documentElement.classList);
    }

    /**
     * Toggle a CSS class in the root element used to indicate app modes.
     *
     * @param className Class name.
     * @param enable Whether to add or remove the class.
     */
    static toggleModeClass(
        className: string,
        enable = false,
    ): void {
        document.documentElement.classList.toggle(className, enable);
    }

}
