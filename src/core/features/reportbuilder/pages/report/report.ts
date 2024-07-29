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

import { Component, OnInit } from '@angular/core';
import { CoreReportBuilderReportDetail } from '@features/reportbuilder/services/reportbuilder';
import { CoreModals } from '@services/modals';
import { CoreNavigator } from '@services/navigator';

@Component({
    selector: 'core-report-builder-report',
    templateUrl: './report.html',
})
export class CoreReportBuilderReportPage implements OnInit {

    reportId!: string;
    reportDetail?: CoreReportBuilderReportDetail;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.reportId = CoreNavigator.getRequiredRouteParam('id');
    }

    /**
     * Save the report detail
     *
     * @param reportDetail it contents the detail of the report.
     */
    loadReportDetail(reportDetail: CoreReportBuilderReportDetail): void {
        this.reportDetail = reportDetail;
    }

    /**
     * Open the report info modal.
     */
    async openInfo(): Promise<void> {
        const { CoreReportBuilderReportSummaryComponent } =
            await import('@features/reportbuilder/components/report-summary/report-summary');

        CoreModals.openSideModal<void>({
            component: CoreReportBuilderReportSummaryComponent,
            componentProps: { reportDetail: this.reportDetail },
        });
    }

}
