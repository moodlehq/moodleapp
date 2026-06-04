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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, OnInit, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import {
    CoreReportBuilder,
    CoreReportBuilderReportDetail,
    CoreReportBuilderRetrieveReportMapped,
    CoreReportbuilderSystemReportParams,
    REPORT_ROWS_LIMIT,
} from '@features/reportbuilder/services/reportbuilder';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreSites } from '@services/sites';
import { CoreErrorObject } from '@services/error-helper';
import { CoreOpener } from '@static/opener';
import { Translate } from '@singletons';
import { CoreTime } from '@static/time';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreReportBuilderReportColumnComponent } from '../report-column/report-column';
import { ContextLevel } from '@/core/constants';

@Component({
    selector: 'core-report-builder-report-detail',
    templateUrl: './report-detail.html',
    styleUrl: './report-detail.scss',
    imports: [
        CoreSharedModule,
        CoreReportBuilderReportColumnComponent,
    ],
})
export class CoreReportBuilderReportDetailComponent implements OnInit {

    readonly reportParams = input.required<number | CoreReportbuilderSystemReportParams>();
    readonly isBlock = input(true, { transform: toBoolean });
    readonly perPage = input<number>();
    readonly layout = input<'card' | 'table' | 'adaptative'>('adaptative');
    readonly onReportLoaded = output<CoreReportBuilderReportDetail>();

    readonly isCardLayout = computed(() => {
        const layout = this.layout();

        return layout === 'card' || (CoreScreen.isMobile && layout === 'adaptative');
    });

    readonly report = signal<CoreReportBuilderRetrieveReportMapped | null>(null);
    readonly loaded = signal<boolean>(false);
    readonly errorLoadingRows = signal<boolean>(false);
    readonly page = signal<number>(0);

    readonly canLoadMoreRows = linkedSignal(() => {
        const report = this.report();

        return !!report && report.data.totalrowcount > report.data.rows.length;
    });

    readonly cardviewShowFirstTitle = computed(() => this.report()?.details?.settingsdata.cardviewShowFirstTitle ?? false);
    readonly cardVisibleColumns = computed(() => {
        const reportDetails = this.report()?.details;

        return reportDetails?.settingsdata.cardviewVisibleColumns ?? 1;
    });

    readonly contextLevel = computed(() => this.reportParamsObject()?.context?.contextlevel ?? ContextLevel.SYSTEM);
    readonly contextInstanceId = computed(() => this.reportParamsObject()?.context?.instanceid ?? 0);

    readonly reportId = computed(() => {
        const report = this.reportParams();

        return typeof report === 'number' ? report : undefined;
    });

    readonly reportParamsObject = computed(() => {
        const report = this.reportParams();

        return typeof report === 'object' ? report : undefined;
    });

    isString = (value: unknown): boolean => CoreReportBuilder.isString(value);

    protected logView: (reportDetails: CoreReportBuilderReportDetail) => void;

    constructor() {
        this.logView = CoreTime.once(async (reportDetails) => {
            const reportId = this.reportId();
            if (!reportId) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(CoreReportBuilder.viewReport(reportId));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_reportbuilder_view_report',
                name: reportDetails.name,
                data: { id: reportId, category: 'reportbuilder' },
                url: `/reportbuilder/view.php?id=${reportId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.getReport();
        this.loaded.set(true);
    }

    /**
     * Get report data.
     */
    async getReport(): Promise<void> {
        try {
            const report = await this.loadReport();

            if (!report) {
                CoreAlerts.showError(new CoreError('No report found'));
                CoreNavigator.back();

                return;
            }

            this.report.set(report);

            if (report.details) {
                this.logView(report.details);
                this.onReportLoaded.emit(report.details);
            }
        } catch {
            const errorConfig: CoreErrorObject = {
                title: Translate.instant('core.error'),
                body: `
                    <p>${Translate.instant('addon.mod_page.errorwhileloadingthepage')}</p>
                    <p>${Translate.instant('core.course.useactivityonbrowser')}</p>
                `,
                buttons: [
                    {
                        text: Translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: async () => await CoreNavigator.back(),
                    },
                    {
                        text: Translate.instant('core.openinbrowser'),
                        role: 'confirm',
                        handler: async () => {
                            const site = CoreSites.getRequiredCurrentSite();
                            const href = `${site.getURL()}/reportbuilder/view.php?id=${this.reportId()}`;
                            await CoreOpener.openInBrowser(href, { showBrowserWarning: false });
                            await CoreNavigator.back();
                        },
                    },
                ],
            };

            await CoreAlerts.showError(errorConfig);
        }
    }

    /**
     * Load report data.
     *
     * @returns System or custom report data.
     */
    protected async loadReport(): Promise<CoreReportBuilderRetrieveReportMapped> {
        const page = this.page();

        const reportParams = this.reportParams();
        if (typeof reportParams === 'object') {
            return await CoreReportBuilder.getSystemReport(reportParams, page, this.perPage() ?? REPORT_ROWS_LIMIT);
        }

        const reportId = reportParams;

        return await CoreReportBuilder.loadReport(reportId, page, this.perPage() ?? REPORT_ROWS_LIMIT);
    }

    /**
     * Update report data.
     *
     * @param ionRefresher ionic refresher.
     */
    async refreshReport(ionRefresher?: HTMLIonRefresherElement): Promise<void> {
        const reportParams = this.reportParams();
        if (typeof reportParams === 'object') {
            await CorePromiseUtils.ignoreErrors(CoreReportBuilder.invalidateSystemReport(reportParams.source));
        } else {
            await CorePromiseUtils.ignoreErrors(CoreReportBuilder.invalidateReport());
        }
        this.page.set(0);
        await CorePromiseUtils.ignoreErrors(this.getReport());
        await ionRefresher?.complete();
    }

    /**
     * Increment page of report rows.
     */
    protected incrementPage(): void {
        this.page.update(page => page + 1);
    }

    /**
     * Load a new batch of pages.
     *
     * @param complete Completion callback.
     */
    async fetchMoreInfo(complete: () => void): Promise<void> {
        const canLoadMoreRows = this.canLoadMoreRows();
        const report = this.report();

        if (!canLoadMoreRows) {
            complete();

            return;
        }

        this.errorLoadingRows.set(false);

        try {
            this.incrementPage();

            const newReport = await this.loadReport();

            if (!report || !newReport || newReport.data.rows.length === 0) {
                complete();

                return;
            }

            this.report.set({
                ...report,
                data: {
                    ...report.data,
                    rows: [
                        ...report.data.rows,
                        ...newReport.data.rows,
                    ],
                },
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading more reports' });

            this.canLoadMoreRows.set(false);
            this.errorLoadingRows.set(true);
        }

        complete();
    }

    /**
     * Expand or close card.
     *
     * @param rowIndex card to expand or close.
     */
    toggleRow(rowIndex: number): void {
        const report = this.report();

        if (!report?.data?.rows[rowIndex]) {
            return;
        }

        const updatedRows = report.data.rows.map((row, index) =>
            index === rowIndex ? { ...row, isExpanded: !row.isExpanded } : row);

        this.report.set({
            ...report,
            data: {
                ...report.data,
                rows: updatedRows,
            },
        });
    }

}
