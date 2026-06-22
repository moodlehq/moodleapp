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

import { Component, linkedSignal, signal } from '@angular/core';
import { CoreReportBuilderReportDetail, CoreReportBuilderSystemReportParams } from '@features/reportbuilder/services/reportbuilder';
import { CoreModals } from '@services/overlays/modals';
import { CoreNavigator } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreReportBuilderReportDetailComponent } from '../../components/report-detail/report-detail';

@Component({
    selector: 'core-report-builder-report',
    templateUrl: './report.html',
    imports: [
        CoreSharedModule,
        CoreReportBuilderReportDetailComponent,
    ],
})
export default class CoreReportBuilderReportPage {

    readonly reportId = signal<number | undefined>(undefined);
    readonly reportParams = signal<CoreReportBuilderSystemReportParams | undefined>(undefined);
    readonly reportDetail = signal<CoreReportBuilderReportDetail | undefined>(undefined);
    readonly reportName = linkedSignal(() => this.reportDetail()?.name ?? this.reportParams()?.name);

    constructor() {
        const reportId = CoreNavigator.getRouteNumberParam('id');
        if (reportId) {
            this.reportId.set(reportId);
        } else {
            // No id, it should be a system report.
            const params = CoreNavigator.getRequiredRouteParam<CoreReportBuilderSystemReportParams>('params');

            this.reportParams.set(params);
        }

    }

    /**
     * Save the report detail
     *
     * @param reportDetail it contents the detail of the report.
     */
    loadReportDetail(reportDetail: CoreReportBuilderReportDetail): void {
        this.reportDetail.set(reportDetail);
    }

    /**
     * Open the report info modal.
     */
    async openInfo(): Promise<void> {
        const { CoreReportBuilderReportSummaryComponent } =
            await import('@features/reportbuilder/components/report-summary/report-summary');

        CoreModals.openSideModal<void>({
            component: CoreReportBuilderReportSummaryComponent,
            componentProps: { reportDetail: this.reportDetail() },
        });
    }

}
