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
import { makeSingleton } from '@singletons';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from './sites';
import { CoreCacheUpdateFrequency } from '../constants';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreWait } from '@static/wait';

/**
 * Service to provide some features regarding LMS icon map.
 */
@Injectable({ providedIn: 'root' })
export class CoreIconMapService {

    protected static readonly ROOT_CACHE_KEY = 'CoreIconMap:';

    protected iconMaps: { [siteId: string]: { [theme: string]: { [component: string]: { [pix: string]: string } } } } = {};

    /**
     * Get the default theme name to use.
     *
     * @param siteId Site ID.
     * @returns Default theme name.
     */
    protected async getDefaultThemeName(siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        return site.getInfo()?.theme || 'boost';
    }

    /**
     * Get the CSS classes to render an icon in LMS.
     *
     * @param component The component the icon belongs to.
     * @param pix The name of the icon. E.g. i/checkedcircle.
     * @param options Other options.
     * @returns The classes to render the icon in LMS.
     * @since 5.1
     */
    async getIconClasses(component: string, pix: string, options: CoreIconMapGetIconMapOptions = {}): Promise<string | undefined> {
        if (component === 'moodle') {
            component = 'core';
        }

        const theme = options.theme || await this.getDefaultThemeName(options.siteId);

        let iconMap = await this.getIconMapFromMemoryCache(theme, options);
        if (iconMap) {
            return iconMap[component]?.[pix];
        }

        iconMap = await this.getIconMapFromWS(theme, options);

        this.storeIconMapInMemoryCache(options.siteId || CoreSites.getCurrentSiteId(), theme, iconMap);

        return iconMap[component]?.[pix];
    }

    /**
     * Get an icon map from memory cache.
     *
     * @param theme Theme name.
     * @param options Other options.
     * @returns Icon map or undefined if not found.
     */
    protected async getIconMapFromMemoryCache(
        theme: string,
        options: Omit<CoreIconMapGetIconMapOptions, 'theme'> = {},
    ): Promise<Record<string, Record<string, string>> | undefined> {
        if (
            options.readingStrategy === CoreSitesReadingStrategy.PREFER_NETWORK ||
            options.readingStrategy === CoreSitesReadingStrategy.ONLY_NETWORK
        ) {
            // Not using cache, don't obtain from memory cache.
            return;
        }

        const siteId = options.siteId || CoreSites.getCurrentSiteId();

        return this.iconMaps[siteId]?.[theme];
    }

    /**
     * Get the whole icon map from the site.
     *
     * @param theme Theme name.
     * @param options Other options.
     * @returns Icon map, classified by component and pix.
     */
    protected async getIconMapFromWS(
        theme: string,
        options: Omit<CoreIconMapGetIconMapOptions, 'theme'> = {},
    ): Promise<Record<string, Record<string, string>>> {
        const site = await CoreSites.getSite(options.siteId);

        const params: CoreIconMapLoadIconSystemMapWSParams = {
            themename: theme,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getIconMapCacheKey(params.themename),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const icons = await site.read<CoreIconMapLoadIconSystemMapWSResponse>(
            'core_output_load_fontawesome_icon_system_map',
            params,
            preSets,
        );

        const iconMap: Record<string, Record<string, string>> = {};

        icons.forEach((icon) => {
            if (!iconMap[icon.component]) {
                iconMap[icon.component] = {};
            }
            iconMap[icon.component][icon.pix] = icon.to;
        });

        await CoreWait.wait(5000);

        return iconMap;
    }

    /**
     * Get cache key for get icon map WS calls.
     *
     * @param theme Theme name.
     * @returns Cache key.
     */
    protected getIconMapCacheKey(theme: string): string {
        return `${CoreIconMapService.ROOT_CACHE_KEY}iconmap:${theme}`;
    }

    /**
     * Store an icon map in memory cache.
     *
     * @param siteId Site ID the map belongs to.
     * @param theme Theme name.
     * @param iconMap Icon map to store.
     */
    protected storeIconMapInMemoryCache(siteId: string, theme: string, iconMap: Record<string, Record<string, string>>): void {
        this.iconMaps[siteId] = this.iconMaps[siteId] || {};
        this.iconMaps[siteId][theme] = iconMap;
    }

}

export const CoreIconMap = makeSingleton(CoreIconMapService);

/**
 * Params of core_output_load_fontawesome_icon_system_map WS.
 */
type CoreIconMapLoadIconSystemMapWSParams = {
    themename: string; // The theme to fetch the map for.
};

/**
 * Data returned by core_output_load_fontawesome_icon_system_map WS.
 */
type CoreIconMapLoadIconSystemMapWSResponse = {
    component: string; // The component for the icon.
    pix: string; // Value to map the icon from.
    to: string; // Value to map the icon to.
}[];

type CoreIconMapGetIconMapOptions = CoreSitesCommonWSOptions & {
    theme?: string; // Theme to get the icon map for. If not defined, use current site theme.
};
