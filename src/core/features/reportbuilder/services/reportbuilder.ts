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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'mmaReportBuilder:';
export const REPORTS_LIST_LIMIT = 20;
export const REPORT_ROWS_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class CoreReportBuilderService {

    /**
     * Obtain the reports list.
     *
     * @param page Current page.
     * @param perpage Reports obtained per page.
     * @returns Reports list.
     */
    async getReports(page?: number, perpage?: number): Promise<CoreReportBuilderReport[]> {
        const site = CoreSites.getRequiredCurrentSite();
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getReportBuilderCacheKey() };
        const response = await site.read<CoreReportBuilderListReportsWSResponse>(
            'core_reportbuilder_list_reports',
            { page, perpage },
            preSets,
        );

        return response.reports;
    }

    /**
     * Get the detail of a report.
     *
     * @param reportid Report id
     * @param page Current page.
     * @param perpage Rows obtained per page.
     * @returns Detail of the report.
     */
    async loadReport(reportid: number, page?: number, perpage?: number): Promise<CoreReportBuilderRetrieveReportMapped> {
        const site = CoreSites.getRequiredCurrentSite();
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getReportBuilderReportCacheKey() };
        const report = await site.read<CoreReportBuilderRetrieveReportWSResponse>(
            'core_reportbuilder_retrieve_report',
            { reportid, page, perpage },
            preSets,
        );

        if (!report) {
            throw new CoreError('An error ocurred.');
        }

        const settingsData: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            cardview_showfirsttitle: number;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            cardview_visiblecolumns: number;
        } = report.details.settingsdata ? JSON.parse(report.details.settingsdata) : {};

        const mappedSettingsData: CoreReportBuilderReportDetailSettingsData = {
            cardviewShowFirstTitle: settingsData.cardview_showfirsttitle === 1,
            cardviewVisibleColumns: settingsData.cardview_visiblecolumns ?? 1,
        };

        return {
            ...report,
            details: {
                ...report.details,
                settingsdata: mappedSettingsData,
            },
            data: {
                ...report.data,
                rows: [...report.data.rows.map(row => ({ columns: row.columns, isExpanded: row.isExpanded ?? false }))],
            },
        };
    }

    /**
     * View a report.
     *
     * @param reportid Report viewed.
     * @returns Response of the WS.
     */
    async viewReport(reportid: string): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();

        await site.write<CoreReportBuilderViewReportWSResponse>('core_reportbuilder_view_report', { reportid });
    }

    /**
     * Check if the feature is enabled or disabled.
     *
     * @returns Feature enabled or disabled.
     */
    async isEnabled(): Promise<boolean> {
        const site = CoreSites.getRequiredCurrentSite();
        const hasTheVersionRequired = site.isVersionGreaterEqualThan('4.1');
        const hasAdvancedFeatureEnabled = site.canUseAdvancedFeature('enablecustomreports');
        const isFeatureDisabled = site.isFeatureDisabled('CoreReportBuilderDelegate');

        return hasTheVersionRequired && hasAdvancedFeatureEnabled && !isFeatureDisabled;
    }

    /**
     * Invalidates reports list WS calls.
     *
     * @returns Promise resolved when the list is invalidated.
     */
    async invalidateReportsList(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        await site.invalidateWsCacheForKey(this.getReportBuilderCacheKey());
    }

    /**
     * Invalidates report WS calls.
     *
     * @returns Promise resolved when report is invalidated.
     */
    async invalidateReport(): Promise<void> {
        const site = CoreSites.getCurrentSite();

        if (!site) {
            return;
        }

        await site.invalidateWsCacheForKey(this.getReportBuilderReportCacheKey());
    }

    /**
     * Get cache key for report builder list WS calls.
     *
     * @returns Cache key.
     */
    protected getReportBuilderCacheKey(): string {
        return ROOT_CACHE_KEY + 'list';
    }

    /**
     * Get cache key for report builder report WS calls.
     *
     * @returns Cache key.
     */
    protected getReportBuilderReportCacheKey(): string {
        return ROOT_CACHE_KEY + 'report';
    }

    isString(value: unknown): boolean {
        return typeof value === 'string';
    }

}

export const CoreReportBuilder = makeSingleton(CoreReportBuilderService);

type CoreReportBuilderPagination = {
    page?: number;
    perpage?: number;
};

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

export interface CoreReportBuilderRetrieveReportMapped extends Omit<CoreReportBuilderRetrieveReportWSResponse, 'details'> {
    details: CoreReportBuilderReportDetail;
}

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

export interface CoreReportBuilderReportDetail extends Omit<CoreReportBuilderReportWSResponse, 'settingsdata'> {
    settingsdata: CoreReportBuilderReportDetailSettingsData;
}

export type CoreReportBuilderReportDetailSettingsData = {
    cardviewShowFirstTitle: boolean;
    cardviewVisibleColumns: number;
};

export interface CoreReportBuilderReport extends CoreReportBuilderReportWSResponse {}
