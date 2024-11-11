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

import { CoreConstants } from '../constants';
import { CoreLogger } from './logger';
import aliases from '@/assets/fonts/font-awesome/aliases.json';
import { addIcons } from 'ionicons';
import icons from '@/assets/fonts/icons.json';

/**
 * Singleton with helper functions for icon management.
 */
export class CoreIcons {

    private static readonly ALIASES = { ...aliases } as unknown as Record<string, string>;
    private static readonly CUSTOM_ICONS = { ...icons } as unknown as Record<string, string>;

    protected static logger = CoreLogger.getInstance('CoreIcons');

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Add custom icons to Ionicons.
     */
    static addIconsToIonicons(): void {
        addIcons(CoreIcons.CUSTOM_ICONS);
    }

    /**
     * Check icon alias and returns the new icon name.
     *
     * @param icon Icon name.
     * @param isAppIcon Whether the icon is in the app's code, false if it's in some user generated content.
     * @returns New icon name and new library if changed.
     */
    static async getFontAwesomeIconFileName(icon: string, isAppIcon = true): Promise<{fileName: string; newLibrary?: string}> {
        const newLibrary = icon.endsWith('-o') ? 'regular' : undefined;

        if (CoreIcons.ALIASES[icon]) {
            if (isAppIcon) {
                CoreIcons.logger.error(`Icon ${icon} is an alias of ${CoreIcons.ALIASES[icon]}, please use the new name.`);
            }

            return { newLibrary, fileName: CoreIcons.ALIASES[icon] };
        }

        return { newLibrary, fileName: icon };
    }

    /**
     * Validate that an icon exists in the list of custom icons for the app, or show warning otherwise
     * (only in development and testing environments).
     *
     * @param font Font Family.
     * @param library Library to use.
     * @param icon Icon Name.
     */
    static validateIcon(font: string, library: string, icon: string): void {
        if (!CoreConstants.BUILD.isDevelopment && !CoreConstants.BUILD.isTesting) {
            return;
        }

        if (
            CoreIcons.CUSTOM_ICONS[icon] === undefined &&
            CoreIcons.CUSTOM_ICONS[CoreIcons.prefixIconName(font, library, icon)] === undefined
        ) {
            CoreIcons.logger.error(`Icon ${icon} not found`);
        }
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

            const afterFa = faPart[1];

            const specialClasses = ['2xs', 'xs', 'sm', 'lg', 'xl', '2xl', 'fw', 'sharp', 'rotate',
                '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x',
                'flip-horizontal', 'flip-vertical', 'flip-both', 'spin', 'pulse', 'inverse',
                'border', 'pull-left', 'pull-right', 'fixed-width', 'list-item', 'bordered', 'spinning',
                'stack', 'stack-1x', 'stack-2x', 'inverse', 'sr-only', 'sr-only-focusable', 'border'];

            // Class is defining special cases.
            if (afterFa && specialClasses.includes(afterFa)) {
                return;
            }

            switch (afterFa) {
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
                // Class is defining the icon name (fa-ICONNAME).
                default:
                    iconName = afterFa;
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

        const { fileName, newLibrary } = await CoreIcons.getFontAwesomeIconFileName(iconName, false);
        if (newLibrary) {
            library = newLibrary;
        }
        iconName = fileName;

        const src = CoreIcons.getIconSrc('font-awesome', library, iconName);

        newIcon.setAttribute('src', src);

        CoreIcons.validateIcon('font-awesome', library, iconName);

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

    /**
     * Prefix an icon name using the library prefix.
     *
     * @param font Font Family.
     * @param library Library to use.
     * @param icon Icon Name.
     * @returns Prefixed icon name.
     */
    static prefixIconName(font: string, library: string, icon: string): string {
        const prefixes = CoreConstants.CONFIG.iconsPrefixes?.[font]?.[library];
        if (!prefixes || !prefixes.length) {
            return icon;
        }

        return `${prefixes[0]}-${icon}`;
    }

    /**
     * Check if an icon name contains any of the prefixes configured for icons.
     * If it doesn't then it probably is an Ionicon.
     *
     * @param icon Icon Name.
     * @returns Whether icon is prefixed.
     */
    static isIconNamePrefixed(icon: string): boolean {
        return Object.values(CoreConstants.CONFIG.iconsPrefixes ?? {})
            .some(library => Object.values(library)
            .some(prefixes => prefixes.some(prefix => icon.startsWith(`${prefix}-`))));
    }

}
