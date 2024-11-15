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

import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreReportBuilderReportsSource } from '@features/reportbuilder/classes/reports-source';
import { CoreReportBuilder, CoreReportBuilderReport, REPORTS_LIST_LIMIT } from '@features/reportbuilder/services/reportbuilder';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreTime } from '@singletons/time';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'core-report-builder-list',
    templateUrl: './list.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreReportBuilderListPage implements AfterViewInit, OnDestroy {

    reports!: CoreListItemsManager<CoreReportBuilderReport, CoreReportBuilderReportsSource>;

    state$: Readonly<BehaviorSubject<CoreReportBuilderListState>> = new BehaviorSubject<CoreReportBuilderListState>({
        page: 1,
        perpage: REPORTS_LIST_LIMIT,
        loaded: false,
        loadMoreError: false,
    });

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(() => this.performLogView());

        try {
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreReportBuilderReportsSource, []);
            this.reports = new CoreListItemsManager(source, CoreReportBuilderListPage);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            CoreNavigator.back();
        }
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        try {
            await this.fetchReports(true);
            this.updateState({ loaded: true });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading reports');

            this.reports.reset();
        }
    }

    /**
     * Update reports list or loads it.
     *
     * @param reload is reoading or not.
     */
    async fetchReports(reload: boolean): Promise<void> {
        reload ? await this.reports.reload() : await this.reports.load();
        this.updateState({ loadMoreError: false });

        this.logView();
    }

    /**
     * Properties of the state to update.
     *
     * @param state Object to update.
     */
    updateState(state: Partial<CoreReportBuilderListState>): void {
        const previousState = this.state$.getValue();
        this.state$.next({ ...previousState, ...state });
    }

    /**
     * Load a new batch of Reports.
     *
     * @param complete Completion callback.
     */
    async fetchMoreReports(complete: () => void): Promise<void> {
        try {
            await this.fetchReports(false);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading more reports');

            this.updateState({ loadMoreError: true });
        }

        complete();
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

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.reports.destroy();
    }

}

type CoreReportBuilderListState = {
    page: number;
    perpage: number;
    loaded: boolean;
    loadMoreError: boolean;
};
