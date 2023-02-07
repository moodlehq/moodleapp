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

import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreReportBuilder, CoreReportBuilderReport, REPORTS_LIST_LIMIT } from '../services/reportbuilder';

/**
 * Provides a list of reports.
 */
export class CoreReportBuilderReportsSource extends CoreRoutedItemsManagerSource<CoreReportBuilderReport> {

    /**
     * @inheritdoc
     */
    getItemPath(report: CoreReportBuilderReport): string {
        return report.id.toString();
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: CoreReportBuilderReport[]; hasMoreItems: boolean }> {
        const reports = await CoreReportBuilder.getReports(page, this.getPageLength());

        return { items: reports, hasMoreItems: reports.length > 0 };
    }

    /**
     * @inheritdoc
     */
    protected setItems(reports: CoreReportBuilderReport[], hasMoreItems: boolean): void {
        const sortedReports = reports.slice(0);
        sortedReports.sort((a, b) => a.timemodified < b.timemodified ? 1 : -1);
        super.setItems(sortedReports, hasMoreItems);
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return REPORTS_LIST_LIMIT;
    }

}
