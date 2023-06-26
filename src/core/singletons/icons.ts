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

import { Http } from '@singletons';
import { CoreConstants } from '../constants';
import { CoreLogger } from './logger';
import aliases from '@/assets/fonts/font-awesome/aliases.json';

/**
 * Singleton with helper functions for icon management.
 */
export class CoreIcons {

    /**
     * Object used to store whether icons exist or not during development.
     */
    private static readonly DEV_ICONS_STATUS: Record<string, Promise<boolean>> = {};

    private static readonly ALIASES = { ...aliases } as unknown as Record<string, string>;

    protected static logger = CoreLogger.getInstance('CoreIcons');

    /**
     * Check icon alias and returns the new icon name.
     *
     * @param icon Icon name.
     * @returns New icon name and new library if changed.
     */
    static async getFontAwesomeIconFileName(icon: string): Promise<{fileName: string; newLibrary?: string}> {
        let newLibrary: string | undefined = undefined;
        if (icon.endsWith('-o')) {
            newLibrary = 'regular';
            icon = icon.substring(0, icon.length - 2);
        }

        if (CoreIcons.ALIASES[icon]) {
            this.logger.error(`Icon ${icon} is an alias of ${CoreIcons.ALIASES[icon]}, please use the new name.`);

            return { newLibrary, fileName: CoreIcons.ALIASES[icon] };
        }

        return { newLibrary, fileName: icon };
    }

    /**
     * Validate that an icon exists, or show warning otherwise (only in development and testing environments).
     *
     * @param name Icon name.
     * @param src Icon source url.
     */
    static validateIcon(name: string, src: string): void {
        if (!CoreConstants.BUILD.isDevelopment && !CoreConstants.BUILD.isTesting) {
            return;
        }

        if (!(src in CoreIcons.DEV_ICONS_STATUS)) {
            CoreIcons.DEV_ICONS_STATUS[src] = Http.get(src, { responseType: 'text' })
                .toPromise()
                .then(() => true)
                .catch(() => false);
        }

        // eslint-disable-next-line promise/catch-or-return
        CoreIcons.DEV_ICONS_STATUS[src].then(exists => {
            if (exists) {
                return;
            }

            return this.logger.error(`Icon ${name} not found`);
        });
    }

    /**
     * Replaces an <i> icon that uses CSS by a ion-icon with SVG.
     * It supports from 4.7 to 6.4 Font awesome versions.
     * But it can fail on 4.7 and 5.x because of the lack of assets.
     *
     * @param icon Current icon element.
     * @returns New icon, already included in the DOM.
     */
    static async replaceCSSIcon(icon: Element): Promise<HTMLIonIconElement | undefined> {
        let library = 'solid';
        let iconName = '';

        Array.from(icon.classList).forEach(async (className) => {
            // Library name of 5.x
            switch (className) {
                case 'fas':
                    library = 'solid';

                    return;
                case 'far':
                    library = 'regular';

                    return;
                case 'fab':
                    library = 'brands';

                    return;
            }

            // Check fa- style class names.
            const faPart = className.match(/fa-([a-zA-Z0-9-]+)/);
            if (!faPart) {
                return;
            }

            const firstPart = faPart[1].split('-')[0];

            switch (firstPart) {
                // Class is defining library.
                case 'solid':
                    library = 'solid';
                    break;
                case 'regular':
                case 'light':
                    library = 'regular';
                    break;
                case 'brands':
                    library = 'brands';
                    break;
                // Class is defining special cases.
                case '2xs':
                case 'xs':
                case 'sm':
                case 'lg':
                case 'xl':
                case '2xl':
                case 'fw':
                case 'sharp':
                case 'rotate':
                    return;
                // Class is defining the icon name (fa-ICONNAME).
                default:
                    iconName = faPart[1];
                    break;
            }
        });

        if (!iconName) {
            return;
        }

        const newIcon = document.createElement('ion-icon');

        Array.from(icon.attributes).forEach(attr => {
            newIcon.setAttribute(attr.nodeName, attr.nodeValue || '');
        });

        if (!newIcon.getAttribute('aria-label') &&
                !newIcon.getAttribute('aria-labelledby') &&
                !newIcon.getAttribute('title')) {
            newIcon.setAttribute('aria-hidden', 'true');
        }

        const { fileName, newLibrary } = await CoreIcons.getFontAwesomeIconFileName(iconName);
        if (newLibrary) {
            library = newLibrary;
        }
        iconName = fileName;

        const src = CoreIcons.getIconSrc('font-awesome', library, iconName);

        newIcon.setAttribute('src', src);

        newIcon.classList.add('faicon');
        CoreIcons.validateIcon(iconName, src);

        icon.parentElement?.insertBefore(newIcon, icon);
        icon.remove();

        return newIcon;
    }

    /**
     * Get icon SVG path.
     *
     * @param font Font Family.
     * @param library Library to use.
     * @param icon Icon Name.
     * @returns Path.
     */
    static getIconSrc(font: string, library: string, icon: string): string {
        return `assets/fonts/${font}/${library}/${icon}.svg`;
    }

}
