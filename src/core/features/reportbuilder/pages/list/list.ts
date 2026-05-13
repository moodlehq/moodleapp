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

import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CoreReportBuilder, CoreReportBuilderReport, REPORTS_LIST_LIMIT } from '@features/reportbuilder/services/reportbuilder';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CorePromiseUtils } from '@static/promise-utils';
import { Translate } from '@singletons';
import { CoreTime } from '@static/time';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreNavigator } from '@services/navigator';

@Component({
    selector: 'core-report-builder-list',
    templateUrl: './list.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreReportBuilderListPage implements OnInit {

    readonly reports = signal<CoreReportBuilderReport[]>([]);
    readonly page = signal(0);
    readonly perpage = signal(REPORTS_LIST_LIMIT);
    readonly loaded = signal(false);
    readonly loadMoreError = signal(false);
    readonly hasMoreItems = signal(true);

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(() => this.performLogView());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.fetchReports();

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading reports' });

            this.reports.set([]);
        }
    }

    /**
     * Update reports list or loads it.
     *
     * @param reload is reoading or not.
     */
    async fetchReports(reload = false): Promise<void> {
        if (reload) {
            this.loaded.set(false);
            this.page.set(0);
            this.hasMoreItems.set(true);
            this.loadMoreError.set(false);
        }

        try {
            const reports = await CoreReportBuilder.getReports(this.page(), this.perpage());

            if (!reload) {
                reports.unshift(...this.reports());
            }

            reports.sort((a, b) => a.timemodified < b.timemodified ? 1 : -1);
            this.reports.set(reports);
            this.hasMoreItems.set(reports.length >= this.perpage());
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading reports' });

            this.hasMoreItems.set(false);
        } finally {
            this.loaded.set(true);
        }
    }

    /**
     * Load a new batch of Reports.
     *
     * @param complete Completion callback.
     */
    async fetchMoreReports(complete: () => void): Promise<void> {
        this.page.update((value) => value + 1);

        try {
            await this.fetchReports();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading more reports' });

            this.loadMoreError.set(true);
        }
        complete();
    }

    /**
     * Open a report.
     *
     * @param report Report to open.
     */
    async openReport(report: CoreReportBuilderReport): Promise<void> {
        await CoreNavigator.navigate(`${report.id}`);
    }

    /**
     * Refresh reports list.
     *
     * @param ionRefresher ionRefresher.
     */
    async refreshReports(ionRefresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreReportBuilder.invalidateReportsList());
        await CorePromiseUtils.ignoreErrors(this.fetchReports(true));
        await ionRefresher?.complete();
    }

    /**
     * Log view.
     */
    protected performLogView(): void {
        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'core_reportbuilder_list_reports',
            name: Translate.instant('core.reportbuilder.reports'),
            data: { category: 'reportbuilder' },
            url: '/reportbuilder/index.php',
        });
    }

}
