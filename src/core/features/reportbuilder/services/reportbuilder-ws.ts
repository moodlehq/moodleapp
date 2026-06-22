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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { ContextLevel } from '@/core/constants';

@Injectable({ providedIn: 'root' })
export class CoreReportBuilderWSService {

    protected static readonly ROOT_CACHE_KEY = 'mmaReportBuilder:';

    /**
     * Obtain the reports list.
     *
     * @param pagination Pagination parameters.
     * @returns Reports list.
     */
    async getReports(pagination?: CoreReportBuilderPagination): Promise<CoreReportBuilderListReportsWSResponse> {
        const site = CoreSites.getRequiredCurrentSite();
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getReportBuilderCacheKey() };

        return site.read<CoreReportBuilderListReportsWSResponse>(
            'core_reportbuilder_list_reports',
            { ...pagination },
            preSets,
        );
    }

    /**
     * Get the detail of a report.
     *
     * @param reportid Report id
     * @param pagination Pagination parameters.
     * @returns Detail of the report.
     */
    async retrieveReport(
        reportid: number,
        pagination?: CoreReportBuilderPagination,
    ): Promise<CoreReportBuilderRetrieveReportWSResponse> {
        const site = CoreSites.getRequiredCurrentSite();
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getReportBuilderReportCacheKey() };
        const params: CoreReportBuilderRetrieveReportWSParams = { reportid, ...pagination };

        return site.read<CoreReportBuilderRetrieveReportWSResponse>(
            'core_reportbuilder_retrieve_report',
            params,
            preSets,
        );
    }

    /**
     * View a report.
     *
     * @param reportid Report viewed.
     */
    async viewReport(reportid: number): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        const params: CoreReportBuilderViewReportWSParams = { reportid };

        await site.write<CoreReportBuilderViewReportWSResponse>('core_reportbuilder_view_report', params);
    }

    /**
     * Invalidates reports list WS calls.
     */
    async invalidateReportsList(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        await site.invalidateWsCacheForKey(this.getReportBuilderCacheKey());
    }

    /**
     * Invalidates report WS calls.
     */
    async invalidateReport(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        await site.invalidateWsCacheForKey(this.getReportBuilderReportCacheKey());
    }

    /**
     * Get cache key for report builder list WS calls.
     *
     * @returns Cache key.
     */
    protected getReportBuilderCacheKey(): string {
        return `${CoreReportBuilderWSService.ROOT_CACHE_KEY}list`;
    }

    /**
     * Get cache key for report builder report WS calls.
     *
     * @returns Cache key.
     */
    protected getReportBuilderReportCacheKey(): string {
        return `${CoreReportBuilderWSService.ROOT_CACHE_KEY}report`;
    }

    /**
     * Retrieve system report content.
     *
     * @param params Report parameters.
     * @param pagination Pagination parameters.
     * @returns System report content.
     */
    async getSystemReport(
        params: CoreReportBuilderCanViewSystemReportWSParams,
        pagination?: CoreReportBuilderPagination,
    ): Promise<CoreReportBuilderRetrieveSystemReportWSResponse> {
        const site = CoreSites.getRequiredCurrentSite();
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getSystemReportCacheKey(params.source) };

        return site.read<CoreReportBuilderRetrieveSystemReportWSResponse>(
            'core_reportbuilder_retrieve_system_report',
            { ...params, ...pagination } as CoreReportBuilderRetrieveSystemReportWSParams,
            preSets,
        );
    }

    /**
     * Determine access to a system report.
     *
     * @param params Report parameters.
     * @returns Whether the user can view the system report.
     */
    async canViewSystemReport(
        params: CoreReportBuilderCanViewSystemReportWSParams,
    ): Promise<CoreReportBuilderCanViewSystemReportWSResponse> {
        const site = CoreSites.getRequiredCurrentSite();

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCanViewSystemReportCacheKey(params.source),
            typeExpected: 'boolean',
        };

        return site.read<CoreReportBuilderCanViewSystemReportWSResponse>(
            'core_reportbuilder_can_view_system_report',
            params,
            preSets,
        );
    }

    /**
     * Invalidates system report WS calls.
     *
     * @param source Report source.
     */
    async invalidateSystemReport(source: string): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        await site.invalidateWsCacheForKey(this.getSystemReportCacheKey(source));
    }

    /**
     * Invalidates can view system report WS calls.
     *
     * @param source Report source.
     */
    async invalidateCanViewSystemReport(source: string): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        await site.invalidateWsCacheForKey(this.getCanViewSystemReportCacheKey(source));
    }

    /**
     * Get cache key for system report WS calls.
     *
     * @param source Report source.
     * @returns Cache key.
     */
    getSystemReportCacheKey(source: string): string {
        return `${CoreReportBuilderWSService.ROOT_CACHE_KEY}systemreport:${source}:get`;
    }

    /**
     * Get cache key for can view system report WS calls.
     *
     * @param source Report source.
     * @returns Cache key.
     */
    getCanViewSystemReportCacheKey(source: string): string {
        return `${CoreReportBuilderWSService.ROOT_CACHE_KEY}systemreport:${source}:canview`;
    }

}
export const CoreReportBuilderWS = makeSingleton(CoreReportBuilderWSService);

