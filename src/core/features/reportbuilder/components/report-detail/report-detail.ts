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
import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import {
    CoreReportBuilder,
    CoreReportBuilderReportDetail,
    CoreReportBuilderRetrieveReportMapped,
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

    readonly reportId = input.required<string>();
    readonly isBlock = input(true, { transform: toBoolean });
    readonly perPage = input<number>();
    readonly layout = input<'card' | 'table' | 'adaptative'>('adaptative');
    readonly onReportLoaded = output<CoreReportBuilderReportDetail>();

    readonly isCardLayout = computed(() => {
        const layout = this.layout();

        return layout === 'card' || (CoreScreen.isMobile && layout === 'adaptative');
    });

    readonly state = signal<CoreReportBuilderReportDetailState>({
        report: null,
        loaded: false,
        canLoadMoreRows: false,
        errorLoadingRows: false,
        cardviewShowFirstTitle: false,
        cardVisibleColumns: 1,
        page: 0,
    });

    readonly source = computed(() => {
        const splittedSource = this.state().report?.details.source.split('\\');
        const source = splittedSource?.[splittedSource?.length - 1];

        return source ?? 'system';
    });

    isString = (value: unknown): boolean => CoreReportBuilder.isString(value);

    protected logView: (report: CoreReportBuilderRetrieveReportMapped) => void;

    constructor() {
        this.logView = CoreTime.once(async (report) => {
            await CorePromiseUtils.ignoreErrors(CoreReportBuilder.viewReport(this.reportId()));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_reportbuilder_view_report',
                name: report.details.name,
                data: { id: this.reportId(), category: 'reportbuilder' },
                url: `/reportbuilder/view.php?id=${this.reportId()}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.getReport();
        this.updateState({ loaded: true });
    }

    /**
     * Get report data.
     */
    async getReport(): Promise<void> {
        try {
            const reportId = this.reportId();
            if (!reportId) {
                CoreAlerts.showError(new CoreError('No report found'));
                CoreNavigator.back();

                return;
            }

            const { page } = this.state();

            const report = await CoreReportBuilder.loadReport(parseInt(reportId), page,this.perPage() ?? REPORT_ROWS_LIMIT);

            if (!report) {
                CoreAlerts.showError(new CoreError('No report found'));
                CoreNavigator.back();

                return;
            }

            this.updateState({
                report,
                cardVisibleColumns: report.details.settingsdata.cardviewVisibleColumns,
                cardviewShowFirstTitle: report.details.settingsdata.cardviewShowFirstTitle,
                canLoadMoreRows: report.data.totalrowcount > report.data.rows.length,
            });

            this.logView(report);
            this.onReportLoaded.emit(report.details);
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
     * Update the state of the component.
     *
     * @param state Properties of the state to update.
     */
    protected updateState(state: Partial<CoreReportBuilderReportDetailState>): void {
        this.state.update((previousState) => ({ ...previousState, ...state }));
    }

    /**
     * Update report data.
     *
     * @param ionRefresher ionic refresher.
     */
    async refreshReport(ionRefresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreReportBuilder.invalidateReport());
        this.updateState({ page: 0, canLoadMoreRows: false });
        await CorePromiseUtils.ignoreErrors(this.getReport());
        await ionRefresher?.complete();
    }

    /**
     * Increment page of report rows.
     */
    protected incrementPage(): void {
        const { page } = this.state();
        this.updateState({ page: page + 1 });
    }

    /**
     * Load a new batch of pages.
     *
     * @param complete Completion callback.
     */
    async fetchMoreInfo(complete: () => void): Promise<void> {
        const { canLoadMoreRows, report } = this.state();

        if (!canLoadMoreRows) {
            complete();

            return;
        }

        try {
            this.incrementPage();

            const { page: currentPage } = this.state();

            const newReport = await CoreReportBuilder.loadReport(parseInt(this.reportId()), currentPage, REPORT_ROWS_LIMIT);

            if (!report || !newReport || newReport.data.rows.length === 0) {
                this.updateState({ canLoadMoreRows: false });
                complete();

                return;
            }

            this.updateState({
                report: {
                    ...report,
                    data: {
                        ...report.data,
                        rows: [
                            ...report.data.rows,
                            ...newReport.data.rows,
                        ],
                    },
                },
                canLoadMoreRows: newReport.data.totalrowcount > report.data.rows.length + newReport.data.rows.length,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading more reports' });

            this.updateState({ canLoadMoreRows: false, errorLoadingRows: true });
        }

        complete();
    }

    /**
     * Expand or close card.
     *
     * @param rowIndex card to expand or close.
     */
    toggleRow(rowIndex: number): void {
        const { report } = this.state();

        if (!report?.data?.rows[rowIndex]) {
            return;
        }

        report.data.rows[rowIndex].isExpanded = !report.data.rows[rowIndex].isExpanded;
        this.updateState({ report });
    }

}

export type CoreReportBuilderReportDetailState = {
    report: CoreReportBuilderRetrieveReportMapped | null;
    loaded: boolean;
    canLoadMoreRows: boolean;
    errorLoadingRows: boolean;
    cardviewShowFirstTitle: boolean;
    cardVisibleColumns: number;
    page: number;
};
