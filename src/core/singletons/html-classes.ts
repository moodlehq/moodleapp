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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from './url';
import { CoreConstants } from '../constants';
import { ScrollDetail } from '@ionic/angular';
import { CoreDom } from './dom';

const MOODLE_SITE_URL_PREFIX = 'url-';
const MOODLE_VERSION_PREFIX = 'version-';
const MOODLEAPP_VERSION_PREFIX = 'moodleapp-';
const MOODLE_SITE_THEME_PREFIX = 'theme-site-';

/**
 * Singleton with helper functions to manage HTML classes.
 */
export class CoreHTMLClasses {

    /**
     * Initialize HTML classes.
     */
    static initialize(): void {
        CoreDomUtils.toggleModeClass('ionic8', true);
        CoreDomUtils.toggleModeClass('development', CoreConstants.BUILD.isDevelopment);
        CoreHTMLClasses.addVersionClass(MOODLEAPP_VERSION_PREFIX, CoreConstants.CONFIG.versionname.replace('-dev', ''));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = <any> window;

        // Listen to scroll to add style when scroll is not 0.
        win.addEventListener('ionScroll', async ({ detail, target }: CustomEvent<ScrollDetail>) => {
            if ((target as HTMLElement).tagName != 'ION-CONTENT') {
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

        CoreDomUtils.toggleModeClass(prefix + parts[0], true, { includeLegacy: true });
        CoreDomUtils.toggleModeClass(prefix + parts[0] + '-' + parts[1], true, { includeLegacy: true });
        CoreDomUtils.toggleModeClass(prefix + parts[0] + '-' + parts[1] + '-' + parts[2], true, { includeLegacy: true });
    }

    /**
     * Convenience function to remove all mode classes form body.
     *
     * @param prefixes Prefixes of the class mode to be removed.
     */
    protected static removeModeClasses(prefixes: string[]): void {
        for (const modeClass of CoreDomUtils.getModeClasses()) {
            if (!prefixes.some((prefix) => modeClass.startsWith(prefix))) {
                continue;
            }

            CoreDomUtils.toggleModeClass(modeClass, false, { includeLegacy: true });
        }
    }

    /**
     * Convenience function to add site classes to html.
     *
     * @param siteInfo Site Info.
     */
    static addSiteClasses(siteInfo: CoreSiteInfo | CoreSiteInfoResponse): void {
        // Add version classes to html tag.
        this.removeSiteClasses();

        this.addVersionClass(MOODLE_VERSION_PREFIX, CoreSites.getReleaseNumber(siteInfo.release || ''));
        this.addSiteUrlClass(siteInfo.siteurl);

        if (siteInfo.theme) {
            CoreDomUtils.toggleModeClass(MOODLE_SITE_THEME_PREFIX + siteInfo.theme, true);
        }
    }

    /**
     * Convenience function to remove all site mode classes form html.
     */
    static removeSiteClasses(): void {
        // Remove version classes from html tag.
        this.removeModeClasses(
            [MOODLE_VERSION_PREFIX, MOODLE_SITE_URL_PREFIX, MOODLE_SITE_THEME_PREFIX],
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
                className += '--' + path.replace(/\//g, '-') || '';
            }
        }

        return className;
    }

    /**
     * Convenience function to add site url to html classes.
     */
    static addSiteUrlClass(siteUrl: string): void {
        const className = this.urlToClassName(siteUrl);

        CoreDomUtils.toggleModeClass(MOODLE_SITE_URL_PREFIX + className, true);
    }

}
