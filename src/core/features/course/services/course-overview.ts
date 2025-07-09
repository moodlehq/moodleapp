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
import { CoreLogger } from '@singletons/logger';
import { CoreSitesCommonWSOptions, CoreSites } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { makeSingleton } from '@singletons';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreText } from '@singletons/text';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseOverviewService {

    protected logger = CoreLogger.getInstance('CoreCourseOverviewService');

    protected static readonly ROOT_CACHE_KEY = 'CoreCourseOverviewService:';

    /**
     * Check if the get overview information WS is available in current site.
     *
     * @param site Site to check. If not defined, current site.
     * @returns Whether it's available.
     * @since 5.1
     */
    canGetInformation(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.wsAvailable('core_courseformat_get_overview_information');
    }

    /**
     * Get common cache key for get overview information WS calls for a course.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getInformationCourseCommonCacheKey(courseId: number): string {
        return `${CoreCourseOverviewService.ROOT_CACHE_KEY}overviewInformation:${courseId}`;
    }

    /**
     * Get cache key for get overview information WS calls.
     *
     * @param courseId Course ID.
     * @param modName Name of the module. E.g. 'glossary'.
     * @returns Cache key.
     */
    protected getInformationCacheKey(courseId: number, modName: string): string {
        return `${this.getInformationCourseCommonCacheKey(courseId)}:${modName}`;
    }

    /**
     * Gets activity overview information.
     *
     * @param courseId Course ID.
     * @param modName Name of the module. E.g. 'glossary'.
     * @param options Comon site WS options.
     * @returns Promise resolved with the module's info.
     */
    async getInformation(
        courseId: number,
        modName: string,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreCourseOverviewInformation> {
        const site = await CoreSites.getSite(options.siteId);

        const params: CoreCourseGetOverviewInformationWSParams = {
            courseid: courseId,
            modname: modName,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getInformationCacheKey(courseId, modName),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<CoreCourseGetOverviewInformationWSResponse>(
            'core_courseformat_get_overview_information',
            params,
            preSets,
        );

        return {
            ...response,
            activities: response.activities.map(activity => ({
                ...activity,
                items: activity.items.map(item => ({
                    ...item,
                    parsedData: {
                        ...(CoreText.parseJSON(item.contentjson, {})),
                        ...(CoreText.parseJSON(item.extrajson, {})),
                    },
                })),
            })),
        };
    }

    /**
     * Invalidates all overview WS calls for a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCourseOverviews(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getInformationCourseCommonCacheKey(courseId));
    }

    /**
     * Invalidates overview WS call for a course and mod type.
     *
     * @param courseId Course ID.
     * @param modName Name of the module. E.g. 'glossary'.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateInformation(courseId: number, modName: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getInformationCacheKey(courseId, modName));
    }

    /**
     * Report a course overview being viewed.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreCourseViewOverviewInformationWSParams = {
            courseid: courseId,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('core_courseformat_view_overview_information', params);

        if (!response.status) {
            // Return the warning. If no warnings (shouldn't happen), create a fake one.
            const warning = response.warnings?.[0] || {
                warningcode: 'errorlog',
                message: 'Error logging data.',
            };

            throw new CoreWSError(warning);
        }
    }

}

export const CoreCourseOverview = makeSingleton(CoreCourseOverviewService);

/**
 * Params of core_courseformat_view_overview_information WS.
 */
type CoreCourseViewOverviewInformationWSParams = {
    courseid: number; // Course id.
};

/**
 * Params of core_courseformat_get_overview_information WS.
 */
type CoreCourseGetOverviewInformationWSParams = {
    courseid: number; // Course id.
    modname: string; // The module name.
};

/**
 * Params of core_courseformat_get_overview_information WS.
 */
type CoreCourseGetOverviewInformationWSResponse = {
    courseid: number; // The ID of the course this overview table belongs to.
    hasintegration: boolean; // Indicates if there is any integration available for this overview table.
    headers: CoreCourseGetOverviewInformationWSHeader[];
    activities: CoreCourseGetOverviewInformationWSActivity[];
};

/**
 * Header of the overview information.
 */
export type CoreCourseGetOverviewInformationWSHeader = {
    name: string; // The name of the header.
    key: string; // The key of the header, used to identify it.
    align: 'start' | 'end' | 'center' | 'justify' | null; // The alignment of the header.
};

/**
 * Overview information for an activity.
 */
type CoreCourseGetOverviewInformationWSActivity = {
    name: string; // The name of the activity.
    modname: string; // The module name of the activity.
    contextid: number; // The context ID of the activity.
    cmid: number; // The course module ID of the activity.
    url?: string; // The URL of the activity.
    haserror: boolean; // Indicate if the activity has an error.
    items: CoreCourseGetOverviewInformationWSItem[]; // Items associated with the activity, exported using overviewitem_exporter.
};

/**
 * Overview information for an item in an activity.
 */
type CoreCourseGetOverviewInformationWSItem = {
    key?: string; // The key of the item, used to identify it.
    name: string; // The name of the item.
    contenttype: string; // The type of content this overview item has.
    alertlabel?: string; // The label for the alert associated with this overview item.
    alertcount?: string; // The count of alerts associated with this overview item.
    contentjson: string; // The JSON encoded content data for the overview item.
    extrajson: string; // The JSON encoded extra data for the overview item.
};

/**
 * Overview information for an activity.
 */
export type CoreCourseOverviewActivity<T = Record<string, unknown>> =
        Omit<CoreCourseGetOverviewInformationWSActivity, 'items'> & {
    items: CoreCourseOverviewItem<T>[]; // Items associated with the activity.
};

/**
 * Overview information for an item in an activity, with the data parsed from json.
 */
export type CoreCourseOverviewItem<T = Record<string, unknown>> = CoreCourseGetOverviewInformationWSItem & {
    parsedData: T; // Parsed data from contentjson and extrajson.
};

/**
 * Overview information for a course and type of module.
 */
export type CoreCourseOverviewInformation = Omit<CoreCourseGetOverviewInformationWSResponse, 'activities'> & {
    activities: CoreCourseOverviewActivity[];
};
