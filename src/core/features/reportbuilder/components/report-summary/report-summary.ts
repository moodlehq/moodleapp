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

import { CoreSharedModule } from '@/core/shared.module';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy } from '@angular/core';
import { CoreReportBuilderReportDetail } from '@features/reportbuilder/services/reportbuilder';
import { CoreFormatDatePipe } from '@pipes/format-date';
import { CoreSites } from '@services/sites';
import { ModalController } from '@singletons';

@Component({
    selector: 'core-report-builder-report-summary',
    templateUrl: './report-summary.html',
    styleUrl: './report-summary.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreReportBuilderReportSummaryComponent implements OnDestroy {

    readonly reportDetail = input.required<CoreReportBuilderReportDetail>();

    protected readonly formatDate = inject(CoreFormatDatePipe);

    readonly reportUrl = computed(() => {
        const site = CoreSites.getRequiredCurrentSite();

        return `${site.getURL()}/reportbuilder/view.php?id=${this.reportDetail().id}`;
    });

    readonly reportDetailToDisplay = computed(() => {
        const reportDetail = this.reportDetail();

        return [
            {
                title: 'core.reportbuilder.reportsource',
                text: reportDetail.sourcename,
            },
            {
                title: 'core.reportbuilder.timecreated',
                text: this.formatDate.transform(reportDetail.timecreated * 1000),
            },
            {
                title: 'addon.mod_data.timemodified',
                text: this.formatDate.transform(reportDetail.timemodified * 1000),
            },
            {
                title: 'core.reportbuilder.modifiedby',
                text: reportDetail.modifiedby.fullname,
            },
        ];
    });

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.formatDate.ngOnDestroy();
    }

}