type CoreReportBuilderPagination = {
    page?: number;
    perpage?: number;
};

/**
 * Params of core_reportbuilder_retrieve_system_report WS.
 *
 * WS Description: Retrieve system report content
 */
export type CoreReportBuilderRetrieveSystemReportWSParams =
    CoreReportBuilderCanViewSystemReportWSParams & CoreReportBuilderPagination;

/**
 * Data returned by core_reportbuilder_retrieve_system_report WS.
 *
 * WS Description: Retrieve system report content
 */
export type CoreReportBuilderRetrieveSystemReportWSResponse = {
    data: CoreReportBuilderReportDataWSResponse;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_reportbuilder_can_view_system_report WS.
 *
 * WS Description: Determine access to a system report
 */
export type CoreReportBuilderCanViewSystemReportWSParams = {
    source: string; // Report class path.
    context: {
        contextid?: number; // Context ID. Either use this value, or level and instanceid.
        contextlevel?: ContextLevel; // Context level. To be used with instanceid.
        instanceid?: number; // Context instance ID. To be used with level.
    };
    component?: string; // Report component.
    area?: string; // Report area.
    itemid?: number; // Report item ID.
    parameters?: { // Report parameters.
        name: string;
        value: string;
    }[];
};

/**
 * Data returned by core_reportbuilder_can_view_system_report WS.
 *
 * WS Description: Determine access to a system report
 */
export type CoreReportBuilderCanViewSystemReportWSResponse = boolean;

export type CoreReportBuilderRetrieveReportWSParams = CoreReportBuilderPagination & {
    reportid: number; // Report ID.
};

/**
 * Data returned by core_reportbuilder_list_reports WS.
 */
export type CoreReportBuilderListReportsWSResponse = {
    reports: CoreReportBuilderReportWSResponse[];
    warnings?: CoreWSExternalWarning[];
};

export type CoreReportBuilderReportWSResponse = {
    name: string; // Name.
    source: string; // Source.
    type: number; // Type.
    uniquerows: boolean; // Uniquerows.
    conditiondata: string; // Conditiondata.
    settingsdata: string | null; // Settingsdata.
    contextid: number; // Contextid.
    component: string; // Component.
    area: string; // Area.
    itemid: number; // Itemid.
    usercreated: number; // Usercreated.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    sourcename: string; // Sourcename.
    modifiedby: {
        id: number; // Id.
        email: string; // Email.
        idnumber: string; // Idnumber.
        phone1: string; // Phone1.
        phone2: string; // Phone2.
        department: string; // Department.
        institution: string; // Institution.
        fullname: string; // Fullname.
        identity: string; // Identity.
        profileurl: string; // Profileurl.
        profileimageurl: string; // Profileimageurl.
        profileimageurlsmall: string; // Profileimageurlsmall.
    };
};

/**
 * Data returned by core_reportbuilder_retrieve_report WS.
 */
export type CoreReportBuilderRetrieveReportWSResponse = {
    details: CoreReportBuilderReportWSResponse;
    data: CoreReportBuilderReportDataWSResponse;
    warnings?: CoreWSExternalWarning[];
};

export type CoreReportBuilderReportDataWSResponse = {
    headers: string[]; // Headers.
    rows: { // Rows.
        columns: (string | number)[]; // Columns.
        isExpanded: boolean;
    }[];
    totalrowcount: number; // Totalrowcount.
};

/**
 * Params of core_reportbuilder_view_report WS.
 */
export type CoreReportBuilderViewReportWSParams = {
    reportid: number; // Report ID.
};

/**
 * Data returned by core_reportbuilder_view_report WS.
 */
export type CoreReportBuilderViewReportWSResponse = {
    status: boolean; // Success.
    warnings?: CoreWSExternalWarning[];
};
