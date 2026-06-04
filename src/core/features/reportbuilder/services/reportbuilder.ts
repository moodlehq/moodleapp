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
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import {
    CoreReportbuilderCanViewSystemReportWSParams,
    CoreReportbuilderCanViewSystemReportWSResponse,
    CoreReportBuilderReportWSResponse,
    CoreReportBuilderRetrieveReportWSResponse,
    CoreReportBuilderWS,
} from './reportbuilder-ws';
import { ContextLevel } from '@/core/constants';

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
        const response = await CoreReportBuilderWS.getReports({ page, perpage });

        return response.reports;
    }

    /**
     * Get the detail of a report.
     *
     * @param reportId Report id
     * @param page Current page.
     * @param perpage Rows obtained per page.
     * @returns Detail of the report.
     */
    async loadReport(reportId: number, page?: number, perpage?: number): Promise<CoreReportBuilderRetrieveReportMapped> {
        const report = await CoreReportBuilderWS.retrieveReport(reportId, { page, perpage });

        if (!report) {
            throw new CoreError('An error occurred.');
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
     * @param reportId Report viewed.
     */
    async viewReport(reportId: number): Promise<void> {
        await CoreReportBuilderWS.viewReport(reportId);
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
     */
    async invalidateReportsList(): Promise<void> {
        await CoreReportBuilderWS.invalidateReportsList();
    }

    /**
     * Invalidates report WS calls.
     */
    async invalidateReport(): Promise<void> {
        await CoreReportBuilderWS.invalidateReport();
    }

    /**
     * Invalidates system report WS calls.
     *
     * @param source Report source.
     */
    async invalidateSystemReport(source: string): Promise<void> {
        await CoreReportBuilderWS.invalidateSystemReport(source);
    }

    /**
     * Invalidates can view system report WS calls.
     *
     * @param source Report parameters.
     */
    async invalidateCanViewSystemReport(source: string): Promise<void> {
        await CoreReportBuilderWS.invalidateCanViewSystemReport(source);
    }

    isString(value: unknown): boolean {
        return typeof value === 'string';
    }

    /**
     * Get the detail of a system report.
     *
     * @param reportParams Report parameters.
     * @param page Current page.
     * @param perpage Rows obtained per page.
     * @returns Detail of the report.
     */
    async getSystemReport(
        reportParams: CoreReportbuilderSystemReportParams,
        page?: number,
        perpage?: number,
    ): Promise<CoreReportBuilderRetrieveReportMapped> {
        const { name, context, ...rest } = reportParams;
        void name; // Avoid unused variable error.

        const params: CoreReportbuilderCanViewSystemReportWSParams = {
            ...rest,
            context: context ?? {
                instanceid: 0,
                contextlevel: ContextLevel.SYSTEM,
            },
        };

        const report = await CoreReportBuilderWS.getSystemReport(params, { page, perpage });
        if (!report) {
            throw new CoreError('An error occurred.');
        }

        return {
            ...report,
            data: {
                ...report.data,
                rows: [...report.data.rows.map(row => ({ columns: row.columns, isExpanded: row.isExpanded ?? false }))],
            },
        };
    }

    /**
     * Determine access to a system report.
     *
     * @param params Report parameters.
     * @returns Whether the user can view the system report.
     */
    async canViewSystemReport(
        params: CoreReportbuilderCanViewSystemReportWSParams,
    ): Promise<CoreReportbuilderCanViewSystemReportWSResponse> {
        return CoreReportBuilderWS.canViewSystemReport(params);
    }

}

export const CoreReportBuilder = makeSingleton(CoreReportBuilderService);

export type CoreReportBuilderRetrieveReportMapped = Omit<CoreReportBuilderRetrieveReportWSResponse, 'details'> & {
    details?: CoreReportBuilderReportDetail;
};

export type CoreReportBuilderReportDetail = Omit<CoreReportBuilderReportWSResponse, 'settingsdata'> & {
    settingsdata: CoreReportBuilderReportDetailSettingsData;
};

export type CoreReportBuilderReportDetailSettingsData = {
    cardviewShowFirstTitle: boolean;
    cardviewVisibleColumns: number;
};

export type CoreReportBuilderReport = CoreReportBuilderReportWSResponse;

export type CoreReportbuilderSystemReportParams = Omit<Partial<CoreReportbuilderCanViewSystemReportWSParams>, 'source'> & {
    source: string;
    name: string;
};
